import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const origin=(()=>{try{return new URL(supabaseUrl).origin}catch{return "https://rxlynynjetajtsqlhkrq.supabase.co"}})();
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const result=(value:Record<string,unknown>,status=200)=>new Response(JSON.stringify(value),{status,headers});
const statusError=(reason:string,status:number)=>result({ok:false,error:reason},status);
const pentagiSettings=()=>{
  const root=(Deno.env.get("DEELA_PENTAGI_URL")||"").trim().replace(/\/+$/,"");
  const token=(Deno.env.get("DEELA_PENTAGI_TOKEN")||"").trim();
  const allowed=(Deno.env.get("DEELA_PENTAGI_SCOPE_URL")||"").trim();
  const provider=(Deno.env.get("DEELA_PENTAGI_PROVIDER")||"ollama").trim();
  let configured=false;
  try { const u=new URL(root); const target=new URL(allowed);
    configured=u.protocol==="https:"&&Boolean(u.hostname)&&target.protocol==="https:"&&Boolean(target.hostname)&&Boolean(token)&&/^[a-zA-Z0-9_.-]{1,50}$/.test(provider);
    // Refuse sending API tokens to link-local, loopback or cloud-metadata endpoints.
    if(/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i.test(u.hostname))configured=false;
  }catch{/* host and target are still missing */}
  return {root,token,allowed,provider,configured};
};
async function owner(req:Request){
  const auth=(req.headers.get("authorization")||"").match(/^Bearer ([A-Za-z0-9._~-]+)$/i);
  if(!auth)return null;
  const {data,error}=await admin.auth.getUser(auth[1]);
  if(error||!data.user)return null;
  const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
  if(profileError||profile?.role!=="owner")return null;
  return data.user.id;
}
async function callPentagi(cfg:ReturnType<typeof pentagiSettings>,path:string,method="GET",body?:string){
  const response=await fetch(cfg.root+path,{
    method,signal:AbortSignal.timeout(25000),
    headers:{"Authorization":"Bearer "+cfg.token,"Content-Type":"application/json","Accept":"application/json"},
    body,
  });
  if(!response.ok)throw new Error("pentagi_http_"+response.status);
  const text=await response.text();
  if(text.length>250000)throw new Error("pentagi_response_too_large");
  return JSON.parse(text);
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(!["GET","POST"].includes(req.method))return statusError("طريقة الطلب غير مدعومة",405);
  const path=new URL(req.url).pathname;
  const prefix="/deela-owner-agent";
  if(!path.endsWith(prefix)&&!path.includes(prefix+"/"))return statusError("المسار غير معروف",404);
  const ownerId=await owner(req);
  if(!ownerId)return statusError("صلاحيات المالك مطلوبة. سجل الدخول من تطبيق المالك.",401);
  const suffix=path.slice(path.lastIndexOf(prefix)+prefix.length).replace(/\/+$/,"");
  const cfg=pentagiSettings();
  const githubToken=(Deno.env.get("DEELA_GITHUB_TOKEN")||"").trim();
  if(req.method==="GET"&&(suffix===""||suffix==="/status"))
    return result({ready:githubToken.length>10,manual:githubToken.length<=10,code:githubToken.length>10?"github_configured":"manual_mode",
      engine:"OpenCode",source:"DEELA 0.9.10",pentagi_ready:cfg.configured,github_workflow:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml",
      daily_limit:5});
  if(req.method==="POST"&&suffix===""){
    if(githubToken.length<=10)return result({
      queued:false,manual:true,code:"manual_mode",runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml",
      error:"لم يُربط رمز GitHub بعد؛ يمكنك تشغيل الوكيل يدويًا من GitHub Actions."
    },503);
    const size=Number(req.headers.get("content-length")||"0");
    if(size>12000)return statusError("نص المهمة أكبر من الحجم المسموح",413);
    let data:Record<string,unknown>;
    try{data=await req.json()}catch{return statusError("صيغة طلب الوكيل غير صحيحة",400)}
    const task=typeof data.task==="string"?data.task.trim():"";
    if(task.length<10||task.length>1400)return statusError("اكتب أمرًا واضحًا بين 10 و1400 حرف",400);
    const from=new Date(Date.now()-24*60*60*1000).toISOString();
    const {count,error:countError}=await admin.from("deela_agent_dispatches")
      .select("id",{count:"exact",head:true}).eq("owner_id",ownerId).gte("created_at",from);
    if(countError)return statusError("تعذر التحقق من عدد المهام المسموح",503);
    if((count||0)>=5)return statusError("وصلت إلى حد 5 مهام خلال آخر 24 ساعة لحماية الموارد المجانية",429);
    const {data:record,error:insertError}=await admin.from("deela_agent_dispatches")
      .insert({owner_id:ownerId,result_status:"requested"}).select("id").single();
    if(insertError||!record)return statusError("تعذر تسجيل مهمة الوكيل",503);
    let upstream:Response;
    try{
      upstream=await fetch("https://api.github.com/repos/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml/dispatches",{
        method:"POST",signal:AbortSignal.timeout(15000),
        headers:{"Authorization":"Bearer "+githubToken,"Accept":"application/vnd.github+json",
          "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},
        body:JSON.stringify({ref:"main",inputs:{task}})
      });
    }catch(e){
      await admin.from("deela_agent_dispatches").update({result_status:"failed"}).eq("id",record.id);
      console.error("GitHub workflow dispatch transport failure",e instanceof Error?e.name:"unknown");
      return result({queued:false,error:"تعذر الاتصال بخادم GitHub، ولم نؤكد إرسال الأمر.",runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml"},502);
    }
    if(upstream.status===204){
      await admin.from("deela_agent_dispatches").update({result_status:"queued"}).eq("id",record.id);
      return result({queued:true,ok:true,runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml",message:"تم إرسال أمر المالك إلى وكيل OpenCode المجاني في GitHub Actions. راجع النتيجة قبل الدمج أو النشر."},202);
    }
    await admin.from("deela_agent_dispatches").update({result_status:"failed"}).eq("id",record.id);
    if(upstream.status===401||upstream.status===403)return result({queued:false,code:"github_auth",
      error:"رمز GitHub غير صالح أو يحتاج صلاحية Actions: Read and write على DEELA-V2.",runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml"},503);
    if(upstream.status===404||upstream.status===422)return result({queued:false,code:"github_missing",
      error:"تعذر العثور على Workflow أو قُدم طلب غير صالح. راجع DEELA-V2 في GitHub Actions.",runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml"},503);
    return result({queued:false,error:"رفض GitHub تشغيل المهمة (رمز "+upstream.status+").",runs_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml"},502);
  }
  if(req.method==="GET"&&suffix==="/pentagi/status")
    return result({ready:cfg.configured,mode:cfg.configured?"connected":"needs_self_hosted_server",provider:cfg.configured?cfg.provider:null,scope:cfg.configured?cfg.allowed:null,required:cfg.configured?[]:["DEELA_PENTAGI_URL","DEELA_PENTAGI_TOKEN","DEELA_PENTAGI_SCOPE_URL"],warning:"التشغيل يقتصر على مختبر أو موقع تملك صلاحية اختباره؛ لا وصول تلقائيًا إلى ملفات الهاتف."});
  if(!cfg.configured)return statusError("خادم PentAGI غير مربوط بعد. شغّل نسخة مفتوحة المصدر على خادم HTTPS واضبط إعداداتها في Supabase Secrets.",503);
  if(req.method==="GET"&&suffix==="/pentagi/flows"){
    try {
      const flows=await callPentagi(cfg,"/api/v1/flows/");
      return result({ok:true,flows});
    }catch(e){console.error("PentAGI flow list failed",e instanceof Error?e.message:"unknown");return statusError("تعذر قراءة نتائج PentAGI. افحص الاتصال وصلاحية الرمز.",502)}
  }
  if(req.method==="POST"&&suffix==="/pentagi/execute"){
    const length=Number(req.headers.get("content-length")||"0");
    if(length>9000)return statusError("حجم الطلب كبير",413);
    let data:Record<string,unknown>;
    try{data=await req.json()}catch{return statusError("الطلب ليس JSON صالحًا",400)}
    const prompt=String(data.prompt||"").trim();
    if(prompt.length<10||prompt.length>4000)return statusError("اكتب أمرًا من 10 إلى 4000 حرف",400);
    if(data.confirm_scope!==true)return statusError("تأكيد ملكية بيئة الاختبار مطلوب",400);
    const folder=String(data.folder||"").trim();
    if(folder.length>200||/[\u0000-\u001f]/.test(folder))return statusError("اسم المجلد غير صالح",400);
    // Only the fixed, server-configured target is eligible for automated assessment.
    // Phone filesystem paths are references only; they are NOT remotely mounted or uploaded.
    const input=[
      "نطاق العمل: تطبيقات DEELA المملوكة للمالك فقط.",
      "نطاق الويب المصرح باختباره: "+cfg.allowed,
      "استخدم الاختبارات التحليلية غير التخريبية أولًا. لا تجرب كلمات مرور أو تهاجم حسابات.",
      "إذا كان الطلب يحتاج ملفات أو صلاحيات غير متوفرة، اذكر ذلك بوضوح ولا تفترض الوصول إليها.",
      folder?"اسم مجلد مرجعي من المستخدم (غير مرفوع إلى الخادم): "+folder:"",
      "طلب المستخدم:\n"+prompt
    ].filter(Boolean).join("\n");
    const query="mutation CreateFlow($provider: String!, $input: String!) { createFlow(modelProvider: $provider, input: $input) { id title status createdAt } }";
    try{
      const output=await callPentagi(cfg,"/api/v1/graphql","POST",JSON.stringify({query,variables:{provider:cfg.provider,input}}));
      if(output.errors?.length)return statusError("لم يقبل PentAGI الطلب؛ راجع إعداد مزود النموذج وصلاحيات الخادم.",502);
      const flow=output.data?.createFlow;
      if(!flow?.id)return statusError("لم يرجع PentAGI معرف تشغيل صالحًا",502);
      return result({ok:true,queued:true,flow_id:flow.id,title:flow.title||"",status:flow.status||"created",note:"تم إنشاء مهمة في خادم PentAGI. اقرأ تقارير التدفق من صفحة النتائج."},202);
    }catch(e){console.error("PentAGI flow creation failed",e instanceof Error?e.message:"unknown");return statusError("تعذر بدء المهمة في PentAGI. افحص تشغيل الخادم وتوافق GraphQL.",502)}
  }
  return statusError("المسار غير معروف",404);
});
