/* DEELA iOS PWA: no CDN, no HTML injection; calls DEELA iOS APIs. */
(()=>{"use strict";
const CONTROL="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control",BASE="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web",STORE="deela.ios.refresh.v1",$=id=>document.getElementById(id);
let access="",refresh="",current=null,sourceApps=[],myApps=[],allApps=[],sourcesLoaded=false,allSources=[],renderLimit=36,fetchGeneration=0,fetching=false;
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
 access="";refresh="";current=null;myApps=[];sourceApps=[];allApps=[];allSources=[];sourcesLoaded=false;fetchGeneration++;fetching=false;
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
// Display-only catalogue: Accretion metadata from a protected DEELA iOS API; never expose IPA URLs or signing keys.
function card(item){
 const x=el("article","app"),head=el("div","apphead"),icon=safeURL(item.icon_url);
 if(icon){
  const img=el("img","appicon");img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.src=icon;
  img.onerror=()=>{img.replaceWith(el("div","fallback","◈"))};head.append(img);
 }else head.append(el("div","fallback","◈"));
 const name=el("div");
 name.append(el("strong","",item.title||"تطبيق"),el("div","meta","الإصدار "+(item.version||item.version_name||"—")));
 head.append(name);x.append(head);
 x.append(el("span","view-badge","للعرض فقط"));
 x.append(el("p","",item.description||"التفاصيل غير متوفرة من هذا المصدر."));
 const source=el("span","meta","المصدر: "+(item.source_name||"ديلا"));
 x.append(source);
 const button=el("button","button small secondary","عرض التفاصيل");
 button.type="button";button.onclick=()=>openDetails(item);x.append(button);
 return x;
}
function render(target,items,needle,limit=180){
 const container=$(target);container.replaceChildren();
 const q=(needle||"").trim().toLocaleLowerCase();
 const filtered=items.filter(item=>!q||[item.title,item.description,item.category,item.developer,item.source_name].some(v=>String(v||"").toLocaleLowerCase().includes(q)));
 if(!filtered.length){
  container.append(el("div","empty","لا توجد برامج مطابقة حاليًا. جرّب مصدرًا آخر أو حدّث القائمة."));
  return 0;
 }
 const fragment=document.createDocumentFragment();
 filtered.slice(0,limit).forEach(x=>fragment.append(card(x)));
 container.append(fragment);
 return filtered.length;
}
function openDetails(item){
 const dialog=$("appDetailDialog");
 $("detailTitle").textContent=item.title||"تطبيق";
 $("detailVersion").textContent="الإصدار: "+(item.version||item.version_name||"غير محدد");
 $("detailCategory").textContent="التصنيف: "+(item.category||"تطبيقات");
 $("detailDeveloper").textContent=(item.developer?"المطوّر: "+item.developer+" · ":"")+"المصدر: "+(item.source_name||"ديلا");
 $("detailDescription").textContent=(item.description||"لا تتوفر معلومات إضافية عن هذا التطبيق.");
 const iconTarget=$("detailIcon");iconTarget.replaceChildren();
 const icon=safeURL(item.icon_url);
 if(icon){const img=el("img","appicon");img.src=icon;img.alt="";img.referrerPolicy="no-referrer";iconTarget.append(img)}
 else iconTarget.append(el("div","fallback","◈"));
 const shots=$("detailScreenshots");shots.replaceChildren();
 if(Array.isArray(item.screenshots)){
  for(const src of item.screenshots.slice(0,6)){
   const url=safeURL(src);if(!url)continue;
   const image=el("img");image.src=url;image.alt="صورة من التطبيق";image.loading="lazy";image.referrerPolicy="no-referrer";shots.append(image);
  }
 }
 if(typeof dialog.showModal==="function")dialog.showModal();
 else{flash("تفاصيل "+(item.title||"التطبيق")+": "+(item.description||"لا يتوفر وصف."));}
}
function catalogKey(item){
 const bundle=String(item.bundle_id||"").trim().toLowerCase();
 return bundle||String(item.title||"").trim().toLocaleLowerCase()+"|"+String(item.developer||"").trim().toLocaleLowerCase();
}
function addItems(items){
 const existing=new Set(allApps.map(catalogKey));
 for(const item of items){
  const key=catalogKey(item);
  if(!key||existing.has(key))continue;
  existing.add(key);allApps.push(item);
 }
}
function setCategories(){
 const select=$("categoryFilter"),selected=select.value;
 const categories=new Set(allApps.map(x=>String(x.category||"تطبيقات").trim()).filter(Boolean));
 const fragment=document.createDocumentFragment();
 for(const category of Array.from(categories).sort((a,b)=>a.localeCompare(b,"ar"))){
  const option=el("option","",category);option.value=category;fragment.append(option);
 }
 select.replaceChildren();
 const defaultOption=el("option","","جميع التصنيفات");defaultOption.value="";select.append(defaultOption,fragment);
 if(categories.has(selected))select.value=selected;
}
function renderCatalog(){
 const needle=value("mySearch").toLocaleLowerCase(),category=$("categoryFilter").value;
 const filtered=allApps.filter(item=>(
  (!category||String(item.category||"تطبيقات")===category)&&
  (!needle||[item.title,item.description,item.category,item.developer,item.source_name].some(x=>String(x||"").toLocaleLowerCase().includes(needle)))
 ));
 const list=$("myAppsGrid");list.replaceChildren();
 if(!filtered.length){
  list.append(el("div","empty",fetching?"جارٍ جلب مكتبة Accretion الكبيرة...":"لم تتوفر نتائج مطابقة الآن؛ جرّب تحديث القائمة أو تغيير البحث."));
 }else{
  const fragment=document.createDocumentFragment();
  filtered.slice(0,renderLimit).forEach(item=>fragment.append(card(item)));
  list.append(fragment);
 }
 show("moreApps",filtered.length>renderLimit);
 $("catalogSummary").textContent=allApps.length.toLocaleString("ar-SA")+" تطبيق في المكتبة • "+(fetching?"جاري التحديث":"تصفح فقط • التثبيت يحتاج توقيعًا");
}
async function loadSources(){
 if(sourcesLoaded)return allSources;
 const {sources}=await call("/api/sources");
 allSources=sources||[];sourcesLoaded=true;
 const target=$("sourceList");target.replaceChildren();
 for(const source of allSources){
  const button=el("button","source");button.type="button";
  button.append(el("span","",source.name),el("span","muted","استعراض ←"));
  button.onclick=()=>chooseSource(source);target.append(button);
 }
 return allSources;
}
async function chooseSource(source){
 show("sourceResults",true);
 $("sourceTitle").textContent=source.name;
 $("sourceApps").replaceChildren(el("div","empty","جارٍ تحميل معلومات التطبيقات من المصدر..."));
 try{
  let items=allApps.filter(x=>x.source_id===source.id);
  if(!items.length){
   const response=await call("/api/source?id="+encodeURIComponent(source.id));
   items=(response.apps||[]).map(x=>({...x,source_id:source.id,source_name:source.name}));
  }
  sourceApps=items;
  $("sourceTitle").textContent=source.name+" · "+items.length+" تطبيق";
  render("sourceApps",items,value("sourceSearch"));
  $("sourceResults").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){
  sourceApps=[];
  $("sourceApps").replaceChildren(el("div","empty","هذا المصدر غير متاح الآن. جرّب مصدرًا آخر."));
  flash(e.message);
 }
}
async function loadCatalog(force=false){
 if(fetching&&!force)return;
 const generation=++fetchGeneration;
 fetching=true;
 if(force){
  allApps=[];myApps=[];renderLimit=36;
  $("categoryFilter").value="";
 }
 renderCatalog();
 try{
  const [catalogResult,sources]=await Promise.all([
   call("/api/catalog").catch(()=>({apps:[]})),
   loadSources()
  ]);
  if(generation!==fetchGeneration)return;
  myApps=(catalogResult.apps||[]).map(x=>({...x,source_name:"ديلا",preview_only:true}));
  addItems(myApps);setCategories();renderCatalog();
  if(!sources.length){
   $("sourceProgress").textContent="لم تتوفر قائمة مصادر الآيفون حاليًا.";
   return;
  }
  let completed=0,successful=0,failed=0,nextIndex=0;
  const worker=async()=>{
   while(nextIndex<sources.length){
    const source=sources[nextIndex++];
    try{
     const result=await call("/api/source?id="+encodeURIComponent(source.id));
     if(generation!==fetchGeneration)return;
     if(Array.isArray(result.apps)){
      const incoming=result.apps.map(x=>({...x,source_id:source.id,source_name:source.name,preview_only:true}));
      if(incoming.length){successful++;addItems(incoming);setCategories();renderCatalog();}
      else failed++;
     }else failed++;
    }catch(e){failed++}
    if(generation!==fetchGeneration)return;
    completed++;
    $("sourceProgress").textContent="تم فحص "+completed+" من "+sources.length+" مصدرًا · يعمل "+successful+" مصدرًا · "+failed+" غير متاح حاليًا";
   }
  };
  await Promise.all(Array.from({length:Math.min(4,sources.length)},()=>worker()));
  if(generation!==fetchGeneration)return;
  $("sourceProgress").textContent="اكتمل التحديث: "+allApps.length+" تطبيق للعرض من "+successful+" مصادر متاحة"+(failed?" · "+failed+" مصادر تعذر تحميلها":"");
 }catch(e){
  if(generation===fetchGeneration){
   $("sourceProgress").textContent="تعذر جلب قائمة بعض التطبيقات. جرّب تحديث البرامج.";
   flash(e.message);
  }
 }finally{
  if(generation===fetchGeneration){fetching=false;renderCatalog();}
 }
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
 const stats=$("ownerCatalogStats");
 if(stats)call("/api/catalog-stats").then(data=>{stats.textContent=
  (data.apps||0).toLocaleString("ar-SA")+" تطبيقًا • "+(data.sources||0)+" مصدرًا • آخر تحديث: "+(data.updated||"غير محدد");
 }).catch(()=>{stats.textContent="تعذر قراءة إحصاءات المكتبة الآن."});
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
$("resendEmailBtn").onclick=async()=>{
 const email=value("loginEmail");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
  flash("اكتب بريدك الإلكتروني الصحيح في خانة تسجيل الدخول أولًا.");
  return;
 }
 const button=$("resendEmailBtn");button.disabled=true;
 try{
  const result=await call("/api/resend-confirmation",{method:"POST",body:{email},auth:false});
  flash(result.message||"تم إرسال طلب رسالة التأكيد. افتح بريدك الإلكتروني.");
 }catch(e){flash(e.message)}
 finally{button.disabled=false}
};
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
$("mySearch").oninput=()=>{renderLimit=36;renderCatalog()};
$("categoryFilter").onchange=()=>{renderLimit=36;renderCatalog()};
$("sourceSearch").oninput=()=>render("sourceApps",sourceApps,value("sourceSearch"));
$("refreshCatalog").onclick=()=>loadCatalog(true);
$("moreApps").onclick=()=>{renderLimit+=36;renderCatalog()};
$("closeDetails").onclick=()=>$("appDetailDialog").close();
$("appDetailDialog").addEventListener("click",e=>{if(e.target===$("appDetailDialog"))$("appDetailDialog").close()});
document.querySelectorAll("#storeTabs [data-panel]").forEach(b=>b.onclick=async()=>{
 document.querySelectorAll("#storeTabs button").forEach(x=>x.classList.toggle("active",x===b));
 for(const id of ["myApps","featuredSources","helpPanel","ownerPanel"])show(id,b.dataset.panel===id);
 if(b.dataset.panel==="featuredSources")try{await loadSources()}catch(e){flash(e.message)}
 if(b.dataset.panel==="ownerPanel")await loadOwnerRequests();
});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});
initialize().catch(e=>{flash(e.message);notify("تعذر التحقق");show("authArea",true)});
})();