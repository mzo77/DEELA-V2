(()=>{"use strict";
const SHOP="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-shop";
const CONTROL="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const price=x=>x===null||x===undefined?"بانتظار التسعير":new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR"}).format(Number(x));
const moment=x=>x?new Date(x).toLocaleString("ar-SA"):"—";
const labels={pending_quote:"عرض سعر مطلوب",pending_review:"طلب للمراجعة",awaiting_payment:"بانتظار الدفع",paid:"مدفوع — بتأكيد المالك",fulfilled:"مكتمل",cancelled:"ملغي"};
let session=sessionStorage.getItem("deela-shop-owner-session")||"";
let products=[],orders=[],reviews=[],settings={},active="overview",loading=false;
const alertOwner=(message,bad=false)=>{
 const el=$("ownerNotice");el.textContent=message;el.hidden=false;el.classList.toggle("error",bad);
 setTimeout(()=>{if(el.textContent===message)el.hidden=true},6500);
};
async function call(path,options={}){
 const head={"Content-Type":"application/json"};if(session)head.Authorization="Bearer "+session;
 let r;
 try{r=await fetch(SHOP+path,{method:options.method||"GET",headers:head,credentials:"omit",cache:"no-store",body:options.data===undefined?undefined:JSON.stringify(options.data),signal:AbortSignal.timeout(25000)})}
 catch(e){throw Error(e?.name==="TimeoutError"?"الخادم تأخر في الاستجابة":"تعذر الاتصال بخدمة المتجر")}
 const d=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===401||r.status===403){session="";sessionStorage.removeItem("deela-shop-owner-session")}throw Error(d.error||"تعذّر إكمال العملية")}
 return d;
}
async function login(ev){
 ev.preventDefault();const b=$("loginBtn");b.disabled=true;
 $("loginNotice").textContent="جارٍ التحقق من حساب المالك…";
 try{
  const r=await fetch(CONTROL+"/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("loginEmail").value.trim(),password:$("loginPassword").value,platform:"android"}),signal:AbortSignal.timeout(25000)});
  const data=await r.json();
  if(!r.ok)throw Error(data.error||"بيانات الدخول غير صحيحة");
  if(data.role!=="owner"||!data.access_token)throw Error("هذا القسم خاص بحساب مالك DEELA");
  session=data.access_token;
  await call("/admin/overview");
  sessionStorage.setItem("deela-shop-owner-session",session);
  $("loginPassword").value="";
  showOwner();await loadAll();
 }catch(e){$("loginNotice").textContent=e.message;session=""}
 finally{b.disabled=false}
}
function showOwner(){
 $("loginArea").hidden=true;$("ownerShell").hidden=false;page(active);
}
function logout(){
 session="";sessionStorage.removeItem("deela-shop-owner-session");
 $("ownerShell").hidden=true;$("loginArea").hidden=false;
 $("loginNotice").textContent="انتهت الجلسة. سجّل دخولك بحساب المالك.";
}
async function loadAll(){
 try{
  const o=await call("/admin/overview");
  $("productCount").textContent=o.products;$("orderCount").textContent=o.orders;
  $("pendingCount").textContent=o.pending;$("reviewPending").textContent=o.unapproved_reviews;
  await loadPage(active);
 }catch(e){alertOwner(e.message,true);if(!session)logout()}
}
function page(name){
 if(!["overview","products","orders","reviews","settings"].includes(name))return;
 active=name;document.querySelectorAll("[data-section]").forEach(s=>s.hidden=s.dataset.section!==name);
 document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 if(session)loadPage(name).catch(e=>alertOwner(e.message,true));
}
async function loadPage(name){
 if(name==="products"||name==="settings"){
  const d=await call("/admin/products");products=d.products||[];settings=d.settings||{};
  renderProducts();fillSettings();
 }
 if(name==="orders"){const d=await call("/admin/orders");orders=d.orders||[];renderOrders()}
 if(name==="reviews"){const d=await call("/admin/reviews");reviews=d.reviews||[];renderReviews()}
}
function renderProducts(){
 const root=$("productsList");
 root.innerHTML=products.map(p=>'<article class="admin-card"><div class="admin-card-head"><div><strong>'+esc(p.title)+'</strong><p>'+esc(p.slug)+' · '+esc(p.category)+' · '+esc(p.platform)+' · '+esc(p.months??"—")+' شهر</p></div><span class="admin-chip '+(p.published?"":"off")+'">'+(p.published?"منشور":"مخفي")+'</span></div><p>السعر: '+esc(price(p.price_sar))+' · '+(p.featured?"منتج مميز":"منتج عادي")+'</p><div class="admin-card-actions"><button class="btn outline" type="button" data-edit="'+esc(p.id)+'">تعديل</button><button class="btn outline" type="button" data-visibility="'+esc(p.id)+'">'+(p.published?"إخفاء":"نشر")+'</button><a class="btn ghost" href="../?product='+encodeURIComponent(p.slug)+'" target="_blank" rel="noopener">معاينة</a></div></article>').join("")||'<p class="empty">لا توجد منتجات بعد. اضغط «منتج جديد» لإضافتها.</p>';
}
function fillProduct(p=null){
 $("editor").hidden=false;
 $("editorTitle").textContent=p?"تعديل المنتج: "+p.title:"إضافة منتج جديد";
 $("productId").value=p?.id||"";
 $("pTitle").value=p?.title||"";$("pSlug").value=p?.slug||"";
 $("pPlatform").value=p?.platform||"ios";$("pCategory").value=p?.category||"اشتراكات";
 $("pMonths").value=p?.months??"";$("pPrice").value=p?.price_sar??"";
 $("pCompare").value=p?.compare_at_sar??"";$("pAccent").value=p?.accent||"cyan";
 $("pImage").value=p?.image_url||"";$("pSubtitle").value=p?.subtitle||"";
 $("pDescription").value=p?.description||"";$("pFeatures").value=(p?.features||[]).join("\n");
 $("pFaq").value=(p?.faq||[]).map(x=>x.q+" | "+x.a).join("\n");
 $("pSort").value=p?.sort_order??100;$("pFeatured").checked=!!p?.featured;
 $("pPublished").checked=!!p?.published;
 $("productNotice").textContent="";
 $("editor").scrollIntoView({behavior:"smooth",block:"start"});
}
async function submitProduct(ev){
 ev.preventDefault();const b=$("saveProduct");b.disabled=true;
 const facts=$("pFaq").value.split("\n").map(s=>s.trim()).filter(Boolean).map(x=>{
  const i=x.indexOf("|");return i<0?null:{q:x.slice(0,i).trim(),a:x.slice(i+1).trim()}
 }).filter(x=>x&&x.q&&x.a);
 const payload={
  id:$("productId").value||undefined,title:$("pTitle").value.trim(),slug:$("pSlug").value.trim(),
  platform:$("pPlatform").value,category:$("pCategory").value.trim(),
  months:$("pMonths").value||null,price_sar:$("pPrice").value||null,
  compare_at_sar:$("pCompare").value||null,accent:$("pAccent").value,
  image_url:$("pImage").value.trim()||null,subtitle:$("pSubtitle").value.trim(),
  description:$("pDescription").value.trim(),features:$("pFeatures").value.split("\n").map(x=>x.trim()).filter(Boolean),
  faq:facts,sort_order:Number($("pSort").value)||100,
  featured:$("pFeatured").checked,published:$("pPublished").checked
 };
 try{
  await call("/admin/product",{method:"POST",data:payload});
  $("editor").hidden=true;
  await loadPage("products");alertOwner("تم حفظ المنتج في قاعدة بيانات DEELA");
 }catch(e){$("productNotice").textContent=e.message;alertOwner(e.message,true)}
 finally{b.disabled=false}
}
async function visibility(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 const payload={...p,published:!p.published};
 if(!confirm(p.published?"هل تريد إخفاء هذا المنتج من المتجر؟":"هل تريد نشر هذا المنتج للزوار؟"))return;
 try{await call("/admin/product",{method:"POST",data:payload});await loadPage("products");alertOwner("تم تعديل ظهور المنتج")}
 catch(e){alertOwner(e.message,true)}
}
function renderOrders(){
 $("ordersList").innerHTML=orders.map(o=>{
  const items=Array.isArray(o.items)?o.items:[];
  const selectedStatus='<select aria-label="حالة الطلب" class="order-input" data-status="'+esc(o.id)+'">'+
    Object.entries(labels).map(([value,label])=>'<option value="'+value+'" '+(o.status===value?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select>';
  return '<article class="admin-card"><div class="admin-card-head"><div><strong>'+esc(o.order_code)+'</strong><small>'+esc(moment(o.created_at))+' · '+esc(o.customer_email)+'</small></div><span class="admin-chip">'+esc(labels[o.status]||o.status)+'</span></div><div class="order-details"><p>الاسم: '+esc(o.customer_name||"—")+' · الجوال: '+esc(o.phone||"—")+'</p>'+items.map(x=>'<p>'+esc(x.title)+' × '+Number(x.quantity)+' — '+esc(price(x.unit_price_sar))+'</p>').join("")+'<p>الإجمالي: '+esc(price(o.total_sar))+'</p>'+(o.customer_note?'<p>ملاحظة العميل: '+esc(o.customer_note)+'</p>':'')+'</div>'+selectedStatus+'<textarea data-note="'+esc(o.id)+'" class="order-input" rows="2" placeholder="ملاحظة تظهر في طلبات العميل">'+esc(o.owner_note||"")+'</textarea><div class="admin-card-actions"><button class="btn primary" type="button" data-save-order="'+esc(o.id)+'">حفظ حالة الطلب</button></div></article>';
 }).join("")||'<p class="empty">لا توجد طلبات حتى الآن.</p>';
}
async function updateOrder(id){
 const o=orders.find(x=>x.id===id);if(!o)return;
 const status=document.querySelector('[data-status="'+id+'"]').value;
 const note=document.querySelector('[data-note="'+id+'"]').value;
 if(!confirm("تأكيد تحديث الطلب "+o.order_code+" إلى «"+labels[status]+"»؟"))return;
 try{
  await call("/admin/order-status",{method:"POST",data:{id,status,owner_note:note}});
  await loadPage("orders");alertOwner("تم حفظ حالة الطلب. هذا لا يفعّل اشتراك التطبيق تلقائيًا.");
 }catch(e){alertOwner(e.message,true)}
}
function renderReviews(){
 $("reviewsList").innerHTML=reviews.map(r=>'<article class="admin-card"><div class="admin-card-head"><strong>'+esc(r.display_name)+'</strong><span class="admin-chip '+(r.approved?"":"off")+'">'+(r.approved?"منشور":"بانتظار مراجعة")+'</span></div><span class="review-stars">'+("★".repeat(r.rating))+'</span><p>'+esc(r.body)+'</p><div class="admin-card-actions"><button class="btn outline" data-review="'+esc(r.id)+'" data-approved="'+(!r.approved)+'">'+(r.approved?"إخفاء التقييم":"الموافقة والنشر")+'</button></div></article>').join("")||'<p class="empty">لا توجد تقييمات بعد.</p>';
}
async function reviewState(id,approved){
 try{await call("/admin/review-status",{method:"POST",data:{id,approved}});await loadPage("reviews");alertOwner("تم تعديل ظهور التقييم")}
 catch(e){alertOwner(e.message,true)}
}
function fillSettings(){
 $("sTitle").value=settings.hero_title||"";$("sSubtitle").value=settings.hero_subtitle||"";
 $("sAnnouncement").value=settings.announcement||"";$("sSupport").value=settings.support_url||"";
}
async function submitSettings(ev){
 ev.preventDefault();const b=$("saveSettings");b.disabled=true;
 try{
  await call("/admin/settings",{method:"POST",data:{
   hero_title:$("sTitle").value,hero_subtitle:$("sSubtitle").value,
   announcement:$("sAnnouncement").value,support_url:$("sSupport").value,published:true
  }});
  alertOwner("تم تحديث إعدادات متجر DEELA");
 }catch(e){$("settingsNotice").textContent=e.message;alertOwner(e.message,true)}
 finally{b.disabled=false}
}
function events(){
 $("loginForm").onsubmit=login;
 $("logoutBtn").onclick=logout;
 $("refreshAll").onclick=loadAll;
 $("newProduct").onclick=()=>fillProduct();
 $("cancelEdit").onclick=()=>{$("editor").hidden=true};
 $("productForm").onsubmit=submitProduct;
 $("settingsForm").onsubmit=submitSettings;
 $("ordersRefresh").onclick=()=>loadPage("orders");
 document.addEventListener("click",e=>{
  const el=e.target.closest("[data-page],[data-go],[data-edit],[data-visibility],[data-save-order],[data-review]");
  if(!el)return;
  if(el.dataset.page)return page(el.dataset.page);
  if(el.dataset.go)return page(el.dataset.go);
  if(el.dataset.edit)return fillProduct(products.find(p=>p.id===el.dataset.edit));
  if(el.dataset.visibility)return visibility(el.dataset.visibility);
  if(el.dataset.saveOrder)return updateOrder(el.dataset.saveOrder);
  if(el.dataset.review)return reviewState(el.dataset.review,el.dataset.approved==="true");
 });
}
events();
if(session){
 call("/admin/overview").then(()=>{showOwner();loadAll()}).catch(()=>{logout()});
}
})();