/* DEELA iOS PWA: no CDN, no HTML injection; calls DEELA iOS APIs. */
(()=>{"use strict";
const CONTROL="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control",BASE="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web",STORE="deela.ios.refresh.v1",$=id=>document.getElementById(id);
let access="",refresh="",current=null,sourceApps=[],myApps=[],sourcesLoaded=false;
function show(id,yes){$(id).classList.toggle("hidden",!yes)}
function flash(message){const e=$("flash");e.textContent=message;e.classList.add("visible");clearTimeout(flash.timer);flash.timer=setTimeout(()=>e.classList.remove("visible"),6500)}
function notify(text,kind="neutral"){const e=$("heroStatus");e.textContent=text;e.className="status "+kind}
function value(id){return $(id).value.trim()}
function safeURL(raw){try{const u=new URL(raw);return u.protocol==="https:"?u.href:null}catch{return null}}
async function call(path,opt={}){
 const send=async()=>{
  const r=await fetch(BASE+path,{method:opt.method||"GET",cache:"no-store",credentials:"omit",headers:{
   ...(opt.body?{"Content-Type":"application/json"}:{}),...(opt.auth!==false&&access?{"Authorization":"Bearer "+access}:{})
  },body:opt.body?JSON.stringify(opt.body):undefined});
  let out={};try{out=await r.json()}catch{}
  if(!r.ok){const e=new Error(out.error||"تعذر الاتصال بخدمة ديلا");e.status=r.status;throw e}
  return out;
 };
 try{return await send()}catch(e){
  if(e.status===401&&opt.auth!==false&&refresh&&path!=="/api/refresh"){await renew();return await send()}
  throw e;
 }
}
function saveTokens(tokens){access=tokens.access_token||"";refresh=tokens.refresh_token||"";if(refresh)localStorage.setItem(STORE,refresh)}
async function renew(){if(!refresh)throw Error("جلسة منتهية");const data=await call("/api/refresh",{method:"POST",body:{refresh_token:refresh},auth:false});saveTokens(data)}
function logout(message=true){
 access="";refresh="";current=null;myApps=[];sourceApps=[];
 localStorage.removeItem(STORE);
 show("authArea",true);show("appArea",false);show("logoutBtn",false);
 notify("سجّل الدخول للمتابعة");
 if(message)flash("تم تسجيل الخروج من المتجر");
}
async function initialize(){
 const saved=localStorage.getItem(STORE);
 if(saved){refresh=saved;try{await renew();await enter();return}catch(e){logout(false);flash("انتهت الجلسة. سجّل دخولك مرة أخرى.")}}
 show("authArea",true);notify("سجّل الدخول للمتابعة");
}
async function enter(){
 const {account}=await call("/api/me");current=account;
 show("authArea",false);show("appArea",true);show("logoutBtn",true);
 $("helloName").textContent=current.display_name||current.email||"بك";
 $("expiry").textContent=current.owner?"حساب المالك":current.active&&current.ends_at?
  "ساري حتى "+new Date(current.ends_at).toLocaleDateString("ar-SA"):"بانتظار اعتماد الاشتراك";
 $("accountStatus").textContent=current.owner?"المالك":current.active?"اشتراك iOS نشط":"لم يُفعّل اشتراك iOS";
 $("accountStatus").className="status "+(current.active?"":"warn");
 notify(current.active?"حساب الآيفون مفعّل":"بانتظار موافقة المالك",current.active?"":"warn");
 show("activeArea",current.active);show("inactiveArea",!current.active);
 show("ownerTab",Boolean(current.owner));
 if(current.active)await loadCatalog();else await loadRequests();
}
async function loadRequests(){
 try{
  const {requests}=await call("/api/requests");
  const target=$("requestsList");target.replaceChildren();
  if(!requests.length){const p=document.createElement("p");p.className="muted";p.textContent="لا توجد طلبات سابقة";target.append(p);return}
  for(const request of requests){const p=document.createElement("p");p.className="muted";
   const label=request.status==="pending"?"قيد المراجعة":request.status==="approved"?"تمت الموافقة":request.status==="rejected"?"مرفوض":request.status;
   p.textContent=(request.platform==="ios"?"آيفون":"أندرويد")+" · "+request.months+" شهر · "+label;target.append(p)}
 }catch(e){flash(e.message)}
}
function el(tag,className,text){const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=String(text);return x}
function card(item,source=false){
 const x=el("article","app"),head=el("div","apphead"),icon=safeURL(item.icon_url);
 if(icon){const img=el("img","appicon");img.alt="";img.loading="lazy";img.src=icon;img.referrerPolicy="no-referrer";head.append(img)}
 else head.append(el("div","fallback","◈"));
 const name=el("div");name.append(el("strong","",item.title||"تطبيق"),el("div","meta","الإصدار "+(item.version||item.version_name||"—")));head.append(name);x.append(head);
 x.append(el("p","",item.description||"تفاصيل التطبيق غير متوفرة"));
 if(source){
  const url=safeURL(item.download_url),btn=el("button","button small",url?"فتح رابط IPA":"رابط التحميل غير متوفر");
  btn.disabled=!url;btn.type="button";if(url)btn.onclick=()=>{window.open(url,"_blank","noopener,noreferrer");flash("ملف IPA يحتاج توقيعًا صالحًا لتثبيته على الآيفون.")};x.append(btn)
 }else{
  const btn=el("button","button small",item.has_file?"تحميل ملف IPA":"الملف غير متوفر");btn.disabled=!item.has_file;btn.type="button";
  btn.onclick=async()=>{btn.disabled=true;btn.textContent="جارٍ تجهيز الرابط";
   try{const r=await call("/api/download",{method:"POST",body:{app_id:item.id}});
    const url=safeURL(r.url);if(!url)throw Error("رابط التنزيل غير صالح");
    window.location.href=url;flash("تنزيل IPA لا يثبته تلقائيًا. تحتاج شهادة توقيع.")
   }catch(e){flash(e.message)}finally{btn.disabled=false;btn.textContent="تحميل ملف IPA"}
  };x.append(btn)
 }
 return x;
}
function render(target,items,needle,source=false){
 const container=$(target);container.replaceChildren();const q=needle.trim().toLocaleLowerCase();
 const filtered=items.filter(x=>!q||String(x.title||"").toLocaleLowerCase().includes(q));
 if(!filtered.length){container.append(el("div","empty",source?"لا توجد تطبيقات مطابقة أو أن المصدر فارغ.":"لا توجد تطبيقات iOS منشورة في ديلا بعد. افتح تبويب مصادر Feather."));return}
 const fragment=document.createDocumentFragment();filtered.slice(0,180).forEach(x=>fragment.append(card(x,source)));container.append(fragment)
}
async function loadCatalog(){try{const {apps}=await call("/api/catalog");myApps=apps;render("myAppsGrid",myApps,value("mySearch"))}catch(e){flash(e.message)}}
async function loadSources(){
 if(sourcesLoaded)return;const {sources}=await call("/api/sources"),target=$("sourceList");target.replaceChildren();
 for(const source of sources){const b=el("button","source");b.type="button";
  b.append(el("span","",source.name),el("span","muted","استعراض التطبيقات ›"));b.onclick=()=>chooseSource(source);target.append(b)}
 sourcesLoaded=true;
}
async function chooseSource(source){
 show("sourceResults",true);$("sourceTitle").textContent=source.name;
 $("sourceApps").replaceChildren(el("div","empty","جاري تحميل قائمة التطبيقات..."));
 try{const result=await call("/api/source?id="+encodeURIComponent(source.id));sourceApps=result.apps;
  $("sourceTitle").textContent=(result.name||source.name)+" · "+result.listed+" تطبيق";
  render("sourceApps",sourceApps,value("sourceSearch"),true);$("sourceResults").scrollIntoView({behavior:"smooth",block:"start"})
 }catch(e){sourceApps=[];$("sourceApps").replaceChildren(el("div","empty","تعذر قراءة هذا المصدر الآن. جرّب مصدرًا آخر."));flash(e.message)}
}
async function controlCall(path,body=null) {
 const send=async()=>{
  const r=await fetch(CONTROL+path,{method:body?"POST":"GET",cache:"no-store",credentials:"omit",headers:{
    "Authorization":"Bearer "+access,...(body?{"Content-Type":"application/json"}:{})
  },body:body?JSON.stringify(body):undefined});
  const data=await r.json();
  if(!r.ok){const e=new Error(data.error||"تعذرت عملية المالك");e.status=r.status;throw e}
  return data;
 };
 try{return await send()}catch(e){if(e.status===401&&refresh){await renew();return await send()}throw e}
}
async function loadOwnerRequests(){
 if(!current?.owner)return;
 const target=$("ownerRequests");target.replaceChildren(el("div","empty","جارٍ قراءة طلبات الآيفون..."));
 try{
  const data=await controlCall("/api/owner/dashboard");
  const requests=(data.requests||[]).filter(req=>req.platform==="ios");
  target.replaceChildren();
  if(!requests.length){target.append(el("div","empty","لا توجد طلبات آيفون معلقة."));return}
  for(const request of requests){
   const block=el("div","panel"),title=el("h3","",request.email||"مشترك آيفون");
   block.append(title,el("p","muted",request.months+" شهر · "+new Date(request.created_at).toLocaleDateString("ar-SA")));
   for(const [decision,label] of [["approved","موافقة وتفعيل"],["rejected","رفض الطلب"]]){
    const b=el("button",decision==="approved"?"button small":"button small secondary",label);b.type="button";
    b.onclick=async()=>{
     if(!confirm((decision==="approved"?"اعتماد":"رفض")+" طلب اشتراك الآيفون؟"))return;
     b.disabled=true;
     try{await controlCall("/api/owner/requests/review",{id:request.id,decision});flash("تمت مراجعة الطلب.");await loadOwnerRequests()}
     catch(e){flash(e.message)}finally{b.disabled=false}
    };
    block.append(b,document.createTextNode(" "));
   }
   target.append(block);
  }
 }catch(e){target.replaceChildren(el("div","empty","تعذر تحميل طلبات المالك."));flash(e.message)}
}
function setForm(tab){$("loginTab").classList.toggle("active",tab==="login");$("registerTab").classList.toggle("active",tab==="register");show("loginForm",tab==="login");show("registerForm",tab==="register")}
$("refreshSubscription").onclick=async()=>{try{await enter();flash(current?.active?"تم تفعيل اشتراك الآيفون!":"الطلب ما زال قيد المراجعة.")}catch(e){flash(e.message)}};
$("refreshOwner").onclick=loadOwnerRequests;
$("recoverBtn").onclick=async()=>{
 const email=value("loginEmail");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){flash("اكتب بريدك الإلكتروني في خانة تسجيل الدخول أولًا.");return}
 const btn=$("recoverBtn");btn.disabled=true;
 try{
  const response=await fetch(CONTROL+"/api/v1/auth/recover",{method:"POST",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
  if(!response.ok)throw Error("تعذر إرسال طلب الاستعادة");
  flash("إذا كان البريد مسجلًا في ديلا ستصلك رسالة لاستعادة كلمة المرور.");
 }catch(e){flash(e.message)}finally{btn.disabled=false}
};
$("loginTab").onclick=()=>setForm("login");$("registerTab").onclick=()=>setForm("register");$("logoutBtn").onclick=()=>logout(true);
$("loginForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;
 try{saveTokens(await call("/api/login",{method:"POST",body:{email:value("loginEmail"),password:$("loginPassword").value},auth:false}));$("loginPassword").value="";await enter()}
 catch(e){flash(e.message)}finally{b.disabled=false}};
$("registerForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;
 try{const r=await call("/api/register",{method:"POST",body:{email:value("registerEmail"),password:$("registerPassword").value,display_name:value("registerName")},auth:false});
  $("registerPassword").value="";flash(r.needs_email_confirmation?"تم التسجيل. أكد البريد ثم سجّل الدخول.":"تم إنشاء حسابك. سجل الدخول واطلب اشتراك iOS.");
  $("loginEmail").value=value("registerEmail");setForm("login")
 }catch(e){flash(e.message)}finally{b.disabled=false}};
$("requestForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;
 try{const r=await call("/api/requests",{method:"POST",body:{months:Number(value("requestMonths"))}});flash(r.message);await loadRequests()}
 catch(e){flash(e.message)}finally{b.disabled=false}};
$("mySearch").oninput=()=>render("myAppsGrid",myApps,value("mySearch"));
$("sourceSearch").oninput=()=>render("sourceApps",sourceApps,value("sourceSearch"),true);
document.querySelectorAll("#storeTabs [data-panel]").forEach(b=>b.onclick=async()=>{
 document.querySelectorAll("#storeTabs button").forEach(x=>x.classList.toggle("active",x===b));
 for(const id of ["myApps","featuredSources","helpPanel","ownerPanel"])show(id,b.dataset.panel===id);
 if(b.dataset.panel==="featuredSources")try{await loadSources()}catch(e){flash(e.message)}
 if(b.dataset.panel==="ownerPanel")await loadOwnerRequests();
});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
initialize().catch(e=>{flash(e.message);notify("تعذر التحقق");show("authArea",true)});
})();