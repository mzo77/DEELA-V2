(()=>{"use strict";
const ORIGIN="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/";
const API=ORIGIN+"deela-shop",CONTROL=ORIGIN+"deela-control";
const $=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>n===null||n===undefined?"السعر عند الطلب":new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR"}).format(Number(n));
const when=s=>s?new Date(s).toLocaleDateString("ar-SA"):"—";
const device=p=>({ios:"الآيفون",android:"الأندرويد",both:"جميع الأجهزة",other:"رقمي"}[p]||"رقمي");
const statusName={pending_quote:"بانتظار عرض سعر",pending_review:"بانتظار المراجعة",awaiting_payment:"بانتظار الدفع",paid:"مدفوع بحسب مراجعة المالك",fulfilled:"مكتمل",cancelled:"ملغي"};
let products=[],reviews=[],settings={},category="all",phrase="",selected=null,quantity=1;
let token=sessionStorage.getItem("deela-shop-token")||"",userEmail=sessionStorage.getItem("deela-shop-email")||"";
let mode="login",pendingLogin=null,cart=[];
try{const old=JSON.parse(localStorage.getItem("deela-shop-cart-v1")||"[]");cart=Array.isArray(old)?old.filter(x=>typeof x.id==="string"&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=5).slice(0,10):[]}catch{}
let noticeTimer;
function notice(s){
 const node=$("toast");node.textContent=s;node.hidden=false;
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>node.hidden=true,4500);
}
function saveCart(){localStorage.setItem("deela-shop-cart-v1",JSON.stringify(cart));$("cartBadge").textContent=cart.reduce((n,x)=>n+x.quantity,0)}
function product(id){return products.find(x=>x.id===id)}
function priceTotal(){
 let total=0,quote=false;
 for(const x of cart){const p=product(x.id);if(!p)continue;if(p.price_sar===null)quote=true;else total+=Number(p.price_sar)*x.quantity}
 return {total,quote};
}
async function api(path,{method="GET",data,auth=false}={}){
 const headers={"Content-Type":"application/json"};
 if(auth&&token)headers.Authorization="Bearer "+token;
 let resp;
 try{resp=await fetch(API+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(22000)})}
 catch(e){throw Error(e?.name==="TimeoutError"?"انتهت مهلة الاتصال":"تعذّر الاتصال بخادم ديلا")}
 const result=await resp.json().catch(()=>({}));
 if(!resp.ok)throw Error(result.error||"تعذّر تنفيذ العملية");
 return result;
}
async function control(path,data){
 let resp;
 try{resp=await fetch(CONTROL+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),credentials:"omit",signal:AbortSignal.timeout(22000)})}
 catch{throw Error("تعذّر الاتصال بخدمة حساب ديلا")}
 const result=await resp.json().catch(()=>({}));
 if(!resp.ok)throw Error(result.error||"تعذّر تسجيل الدخول");
 return result;
}
function view(name){
 document.querySelectorAll("[data-view]").forEach(el=>el.hidden=el.dataset.view!==name);
 window.scrollTo({top:0,behavior:"instant"});
}
function goHome(cat="all",push=true){
 selected=null;category=cat;view("home");renderProducts();
 if(push)history.pushState({view:"home"},"",location.pathname+(cat==="all"?"":"#products"));
 if(cat!=="all")$("products").scrollIntoView({behavior:"smooth"});
}
function picture(p,large=false){
 return '<div class="product-visual '+escape(p.accent)+(large?' large':'')+'"><span class="visual-ring"></span><span class="visual-letter">D</span><small>DEELA MEMBERSHIP</small>'+
 (p.image_url?'<img alt="'+escape(p.title)+'" src="'+escape(p.image_url)+'" loading="lazy">':'')+
 (!large&&p.featured?'<span class="visual-pill">اختيار مميز</span>':'')+'</div>';
}
function renderProducts(){
 const found=products.filter(p=>(category==="all"||category==="offers"&&p.featured||p.platform===category)&&(!phrase||[p.title,p.subtitle,p.description,p.category].some(t=>String(t||"").toLocaleLowerCase().includes(phrase))));
 $("productGrid").innerHTML=found.map(p=>'<article class="product-card"><a data-product="'+escape(p.slug)+'" href="?product='+encodeURIComponent(p.slug)+'">'+picture(p)+'</a><div class="product-content"><span class="product-kind">'+escape(p.category)+'</span><h3><a data-product="'+escape(p.slug)+'" href="?product='+encodeURIComponent(p.slug)+'">'+escape(p.title)+'</a></h3><p>'+escape(p.subtitle||p.description.slice(0,90))+'</p><div class="product-tags"><span>'+escape(device(p.platform))+'</span><span>'+escape(p.months?p.months+" شهر":"خدمة رقمية")+'</span></div><div class="product-bottom"><div><small>السعر</small><strong class="'+(p.price_sar===null?'is-quote':'')+'">'+escape(money(p.price_sar))+'</strong></div><button type="button" class="add-small" data-add="'+escape(p.id)+'">أضف +</button></div></div></article>').join("")||'<div class="loading-card">لا توجد منتجات مطابقة حاليًا.</div>';
 $("noProducts").hidden=true;
 document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===category));
 document.querySelectorAll("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===category||category==="all"&&b.dataset.cat==="all"));
}
function showProduct(slug,push=true){
 const p=products.find(x=>x.slug===slug);
 if(!p)return notice("المنتج غير متاح الآن");
 selected=p;quantity=1;
 if(push)history.pushState({view:"product",slug},"","?product="+encodeURIComponent(slug));
 const fields={crumbTitle:p.title,detailTitle:p.title,detailSubtitle:p.subtitle||"",detailCategory:p.category,detailPrice:money(p.price_sar),detailDuration:p.months?p.months+" شهر":"حسب الخدمة",detailPlatform:device(p.platform),detailDescription:p.description||p.subtitle,qtyValue:quantity,stickyPrice:money(p.price_sar)};
 for(const [id,value] of Object.entries(fields))$(id).textContent=value;
 $("detailPrice").classList.toggle("quote",p.price_sar===null);
 $("detailWas").hidden=p.compare_at_sar===null||p.price_sar===null||Number(p.compare_at_sar)<=Number(p.price_sar);
 if(!$("detailWas").hidden)$("detailWas").textContent=money(p.compare_at_sar);
 $("detailVisual").outerHTML=picture(p,true).replace('<div class="product-visual','<div id="detailVisual" class="product-visual');
 $("detailFeatures").innerHTML=(p.features||[]).map(x=>'<div>'+escape(x)+'</div>').join("")||'<p>راجع تفاصيل الباقة قبل الطلب.</p>';
 $("detailFaq").innerHTML=(p.faq||[]).map(x=>'<details><summary>'+escape(x.q)+'</summary><p>'+escape(x.a)+'</p></details>').join("");
 const r=reviews.filter(x=>x.product_id===p.id);
 $("reviewCount").textContent=r.length+" تقييم";
 $("reviewList").innerHTML=r.map(x=>'<div class="review-card"><strong>'+escape(x.display_name)+'</strong> <span class="review-stars">'+("★".repeat(x.rating))+'</span><p>'+escape(x.body)+'</p><small>'+escape(when(x.created_at))+'</small></div>').join("")||'<div class="empty-note">لا توجد تقييمات منشورة بعد. لا نعرض تقييمات وهمية.</div>';
 view("product");
}
function add(id,q=1){
 if(!product(id))return notice("المنتج غير متاح");
 const found=cart.find(x=>x.id===id);
 if(found)found.quantity=Math.min(5,found.quantity+q);
 else if(cart.length<10)cart.push({id,quantity:Math.min(q,5)});
 else return notice("الحد الأعلى 10 منتجات مختلفة");
 saveCart();notice("تمت الإضافة إلى السلة");
}
function adjust(id,delta){
 const i=cart.find(x=>x.id===id);if(!i)return;
 i.quantity=Math.min(5,Math.max(0,i.quantity+delta));cart=cart.filter(x=>x.quantity>0);
 saveCart();renderCart();
}
function renderCart(){
 cart=cart.filter(x=>product(x.id));saveCart();
 $("cartItems").innerHTML=cart.map(x=>{
 const p=product(x.id);
 return '<div class="cart-item"><div class="thumb">D</div><div><strong>'+escape(p.title)+'</strong><small>'+escape(money(p.price_sar))+'</small><div class="mini-stepper"><button data-qty="'+escape(x.id)+'" data-delta="-1">−</button><b>'+x.quantity+'</b><button data-qty="'+escape(x.id)+'" data-delta="1">+</button></div></div><button data-remove="'+escape(x.id)+'" class="remove" aria-label="حذف">✕</button></div>';
 }).join("")||'<div class="empty-note">السلة فارغة. تصفح الاشتراكات وأضف ما يناسبك.</div>';
 const summary=priceTotal();
 $("cartTotal").textContent=summary.quote?"بانتظار عرض سعر":money(summary.total);
 $("checkoutButton").disabled=!cart.length;
}
function openModal(id){
 $("overlay").hidden=false;
 ["cartDrawer","authModal","checkoutModal","reviewModal"].forEach(name=>$(name).hidden=name!==id);
 document.body.style.overflow="hidden";
 if(id==="cartDrawer")renderCart();
}
function closeModal(){
 $("overlay").hidden=true;
 ["cartDrawer","authModal","checkoutModal","reviewModal"].forEach(name=>$(name).hidden=true);
 document.body.style.overflow="";
}
function authMode(m){
 mode=m;$("authTitle").textContent=m==="register"?"إنشاء حساب ديلا":"تسجيل الدخول إلى ديلا";
 $("authSubmit").textContent=m==="register"?"إنشاء الحساب":"تسجيل الدخول";
 $("toggleAuth").textContent=m==="register"?"لديك حساب؟ سجّل الدخول":"إنشاء حساب ديلا جديد";
 $("registerFields").hidden=m!=="register";
 $("authName").required=m==="register";
 $("authPassword").minLength=m==="register"?8:1;
 $("authNotice").textContent="";
}
function account(callback=null){
 pendingLogin=callback;
 authMode("login");
 if(token){
  $("authTitle").textContent="أنت مسجل في DEELA";
  $("authForm").hidden=true;$("toggleAuth").hidden=true;$("logoutAuth").hidden=false;
  $("authNotice").textContent=userEmail||"جلسة سارية";
 }else {$("authForm").hidden=false;$("toggleAuth").hidden=false;$("logoutAuth").hidden=true}
 openModal("authModal");
}
async function login(ev){
 ev.preventDefault();const b=$("authSubmit");b.disabled=true;
 const email=$("authEmail").value.trim().toLowerCase(),password=$("authPassword").value;
 $("authNotice").classList.remove("error");$("authNotice").textContent="جارٍ التحقق…";
 try{
  if(mode==="register"){
   const result=await control("/api/v1/auth/register",{email,password,display_name:$("authName").value.trim(),months:1});
   authMode("login");$("authNotice").textContent=result.needs_email_confirmation?"تم إنشاء الحساب؛ افحص رسالة التأكيد بالبريد، ثم سجّل دخولك.":"تم إنشاء الحساب. سجّل دخولك.";
   return;
  }
  const result=await control("/api/v1/auth/login",{email,password,platform:"android"});
  if(!result.access_token)throw Error("لم يصل رمز دخول صحيح");
  token=result.access_token;userEmail=email;
  sessionStorage.setItem("deela-shop-token",token);
  sessionStorage.setItem("deela-shop-email",userEmail);
  closeModal();notice("تم تسجيل الدخول");
  const after=pendingLogin;pendingLogin=null;
  if(typeof after==="function")after();
 }catch(e){$("authNotice").textContent=e.message;$("authNotice").classList.add("error")}
 finally{b.disabled=false}
}
function needAuth(done){if(token)done();else{notice("سجل الدخول أولًا");account(done)}}
function checkout(){
 if(!cart.length)return notice("السلة فارغة");
 needAuth(()=>{
  closeModal();$("checkoutSummary").innerHTML=cart.map(x=>{
   const p=product(x.id);return '<p><span>'+escape(p.title)+' × '+x.quantity+'</span><strong>'+escape(money(p.price_sar))+'</strong></p>';
  }).join("");
  $("checkoutNotice").textContent="";
  openModal("checkoutModal");
 });
}
async function placeOrder(ev){
 ev.preventDefault();if(!cart.length)return notice("السلة فارغة");
 const button=$("placeOrder");button.disabled=true;$("checkoutNotice").textContent="جارٍ إرسال الطلب…";
 try{
  const result=await api("/orders",{method:"POST",auth:true,data:{
   customer_name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),
   customer_note:$("customerNote").value.trim(),items:cart.map(x=>({id:x.id,quantity:x.quantity}))
  }});
  cart=[];saveCart();closeModal();notice("تم إنشاء الطلب "+result.order.order_code+" بنجاح");
  goOrders();
 }catch(e){$("checkoutNotice").textContent=e.message}
 finally{button.disabled=false}
}
async function goOrders(){
 history.pushState({view:"orders"},"","?view=orders");view("orders");await loadOrders();
}
async function loadOrders(){
 const list=$("ordersContent");
 if(!token){list.innerHTML='<div class="empty-note">سجّل الدخول بحساب ديلا لعرض طلباتك.</div>';account(()=>loadOrders());return}
 list.innerHTML='<div class="loading-card">جارٍ تحميل طلباتك…</div>';
 try{
  const d=await api("/orders/me",{auth:true});
  list.innerHTML=(d.orders||[]).map(o=>'<article class="order-card"><div class="order-top"><div><strong class="order-code">'+escape(o.order_code)+'</strong><small>'+escape(when(o.created_at))+'</small></div><span class="order-status">'+escape(statusName[o.status]||o.status)+'</span></div>'+(o.items||[]).map(i=>'<p>'+escape(i.title)+' × '+Number(i.quantity)+'</p>').join("")+'<p>المجموع: '+escape(money(o.total_sar))+'</p>'+(o.owner_note?'<p>ملاحظة المالك: '+escape(o.owner_note)+'</p>':'')+'</article>').join("")||
  '<div class="empty-note">لا توجد طلبات سابقة. يمكنك اختيار عضويتك من المتجر.</div>';
 }catch(e){list.innerHTML='<div class="empty-note">'+escape(e.message)+' <button id="ordersRetry" class="btn outline" type="button">أعد المحاولة</button></div>'}
}
async function sendReview(ev){
 ev.preventDefault();if(!selected)return;
 const button=$("reviewForm").querySelector("button[type=submit]");button.disabled=true;
 try{
  await api("/reviews",{method:"POST",auth:true,data:{product_id:selected.id,rating:Number($("reviewRating").value),body:$("reviewText").value.trim()}});
  $("reviewNotice").textContent="أرسل تقييمك للمراجعة، وسيظهر بعد الموافقة.";
  $("reviewForm").reset();
 }catch(e){$("reviewNotice").textContent=e.message}
 finally{button.disabled=false}
}
function restoreUrl(){
 const u=new URL(location.href);
 if(u.searchParams.has("product"))showProduct(u.searchParams.get("product"),false);
 else if(u.searchParams.get("view")==="orders"){view("orders");loadOrders()}
 else goHome("all",false);
}
function attachEvents(){
 document.addEventListener("click",ev=>{
  const t=ev.target.closest("button,a");if(!t)return;
  const slug=t.dataset.product;
  if(slug){ev.preventDefault();return showProduct(slug)}
  if(t.dataset.add){ev.preventDefault();return add(t.dataset.add)}
  if(t.dataset.qty){ev.preventDefault();return adjust(t.dataset.qty,Number(t.dataset.delta))}
  if(t.dataset.remove){ev.preventDefault();cart=cart.filter(x=>x.id!==t.dataset.remove);saveCart();return renderCart()}
  if(t.hasAttribute("data-close")){ev.preventDefault();return closeModal()}
  if(t.hasAttribute("data-go-home")){ev.preventDefault();return goHome()}
  if(t.dataset.filter){ev.preventDefault();category=t.dataset.filter;return renderProducts()}
  if(t.dataset.cat){ev.preventDefault();return goHome(t.dataset.cat)}
 });
 $("overlay").onclick=closeModal;
 $("cartButton").onclick=$("mobileCart").onclick=()=>openModal("cartDrawer");
 $("accountButton").onclick=$("mobileAccount").onclick=$("footerAccount").onclick=()=>account();
 $("ordersButton").onclick=$("footerOrders").onclick=ev=>{ev?.preventDefault();goOrders()};
 $("mobileHome").onclick=()=>goHome();
 $("mobileProducts").onclick=()=>{$("products").scrollIntoView({behavior:"smooth"});goHome("all",false)};
 $("headerSearch").oninput=ev=>{phrase=ev.target.value.trim().toLocaleLowerCase();if(!phrase&&selected)return;goHome("all",false);renderProducts();if(phrase)$("products").scrollIntoView({behavior:"smooth"})};
 $("navOffers").onclick=()=>goHome("offers");
 $("heroHow").onclick=()=>document.querySelector(".steps-grid").scrollIntoView({behavior:"smooth"});
 $("detailAdd").onclick=$("stickyAdd").onclick=()=>selected&&add(selected.id,quantity);
 $("qtyPlus").onclick=()=>{$("qtyValue").textContent=quantity=Math.min(5,quantity+1)};
 $("qtyMinus").onclick=()=>{$("qtyValue").textContent=quantity=Math.max(1,quantity-1)};
 $("checkoutButton").onclick=checkout;
 $("authForm").onsubmit=login;
 $("checkoutForm").onsubmit=placeOrder;
 $("reviewForm").onsubmit=sendReview;
 $("reviewButton").onclick=()=>needAuth(()=>openModal("reviewModal"));
 $("detailHelp").onclick=()=>settings.support_url?window.open(settings.support_url,"_blank","noopener"):notice("رابط الدعم لم يجهزه المالك بعد");
 $("toggleAuth").onclick=()=>authMode(mode==="login"?"register":"login");
 $("logoutAuth").onclick=()=>{
  token="";userEmail="";sessionStorage.removeItem("deela-shop-token");sessionStorage.removeItem("deela-shop-email");closeModal();notice("تم تسجيل الخروج")
 };
 $("year").textContent=new Date().getFullYear();
 window.addEventListener("popstate",restoreUrl);
 $("ordersContent").addEventListener("click",ev=>{if(ev.target.closest("#ordersRetry"))loadOrders()});
}
async function initialize(){
 attachEvents();saveCart();
 try{
  const catalog=await api("/catalog");
  products=catalog.products||[];reviews=catalog.reviews||[];settings=catalog.settings||{};
  $("announcement").textContent=settings.announcement||"مرحبًا بك في متجر DEELA";
  $("heroTitle").textContent=settings.hero_title||"عالم ديلا الرقمي يبدأ من هنا";
  $("heroDescription").textContent=settings.hero_subtitle||"اشتراكات رقمية وتطبيقات منتقاة في مكان واحد.";
  cart=cart.filter(x=>product(x.id));saveCart();
  restoreUrl();
 }catch(e){
  $("productGrid").innerHTML='<div class="loading-card">'+escape(e.message)+' <button type="button" class="btn outline" id="reloadCatalog">إعادة التحميل</button></div>';
  $("reloadCatalog").onclick=initialize;
 }
}
initialize();
})();