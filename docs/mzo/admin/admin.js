(()=>{"use strict";
const ROOT="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/mzo-site",KEY="mzo.owner.session.v1";
const $=id=>document.getElementById(id);let token=sessionStorage.getItem(KEY)||"",links=[],working=false;
function show(id,yes){$(id).classList.toggle("hidden",!yes)}
function alertText(msg){const t=$("message");t.textContent=msg;show("message",true);clearTimeout(alertText.timer);alertText.timer=setTimeout(()=>show("message",false),7000)}
async function api(route,body=null,needAuth=true){
 const response=await fetch(ROOT+route,{method:body?"POST":"GET",cache:"no-store",credentials:"omit",
  headers:{...(body?{"Content-Type":"application/json"}:{}),...(needAuth&&token?{"Authorization":"Bearer "+token}:{})},
  body:body?JSON.stringify(body):undefined});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok){const e=new Error(data.error||"تعذر تنفيذ الطلب");e.status=response.status;throw e}
 return data;
}
function clearForm(){
 $("editingId").value="";$("linkTitle").value="";$("url").value="";$("linkDescription").value="";
 $("category").value="مشروع";$("order").value="50";$("published").checked=true;
 $("editorTitle").textContent="إضافة مشروع جديد";
}
function text(tag,value,className=""){const element=document.createElement(tag);element.textContent=String(value??"");if(className)element.className=className;return element}
function renderLinks(){
 const target=$("list");target.replaceChildren();
 if(!links.length){target.append(text("p","لم تضف مشاريع بعد.","muted"));return}
 for(const item of links){
  const row=document.createElement("article");row.className="entry";
  const heading=text("h3",item.title),state=text("span",item.published?"منشور":"مخفي","state"+(item.published?"":" off"));
  const p=text("p",item.description);
  const cat=text("div",item.category+" · ترتيب "+item.display_order,"tag");
  const url=document.createElement("a");url.href=item.url;url.textContent=item.url;url.target="_blank";url.rel="noopener noreferrer";
  const actions=document.createElement("div");actions.className="actions";
  const edit=text("button","تعديل","btn secondary");edit.type="button";edit.onclick=()=>{
   $("editingId").value=item.id;$("linkTitle").value=item.title;$("url").value=item.url;
   $("linkDescription").value=item.description;$("category").value=item.category;
   $("order").value=String(item.display_order);$("published").checked=Boolean(item.published);
   $("editorTitle").textContent="تعديل: "+item.title;$("linkForm").scrollIntoView({behavior:"smooth",block:"center"});
  };
  const remove=text("button","حذف","btn danger");remove.type="button";remove.onclick=async()=>{
   if(!confirm("حذف الرابط نهائيًا من MZO؟"))return;
   remove.disabled=true;try{await api("/links/delete",{id:item.id});await reload();alertText("تم حذف المشروع")}
   catch(e){alertText(e.message)}finally{remove.disabled=false}
  };
  actions.append(edit,remove);
  row.append(heading,state,p,cat,url,actions);target.append(row)
 }
}
async function reload(){
 const d=await api("/admin");
 show("dashboard",true);show("loginArea",false);
 const s=d.settings||{};$("brand").value=s.brand_name||"MZO";$("heading").value=s.heading||"";
 $("description").value=s.description||"";$("announcement").value=s.announcement||"";
 links=d.links||[];renderLinks();
}
function logout(){token="";sessionStorage.removeItem(KEY);links=[];show("dashboard",false);show("loginArea",true);$("password").value=""}
$("loginForm").onsubmit=async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 try{
  const result=await api("/auth/login",{email:$("user").value.trim(),password:$("password").value},false);
  if(result.role!=="owner")throw Error("الحساب ليس مالك الموقع");
  token=result.access_token;sessionStorage.setItem(KEY,token);$("password").value="";await reload();alertText("مرحبًا بك في لوحة MZO")
 }catch(e){logout();alertText(e.message)}finally{button.disabled=false}
};
$("logout").onclick=()=>{logout();alertText("تم تسجيل الخروج")};
$("reload").onclick=async()=>{try{await reload();alertText("تحديث ناجح")}catch(e){alertText(e.message)}};
$("clear").onclick=clearForm;
$("settingsForm").onsubmit=async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 try{await api("/settings",{
  brand_name:$("brand").value.trim(),heading:$("heading").value.trim(),
  description:$("description").value.trim(),announcement:$("announcement").value.trim()
 });alertText("تم تحديث معلومات الموقع. ستظهر للزوار فور التحديث.");await reload()}
 catch(e){alertText(e.message)}finally{button.disabled=false}
};
$("linkForm").onsubmit=async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 try{
  const url=$("url").value.trim(),parsed=new URL(url);
  if(parsed.protocol!=="https:")throw Error("يجب أن يبدأ الرابط بـ https://");
  const value={title:$("linkTitle").value.trim(),description:$("linkDescription").value.trim(),
   url,category:$("category").value.trim(),display_order:Number($("order").value),
   published:$("published").checked};
  if($("editingId").value)value.id=$("editingId").value;
  await api("/links/upsert",value);clearForm();await reload();alertText("تم حفظ المشروع.")
 }catch(e){alertText(e.message)}finally{button.disabled=false}
};
if(token)reload().catch(()=>{logout();alertText("انتهت صلاحية الجلسة. سجل الدخول مجددًا.")});
})();