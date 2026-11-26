(()=>{
"use strict";
const ROOT="https://rxlynynjetajtsqlhkrq.supabase.co";
const API=ROOT+"/functions/v1/deela-books";
const AUTH=ROOT+"/functions/v1/deela-control/api/v1/auth/login";
const KEY="sb_publishable_xmUBM4N5ScJgIlxACHIllQ_1r4XkKV_";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sar=v=>new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",maximumFractionDigits:2}).format(Number(v)||0);
const date=v=>v?new Date(v).toLocaleDateString("ar-SA"):"—";
const kinds={physical:"ورقي",ebook:"إلكتروني",audiobook:"صوتي"};
const conditions={new:"جديد",like_new:"شبه جديد",good:"جيد",acceptable:"مقبول",not_applicable:"رقمي"};
const categories=["الكل","روايات","أدب وشعر","خيال ورعب","تطوير الذات","تاريخ","كتب الأطفال","فلسفة","تقنية","ديني","أخرى"];
const statusNames={draft:"مسودة",pending:"بانتظار المراجعة",published:"منشور",rejected:"مرفوض",archived:"مؤرشف",
 approved:"معتمد",suspended:"موقوف",pending_review:"بانتظار مراجعة الطلب",awaiting_payment:"بانتظار الدفع",
 paid:"تم تأكيد الدفع",preparing:"جارٍ التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
const state={token:window.__DEELA_BOOKS_TOKEN||sessionStorage.getItem("deela-books-token")||sessionStorage.getItem("deela-shop-owner-session")||"",
 email:"",view:"home",listings:[],shops:[],cart:[],me:null,settings:{},
 current:null,category:"الكل",format:"all",search:"",ownerTab:"overview",sellerTab:"books",
 sellerListings:[],ownerData:null,editing:null,formNote:"",loading:false};
try{let c=JSON.parse(localStorage.getItem("deela-books-cart-v1")||"[]");if(Array.isArray(c))state.cart=c.filter(x=>typeof x.id==="string"&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10).slice(0,10)}catch{}
let noticeTimer;
function toast(s){
 const el=$("toast");el.textContent=String(s);el.hidden=false;
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4400);
}
function saveCart(){
 localStorage.setItem("deela-books-cart-v1",JSON.stringify(state.cart));
 $("cartCount").textContent=state.cart.reduce((n,x)=>n+x.qty,0);
}
function errorMessage(e){return e instanceof Error?e.message:String(e)}
async function api(path,opts={}){
 const headers={"Content-Type":"application/json"};
 if(state.token)headers.Authorization="Bearer "+state.token;
 let r;
 try{
  r=await fetch(API+path,{method:opts.method||"GET",headers,
   body:opts.data===undefined?undefined:JSON.stringify(opts.data),cache:"no-store",
   credentials:"omit",signal:AbortSignal.timeout(27000)});
 }catch(e){throw Error(e?.name==="TimeoutError"?"انتهت مهلة الاتصال بخادم ديلا":"تعذر الوصول إلى خادم DEELA Books")}
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error||"تعذّر تنفيذ العملية");
 return body;
}
async function reload(){
 if(!state.token){openLogin();return}
 try{
  const [catalog,shops,me]=await Promise.all([api("/catalog"),api("/shops"),api("/me")]);
  state.listings=catalog.listings||[];state.shops=shops.shops||[];state.me=me;state.settings=catalog.settings||{};
  state.email=me.email||"";state.cart=state.cart.filter(x=>state.listings.some(b=>b.id===x.id));saveCart();
  $("heroTitle").textContent=state.settings.hero_title||"لكل كتاب حكاية، ولكل قارئ عالم";
  $("heroSubtitle").textContent=state.settings.hero_subtitle||"سوق ديلا للكتب والروايات.";
  $("announcement").textContent=state.settings.announcement||"DEELA Books";
  $("accountButton").innerHTML=state.me?.is_owner?"حساب المالك ◌":"حسابي ◌";
  document.querySelectorAll(".owner-only").forEach(x=>x.hidden=!state.me?.is_owner);
  renderHome();route(state.view,false);
 }catch(e){toast(errorMessage(e));openLogin(errorMessage(e))}
}
function demoCovers(){
 const samples=[
  ["ليالي الزمرد","رواية خيالية","purple"],["مدينة الغيم","رحلة أدبية","teal"],
  ["ما وراء الضوء","قصة تشويق","gold"],["حروف من زمن","قصص قصيرة","purple"]
 ];
 return samples.map(([title,subtitle,tint])=>'<article class="book-card" aria-label="نموذج تصميم غير معروض للبيع"><div class="cover-wrap '+tint+
 '"><div class="cover-pseudo"><small>DEELA CONCEPT</small><strong>'+esc(title)+'</strong><em>✦</em></div><span class="sample-badge">نموذج تصميم فقط</span></div>'+
 '<div class="book-info"><span class="book-meta">عرض توضيحي</span><h3>'+esc(title)+'</h3><p>'+esc(subtitle)+'</p><div class="book-tags"><span>غير معروض للبيع</span></div><div class="book-bottom"><span class="book-price" style="font-size:11px">بانتظار الكتب الحقيقية</span></div></div></article>').join("");
}
function cover(b){
 const tint=b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold";
 const inner=b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>';
 return '<div class="cover-wrap '+tint+'">'+inner+'<span class="book-badge">'+esc(kinds[b.format]||"كتاب")+'</span></div>';
}
function card(b){
 const isPublished=b.status==="published",fav=state.me?.favorites?.includes(b.id);
 return '<article class="book-card"><div class="cover-wrap '+(b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold")+'" data-book="'+esc(b.id)+'">'+
 (b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>')+
 '<span class="book-badge">'+esc(kinds[b.format])+(isPublished?"":" · غير منشور")+'</span>'+
 '<button type="button" data-like="'+esc(b.id)+'" class="card-like '+(fav?"liked":"")+'" aria-label="إضافة للمفضلة">'+(fav?"♥":"♡")+'</button></div>'+
 '<div class="book-info"><span class="book-meta">'+esc(b.category||"كتب")+'</span><h3 data-book="'+esc(b.id)+'">'+esc(b.title)+'</h3>'+
 '<p>'+esc(b.author||"مؤلف مستقل")+' · '+esc(b.deela_books_sellers?.shop_name||"متجر ديلا")+'</p><div class="book-tags"><span>'+esc(kinds[b.format]||"كتاب")+'</span>'+
 '<span>'+esc(b.format==="physical"?conditions[b.book_condition]:"ملف رقمي")+'</span></div>'+
 '<div class="book-bottom"><span class="book-price">'+sar(b.price_sar)+'</span>'+
 (isPublished&&b.stock>0?'<button class="card-action" data-add="'+esc(b.id)+'">أضف للسلة</button>':
 '<span class="status muted">'+(b.stock===0?"نفدت الكمية":"قيد المراجعة")+'</span>')+
 '</div></div></article>';
}
function renderHome(){
 $("homeListings").innerHTML=state.listings.length?state.listings.slice(0,8).map(card).join(""):demoCovers();
 $("featuredShops").innerHTML=state.shops.length?state.shops.slice(0,6).map(shopCard).join(""):
 '<div class="empty-state"><h3>هنا تبدأ متاجر ديلا</h3><p>بمجرد اعتماد متجرك الأول، ستظهر هنا متاجر المؤلفين والناشرين الحقيقية.</p><button class="btn btn-outline" data-route="seller">سجّل أول متجر</button></div>';
}
function shopCard(s){
 return '<article class="shop-card"><span class="shop-avatar">'+esc((s.shop_name||"D").slice(0,1))+'</span>'+
 '<div><h3>'+esc(s.shop_name)+'</h3><p>'+esc(s.city||"متجر كتب مستقل")+' · '+esc(statusNames[s.status]||"")+'</p></div>'+
 '<button type="button" data-shop="'+esc(s.slug)+'">زيارة</button></article>';
}
function heading(title,desc="",label="DEELA BOOKS"){
 return '<div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › '+esc(title)+'</div>'+
 '<div class="page-heading"><div><span class="eyebrow">'+esc(label)+'</span><h1>'+esc(title)+'</h1><p>'+esc(desc)+'</p></div></div>';
}
function listingGrid(items,showSamples=false){
 return '<div class="books-grid">'+(items.length?items.map(card).join(""):showSamples?demoCovers():
 '<div class="empty-state"><h3>ما فيه كتب مطابقة حاليًا</h3><p>تظهر الكتب فور اعتمادها من مركز المالك.</p><button class="btn btn-outline" data-route="seller">أضف أول كتاب</button></div>')+'</div>';
}
function catalogPage(){
 let books=state.listings.filter(b=>{
  const category=state.category==="الكل"||b.category===state.category;
  const format=state.format==="all"||b.format===state.format;
  const query=!state.search||[b.title,b.author,b.description,b.category,b.deela_books_sellers?.shop_name].some(t=>String(t||"").toLocaleLowerCase().includes(state.search));
  return category&&format&&query;
 });
 return heading("مكتبة ديلا","اختر كتابًا يناسب ذوقك من الكتب الحقيقية المعتمدة.","EXPLORE OUR BOOKS")+
 '<div class="filters">'+categories.map(c=>'<button class="filter '+(state.category===c?"active":"")+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("")+'</div>'+
 '<div class="catalog-toolbar"><p>عدد الكتب: '+books.length+' '+(state.me?.is_owner?"(تظهر كتب المراجعة للمالك فقط)":"")+'</p>'+
 '<select id="formatFilter" aria-label="تصفية نوع الكتاب"><option value="all">جميع الأنواع</option><option value="physical">ورقي</option><option value="ebook">رقمي</option><option value="audiobook">صوتي</option></select></div>'+
 listingGrid(books,!state.listings.length);
}
function detailPage(){
 const b=state.listings.find(x=>x.id===state.current);
 if(!b)return heading("الكتاب غير موجود","ربما حُذف أو لم يُعتمد بعد.")+'<button class="btn btn-primary" data-route="catalog">العودة للمكتبة</button>';
 const available=b.status==="published"&&b.stock>0;
 return '<div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › <a href="#catalog" data-route="catalog">الكتب</a> › '+esc(b.title)+'</div>'+
 '<div class="detail-grid"><div class="detail-cover">'+cover(b)+'</div>'+
 '<div class="detail-desc"><span class="eyebrow">DEELA BOOKS · '+esc(b.category)+'</span><h1>'+esc(b.title)+'</h1>'+
 '<p>تأليف '+esc(b.author||"مؤلف مستقل")+' · <button class="text-button" data-shop="'+esc(b.deela_books_sellers?.slug||"")+'">'+esc(b.deela_books_sellers?.shop_name||"متجر ديلا")+'</button></p>'+
 '<strong class="detail-price">'+sar(b.price_sar)+'</strong><div class="detail-spec">'+
 '<div><small>نوع الكتاب</small><strong>'+esc(kinds[b.format])+'</strong></div>'+
 '<div><small>الحالة</small><strong>'+esc(conditions[b.book_condition])+'</strong></div>'+
 '<div><small>اللغة</small><strong>'+esc(b.language||"العربية")+'</strong></div>'+
 '<div><small>الكمية المتاحة</small><strong>'+b.stock+'</strong></div>'+
 '<div><small>المدينة</small><strong>'+esc(b.city||"—")+'</strong></div>'+
 '<div><small>التوصيل التقديري</small><strong>'+sar(b.format==="physical"?b.shipping_fee_sar:0)+'</strong></div></div>'+
 '<div class="detail-buttons">'+(available?'<button class="btn btn-primary" data-add="'+esc(b.id)+'">أضف للسلة ♧</button>':'<span class="status muted">الكتاب قيد المراجعة أو نفد</span>')+
 '<button class="btn btn-outline" data-like="'+esc(b.id)+'">♡ المفضلة</button>'+
 '<button class="btn btn-outline" data-ask="'+esc(b.id)+'">راسل البائع ✉</button>'+
 '<button class="btn btn-outline" data-report="'+esc(b.id)+'">إبلاغ</button>'+
 (state.me?.is_owner&&b.format!=="physical"&&b.file_path?'<button class="btn btn-soft" data-download="'+esc(b.id)+'">تحميل نسخة المالك</button>':"")+
 '</div><p style="margin-top:16px;font-size:11px">الشراء يعتمد على مراجعة المالك؛ لا يوجد دفع أو شحن تلقائي حاليًا.</p></div></div>'+
 '<div class="detail-story"><h2>عن هذا الكتاب</h2><p>'+esc(b.description||"لم يضف البائع وصفًا بعد.")+'</p></div>'+
 (b.preview_excerpt?'<div class="detail-story"><h2>اقرأ مقتطفًا</h2><p>'+esc(b.preview_excerpt)+'</p></div>':"")+
 '<div class="detail-story"><h2>حقوق النشر</h2><p>يؤكد البائع ملكيته للحقوق أو امتلاكه إذن بيع الكتاب. تتم مراجعة المحتوى قبل نشره.</p></div>';
}
function shopsPage(){
 return heading("متاجر المؤلفين والناشرين","تصفح متاجر الكتب والمكتبات المستقلة في مجتمع ديلا","OUR SELLERS")+
 '<div class="shops-grid">'+(state.shops.length?state.shops.map(shopCard).join(""):
 '<div class="empty-state"><h3>افتتح أول متجر!</h3><p>تبدأ أسماء المتاجر الحقيقية بالظهور بعد تقديم الطلبات واعتمادها.</p><button class="btn btn-primary" data-route="seller">افتح متجرك</button></div>')+'</div>';
}
function shopPage(){
 const s=state.shops.find(x=>x.slug===state.current);
 if(!s)return heading("المتجر غير موجود","قد يكون قيد المراجعة");
 return heading(s.shop_name,s.bio||"متجر كتب مستقل","AUTHOR & BOOKSELLER STORE")+
 '<div class="panel"><span class="shop-avatar">'+esc(s.shop_name.slice(0,1))+'</span><h2>'+esc(s.shop_name)+'</h2><p>'+esc(s.city||"")+'</p></div>'+
 listingGrid(state.listings.filter(b=>b.deela_books_sellers?.slug===s.slug));
}
function favoritesPage(){
 const ids=state.me?.favorites||[];
 return heading("قائمة المفضلة","كل الكتب التي حفظتها لتعود إليها لاحقًا.","MY WISHLIST")+
 listingGrid(state.listings.filter(b=>ids.includes(b.id)));
}
function cartPage(){
 const items=state.cart.map(x=>({b:state.listings.find(b=>b.id===x.id),qty:x.qty})).filter(x=>x.b);
 const subtotal=items.reduce((n,x)=>n+Number(x.b.price_sar)*x.qty,0);
 const shipping=items.reduce((n,x)=>n+(x.b.format==="physical"?Number(x.b.shipping_fee_sar)*x.qty:0),0);
 return heading("سلة الكتب","راجع الكتب والكمية والتوصيل قبل إرسال الطلب.","YOUR BOOK BAG")+
 (items.length?'<div class="panel">'+items.map(x=>'<div class="cart-line"><div><strong>'+esc(x.b.title)+'</strong>'+
 '<p>'+esc(kinds[x.b.format])+' · '+sar(x.b.price_sar)+'</p></div><div><button data-cart-minus="'+esc(x.b.id)+'">−</button> <strong>'+x.qty+'</strong> <button data-cart-plus="'+esc(x.b.id)+'">+</button> <button data-cart-remove="'+esc(x.b.id)+'">حذف</button></div></div>').join("")+
 '<div class="cart-total">المجموع: '+sar(subtotal+shipping)+'</div><p>يشمل رسوم التوصيل الموضحة لكل منتج. قيمة الدفع نهائية بعد مراجعة الطلب.</p>'+
 '</div><form id="checkoutForm" class="panel"><h2>إرسال طلب الشراء</h2><div class="form-grid">'+
 field("اسم العميل","buyer_name","text",true)+field("رقم الجوال","buyer_phone","tel",false)+
 field("الدولة","buyer_country","text",false,"السعودية")+field("المدينة","buyer_city","text",false)+
 '<label class="field full">عنوان الاستلام للكتب الورقية<textarea name="address" placeholder="الحي، الشارع، تفاصيل العنوان"></textarea></label>'+
 '<label class="field full">ملاحظات الطلب<textarea name="note" placeholder="أي ملاحظات تساعد البائع"></textarea></label></div>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">إرسال الطلب للمراجعة ←</button></div><p class="form-msg" id="checkoutMessage"></p></form>':
 '<div class="empty-state"><h3>سلة الكتب فارغة</h3><p>ابحث عن الكتاب الذي يعجبك ثم أضفه إلى السلة.</p><button class="btn btn-primary" data-route="catalog">تصفح الكتب</button></div>');
}
function ordersPage(){
 return heading("طلباتي","راجع حالة طلبك والملاحظات وأرقام التتبع حين تتوفر.","MY PURCHASES")+
 '<div class="list-rows">'+(state.me?.orders?.length?state.me.orders.map(o=>
 '<article class="row-card"><div class="row-top"><div><h3>'+esc(o.code)+'</h3><p>'+date(o.created_at)+'</p></div>'+
 '<span class="status">'+esc(statusNames[o.status]||o.status)+'</span></div><p>الإجمالي: '+sar(o.total_sar)+'</p>'+
 (o.tracking_number?'<p>رقم التتبع: '+esc(o.tracking_number)+'</p>':"")+
 (o.owner_note?'<p>ملاحظة الإدارة: '+esc(o.owner_note)+'</p>':"")+'</article>').join(""):
 '<div class="empty-state"><h3>لا توجد طلبات</h3><p>بعد إرسال أول طلب ستتابعه هنا.</p><button class="btn btn-primary" data-route="catalog">تصفح المكتبة</button></div>')+'</div>';
}
function messagesPage(messages=[]){
 return heading("الرسائل","تواصل مع البائعين بشأن الكتب وتابع ردودهم هنا.","COMMUNITY MESSAGES")+
 '<div class="list-rows">'+(messages.length?messages.map(m=>'<article class="row-card"><p>'+esc(m.body)+'</p><small>'+
 date(m.created_at)+' · '+(m.sender_id===state.me?.id?"مرسلة":"واردة")+'</small></article>').join(""):
 '<div class="empty-state"><h3>لا توجد محادثات</h3><p>ادخل صفحة أي كتاب واضغط «راسل البائع» لبدء التواصل.</p></div>')+'</div>';
}
function field(label,name,type="text",required=false,placeholder="",value=""){
 return '<label class="field">'+esc(label)+'<input name="'+esc(name)+'" type="'+type+'" '+
 (required?"required":"")+' placeholder="'+esc(placeholder)+'" value="'+esc(value??"")+'"></label>';
}
function sellerPage(){
 const seller=state.me?.seller;
 if(!seller)return heading("انضم إلى مؤلفي ديلا","افتح متجرًا باسمك لعرض الكتب الجديدة والمستعملة والرقمية.","START SELLING")+
 '<div class="panel"><h2>طلب افتتاح متجر</h2><p>يستقبل نظام ديلا طلبك، ولا يظهر المتجر للقراء إلا بعد اعتماده.</p>'+
 '<form id="sellerApplyForm" class="form-grid">'+
 field("اسم المتجر أو المؤلف","shop_name","text",true,"مكتبة ديلا")+
 field("الرابط الخاص (حروف إنجليزية وأرقام)","slug","text",true,"my-bookshop")+
 field("المدينة","city","text",false,"جدة")+
 '<label class="field">الدولة<select name="country"><option>السعودية</option><option>الإمارات</option><option>الكويت</option><option>قطر</option><option>البحرين</option><option>عُمان</option><option>أخرى</option></select></label>'+
 '<label class="field full">نبذة عن المتجر<textarea name="bio" placeholder="عرف القراء بك وبنوع الكتب التي تعرضها"></textarea></label>'+
 '<div class="form-actions"><button type="submit" class="btn btn-primary">تقديم طلب المتجر ←</button></div></form></div>';
 const available=seller.status==="approved";
 return heading("استوديو المؤلف: "+seller.shop_name,"إدارة منتجاتك وأغلفة الكتب والمراجعة والنشر.","SELLER STUDIO")+
 '<div class="panel"><div class="row-top"><div><h2>'+esc(seller.shop_name)+'</h2><p>'+esc(seller.slug)+'</p></div><span class="status '+(available?"":"muted")+'">'+esc(statusNames[seller.status])+'</span></div>'+
 '<p>الموافقة على المتجر والكتب تصدر من مركز المالك. يمكنك إدارة الملفات بعد اعتماد المتجر.</p></div>'+
 (available?'<div class="toolbar"><button class="btn btn-primary" data-editor="new">+ أضف كتابًا</button><button class="btn btn-outline" data-owner-tab="listings" data-route="owner">مراجعة الكتب (مالك)</button></div>'+
 '<div id="sellerEditor"></div><div class="panel"><h2>كتبي المرفوعة</h2><div class="list-rows">'+
 (state.sellerListings.length?state.sellerListings.map(l=>
 '<div class="row-card"><div class="row-top"><div><h3>'+esc(l.title)+'</h3><p>'+esc(kinds[l.format])+' · '+sar(l.price_sar)+'</p></div>'+
 '<span class="status '+(l.status==="published"?"":"muted")+'">'+esc(statusNames[l.status])+'</span></div>'+
 '<div class="form-actions"><button class="btn btn-outline" data-editor="'+esc(l.id)+'">تعديل الكتاب</button>'+
 (state.me?.is_owner?'<button class="btn btn-soft" data-owner-status="'+esc(l.id)+'" data-status="published">اعتماد الكتاب</button>':"")+
 '</div></div>').join(""):
 '<p>لم ترفع كتبًا بعد. اضغط «أضف كتابًا» لبدء النشر.</p>')+'</div></div>':"");
}
function editorPage(b=null){
 return '<div class="panel" id="editorPanel"><h2>'+(b?"تعديل الكتاب":"إضافة كتاب جديد")+'</h2>'+
 '<form id="listingForm" data-id="'+esc(b?.id||"")+'">'+
 '<div class="form-grid">'+
 field("اسم الكتاب","title","text",true,"اسم روايتك",b?.title||"")+
 field("اسم المؤلف","author","text",false,"اسم الكاتب",b?.author||"")+
 '<label class="field">نوع الكتاب<select name="format">'+
 Object.entries(kinds).map(([key,label])=>'<option value="'+key+'" '+(b?.format===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 '<label class="field">التصنيف<select name="category">'+categories.filter(x=>x!=="الكل").map(x=>'<option '+(b?.category===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>'+
 '<label class="field">حالة الكتاب الورقي<select name="book_condition">'+Object.entries(conditions).map(([key,label])=>
 '<option value="'+key+'" '+(b?.book_condition===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 field("سعر الكتاب (ريال)","price_sar","number",true,"35",b?.price_sar??"")+
 field("الكمية المتاحة","stock","number",true,"1",b?.stock??1)+
 field("تكلفة التوصيل (للكتاب الورقي)","shipping_fee_sar","number",false,"0",b?.shipping_fee_sar??0)+
 field("رقم ISBN (اختياري)","isbn","text",false,"",b?.isbn||"")+
 field("مدينة الشحن","city","text",false,"جدة",b?.city||"")+
 '<label class="field full">وصف الكتاب<textarea name="description" rows="5" placeholder="عن الكتاب ومحتواه">'+esc(b?.description||"")+'</textarea></label>'+
 '<label class="field full">مقتطف للمعاينة (اختياري)<textarea name="preview_excerpt" rows="4">'+esc(b?.preview_excerpt||"")+'</textarea></label>'+
 '<label class="field">صورة الغلاف (PNG/JPG/WebP، حتى 5MB)<input id="coverFile" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<label class="field">ملف الكتاب الرقمي (PDF/EPUB/MP3، حتى 50MB)<input id="digitalFile" type="file" accept=".pdf,.epub,.mp3"></label>'+
 '<label class="field full"><span class="checkfield"><input type="checkbox" name="rights_confirmed" required '+(b?.rights_confirmed?"checked":"")+'>'+
 'أؤكد أن لي حق نشر أو بيع هذا الكتاب وأنه لا ينتهك حقوق مؤلف أو ناشر آخر.</span></label>'+
 '</div><div class="form-actions"><button type="submit" class="btn btn-primary" id="saveListing">رفع الكتاب للمراجعة</button>'+
 '<button type="button" class="btn btn-outline" data-editor="close">إغلاق</button></div><p class="form-msg" id="listingMessage"></p></form></div>';
}
function ownerPage(){
 const tab=state.ownerTab;
 const tabs=[["overview","نظرة عامة"],["sellers","طلبات البائعين"],["listings","مراجعة الكتب"],["orders","الطلبات"],["reports","البلاغات والتقييمات"],["settings","الإعدادات"]];
 const top=heading("مركز المالك — DEELA Books","التحكم في كل المتاجر والكتب والطلبات وصلاحيات النشر.","OWNER MANAGEMENT")+
 '<div class="tab-bar">'+tabs.map(([key,label])=>
 '<button class="'+(tab===key?"active":"")+'" data-owner-tab="'+key+'">'+esc(label)+'</button>').join("")+'</div>';
 if(tab==="overview"){
  const d=state.ownerData||{};
  return top+'<div class="summary-grid">'+[["المتاجر",d.shops],["الكتب",d.books],["الطلبات",d.orders],["البلاغات المفتوحة",d.open_reports]].map(([x,y])=>'<div class="metric"><small>'+x+'</small><strong>'+Number(y??0)+'</strong></div>').join("")+'</div>'+
  '<div class="panel"><h2>إدارة DEELA Books</h2><p>يمكنك مراجعة البائعين والكتب الجديدة، اعتماد الطلبات، مراجعة البلاغات، وتعديل العناوين والعمولة.</p>'+
  '<p>🔒 النشر العام مغلق حاليًا ولا يوجد زر لفتحه دون موافقة صريحة. الدفع والشحن الآلي غير مفعلين.</p>'+
  '<div class="toolbar"><button class="btn btn-primary" data-owner-tab="listings">الكتب المعلقة</button><button class="btn btn-outline" data-owner-tab="sellers">طلبات المتاجر</button><button class="btn btn-outline" data-owner-tab="orders">الطلبات</button></div></div>';
 }
 if(tab==="sellers"){
  const arr=state.ownerData?.sellers||[];
  return top+'<div class="list-rows">'+(arr.length?arr.map(s=>'<div class="row-card"><div class="row-top"><div><h3>'+esc(s.shop_name)+'</h3><p>'+esc(s.slug)+' · '+esc(s.city||"")+'</p></div><span class="status">'+esc(statusNames[s.status])+'</span></div>'+
  '<div class="toolbar">'+[["approved","اعتماد"],["rejected","رفض"],["suspended","إيقاف"]].map(([v,label])=>'<button class="btn btn-outline" data-seller-status="'+esc(s.id)+'" data-status="'+v+'">'+label+'</button>').join("")+'</div></div>').join(""):'<p class="empty-state">لا توجد طلبات متاجر حاليًا.</p>')+'</div>';
 }
 if(tab==="listings"){
  const arr=state.ownerData?.listings||[];
  return top+'<div class="list-rows">'+(arr.length?arr.map(b=>
  '<div class="row-card"><div class="row-top"><div><h3>'+esc(b.title)+'</h3><p>'+esc(b.deela_books_sellers?.shop_name||"")+' · '+esc(kinds[b.format])+' · '+sar(b.price_sar)+'</p></div>'+
  '<span class="status '+(b.status==="published"?"":"muted")+'">'+esc(statusNames[b.status])+'</span></div><p>'+esc(b.description.slice(0,140))+'</p>'+
  '<div class="toolbar"><button class="btn btn-primary" data-owner-status="'+esc(b.id)+'" data-status="published">نشر</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="rejected">رفض</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="archived">إخفاء</button></div></div>').join(""):'<p class="empty-state">ما فيه كتب بانتظار المراجعة.</p>')+'</div>';
 }
 if(tab==="orders"){
  const arr=state.ownerData?.orders||[];
  return top+'<div class="list-rows">'+(arr.length?arr.map(o=>'<div class="row-card"><div class="row-top"><div><h3>'+esc(o.code)+'</h3><p>'+esc(o.buyer_email)+' · '+date(o.created_at)+'</p></div><span class="status">'+esc(statusNames[o.status]||o.status)+'</span></div>'+
  '<p>إجمالي الطلب: '+sar(o.total_sar)+' · الجوال: '+esc(o.phone||"—")+'</p>'+
  '<p>'+(o.deela_books_order_items||[]).map(x=>esc(x.title_snapshot)+' × '+x.quantity).join(" · ")+'</p>'+
  '<label class="field">حالة الطلب<select data-order-state="'+esc(o.id)+'">'+Object.entries(statusNames).filter(([key])=>["pending_review","awaiting_payment","paid","preparing","shipped","delivered","cancelled"].includes(key)).map(([key,label])=>
  '<option value="'+key+'" '+(o.status===key?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select></label>'+
  '<label class="field">رقم تتبع (اختياري)<input data-track="'+esc(o.id)+'" value="'+esc(o.tracking_number||"")+'"></label>'+
  '<label class="field">ملاحظة للعميل<textarea data-owner-note="'+esc(o.id)+'">'+esc(o.owner_note||"")+'</textarea></label>'+
  '<label class="checkfield"><input type="checkbox" data-paid="'+esc(o.id)+'">أؤكد شخصيًا استلام المبلغ الحقيقي قبل تغيير حالة الدفع.</label>'+
  '<div class="form-actions"><button class="btn btn-primary" data-save-order="'+esc(o.id)+'">حفظ حالة الطلب</button></div></div>').join(""):'<p class="empty-state">لم تصل طلبات شراء بعد.</p>')+'</div>';
 }
 if(tab==="reports"){
  const d=state.ownerData||{};
  return top+'<div class="panel"><h2>البلاغات</h2><div class="list-rows">'+(d.reports?.length?d.reports.map(r=>
  '<div class="row-card"><p>'+esc(r.reason)+'</p><span class="status">'+esc(r.status)+'</span><div class="toolbar">'+
  '<button class="btn btn-outline" data-report-status="'+esc(r.id)+'" data-status="resolved">تمت المعالجة</button>'+
  '<button class="btn btn-outline" data-report-status="'+esc(r.id)+'" data-status="dismissed">رفض البلاغ</button></div></div>').join(""):'<p>ما فيه بلاغات حاليًا.</p>')+'</div></div>'+
  '<div class="panel"><h2>التقييمات</h2><div class="list-rows">'+(d.reviews?.length?d.reviews.map(r=>
  '<div class="row-card"><strong>'+("★".repeat(r.rating))+'</strong><p>'+esc(r.body)+'</p><div class="toolbar">'+
  '<button class="btn btn-outline" data-review-status="'+esc(r.id)+'" data-approved="true">نشر</button>'+
  '<button class="btn btn-outline" data-review-status="'+esc(r.id)+'" data-approved="false">إخفاء</button></div></div>').join(""):'<p>ما فيه تقييمات حاليًا.</p>')+'</div></div>';
 }
 if(tab==="settings"){
  const conf=state.ownerData?.settings||state.settings;
  return top+'<form class="panel" id="settingsForm"><h2>إعدادات DEELA Books</h2><div class="form-grid">'+
  field("اسم المنصة","name","text",true,"DEELA Books",conf.name||"DEELA Books")+
  field("عنوان الواجهة الرئيسية","hero_title","text",true,"لكل كتاب حكاية",conf.hero_title||"")+
  field("الرسالة العلوية","announcement","text",false,"",conf.announcement||"")+
  field("رابط الدعم","support_url","url",false,"https://...",conf.support_url||"")+
  field("عمولة المنصة (%)","commission_percent","number",false,"10",conf.commission_percent??10)+
  '<label class="field full">وصف الواجهة<textarea name="hero_subtitle">'+esc(conf.hero_subtitle||"")+'</textarea></label></div>'+
  '<div class="panel" style="background:#173447"><strong>🔒 الموقع خاص الآن</strong><p>النشر العام والدفع الإلكتروني مقفلان، وهذا الإعداد غير قابل للتغيير من واجهة المعاينة.</p></div>'+
  '<button class="btn btn-primary" type="submit">حفظ الإعدادات</button><p id="settingsMessage" class="form-msg"></p></form>';
 }
 return top;
}
async function ownerData(){
 if(!state.me?.is_owner)return;
 let tab=state.ownerTab;
 if(tab==="overview")state.ownerData=await api("/owner/overview");
 if(tab==="sellers")state.ownerData=await api("/owner/sellers");
 if(tab==="listings")state.ownerData=await api("/owner/listings");
 if(tab==="orders")state.ownerData=await api("/owner/orders");
 if(tab==="reports")state.ownerData=await api("/owner/reports");
 if(tab==="settings")state.ownerData=await api("/owner/settings");
}
async function sellerData(){
 const r=await api("/my/listings");state.sellerListings=r.listings||[];
}
async function messagesData(){
 const r=await api("/messages");return r.messages||[];
}
async function route(view,push=true){
 if(!state.token){openLogin();return}
 if(view==="owner"&&!state.me?.is_owner){toast("مركز الإدارة خاص بالمالك");return}
 state.view=view;state.current=state.current||"";
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===view));
 $("home").classList.toggle("active",view==="home");$("home").hidden=view!=="home";
 $("dynamicPage").hidden=view==="home";$("dynamicPage").classList.toggle("active",view!=="home");
 if(push)history.replaceState(null,"","#"+(view==="detail"?"book/"+state.current:view));
 if(view==="home")renderHome();
 else{
  if(view==="seller")await sellerData();
  if(view==="owner")await ownerData();
  let markup=view==="catalog"?catalogPage():view==="detail"?detailPage():view==="shops"?shopsPage():
   view==="shop"?shopPage():view==="favorites"?favoritesPage():view==="cart"?cartPage():
   view==="orders"?ordersPage():view==="seller"?sellerPage():view==="owner"?ownerPage():"";
  if(view==="messages")markup=messagesPage(await messagesData());
  $("pageContent").innerHTML=markup;
  if(view==="catalog")$("formatFilter").value=state.format;
 }
 window.scrollTo({top:0,behavior:"instant"});
}
function book(id){state.current=id;route("detail")}
function openShop(slug){state.current=slug;route("shop")}
function cartChange(id,delta){
 const b=state.listings.find(x=>x.id===id);if(!b||b.status!=="published"||b.stock<1)return toast("الكتاب غير متاح للشراء");
 const current=state.cart.find(x=>x.id===id);
 if(current)current.qty=Math.max(0,Math.min(Math.min(b.stock,10),current.qty+delta));
 else if(delta>0)state.cart.push({id,qty:1});
 state.cart=state.cart.filter(x=>x.qty>0);saveCart();
 if(state.view==="cart")route("cart",false);
 else toast("تم تحديث السلة");
}
async function toggleFavorite(id){
 if(!state.me)return openLogin();
 const liked=!state.me.favorites?.includes(id);
 try{
  await api("/favorite",{method:"POST",data:{listing_id:id,liked}});
  state.me.favorites=state.me.favorites||[];
  state.me.favorites=liked?[...state.me.favorites,id]:state.me.favorites.filter(x=>x!==id);
  if(state.view==="home")renderHome();
  if(state.view==="catalog"||state.view==="favorites")route(state.view,false);
  toast(liked?"تمت الإضافة للمفضلة":"أُزيل الكتاب من المفضلة");
 }catch(e){toast(errorMessage(e))}
}
async function confirmAction(message){
 return new Promise(resolve=>{
  const shade=document.createElement("div");
  shade.className="shade";shade.style.zIndex="120";
  const modal=document.createElement("div");modal.className="modal";modal.style.zIndex="121";
  modal.innerHTML='<h2>تأكيد الإجراء</h2><p>'+esc(message)+'</p><div class="form-actions">'+
   '<button class="btn btn-primary" id="yesConfirm">تأكيد</button><button class="btn btn-outline" id="noConfirm">إلغاء</button></div>';
  document.body.append(shade,modal);
  const finish=v=>{modal.remove();shade.remove();resolve(v)};
  modal.querySelector("#yesConfirm").onclick=()=>finish(true);
  modal.querySelector("#noConfirm").onclick=()=>finish(false);
  shade.onclick=()=>finish(false);
 });
}
async function upload(file,type){
 if(!file)return null;
 const ext=(file.name.split(".").pop()||"").toLowerCase();
 const max=type==="cover"?5242880:52428800;
 if(file.size>max)throw Error(type==="cover"?"حجم الغلاف أكثر من 5MB":"حجم الكتاب أكثر من 50MB");
 const signed=await api("/upload/sign",{method:"POST",data:{type,extension:ext}});
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm");
 const client=createClient(ROOT,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const r=await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type||undefined});
 if(r.error)throw Error("رفع الملف لم ينجح: "+r.error.message);
 return signed.path;
}
async function login(ev){
 ev.preventDefault();
 const submit=ev.target.querySelector("button[type=submit]");submit.disabled=true;
 $("loginMessage").textContent="جارٍ التحقق…";
 try{
  const response=await fetch(AUTH,{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({email:$("loginEmail").value.trim(),password:$("loginPassword").value,platform:"android"}),
   credentials:"omit",signal:AbortSignal.timeout(22000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)throw Error(data.error||"تعذر تسجيل الدخول");
  if(data.role!=="owner")throw Error("الموقع خاص بالمالك حتى إطلاقه");
  state.token=data.access_token;sessionStorage.setItem("deela-books-token",state.token);
  $("loginPassword").value="";closeLogin();await reload();
 }catch(e){$("loginMessage").textContent=errorMessage(e)}
 finally{submit.disabled=false}
}
function openLogin(message=""){ $("shade").hidden=false;$("loginModal").hidden=false;$("loginMessage").textContent=message; }
function closeLogin(){$("shade").hidden=true;$("loginModal").hidden=true;}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function handleForm(ev){
 const form=ev.target,id=form.id;if(!id)return;ev.preventDefault();
 const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
 const raw=formData(form);
 try{
  if(id==="loginForm")return;
  if(id==="sellerApplyForm"){
    const d=await api("/seller/apply",{method:"POST",data:raw});
    toast("تم إنشاء صفحة متجرك: "+d.shop.shop_name);
    await reload();await route("seller",false);
  }else if(id==="listingForm"){
    const cover=form.querySelector("#coverFile")?.files?.[0];
    const digital=form.querySelector("#digitalFile")?.files?.[0];
    const existing=state.editing;
    const coverPath=cover?await upload(cover,"cover"):existing?.cover_path||"";
    const filePath=digital?await upload(digital,"file"):existing?.file_path||"";
    const payload={...raw,cover_path:coverPath,file_path:filePath,
      id:form.dataset.id||undefined,rights_confirmed:form.querySelector('[name="rights_confirmed"]')?.checked===true,
      stock:Number(raw.stock),price_sar:Number(raw.price_sar),shipping_fee_sar:Number(raw.shipping_fee_sar||0)};
    const msg=$("listingMessage");if(msg)msg.textContent="جارٍ رفع الكتاب وحفظه…";
    await api("/listing",{method:"POST",data:payload});
    toast("أرسل الكتاب للمراجعة. لن يظهر للعامة حتى الموافقة.");
    state.editing=null;await reload();await route("seller",false);
  }else if(id==="checkoutForm"){
    const d=await api("/order",{method:"POST",data:{
      items:state.cart,buyer_name:raw.buyer_name,phone:raw.buyer_phone,
      country:raw.buyer_country,city:raw.buyer_city,address:raw.address,note:raw.note
    }});
    state.cart=[];saveCart();
    toast("تم إرسال الطلب "+d.order.code+" للمراجعة دون تحصيل دفع.");
    await reload();await route("orders",false);
  }else if(id==="settingsForm"){
    await api("/owner/settings",{method:"POST",data:raw});
    toast("تم حفظ إعدادات DEELA Books");await reload();await route("owner",false);
  }else if(id==="messageForm"){
    await api("/messages",{method:"POST",data:{listing_id:raw.listing_id,body:raw.body}});
    toast("تم إرسال رسالتك للبائع");await route("messages",false);
  }else if(id==="reportForm"){
    await api("/reports",{method:"POST",data:{listing_id:raw.listing_id,reason:raw.reason}});
    toast("تم تسجيل البلاغ للمراجعة");await route("catalog",false);
  }else if(id==="loginForm"){
    await login(ev);
  }
 }catch(e){const feedback=form.querySelector(".form-msg");if(feedback)feedback.textContent=errorMessage(e);toast(errorMessage(e))}
 finally{if(button)button.disabled=false}
}
async function applySellerStatus(id,status){
 if(!await confirmAction("تغيير حالة متجر البائع إلى «"+(statusNames[status]||status)+"»؟"))return;
 try{await api("/owner/seller-status",{method:"POST",data:{id,status}});toast("تم تحديث البائع");await route("owner",false)}
 catch(e){toast(errorMessage(e))}
}
async function applyListingStatus(id,status){
 if(!await confirmAction("تغيير حالة الكتاب إلى «"+statusNames[status]+"»؟"))return;
 try{await api("/owner/listing-status",{method:"POST",data:{id,status}});toast("تم تحديث الكتاب");await reload();await route("owner",false)}
 catch(e){toast(errorMessage(e))}
}
async function saveOrderStatus(id){
 const status=document.querySelector('[data-order-state="'+id+'"]')?.value;
 const paid=document.querySelector('[data-paid="'+id+'"]')?.checked;
 if(!await confirmAction("تأكيد تغيير الطلب إلى «"+(statusNames[status]||status)+"»؟ لا تؤكد الدفع قبل استلامه فعليًا."))return;
 try{
  await api("/owner/order-status",{method:"POST",data:{id,status,payment_confirmed:paid,
   owner_note:document.querySelector('[data-owner-note="'+id+'"]')?.value||"",
   tracking_number:document.querySelector('[data-track="'+id+'"]')?.value||""}});
  toast("تم تحديث حالة الطلب");await route("owner",false);
 }catch(e){toast(errorMessage(e))}
}
async function moderate(id,type,status){
 try{
  await api("/owner/moderate",{method:"POST",data:{id,type,
   ...(type==="review"?{approved:status==="true"}:{status})}});
  toast("تمت معالجة المراجعة");await route("owner",false);
 }catch(e){toast(errorMessage(e))}
}
function editor(id){
 if(id==="close"){state.editing=null;$("sellerEditor").innerHTML="";return}
 state.editing=id==="new"?null:state.sellerListings.find(x=>x.id===id)||null;
 $("sellerEditor").innerHTML=editorPage(state.editing);
 $("sellerEditor").scrollIntoView({behavior:"smooth",block:"start"});
}
async function download(id){
 try{const x=await api("/download?id="+encodeURIComponent(id));window.open(x.url,"_blank","noopener")}
 catch(e){toast(errorMessage(e))}
}
function quickModal(title,formId,fields){
 const shade=document.createElement("div");shade.className="shade";shade.style.zIndex="100";
 const modal=document.createElement("section");modal.className="modal";modal.style.zIndex="101";
 modal.innerHTML='<button class="close" id="quickClose" aria-label="إغلاق">✕</button><h2>'+esc(title)+'</h2>'+
 '<form id="'+formId+'">'+fields+'<button class="btn btn-primary wide" type="submit">إرسال ←</button><p class="form-msg"></p></form>';
 document.body.append(shade,modal);
 const close=()=>{shade.remove();modal.remove()};
 shade.onclick=close;modal.querySelector("#quickClose").onclick=close;
 modal.querySelector("form").onsubmit=async e=>{e.stopPropagation();await handleForm(e);close()};
}
function bind(){
 document.addEventListener("click",async ev=>{
  const t=ev.target.closest("button,a,[data-book]");
  if(!t)return;
  if(t.dataset.book){ev.preventDefault();return book(t.dataset.book)}
  if(t.dataset.shop){ev.preventDefault();return openShop(t.dataset.shop)}
  if(t.dataset.add){ev.preventDefault();return cartChange(t.dataset.add,1)}
  if(t.dataset.like){ev.preventDefault();return toggleFavorite(t.dataset.like)}
  if(t.dataset.cartPlus){ev.preventDefault();return cartChange(t.dataset.cartPlus,1)}
  if(t.dataset.cartMinus){ev.preventDefault();return cartChange(t.dataset.cartMinus,-1)}
  if(t.dataset.cartRemove){ev.preventDefault();state.cart=state.cart.filter(x=>x.id!==t.dataset.cartRemove);saveCart();return route("cart",false)}
  if(t.dataset.category){ev.preventDefault();state.category=t.dataset.category;return route("catalog")}
  if(t.dataset.ownerTab){ev.preventDefault();state.ownerTab=t.dataset.ownerTab;return route("owner")}
  if(t.dataset.sellerStatus){ev.preventDefault();return applySellerStatus(t.dataset.sellerStatus,t.dataset.status)}
  if(t.dataset.ownerStatus){ev.preventDefault();return applyListingStatus(t.dataset.ownerStatus,t.dataset.status)}
  if(t.dataset.saveOrder){ev.preventDefault();return saveOrderStatus(t.dataset.saveOrder)}
  if(t.dataset.reportStatus){ev.preventDefault();return moderate(t.dataset.reportStatus,"report",t.dataset.status)}
  if(t.dataset.reviewStatus){ev.preventDefault();return moderate(t.dataset.reviewStatus,"review",t.dataset.approved)}
  if(t.dataset.editor){ev.preventDefault();return editor(t.dataset.editor)}
  if(t.dataset.download){ev.preventDefault();return download(t.dataset.download)}
  if(t.dataset.ask){ev.preventDefault();return quickModal("راسل بائع الكتاب","messageForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.ask)+'"><label class="field">رسالتك<textarea name="body" required minlength="2" maxlength="1000"></textarea></label>')}
  if(t.dataset.report){ev.preventDefault();return quickModal("الإبلاغ عن كتاب","reportForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.report)+'"><label class="field">سبب البلاغ<textarea name="reason" required minlength="10" maxlength="1000"></textarea></label>')}
  if(t.dataset.route){ev.preventDefault();return route(t.dataset.route)}
 });
 document.addEventListener("submit",handleForm);
 $("loginForm").addEventListener("submit",login);
 $("accountButton").onclick=()=>state.me?.is_owner?route("owner"):openLogin();
 $("closeModal").onclick=closeLogin;$("shade").onclick=closeLogin;
 $("search").addEventListener("input",ev=>{
  state.search=ev.target.value.trim().toLocaleLowerCase();
  if(state.view!=="catalog"&&state.search)route("catalog",false);
  else if(state.view==="catalog")route("catalog",false);
 });
 document.addEventListener("change",ev=>{
  if(ev.target?.id==="formatFilter"){state.format=ev.target.value;route("catalog",false)}
 });
 window.addEventListener("hashchange",()=>{
  const hash=location.hash.slice(1);
  if(hash.startsWith("book/")){state.current=hash.slice(5);route("detail",false)}
  else if(["home","catalog","shops","seller","favorites","orders","messages","cart","owner"].includes(hash))route(hash,false);
 });
}
async function boot(){
 bind();saveCart();$("year").textContent=new Date().getFullYear();
 const hash=location.hash.slice(1);
 if(hash.startsWith("book/")){state.current=hash.slice(5);state.view="detail"}
 else if(["catalog","shops","seller","favorites","orders","messages","cart","owner"].includes(hash))state.view=hash;
 if(!state.token)return openLogin();
 await reload();
}
boot();
})();