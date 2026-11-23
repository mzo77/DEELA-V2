import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm";
const ORIGIN = "https://rxlynynjetajtsqlhkrq.supabase.co";
const CTRL = ORIGIN + "/functions/v1/deela-control";
const VAULT = ORIGIN + "/functions/v1/deela-owner-vault";
const PUBLIC_KEY = "sb_publishable_xmUBM4N5ScJgIlxACHIllQ_1r4XkKV_";
const STORAGE_BUCKET = "deela-owner-vault";
const storage = createClient(ORIGIN, PUBLIC_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
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
function element(tag,text="",cls=""){const node=document.createElement(tag);node.textContent=String(text??"");if(cls)node.className=cls;return node}
function button(text,fn,danger=false){const node=element("button",text,danger?"danger":"");node.type="button";node.onclick=fn;return node}
async function fetchJson(url,body,authenticated=true){
 const init={method:body===undefined?"GET":"POST",cache:"no-store",credentials:"omit",
 headers:{"Content-Type":"application/json",...(authenticated&&token?{"Authorization":"Bearer "+token}:{})}};
 if(body!==undefined)init.body=JSON.stringify(body);
 const resp=await fetch(url,init);
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
 const r=await fetchJson(CTRL+"/api/v1/auth/login",{email:username,password,platform:"android"},false);
 if(r.role!=="owner"||!r.access_token)throw Error("لا يمكن الدخول إلا بحساب المالك");
 token=r.access_token;
 try{await loadOverview()}catch(e){token="";throw e}
 sessionStorage.setItem(k,token);
 $("login").hidden=true;$("shell").hidden=false;
 $("password").value="";page("overview");
}
async function loadMembers(){
 const d=await api("/api/owner/dashboard");
 if(!Array.isArray(d.members))throw Error("قائمة المشتركين غير متاحة");
 members=d.members;
 renderMembers();
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
 if(busy)return;
 let months;
 if(action==="renew"){months=Number(prompt("عدد أشهر التجديد (1 أو 2 أو 3 أو 6 أو 12)","1"));if(![1,2,3,6,12].includes(months))return feedback("اختر مدة صحيحة",true)}
 if(["suspend","revoke"].includes(action)&&!confirm("تأكيد تنفيذ الإجراء على حساب المشترك؟"))return;
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
   if(!confirm("حذف الملف نهائيًا من الخزنة؟"))return;
   del.disabled=true;try{await vault("/files/delete",{id:file.id});await loadFiles();await loadOverview();feedback("تم حذف الملف")}catch(e){showError(e)}finally{del.disabled=false}
  },true);
  del.classList.add("delete");actions.append(del);
  row.append(info,actions);container.append(row);
 }
}
$("loginForm").addEventListener("submit",async ev=>{
 ev.preventDefault();const b=$("signIn");b.disabled=true;
 try{await login($("username").value.trim(),$("password").value)}catch(e){logout();showError(e)}finally{b.disabled=false}
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
