import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { simulate } from "./simulation.ts";

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

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(!["GET","POST"].includes(req.method))return error("الطريقة غير مدعومة",405);
  if(!(await isOwner(req)))return error("هذه الخدمة لمالك DEELA فقط",403);
  const path=new URL(req.url).pathname.replace(/^.*?\/deela-security-hub/,"")||"/";
  if(req.method==="GET"&&path==="/audit/latest"){
    // GitHub Actions static source audit on DEELA's own public repository; no user-supplied URLs.
    const url="https://api.github.com/repos/mzo77/DEELA-V2/actions/workflows/deela-security-audit.yml/runs?per_page=3&branch=feature/deela-pentagi-0910";
    try{
      const response=await fetch(url,{
        signal:AbortSignal.timeout(10000),
        headers:{"Accept":"application/vnd.github+json","User-Agent":"deela-security-hub/1.0","X-GitHub-Api-Version":"2022-11-28"}
      });
      if(!response.ok)return reply({ok:false,available:false,reason:"تعذّر الاستعلام عن GitHub Actions ("+response.status+")",actions_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-security-audit.yml"},502);
      const data=await response.json();
      const runs=Array.isArray(data.workflow_runs)?data.workflow_runs.slice(0,3).map((r:Record<string,unknown>)=>({
        status:String(r.status||"unknown"),conclusion:r.conclusion||null,url:String(r.html_url||""),
        created_at:String(r.created_at||""),run_number:Number(r.run_number||0),
      })):[];
      return reply({ok:true,available:runs.length>0,runs,
        actions_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-security-audit.yml",
        note:"فحص حقيقي لكود DEELA عبر GitHub Actions، وليس تشغيل محركات Pentest Swarm أو HexStrike أو PentestGPT."});
    }catch{
      return reply({ok:false,available:false,reason:"تعذر الاتصال بخدمة GitHub Actions",actions_url:"https://github.com/mzo77/DEELA-V2/actions/workflows/deela-security-audit.yml"},502);
    }
  }
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
