import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: {persistSession:false, autoRefreshToken:false} });
const allowedOrigin = (() => { try { return new URL(SUPABASE_URL).origin } catch { return "https://rxlynynjetajtsqlhkrq.supabase.co" } })();
const headers = {
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff",
  "Access-Control-Allow-Origin":allowedOrigin,
  "Access-Control-Allow-Headers":"authorization,apikey,content-type",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
};
const reply=(obj:Record<string,unknown>,status=200)=>new Response(JSON.stringify(obj),{status,headers});
const error=(message:string,status:number)=>reply({ok:false,error:message},status);

// Three upstream open-source PROJECTS, not running scanners. No host URLs or secrets accepted from clients.
const engines=[
  {id:"pentest-swarm",name:"Pentest Swarm AI",repo:"https://github.com/Armur-Ai/Pentest-Swarm-AI",kind:"automated assessment",runtime:"not_deployed"},
  {id:"hexstrike",name:"HexStrike AI",repo:"https://github.com/0x4m4/hexstrike-ai",kind:"MCP security tools",runtime:"not_deployed"},
  {id:"pentestgpt",name:"PentestGPT",repo:"https://github.com/GreyDGL/PentestGPT",kind:"interactive security reasoning",runtime:"not_deployed"},
] as const;

async function isOwner(req:Request):Promise<boolean>{
  const auth=(req.headers.get("authorization")||"").match(/^Bearer ([A-Za-z0-9._~-]+)$/i);
  if(!auth)return false;
  const {data:authData,error:authError}=await admin.auth.getUser(auth[1]);
  if(authError||!authData.user)return false;
  const {data,error:profileError}=await admin.from("profiles").select("role").eq("id",authData.user.id).maybeSingle();
  return !profileError&&data?.role==="owner";
}

function simulate(body:Record<string,unknown>){
  // Pure local rules: NO connections to Snapchat or any external account.
  const platform=String(body.platform||"deela-demo");
  const username=String(body.test_username||"").trim();
  if(!["deela-demo","snapchat-demo"].includes(platform))return {error:"اختر بيئة تجريبية من الخيارات المحددة."};
  if(!/^test_[a-zA-Z0-9_]{3,32}$/.test(username))return {error:"اسم الحساب التجريبي يجب أن يبدأ بـ test_ ثم 3 إلى 32 حرفًا إنجليزيًا أو رقمًا."};
  const mfa=body.mfa_enabled===true;
  const throttle=body.rate_limit_enabled===true;
  const lockout=body.lockout_enabled===true;
  const maxAttempts=5;
  const events=[
    "تشغيل محاكاة محلية لحساب افتراضي؛ لم تُرسل أي طلبات إلى "+(platform==="snapchat-demo"?"Snapchat":"DEELA")+".",
    throttle?"بعد المحاولات المتكررة: نظام تحديد المعدل يمنع الطلبات الزائدة (افتراض إعداد صحيح).":"لا توجد سياسة تحديد معدل في السيناريو؛ قد يزيد خطر التخمين.",
    lockout?"قفل الحساب التجريبي بعد "+maxAttempts+" محاولات فاشلة (افتراض إعداد صحيح).":"السيناريو لا يفرض قفلًا بعد المحاولات الفاشلة.",
    mfa?"اختبار قرار المصادقة: تُرفض الجلسة دون عامل تحقق ثانٍ صحيح.":"السيناريو لا يطلب عامل تحقق ثانٍ.",
  ];
  const recommendations=[
    ...(!throttle?["فعّل تحديد معدل المحاولات عند تسجيل الدخول."]:[]),
    ...(!lockout?["فعّل قفلًا مؤقتًا متدرجًا مع إشعارات للمستخدم."]:[]),
    ...(!mfa?["فعّل المصادقة متعددة العوامل في الحساب التجريبي ونظامك."]:[]),
    "لا تستخدم أسماء مستخدمين حقيقية أو كلمات مرور أو رموز تحقق في هذا المختبر.",
  ];
  return {ok:true,kind:"synthetic_auth_simulation",real_requests:0,attacks_executed:0,
    platform,username,attempts_simulated:maxAttempts,
    checks:{password_guessing_protection:throttle&&lockout?"simulated_protected":"simulated_needs_improvement",
            two_factor:mfa?"simulated_required":"simulated_disabled"},
    events,recommendations,
    notice:"النتائج افتراضية طبقًا للخيارات المحددة؛ لا تحقق فعليًا من أمان Snapchat أو DEELA ولا تسترجع كلمات مرور."};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(!["GET","POST"].includes(req.method))return error("الطريقة غير مدعومة",405);
  if(!(await isOwner(req)))return error("هذه الخدمة لمالك DEELA فقط",403);
  const path=new URL(req.url).pathname.replace(/^.*?\/deela-security-hub/,"")||"/";
  if(req.method==="GET"&&(path==="/engines"||path==="/status"||path==="/"))
    return reply({ok:true,mode:"simulation_only",engines,lab:{ready:true,kind:"synthetic_auth_simulation"},warning:"المشاريع الثلاثة غير مثبّتة أو متصلة بخادم حي. لا توجد أدوات تخمين كلمات المرور أو تجاوز 2FA."});
  if(req.method==="POST"&&path==="/lab/simulate"){
    if(Number(req.headers.get("content-length")||"0")>3000)return error("الطلب كبير جدًا",413);
    let body:Record<string,unknown>;
    try{body=await req.json()}catch{return error("بيانات غير صالحة",400)}
    if(!body||typeof body!=="object"||Array.isArray(body))return error("بيانات غير صالحة",400);
    const result=simulate(body);
    if(result.error)return error(String(result.error),400);
    return reply(result);
  }
  return error("العملية غير متاحة",404);
});
