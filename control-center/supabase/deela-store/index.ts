// Supabase Edge Function: deela-store
// Deploy with JWT verification enabled.
import { createClient } from 'npm:@supabase/supabase-js@2';
const json = (data, status = 200)=>new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type'
    }
  });
const androidKey=(kind, value)=>kind+":"+String(value||"").trim().toLowerCase().slice(0,590);
const androidExternalKey=(row)=>androidKey("ext",row.source_page_url||row.source_name+"|"+row.app_name);
async function visibilityRules(client){
 const {data,error}=await client.from("deela_android_catalog_rules").select("catalog_key,is_hidden").eq("is_hidden",true).limit(10000);
 if(error)throw error;
 return new Set((data||[]).map(r=>r.catalog_key));
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }
  if (req.method !== 'POST') {
    return json({
      error: 'Method not allowed'
    }, 405);
  }
  try {
    const base = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !anon || !service) {
      throw Error('Missing server configuration');
    }
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return json({
        error: 'Login required'
      }, 401);
    }
    const admin = createClient(base, service, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data: identity, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !identity.user) {
      return json({
        error: 'Invalid session'
      }, 401);
    }
    const user = identity.user;
    const body = await req.json();
    const action = body?.action;
    if (![
      'list',
      'list_mods',
      'mod_like',
      'download'
    ].includes(action)) {
      return json({
        error: 'Invalid action'
      }, 400);
    }
    const { data: profile, error: profileErr } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profileErr) {
      return json({
        error: 'Profile unavailable'
      }, 403);
    }
    const owner = profile?.role === 'owner';
    const { data: subs, error: subErr } = await admin.from('subscriptions').select('starts_at,ends_at,suspended,platform').eq('user_id', user.id);
    if (subErr) {
      return json({
        error: 'Subscription unavailable'
      }, 403);
    }
    const now = Date.now();
    const active = (subs || []).find((s)=>!s.suspended && Date.parse(s.starts_at) <= now && Date.parse(s.ends_at) > now);
    if (!owner && !active) {
      return json({
        error: 'Subscription inactive or expired'
      }, 403);
    }
    // Basic device binding, not hardware attestation.
    const deviceId = body?.device_id;
    if (!owner) {
      if (typeof deviceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
        return json({
          error: 'Device ID required'
        }, 400);
      }
      const bytes = new TextEncoder().encode(deviceId);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest)).map((x)=>x.toString(16).padStart(2, '0')).join('');
      const { data: allowed, error: bindErr } = await admin.rpc('deela_claim_device', {
        p_user_id: user.id,
        p_device_hash: hash
      });
      if (bindErr) {
        return json({
          error: 'Device verification failed'
        }, 403);
      }
      if (!allowed) {
        return json({
          error: 'Account is linked to another device. Contact owner.'
        }, 403);
      }
    }
    const platform = active?.platform;
    if (!owner && ![
      'android',
      'ios'
    ].includes(platform)) {
      return json({
        error: 'Platform not assigned'
      }, 403);
    }
    if(action==='mod_like'){
      if(!owner && platform!=='android')return json({error:'Android catalog only'},403);
      const variantId=String(body?.variant_id||'');
      if(!/^[0-9a-f-]{36}$/i.test(variantId))return json({error:'Invalid variant ID'},400);
      const {data:variant,error:variantError}=await admin.from('deela_mod_variants').select('id,review_status,distribution_approved').eq('id',variantId).single();
      if(variantError||!variant||variant.review_status!=='approved'||!variant.distribution_approved)return json({error:'Variant unavailable'},404);
      if(!owner){
        const hidden=await visibilityRules(admin);
        if(hidden.has(androidKey("mod",variantId)))return json({error:'Application hidden by store owner'},404);
      }
      const {data:release}=await admin.from('deela_variant_releases').select('id').eq('variant_id',variantId).eq('published',true).limit(1);
      if(!release?.length)return json({error:'Variant not published'},404);
      const {data:existing,error:likeError}=await admin.from('deela_mod_likes').select('variant_id').eq('variant_id',variantId).eq('user_id',user.id).maybeSingle();
      if(likeError)throw likeError;
      if(existing){
       const {error}=await admin.from('deela_mod_likes').delete().eq('variant_id',variantId).eq('user_id',user.id);
       if(error)throw error;
      }else{
       const {error}=await admin.from('deela_mod_likes').insert({variant_id:variantId,user_id:user.id});
       if(error)throw error;
      }
      const {count,error:countError}=await admin.from('deela_mod_likes').select('variant_id',{count:'exact',head:true}).eq('variant_id',variantId);
      if(countError)throw countError;
      return json({liked:!existing,likes:count||0});
    }
    if (action === 'list_mods') {
      if (!owner && platform !== 'android') return json({error:'Android catalog only'},403);
      const limit=Math.min(Math.max(Number(body?.limit)||24,1),60);
      const offset=Math.max(Number(body?.offset)||0,0);
      const query=typeof body?.query==='string'?body.query.trim().slice(0,100):null;
      const category=typeof body?.category==='string'?body.category.trim().slice(0,40):null;
      const externalOnly=body?.external_only===true;
      const {data,error}=externalOnly?{data:[],error:null}:await admin.rpc('deela_mod_catalog_page',{p_limit:limit,p_offset:offset,p_query:query||null,p_category:category||null});
      if(error)throw error;
      const hidden = await visibilityRules(admin);
      // Developer attribution is internal metadata, never returned in the subscriber catalog.
      const publicApps=(data||[]).map((item)=>{
        if(!item||typeof item!=='object')return item;
        const {developer_name,developer_url,source_page_url,...publicItem}=item;
        return publicItem;
      });
      // Metadata-only external MOD catalog. No unverified APK links are issued.
      // Internal catalog may occupy only the first few pages; external pagination
      // must subtract the total internal entries, not this page's entry count.
      const {data:internalFirst,error:internalCountError}=externalOnly?{data:[],error:null}:await admin.rpc('deela_mod_catalog_page',{p_limit:60,p_offset:0,p_query:query||null,p_category:category||null});
      if(internalCountError)throw internalCountError;
      const internalTotal=(internalFirst||[]).length;
      const externalOffset=Math.max(offset-internalTotal,0);
      const remaining=Math.max(limit-publicApps.length,0);
      let externalApps=[];
      if(remaining>0){
        let ext=admin.from('deela_external_mod_public_catalog')
          .select('app_name,category,image_url,claimed_features,description,source_page_url,source_name,source_version,disclaimer')
          .order('app_name',{ascending:true}).range(externalOffset,externalOffset+remaining-1);
        if(category)ext=ext.eq('category',category);
        if(query)ext=ext.ilike('app_name','%'+query+'%');
        const {data:external,error:externalError}=await ext;
        if(externalError)throw externalError;
        externalApps=(external||[]).map(item=>({
          app_name:item.app_name,category:item.category,icon_url:item.image_url,
          features:item.claimed_features||item.description||'مميزات التعديل غير متوفرة من المصدر',
          version_name:item.source_version||'غير محدد',
          source_page_url:item.source_page_url,
          download_page_url:item.source_page_url,
          apk_url:null,external_metadata_only:true,
          source_name:item.source_name,disclaimer:item.disclaimer
        }));
      }
      const merged=[...publicApps.map(item=>({...item,catalog_key:androidKey("mod",item.variant_id)})),...externalApps.map(item=>({...item,catalog_key:androidExternalKey(item)}))];
      const visible=owner?merged:merged.filter(item=>!hidden.has(item.catalog_key));
      return json({apps:visible,limit,offset,has_more:merged.length===limit});
    }
    if (action === 'list') {
      let q = admin.from('store_apps').select('*').eq('is_published', true).order('created_at', {
        ascending: false
      }).limit(100);
      if (!owner) {
        q = q.eq('platform', platform);
      }
      const { data, error } = await q;
      if (error) throw error;
      const hidden=await visibilityRules(admin);
      const apps=owner?(data||[]):(data||[]).filter(a=>!hidden.has(androidKey("app",a.id)));
      return json({apps});
    }
    const id = body?.app_id;
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      return json({
        error: 'Invalid app ID'
      }, 400);
    }
    const { data: app, error: appErr } = await admin.from('store_apps').select('id,platform,storage_path,is_published').eq('id', id).single();
    if (!owner) {
      const hidden=await visibilityRules(admin);
      if(hidden.has(androidKey("app",id)))return json({error:'Application hidden by store owner'},404);
    }
    if (appErr || !app?.is_published || !app.storage_path) {
      return json({
        error: 'App unavailable'
      }, 404);
    }
    if (!owner && app.platform !== platform) {
      return json({
        error: 'Platform not permitted'
      }, 403);
    }
    const { data: signed, error: signErr } = await admin.storage.from('deela-apps').createSignedUrl(app.storage_path, 60);
    if (signErr || !signed?.signedUrl) {
      return json({
        error: 'Download unavailable'
      }, 500);
    }
    return json({
      url: signed.signedUrl,
      expires_in: 60
    });
  } catch (e) {
    console.error(e);
    return json({
      error: 'Server request failed'
    }, 500);
  }
});
