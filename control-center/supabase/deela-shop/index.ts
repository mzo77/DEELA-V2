import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SUPABASE_ENDPOINT = Deno.env.get("SUPABASE_URL") ?? "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(SUPABASE_ENDPOINT, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ORIGINS = new Set([
  "https://mzo77.github.io",
  "https://appassets.androidplatform.net",
  "https://deela.com"
]);
const json = (data: unknown, status = 200, req?: Request) => {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = ORIGINS.has(origin) ? origin : "https://mzo77.github.io";
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "authorization,content-type,apikey",
      "Vary": "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
};
const err = (message: string, status = 400, req?: Request) => json({ error: message }, status, req);
const clean = (x: unknown, max = 180) => typeof x === "string" ? x.trim().slice(0, max) : "";
const uid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugRE = /^[a-z0-9][a-z0-9-]{2,89}$/;
const money = (v: unknown) => v === null || v === "" || v === undefined
  ? null : (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100000 ? Math.round(Number(v) * 100) / 100 : NaN);
async function auth(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 8192) return null;
  const { data, error } = await db.auth.getUser(header.slice(7));
  return !error && data.user ? data.user : null;
}
async function isOwner(id: string) {
  const { data, error } = await db.from("profiles").select("role").eq("id", id).maybeSingle();
  return !error && data?.role === "owner";
}
function validHttpUrl(input: unknown) {
  const value = clean(input, 600);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
const productSelect = "id,slug,title,subtitle,description,category,platform,months,price_sar,compare_at_sar,image_url,accent,features,faq,published,featured,sort_order,created_at,updated_at";
function normalizeProduct(body: Record<string, unknown>) {
  const slug = clean(body.slug,90).toLowerCase();
  const title = clean(body.title,180);
  const price_sar = money(body.price_sar);
  const compare_at_sar = money(body.compare_at_sar);
  if (!slugRE.test(slug)) throw Error("رابط المنتج يجب أن يحتوي أحرف إنجليزية صغيرة وأرقامًا وشرطات");
  if (title.length < 3) throw Error("اسم المنتج قصير");
  if (Number.isNaN(price_sar) || Number.isNaN(compare_at_sar)) throw Error("السعر غير صحيح");
  if (body.image_url && !validHttpUrl(body.image_url)) throw Error("الصورة يجب أن تكون رابط HTTPS صحيحًا");
  const months = body.months === null || body.months === "" ? null : Number(body.months);
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 36)) throw Error("المدة من 1 إلى 36 شهرًا");
  const features = Array.isArray(body.features) ? body.features.slice(0, 20).map(x=>clean(x,180)).filter(Boolean) : [];
  const faq = Array.isArray(body.faq) ? body.faq.slice(0,20).map(x=>({
    q: clean((x as Record<string,unknown>)?.q,200),
    a: clean((x as Record<string,unknown>)?.a,600)
  })).filter(x=>x.q && x.a) : [];
  const platform = clean(body.platform,20);
  if (!["ios","android","both","other"].includes(platform)) throw Error("حدد المنصة");
  return {
    slug, title, subtitle: clean(body.subtitle,200), description:clean(body.description,3500),
    category:clean(body.category,65)||"اشتراكات", platform, months,
    price_sar, compare_at_sar,
    image_url: validHttpUrl(body.image_url),
    accent:["cyan","blue","purple","teal"].includes(clean(body.accent,20))?clean(body.accent,20):"cyan",
    features, faq,
    published:body.published===true, featured:body.featured===true,
    sort_order:Number.isInteger(Number(body.sort_order))?Math.max(0,Math.min(10000,Number(body.sort_order))):100,
    updated_at:new Date().toISOString()
  };
}
async function listPublic(){
  const [products, settings, reviews] = await Promise.all([
    db.from("deela_shop_products").select(productSelect).eq("published",true).order("sort_order",{ascending:true}).limit(100),
    db.from("deela_shop_settings").select("hero_title,hero_subtitle,announcement,support_url,published").eq("id",1).single(),
    db.from("deela_shop_reviews").select("id,product_id,display_name,rating,body,created_at").eq("approved",true).order("created_at",{ascending:false}).limit(40)
  ]);
  if(products.error || settings.error || reviews.error) throw Error("catalog unavailable");
  return { products:products.data ?? [], settings:settings.data, reviews:reviews.data ?? [], currency:"SAR", payment_mode:"manual_review" };
}
Deno.serve(async (req) => {
  const path = new URL(req.url).pathname.split("/deela-shop")[1] || "/";
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":ORIGINS.has(req.headers.get("origin")??"")?req.headers.get("origin")!:"https://mzo77.github.io",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"authorization,content-type,apikey", "Vary":"Origin"
  }});
  if(req.method==="GET" && path==="/health") return json({ok:true,service:"deela-shop",payments_live:false},200,req);
  try {
    // PRIVATE MODE: The owner has not launched the shop to the public.
    // Block catalog, product pages, order creation and all customer routes
    // for every unauthenticated or non-owner visitor, including direct API calls.
    const privateVisitor=await auth(req);
    if(!privateVisitor || !(await isOwner(privateVisitor.id))){
      return err("متجر ديلا في مرحلة خاصة بالمالك ولم يُفتح للعامة",403,req);
    }
    if(req.method==="GET" && path==="/catalog"){
      return json(await listPublic(),200,req);
    }
    if(req.method==="GET" && path==="/product"){
      const slug = clean(new URL(req.url).searchParams.get("slug"),90);
      if(!slugRE.test(slug)) return err("رابط منتج غير صحيح",400,req);
      const {data,error}=await db.from("deela_shop_products").select(productSelect).eq("slug",slug).eq("published",true).maybeSingle();
      if(error)throw error;
      if(!data)return err("المنتج غير متاح",404,req);
      const {data:reviews}=await db.from("deela_shop_reviews").select("id,display_name,rating,body,created_at")
        .eq("product_id",data.id).eq("approved",true).order("created_at",{ascending:false}).limit(30);
      return json({product:data,reviews:reviews??[]},200,req);
    }
    const user=await auth(req);
    if(path.startsWith("/admin/")){
      if(!user||!(await isOwner(user.id)))return err("هذه الخدمة مخصصة للمالك فقط",403,req);
      if(req.method==="GET"&&path==="/admin/overview"){
        const [products,orders,pending,reviews]=await Promise.all([
          db.from("deela_shop_products").select("id",{count:"exact",head:true}),
          db.from("deela_shop_orders").select("id",{count:"exact",head:true}),
          db.from("deela_shop_orders").select("id",{count:"exact",head:true}).in("status",["pending_quote","pending_review","awaiting_payment"]),
          db.from("deela_shop_reviews").select("id",{count:"exact",head:true}).eq("approved",false)
        ]);
        if([products,orders,pending,reviews].some(x=>x.error))throw Error("overview");
        return json({products:products.count||0,orders:orders.count||0,pending:pending.count||0,unapproved_reviews:reviews.count||0},200,req);
      }
      if(req.method==="GET"&&path==="/admin/products"){
        const {data,error}=await db.from("deela_shop_products").select(productSelect).order("sort_order",{ascending:true}).limit(200);
        if(error)throw error;
        const {data:settings}=await db.from("deela_shop_settings").select("*").eq("id",1).single();
        return json({products:data??[],settings},200,req);
      }
      if(req.method==="POST"&&path==="/admin/product"){
        const raw=await req.json();
        const input=normalizeProduct(raw);
        const id=clean(raw.id,60);
        let res;
        if(id){
          if(!uid.test(id))return err("معرف المنتج غير صحيح",400,req);
          res=await db.from("deela_shop_products").update(input).eq("id",id).select(productSelect).maybeSingle();
        }else res=await db.from("deela_shop_products").insert(input).select(productSelect).single();
        if(res.error)return err(res.error.code==="23505"?"رابط المنتج مستخدم مسبقًا":"تعذر حفظ المنتج",409,req);
        if(!res.data)return err("المنتج غير موجود",404,req);
        return json({ok:true,product:res.data},200,req);
      }
      if(req.method==="GET"&&path==="/admin/orders"){
        const {data,error}=await db.from("deela_shop_orders").select("*").order("created_at",{ascending:false}).limit(150);
        if(error)throw error;
        return json({orders:data??[]},200,req);
      }
      if(req.method==="POST"&&path==="/admin/order-status"){
        const b=await req.json(),id=clean(b.id,60),status=clean(b.status,30);
        if(!uid.test(id)||!["pending_quote","pending_review","awaiting_payment","paid","fulfilled","cancelled"].includes(status))
          return err("حالة الطلب غير صحيحة",400,req);
        const {data,error}=await db.from("deela_shop_orders").update({
          status,owner_note:clean(b.owner_note,1000),updated_at:new Date().toISOString()
        }).eq("id",id).select("id,order_code,status").maybeSingle();
        if(error)throw error;
        if(!data)return err("الطلب غير موجود",404,req);
        return json({ok:true,order:data,subscription_activated:false},200,req);
      }
      if(req.method==="POST"&&path==="/admin/activate-order"){
        const body=await req.json(),id=clean(body.id,60);
        if(!uid.test(id))return err("معرّف الطلب غير صحيح",400,req);
        const {data,error}=await db.rpc("deela_shop_activate_order",{
          p_order_id:id,p_owner_id:user.id
        });
        if(error){
          console.error("deela-shop activation",error.code||"unavailable");
          return err("تعذّر تفعيل العضوية. تأكد أن حالة الطلب «مدفوع» وأنه يحتوي على عضوية واحدة لم تُفعّل من قبل.",409,req);
        }
        return json({ok:true,activation:data},200,req);
      }
      if(req.method==="POST"&&path==="/admin/settings"){
        const b=await req.json();
        if(b.support_url && !validHttpUrl(b.support_url))return err("رابط الدعم يجب أن يبدأ بـ HTTPS",400,req);
        const values={
          hero_title:clean(b.hero_title,150)||"عالم ديلا الرقمي يبدأ من هنا",
          hero_subtitle:clean(b.hero_subtitle,500),
          announcement:clean(b.announcement,180),
          support_url:validHttpUrl(b.support_url)||"",
          published:b.published!==false,
          updated_at:new Date().toISOString()
        };
        const {data,error}=await db.from("deela_shop_settings").update(values).eq("id",1).select("*").single();
        if(error)throw error;
        return json({ok:true,settings:data},200,req);
      }
      if(req.method==="GET"&&path==="/admin/reviews"){
        const {data,error}=await db.from("deela_shop_reviews").select("id,product_id,display_name,rating,body,approved,created_at").order("created_at",{ascending:false}).limit(100);
        if(error)throw error;
        return json({reviews:data??[]},200,req);
      }
      if(req.method==="POST"&&path==="/admin/review-status"){
        const b=await req.json(),id=clean(b.id,60);
        if(!uid.test(id)||typeof b.approved!=="boolean")return err("طلب غير صحيح",400,req);
        const {data,error}=await db.from("deela_shop_reviews").update({approved:b.approved}).eq("id",id).select("id,approved").maybeSingle();
        if(error)throw error;
        return data?json({ok:true,review:data},200,req):err("التقييم غير موجود",404,req);
      }
      return err("مسار الإدارة غير موجود",404,req);
    }
    if(!user)return err("سجّل الدخول بحساب ديلا لإرسال الطلب ومتابعته",401,req);
    if(req.method==="GET"&&path==="/orders/me"){
      const {data,error}=await db.from("deela_shop_orders")
        .select("id,order_code,items,total_sar,status,created_at,owner_note,payment_method,subscription_activated_at")
        .eq("customer_id",user.id).order("created_at",{ascending:false}).limit(40);
      if(error)throw error;
      return json({orders:data??[]},200,req);
    }
    if(req.method==="POST"&&path==="/orders"){
      const b=await req.json();
      if(!Array.isArray(b.items)||b.items.length<1||b.items.length>10)return err("السلة تحتوي عناصر غير صحيحة",400,req);
      const phone=clean(b.phone,25),note=clean(b.customer_note,500);
      if(phone&&!/^\+?[0-9 ()-]{7,25}$/.test(phone))return err("رقم الجوال غير صحيح",400,req);
      const keys=new Set<string>();const cart:{id:string,quantity:number}[]=[];
      for(const item of b.items){
        const id=clean(item?.id,60),quantity=Number(item?.quantity);
        if(!uid.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>5||keys.has(id))return err("محتويات السلة غير صحيحة",400,req);
        keys.add(id);cart.push({id,quantity});
      }
      const {count,error:recentErr}=await db.from("deela_shop_orders").select("id",{count:"exact",head:true})
        .eq("customer_id",user.id).gte("created_at",new Date(Date.now()-15*60_000).toISOString());
      if(recentErr)throw recentErr;
      if((count||0)>=3)return err("تم بلوغ حد الطلبات المؤقت؛ حاول لاحقًا",429,req);
      const {data:products,error:prErr}=await db.from("deela_shop_products").select("id,title,slug,platform,months,price_sar,published")
        .in("id",cart.map(x=>x.id)).eq("published",true);
      if(prErr)throw prErr;
      if((products||[]).length!==cart.length)return err("أحد المنتجات لم يعد متاحًا",409,req);
      const rows=cart.map(x=>{
        const p=products!.find(y=>y.id===x.id)!;
        return {product_id:p.id,title:p.title,slug:p.slug,platform:p.platform,months:p.months,quantity:x.quantity,unit_price_sar:p.price_sar};
      });
      const quoted=rows.some(x=>x.unit_price_sar===null);
      const total=quoted?null:Math.round(rows.reduce((sum,x)=>sum+Number(x.unit_price_sar)*x.quantity,0)*100)/100;
      const orderCode="DL-"+crypto.randomUUID().slice(0,8).toUpperCase();
      const {data:order,error:orderErr}=await db.from("deela_shop_orders").insert({
        order_code:orderCode,customer_id:user.id,customer_email:user.email||"",
        customer_name:clean(b.customer_name,90),phone,
        customer_note:note,items:rows,total_sar:total,
        status:quoted?"pending_quote":"pending_review",payment_method:"manual"
      }).select("id,order_code,status,total_sar,created_at").single();
      if(orderErr)throw orderErr;
      return json({ok:true,order,payment_collected:false,subscription_activated:false},201,req);
    }
    if(req.method==="POST"&&path==="/reviews"){
      const b=await req.json(),productId=clean(b.product_id,60),rating=Number(b.rating),body=clean(b.body,800);
      if(!uid.test(productId)||!Number.isInteger(rating)||rating<1||rating>5||body.length<8)return err("اكتب تقييمًا صحيحًا",400,req);
      const {data:orders,error:e}=await db.from("deela_shop_orders").select("items").eq("customer_id",user.id).eq("status","fulfilled").limit(60);
      if(e)throw e;
      const purchased=(orders||[]).some(o=>Array.isArray(o.items)&&(o.items as Array<{product_id:string}>).some(i=>i.product_id===productId));
      if(!purchased)return err("التقييم متاح بعد إكمال طلب هذا المنتج",403,req);
      const {data:profile}=await db.from("profiles").select("display_name").eq("id",user.id).maybeSingle();
      const {error}=await db.from("deela_shop_reviews").upsert({
        product_id:productId,user_id:user.id,display_name:clean(profile?.display_name,60)||"عميل ديلا",
        rating,body,approved:false
      },{onConflict:"product_id,user_id"});
      if(error)throw error;
      return json({ok:true,approved:false},200,req);
    }
    return err("مسار غير موجود",404,req);
  } catch(e){
    console.error("deela-shop",e instanceof Error?e.message:"unknown");
    return err(e instanceof Error && /^(اسم|رابط|المدة|السعر|الصورة|حدد)/.test(e.message)?e.message:"تعذر إكمال العملية على الخادم",500,req);
  }
});
