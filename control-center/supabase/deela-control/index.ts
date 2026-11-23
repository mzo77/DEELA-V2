import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"",ANON=Deno.env.get("SUPABASE_ANON_KEY")||"",SECRET=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const guest=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(SUPABASE_URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});
const RECOVERY_PAGE="<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>استعادة كلمة مرور ديلا</title><style>body{background:#130b12;color:white;font:16px system-ui;max-width:460px;margin:14vh auto;padding:20px}input,button{display:block;width:100%;box-sizing:border-box;padding:13px;margin:12px 0;border-radius:10px}input{background:#291822;color:white;border:1px solid #7a3349}button{background:#db2051;color:white;border:0}</style><h2>استعادة كلمة مرور ديلا ❤️</h2><form id=\"f\"><input type=\"password\" id=\"p\" placeholder=\"كلمة المرور الجديدة\" minlength=\"12\" required autocomplete=\"new-password\"><input type=\"password\" id=\"c\" placeholder=\"تأكيد كلمة المرور\" minlength=\"12\" required autocomplete=\"new-password\"><button>حفظ كلمة المرور</button></form><p id=\"m\"></p><script>const q=new URLSearchParams(location.search),t=q.get('token_hash'),recoveryAccess=new URLSearchParams(location.hash.slice(1)).get('access_token');if(!t&&!recoveryAccess){document.getElementById('f').hidden=true;document.getElementById('m').textContent='الرابط لا يحتوي على رمز استعادة صالح. اطلب رابطًا جديدًا.'}document.getElementById('f').onsubmit=async e=>{e.preventDefault();const p=document.getElementById('p').value,c=document.getElementById('c').value,m=document.getElementById('m');if(p!==c){m.textContent='كلمتا المرور غير متطابقتين';return}try{const r=await fetch('https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control/api/v1/auth/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:t||'',recovery_access_token:recoveryAccess||'',password:p})});const d=await r.json();if(!r.ok)throw Error(d.error||'تعذر التغيير');m.textContent='تم تغيير كلمة المرور. ارجع إلى تطبيق ديلا.';document.getElementById('f').hidden=true;history.replaceState({},'',location.pathname)}catch(x){m.textContent=x.message}}</script></html>";
const PAGE="<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ديلا | مركز التحكم</title><style>\n:root{color-scheme:dark;--hot:#ff234f;--fg:#fff1f4;--bg:#050507}*{box-sizing:border-box}body{background:radial-gradient(ellipse at 80% 0%,#300e1a,transparent 45%),var(--bg);color:var(--fg);font-family:system-ui,Tahoma,sans-serif;margin:0}header{padding:20px;background:#190e16;border-bottom:1px solid #61293a;display:flex;align-items:center;justify-content:space-between}h1{font-size:26px}h2{font-size:19px}main{max-width:1000px;padding:16px;margin:18px auto}.card{padding:22px;border:1px solid #5a2a39;border-radius:18px;background:#191117;margin-bottom:17px}.login{max-width:470px;margin:6vh auto}input,button{font:inherit;border-radius:10px;padding:12px}input{width:100%;background:#0b090c;border:1px solid #743246;color:var(--fg);margin:5px 0 13px}button{background:var(--hot);color:white;border:0;cursor:pointer;font-weight:700}button.secondary{background:#37202b;border:1px solid #743246}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row input{flex:1;min-width:0}.muted,small{color:#c7abb3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric{font-size:32px;color:#ff7696;font-weight:900}nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}nav button{background:#3d1b29}nav button.active{background:var(--hot)}.hidden{display:none!important}table{border-collapse:collapse;width:100%;min-width:650px}td,th{padding:12px;border-bottom:1px solid #5e2a3b;text-align:right;font-size:13px}td button{padding:8px;margin:2px}.scroll{overflow-x:auto}a{color:#ffb0c4}.note{padding:14px;border-right:3px solid var(--hot);background:#26111c;border-radius:8px}#msg{padding:12px;background:#471b2a;border-radius:10px;margin-bottom:12px;display:none}@media(max-width:600px){main{padding:10px}.card{padding:16px}}\n</style></head><body><header><strong>✦ تطبيقات ديلا <span style=\"color:#ff234f\">👑</span></strong><button id=\"logout\" class=\"secondary hidden\">تسجيل الخروج</button></header><main><div id=\"msg\"></div>\n<section id=\"login\" class=\"card login\"><h1>تسجيل دخول المالك</h1><p class=\"muted\">بعد تسجيل الدخول يمكنك اختيار اسم المستخدم وتغيير كلمة المرور.</p><form id=\"lf\">\n<label>اسم المستخدم أو البريد الإلكتروني<input name=\"username\" id=\"loginName\" autocomplete=\"username\" required></label>\n<label>كلمة المرور</label><div class=\"row\"><input id=\"loginPass\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required><button id=\"eye\" class=\"secondary\" type=\"button\" aria-label=\"إظهار كلمة المرور\">👁</button></div>\n<label><input id=\"remember\" type=\"checkbox\" style=\"width:20px\"> تذكر اسم المستخدم</label>\n<p><button id=\"loginBtn\" type=\"submit\">دخول لوحة المالك</button></p><small>حفظ كلمة المرور وتعبئتها تلقائيًا يتم عبر مدير كلمات المرور في هاتفك، وليس في تخزين الموقع.</small></form></section>\n<section id=\"app\" class=\"hidden\"><h1>مركز تحكم المالك</h1><nav><button class=\"active\" data-tab=\"home\">الرئيسية</button><button data-tab=\"members\">الاشتراكات</button><button data-tab=\"power\">قوة غاشمة ⚡</button><button data-tab=\"account\">الحساب والأمان</button></nav>\n<div id=\"home\" class=\"tab\"><div class=\"grid\"><div class=\"card\"><small>إجمالي المستخدمين</small><p class=\"metric\" id=\"total\">—</p></div><div class=\"card\"><small>اشتراكات فعالة</small><p class=\"metric\" id=\"active\">—</p></div><div class=\"card\"><small>اشتراكات موقوفة</small><p class=\"metric\" id=\"suspended\">—</p></div></div><div class=\"note\">المالك يتحكم بالتجربة المجانية لمدة 24 ساعة وتجديد الاشتراكات وإلغائها. لا يمكن للمشترك دخول المتجر باشتراك منتهٍ.</div><div class=\"card\"><h2>آخر العمليات</h2><div id=\"logs\"></div></div></div>\n<div id=\"members\" class=\"tab hidden\"><div class=\"card\"><h2>إدارة المشتركين</h2><div class=\"row\"><input type=\"email\" id=\"inviteEmail\" autocomplete=\"off\" placeholder=\"بريد المشترك لدعوته\"><button id=\"invite\">إرسال دعوة</button><button id=\"reload\" class=\"secondary\">تحديث</button></div><div class=\"scroll\"><table><thead><tr><th>المشترك</th><th>الدور</th><th>الحالة</th><th>الانتهاء</th><th>الإجراءات</th></tr></thead><tbody id=\"rows\"></tbody></table></div></div></div>\n<div id=\"power\" class=\"tab hidden\"><div class=\"card\"><h2>⚡ قوة غاشمة — خاص بالمالك</h2><p class=\"muted\">نقلت تنظيم أدوات مركز الأوامر من مشروعك الأول. الوصول للروابط يعمل الآن؛ تشغيل أدوات المختبر المحلية كاملة يحتاج نقلها في مرحلة مستقلة.</p><div class=\"grid\"><div class=\"card\"><h3>⌘ دليل الأوامر</h3><a href=\"https://github.com/mzo77/DEELA-APPS/blob/main/app/src/main/assets/index.html\" target=\"_blank\" rel=\"noopener\">فتح الكود القديم</a></div><div class=\"card\"><h3>⌨ مختبر البرمجة</h3><a href=\"https://github.com/mzo77/DEELA-APPS\" target=\"_blank\" rel=\"noopener\">المشروع الأول</a></div><div class=\"card\"><h3>⚙ أدوات المطور</h3><a href=\"https://github.com/mzo77/DEELA-V2/actions\" target=\"_blank\" rel=\"noopener\">بناء تطبيقات ديلا</a></div><div class=\"card\"><h3>🎮 مختبر ملفات الألعاب</h3><a href=\"https://github.com/mzo77/DEELA-APPS\" target=\"_blank\" rel=\"noopener\">المصدر الأصلي</a></div><div class=\"card\"><h3>◇ مركز الأمان</h3><a href=\"https://supabase.com/dashboard/project/rxlynynjetajtsqlhkrq\" target=\"_blank\" rel=\"noopener\">إعدادات الخادم</a></div></div></div></div>\n<div id=\"account\" class=\"tab hidden\"><div class=\"card\"><h2>اسم المستخدم الخاص بك</h2><form id=\"uf\"><label>اختر اسم المستخدم<input id=\"newUsername\" autocomplete=\"off\" minlength=\"3\" maxlength=\"32\" pattern=\"[A-Za-z][A-Za-z0-9_.-]{2,31}\" placeholder=\"Mzo\" required></label><button>حفظ اسم المستخدم</button></form></div>\n<div class=\"card\"><h2>تغيير كلمة المرور</h2><form id=\"pf\"><label>كلمة المرور الحالية<input type=\"password\" autocomplete=\"current-password\" id=\"current\" required></label><label>كلمة مرور جديدة (12 رمزًا على الأقل)<input type=\"password\" autocomplete=\"new-password\" id=\"next\" minlength=\"12\" required></label><button>تغيير كلمة المرور</button></form></div></div></section></main>\n<script>\n(function(){'use strict';const $=id=>document.getElementById(id),base=location.pathname.replace(/\\/$/,'');let token=sessionStorage.getItem('deela-token')||'';\nfunction say(s){$('msg').textContent=s;$('msg').style.display='block'}function go(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hidden',x.id!==tab));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));}\nasync function call(path,method,body){let r=await fetch(base+path,{method:method||'GET',cache:'no-store',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined}),j=await r.json();if(!r.ok)throw Error(j.error||'تعذرت العملية');return j}\nfunction authed(){ $('login').classList.add('hidden');$('app').classList.remove('hidden');$('logout').classList.remove('hidden')}\nfunction out(){token='';sessionStorage.removeItem('deela-token');$('app').classList.add('hidden');$('login').classList.remove('hidden');$('logout').classList.add('hidden');$('loginPass').value=''}\nfunction cell(tr,s){const td=tr.insertCell();td.textContent=String(s||'—');return td}function button(p,label,fn){const b=document.createElement('button');b.textContent=label;b.className='secondary';b.onclick=fn;p.append(b)}\nfunction date(s){return s?new Date(s).toLocaleString('ar-SA'):'—'}\nasync function load(){const data=await call('/api/owner/dashboard');authed();$('total').textContent=data.members.length;$('active').textContent=data.members.filter(x=>x.active).length;$('suspended').textContent=data.members.filter(x=>x.suspended).length;$('newUsername').value=data.owner.username||'';\nconst logs=$('logs');logs.replaceChildren();for(const x of data.audit){const p=document.createElement('p');p.textContent=date(x.created_at)+' · '+x.action;logs.append(p)}\nconst rows=$('rows');rows.replaceChildren();for(const m of data.members){const tr=rows.insertRow();cell(tr,m.email||m.display_name||m.id);cell(tr,m.role);cell(tr,m.role==='owner'?'دائم':m.suspended?'موقوف':m.active?'ساري':'غير نشط');cell(tr,m.role==='owner'?'—':date(m.ends_at));const td=tr.insertCell();if(m.role!=='owner'){button(td,'تجربة 24 ساعة',()=>act(m,'trial'));button(td,'+30 يوم',()=>act(m,'renew'));button(td,m.suspended?'استئناف':'إيقاف',()=>act(m,m.suspended?'resume':'suspend'));button(td,'إلغاء',()=>act(m,'revoke'))}}}\nasync function act(m,action){if(['suspend','revoke'].includes(action)&&!confirm('هل تريد تنفيذ الإجراء؟'))return;try{await call('/api/owner/subscription','POST',{user_id:m.id,action,platform:m.platform||'android'});say('تم تحديث اشتراك المشترك.');await load()}catch(e){say(e.message)}}\n$('lf').onsubmit=async e=>{e.preventDefault();const b=$('loginBtn');b.disabled=true;try{const name=$('loginName').value.trim(),r=await call('/api/v1/auth/login','POST',{email:name,password:$('loginPass').value,platform:'android'});token=r.access_token;sessionStorage.setItem('deela-token',token);await load();if($('remember').checked)localStorage.setItem('deela-username',name);else localStorage.removeItem('deela-username');say('تم الدخول بحساب المالك')}catch(x){out();say(x.message)}finally{b.disabled=false}};\n$('eye').onclick=()=>{const p=$('loginPass');p.type=p.type==='password'?'text':'password';$('eye').setAttribute('aria-label',p.type==='text'?'إخفاء كلمة المرور':'إظهار كلمة المرور')};\n$('logout').onclick=out;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));\n$('reload').onclick=()=>load().catch(e=>say(e.message));\n$('invite').onclick=async()=>{try{await call('/api/owner/invite','POST',{email:$('inviteEmail').value.trim()});say('تم إرسال الدعوة');await load()}catch(e){say(e.message)}};\n$('uf').onsubmit=async e=>{e.preventDefault();try{const x=await call('/api/owner/username','POST',{username:$('newUsername').value});say('تم اعتماد اسم المستخدم: '+x.username)}catch(x){say(x.message)}};\n$('pf').onsubmit=async e=>{e.preventDefault();try{await call('/api/owner/password','POST',{current_password:$('current').value,new_password:$('next').value});out();say('تم تغيير كلمة المرور، ادخل مجددًا.')}catch(x){say(x.message)}finally{$('current').value='';$('next').value=''}};\nconst name=localStorage.getItem('deela-username');if(name){$('loginName').value=name;$('remember').checked=true}if(token)load().catch(()=>out());\n})();\n</script></body></html>";
const headers={"Content-Type":"application/json;charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Authorization,Content-Type,apikey","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};
const j=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fail=(text:string,status=400)=>j({error:text},status);
async function who(req:Request){const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))return null;const t=h.slice(7);const {data:{user},error}=await guest.auth.getUser(t);if(error||!user)return null;const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();return {id:user.id,email:user.email||"",role:p?.role||"subscriber"};}
async function member(u:{id:string,role:string},platform="android"){if(u.role==="owner")return {active:true,expires_at_epoch:4102444800};const {data:s}=await admin.from("subscriptions").select("ends_at,suspended,platform").eq("user_id",u.id).maybeSingle();const expiry=s?.ends_at?Date.parse(s.ends_at):0;const active=!!s&&!s.suspended&&expiry>Date.now()&&(!s.platform||s.platform===platform);return {active,expires_at_epoch:active?Math.floor(expiry/1000):0};}
async function log(actor:string,action:string,target?:string){const {error}=await admin.from("deela_control_audit").insert({actor_id:actor,action,target_user_id:target||null});if(error)console.error("audit failed",error.message)}
async function dashboard(owner:{id:string,email:string}){const [profiles,subs,audits,alias,list]=await Promise.all([admin.from("profiles").select("id,role,display_name").limit(500),admin.from("subscriptions").select("user_id,ends_at,suspended,platform").limit(500),admin.from("deela_control_audit").select("action,created_at").order("created_at",{ascending:false}).limit(40),admin.from("deela_admin_usernames").select("username").eq("user_id",owner.id).maybeSingle(),admin.auth.admin.listUsers({page:1,perPage:500})]);if(profiles.error||subs.error)throw Error("dashboard data load failed");const map=new Map((subs.data||[]).map(s=>[s.user_id,s]));const emails=new Map((list.data?.users||[]).map(u=>[u.id,u.email||""]));const {data:pending,error:pendingError}=await admin.from("deela_subscription_requests").select("id,user_id,months,platform,created_at").eq("status","pending").order("created_at",{ascending:false}).limit(200);if(pendingError)throw pendingError;return {requests:(pending||[]).map(r=>({...r,email:emails.get(r.user_id)||""})),owner:{username:alias.data?.username||"",email:owner.email},members:(profiles.data||[]).map(p=>{const s=map.get(p.id);return {id:p.id,email:emails.get(p.id)||"",display_name:p.display_name,role:p.role,platform:s?.platform||"android",ends_at:s?.ends_at||null,suspended:s?.suspended||false,active:p.role==="owner"||!!s&&!s.suspended&&Date.parse(s.ends_at)>Date.now()}}),audit:audits.data||[]};}

const SCAN_SOURCES=new Set(["LITEAPKS","NINEMOD","FIVEPLAY","GETMODSAPK","AN1","APKVISION"]);
function parts(v:string):number[] {const m=v.match(/\d+(?:\.\d+)+/);return m?m[0].split(".").map(n=>Number(n)):[];}
function newerVersion(current:string,next:string):boolean {
 const a=parts(current),b=parts(next);if(!a.length||!b.length)return false;
 for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return y>x;}
 return false;
}
async function pendingSourceCount():Promise<number> {
 const {count,error}=await admin.from("deela_source_inventory").select("source",{count:"exact",head:true}).not("pending_version","is",null);
 if(error)throw error;return count||0;
}


type DeelaMailStatus="sent"|"pending"|"failed"|"unconfigured";
function escapeDeelaMail(x:unknown):string{
 return String(x??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
}
function localDeelaDate(value:string):string {
 return new Intl.DateTimeFormat("ar-SA-u-ca-gregory",{
  timeZone:"Asia/Riyadh",year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"
 }).format(new Date(value));
}
async function sendDeelaActivationEmail(requestId:string):Promise<DeelaMailStatus>{
 const {data:entry,error}=await admin.from("deela_subscription_email_outbox").select("*").eq("request_id",requestId).maybeSingle();
 if(error||!entry){console.error("Subscription mail record unavailable",error?.code);return "failed";}
 if(entry.delivery_status==="sent")return "sent";
 const token=Deno.env.get("RESEND_API_KEY")||"";
 const from=Deno.env.get("DEELA_EMAIL_FROM")||"";
 if(!token||!from){
  await admin.from("deela_subscription_email_outbox").update({delivery_status:"unconfigured",
   last_error_code:"email_provider_not_configured",updated_at:new Date().toISOString()}).eq("request_id",requestId);
  return "unconfigured";
 }
 const user=await admin.auth.admin.getUserById(entry.user_id);
 const email=user.data.user?.email||"";
 if(user.error||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
  await admin.from("deela_subscription_email_outbox").update({delivery_status:"failed",
   last_error_code:"no_valid_recipient",updated_at:new Date().toISOString()}).eq("request_id",requestId);
  return "failed";
 }
 const start=localDeelaDate(entry.starts_at),end=localDeelaDate(entry.ends_at);
 const duration=entry.months===12?"سنة واحدة":entry.months===1?"شهر واحد":entry.months+" أشهر";
 const number=requestId.slice(0,8).toUpperCase();
 const support=(Deno.env.get("DEELA_SUPPORT_EMAIL")||"").trim();
 const details=[
  "تم تفعيل اشتراكك في تطبيقات ديلا ❤️",
  "الحالة: اشتراك فعّال","المدة: "+duration,
  "تاريخ بداية الاشتراك (توقيت السعودية): "+start,
  "تاريخ نهاية الاشتراك (توقيت السعودية): "+end,
  "رقم مرجع التفعيل: "+number,
  "حساب الدخول: "+email,
  "للدخول افتح تطبيق ديلا وسجّل باستخدام البريد الإلكتروني وكلمة المرور التي اخترتها أثناء التسجيل.",
  "إذا لم يتم تأكيد بريدك الإلكتروني بعد، أكمل التحقق أولاً لتسجيل الدخول.",
  "هذه الرسالة لتأكيد الاشتراك فقط وليست إيصال دفع.",
  ...(support?["للمساعدة: "+support]:[]),
  "لا تشارك كلمة المرور أو رموز التحقق مع أي شخص."
 ];
 const safe=(x:string)=>escapeDeelaMail(x);
 const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
 <body style="margin:0;background:#0a080b;font-family:Tahoma,Arial,sans-serif;color:#fce8ed">
 <div style="max-width:540px;margin:24px auto;background:#170f15;border:1px solid #693047;border-radius:20px;padding:28px">
 <div style="text-align:center;color:#ff315e;font-size:27px;font-weight:bold">تطبيقات ديلا ❤️</div>
 <h2 style="text-align:center;color:#fff">تم تفعيل اشتراكك بنجاح ✅</h2>
 <p style="line-height:1.9;color:#f6dce3">أهلاً بك في متجر ديلا! نؤكد لك تفعيل اشتراكك كما يلي:</p>
 <table style="width:100%;border-collapse:collapse;color:#fff">
 ${[["حالة الاشتراك","فعّال"],["مدة الاشتراك",duration],["بداية الاشتراك",start],
  ["نهاية الاشتراك",end],["الرقم المرجعي",number],["حساب الدخول",email]]
  .map(([a,b])=>`<tr><td style="padding:11px;border-bottom:1px solid #422935;color:#e1b8c3">${safe(a)}</td>
  <td style="padding:11px;border-bottom:1px solid #422935">${safe(b)}</td></tr>`).join("")}
 </table><p style="line-height:1.9">افتح تطبيق ديلا وسجّل الدخول بحسابك وكلمة المرور التي اخترتها. إذا لم تؤكد بريدك الإلكتروني، أكمل التحقق أولاً.</p>
 ${support?`<p style="line-height:1.9">الدعم: ${safe(support)}</p>`:""}
 <p style="color:#bcaab1;font-size:12px">هذه رسالة تأكيد للاشتراك وليست إيصال دفع. لا تشارك كلمة المرور أو رموز التحقق.</p>
 </div></body></html>`;
 let status:DeelaMailStatus="failed",lastError="provider_error",providerId:string|null=null;
 try{
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",signal:AbortSignal.timeout(15000),
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json",
    "Idempotency-Key":"deela-activation-"+requestId},
   body:JSON.stringify({from,to:[email],subject:"تأكيد تفعيل اشتراكك في تطبيقات ديلا ❤️",
    html,text:details.join("\n")})
  });
  if(response.ok){
   const result=await response.json();providerId=String(result.id||"")||null;status="sent";lastError="";
  }else{
   lastError="provider_http_"+response.status;
   console.error("DEELA activation email rejected",response.status);
  }
 }catch(e){
  lastError="provider_unreachable";
  console.error("DEELA activation email failed",e instanceof Error?e.name:"unknown");
 }
 const {error:saveError}=await admin.from("deela_subscription_email_outbox")
  .update({delivery_status:status,provider_message_id:providerId,
   last_error_code:lastError||null,attempts:(entry.attempts||0)+1,
   sent_at:status==="sent"?new Date().toISOString():null,
   updated_at:new Date().toISOString()}).eq("request_id",requestId);
 if(saveError)console.error("Email status save failed",saveError.code);
 return status;
}

Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
const pathname=new URL(req.url).pathname,pivot=pathname.indexOf("/deela-control");const path=pivot<0?"":pathname.slice(pivot+14).replace(/\/$/,"");
if(req.method==="GET"&&(path===""||path==="/"))return new Response(PAGE,{headers:{...headers,"Content-Type":"text/html;charset=utf-8","Content-Security-Policy":"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';connect-src 'self';img-src data:;frame-ancestors 'none';base-uri 'none'"}});
if(req.method==="GET"&&path==="/recover")return new Response(RECOVERY_PAGE,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
if(req.method==="GET"&&path==="/health")return j({ok:true,service:"DEELA Control Center"});
try{
if(req.method==="POST"&&path==="/api/v1/auth/recover"){const b=await req.json();const email=String(b.email||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail("أدخل بريدًا إلكترونيًا صحيحًا");const {error}=await guest.auth.resetPasswordForEmail(email,{redirectTo:"https://mzo77.github.io/DEELA-V2/recover/"});if(error)console.error("Password recovery email failed",error.message);return j({ok:true,message:"إذا كان البريد مسجلًا فستصلك رسالة استعادة كلمة المرور."});}
if(req.method==="POST"&&path==="/api/v1/auth/reset"){const b=await req.json(),tokenHash=String(b.token_hash||""),password=String(b.password||"");if(password.length<12||password.length>128||(!String(b.recovery_access_token||"") && tokenHash.length<10)||tokenHash.length>512)return fail("رابط الاستعادة غير صالح أو كلمة المرور قصيرة",400);const recoveryToken=String(b.recovery_access_token||"");let verifiedUser=null;if(recoveryToken){const {data:checked,error:checkError}=await guest.auth.getUser(recoveryToken);if(!checkError)verifiedUser=checked.user;}const {data,error}=verifiedUser?{data:{user:verifiedUser},error:null}:await guest.auth.verifyOtp({token_hash:tokenHash,type:"recovery"});if(error||!data.user)return fail("رابط الاستعادة منتهي أو غير صالح",401);const {error:changed}=await admin.auth.admin.updateUserById(data.user.id,{password});if(changed)throw changed;return j({ok:true});}
if(req.method==="POST"&&path==="/api/v1/auth/register"){const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),months=Number(b.months);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("صيغة البريد الإلكتروني غير صحيحة",400);if(password.length<8||password.length>128)return fail("كلمة المرور يجب أن تكون 8 رموز على الأقل",400);if(![1,2,3,6,12].includes(months))return fail("اختر مدة الاشتراك",400);const displayName=String(b.display_name||"").trim().slice(0,80);if(displayName.length<2)return fail("أدخل اسمًا من حرفين على الأقل",400);const {data,error}=await guest.auth.signUp({email,password,options:{data:{display_name:displayName,requested_months:months,requested_platform:"android"}}});if(error){console.error("signup error:",error.code||error.message);if(error.code==="email_exists"||error.code==="user_already_exists")return fail("البريد مسجل مسبقًا، استخدم تسجيل الدخول أو استعادة كلمة المرور",409);if(error.code==="over_email_send_rate_limit"||error.status===429)return fail("تم تجاوز حد رسائل البريد مؤقتًا. حاول لاحقًا.",429);return fail("تعذر إنشاء الحساب: "+(error.code||"يرجى المحاولة لاحقًا"),400)}return j({ok:true,needs_email_confirmation:!data.session});}
if(req.method==="POST"&&path==="/api/v1/requests"){const u=await who(req);if(!u)return fail("سجّل دخولك أولًا",401);if(u.role==="owner")return fail("حساب المالك لا يحتاج اشتراكًا",403);const b=await req.json(),months=Number(b.months),platform=String(b.platform||"android");if(![1,2,3,6,12].includes(months)||!["android","ios"].includes(platform))return fail("المدة أو المنصة غير صحيحة",400);const {data:existing}=await admin.from("deela_subscription_requests").select("id").eq("user_id",u.id).eq("status","pending").maybeSingle();if(existing)return fail("لديك طلب قيد المراجعة بالفعل",409);const {error}=await admin.from("deela_subscription_requests").insert({user_id:u.id,months,platform});if(error)return fail("تعذر إرسال الطلب",500);return j({ok:true,message:"تم إرسال طلبك إلى لوحة المالك"});}
if(req.method==="GET"&&path==="/api/v1/requests/me"){const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);const {data,error}=await admin.from("deela_subscription_requests").select("id,months,platform,status,created_at").eq("user_id",u.id).order("created_at",{ascending:false}).limit(10);if(error)return fail("تعذر قراءة الطلبات",500);return j({requests:data||[]});}
if(req.method==="POST"&&path==="/api/v1/auth/login"){const b=await req.json();const name=String(b.email||b.username||"").trim().toLowerCase(),password=String(b.password||"");if(!name||!password||name.length>254||password.length>1024)return fail("بيانات الدخول غير صحيحة",401);let email=name;if(!name.includes("@")){if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(name))return fail("بيانات الدخول غير صحيحة",401);const {data:alias}=await admin.from("deela_admin_usernames").select("user_id").eq("username",name).maybeSingle();if(!alias)return fail("بيانات الدخول غير صحيحة",401);const {data:u}=await admin.auth.admin.getUserById(alias.user_id);email=u?.user?.email||"";}if(!email)return fail("بيانات الدخول غير صحيحة",401);const {data,error}=await guest.auth.signInWithPassword({email,password});if(error||!data.session)return fail("بيانات الدخول غير صحيحة",401);const {data:p}=await admin.from("profiles").select("role").eq("id",data.user.id).maybeSingle();const u={id:data.user.id,role:p?.role||"subscriber"};const entitlement=await member(u,b.platform==="ios"?"ios":"android");if(u.role!=="owner"&&!entitlement.active){const months=Number(data.user.user_metadata?.requested_months);if([1,2,3,6,12].includes(months)){const {data:existing}=await admin.from("deela_subscription_requests").select("id").eq("user_id",u.id).eq("status","pending").maybeSingle();if(!existing){const {error:requestError}=await admin.from("deela_subscription_requests").insert({user_id:u.id,months,platform:"android"});if(requestError)console.error("auto request failed",requestError.code);}}}return j({access_token:data.session.access_token,refresh_token:data.session.refresh_token,role:u.role,subscription_active:entitlement.active,expires_in:data.session.expires_in});}
// Rotate the Supabase refresh token and independently verify the current subscription.
if(req.method==="POST"&&path==="/api/v1/auth/refresh"){
 const b=await req.json();
 const refreshToken=String(b.refresh_token||"").trim();
 if(refreshToken.length<10||refreshToken.length>4096)return fail("جلسة الدخول منتهية",401);
 const isolated=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await isolated.auth.refreshSession({refresh_token:refreshToken});
 if(error||!data.session||!data.user){
  if(error&&![400,401,403].includes(Number(error.status||0))){console.error("refresh unavailable",error.code||error.message);return fail("تعذر التحقق مؤقتًا",503);}
  return fail("جلسة الدخول منتهية",401);
 }
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
 if(profileError)throw profileError;
 const role=profile?.role||"subscriber";
 const subscription=await member({id:data.user.id,role},b.platform==="ios"?"ios":"android");
 return j({access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_in:data.session.expires_in,role,subscription_active:subscription.active,expires_at_epoch:subscription.expires_at_epoch});
}
if(req.method==="GET"&&path==="/api/v1/entitlements/me"){const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);return j(await member(u));}

if(req.method==="GET"&&path==="/api/v1/source/updates"){
 const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);
 const entitlement=await member(u,"android");if(!entitlement.active)return fail("الاشتراك غير نشط",403);
 const since=new Date(Date.now()-60*86400000).toISOString();
 const {data,error}=await admin.from("deela_published_source_updates")
  .select("source,app_key,title,version,page_url,icon_url,published_at")
  .gte("published_at",since).order("published_at",{ascending:false}).limit(300);
 if(error)throw error;return j({updates:data||[]});
}
if(path.startsWith("/api/owner/")){const u=await who(req);if(!u||u.role!=="owner")return fail("صلاحية المالك مطلوبة",403);

if(req.method==="GET"&&path==="/api/owner/source/candidates"){
 const {data,error}=await admin.from("deela_source_inventory")
  .select("source,app_key,title,version,pending_version,page_url,scanned_at")
  .not("pending_version","is",null).order("scanned_at",{ascending:false}).limit(500);
 if(error)throw error;
 return j({pending_count:await pendingSourceCount(),updates:data||[]});
}
if(req.method==="POST"&&path==="/api/owner/source/scan"){
 const b=await req.json(),source=String(b.source||"");
 if(!SCAN_SOURCES.has(source)||!Array.isArray(b.apps)||b.apps.length>100)return fail("بيانات الفحص غير صحيحة",400);
 const unique=new Map<string,{source:string,app_key:string,title:string,version:string,page_url:string|null,icon_url:string|null}>();
 for(const raw of b.apps){
  if(!raw||typeof raw!=="object")continue;
  const key=String(raw.key||"").trim(),title=String(raw.title||"").trim(),version=String(raw.version||"").trim();
  if(!key||key.length>300||!title||title.length>180||version.length>100||!parts(version).length)continue;
  const url=String(raw.page_url||"").trim(),icon=String(raw.icon_url||"").trim();
  unique.set(key,{source,app_key:key,title,version,page_url:url.startsWith("https://")&&url.length<600?url:null,icon_url:icon.startsWith("https://")&&icon.length<600?icon:null});
 }
 const rows=[...unique.values()];
 if(!rows.length)return j({scanned:0,pending_count:await pendingSourceCount()});
 const {data:old,error:readErr}=await admin.from("deela_source_inventory")
  .select("app_key,version,pending_version,last_published_version").eq("source",source)
  .in("app_key",rows.map(a=>a.app_key));
 if(readErr)throw readErr;
 const known=new Map((old||[]).map(x=>[x.app_key,x]));
 const now=new Date().toISOString();
 const updates=rows.map(item=>{
  const prior=known.get(item.app_key),changed=!!prior&&newerVersion(prior.version,item.version);
  return {...item,version:changed||!prior?item.version:prior.version,
   pending_version:changed?item.version:(prior?.pending_version||null),
   last_published_version:prior?.last_published_version||null,scanned_at:now};
 });
 const {error}=await admin.from("deela_source_inventory").upsert(updates,{onConflict:"source,app_key"});
 if(error)throw error;
 return j({scanned:rows.length,pending_count:await pendingSourceCount()});
}
if(req.method==="POST"&&path==="/api/owner/source/publish"){
 const {data:rows,error:readErr}=await admin.from("deela_source_inventory")
  .select("source,app_key,title,pending_version,page_url,icon_url")
  .not("pending_version","is",null).limit(500);
 if(readErr)throw readErr;
 if(!rows?.length)return j({published:0,pending_count:0});
 const now=new Date().toISOString();
 const {error}=await admin.from("deela_published_source_updates").upsert(
  rows.map(x=>({source:x.source,app_key:x.app_key,title:x.title,version:x.pending_version,
   page_url:x.page_url,icon_url:x.icon_url,published_at:now})),
  {onConflict:"source,app_key"});
 if(error)throw error;
 // Do not erase a newer candidate that arrived during publishing.
 for(const row of rows) {
   const {error:clearError}=await admin.from("deela_source_inventory")
    .update({pending_version:null,last_published_version:row.pending_version})
    .eq("source",row.source).eq("app_key",row.app_key).eq("pending_version",row.pending_version);
   if(clearError)throw clearError;
 }
 await log(u.id,"source_updates_published");
 return j({published:rows.length,pending_count:await pendingSourceCount()});
}
if(req.method==="GET"&&path==="/api/owner/dashboard")return j(await dashboard(u));
if(req.method==="POST"&&path==="/api/owner/username"){const b=await req.json(),username=String(b.username||"").trim().toLowerCase();if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(username))return fail("اسم المستخدم من 3 إلى 32 حرفًا ويبدأ بحرف إنجليزي");const {error}=await admin.from("deela_admin_usernames").upsert({user_id:u.id,username,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)return fail("اسم المستخدم مستخدم أو غير صالح");await log(u.id,"owner_username_updated");return j({username});}
if(req.method==="POST"&&path==="/api/owner/password"){const b=await req.json(),old=String(b.current_password||""),next=String(b.new_password||"");if(next.length<12||next.length>128)return fail("كلمة المرور الجديدة من 12 إلى 128 رمزًا");const {error:check}=await guest.auth.signInWithPassword({email:u.email,password:old});if(check)return fail("كلمة المرور الحالية غير صحيحة",401);const {error}=await admin.auth.admin.updateUserById(u.id,{password:next});if(error)throw error;await log(u.id,"owner_password_changed");return j({ok:true});}
if(req.method==="POST"&&path==="/api/owner/invite"){const b=await req.json(),email=String(b.email||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("بريد إلكتروني غير صحيح");const {error}=await admin.auth.admin.inviteUserByEmail(email);if(error)return fail("تعذرت الدعوة: "+error.message);await log(u.id,"subscriber_invited");return j({ok:true});}
if(req.method==="POST"&&path==="/api/owner/requests/review"){
 const b=await req.json(),id=String(b.id||""),decision=String(b.decision||"");
 if(!["approved","rejected"].includes(decision)||!/^[a-f0-9-]{36}$/i.test(id))return fail("طلب غير صالح",400);
 const {data:r,error:requestError}=await admin.from("deela_subscription_requests").select("*").eq("id",id).eq("status","pending").maybeSingle();
 if(requestError)throw requestError;
 if(!r)return fail("الطلب غير موجود أو تمت مراجعته",409);
 let startsAt="",endsAt="";
 if(decision==="approved"){
  const {data:old,error:oldError}=await admin.from("subscriptions").select("ends_at").eq("user_id",r.user_id).maybeSingle();
  if(oldError)throw oldError;
  const now=new Date(),base=new Date(Math.max(now.getTime(),old?.ends_at?Date.parse(old.ends_at):0));
  startsAt=now.toISOString();
  base.setUTCMonth(base.getUTCMonth()+r.months);endsAt=base.toISOString();
  const {error}=await admin.from("subscriptions").upsert({user_id:r.user_id,starts_at:startsAt,ends_at:endsAt,suspended:false,platform:r.platform,updated_at:startsAt},{onConflict:"user_id"});
  if(error)return fail("تعذر تفعيل الاشتراك",500);
 }
 const {data:reviewed,error:reviewError}=await admin.from("deela_subscription_requests")
  .update({status:decision,reviewed_at:new Date().toISOString(),reviewed_by:u.id})
  .eq("id",id).eq("status","pending").select("id").maybeSingle();
 if(reviewError)throw reviewError;
 if(!reviewed)return fail("تمت مراجعة الطلب مسبقًا؛ حدث القائمة",409);
 let emailStatus:DeelaMailStatus|null=null;
 if(decision==="approved"){
  const {error:outboxError}=await admin.from("deela_subscription_email_outbox").upsert({
   request_id:id,user_id:r.user_id,months:r.months,starts_at:startsAt,ends_at:endsAt,
   delivery_status:"pending"
  },{onConflict:"request_id",ignoreDuplicates:true});
  if(outboxError){console.error("Failed to queue activation email",outboxError.code);emailStatus="failed";}
  else {
   try {emailStatus=await sendDeelaActivationEmail(id);}
   catch(e){console.error("Activation email failed unexpectedly",e instanceof Error?e.name:"unknown");emailStatus="failed";}
  }
 }
 await log(u.id,"request_"+decision,r.user_id);
 return j({ok:true,email_status:emailStatus});
}
if(req.method==="GET"&&path==="/api/owner/subscription-email/status"){
 const {data:messages,error}=await admin.from("deela_subscription_email_outbox")
  .select("request_id,user_id,delivery_status,last_error_code,sent_at,updated_at")
  .order("created_at",{ascending:false}).limit(100);
 if(error)throw error;
 return j({ready:!!(Deno.env.get("RESEND_API_KEY")&&Deno.env.get("DEELA_EMAIL_FROM")),messages:messages||[]});
}
if(req.method==="POST"&&path==="/api/owner/subscription-email/retry"){
 const b=await req.json(),id=String(b.request_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(id))return fail("طلب غير صالح",400);
 const {data:reqRow,error}=await admin.from("deela_subscription_requests").select("status").eq("id",id).maybeSingle();
 if(error)throw error;
 if(!reqRow||reqRow.status!=="approved")return fail("لا يمكن إرسال رسالة لطلب غير مفعل",409);
 let status:DeelaMailStatus="failed";
 try {status=await sendDeelaActivationEmail(id);}
 catch(e){console.error("Email retry failed unexpectedly",e instanceof Error?e.name:"unknown");}
 return j({ok:true,email_status:status});
}

if(req.method==="POST"&&path==="/api/owner/subscription"){const b=await req.json(),id=String(b.user_id||""),action=String(b.action||"");if(!/^[a-f0-9-]{36}$/i.test(id)||!["trial","renew","suspend","resume","revoke"].includes(action))return fail("طلب غير صالح");if(id===u.id)return fail("لا يمكن تعديل المالك",403);const {data:target}=await admin.from("profiles").select("role").eq("id",id).maybeSingle();if(!target||target.role==="owner")return fail("لا يمكن تعديل هذا الحساب",403);const {data:old}=await admin.from("subscriptions").select("ends_at,suspended,platform").eq("user_id",id).maybeSingle();const now=Date.now(),oldEnd=old?.ends_at?Date.parse(old.ends_at):0;let change:Record<string,unknown>={user_id:id,updated_at:new Date().toISOString(),platform:old?.platform||"android"};
if(action==="trial")Object.assign(change,{starts_at:new Date().toISOString(),ends_at:new Date(now+86400000).toISOString(),suspended:false});
if(action==="renew"){const months=Number(b.months);if(![1,2,3,6,12].includes(months))return fail("مدة الاشتراك غير صحيحة",400);const base=new Date(Math.max(now,oldEnd));base.setUTCMonth(base.getUTCMonth()+months);Object.assign(change,{starts_at:new Date().toISOString(),ends_at:base.toISOString(),suspended:false});}
if(action==="suspend"||action==="resume"||action==="revoke"){if(!old)return fail("لا يوجد اشتراك لهذا المستخدم");change.suspended=action!=="resume";if(action==="revoke")change.ends_at=new Date(now).toISOString();}
const {error}=await admin.from("subscriptions").upsert(change,{onConflict:"user_id"});if(error){console.error(error);return fail("تعذر تعديل الاشتراك",500)}await log(u.id,"subscription_"+action,id);return j({ok:true});}
}
return fail("مسار غير موجود",404);
}catch(e){console.error("deela-control",e);return fail("خطأ في الخادم",500)}
});