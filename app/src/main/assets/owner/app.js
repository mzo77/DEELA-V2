const ORIGIN = "https://rxlynynjetajtsqlhkrq.supabase.co";
const CTRL = ORIGIN + "/functions/v1/deela-control";
const VAULT = ORIGIN + "/functions/v1/deela-owner-vault";
const PUBLIC_KEY = "sb_publishable_xmUBM4N5ScJgIlxACHIllQ_1r4XkKV_";
const STORAGE_BUCKET = "deela-owner-vault";
let uploadClientPromise=null;
async function getUploadClient(){
 // Do not load third-party code on app startup: login and member controls
 // must work even when a network filters CDNs.
 if(!uploadClientPromise){
  uploadClientPromise=import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm")
   .then(({createClient})=>createClient(ORIGIN,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}}))
   .catch(err=>{uploadClientPromise=null;throw Error("تعذر تحميل أداة الرفع. تحقق من اتصال الإنترنت أو قيود الشبكة.");});
 }
 return uploadClientPromise;
}
const $ = id => document.getElementById(id);
const k = "deela-owner-control-session";
let token = sessionStorage.getItem(k)||"", members=[], files=[], busy=false;
const titles={overview:"نظرة عامة",members:"إدارة المشتركين",ios:"تطبيقات iPhone",android:"تطبيقات Android",files:"خزنة IPA وAPK",projects:"المشاريع والخدمات",security:"الأمان والحساب"};
const fmt = value => value ? new Date(value).toLocaleDateString("ar-SA") : "—";
const bytes = n => n>=1048576?(n/1048576).toFixed(1)+" م.ب":n>=1024?(n/1024).toFixed(1)+" ك.ب":String(n||0)+" بايت";
function feedback(msg,error=false){
 const el=$("feedback");el.textContent=String(msg);el.classList.toggle("error",error);el.hidden=false;
 clearTimeout(feedback.timeout);feedback.timeout=setTimeout(()=>{el.hidden=true},6500);
}
// In-app dialogs work in Android WebView even when native confirm/prompt
// dialogs are unavailable or auto-dismissed.
let dialogPending=false;
function ownerDecision({title="تأكيد الإجراء",message="",action="تأكيد",danger=false,months=false}={}){
 if(dialogPending){feedback("أكمل النافذة المفتوحة أولًا",true);return Promise.resolve(null)}
 dialogPending=true;
 const overlay=$("ownerDialog"),yes=$("ownerDialogConfirm"),no=$("ownerDialogCancel");
 $("ownerDialogTitle").textContent=title;
 $("ownerDialogBody").textContent=message;
 $("ownerDialogMonthsField").hidden=!months;
 $("ownerDialogMonths").value="1";
 yes.textContent=action;
 yes.classList.toggle("owner-danger",danger);
 overlay.hidden=false;
 return new Promise(resolve=>{
  let completed=false;
  function done(value){
   if(completed)return;
   completed=true;
   overlay.hidden=true;
   dialogPending=false;
   yes.onclick=null;no.onclick=null;
   document.removeEventListener("keydown",onKey);
   resolve(value);
  }
  function onKey(ev){if(ev.key==="Escape"||ev.key==="Backspace"&&ev.target===document.body){ev.preventDefault();done(null)}}
  no.onclick=()=>done(null);
  yes.onclick=()=>done(months?Number($("ownerDialogMonths").value):true);
  document.addEventListener("keydown",onKey);
  yes.focus();
 });
}
function element(tag,text="",cls=""){const node=document.createElement(tag);node.textContent=String(text??"");if(cls)node.className=cls;return node}
function button(text,fn,danger=false){const node=element("button",text,danger?"danger":"");node.type="button";node.onclick=fn;return node}
async function fetchJson(url,body,authenticated=true){
 const init={method:body===undefined?"GET":"POST",cache:"no-store",credentials:"omit",
 headers:{"Content-Type":"application/json",...(authenticated&&token?{"Authorization":"Bearer "+token}:{})}};
 if(body!==undefined)init.body=JSON.stringify(body);
 let resp;
 try{
  resp=await fetch(url,{...init,signal:AbortSignal.timeout(20000)});
 }catch(e){
  if(e?.name==="TimeoutError"||e?.name==="AbortError")throw Error("الخادم لم يستجب خلال 20 ثانية. حاول مجددًا.");
  throw Error("تعذر الاتصال بخادم DEELA. تحقق من الإنترنت ثم حاول مجددًا.");
 }
 let data;try{data=await resp.json()}catch{data={}};
 if(!resp.ok){const e=new Error(data.error||"تعذّر الاتصال بالخدمة");e.status=resp.status;throw e}
 return data;
}
const api=(route,body)=>fetchJson(CTRL+route,body);
const vault=(route,body)=>fetchJson(VAULT+route,body);
function logout(){
 token="";sessionStorage.removeItem(k);members=[];files=[];
 $("shell").hidden=true;$("login").hidden=false;$("password").value="";
}
function page(name){
 if(!titles[name])return;
 document.querySelectorAll("[data-section]").forEach(s=>s.hidden=s.dataset.section!==name);
 document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 $("currentTitle").textContent=titles[name];
 window.scrollTo({top:0,behavior:"instant"});
 if(name==="members")loadMembers().catch(showError);
 if(name==="files")loadFiles().catch(showError);
}
const showError = err => {if(err?.status===401||err?.status===403){logout();feedback("انتهت الجلسة أو صلاحية المالك",true)}
 else feedback(err?.message||"تعذرت العملية",true)};
async function loadOverview(){
 const d=await vault("/overview");
 $("countUsers").textContent=d.subscribers;
 $("countActive").textContent=d.active;
 $("countIos").textContent=d.ios_apps;
 $("countAndroid").textContent=d.android_apps;
 $("countFiles").textContent=d.private_files;
 $("backendStatus").textContent="متصل وآمن";
 return d;
}
async function login(username,password){
 $("loginStatus").textContent="جارٍ التحقق من بيانات المالك…";
 const r=await fetchJson(CTRL+"/api/v1/auth/login",{email:username,password,platform:"android"},false);
 if(r.role!=="owner"||!r.access_token)throw Error("لا يمكن الدخول إلا بحساب المالك");
 token=r.access_token;
 $("loginStatus").textContent="تم التحقق من الحساب. جارٍ تحميل بيانات اللوحة…";
 try{await loadOverview()}catch(e){token="";throw e}
 sessionStorage.setItem(k,token);
 $("login").hidden=true;$("shell").hidden=false;
 $("password").value="";$("loginStatus").textContent="تم تسجيل الدخول بنجاح";page("overview");
}
async function loadMembers(){
 const d=await api("/api/owner/dashboard");
 if(!Array.isArray(d.members))throw Error("قائمة المشتركين غير متاحة");
 members=d.members;
 renderMembers();
 renderRequests(Array.isArray(d.requests)?d.requests:[]);
}
function renderRequests(requests){
 const root=$("pendingRequests");root.replaceChildren();$("pendingCount").textContent=requests.length+" طلب";
 if(!requests.length){root.append(element("p","لا توجد طلبات انتظار حالياً.","muted"));return}
 for(const request of requests){
  const row=element("div","","member"),info=element("div");
  info.append(element("div",request.email||request.user_id||"مشترك","member-title"));
  info.append(element("div",(request.platform==="ios"?"آيفون":"أندرويد")+" · "+request.months+" شهر · "+fmt(request.created_at),"member-sub"));
  const actions=element("div","","member-actions");
  const approveButton=button("موافقة",()=>reviewRequest(request,"approved",approveButton));
  const rejectButton=button("رفض",()=>reviewRequest(request,"rejected",rejectButton),true);
  actions.append(approveButton,rejectButton);
  row.append(info,actions);root.append(row);
 }
}
async function reviewRequest(request,decision,clicked){
 if(busy)return feedback("جارٍ تنفيذ عملية أخرى، حاول بعد اكتمالها",true);
 const rejecting=decision==="rejected";
 const approved=await ownerDecision({
  title:rejecting?"رفض طلب الاشتراك":"الموافقة على الاشتراك",
  message:rejecting?"سيتم رفض هذا الطلب ولن يُفعّل اشتراك صاحبه. هل تريد المتابعة؟":"سيتم تفعيل اشتراك هذا المشترك وإرسال إشعار التفعيل إن كان البريد مهيأً.",
  action:rejecting?"نعم، ارفض الطلب":"نعم، فعّل الاشتراك",
  danger:rejecting
 });
 if(!approved)return;
 busy=true;
 const old=clicked?.textContent||"";
 if(clicked){clicked.disabled=true;clicked.textContent=rejecting?"جارٍ الرفض…":"جارٍ التفعيل…"}
 feedback(rejecting?"يتم إرسال قرار الرفض إلى الخادم…":"يتم تفعيل الاشتراك على الخادم…");
 try{
  const result=await api("/api/owner/requests/review",{id:request.id,decision});
  if(result?.ok!==true)throw Error(result?.error||"لم يؤكد الخادم تنفيذ القرار");
  if(result.email_status==="failed"||result.email_status==="unconfigured")
   feedback("تم تفعيل الاشتراك، لكن بريد التفعيل لم يُرسل. راجع إعدادات البريد.",true);
  else feedback(rejecting?"تم رفض طلب الاشتراك بنجاح":"تم قبول الطلب وتفعيل الاشتراك");
  try{await Promise.all([loadMembers(),loadOverview()])}
  catch(e){feedback("تم حفظ القرار في الخادم، لكن تحديث القائمة تعذر. اضغط تحديث القائمة.",true)}
 }catch(e){showError(e)}
 finally{
  busy=false;
  if(clicked){clicked.disabled=false;clicked.textContent=old}
 }
}

function renderMembers(){
 const container=$("membersList");container.replaceChildren();
 const needle=$("membersSearch").value.trim().toLocaleLowerCase();
 const list=members.filter(m=>[m.email,m.display_name,m.id,m.platform].some(v=>String(v||"").toLocaleLowerCase().includes(needle)));
 if(!list.length){container.append(element("p","لا يوجد مشتركون مطابقون.","muted"));return}
 for(const m of list){
  const row=element("div","","member"),info=element("div"),head=element("div",m.email||m.display_name||m.id,"member-title");
  const state=m.role==="owner"?"المالك":m.suspended?"موقوف":m.active?"ساري":"غير نشط";
  const detail=element("div",(m.platform==="ios"?"آيفون":"أندرويد")+" • "+state+" • ينتهي: "+fmt(m.ends_at),"member-sub");
  info.append(head,detail);
  const actions=element("div","","member-actions");
  if(m.role!=="owner"){
   actions.append(button("تجربة 24 ساعة",()=>subscription(m,"trial")));
   actions.append(button("تجديد",()=>subscription(m,"renew")));
   actions.append(button(m.suspended?"استئناف":"إيقاف",()=>subscription(m,m.suspended?"resume":"suspend")));
   actions.append(button("إلغاء",()=>subscription(m,"revoke"),true));
  }else actions.append(element("span","حساب المالك","tag"));
  row.append(info,actions);container.append(row);
 }
}
async function subscription(m,action){
 if(busy)return feedback("جارٍ تنفيذ عملية أخرى",true);
 let months;
 if(action==="renew"){
  months=await ownerDecision({title:"تجديد الاشتراك",message:"اختر عدد الأشهر قبل التجديد.",action:"تجديد الآن",months:true});
  if(months===null)return;
  if(![1,2,3,6,12].includes(months))return feedback("اختر مدة صحيحة",true);
 }
 if(["suspend","revoke"].includes(action)){
  const confirmed=await ownerDecision({
   title:action==="revoke"?"إلغاء الاشتراك":"إيقاف الاشتراك",
   message:"هل تريد تأكيد هذا الإجراء على حساب المشترك؟",
   action:action==="revoke"?"نعم، ألغ الاشتراك":"نعم، أوقف الاشتراك",
   danger:true
  });
  if(!confirmed)return;
 }
 busy=true;
 try{await api("/api/owner/subscription",{user_id:m.id,action,platform:m.platform||"android",...(months?{months}:{})});await loadMembers();await loadOverview();feedback("تم تحديث الاشتراك")}
 catch(e){showError(e)}finally{busy=false}
}
async function loadFiles(){
 const d=await vault("/files");
 files=Array.isArray(d.files)?d.files:[];
 renderFiles();
}
function renderFiles(){
 const container=$("filesList");container.replaceChildren();
 $("fileTotal").textContent=files.length+" ملف";
 if(!files.length){container.append(element("p","الخزنة فارغة حاليًا. ارفع أول ملف.","muted"));return}
 for(const file of files){
  const row=element("div","","file-row"),info=element("div","","file-details");
  info.append(element("strong",file.filename));
  info.append(element("small",(file.platform==="ios"?"iOS":file.platform==="android"?"Android":"أخرى")+" · "+bytes(Number(file.size_bytes)||0)+" · "+fmt(file.created_at)));
  if(file.version)info.append(element("small","الإصدار: "+file.version));
  if(file.description)info.append(element("small",file.description));
  const actions=element("div","","file-actions");
  actions.append(button("تنزيل",async()=>{
   try{const d=await vault("/files/download",{id:file.id});if(!d.url?.startsWith("https://"))throw Error("رابط التنزيل غير صالح");
    window.location.assign(d.url);
   }catch(e){showError(e)}
  }));
  const del=button("حذف",async()=>{
   const confirmed=await ownerDecision({title:"حذف ملف من الخزنة",message:"الحذف نهائي ولا يمكن استعادة الملف بعده.",action:"حذف نهائي",danger:true});
   if(!confirmed)return;
   del.disabled=true;try{await vault("/files/delete",{id:file.id});await loadFiles();await loadOverview();feedback("تم حذف الملف")}catch(e){showError(e)}finally{del.disabled=false}
  },true);
  del.classList.add("delete");actions.append(del);
  row.append(info,actions);container.append(row);
 }
}
$("loginForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const b=$("signIn");b.disabled=true;
 try{await login($("username").value.trim(),$("password").value)}
 catch(e){logout();$("loginStatus").textContent=e?.message||"فشل تسجيل الدخول";showError(e)}
 finally{b.disabled=false}
});
$("logout").onclick=()=>{logout();feedback("تم تسجيل الخروج")};
$("refresh").onclick=async()=>{try{await loadOverview();feedback("تم تحديث البيانات")}catch(e){showError(e)}};
$("reloadMembers").onclick=()=>loadMembers().then(()=>feedback("تم تحديث المشتركين")).catch(showError);
$("reloadFiles").onclick=()=>loadFiles().then(()=>feedback("تم تحديث الملفات")).catch(showError);
$("membersSearch").addEventListener("input",renderMembers);
document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",()=>page(btn.dataset.page)));
document.querySelectorAll("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>page(btn.dataset.jump)));
$("inviteBtn").onclick=async()=>{
 const email=$("inviteEmail").value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return feedback("أدخل بريدًا صحيحًا",true);
 const b=$("inviteBtn");b.disabled=true;
 try{await api("/api/owner/invite",{email});$("inviteEmail").value="";await loadMembers();feedback("تم إرسال الدعوة")}
 catch(e){showError(e)}finally{b.disabled=false}
};
$("uploadForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const chosen=$("asset").files[0];if(!chosen)return;
 if(chosen.size>2147483648)return feedback("الحد المدعوم لهذه العملية 2 جيجابايت",true);
 const btn=$("uploadBtn");btn.disabled=true;$("uploadStatus").textContent="جارٍ إصدار إذن الرفع الخاص...";
 try{
  const ticket=await vault("/files/sign-upload",{filename:chosen.name,size_bytes:chosen.size});
  $("uploadStatus").textContent="جارٍ رفع الملف إلى التخزين الخاص...";
  const storage=await getUploadClient();
  const {error}=await storage.storage.from(STORAGE_BUCKET).uploadToSignedUrl(ticket.path,ticket.token,chosen,{upsert:false,contentType:chosen.type||"application/octet-stream"});
  if(error)throw Error("فشل رفع الملف: "+error.message);
  $("uploadStatus").textContent="جارٍ حفظ بيانات الإصدار...";
  await vault("/files/commit",{path:ticket.path,filename:chosen.name,platform:$("platform").value,version:$("version").value,description:$("fileDescription").value,size_bytes:chosen.size});
  $("uploadForm").reset();$("uploadStatus").textContent="اكتمل الرفع وحُفظ الملف في خزنتك الخاصة.";
  await loadFiles();await loadOverview();feedback("تم رفع الملف بنجاح");
 }catch(e){$("uploadStatus").textContent="تعذر إكمال الرفع. قد يكون حجم الملف أكبر من حد باقة التخزين.";showError(e)}
 finally{btn.disabled=false}
});
$("passwordForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const b=ev.submitter;b.disabled=true;
 try{await api("/api/owner/password",{current_password:$("currentPassword").value,new_password:$("newPassword").value});$("passwordForm").reset();logout();feedback("تم تغيير كلمة المرور؛ سجّل دخولك مجددًا")}
 catch(e){showError(e)}finally{b.disabled=false}
});
if(token){loadOverview().then(()=>{$("login").hidden=true;$("shell").hidden=false;page("overview")}).catch(()=>logout())}
$("loginStatus").textContent="التطبيق جاهز. أدخل بيانات مالك DEELA.";
