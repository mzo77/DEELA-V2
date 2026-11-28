(()=>{
"use strict";
const ROOT="https://rxlynynjetajtsqlhkrq.supabase.co";
const API=ROOT+"/functions/v1/deela-books";
const AUTH=API+"/auth/login";
const KEY="sb_publishable_xmUBM4N5ScJgIlxACHIllQ_1r4XkKV_";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sar=v=>new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",maximumFractionDigits:2}).format(Number(v)||0);
const date=v=>v?new Date(v).toLocaleDateString("ar-SA"):"—";
const kinds={physical:"ورقي",ebook:"إلكتروني",audiobook:"صوتي"};
const SAUDI_CITIES=["الرياض","جدة","مكة المكرمة","المدينة المنورة","الدمام","الخبر","الظهران","الجبيل","الأحساء","الهفوف","حفر الباطن","القطيف","رأس تنورة","الخفجي","ينبع","الطائف","رابغ","القنفذة","الليث","تبوك","ضباء","أملج","الوجه","حقل","تيماء","العلا","خيبر","بدر","بريدة","عنيزة","الرس","المذنب","حائل","بقعاء","سكاكا","دومة الجندل","القريات","عرعر","رفحاء","طريف","أبها","خميس مشيط","بيشة","محايل عسير","النماص","سراة عبيدة","جازان","صبيا","أبو عريش","صامطة","فرسان","الدرب","نجران","شرورة","الباحة","بلجرشي","المخواة","الخرج","الدوادمي","المجمعة","الزلفي","شقراء","وادي الدواسر","عفيف","القويعية"];
const productTypes={book:"كتاب أو رواية",game:"ألعاب",stationery:"قرطاسية",art:"فن ورسم",coffee:"قهوة",business_service:"خدمات",technology:"تقنية",music:"موسيقى",collectible:"مقتنيات",fashion:"أزياء",home:"منزل",other:"منتج آخر"};
const conditions={new:"جديد",like_new:"شبه جديد",good:"جيد",acceptable:"قديم",not_applicable:"رقمي"};
const categories=["الكل","روايات","أدب وشعر","خيال ورعب","رومانسية","أكشن","مغامرة","غموض","جريمة","تشويق","رعب","فانتازيا","خيال علمي","تاريخية","اجتماعية","دراما","كوميديا","بوليسية","شعر","تطوير الذات","أعمال","تعليم","كتب الأطفال","سيرة ذاتية","فلسفة","تقنية","ديني","ألعاب فيديو","قرطاسية","فنون وحرف","قهوة","موسيقى","مجسمات","أزياء","أخرى"]
function categoryOptions(){return [...new Set([...categories,...(state.sections||[]).filter(x=>x.kind==="category").map(x=>x.category),...(state.ownerData?.categories||[])].filter(Boolean))];}
const statusNames={draft:"مسودة",pending:"بانتظار المراجعة",published:"منشور",rejected:"مرفوض",archived:"مؤرشف",
 approved:"معتمد",suspended:"موقوف",pending_review:"بانتظار مراجعة الطلب",awaiting_payment:"بانتظار الدفع",
 paid:"تم تأكيد الدفع",preparing:"جارٍ التجهيز",shipped:"تمت المعالجة",delivered:"تم التسليم",cancelled:"ملغي",payment_review:"بانتظار التحقق من التحويل",rejected:"مرفوض"};
const enabled=key=>state.settings?.[key]!==false;
const MEMBER_FEATURES=[["profile_glow","هالة متحركة للحساب"],["display_name_style","اسم عرض ذهبي متوهج"],["profile_avatar","رفع صورة عرض شخصية"],["avatar_frame","إطارات الشفق والمخمل والكريستال"],["avatar_frame_gold","إطار ذهبي ملكي للصورة"],["avatar_frame_rose","إطار ذهبي وردي للصورة"],["avatar_frame_diamond","إطار ماسي للصورة"],["book_frame","إطارات النجوم والمخمل والكريستال"],["book_frame_gold","إطار ذهبي ملكي للكتاب"],["book_frame_rose","إطار وردي ذهبي للكتاب"],["book_frame_diamond","إطار ماسي للكتاب"],["profile_theme","ألوان خاصة لواجهة المتجر"],["verified_badge","شارة عضوية مميزة"],["book_shine","لمعان متحرك للكتب"],["book_shine_prism","لمعان منشوري فاخر"]];
const MEMBER_TIER_NAMES={month:"عضوية الشهر",half_year:"عضوية نصف السنة",year:"عضوية السنة"};
const MEMBER_TIER_COPY={month:"إطار أنيق للصورة والغلاف، اسم عرض مميز، وهالة ديلا خفيفة للحساب.",half_year:"كل مزايا الشهر، مع رفع صورة العرض، إطارات ذهبية ووردية، ثيم متجر خاص ولمعان كتب متحرك.",year:"كل المزايا: إطارات ألماسية، شارة موثّق، خلفية متجر متدرجة، ولمعان منشوري فاخر للكتب."};
const MEMBER_STYLE_OPTIONS={avatar:[["aurora","هالة الشفق","avatar_frame"],["velvet","مخمل ليلي","avatar_frame"],["crystal","كريستال","avatar_frame"],["gold","ذهب ملكي","avatar_frame_gold"],["rose","ذهب وردي","avatar_frame_rose"],["diamond","ألماس لامع","avatar_frame_diamond"]],book:[["starlight","نجوم مضيئة","book_frame"],["velvet","مخمل ليلي","book_frame"],["crystal","كريستال","book_frame"],["gold","ذهب ملكي","book_frame_gold"],["rose","ذهب وردي","book_frame_rose"],["diamond","ألماس لامع","book_frame_diamond"]]};
function memberStyleOptions(kind,current,features){return MEMBER_STYLE_OPTIONS[kind].map(([value,label,gate])=>'<option value="'+value+'" '+(current===value?"selected":"")+' '+(!features.includes(gate)?"disabled":"")+'>'+label+(!features.includes(gate)?" · مقفلة":"")+'</option>').join("")};
function filterOwnerRows(){
 const search=document.querySelector(".owner-search")?.value.trim().toLocaleLowerCase()||"";
 const status=document.getElementById("ownerStatusFilter")?.value||"all";
 const membership=document.getElementById("ownerMembershipFilter")?.value||"all";
 const accountType=document.getElementById("ownerAccountTypeFilter")?.value||"all";
 document.querySelectorAll("[data-owner-row]").forEach(row=>{
  const byText=!search||row.textContent.toLocaleLowerCase().includes(search);
  const byStatus=status==="all"||row.dataset.ownerState===status;
  const byMember=membership==="all"||row.dataset.memberState===membership;
  const byType=accountType==="all"||row.dataset.accountType===accountType;
  row.hidden=!(byText&&byStatus&&byMember&&byType);
 });
}
function ownerMembershipControls(user){const current=user.manual_member_plan|| (user.premium_active?user.member_plan:"free");return '<details class="owner-member-grant"><summary>إدارة اشتراك هذا الحساب</summary><form id="ownerMembershipForm" class="owner-membership-form"><input type="hidden" name="user_id" value="'+esc(user.id)+'"><label class="field">الباقة<select name="plan"><option value="free" '+(current==="free"?"selected":"")+'>بدون عضوية</option><option value="month" '+(current==="month"?"selected":"")+'>الشهرية</option><option value="half_year" '+(current==="half_year"?"selected":"")+'>النصف سنوية</option><option value="year" '+(current==="year"?"selected":"")+'>السنوية · أعلى باقة</option></select></label><p class="muted">الباقة الحالية: '+esc(user.member_plan_label||"مجاني")+(user.premium_ends_at?' · تنتهي '+date(user.premium_ends_at):"")+'</p><button class="btn btn-primary" type="submit">تطبيق الاشتراك على الحساب</button></form></details>'}
function memberChecks(user){const active=user.premium_active===true;const features=Array.isArray(user.member_features)?user.member_features:[];return '<details class="member-control"><summary>⚙ تخصيص مزايا المشترك</summary><form id="userPremiumForm" class="member-feature-form" data-member-feature-form><input type="hidden" name="user_id" value="'+esc(user.id)+'"><p class="muted">الباقة الحالية: <b>'+esc(user.member_plan_label||"مجاني")+'</b>'+ (user.premium_ends_at?' · تنتهي '+date(user.premium_ends_at):"")+'</p><div class="member-feature-grid">'+MEMBER_FEATURES.map(([key,label])=>'<label class="checkbox-field"><input type="checkbox" name="feature" value="'+key+'" '+(features.includes(key)?"checked":"")+' '+(active?"":"disabled")+'><span>'+label+'</span></label>').join("")+'</div>'+(!active?'<small>فعّل العضوية أولًا لتحديد المزايا.</small>':"")+'<div class="form-actions"><button class="btn btn-primary" type="submit" '+(active?"":"disabled")+'>حفظ مزايا المشترك</button><span class="form-msg"></span></div></form></details>'}

const state={token:window.__DEELA_BOOKS_TOKEN||sessionStorage.getItem("deela-books-token")||"",refreshToken:sessionStorage.getItem("deela-books-refresh")||"",
 email:"",view:"home",listings:[],shopListings:[],shopLoadedSlug:"",shopBooksOffset:0,shopBooksHasMore:false,shops:[],catalogOffset:0,catalogHasMore:false,shopsOffset:0,shopsHasMore:false,ownerUsersOffset:0,ownerUsersHasMore:false,cart:[],me:null,settings:{},
 current:null,category:"الكل",productType:"all",format:"all",sort:"newest",search:"",couponCode:"",condition:"all",nearbyOnly:false,userCoords:null,radiusKm:25,discountOnly:false,cityFilter:"",priceOrder:"",ownerTab:"overview",sellerTab:"books",subscriptionTab:"packages",selectedSellerPackage:"plus",selectedPackageTerm:"month",selectedPromotionTerm:"day",sellerPaidRequests:{subscriptions:[],promotions:[],seller:null},
 sellerListings:[],sellerListingsOffset:0,sellerListingsHasMore:false,sellerActivity:[],sellerNotifications:[],sellerNotificationIds:new Set(),contestIds:new Set(),contestTimer:null,sellerNotificationsReady:false,sellerNotificationTimer:null,sellerLaunchAlerts:[],sellerPromotions:[],contests:[],ownerContests:[],launchAlertPrice:0,launchAlertFeed:[],launchAlertIds:new Set(),launchAlertTimer:null,launchAlertsReady:false,ownerData:null,ownerSellersOffset:0,ownerSellersHasMore:false,ownerListingsOffset:0,ownerListingsHasMore:false,editing:null,formNote:"",loading:false,sections:[],banners:[]};
state.pendingAuthorNovelPath=sessionStorage.getItem("deela-author-first-novel-path")||"";
try{let c=JSON.parse(localStorage.getItem("deela-books-cart-v1")||"[]");if(Array.isArray(c))state.cart=c.filter(x=>typeof x.id==="string"&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10).slice(0,10)}catch{}
let noticeTimer;
function applyMemberTierTheme(plan){const tiers=["month","half_year","year"];document.body.classList.remove(...tiers.map(x=>"member-tier-page-"+x));if(tiers.includes(plan))document.body.classList.add("member-tier-page-"+plan);document.body.dataset.memberTier=tiers.includes(plan)?plan:""}
function toast(s){
 const el=$("toast");el.textContent=String(s);el.hidden=false;
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4400);
}
function saveCart(){
 localStorage.setItem("deela-books-cart-v1",JSON.stringify(state.cart));
 $("cartCount").textContent=state.cart.reduce((n,x)=>n+x.qty,0);
}
function updateNotificationBadge(){
 const unread=(state.sellerNotifications||[]).filter(n=>!n.read_at).length,badge=$("notificationCount");
 if(badge){badge.textContent=unread>99?"99+":String(unread);badge.hidden=unread===0;}
}
function errorMessage(e){return e instanceof Error?e.message:String(e)}
async function api(path,opts={}){
 const headers={"Content-Type":"application/json","apikey":KEY};
 if(state.token)headers.Authorization="Bearer "+state.token;
 let r;
 try{
  r=await fetch(API+path,{method:opts.method||"GET",headers,
   body:opts.data===undefined?undefined:JSON.stringify(opts.data),cache:"no-store",
   credentials:"omit",signal:AbortSignal.timeout(27000)});
 }catch(e){throw Error(e?.name==="TimeoutError"?"انتهت مهلة الاتصال بخادم ديلا":"تعذر الوصول إلى خادم DEELA Books")}
 if(r.status===401&&state.refreshToken&&path!=="/auth/refresh"){
  try{const renewed=await fetch(API+"/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY},body:JSON.stringify({refresh_token:state.refreshToken}),cache:"no-store",credentials:"omit"});const session=await renewed.json().catch(()=>({}));
   if(renewed.ok&&session.access_token){state.token=session.access_token;state.refreshToken=session.refresh_token||state.refreshToken;sessionStorage.setItem("deela-books-token",state.token);sessionStorage.setItem("deela-books-refresh",state.refreshToken);headers.Authorization="Bearer "+state.token;r=await fetch(API+path,{method:opts.method||"GET",headers,body:opts.data===undefined?undefined:JSON.stringify(opts.data),cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(27000)})}
  }catch{}
 }
 const body=await r.json().catch(()=>({}));
 if(!r.ok){const error=new Error(body.error||"تعذّر تنفيذ العملية");error.status=r.status;throw error;}
 return body;
}
async function reload(){
 sellerDataCacheAt=0;
 if(!state.token)return loadGuest();
 try{
  const me=await api("/me");state.me=me;state.email=me.email||me.phone||"";applyMemberTierTheme(me.member_plan);
  const [catalog,shops,contestData]=await Promise.all([api("/catalog?limit=24&offset=0"),api("/shops?limit=24&offset=0"),api("/contests")]);
  state.contests=contestData.contests||[];state.listings=catalog.listings||[];state.shops=shops.shops||[];state.catalogOffset=catalog.next_offset||state.listings.length;state.catalogHasMore=!!catalog.has_more;state.shopsOffset=shops.next_offset||state.shops.length;state.shopsHasMore=!!shops.has_more;state.me=me;state.settings=catalog.settings||{};state.sections=catalog.sections||[];state.banners=catalog.banners||[];
  applyTheme(state.settings.theme_colors);applyMaterial(state.settings.theme_material);applyDesign(state.settings.theme_design);applySections(state.settings.theme_sections);applyImages(state.settings.theme_images);state.cart=state.cart.filter(x=>state.listings.some(b=>b.id===x.id));saveCart();
  $("heroTitle").textContent=(state.settings.hero_title&&state.settings.hero_title!=="لكل كتاب حكاية، ولكل قارئ عالم"?state.settings.hero_title:"ستجد بين السطور ما عجزت عن قوله!");
  $("heroSubtitle").textContent=(state.settings.hero_subtitle&&!["سوق ديلا للكتب والروايات.","سوق ديلا للكتب والروايات؛ اكتشف، اقرأ، وبع كتبك في مكان واحد."].includes(state.settings.hero_subtitle)?state.settings.hero_subtitle:"ليست مجرد كلمات، بل مشاعر…");
  $("announcement").textContent=state.settings.announcement||"DEELA Books";
  const promo=document.querySelector(".feature-banner");
  if(promo){
    if(state.settings.home_promo_title)promo.querySelector("h2").textContent=state.settings.home_promo_title;
    if(state.settings.home_promo_description)promo.querySelector("p").textContent=state.settings.home_promo_description;
  }
  document.querySelectorAll('[data-route="messages"]').forEach(el=>el.hidden=!enabled("enable_messages"));
  document.querySelectorAll('[data-route="favorites"]').forEach(el=>el.hidden=!enabled("enable_favorites"));
  document.querySelectorAll('[data-route="cart"]').forEach(el=>el.hidden=!enabled("enable_orders")||!enabled("show_book_prices"));
  const who=state.me?.seller?.shop_name||"حسابي";
  $("accountButton").innerHTML='<span class="account-avatar">'+esc((who||"D").trim().slice(0,1))+'</span><span>حسابي</span><span aria-hidden="true">⌄</span>';
  document.querySelectorAll(".owner-only").forEach(x=>x.hidden=!state.me?.is_owner);
  if(me.is_owner&&state.view==="seller")state.view="home";
  renderHome();route(state.view,false);
 }catch(e){
  if(e?.status===401){
   for(const key of ["deela-books-token","deela-books-refresh","deela-books-auth-v1"])sessionStorage.removeItem(key);
   state.token="";state.refreshToken="";
  }
  await loadGuest();
  toast(e?.status===401?"انتهت جلسة الدخول؛ سجّل الدخول مرة أخرى.":"تم تسجيل الدخول، لكن تعذر تحميل بيانات الحساب مؤقتًا. حاول التحديث بعد قليل.");
 }
}
async function loadGuest(){
 state.me=null;state.email="";applyMemberTierTheme("");state.ownerData=null;state.sellerListings=[];state.sellerNotifications=[];state.contests=[];
 state.listings=[];state.shops=[];state.banners=[];state.sections=[];state.settings={};
 document.querySelectorAll(".owner-only").forEach(x=>x.hidden=true);
 $("accountButton").innerHTML="حسابي ◌";const mobile=$("mobileAccountButton");if(mobile)mobile.innerHTML="<span aria-hidden=\"true\">♙</span>حسابي";
 try{
  const [catalog,shops]=await Promise.all([api("/catalog?limit=24&offset=0"),api("/shops?limit=24&offset=0")]);
  state.listings=catalog.listings||[];state.shops=shops.shops||[];state.catalogOffset=catalog.next_offset||state.listings.length;state.catalogHasMore=!!catalog.has_more;state.shopsOffset=shops.next_offset||state.shops.length;state.shopsHasMore=!!shops.has_more;state.settings=catalog.settings||{};state.sections=catalog.sections||[];state.banners=catalog.banners||[];
  applyTheme(state.settings.theme_colors);applyMaterial(state.settings.theme_material);applyDesign(state.settings.theme_design);applySections(state.settings.theme_sections);applyImages(state.settings.theme_images);
  $("heroTitle").textContent=(state.settings.hero_title&&state.settings.hero_title!=="لكل كتاب حكاية، ولكل قارئ عالم"?state.settings.hero_title:"ستجد بين السطور ما عجزت عن قوله!");
  $("heroSubtitle").textContent=(state.settings.hero_subtitle&&!["سوق ديلا للكتب والروايات.","سوق ديلا للكتب والروايات؛ اكتشف، اقرأ، وبع كتبك في مكان واحد."].includes(state.settings.hero_subtitle)?state.settings.hero_subtitle:"ليست مجرد كلمات، بل مشاعر…");
  $("announcement").textContent=state.settings.announcement||"عالم ديلا للكتب والروايات — تصفح مفتوح";
  document.querySelectorAll('[data-route="messages"],[data-route="favorites"],[data-route="orders"],[data-route="cart"],[data-route="notifications"],[data-route="alerts"],[data-route="profile"]').forEach(el=>el.hidden=true);
 }catch(e){toast(errorMessage(e));}
 renderHome();
 if(["home","catalog","shops","shop","detail"].includes(state.view))await route(state.view,false);else{state.view="home";await route("home",false)}
}
const themeKeys={bg:"الخلفية الرئيسية",bg2:"الخلفية الثانوية",panel:"خلفية البطاقات",panel2:"البطاقات الفاتحة",panel3:"البطاقات البارزة",white:"النص الرئيسي",muted:"النص الثانوي",muted2:"النص الخافت",teal:"اللون الأساسي",teal2:"اللون الأساسي الفاتح",purple:"اللون المساعد",gold:"اللون الذهبي",rose:"الوردي",blue:"الأزرق",success:"لون النجاح",line:"الحدود",line2:"الحدود البارزة"};
const themePresets={
 ocean:{bg:"#0c1524",bg2:"#111f31",panel:"#18283d",panel2:"#1e344b",panel3:"#243b51",white:"#eff7ff",muted:"#a3b8cb",muted2:"#7392aa",teal:"#8bdccf",teal2:"#a5eddf",purple:"#b1a6e8",gold:"#e6c59e",rose:"#eaa8c0",blue:"#8eb8f0",success:"#75d6a4",line:"#355069",line2:"#4c6d80"},
 sapphire:{bg:"#0b1228",bg2:"#121d3b",panel:"#19294a",panel2:"#24385e",panel3:"#304873",white:"#f3f5ff",muted:"#b0bddc",muted2:"#8295bd",teal:"#79d6e4",teal2:"#a7ebf3",purple:"#a698f5",gold:"#e5c789",rose:"#ed9fc2",blue:"#7aa9ff",success:"#76d7a0",line:"#364b75",line2:"#50699a"},
 emerald:{bg:"#0d1b1a",bg2:"#132522",panel:"#1b342f",panel2:"#23443c",panel3:"#2d574b",white:"#effaf4",muted:"#adc8b9",muted2:"#7eaa94",teal:"#8fe0bd",teal2:"#b3f2d2",purple:"#b7a6d9",gold:"#d9c185",rose:"#e7a9ab",blue:"#86c8d1",success:"#83df9f",line:"#3d6655",line2:"#59866f"},
 rose:{bg:"#21131e",bg2:"#2b1928",panel:"#3a2335",panel2:"#4b2d45",panel3:"#603a56",white:"#fff4fa",muted:"#ddbbce",muted2:"#b38ba3",teal:"#8edaca",teal2:"#b2f1df",purple:"#c2a2ef",gold:"#e8c48e",rose:"#f1a9cb",blue:"#a1c3f0",success:"#86d5a0",line:"#70465f",line2:"#95617f"},
 lavender:{bg:"#171529",bg2:"#211d3b",panel:"#2b2850",panel2:"#3a3565",panel3:"#49427b",white:"#f7f4ff",muted:"#c4bcdf",muted2:"#958bbd",teal:"#8edfd7",teal2:"#b6f0e8",purple:"#b8a3ff",gold:"#e5cb9b",rose:"#edaed0",blue:"#9bbafa",success:"#82d6a6",line:"#514a7b",line2:"#70669e"},
 sand:{bg:"#211e19",bg2:"#2c2821",panel:"#3a3429",panel2:"#4c4334",panel3:"#5d503e",white:"#fff8ed",muted:"#d2c2a8",muted2:"#a99576",teal:"#a7d7c4",teal2:"#c9eadb",purple:"#c4b0d4",gold:"#e7c486",rose:"#e4ada0",blue:"#a8c3d2",success:"#a5d28c",line:"#675943",line2:"#887456"},
 midnight:{bg:"#101114",bg2:"#17191e",panel:"#20232a",panel2:"#292d36",panel3:"#343944",white:"#f3f4f8",muted:"#b9bdc8",muted2:"#858b99",teal:"#80ded4",teal2:"#a9f0e7",purple:"#b9a5ef",gold:"#e3c078",rose:"#e99fbd",blue:"#89baff",success:"#79d99d",line:"#414754",line2:"#5d6575"},
 burgundy:{bg:"#201116",bg2:"#2b171e",panel:"#3b2029",panel2:"#4d2934",panel3:"#603441",white:"#fff4f3",muted:"#d7b9ba",muted2:"#ad898d",teal:"#8bd8c8",teal2:"#b3eddf",purple:"#c1a0d3",gold:"#e7c181",rose:"#ed9aaa",blue:"#9ebce5",success:"#82d39a",line:"#69404a",line2:"#8b5962"}
};
function applyTheme(colors){
 for(const key of Object.keys(themeKeys)){
  const value=colors?.[key];
  if(typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value))document.documentElement.style.setProperty("--"+key,value);
  else document.documentElement.style.removeProperty("--"+key);
 }
}
const materials={none:"بدون خامة",ceramic:"سيراميك لامع",marble:"رخام فاخر",ornament:"زخارف هندسية",pearl:"لؤلؤي",metal:"معدن مصقول",velvet:"مخمل ملكي",neon:"نيون",heritage:"تراثي",aurora:"شفق قطبي",granite:"جرانيت",wood:"خشب دافئ",floral:"نقوش نباتية",sandstone:"حجر رملي",crystal:"كريستال",geometric:"هندسي مغربي",goldleaf:"ورق ذهبي",watercolor:"ألوان مائية",leather:"جلد فاخر",linen:"كتان ناعم",mosaic:"فسيفساء",stars:"سماء مرصعة"};
function applyMaterial(value){document.body.dataset.material=Object.hasOwn(materials,value)?value:"none";}
function materialFields(conf){
 return '<label class="field full">خامة خلفية المتجر<select name="theme_material">'+Object.entries(materials).map(([k,v])=>'<option value="'+k+'" '+(conf.theme_material===k?'selected':'')+'>'+v+'</option>').join("")+'</select></label><div class="field full material-preview" id="materialPreview" data-material="'+(Object.hasOwn(materials,conf.theme_material)?conf.theme_material:"none")+'" style="min-height:110px;padding:24px;border:1px solid var(--line);border-radius:18px;background-color:var(--bg)">معاينة الخامة والزخرفة</div>';
}
document.addEventListener("input",ev=>{
 const priceInput=ev.target;
 if(priceInput?.name==="price_sar"&&priceInput.closest("#listingForm")){
  const amount=Math.max(0,Number(priceInput.value)||0),platform=Math.round(amount*20)/100,writer=Math.round((amount-platform)*100)/100;
  const out=document.getElementById("commissionPreviewValue");
  if(out)out.textContent=amount?("من "+sar(amount)+": حصة المنصة "+sar(platform)+"، وصافي المؤلف "+sar(writer)+"."):"أدخل السعر لعرض الحسبة.";
 }
});
document.addEventListener("input",ev=>{
 const el=ev.target;if(!el.closest("#settingsForm"))return;
 if(el.name?.startsWith("design_")){
  const form=el.form,d={...designDefaults,...state.settings.theme_design,radius:Number(form.elements.design_radius.value),font_size:Number(form.elements.design_font_size.value),banner_motion:form.elements.design_banner_motion.value};
  applyDesign(d);
  document.querySelectorAll("[data-icon-output]").forEach(out=>{const input=form.elements[out.dataset.iconOutput];if(input)out.value=input.value+"px"});
 }
 const preview=document.getElementById("materialPreview");if(!preview)return;
 if(el.name==="theme_material"&&Object.hasOwn(materials,el.value))preview.dataset.material=el.value;
 if(el.name==="theme_bg"&&/^#[0-9a-f]{6}$/i.test(el.value))preview.style.backgroundColor=el.value;
 if(el.name==="theme_white"&&/^#[0-9a-f]{6}$/i.test(el.value))preview.style.color=el.value;
});
const designDefaults={radius:18,font_size:14,banner_motion:"none",category_icon_size:36,nav_icon_size:20,book_action_icon_size:42,category_icon_shape:"soft",book_cover_height:251,book_card_width:220,book_card_radius:18};
function applyDesign(d){
 const root=document.documentElement,shape={round:"50%",square:"5px",soft:"17px"};
 root.style.setProperty("--radius",Math.max(0,Math.min(40,Number(d?.radius??18)||0))+"px");
 document.body.style.fontSize=Math.max(12,Math.min(22,Number(d?.font_size??14)||14))+"px";
 document.body.dataset.bannerMotion=d?.banner_motion==="glow"?"glow":"none";
 const categoryIconSize=Number(d?.category_icon_size);root.style.setProperty("--category-icon-size",Math.max(0,Math.min(500,Number.isFinite(categoryIconSize)?categoryIconSize:36))+"px");
 root.style.setProperty("--category-icon-radius",shape[d?.category_icon_shape]||shape.soft);
 root.style.setProperty("--nav-icon-size",Math.max(14,Math.min(32,Number(d?.nav_icon_size??20)||20))+"px");
 root.style.setProperty("--book-action-icon-size",Math.max(28,Math.min(52,Number(d?.book_action_icon_size??42)||42))+"px");
 root.style.setProperty("--book-cover-height",Math.max(0,Math.min(1200,Number(d?.book_cover_height??251)||0))+"px");
 root.style.setProperty("--book-card-width",Math.max(0,Math.min(1200,Number(d?.book_card_width??220)||0))+"px");
 root.style.setProperty("--book-card-radius",Math.max(0,Math.min(36,Number(d?.book_card_radius??18)||0))+"px");
}
function iconSizeFields(conf){
 const d={...designDefaults,...conf.theme_design};
 return '<label class="field icon-size-control">حجم أيقونات التصنيفات<input type="range" name="design_category_icon_size" min="22" max="64" step="1" value="'+Number(d.category_icon_size)+'"><output data-icon-output="design_category_icon_size">'+Number(d.category_icon_size)+'px</output></label>'+
 '<label class="field icon-size-control">حجم أيقونات شريط التنقل<input type="range" name="design_nav_icon_size" min="14" max="32" step="1" value="'+Number(d.nav_icon_size)+'"><output data-icon-output="design_nav_icon_size">'+Number(d.nav_icon_size)+'px</output></label>'+
 '<label class="field icon-size-control">حجم الإعجاب والمفضلة على غلاف الكتاب<input type="range" name="design_book_action_icon_size" min="28" max="52" step="1" value="'+Number(d.book_action_icon_size)+'"><output data-icon-output="design_book_action_icon_size">'+Number(d.book_action_icon_size)+'px</output></label>';
}
function designFields(conf){
 const d={...designDefaults,...conf.theme_design};
 return '<label class="field">استدارة البطاقات<input name="design_radius" type="number" min="0" max="40" value="'+Number(d.radius)+'"></label><label class="field">حجم الخط<input name="design_font_size" type="number" min="12" max="22" value="'+Number(d.font_size)+'"></label><label class="field">حركة البنر<select name="design_banner_motion"><option value="none">ثابت</option><option value="glow" '+(d.banner_motion==="glow"?"selected":"")+'>لمعان متحرك</option></select></label>';
}
const sectionDefs={categories:["التصنيفات","#homeCategories"],books:["الكتب","#homeListings"],banner:["البنر",".feature-banner"],shops:["المتاجر","#featuredShops"],faq:["الأسئلة الشائعة",".faq-section"],contests:["مجتمع ديلا","#contestHome .contest-section"]};
function applySections(config){
 const sections=Object.entries(sectionDefs).map(([k,[label,selector]],i)=>{
 const node=document.querySelector(selector)?.closest("section.container");const d=config?.[k]||{};
 if(!node)return null;
 const h=node.querySelector("h2");if(h){h.dataset.originalTitle??=h.textContent;if(k!=="banner"||d.title)h.textContent=d.title||h.dataset.originalTitle;}
 node.dataset.material=Object.hasOwn(materials,d.material)?d.material:"none";node.dataset.sectionKey=k;node.dataset.sectionMotion=d.motion||"shimmer";node.style.setProperty("--section-scale",String(Math.min(1.2,Math.max(.85,(Number(d.scale)||100)/100))));
 const description=node.querySelector(".section-title p");if(description){description.dataset.originalDescription??=description.textContent;description.textContent=d.description||description.dataset.originalDescription;}const link=node.querySelector(".section-title .text-button")||(k==="banner"?node.querySelector(".btn"):null);if(link){link.dataset.originalLabel??=link.textContent;link.textContent=d.link_text||link.dataset.originalLabel;}const limit=Number(d.items_limit)||({categories:12,books:8,shops:6,faq:4,contests:6}[k]||6);node.querySelectorAll(".faqs>details").forEach((el,i)=>el.hidden=i>=limit);
 const bannerUrl=safeImage(d.banner_url||"");if(k==="banner")node.style.backgroundImage="";
 node.querySelectorAll(".community-tile").forEach(el=>{el.style.minHeight=(152*(Number(d.scale)||100)/100)+"px";el.style.fontSize=(Number(d.scale)||100)+"%"});
 node.querySelectorAll(".book-card").forEach(el=>{el.style.width=(220*(Number(d.scale)||100)/100)+"px";el.style.setProperty("--book-cover-height",(251*(Number(d.scale)||100)/100)+"px")});
 node.querySelectorAll(".shop-card,.faq-item,.contest-card").forEach(el=>{el.style.fontSize=(Number(d.scale)||100)+"%"});
 node.style.setProperty("--section-bg","#F9E9E7");node.style.backgroundColor="transparent";
 node.style.setProperty("--section-accent","#51321B");
 node.style.borderColor="#e5c9c4";
 node.dataset.ownerHidden=d.visible===false?"true":"false";node.classList.toggle("owner-section-hidden",d.visible===false&&!!state.me?.is_owner);node.hidden=d.visible===false&&!state.me?.is_owner;
 return {node,order:Number(d.order)||i+1};
 }).filter(Boolean).sort((a,b)=>a.order-b.order);
 for(const {node} of sections)node.parentNode.appendChild(node);
}
const imageKeys={logo:"رابط صورة الشعار",background:"رابط خلفية المتجر",banner:"رابط صورة البنر"};
function safeImage(value){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password?u.href:""}catch{return ""}}
function imageFields(conf){return Object.entries(imageKeys).map(([k,label])=>{
 const src=safeImage(conf.theme_images?.[k]);
 return '<label class="field">'+esc(label)+'<input type="file" accept="image/png,image/jpeg,image/webp" data-brand-image="'+k+'" aria-label="رفع '+esc(label)+' من الجهاز">'+
 '<input type="hidden" name="image_'+k+'_path" value="'+esc(conf.theme_image_paths?.[k]||"")+'"><span class="form-msg" data-image-status="'+k+'">'+(src?'الصورة الحالية محفوظة':'اختر صورة من الهاتف أو الجهاز')+'</span>'+
 (src?'<img data-image-preview="'+k+'" src="'+esc(src)+'" alt="معاينة '+esc(label)+'" style="max-width:180px;max-height:100px;object-fit:contain;border-radius:12px">':'<img data-image-preview="'+k+'" hidden alt="معاينة '+esc(label)+'" style="max-width:180px;max-height:100px;object-fit:contain;border-radius:12px">')+'</label>';
}).join("");}
document.addEventListener("change",async ev=>{
 const input=ev.target;if(!input.matches("[data-brand-image],[data-admin-image]"))return;
 const admin=input.matches("[data-admin-image]"),key=admin?input.dataset.adminImage:input.dataset.brandImage,file=input.files?.[0];if(!file)return;
 const status=admin?document.querySelector('[data-upload-status="'+key+'"]'):document.querySelector('[data-image-status="'+key+'"]');
 try{
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("الصورة يجب أن تكون PNG أو JPG أو WebP");
  if(file.size>3145728)throw Error("حجم صورة الهوية يجب ألا يتجاوز 3MB");
  status.textContent="جارٍ رفع الصورة إلى التخزين الخاص…";
  const path=await upload(file,"branding");
  const pathField=input.form.elements.namedItem(admin?"image_path":"image_"+key+"_path");if(pathField)pathField.value=path;
  if(admin)status.textContent="تم رفع الصورة. احفظ النموذج لتطبيقها.";
  else{const preview=document.querySelector('[data-image-preview="'+key+'"]');preview.src=URL.createObjectURL(file);preview.hidden=false;status.textContent="تم الرفع. اضغط حفظ لتطبيق الصورة.";}
 }catch(e){status.textContent=errorMessage(e);input.value="";}
});
function applyImages(images){
 for(const [key,selector] of [["banner",".feature-banner"]]){
 const el=document.querySelector(selector),url=safeImage(images?.[key]);if(el)el.style.backgroundImage=url?'url('+JSON.stringify(url)+')':"";
 }
 /* The site-wide silk texture is fixed; legacy background settings must not erase it. */
 document.querySelectorAll(".brand-symbol").forEach(el=>{
 const url=safeImage(images?.logo);let img=el.querySelector("img");
 if(url){if(!img){img=document.createElement("img");img.alt="DEELA";img.referrerPolicy="no-referrer";img.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:inherit;background:var(--panel)";el.append(img)}img.src=url;}else img?.remove();
 });
}
function themeFields(conf){
 const presets='<div class="field full"><strong>لوحات ألوان جاهزة</strong><div class="theme-preset-grid">'+Object.keys(themePresets).map(k=>'<button type="button" class="btn btn-outline" data-theme-preset="'+k+'">'+({ocean:"محيط",sapphire:"ياقوت",emerald:"زمرد",rose:"وردي ملكي",lavender:"لافندر",sand:"رملي",midnight:"منتصف الليل",burgundy:"عنابي"}[k])+'</button>').join("")+'</div></div>';
 return presets+Object.entries(themeKeys).map(([key,label])=>'<label class="field">'+esc(label)+'<input type="color" name="theme_'+key+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(conf.theme_colors?.[key]||"")?conf.theme_colors[key]:getComputedStyle(document.documentElement).getPropertyValue("--"+key).trim())+'"></label>').join("");
}
document.addEventListener("click",ev=>{
 const button=ev.target.closest("[data-theme-preset]");if(!button)return;
 const preset=themePresets[button.dataset.themePreset];if(!preset)return;
 for(const [key,value] of Object.entries(preset)){const input=document.querySelector('[name="theme_'+key+'"]');if(input)input.value=value;}
 applyTheme(preset);toast("تم تطبيق لوحة الألوان. احفظ الإعدادات لتثبيتها.");
});
document.addEventListener("input",ev=>{
 const input=ev.target;if(!input.matches('#settingsForm input[type="color"][name^="theme_"]'))return;
 const colors={};for(const [key] of Object.entries(themeKeys)){const item=document.querySelector('[name="theme_'+key+'"]');if(item)colors[key]=item.value;}
 applyTheme(colors);
});
function demoCovers(){
 const samples=[
  ["ليالي الزمرد","رواية خيالية","purple"],["مدينة الغيم","رحلة أدبية","teal"],
  ["ما وراء الضوء","قصة تشويق","gold"],["حروف من زمن","قصص قصيرة","purple"]
 ];
 return samples.map(([title,subtitle,tint])=>'<article class="book-card" aria-label="نموذج تصميم غير معروض للبيع"><div class="cover-wrap '+tint+
 '"><div class="cover-pseudo"><small>DEELA CONCEPT</small><strong>'+esc(title)+'</strong><em>✦</em></div><span class="sample-badge">نموذج تصميم فقط</span></div>'+
 '<div class="book-info"><span class="book-meta">عرض توضيحي</span><h3>'+esc(title)+'</h3><p>'+esc(subtitle)+'</p><div class="book-tags"><span>غير معروض للبيع</span></div><div class="book-bottom"><span class="book-price" style="font-size:11px">بانتظار الكتب الحقيقية</span></div></div></article>').join("");
}
function productGallery(b){const urls=Array.isArray(b.image_urls)&&b.image_urls.length?b.image_urls:(b.cover_url?[b.cover_url]:[]);if(!urls.length)return cover(b);return '<div class="product-gallery"><div class="product-gallery-main" id="productGalleryMain"><img src="'+esc(urls[0])+'" alt="غلاف '+esc(b.title)+'"></div>'+(urls.length>1?'<div class="product-gallery-thumbs">'+urls.map((url,i)=>'<button type="button" data-gallery="'+i+'" aria-label="عرض الصورة '+(i+1)+'"><img src="'+esc(url)+'" alt=""></button>').join("")+'</div>':"")+'</div>'}
function cover(b){
 const tint=b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold";
 const inner=b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>';
 return '<div class="cover-wrap '+tint+'">'+inner+'<span class="book-badge">'+esc(kinds[b.format]||"كتاب")+'</span></div>';
}
function card(b){
 const isPublished=b.status==="published",isOwn=Boolean(state.me?.seller?.id&&state.me.seller.id===b.seller_id),fav=state.me?.favorites?.includes(b.id),liked=state.me?.likes?.includes(b.id);
 const packageKey=b.deela_books_sellers?.seller_package||"free",packageBadge=packageKey!=="free"?'<span class="seller-package-badge seller-package-'+packageKey+'">'+(packageKey==="pro"?"Pro":"Plus")+'</span>':"",promotionBadge=Number(b.promotion_rank)>=2&&(!b.promotion_ends_at||new Date(b.promotion_ends_at)>new Date())?'<span class="listing-promo-badge">مميز</span>':"";
 const kind=kinds[b.format]||"كتاب",kindLabel=b.format==="physical"?"ورقي":b.format==="audiobook"?"صوتي":"رقمي",sellerTier=b.deela_books_sellers?.member_profile?.plan||"",sellerTierClass=sellerTier==="year"?"member-store-year":sellerTier==="half_year"?"member-store-half-year":sellerTier==="month"?"member-store-month":"";
 return '<article class="book-card '+sellerTierClass+' '+((b.deela_books_sellers?.member_profile?.features||[]).includes("profile_glow")?"member-glow":"")+' '+((b.deela_books_sellers?.member_profile?.features||[]).includes("book_frame")?"member-book-frame member-book-frame-"+(b.deela_books_sellers?.member_profile?.appearance?.book_frame||"starlight"):"")+' '+((b.deela_books_sellers?.member_profile?.features||[]).includes("book_shine")&&b.deela_books_sellers?.member_profile?.appearance?.shine!==false?"member-book-shine":"")+' '+((b.deela_books_sellers?.member_profile?.features||[]).includes("book_shine_prism")&&b.deela_books_sellers?.member_profile?.appearance?.shine!==false?"member-book-shine-prism":"")+'"><div class="cover-wrap '+(b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold")+'" data-book="'+esc(b.id)+'">'+
 (b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>')+
 '<span class="book-badge">'+esc(kind)+(isPublished?"":" · غير منشور")+'</span>'+packageBadge+promotionBadge+
 (enabled("enable_favorites")?'<button type="button" data-favorite="'+esc(b.id)+'" class="card-save '+(fav?"liked":"")+'" aria-label="حفظ في المفضلة">'+(fav?"▣":"♧")+'</button>':"")+
 (enabled("enable_reader_likes")&&!isOwn?'<button type="button" data-like="'+esc(b.id)+'" class="card-love '+(liked?"active":"")+'" aria-label="أعجبني">'+(liked?"♥":"♡")+' <small>'+Number(b.like_count||0)+'</small></button>':"")+'</div>'+
 '<div class="book-info"><span class="book-meta product-type-label">'+esc(productTypes[b.product_type||"book"]||"كتاب أو رواية")+'</span><h3 data-book="'+esc(b.id)+'">'+esc(b.title)+'</h3>'+
 '<div class="book-price-row">'+(enabled("show_book_prices")?'<span class="book-price">'+sar(b.price_sar)+'</span>':'<span class="status muted">السعر مخفي</span>')+'</div>'+
 '<div class="product-kind"><i class="'+(b.format==="physical"?"physical":"digital")+'"></i><span>'+kindLabel+(b.format==="physical"&&b.book_condition?" · "+esc(conditions[b.book_condition]||""):"")+'</span></div>'+
 (enabled("enable_reviews")&&Number(b.review_count)>0?'<div class="book-rating">★ '+Number(b.average_rating||0).toFixed(1)+' · '+Number(b.review_count||0)+' تقييم</div>':'')+
 '<div class="book-bottom">'+(enabled("enable_orders")&&enabled("show_book_prices")&&isPublished&&(b.format!=="physical"||Number(b.stock)>0)?'<button class="card-action" data-add="'+esc(b.id)+'">أضف للسلة</button>':
 '<span class="status muted">'+(b.status!=="published"?"بانتظار النشر":b.format==="physical"&&Number(b.stock)===0?"نفدت النسخ":"غير متاح للشراء")+'</span>')+
 '</div></div></article>';
}
function renderContestHome(){
 let host=document.getElementById("contestHome");if(!host){host=document.createElement("div");host.id="contestHome";$("home").append(host)}
 const contestLimit=Number(state.settings.theme_sections?.contests?.items_limit)||6;const rows=(state.contests||[]).filter(x=>["announced","open"].includes(x.status)).slice(0,contestLimit);
 host.innerHTML=rows.length?'<section class="container section contest-section"><div class="section-title"><div><span class="eyebrow">DEELA COMMUNITY</span><h2>مجتمع ديلا</h2><p>إعلانات المالك، أسئلة القراء واستطلاعاتهم</p></div></div><div class="contest-grid">'+rows.map(c=>{
  const poll=Array.isArray(c.poll_options)&&c.poll_options.length>=2,open=c.status==="open"&&c.question_text,answered=c.my_answer,counts=c.poll_counts||{},total=Object.values(counts).reduce((sum,n)=>sum+Number(n||0),0);
  let interaction="";
  if(open&&poll){
   const results='<div class="community-poll-results">'+c.poll_options.map(option=>{const count=Number(counts[option]||0),percent=total?Math.round(count*100/total):0;return '<div class="community-poll-result '+(answered?.answer===option?"selected":"")+'"><div><span>'+esc(option)+'</span><b>'+percent+'% · '+count+'</b></div><i><span style="width:'+percent+'%"></span></i></div>'}).join("")+'<small>'+total+' تصويت</small></div>';
   const pollForm='<form id="contestAnswerForm" class="contest-answer-form community-poll-form"><input type="hidden" name="contest_id" value="'+esc(c.id)+'"><fieldset><legend>'+(answered?"غيّر خيارك أو أكّد اختيارك":"اختر إجابة واحدة")+'</legend>'+c.poll_options.map((option,k)=>'<label class="community-poll-option"><input type="radio" name="answer" value="'+esc(option)+'" '+(answered?.answer===option?"checked":k===0?"required":"")+'><span>'+esc(option)+'</span></label>').join("")+'</fieldset><button class="btn btn-primary" type="submit">'+(answered?"تحديث تصويتي":"صوّت الآن")+'</button></form>';
   interaction=results+pollForm;
  }else if(open){
   interaction=answered?'<span class="status">وصلت إجابتك'+(answered.is_correct===true?" · إجابة صحيحة":answered.is_correct===false?" · إجابة غير صحيحة":" · بانتظار التصحيح")+'</span>':'<form id="contestAnswerForm" class="contest-answer-form"><input type="hidden" name="contest_id" value="'+esc(c.id)+'"><label class="field">إجابتك<input name="answer" required maxlength="1000"></label><button class="btn btn-primary" type="submit">إرسال الإجابة</button></form>';
  }
  return '<article class="contest-card"><span class="status">'+(open?(poll?"استطلاع مفتوح":"المسابقة بدأت"):"قريبًا")+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.announcement||"")+'</p>'+(c.starts_at?'<small>تبدأ: '+new Date(c.starts_at).toLocaleString("ar-SA",{dateStyle:"medium",timeStyle:"short"})+'</small>':"")+(open?'<h4>'+esc(c.question_text)+'</h4>'+interaction:"")+'</article>';
 }).join("")+'</div></section>':"";addOwnerHomeSettingsGears();
}
async function refreshContests(){
 if(!state.token)return;
 try{
  const d=await api("/contests"),items=d.contests||[];
  if(!state.contestIds.size)state.contestIds=new Set(items.map(x=>x.id));
  else{
   const fresh=items.filter(x=>!state.contestIds.has(x.id));for(const x of items)state.contestIds.add(x.id);
   for(const x of fresh){toast(x.title+" · "+(x.announcement||"مسابقة جديدة"));if("Notification" in window&&Notification.permission==="granted")new Notification(x.title,{body:x.announcement||"مسابقة جديدة في DEELA Books"});}
  }
  state.contests=items;
  if(document.getElementById("contestHome"))renderContestHome();
 }catch{}
}
function startContestPolling(){if(state.contestTimer)clearInterval(state.contestTimer);void refreshContests();state.contestTimer=setInterval(refreshContests,30000);}
function renderHome(){
 const heroText=document.querySelector(".hero-text");if(heroText){let welcome=document.getElementById("ownerWelcome");if(state.me){if(!welcome){welcome=document.createElement("div");welcome.id="ownerWelcome";welcome.className="owner-welcome";heroText.insertBefore(welcome,heroText.querySelector("#heroTitle"))}const wd=state.settings.theme_sections?.welcome||{},person=state.me?.seller?.shop_name||state.me?.display_name||"قارئنا";welcome.innerHTML='<span class="owner-welcome-copy">'+esc((wd.title||"أهلاً بك في DEELA، {name}").replaceAll("{name}",person))+'</span>'+(wd.description?'<small class="owner-welcome-description">'+esc(wd.description)+'</small>':"");welcome.hidden=wd.visible===false;welcome.style.color=/^#[0-9a-f]{6}$/i.test(wd.accent_color||"")?wd.accent_color:"";welcome.dataset.animation=wd.animation||"glow";welcome.style.setProperty("--welcome-scale",String((Number(wd.scale)||100)/100));}else welcome?.remove();}
 const rail=document.getElementById("homeCategories");if(rail){const items=[["روايات","▤","عالم من القصص"],["أدب وشعر","❝","كلمات وأفكار"],["خيال ورعب","✦","خيال وغموض"],["تطوير الذات","◉","معرفة وعمل"],["كتب الأطفال","★","حكايات الصغار"],["تعليم","⌘","تعلم واكتشف"],["ألعاب فيديو","⌁","ألعاب ومغامرة"],["قرطاسية","✎","أدوات الكتابة"],["فنون وحرف","✿","اصنع بيدك"],["قهوة","☕","اختيارات المجتمع"],["موسيقى","♫","إيقاع ومزاج"],["أزياء","◇","ذوقك الخاص"]].slice(0,Number(state.settings.theme_sections?.categories?.items_limit)||12);rail.innerHTML=items.map(x=>'<button class="community-tile" data-category="'+esc(x[0])+'"><span>'+x[1]+'</span><strong>'+esc(x[0])+'</strong><small>'+esc(x[2])+'</small></button>').join("");}
 $("homeListings").innerHTML=state.listings.length?state.listings.slice(0,Number(state.settings.theme_sections?.books?.items_limit)||8).map(card).join(""):demoCovers();
 $("featuredShops").innerHTML=state.shops.length?state.shops.slice(0,Number(state.settings.theme_sections?.shops?.items_limit)||6).map(shopCard).join(""):
 '<div class="empty-state"><h3>هنا تبدأ متاجر ديلا</h3><p>بمجرد اعتماد متجرك الأول، ستظهر هنا متاجر المؤلفين والناشرين الحقيقية.</p><button class="btn btn-outline" data-route="seller">سجّل أول متجر</button></div>';
 renderManagedHome();renderContestHome();applySections(state.settings.theme_sections||{});addOwnerHomeSettingsGears();
}
function openOwnerSectionSettings(id){
 if(!state.me?.is_owner)return;
 const s=(state.sections||[]).find(x=>String(x.id)===String(id));if(!s)return;
 const shade=document.createElement("div"),modal=document.createElement("section"),d=s.design||{};
 shade.className="shade";shade.style.zIndex="120";modal.className="modal owner-inline-modal";modal.style.zIndex="121";
 modal.innerHTML='<button class="close" type="button" aria-label="إغلاق">✕</button><span class="eyebrow">إعدادات هذا القسم فقط</span><h2>'+esc(s.title||"القسم")+'</h2><form id="ownerInlineSectionForm" class="form-grid"><input type="hidden" name="id" value="'+esc(s.id)+'"><label class="field full">اسم القسم<input name="title" maxlength="120" required value="'+esc(s.title||"")+'"></label><label class="field full">وصف القسم<textarea name="description" maxlength="500">'+esc(s.description||"")+'</textarea></label><label class="field">لون الخلفية<input name="background_color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(d.background_color||"")?d.background_color:"#14283a")+'"></label><label class="field">لون التمييز<input name="accent_color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"#79d8ca")+'"></label><label class="field">الخامة<select name="pattern"><option value="none">بدون</option><option value="ceramic">سيراميك</option><option value="linen">كتان</option><option value="stars">نجوم</option></select></label><label class="field">ترتيب القسم<input name="sort_order" type="number" value="'+Number(s.sort_order||0)+'"></label><label class="checkbox-field full"><input name="visible" type="checkbox" '+(s.visible?"checked":"")+'> إظهار القسم للزوار</label><div class="form-actions full"><button class="btn btn-outline" type="button" data-owner-inline-close>إلغاء</button><button class="btn btn-primary" type="submit">حفظ التغييرات</button></div><p class="form-msg full"></p></form>';
 const close=()=>{shade.remove();modal.remove()};shade.onclick=close;modal.querySelector(".close").onclick=close;modal.querySelector("[data-owner-inline-close]").onclick=close;
 modal.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,button=f.querySelector('[type="submit"]');button.disabled=true;const data=Object.fromEntries(new FormData(f));data.visible=f.elements.visible.checked;data.sort_order=Number(data.sort_order||0);data.kind=s.kind||"category";data.category=s.category||"";data.image_path=s.image_path||"";data.design={background_color:data.background_color,accent_color:data.accent_color,pattern:data.pattern};data.material=data.pattern;try{await api("/owner/sections/save",{method:"POST",data});const r=await api("/owner/sections");state.sections=r.sections||r.items||state.sections.map(x=>String(x.id)===String(id)?{...x,...data}:x);renderManagedHome();close();toast("تم تحديث القسم مباشرة");}catch(err){f.querySelector(".form-msg").textContent=errorMessage(err);button.disabled=false}};
 document.body.append(shade,modal);
}
function openOwnerBookActions(id){
 if(!state.me?.is_owner)return;
 const b=state.listings.find(x=>String(x.id)===String(id));if(!b)return;
 const shade=document.createElement("div"),modal=document.createElement("section");shade.className="shade";shade.style.zIndex="120";modal.className="modal owner-inline-modal";modal.style.zIndex="121";
 modal.innerHTML='<button class="close" type="button" aria-label="إغلاق">✕</button><span class="eyebrow">إدارة سريعة داخل المتجر</span><h2>'+esc(b.title)+'</h2><p>الحالة الحالية: '+esc(statusNames[b.status]||b.status)+'</p><div class="owner-book-actions"><button class="btn btn-outline" type="button" data-owner-book-status="published">اعتماد وإظهار</button><button class="btn btn-outline" type="button" data-owner-book-status="archived">إخفاء من المتجر</button><button class="btn btn-primary" type="button" data-owner-book-open>معاينة الكتاب</button></div><p class="form-msg"></p>';
 const close=()=>{shade.remove();modal.remove()};shade.onclick=close;modal.querySelector(".close").onclick=close;
 modal.querySelector('[data-owner-book-open]').onclick=()=>{close();state.current=id;void route("detail")};
 modal.querySelectorAll("[data-owner-book-status]").forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{await api("/owner/listing-status",{method:"POST",data:{id,status:btn.dataset.ownerBookStatus}});await reload();renderHome();toast(btn.dataset.ownerBookStatus==="published"?"تم اعتماد الكتاب وإظهاره":"تم إخفاء الكتاب");close()}catch(e){modal.querySelector(".form-msg").textContent=errorMessage(e);btn.disabled=false}});
 document.body.append(shade,modal);
}
function renderManagedHome(){
 let host=document.getElementById("managedHomeSections");if(!host){host=document.createElement("div");host.id="managedHomeSections";$("home").append(host)}
 const banners=(state.banners||[]).filter(x=>x.image_url),sections=(state.sections||[]).filter(x=>x.visible||state.me?.is_owner);
 host.innerHTML=(banners.length?'<section class="container section"><div class="managed-banner-grid">'+banners.map(b=>'<a class="managed-banner" href="'+(b.target_url?esc(b.target_url):"#home")+'" '+(b.target_url?'target="_blank" rel="noopener noreferrer"':'')+' style="background-image:linear-gradient(90deg,#071326aa,#07132622),url(&quot;'+esc(b.image_url)+'&quot;)"><strong>'+esc(b.title)+'</strong></a>').join("")+'</div></section>':"")+sections.map(s=>{
  const style=(s.image_url?'background-image:linear-gradient(90deg,#071326df,#07132655),url(&quot;'+esc(s.image_url)+'&quot;)':'background-color:'+( /^#[0-9a-f]{6}$/i.test(s.design?.background_color||"")?s.design.background_color:"var(--section-bg, var(--panel))"))+';--section-accent:'+( /^#[0-9a-f]{6}$/i.test(s.design?.accent_color||"")?s.design.accent_color:"var(--teal)");
  const detail=s.kind==="category"?' · '+esc(s.category):"";
  const books=s.kind==="category"?state.listings.filter(b=>b.category===s.category&&b.status==="published").slice(0,4):[];
  return '<section class="container section managed-section '+(s.visible?"":"owner-section-hidden")+'" data-material="'+esc(s.design?.pattern||s.material||"none")+'" data-managed-section="'+esc(s.id)+'" style="'+style+'">'+(state.me?.is_owner?'<button type="button" class="owner-inline-control" data-owner-section-settings="'+esc(s.id)+'" aria-label="إعدادات هذا القسم">⚙ <span>إعدادات القسم</span></button>':"")+'<div class="managed-section-copy"><span class="eyebrow">DEELA BOOKS</span><h2>'+esc(s.title)+detail+'</h2><p>'+esc(s.description||"")+(s.visible?"":" · مخفي للزوار") +'</p>'+(s.kind==="category"?'<button class="btn btn-outline" data-category="'+esc(s.category)+'">استكشف القسم ←</button>':"")+'</div>'+(books.length?'<div class="books-grid managed-section-books">'+books.map(card).join("")+'</div>':"")+'</section>';
 }).join("");
}
function shopCard(s){
 const following=state.me?.following?.includes(s.id),own=state.me?.seller?.id===s.id;
 const profile=s.member_profile,features=profile?.features||[],packageKey=s.seller_package||"free",packageBadge=packageKey!=="free"?'<span class="seller-package-badge seller-package-'+packageKey+'">'+(packageKey==="pro"?"Pro":"Plus")+'</span>':"",avatar=features.includes("profile_avatar")&&profile?.avatar_url?'<img src="'+esc(profile.avatar_url)+'" alt="">':s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="">':esc((s.shop_name||"D").slice(0,1));
 const tierClass=profile?.plan==="year"?"member-store-year":profile?.plan==="half_year"?"member-store-half-year":profile?.plan==="month"?"member-store-month":"";
 return '<article class="shop-card '+tierClass+" "+(features.includes("profile_glow")?"member-glow":"")+' '+(features.includes("profile_theme")?"member-theme-"+(profile?.appearance?.profile_theme||"ocean"):"")+'"><span class="shop-avatar '+(features.includes("avatar_frame")?"premium-avatar-frame premium-avatar-frame-"+(profile?.appearance?.avatar_frame||"aurora"):"")+'">'+avatar+'</span>'+
 '<div class="shop-copy"><span class="shop-kicker">متجر مستقل '+packageBadge+'</span><h3>'+esc(s.shop_name)+(features.includes("verified_badge")?'<span class="verified-badge" title="عضوية مميزة">✓</span>':"")+(s.premium_test_active?'<span class="premium-test-badge">✦ عضوية تجريبية</span>':"")+'</h3><p class="'+(features.includes("display_name_style")?"member-name-style":"")+'">'+esc(profile?.appearance?.display_name||s.city||"متجر كتب مستقل")+'</p><div class="shop-meta-grid"><span>★ '+(Number(s.rating_count)?Number(s.rating||0).toFixed(1):"جديد")+(Number(s.rating_count)?" · "+Number(s.rating_count)+" تقييم":"")+'</span><span>▤ '+Number(s.product_count||0)+' كتاب</span>'+(enabled("enable_author_follows")?'<span>♧ '+Number(s.follower_count||0)+' متابع</span>':"")+'</div></div>'+
 '<div class="shop-actions"><button type="button" class="shop-visit" data-shop="'+esc(s.slug)+'">تصفح المتجر <span aria-hidden="true">←</span></button>'+
 (enabled("enable_author_follows")&&!own?'<button type="button" class="shop-follow '+(following?"following":"")+'" data-follow="'+esc(s.id)+'">'+(following?"✓ تتابعه":"＋ متابعة")+'</button>':own?'<span class="status own-store-label">متجرك</span>':"")+'</div></article>';
}
function heading(title,desc="",label="DEELA BOOKS"){
 return '<div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › '+esc(title)+'</div>'+
 '<div class="page-heading"><div>'+(label?'<span class="eyebrow">'+esc(label)+'</span>':"")+'<h1>'+esc(title)+'</h1><p>'+esc(desc)+'</p></div></div>';
}
function listingGrid(items,showSamples=false){
 return '<div class="books-grid books-rail" dir="rtl">'+(items.length?items.map(card).join(""):showSamples?demoCovers():
 '<div class="empty-state"><h3>ما فيه كتب مطابقة حاليًا</h3><p>تظهر الكتب فور نشرها في مساحة الاختبار الخاصة.</p><button class="btn btn-outline" data-route="seller">أضف أول كتاب</button></div>')+'</div>';
}
function useDeviceLocation(nearby){
 if(!navigator.geolocation)return toast("خدمة تحديد الموقع غير متاحة في هذا المتصفح");
 navigator.geolocation.getCurrentPosition(pos=>{
  state.userCoords={lat:pos.coords.latitude,lng:pos.coords.longitude};
  state.nearbyOnly=nearby;state.sort="nearest";
  route("catalog",false);toast(nearby?"عُرضت النتائج ضمن النطاق القريب منك":"رُتبت الكتب حسب قربها من موقعك");
 },()=>toast("تعذر تحديد موقعك. اسمح للموقع من المتصفح ثم حاول مرة أخرى."),{enableHighAccuracy:true,timeout:20000,maximumAge:60000});
}
function distanceKm(lat1,lon1,lat2,lon2){
 if(![lat1,lon1,lat2,lon2].every(Number.isFinite))return null;
 const rad=n=>n*Math.PI/180,dl=rad(lat2-lat1),dn=rad(lon2-lon1),a=Math.sin(dl/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dn/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function catalogPage(){
 let books=state.listings.filter(b=>{
  const category=state.category==="الكل"||b.category===state.category;
  const productType=state.productType==="all"||(b.product_type||"book")===state.productType;
  const format=state.format==="all"||b.format===state.format;
  const query=!state.search||[b.title,b.author,b.description,b.category,b.deela_books_sellers?.shop_name,...(b.tags||[])].some(t=>String(t||"").toLocaleLowerCase().includes(state.search));
  const condition=state.condition==="all"||b.book_condition===state.condition;
  const discount=!state.discountOnly||(Number(b.compare_at_sar)>Number(b.price_sar));
  const cityName=String(b.city||b.deela_books_sellers?.city||"").trim();
  const city=!state.cityFilter||(cityName&&(cityName===state.cityFilter||cityName.includes(state.cityFilter)||state.cityFilter.includes(cityName)));
  const seller=b.deela_books_sellers||{},hasCoords=seller.latitude!==null&&seller.latitude!==undefined&&seller.longitude!==null&&seller.longitude!==undefined;
  const distance=state.userCoords&&hasCoords?distanceKm(state.userCoords.lat,state.userCoords.lng,Number(seller.latitude),Number(seller.longitude)):null;
  const nearby=!state.nearbyOnly||(distance!==null&&distance<=state.radiusKm);
  return category&&productType&&format&&query&&condition&&discount&&city&&nearby;
 });
 const sorters={
  newest:(a,b)=>new Date(b.created_at)-new Date(a.created_at),
  popular:(a,b)=>Number(b.like_count||0)-Number(a.like_count||0),
  rated:(a,b)=>Number(b.average_rating||0)-Number(a.average_rating||0),
  price_low:(a,b)=>Number(a.price_sar)-Number(b.price_sar),
  price_high:(a,b)=>Number(b.price_sar)-Number(a.price_sar),
  bestselling:(a,b)=>Number(b.sales_count||0)-Number(a.sales_count||0),
  nearest:(a,b)=>{const distance=s=>s.latitude==null||s.longitude==null?Infinity:(distanceKm(state.userCoords?.lat,state.userCoords?.lng,Number(s.latitude),Number(s.longitude))??Infinity);return distance(a.deela_books_sellers||{})-distance(b.deela_books_sellers||{})}
 };
 books=books.sort(sorters[state.priceOrder]||sorters[state.sort]||sorters.newest);
 return heading("مكتبة ديلا","اختر كتابًا يناسب ذوقك من الكتب الحقيقية المعتمدة.","EXPLORE OUR BOOKS")+
 '<div class="filters">'+categoryOptions().map(c=>'<button class="filter '+(state.category===c?"active":"")+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("")+'</div>'+
 '<div class="catalog-toolbar"><p>عدد المنتجات: '+books.length+' '+(state.me?.is_owner?"(تظهر كتب المراجعة للمالك فقط)":"")+'</p>'+
 '<div class="catalog-discovery-tools"><button type="button" class="btn '+(state.nearbyOnly?"btn-primary":"btn-outline")+'" data-nearby>'+ (state.nearbyOnly?"قريب منك · إيقاف":"بالقرب مني")+'</button><select id="nearbyRadius" aria-label="نطاق البحث"><option value="5">5 كم</option><option value="10">10 كم</option><option value="25">25 كم</option><option value="50">50 كم</option><option value="100">100 كم</option></select></div><div class="filter-selects"><select id="productTypeFilter" aria-label="تصفية نوع المنتج"><option value="all">كل الأقسام</option>'+Object.entries(productTypes).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join("")+'</select><select id="formatFilter" aria-label="تصفية نوع الكتاب"><option value="all">جميع الأنواع</option><option value="physical">ورقي</option><option value="ebook">رقمي</option><option value="audiobook">صوتي</option></select>'+
 '<select id="sortFilter" aria-label="ترتيب الكتب"><option value="newest">الأحدث</option><option value="nearest">الأقرب لموقعي</option><option value="popular">الأكثر إعجابًا</option><option value="bestselling">الأكثر مبيعًا</option><option value="rated">الأعلى تقييمًا</option></select><select id="priceSortFilter" aria-label="ترتيب السعر"><option value="">ترتيب السعر</option><option value="price_low">السعر من الأقل إلى الأعلى</option><option value="price_high">السعر من الأعلى إلى الأقل</option></select><select id="conditionFilter" aria-label="حالة الكتاب"><option value="all">كل الحالات</option><option value="new">جديد</option><option value="like_new">شبه جديد</option><option value="good">جيد</option><option value="acceptable">مقبول</option></select><select id="cityFilter" aria-label="المدينة"><option value="">كل المدن السعودية</option>'+SAUDI_CITIES.map(c=>'<option value="'+esc(c)+'" '+(state.cityFilter===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select><label class="filter-check"><input id="discountFilter" type="checkbox" '+(state.discountOnly?"checked":"")+ '> خصومات</label></div></div>'+
 listingGrid(books,!state.listings.length)+(state.catalogHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-catalog>عرض المزيد من الكتب</button></div>':"");
}
function memberReviewCard(r){
 const plan=r.member_plan||"",tierClass=plan==="year"?"member-store-year":plan==="half_year"?"member-store-half-year":plan==="month"?"member-store-month":"";
 const tierLabel=plan==="year"?"عضو سنوي":plan==="half_year"?"عضو نصف سنوي":plan==="month"?"عضو شهري":"";
 return '<article class="reader-review member-review-card '+tierClass+(tierClass?' paid-review':'')+'"><div class="member-review-top"><span class="rating-chip member-rating-stars">'+("★".repeat(r.rating))+'</span>'+(tierLabel?'<span class="member-review-badge '+tierClass+'">✦ '+tierLabel+'</span>':'')+'</div><small>'+esc(r.actor_name||"قارئ")+' · '+date(r.created_at)+'</small><p>'+esc(r.body)+'</p></article>';
}
function detailPage(){
 const b=state.listings.find(x=>x.id===state.current);
 if(!b){applyPublicStorePageTheme("");return heading("الكتاب غير موجود","ربما حُذف أو لم يُعتمد بعد.")+'<button class="btn btn-primary" data-route="catalog">العودة للمكتبة</button>';}
 const pool=(state.listings||[]).filter(x=>x&&x.id!==b.id&&x.status==="published");
 const matching=pool.filter(x=>(x.product_type||"book")===(b.product_type||"book"));
 const related=(matching.length?matching:pool).slice(0,4);
 const available=b.status==="published"&&(b.format!=="physical"||(Number(b.stock)>0&&b.pickup_available===true));
 const sellerProfile=b.deela_books_sellers?.member_profile,memberTier=sellerProfile?.plan||"",memberTierClass=memberTier==="year"?"member-store-year":memberTier==="half_year"?"member-store-half-year":memberTier==="month"?"member-store-month":"";
 applyPublicStorePageTheme(memberTier);
 const tierLabel=memberTier==="year"?"إصدار سنوي مميز":memberTier==="half_year"?"إصدار نصف سنوي مميز":memberTier==="month"?"إصدار شهري مميز":"";
 return '<div class="member-book-page '+memberTierClass+'"><div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › <a href="#catalog" data-route="catalog">الكتب</a> › '+esc(b.title)+'</div>'+
 '<div class="detail-grid"><div class="detail-cover">'+productGallery(b)+'</div>'+
 '<div class="detail-desc"><h1>'+esc(b.title)+'</h1>'+
 (b.subtitle?'<p class="book-subtitle">'+esc(b.subtitle)+'</p>':"")+
 '<p>تأليف '+esc(b.author||"مؤلف مستقل")+' · <button class="text-button" data-shop="'+esc(b.deela_books_sellers?.slug||"")+'">'+esc(b.deela_books_sellers?.shop_name||"متجر ديلا")+'</button></p>'+
 '<div class="community-strip detail-community">'+
 (enabled("enable_reviews")?'<span class="rating-chip">★ '+(Number(b.review_count)>0?Number(b.average_rating||0).toFixed(1):"بلا تقييم")+' · '+Number(b.review_count||0)+' مراجعة</span>':"")+
 '<span class="rating-chip">♥ '+Number(b.like_count||0)+' إعجاب</span><span class="rating-chip">◉ '+Number(b.view_count||0)+' مشاهدة</span></div>'+
 (enabled("show_book_prices")?'<strong class="detail-price">'+sar(b.price_sar)+'</strong>':'<span class="status muted">الأسعار مخفية من لوحة المالك</span>')+
 (enabled("enable_discounts")&&enabled("show_book_prices")&&b.compare_at_sar&&Number(b.compare_at_sar)>Number(b.price_sar)?
 '<div class="compare-price">قبل الخصم <s>'+sar(b.compare_at_sar)+'</s></div>':"")+
 '<div class="detail-spec">'+
 '<div><small>نوع المنتج</small><strong>'+esc(productTypes[b.product_type||"book"]||"كتاب أو رواية")+'</strong></div>'+
 '<div><small>الشكل</small><strong>'+esc(kinds[b.format])+'</strong></div>'+
 '<div><small>الحالة</small><strong>'+esc(conditions[b.book_condition])+'</strong></div>'+
 '<div><small>اللغة</small><strong>'+esc(b.language||"العربية")+'</strong></div>'+
 '<div><small>الكمية المتاحة</small><strong>'+b.stock+'</strong></div>'+
 '<div><small>المدينة</small><strong>'+esc(b.city||"—")+'</strong></div>'+
 '<div><small>عدد الصفحات</small><strong>'+(b.page_count||"غير محدد")+'</strong></div>'+
 '<div><small>الفئة العمرية</small><strong>'+esc(b.audience||"عام")+'</strong></div>'+
 (b.publication_year?'<div><small>سنة النشر</small><strong>'+Number(b.publication_year)+'</strong></div>':"")+
 '</div>'+
 '<div class="detail-buttons">'+(available&&enabled("enable_orders")&&enabled("show_book_prices")?'<button class="btn btn-primary" data-add="'+esc(b.id)+'">أضف للسلة ♧</button>':'<span class="status muted">'+(b.status!=="published"?"بانتظار النشر":b.format==="physical"&&Number(b.stock)===0?"نفدت النسخ":"غير متاح للشراء")+'</span>')+
 (enabled("enable_reader_likes")&&state.me?.seller?.id!==b.seller_id?'<button class="btn btn-outline '+(memberTierClass?"member-like-action ":"")+(state.me?.likes?.includes(b.id)?"liked":"")+'" data-like="'+esc(b.id)+'">'+(state.me?.likes?.includes(b.id)?"♥ إلغاء الإعجاب":"♡ أعجبني")+'</button>':"")+
 (enabled("enable_favorites")?'<button class="btn btn-outline" data-favorite="'+esc(b.id)+'">'+(state.me?.favorites?.includes(b.id)?"♥ محفوظ في المفضلة":"◇ حفظ للمفضلة")+'</button>':"")+
 (enabled("enable_messages")?'<button class="btn btn-outline" data-ask="'+esc(b.id)+'">راسل البائع ✉</button>':"")+
 '<button class="btn btn-outline" data-report="'+esc(b.id)+'">إبلاغ</button>'+
 (state.me?.is_owner&&b.format!=="physical"?'<button class="btn btn-soft" data-reader="'+esc(b.id)+'">معاينة محتوى الكتاب للمالك</button><button class="btn danger" data-owner-archive="'+esc(b.id)+'">حذف / إخفاء الكتاب</button>':"")+
 '</div><p style="margin-top:16px;font-size:11px">التصفح متاح داخل الموقع. الشحن والدفع الإلكتروني غير متاحين حاليًا.</p></div></div>'+
 '<div class="detail-story"><h2>ملخص الرواية ومضمونها</h2><p>'+esc(b.description||"لم يضف البائع وصفًا بعد.")+'</p></div>'+
 (b.content_warning?'<div class="content-warning"><strong>تنبيه المحتوى</strong><p>'+esc(b.content_warning)+'</p></div>':"")+
 (b.preview_excerpt?'<div class="detail-story"><h2>اقرأ مقتطفًا</h2><p>'+esc(b.preview_excerpt)+'</p></div>':"")+
 (b.likes?.length?'<div class="detail-story book-likers"><h2>من أعجب بهذا الكتاب</h2><div class="activity-people">'+b.likes.slice(0,30).map(x=>'<span class="activity-person">♥ '+esc(x.actor_name)+'</span>').join("")+'</div></div>':"")+
 
 (enabled("enable_reviews")?'<div class="detail-story member-reviews-panel"><div class="member-section-heading"><h2>التعليقات والتقييمات</h2>'+(tierLabel?'<span class="member-tier-pill">✦ '+tierLabel+'</span>':"")+'</div>'+
 (b.reviews?.length?b.reviews.map(memberReviewCard).join("")+
 '<p>كل تعليق وتقييم مرتبط بهذا الكتاب ويظهر هنا.</p>':
 '<p>لا توجد تعليقات أو تقييمات بعد. اكتب أول رأي عن هذا الكتاب.</p>')+'</div>':"")+
 (enabled("enable_reviews")?'<form id="reviewForm" class="panel book-review-form member-review-form"><h2>أضف تعليقك وتقييمك</h2><input type="hidden" name="listing_id" value="'+esc(b.id)+'"><label class="field">التقييم<select name="rating" required><option value="">اختر عدد النجوم</option><option value="5">★★★★★ ممتاز</option><option value="4">★★★★ جيد جدًا</option><option value="3">★★★ جيد</option><option value="2">★★ مقبول</option><option value="1">★ لم يعجبني</option></select></label><label class="field full">تعليقك<textarea name="body" required maxlength="1000" placeholder="اكتب رأيك في هذه الرواية"></textarea></label><button class="btn btn-primary" type="submit">إرسال التقييم والتعليق</button><p class="muted">سيظهر تعليقك مباشرة في وضع الاختبار الخاص.</p></form>':"")+
+
 '<div class="detail-story"><h2>حقوق النشر</h2><p>يؤكد الناشر ملكيته للحقوق. النشر الفوري متاح داخل مساحة الاختبار الخاصة، وتبقى مخفية عن العامة.</p></div>'+
 (related.length?'<section class="detail-related"><div class="section-title"><div><span class="eyebrow">MORE TO DISCOVER</span><h2>قد يعجبك أيضًا</h2><p>كتب قريبة من هذا الاختيار.</p></div></div><div class="books-grid">'+related.map(card).join("")+'</div></section>':"")+'</div>';
}
function shopsPage(){
 return heading("متاجر المؤلفين والناشرين","تصفح متاجر الكتب والمكتبات المستقلة في مجتمع ديلا","OUR SELLERS")+
 '<div class="shops-grid">'+(state.shops.length?state.shops.map(shopCard).join(""):
 '<div class="empty-state"><h3>افتتح أول متجر!</h3><p>تبدأ أسماء المتاجر الحقيقية بالظهور بعد تقديم الطلبات واعتمادها.</p><button class="btn btn-primary" data-route="seller">افتح متجرك</button></div>')+'</div>'+(state.shopsHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-shops>عرض المزيد من المتاجر</button></div>':"");
}
function applyPublicStorePageTheme(plan){const tiers=["month","half_year","year"];document.body.classList.remove(...tiers.map(x=>"member-public-store-"+x));if(tiers.includes(plan))document.body.classList.add("member-public-store-"+plan)}
function shopPage(){
 const s=state.shops.find(x=>x.slug===state.current);
 if(!s){applyPublicStorePageTheme("");return heading("المتجر غير موجود","قد يكون قيد المراجعة");}
 const profile=s.member_profile,features=profile?.features||[],tier=profile?.plan||"";
 applyPublicStorePageTheme(tier);
 const tierClass=tier==="year"?"member-store-year":tier==="half_year"?"member-store-half-year":tier==="month"?"member-store-month":"";
 const tierLabel=tier==="year"?"العضوية السنوية":tier==="half_year"?"عضوية نصف السنة":tier==="month"?"عضوية الشهر":"";
 const memberAppearance=profile?.appearance||{};
 const avatar=features.includes("profile_avatar")&&profile?.avatar_url?'<img src="'+esc(profile.avatar_url)+'" alt="">':s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="">':esc((s.shop_name||"D").slice(0,1));
 const membershipRibbon=tierLabel?'<div class="member-tier-ribbon member-tier-ribbon-'+tier+'"><span>✦ '+tierLabel+'</span></div>':"";
 return '<div class="member-store-stage '+tierClass+'">'+
 '<div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › '+esc(s.shop_name)+'</div>'+membershipRibbon+
 '<div class="page-heading"><div><h1>'+esc(s.shop_name)+'</h1><p>'+esc(s.bio||"متجر كتب مستقل")+'</p></div></div>'+
 '<div class="panel shop-profile member-profile-tier-'+(tier||"free")+' '+(features.includes("profile_glow")?"member-glow":"")+' '+(features.includes("profile_theme")?"member-theme-"+(memberAppearance.profile_theme||"ocean"):"")+'>'+
 '<div class="shop-identity-row"><span class="shop-avatar '+(features.includes("avatar_frame")?"premium-avatar-frame premium-avatar-frame-"+(memberAppearance.avatar_frame||"aurora"):"")+'">'+avatar+'</span><div class="member-shop-identity"><h2 class="'+(features.includes("display_name_style")?"member-name-style":"")+'">'+esc(memberAppearance.display_name||s.shop_name)+(features.includes("verified_badge")?'<span class="verified-badge member-verified-gold" title="عضوية مميزة موثقة">✓</span>':"")+'</h2><p>'+esc(s.city||"كاتب في مجتمع ديلا")+'</p></div></div>'+
 (enabled("enable_author_follows")?'<div class="toolbar member-profile-actions"><span class="status">'+Number(s.follower_count||0)+' متابع</span>'+
 (state.me?.seller?.id===s.id?'<span class="status own-store-label">هذا متجرك</span>':'<button class="btn btn-soft" data-follow="'+esc(s.id)+'">'+(state.me?.following?.includes(s.id)?"إلغاء متابعة المتجر":"متابعة المؤلف والمتجر +")+'</button>')+'</div>':"")+'</div>'+
 listingGrid(state.shopListings.filter(b=>b.deela_books_sellers?.slug===s.slug))+(state.shopBooksHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-shop-books>عرض المزيد من كتب المتجر</button></div>':"")+'</div>';
}
function favoritesPage(){
 if(!enabled("enable_favorites"))return heading("المفضلة معطلة حاليًا","يمكن للمالك إعادة تشغيلها.");
 const ids=state.me?.favorites||[];
 return heading("قائمة المفضلة","كل الكتب التي حفظتها لتعود إليها لاحقًا.","MY WISHLIST")+
 listingGrid(state.listings.filter(b=>ids.includes(b.id)));
}
function cartPage(){
 if(!enabled("enable_orders")||!enabled("show_book_prices"))return heading("السلة مغلقة مؤقتًا","قام المالك بإيقاف استقبال الطلبات أو إخفاء الأسعار.");
 const items=state.cart.map(x=>({b:state.listings.find(b=>b.id===x.id),qty:x.qty})).filter(x=>x.b);
 const subtotal=items.reduce((n,x)=>n+(Number(x.b.price_sar)||0)*x.qty,0);
 const discount=state.couponCode==="FIRST20"?Math.round(subtotal*0.2*100)/100:0;
 const email=state.me?.email||"",profileName=state.me?.display_name||email.split("@")[0]||(state.me?.phone?"قارئ ديلا":""),phone=state.me?.phone||"";
 const paymentChoices=[["mada","مدى","بطاقات مدى"],["apple_pay","Apple Pay","للأجهزة والمتصفحات المدعومة"],["visa","Visa","بطاقة ائتمانية أو خصم"],["stc_pay","STC Pay","محفظة STC Pay"],["tabby","تابي","اشتر الآن وادفع لاحقًا"],["tamara","تمارا","قسّط مشترياتك"]];
 return heading("إتمام الطلب","بيانات حسابك جاهزة. هذا طلب اختبار بلا تحصيل، والدفع الحقيقي غير مفعّل.","YOUR ORDER")+
 (items.length?'<div class="panel checkout-items"><h2>سلتك · '+items.length+' منتج</h2>'+items.map(x=>'<div class="cart-line"><div><strong>'+esc(x.b.title)+'</strong><p>'+esc(kinds[x.b.format])+' · '+sar(x.b.price_sar)+'</p>'+(x.b.format==="physical"?'<span class="status">استلام محلي فقط</span>':'<span class="status">يفتح تلقائيًا بعد إتمام الاختبار</span>')+'</div><div><strong>'+sar(Number(x.b.price_sar)*x.qty)+'</strong><div><button data-cart-minus="'+esc(x.b.id)+'">−</button> '+x.qty+' <button data-cart-plus="'+esc(x.b.id)+'">+</button> <button data-cart-remove="'+esc(x.b.id)+'">حذف</button></div></div></div>').join("")+
 '<div class="coupon-box"><label for="couponCode">رمز الخصم</label><div><input id="couponCode" value="'+esc(state.couponCode)+'" placeholder="اكتب FIRST20"><button type="button" class="btn btn-soft" data-coupon-apply>تطبيق</button></div>'+(discount?'<small class="status">FIRST20 · خصم 20% (-'+sar(discount)+')</small>':'<small>جرّب الرمز FIRST20 في مساحة الاختبار.</small>')+'</div><div class="checkout-summary"><div><span>المنتجات</span><strong>'+sar(subtotal)+'</strong></div>'+(discount?'<div><span>الخصم</span><strong>− '+sar(discount)+'</strong></div>':'')+'<div class="checkout-grand"><span>الإجمالي التقديري</span><strong>'+sar(subtotal-discount)+'</strong></div></div>'+
 '<p class="test-mode-note">تجربة فقط: لا يوجد تحصيل أو بوابة دفع. بعد إتمام الطلب يفتح الكتاب الرقمي تلقائيًا في مكتبتك.</p></div>'+
 '<form id="checkoutForm" class="panel"><h2>بيانات المشتري</h2><p class="muted">معبأة تلقائيًا من حسابك ويمكن تحديث الاسم والجوال قبل الإتمام.</p><div class="form-grid">'+
 (email?'<label class="field">البريد الإلكتروني<input type="email" value="'+esc(email)+'" readonly autocomplete="email"></label>':'')+
 field("اسم العميل","buyer_name","text",true,"",profileName)+field("رقم الجوال","buyer_phone","tel",false,"",phone)+'<input type="hidden" name="buyer_country" value="السعودية"><input type="hidden" name="buyer_city" value=""><label class="field full">ملاحظات الطلب<textarea name="note" placeholder="اختياري"></textarea></label></div>'+
 '<section class="payment-choice-panel"><h2>اختر طريقة الدفع</h2><p class="muted">هذه محاكاة للاختبار فقط؛ لا تُخصم أموال ولا تتصل ببوابة الدفع الآن.</p><div class="payment-method-grid">'+paymentChoices.map(([value,title,detail],i)=>'<label class="payment-method-card"><input type="radio" name="test_payment_method" value="'+value+'" '+(i===0?"checked":"")+' required><span class="payment-method-copy"><strong>'+title+'</strong><small>'+detail+'</small></span><span class="payment-method-test">اختبار</span></label>').join("")+'</div><p class="test-mode-note">بعد إتمام الاختبار يُفتح الكتاب الرقمي تلقائيًا. Mastercard غير مدعومة في خيارات ديلا.</p></section>'+
 '<div class="form-actions"><button class="btn btn-primary wide" type="submit">إتمام الشراء التجريبي وفتح الكتاب ←</button></div><p class="form-msg" id="checkoutMessage"></p></form>':
 '<div class="empty-state"><h3>سلتك فارغة</h3><p>تصفح المكتبة وأضف الكتب التي تريدها.</p><button class="btn btn-primary" data-route="catalog">تصفح الكتب</button></div>');
}
function ordersPage(){
 const orders=state.orders||[];
 const lineStatus={pending:"بانتظار البائع",accepted:"قبله البائع",rejected:"تعذر القبول",preparing:"قيد التجهيز",shipped:"تمت المعالجة",delivered:"تم",cancelled:"ملغي"};
 return heading("طلباتي","تابع طلباتك وافتح كتبك الرقمية بعد طلب الاختبار.","MY PURCHASES")+
 '<div class="list-rows">'+(orders.length?orders.map(o=>'<article class="row-card"><div class="row-top"><div><h3>'+esc(o.code)+'</h3><p>'+date(o.created_at)+'</p></div><span class="status">'+esc(statusNames[o.status]||o.status)+'</span></div><p>الإجمالي: '+sar(o.total_sar)+'</p>'+(o.is_test?'<p class="test-mode-note">طلب اختبار خاص — لم يتم خصم مبلغ حقيقي.</p>':"")+(o.deela_books_order_items||[]).map(x=>'<div class="cart-line"><div><strong>'+esc(x.title_snapshot)+'</strong><p>الكمية: '+x.quantity+' · '+esc(kinds[x.format_snapshot]||"كتاب")+' · '+esc(lineStatus[x.seller_status]||"قيد المعالجة")+'</p></div><div>'+(["paid","preparing","shipped","delivered"].includes(o.status)&&x.format_snapshot!=="physical"?'<button data-reader="'+esc(x.listing_id)+'">افتح الكتاب</button> <button data-download="'+esc(x.listing_id)+'">تحميل نسخة</button>':"")+(enabled("enable_reviews")&&o.status==="delivered"?'<button data-review="'+esc(x.listing_id)+'">قيّم كتابك</button>':"")+'</div></div>').join("")+(o.owner_note?'<p>ملاحظة الإدارة: '+esc(o.owner_note)+'</p>':"")+'<div class="order-support-status">'+(o.support_status&&o.support_status!=="none"?'<p>الدعم: '+esc(({open:"مفتوح",investigating:"قيد المتابعة",resolved:"تم الحل",rejected:"مرفوض"}[o.support_status])||o.support_status)+(o.support_resolution?" · "+esc(o.support_resolution):"")+'</p>':"")+(["open","investigating"].includes(o.support_status)?'<span class="status muted">لديك طلب مساعدة قيد المتابعة</span>':'<button class="btn btn-outline" data-order-support="'+esc(o.id)+'">مساعدة بخصوص الطلب</button>')+'</div></article>').join(""):'<p class="empty-state">لا توجد طلبات بعد.</p>')+'</div>';
}
function sellerActivityPanel(){
 const rows=state.sellerActivity||[];
 return '<section class="panel seller-activity"><h2>تفاعل القراء على منشوراتك</h2><p>هذا القسم مستقل عن الإشعارات، ويعرض الإعجابات والتعليقات المرتبطة بكل رواية.</p><div class="list-rows">'+
 (rows.length?rows.map(item=>'<details class="activity-book"><summary><strong>'+esc(item.listing?.title||"رواية")+'</strong><span>♥ '+(item.likes||[]).length+' · 💬 '+(item.comments||[]).length+'</span></summary>'+
 '<h4>الإعجابات</h4><div class="activity-people">'+((item.likes||[]).length?item.likes.map(x=>'<span class="activity-person">♥ '+esc(x.actor_name)+' · '+date(x.created_at)+'</span>').join(""):'<small>لا توجد إعجابات بعد.</small>')+'</div>'+
 '<h4>التعليقات والتقييمات</h4><div class="activity-people">'+((item.comments||[]).length?item.comments.map(x=>'<article class="activity-comment"><strong>'+esc(x.actor_name)+' · '+("★".repeat(x.rating||0))+'</strong><p>'+esc(x.body)+'</p><small>'+date(x.created_at)+(x.is_test?' · اختبار خاص':'')+'</small></article>').join(""):'<small>لا توجد تعليقات بعد.</small>')+'</div></details>').join(""):'<p>ستظهر تفاعلات القراء هنا بعد أن يتفاعلوا مع كتبك.</p>')+'</div></section>';
}
function accountLogoutPanel(){
 return '<section class="panel account-logout-panel"><button type="button" class="btn danger account-logout" data-logout>تسجيل الخروج</button></section>';
}
function accountPage(){
 if(state.me?.seller)return sellerPage();
 const label=state.me?.email||state.me?.phone||"حساب DEELA Books";
 return heading("حسابي","إدارة حسابك، تصفح المكتبة، وافتح صفحة الكاتب عند رغبتك.","MY ACCOUNT")+
 '<section class="seller-profile-card"><div class="seller-avatar">'+esc((label||"D").slice(0,1))+'</div><div><h2>حسابي</h2><p>'+esc(label)+'</p></div><span class="status">حساب موثق بالبريد</span></section>'+
 '<div class="profile-actions">'+(state.me?.is_owner?'<button class="btn btn-primary" data-route="owner">لوحة الإدارة</button>':'<button class="btn btn-primary" data-route="seller">افتح حساب الكاتب</button>')+
 '<button class="btn btn-outline" data-route="notifications">الإشعارات</button></div>'+accountLogoutPanel();
}
function notificationsPage(){
 const rows=state.sellerNotifications||[];
 return heading("الإشعارات","تصل هنا إشعارات المتابعة والإعجابات والرسائل والمسابقات.","DEELA NOTIFICATIONS")+
 '<section class="panel"><div class="row-top"><div><h2>مركز التنبيهات</h2><p>تبقى التنبيهات محفوظة في حسابك. فعّل إشعارات المتصفح لتظهر أثناء فتح الموقع.</p></div>'+
 ('Notification' in window?(Notification.permission==="granted"?'<span class="status">إشعارات المتصفح مفعّلة</span>':'<button class="btn btn-primary" data-enable-seller-notifications>تفعيل إشعارات المتصفح</button>'):"")+'</div>'+
 '<div class="list-rows">'+(rows.length?rows.map(n=>'<article class="row-card '+(n.read_at?"":"notification-unread")+'"><div class="row-top"><strong>'+esc(n.title)+'</strong><small>'+date(n.created_at)+'</small></div>'+(n.actor_name?'<small class="notification-actor">من: '+esc(n.actor_name)+'</small>':"")+'<p>'+esc(n.body)+'</p>'+(n.read_at?'<span class="status muted">مقروء</span>':'<button class="btn btn-outline" data-notification-read="'+esc(n.id)+'">تعليم كمقروء</button>')+'</article>').join(""):'<div class="empty-state"><h3>لا توجد إشعارات حتى الآن</h3><p>جرّب المتابعة أو الإعجاب بكتاب من حساب آخر.</p></div>')+'</div>'+
 (rows.some(n=>!n.read_at)?'<button class="btn btn-outline" data-notifications-read-all>تعليم الكل كمقروء</button>':"")+'</section>';
}
function messagesPage(messages=[]){
 if(!enabled("enable_messages"))return heading("الرسائل متوقفة حاليًا","يمكن للمالك إعادة تشغيلها.");
 return heading("الرسائل","تواصل مع البائعين بشأن الكتب وتابع ردودهم هنا.","COMMUNITY MESSAGES")+
 '<div class="list-rows">'+(messages.length?messages.map(m=>'<article class="row-card"><p>'+esc(m.body)+'</p><small>'+
 date(m.created_at)+' · '+(m.sender_id===state.me?.id?"مرسلة":"واردة")+'</small>'+
 (m.recipient_id===state.me?.id?'<div class="toolbar"><button class="btn btn-outline" data-reply="'+esc(m.id)+'">رد على الرسالة</button></div>':"")+
 '</article>').join(""):
 '<div class="empty-state"><h3>لا توجد محادثات</h3><p>ادخل صفحة أي كتاب واضغط «راسل البائع» لبدء التواصل.</p></div>')+'</div>';
}
function field(label,name,type="text",required=false,placeholder="",value=""){
 return '<label class="field">'+esc(label)+'<input name="'+esc(name)+'" type="'+type+'" '+
 (required?"required":"")+' placeholder="'+esc(placeholder)+'" value="'+esc(value??"")+'"></label>';
}
const SELLER_PACKAGE_FEATURES=[
 ["ظهور متجرك ومنتجاتك في نتائج DEELA",true,true,true],
 ["أولوية ترتيب أعلى حسب الباقة",false,true,true],
 ["شارة Plus أو Pro على المتجر والمنتجات",false,true,true],
 ["إحصاءات الطلبات داخل لوحة البائع",false,true,true],
 ["خصم 20% على الترويج داخل الموقع",false,true,true],
 ["خصم 50% على الترويج داخل الموقع",false,false,true]
];
const SELLER_PACKAGE_PRICES={plus:{month:69,quarter:186,half_year:352,year:662},pro:{month:199,quarter:537,half_year:1015,year:1910}};
const PACKAGE_TERMS={month:["شهر",0],quarter:["3 أشهر","10%"],half_year:["6 أشهر","15%"],year:["سنة","20%"]};
function subscriptionsPage(){
 const data=state.sellerPaidRequests||{},seller=data.seller||state.me?.seller||{},active=seller.seller_package||"free",tier=state.selectedSellerPackage||"plus",term=state.selectedPackageTerm||"month",tab=state.subscriptionTab||"packages";
 const mySubs=data.subscriptions||[],myPromos=data.promotions||[],pendingSubs=mySubs.find(x=>x.status==="pending"),pendingPromo=myPromos.find(x=>x.status==="pending");
 const tierLabels={free:"المجانية",plus:"Plus",pro:"Pro"},commission={free:"7% + 1.5 ر.س",plus:"5% + 1.5 ر.س",pro:"1% + 1.5 ر.س"};
 const prices=SELLER_PACKAGE_PRICES[tier],currentPrice=prices?.[term]||0;
 const tabs='<div class="seller-subscription-tabs"><button data-subscription-tab="packages" class="'+(tab==="packages"?"active":"")+'">باقات البائع</button><button data-subscription-tab="promotions" class="'+(tab==="promotions"?"active":"")+'">روّج لمنتجك</button></div>';
 const current='<div class="seller-current-plan"><span>باقتك الحالية</span><strong class="seller-package-'+active+'">'+esc(tierLabels[active]||"المجانية")+'</strong>'+(seller.seller_package_expires_at?'<small>تنتهي في '+date(seller.seller_package_expires_at)+'</small>':active==="free"?'<small>لا يوجد اشتراك مدفوع حاليًا</small>':"")+'</div>';
 if(tab==="packages"){
  const packageTabs=["free","plus","pro"].map(key=>'<button type="button" data-package-select="'+key+'" class="'+(tier===key?"active":"")+'">'+esc(tierLabels[key])+'</button>').join("");
  const priceCard=tier==="free"?'<strong>مجانًا</strong><small>بدون اشتراك</small>':'<strong>'+sar(currentPrice)+'</strong><small>مدة '+PACKAGE_TERMS[term][0]+'</small>';
  const terms=tier==="free"?"":'<div class="seller-package-terms">'+Object.entries(PACKAGE_TERMS).map(([key,[label,discount]])=>'<button type="button" data-package-term="'+key+'" class="'+(term===key?"active":"")+'">'+(discount?'<small>وفر '+discount+'</small>':"")+'<strong>'+label+'</strong><span>'+sar(SELLER_PACKAGE_PRICES[tier][key])+'</span></button>').join("")+'</div>';
  const matrix='<div class="seller-feature-matrix"><div class="seller-feature-row seller-feature-head"><span>الميزة</span><b>مجاني</b><b>Plus</b><b>Pro</b></div>'+SELLER_PACKAGE_FEATURES.map(([label,free,plus,pro])=>'<div class="seller-feature-row"><span>'+esc(label)+'</span>'+[free,plus,pro].map((yes,i)=>'<b class="'+(yes?"yes":"no")+'" aria-label="'+(yes?"متاحة":"غير متاحة")+'">'+(yes?"✓":"×")+'</b>').join("")+'</div>').join("")+'</div>';
  const submit=tier==="free"?'<p class="seller-package-note">المتجر المجاني هو الباقة الافتراضية.</p>':pendingSubs?'<div class="seller-request-pending">طلب '+esc(tierLabels[pendingSubs.tier_key])+' بانتظار مراجعة المالك · '+sar(pendingSubs.price_sar)+'</div>':active!=="free"&&new Date(seller.seller_package_expires_at||0)>new Date()?'<div class="seller-request-pending">لديك باقة مفعّلة حتى '+date(seller.seller_package_expires_at)+'</div>':'<button type="button" class="btn btn-primary wide" data-submit-seller-subscription data-tier="'+tier+'" data-term="'+term+'">اطلب الاشتراك · '+sar(currentPrice)+'</button>';
  return heading("الاشتراكات","اختر باقة متجرك. المزايا الموضحة تتفعّل بعد مراجعة طلبك من المالك.","")+tabs+current+'<section class="seller-package-shell"><div class="seller-package-switch">'+packageTabs+'</div><div class="seller-package-price seller-package-'+tier+'"><div><strong>باقة '+esc(tierLabels[tier])+'</strong><small>رسوم المنصة المعروضة</small></div><div>'+priceCard+'</div><p>'+commission[tier]+'</p></div><h2>مزايا الباقة</h2>'+matrix+'<p class="seller-package-note">الترتيب والشارات والخصومات داخل DEELA تُطبّق على حساب المتجر. لا يوجد تحصيل إلكتروني مربوط حاليًا؛ أرسل الطلب ثم انتظر تأكيد المالك.</p>'+terms+submit+'</section>';
 }
 const promoPlans=[ ["day","البداية",14,"يوم واحد"],["week","الأساسية",49,"7 أيام"],["month","المميزة",149,"30 يومًا"] ];
 const plan=state.selectedPromotionTerm||"day",discount=active==="pro"?50:active==="plus"?20:0;
 const selected=promoPlans.find(x=>x[0]===plan)||promoPlans[0],amount=Math.round(selected[2]*(1-discount/100)*100)/100;
 const books=(state.sellerListings||[]).filter(x=>x.status==="published");
 const promoFeatures=[["تحسين ظهور المنتج في نتائج التصفح والبحث",true,true,true],["شارة تمييز على المنتج",false,true,true],["أولوية أعلى في ترتيب المنتجات المروّجة",false,false,true]];
 const promoMatrix='<div class="seller-feature-matrix promo-feature-matrix"><div class="seller-feature-row seller-feature-head"><span>الميزة</span><b>يوم</b><b>7 أيام</b><b>30 يومًا</b></div>'+promoFeatures.map(([label,day,week,month])=>'<div class="seller-feature-row"><span>'+label+'</span>'+[day,week,month].map((yes,i)=>'<b class="'+(yes?"yes":"no")+'">'+(yes?"✓":"×")+'</b>').join("")+'</div>').join("")+'</div>';
 const planCards=promoPlans.map(([key,label,price,period])=>'<button type="button" data-promotion-term="'+key+'" class="promotion-plan-card '+(plan===key?"active":"")+'"><strong>'+label+'</strong><small>'+period+'</small><b>'+sar(price)+'</b></button>').join("");
 const action=!state.me?.seller?'<button class="btn btn-primary wide" data-route="seller">افتح حساب الكاتب أولًا</button>':!books.length?'<p class="seller-package-note">انشر منتجًا أولًا لتتمكن من طلب ترويجه.</p>':pendingPromo?'<div class="seller-request-pending">طلب الترويج بانتظار مراجعة المالك · '+sar(pendingPromo.price_sar)+'</div>':'<button type="button" class="btn btn-primary wide" data-submit-promotion data-plan="'+plan+'">اطلب الترويج · '+sar(amount)+'</button>';
 const activePromos=myPromos.filter(x=>x.status==="active"&&new Date(x.ends_at)>new Date());
 return heading("روّج لمنتجك","إبراز منتجك داخل صفحات DEELA. اختر منتجًا ومدة العرض.","")+tabs+current+'<section class="seller-package-shell promotion-shell"><div class="promotion-plan-grid">'+planCards+'</div>'+promoMatrix+(state.me?.seller?'<label class="field">اختر المنتج<select id="promotionListing"><option value="">اختر من منتجاتك المنشورة</option>'+books.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")+'</select></label>':"")+'<p class="seller-package-note">'+(discount?"خصم باقتك الحالية: "+discount+"% · السعر بعد الخصم: "+sar(amount):"الخصم على الترويج: Plus ‏20% · Pro ‏50% بعد تفعيل الباقة")+'<br>طلب الترويج لا يظهر للزوار إلا بعد تأكيد المالك استلام المبلغ.</p>'+action+(activePromos.length?'<h2>ترويجات مفعّلة</h2><div class="list-rows">'+activePromos.map(x=>'<article class="row-card"><strong>'+esc(x.deela_books_listings?.title||"منتج")+'</strong><p>ينتهي '+date(x.ends_at)+'</p></article>').join("")+'</div>':"")+'</section>';
}
function sellerOrdersPanel(){
 const rows=state.sellerOrders||[];const analyticsEnabled=["plus","pro"].includes(state.sellerPaidRequests?.seller?.seller_package||state.me?.seller?.seller_package||"free");
 const labels={pending:"بانتظار ردك",accepted:"قبلت الطلب",rejected:"مرفوض",preparing:"قيد التجهيز",shipped:"حالة قديمة",delivered:"مكتمل",cancelled:"ملغي"};
 return '<section class="panel seller-orders-panel"><div class="row-top"><div><h2>طلبات القراء</h2><p>تابع الطلبات وحدث حالتها من لوحة البائع.</p></div><span class="status">'+(analyticsEnabled?(state.sellerMetrics?.count||0)+' طلب':'تحليلات Plus')+'</span></div>'+
 (rows.length?'<div class="list-rows">'+rows.map(x=>{const o=x.deela_books_orders||{},book=x.deela_books_listings||{};return '<article class="row-card seller-order-card"><div class="row-top"><div><h3>'+esc(x.title_snapshot||"منتج")+' × '+Number(x.quantity||1)+'</h3><p>طلب '+esc(o.code||"—")+' · '+date(o.created_at)+' · '+esc(o.buyer_name||o.buyer_email||"قارئ")+'</p></div><span class="status '+(x.seller_status==="pending"?"muted":"")+'">'+esc(labels[x.seller_status]||x.seller_status||"جديد")+'</span></div><p>قيمة المنتج: '+sar(x.unit_price_sar)+' · '+(x.fulfillment_method==="pickup"?"استلام محلي":"رقمي")+' · '+esc(book.city||"مدينة غير محددة")+'</p><div class="form-grid seller-order-controls"><label class="field">حالة الطلب<select data-seller-order-status="'+esc(x.id)+'">'+Object.entries(labels).filter(([k])=>!["pending","shipped"].includes(k)).map(([k,v])=>'<option value="'+k+'" '+(x.seller_status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label><label class="field full">ملاحظة للعميل<textarea data-seller-note="'+esc(x.id)+'">'+esc(x.seller_note||"")+'</textarea></label></div><div class="form-actions">'+(x.seller_status==="pending"?'<button class="btn btn-primary" data-seller-order="'+esc(x.id)+'" data-status="accepted">قبول الطلب</button><button class="btn btn-outline" data-seller-order="'+esc(x.id)+'" data-status="rejected">تعذر القبول</button>':"")+'<button class="btn btn-soft" data-seller-order="'+esc(x.id)+'" data-status="'+esc(x.seller_status||"accepted")+'">حفظ التحديث</button></div></article>'}).join("")+'</div>':'<p class="empty-state">ستظهر هنا طلبات القراء. لا توجد طلبات الآن.</p>')+'</section>';
}
async function saveSellerOrder(id,statusOverride){
 const item=(state.sellerOrders||[]).find(x=>x.id===id);if(!item)return toast("الطلب غير موجود في الصفحة");
 const status=statusOverride||document.querySelector('[data-seller-order-status="'+CSS.escape(id)+'"]')?.value||item.seller_status;
 const seller_note=document.querySelector('[data-seller-note="'+CSS.escape(id)+'"]')?.value||"";
 try{await api("/seller/order-item/status",{method:"POST",data:{id,status,seller_note}});toast("تم تحديث حالة الطلب وإشعار المشتري");await sellerData();await route("seller",false)}catch(e){toast(errorMessage(e))}
}
function sellerPage(){
 const seller=state.me?.seller;
 if(!seller&&!enabled("enable_seller_registration"))return heading("فتح المتاجر متوقف حاليًا","أوقف المالك استقبال مؤلفين ومتاجر جديدة مؤقتًا.");
 if(!seller)return heading("حساب الكاتب","أنشئ واجهتك داخل DEELA Books، وبعد اعتماد حسابك انشر رواياتك مباشرة في المساحة الخاصة.","DEELA AUTHOR")+
 '<div class="panel"><h2>ابدأ صفحة الكاتب</h2><p>صفحتك تظهر لك داخل حسابك فقط. بعد اعتماد صفحة الكاتب، تقدر تنشر أي رواية فورًا ليشاهدها مستخدمو مساحة الاختبار الخاصة.</p>'+
 '<form id="sellerApplyForm" class="form-grid">'+
 field("اسم الكاتب الظاهر للقراء","shop_name","text",true,"اسمك أو اسمك الأدبي")+
 field("معرّف صفحة الكاتب بالإنجليزية","slug","text",true,"my-novels")+
 field("المدينة","city","text",false,"جدة")+'<button type="button" class="btn btn-outline" data-store-location>تحديد موقع المتجر على الخريطة</button><input type="hidden" name="latitude"><input type="hidden" name="longitude"><small class="field full">يُحفظ موقع المتجر بعد تقريبه؛ لا يُرسل موقع المشتري إلى الخادم.</small>'+
 '<label class="field full author-novel-field">ملف روايتك الأولى (PDF أو EPUB أو MP3)<input id="authorNovelFile" name="author_novel_file" type="file" accept="application/pdf,.pdf,application/epub+zip,.epub,audio/mpeg,.mp3"><small>أرفق الرواية الآن؛ بعد إنشاء الصفحة نكمل بيانات العنوان والسعر قبل حفظها.</small></label><label class="field full">شعار صفحة الكاتب (اختياري)<input id="sellerLogoFile" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<label class="field">الدولة<select name="country"><option>السعودية</option><option>الإمارات</option><option>الكويت</option><option>قطر</option><option>البحرين</option><option>عُمان</option><option>أخرى</option></select></label>'+
 '<label class="field full">نبذة قصيرة عنك وعن رواياتك<textarea name="bio" maxlength="1000" placeholder="عرّف القراء بأسلوبك ونوع الروايات التي تكتبها"></textarea></label>'+
 '<div class="form-actions"><button type="submit" class="btn btn-primary">إنشاء صفحة الكاتب وإضافة الرواية ←</button></div></form></div>';
 const available=seller.status==="approved",novels=state.sellerListings.length,memberPlan=state.me?.member_plan||"",memberTierClass=memberPlan==="year"?"member-store-year":memberPlan==="half_year"?"member-store-half-year":memberPlan==="month"?"member-store-month":"",memberTierLabel=memberPlan==="year"?"العضوية السنوية":memberPlan==="half_year"?"عضوية نصف السنة":memberPlan==="month"?"عضوية الشهر":"";
 const views=state.sellerListings.reduce((n,x)=>n+Number(x.view_count||0),0),likes=state.sellerListings.reduce((n,x)=>n+Number(x.like_count||0),0),sellerPackage=state.sellerPaidRequests?.seller?.seller_package||seller.seller_package||"free",sellerAnalytics=["plus","pro"].includes(sellerPackage);
 const published=state.sellerListings.filter(x=>x.status==="published").length;
 return '<div class="member-seller-workspace '+memberTierClass+'">'+heading("حسابي","تابع رواياتك وتفاعل القراء من مكان واحد.","")+
 '<section class="seller-profile-card '+memberTierClass+' '+(state.me?.member_features?.includes("profile_glow")?"member-glow":"")+'"><div class="seller-avatar '+(state.me?.member_features?.includes("avatar_frame")?"premium-avatar-frame premium-avatar-frame-"+(state.me?.member_appearance?.avatar_frame||"aurora"):"")+'">'+(state.me?.avatar_url&&state.me?.member_features?.includes("profile_avatar")?'<img src="'+esc(state.me.avatar_url)+'" alt="">':seller.logo_url?'<img src="'+esc(seller.logo_url)+'" alt="">':esc((seller.shop_name||"D").trim().slice(0,1)))+'</div><div><h2 class="'+(state.me?.member_features?.includes("display_name_style")?"member-name-style":"")+'">'+esc(seller.shop_name)+(state.me?.member_features?.includes("verified_badge")?'<span class="verified-badge" title="عضوية مميزة">✓</span>':"")+
 (state.sellerPromotions.some(x=>x.kind==="premium"&&x.status==="active"&&x.is_test===true&&new Date(x.ends_at)>new Date())?'<span class="premium-test-badge">✦ عضوية تجريبية</span>':"")+'</h2>'+(memberTierLabel?'<span class="member-tier-ribbon member-tier-ribbon-'+memberPlan+'">✦ '+memberTierLabel+' · إطار '+(memberPlan==="year"?"ذهبي فاخر":memberPlan==="half_year"?"ذهبي وردي":"الشفق")+'</span>':"")+'<p>@'+esc(seller.slug)+' · '+esc(state.email||state.me?.phone||"حساب DEELA Books")+'</p></div><span class="status '+(available?"":"muted")+'">'+(available?"كاتب معتمد":"طلب الكاتب قيد المراجعة")+'</span></section>'+
 '<details class="panel seller-profile-edit"><summary>تعديل واجهة متجري</summary><form id="sellerProfileForm" class="form-grid">'+field("اسم المتجر","shop_name","text",true,"",seller.shop_name)+field("المدينة","city","text",false,"",seller.city||"")+'<button type="button" class="btn btn-outline" data-store-location>تحديث موقع المتجر</button><input type="hidden" name="latitude" value="'+esc(seller.latitude??"")+'"><input type="hidden" name="longitude" value="'+esc(seller.longitude??"")+'"><small class="field full">الموقع يُحفظ تقريبيًا لتحسين نتائج القرب فقط.</small>'+'<label class="field full">نبذة المتجر<textarea name="bio" maxlength="1000">'+esc(seller.bio||"")+'</textarea></label><label class="field full">تغيير الشعار<input id="sellerLogoFile" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="btn btn-primary" type="submit">حفظ واجهة المتجر</button></form></details>'+
 '<details class="panel premium-appearance"><summary>✦ تخصيص عضويتك المميزة</summary><p>إعداداتك تظهر بحسب المزايا المفعّلة في باقتك.</p>'+(
 state.me?.premium_active?'<form id="premiumAppearanceForm" class="form-grid"><label class="field">اسم العرض<input name="display_name" maxlength="90" value="'+esc(state.me?.member_appearance?.display_name||state.me?.display_name||"")+'" '+(state.me?.member_features?.includes("display_name_style")?"":"disabled")+'></label><label class="field full">صورة العرض<input id="premiumAvatarFile" type="file" accept="image/png,image/jpeg,image/webp" '+(state.me?.member_features?.includes("profile_avatar")?"":"disabled")+'></label><label class="field">إطار الصورة<select name="avatar_frame" '+(state.me?.member_features?.includes("avatar_frame")?"":"disabled")+'>'+memberStyleOptions("avatar",state.me?.member_appearance?.avatar_frame||"aurora",state.me?.member_features||[])+'</select></label><label class="field">إطار الكتاب<select name="book_frame" '+(state.me?.member_features?.includes("book_frame")?"":"disabled")+'>'+memberStyleOptions("book",state.me?.member_appearance?.book_frame||"starlight",state.me?.member_features||[])+'</select></label><label class="field">ثيم المتجر<select name="profile_theme" '+(state.me?.member_features?.includes("profile_theme")?"":"disabled")+'><option value="ocean" '+((state.me?.member_appearance?.profile_theme||"ocean")==="ocean"?"selected":"")+' '+(state.me?.member_features?.includes("profile_theme")?"":"disabled")+'>أزرق المحيط</option><option value="emerald" '+(state.me?.member_appearance?.profile_theme==="emerald"?"selected":"")+' '+(state.me?.member_features?.includes("profile_theme")?"":"disabled")+'>زمردي</option><option value="royal" '+(state.me?.member_appearance?.profile_theme==="royal"?"selected":"")+' '+(state.me?.member_features?.includes("profile_theme")?"":"disabled")+'>ذهبي ملكي</option><option value="rose" '+(state.me?.member_appearance?.profile_theme==="rose"?"selected":"")+' '+(state.me?.member_features?.includes("profile_theme")?"":"disabled")+'>وردي مخملي</option></select></label><label class="checkbox-field full"><input name="shine" type="checkbox" '+(state.me?.member_appearance?.shine===false?"":"checked")+' '+(state.me?.member_features?.includes("book_shine")?"":"disabled")+'> لمعان متحرك للكتب</label><button class="btn btn-primary" type="submit">حفظ الهوية والظهور</button></form>':'<p class="muted">تظهر لك لوحة التخصيص عند تفعيل اشتراك مميز.</p>')+'</details>'+
 '<div class="seller-stat-grid"><div class="seller-stat"><strong>'+published+'</strong><span>رواية منشورة</span></div><div class="seller-stat"><strong>'+novels+'</strong><span>إجمالي الروايات</span></div><div class="seller-stat"><strong>'+views+'</strong><span>مشاهدة</span></div><div class="seller-stat"><strong>'+likes+'</strong><span>إعجاب</span></div><div class="seller-stat"><strong>'+(sellerAnalytics?Number(state.sellerMetrics?.accepted||0):"Plus")+'</strong><span>'+(sellerAnalytics?"طلبات مقبولة":"تحليلات الطلبات")+'</span></div></div>'+
 
 '<div class="toolbar"><span class="status '+(available?"":"muted")+'">'+(available?"صفحة الكاتب مفعّلة":"الحساب قيد مراجعة المتجر")+'</span><button class="btn btn-outline" data-route="seller">تحديث الحساب ↻</button></div>'+
 (available?'<div id="sellerEditor"></div>'+sellerOrdersPanel()+'<div class="panel"><h2>تنبيهات وتفاعل القراء</h2><p>تظهر التنبيهات الجديدة هنا وتُحدّث تلقائيًا أثناء فتح الموقع. التعليقات والإعجابات تجدها داخل صفحة كل رواية.</p>'+ ("Notification" in window?(Notification.permission==="granted"?'<span class="status">إشعارات المتصفح مفعّلة</span>':Notification.permission==="denied"?'<span class="status muted">إشعارات المتصفح محظورة من إعدادات الجهاز</span>':'<button class="btn btn-outline" data-enable-seller-notifications>تفعيل إشعارات المتصفح</button>'):"")+'<div class="list-rows">'+(state.sellerNotifications.length?state.sellerNotifications.map(n=>'<article class="row-card '+(n.read_at?"":"notification-unread")+'"><div class="row-top"><strong>'+esc(n.title)+'</strong><small>'+date(n.created_at)+'</small></div><p>'+esc(n.body)+'</p>'+(n.read_at?'<span class="status muted">مقروء</span>':'<button class="btn btn-outline" data-notification-read="'+esc(n.id)+'">تعليم كمقروء</button>')+'</article>').join(""):'<p>لا توجد تنبيهات جديدة حاليًا.</p>')+'</div><button class="btn btn-outline" data-notifications-read-all>تعليم كل التنبيهات كمقروءة</button></div>':'<div class="panel status"><strong>طلبك لدى المالك</strong><p>تقدر ترفع روايتك إلى قائمة المراجعة الخاصة الآن. ستظل مخفية عن القراء حتى اعتماد المتجر والرواية.</p><div id="sellerEditor"></div></div>')+
 '<div class="panel"><div class="row-top"><h2>رواياتي</h2>'+(enabled("enable_book_submissions")?'<button class="btn btn-primary" data-editor="new">＋ أضف رواية</button>':'<span class="status muted">استقبال الروايات متوقف</span>')+'</div><p>بعد اعتماد متجرك، تُنشر الرواية تلقائيًا. بعد النشر يمكنك حذفها من متجرك ولا يمكن تعديلها. اضغط اسم الرواية لفتح صفحتها والتفاعل معها.</p><div class="list-rows">'+(state.sellerListings.length?state.sellerListings.map(l=>'<article class="seller-novel-card '+(state.me?.member_features?.includes("book_frame")?"member-book-frame member-book-frame-"+(state.me?.member_appearance?.book_frame||"starlight"):"")+' '+(state.me?.member_features?.includes("book_shine")&&state.me?.member_appearance?.shine!==false?"member-book-shine":"")+' '+(state.me?.member_features?.includes("book_shine_prism")&&state.me?.member_appearance?.shine!==false?"member-book-shine-prism":"")+'"><div class="row-top"><div><h3 data-book="'+esc(l.id)+'">'+esc(l.title)+'</h3><p>'+esc(kinds[l.format])+' · '+sar(l.price_sar)+'</p><div class="community-strip"><span class="like-chip">♥ '+Number(l.like_count||0)+' إعجاب</span><span class="rating-chip">◉ '+Number(l.view_count||0)+' مشاهدة</span><span class="rating-chip">★ '+Number(l.review_count||0)+' تقييم</span></div></div><span class="status '+(l.status==="published"?"":"muted")+'">'+esc(statusNames[l.status])+'</span></div><div class="form-actions">'+(l.status==="published"?'<button class="btn danger account-delete-book" data-listing-delete="'+esc(l.id)+'">حذف الرواية</button>':(enabled("enable_book_submissions")?'<button class="btn btn-outline" data-editor="'+esc(l.id)+'">تعديل الرواية</button>':"")+'<button class="btn danger account-delete-book" data-listing-delete="'+esc(l.id)+'">حذف الرواية</button>')+'</div></article>').join(""):'<p>لم ترفع رواية بعد. اضغط «أضف رواية» لبدء النشر.</p>')+'</div></div>'+(state.sellerListingsHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-seller-books>عرض المزيد من كتبك</button></div>':"")+accountLogoutPanel()+"</div>";
}
function editorPage(b=null){
 const selectedCategory=b?.category||"روايات";
 return '<div class="panel" id="editorPanel"><h2>'+(b?"تعديل الكتاب":"إضافة كتاب جديد")+'</h2>'+
 '<form id="listingForm" data-id="'+esc(b?.id||"")+'">'+
 '<div class="form-grid">'+
 '<label class="field full cover-upload-field">صورة الغلاف<input id="coverFile" type="file" accept="image/png,image/jpeg,image/webp"><small>اختر صورة من ملفات الجهاز أو الكاميرا · PNG/JPG/WebP حتى 5MB</small></label><label class="field full">صور إضافية للكتاب (حتى 7 صور)<input id="galleryFiles" type="file" multiple accept="image/png,image/jpeg,image/webp"><small id="galleryStatus">تظهر الصور في معرض داخل صفحة الكتاب.</small></label>'+
 field("اسم المنتج أو الرواية","title","text",true,"اسم منتجك",b?.title||"")+
 '<label class="field">القسم الرئيسي للمنتج<select name="product_type">'+Object.entries(productTypes).map(([key,label])=>'<option value="'+key+'" '+((b?.product_type||"book")===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 field("عنوان فرعي جذاب","subtitle","text",false,"وصف قصير يظهر في بطاقات الكتب",b?.subtitle||"")+
 field("اسم المؤلف","author","text",false,"اسم الكاتب",b?.author||"")+
 '<div class="field full format-field"><span>نوع الكتاب</span><div class="format-cards" role="radiogroup" aria-label="نوع الكتاب">'+
 Object.entries(kinds).map(([key,label])=>'<label class="format-card '+((b?.format||"physical")===key?"active":"")+'"><input type="radio" name="format-choice" value="'+key+'" '+((b?.format||"physical")===key?"checked":"")+' required><span class="format-check" aria-hidden="true">✓</span><strong>'+label+'</strong><small>'+(key==="physical"?"نسخة ورقية":key==="ebook"?"PDF أو EPUB":"ملف صوتي")+'</small></label>').join("")+
 '</div><select name="format" class="format-select-hidden" aria-hidden="true" tabindex="-1">'+Object.entries(kinds).map(([key,label])=>'<option value="'+key+'" '+((b?.format||"physical")===key?"selected":"")+'>'+label+'</option>').join("")+'</select></div>'+
 '<div class="field full"><span>اختر قسم الرواية</span><div class="category-pills">'+categoryOptions().filter(x=>x!=="الكل").map(x=>'<button type="button" data-editor-category="'+esc(x)+'" class="category-pill '+(selectedCategory===x?"active":"")+'">'+esc(x)+'</button>').join("")+'</div><select name="category" required class="category-select-hidden">'+categoryOptions().filter(x=>x!=="الكل").map(x=>'<option '+(selectedCategory===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></div>'+
 '<label class="field physical-only">حالة الكتاب الورقي<select name="book_condition">'+Object.entries(conditions).map(([key,label])=>
 '<option value="'+key+'" '+(b?.book_condition===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 '<div class="field full"><div class="seller-price-tip">💰 <strong>حسبة الاختبار: 20% للمنصة و80% للمؤلف.</strong> حسب المثال: إذا كان السعر 10 ريالات، فالحصة 2 ريال للمنصة و8 للمؤلف. <span id="commissionPreviewValue">أدخل السعر لعرض الحسبة.</span><br><small>هذه معاينة فقط؛ لن يتم خصم أو تحويل أي مبلغ قبل تفعيل الدفع بموافقتك.</small></div></div>'+
 field("سعر الكتاب الذي تختاره (ر.س)","price_sar","number",true,"35",b?.price_sar??"")+
 (enabled("enable_discounts")?field("السعر قبل الخصم (اختياري)","compare_at_sar","number",false,"49",b?.compare_at_sar??""):"")+
 '<label class="field physical-only">الكمية المتاحة<input name="stock" type="number" min="0" max="100000" required value="'+esc(b?.stock??1)+'"></label>'+
 '<div class="field full physical-only"><span>الاستلام المحلي (اختياري)</span><label class="checkfield"><input type="checkbox" name="pickup_available" '+(b?.pickup_available?"checked":"")+'> متاح للاستلام من المتجر فقط</label></div>'+
 field("عدد الصفحات (اختياري)","page_count","number",false,"240",b?.page_count??"")+
 field("سنة النشر (اختياري)","publication_year","number",false,"2026",b?.publication_year??"")+
 '<label class="field">الفئة العمرية<select name="audience">'+
 ["عام","الناشئة","للبالغين"].map(x=>'<option '+(b?.audience===x?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
 field("رقم ISBN (اختياري)","isbn","text",false,"",b?.isbn||"")+
 field("المدينة","city","text",false,"جدة",b?.city||"")+'<label class="field full">كلمات مفتاحية (مفصولة بفاصلة)<input name="tags" maxlength="900" value="'+esc((b?.tags||[]).join("، "))+'" placeholder="رعب، غموض، جريمة، تشويق"></label>'+
 '<label class="field full">مضمون الرواية وملخص أحداثها (اختياري، بدون حرق)<textarea name="description" maxlength="5000" rows="6" placeholder="اكتب نبذة قصيرة اختيارية تشجع القارئ دون كشف الأحداث أو النهاية">'+esc(b?.description||"")+'</textarea></label>'+
 '<label class="field full">تنبيهات المحتوى (اختياري)<textarea name="content_warning" maxlength="350" rows="2" placeholder="مثلًا: مشاهد رعب، عنف، موضوعات للكبار">'+esc(b?.content_warning||"")+'</textarea></label>'+
 '<label class="field full">مقتطف للمعاينة (اختياري)<textarea name="preview_excerpt" rows="4">'+esc(b?.preview_excerpt||"")+'</textarea></label>'+
 '<label class="field full" id="digitalFileField">ملف الكتاب (PDF أو EPUB أو MP3، حتى 50MB)<input id="digitalFile" name="digital_file" type="file" accept="application/pdf,.pdf,application/epub+zip,.epub,audio/mpeg,.mp3"><small id="digitalFileStatus">أرفق نسخة الكتاب الرقمية عند توفرها. الملفات لا تظهر للعامة.</small></label>'+
 (state.settings.private_test_mode?'<label class="field full"><span class="checkfield"><input type="checkbox" name="test_publish" checked>'+
 'انشرها فورًا لكل الحسابات المسجّلة في مساحة الاختبار الخاصة. لن تظهر للعامة.</span></label>':"")+
 '<label class="field full"><span class="checkfield"><input type="checkbox" name="rights_confirmed" required '+(b?.rights_confirmed?"checked":"")+'>'+
 'أؤكد أن لي حق نشر أو بيع هذا الكتاب وأنه لا ينتهك حقوق مؤلف أو ناشر آخر.</span></label>'+
 '</div><div class="form-actions"><button type="submit" class="btn btn-primary" id="saveListing">'+(state.settings.private_test_mode?"حفظ ونشر في مساحة الاختبار":"رفع الكتاب للمراجعة")+'</button>'+
 '<button type="button" class="btn btn-outline" data-editor="close">إغلاق</button></div><p class="form-msg" id="listingMessage"></p></form></div>';
}
const FEATURE_GROUPS=[
 {title:"النشر وإدارة البائعين",desc:"إدارة استقبال البائعين والكتب قبل النشر",items:[
  ["enable_seller_registration","تسجيل مؤلفين ومتاجر جديدة","التحكم في إمكانية طلب فتح متجر جديد"],
  ["enable_book_submissions","إضافة ورفع الكتب","يقفل إضافة الكتب والملفات من لوحة المؤلف عند تعطيله"],
  ["enable_featured_section","الكتب المختارة والمميزة","السماح بإبراز الكتب المعتمدة في مقدمة المتجر"],
  ["enable_discounts","عروض وخصومات الكتب","إظهار الأسعار السابقة وتخفيضات المؤلفين"],
  ["enable_launch_alerts","إعلانات إطلاق الروايات المدفوعة","يسمح للبائع بطلب تنبيه عام بعد إدخال مرجع التحويل والتحقق اليدوي من المبلغ"]
 ]},
 {title:"مجتمع القراء",desc:"تفاعل القراء مع الروايات والمؤلفين",items:[
  ["enable_reader_likes","إعجابات الروايات","تشغيل القلب وعدد الإعجابات الحقيقي"],
  ["enable_favorites","المفضلة","السماح للقراء بحفظ الكتب في قوائمهم"],
  ["enable_author_follows","متابعة المؤلفين والمتاجر","تشغيل زر متابعة البائع مع عداد المتابعين"],
  ["enable_reviews","التقييمات والمراجعات","عرض مراجعات القراء المعتمدة وتقديم تقييم بعد الاستلام"],
  ["enable_messages","رسائل القراء والبائعين","إتاحة التواصل والاستفسارات داخل المنصة"]
 ]},
 {title:"المتجر والمبيعات",desc:"تحديد ما يمكن للقراء رؤيته وطلبه",items:[
  ["enable_orders","استقبال طلبات الكتب","إتاحة السلة وإرسال طلب مراجعة (دون تحصيل إلكتروني)"],
  ["show_book_prices","إظهار أسعار الكتب","إظهار الأسعار للقراء وإتاحة طلبات الشراء"]
 ]}
];
const ALL_FEATURE_KEYS=FEATURE_GROUPS.flatMap(g=>g.items.map(x=>x[0]));
function ownerFeatureGroup(group,conf){
 return '<details class="owner-feature-group"><summary class="owner-feature-heading"><span>'+esc(group.title)+'</span><small>'+esc(group.desc)+'</small></summary><div class="owner-feature-list">'+
 group.items.map(([key,title,description])=>
 '<label class="owner-feature"><span class="owner-feature-copy"><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span>'+
 '<span class="switch"><input type="checkbox" name="'+esc(key)+'" '+(conf[key]===true?"checked":"")+'><span class="switch-track"></span></span></label>'
 ).join("")+'</div></details>';
}
function managedOwnerTabs(){
 const rows=state.ownerData?.sections||[];
 return '<section class="panel"><h2>أقسام الروايات والتصنيفات</h2><p>أنشئ عددًا مفتوحًا من التصنيفات، مثل الفانتازيا والرعب والرومانسية والغموض والتاريخي والخيال العلمي والسير الذاتية. تظهر اختيارات البائع هنا تلقائيًا.</p><form id="sectionForm" class="form-grid">'+
 '<label class="field">عنوان القسم<input name="title" required maxlength="100"></label><label class="field">النوع<select name="kind"><option value="category">تصنيف كتب</option><option value="promo">قسم ترويجي</option></select></label>'+
 '<label class="field">التصنيف<input name="category" maxlength="80" placeholder="روايات"></label><label class="field">الترتيب<input name="sort_order" type="number" min="1" max="9999" value="1"></label>'+
 '<label class="field full">الوصف<textarea name="description" maxlength="450"></textarea></label><label class="field">الخامة والزخرفة<select name="material">'+Object.entries(materials).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("")+'</select></label><label class="field">لون خلفية القسم<input type="color" name="background_color" value="#F9E9E7"></label><label class="field">لون إبراز العنوان<input type="color" name="accent_color" value="#51321B"></label>'+imageUploader("section")+
 '<label class="field"><input type="checkbox" name="visible" checked>إظهار القسم</label><input type="hidden" name="id"><input type="hidden" name="image_path"><div class="field full"><button class="btn btn-primary" type="submit">حفظ القسم</button><span class="form-msg" data-upload-status="section"></span></div></form><div class="managed-admin-list">'+(rows.length?rows.map(x=>'<article class="row-card"><strong>'+esc(x.title)+'</strong> · '+esc(x.kind==="category"?x.category:"ترويجي")+' · '+esc(materials[x.material]||"بدون خامة")+' · الترتيب '+Number(x.sort_order)+' · '+(x.visible?"ظاهر":"مخفي")+'<div class="toolbar"><button class="btn btn-outline" data-section-edit="'+esc(x.id)+'">تعديل</button><button class="btn btn-outline" data-section-delete="'+esc(x.id)+'">حذف</button></div></article>').join(""):'<p>لم تُنشأ أقسام بعد.</p>')+'</div></section>'+
 '<section class="panel"><h2>البنرات وجدول الظهور</h2><p>رفع صورة من المعرض، تحديد رابط وموعد بداية ونهاية الظهور.</p><form id="bannerForm" class="form-grid">'+
 '<label class="field">عنوان البنر<input name="title" required maxlength="120"></label><label class="field">الترتيب<input name="sort_order" type="number" min="1" max="9999" value="1"></label><label class="field full">الرابط HTTPS<input name="target_url" type="url" placeholder="https://..."></label>'+imageUploader("banner")+
 '<label class="field">الحركة<select name="motion"><option value="none">ثابت</option><option value="glow">لمعان</option><option value="slide">انزلاق</option></select></label><label class="field">يبدأ في<input name="starts_at" type="datetime-local"></label><label class="field">ينتهي في<input name="ends_at" type="datetime-local"></label><label class="field"><input type="checkbox" name="active" checked>تفعيل البنر وفق الجدول</label><input type="hidden" name="id"><input type="hidden" name="image_path"><div class="field full"><button class="btn btn-primary" type="submit">حفظ البنر</button><span class="form-msg" data-upload-status="banner"></span></div></form><div class="managed-admin-list">'+(state.ownerData?.banners||[]).map(x=>'<article class="row-card"><strong>'+esc(x.title)+'</strong> · '+(x.active?"مفعّل":"مخفي")+' · '+(x.starts_at?date(x.starts_at):"بلا موعد بداية")+'<div class="toolbar"><button class="btn btn-outline" data-banner-edit="'+esc(x.id)+'">تعديل</button><button class="btn btn-outline" data-banner-delete="'+esc(x.id)+'">حذف</button></div></article>').join("")+'</div></section>';
}
function imageUploader(kind){return '<label class="field">صورة من الجهاز<input type="file" accept="image/png,image/jpeg,image/webp" data-admin-image="'+kind+'"></label>';}
function ownerLaunchAlertsPanel(){
 const rows=state.ownerData?.campaigns||[];
 return '<section class="panel"><h2>إعلانات إطلاق الكتب</h2><p>لا يُنشر طلب قبل مراجعة مرجع التحويل والتأكد يدويًا من وصول المبلغ. الدفع الإلكتروني غير مفعّل. المتجر الخاص يمنع نشر التنبيه أو تحصيله. بعد إطلاق المتجر، يضاف الإعلان إلى الموجز؛ إشعار الخلفية يحتاج ربط FCM.</p><div class="list-rows">'+(rows.length?rows.map(c=>'<article class="row-card"><div class="row-top"><div><strong>'+esc(c.deela_books_listings?.title||"كتاب")+'</strong><p>'+esc(c.deela_books_sellers?.shop_name||"متجر")+' · '+sar(c.amount_sar)+' · '+date(c.created_at)+'</p></div><span class="status">'+esc(statusNames[c.status]||c.status)+'</span></div><p>مرجع التحويل: <b>'+esc(c.payment_reference)+'</b></p>'+(c.status==="payment_review"?'<label class="checkfield"><input type="checkbox" data-launch-payment-confirm="'+esc(c.id)+'">أؤكد أنني تحققت من كشف الحساب واستلمت هذا المبلغ فعلًا.</label><div class="toolbar"><button class="btn btn-primary" data-launch-status="'+esc(c.id)+'" data-status="published">تأكيد الاستلام ونشر التنبيه</button><button class="btn btn-outline" data-launch-status="'+esc(c.id)+'" data-status="rejected">رفض الطلب</button></div>':"")+'</article>').join(""):'<p class="empty-state">لا توجد طلبات إعلانات جديدة.</p>')+'</div></section>';
}
function paymentOwnerPanel(){
 const c=state.ownerData?.config||{mode:"test",live_enabled:false,provider:"tap",tax_percent:0,refund_window_days:7,discounts_enabled:false};
 return '<section class="panel"><h2>مركز المدفوعات · بيئة اختبار فقط</h2><p>لا يجري تحصيل أموال هنا. لا نقبل مفاتيح سرية ولا نسجل نجاح دفع تجريبي على أنه حقيقي.</p><form id="paymentsForm" class="form-grid">'+
 '<label class="field">بوابة الربط المقترحة<select name="provider"><option value="">غير محددة</option>'+[["tap","Tap Marketplace · مقترح الربط"]].map(([k,v])=>'<option value="'+k+'" '+((c.provider||"tap")===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label class="field">الضريبة (%)<input name="tax_percent" type="number" min="0" max="25" step="0.01" value="'+Number(c.tax_percent||0)+'"></label><label class="field">نافذة الاسترداد (أيام)<input name="refund_window_days" type="number" min="0" max="90" value="'+Number(c.refund_window_days??7)+'"></label><label class="field"><input name="discounts_enabled" type="checkbox" '+(c.discounts_enabled?"checked":"")+'>تفعيل خصومات الاختبار</label><div class="field full"><p>طرق الدفع المستهدفة عبر Tap Marketplace: مدى، Apple Pay، Visa، STC Pay، تابي، وتمارا. Mastercard مستبعدة من اختيار البطاقة. بعد تفعيل حساب Tap التجاري وربط التجار والتحقق من KYC تُتاح وسائل الدفع المعتمدة فقط.</p></div><div class="owner-locked-panel full"><strong>الالحالة: تجربة فقط · انتظار اعتماد حساب Tap ومفاتيح الربط</strong><p>مفاتيح Tap السرية لا تدخل هنا؛ تحفظ في أسرار الخادم. لا يبدأ الخصم الحقيقي قبل اعتماد الحساب وتهيئة تسوية البائعين.</p></div><div class="field full"><button class="btn btn-primary" type="submit">حفظ إعدادات الاختبار</button><span class="form-msg"></span></div></form></section>';
}
function accountOwnerPanel(){
 const rows=state.ownerData?.users||[],tiers=state.ownerData?.tiers||{month:[],half_year:[],year:[],prices:{}};
 const tierForm='<section class="panel"><h2>مزايا وأسعار العضوية</h2><p>حدد مربعات كل مدة؛ المزايا تتفعل تلقائيًا عند تفعيل العضوية. اترك السعر فارغًا الآن أو أدخله لاحقًا من لوحة المالك.</p><form id="memberTiersForm" class="form-grid">'+["month","half_year","year"].map(k=>'<fieldset class="member-tier-box member-tier-'+k+'"><legend>'+MEMBER_TIER_NAMES[k]+'</legend><p class="tier-note">'+MEMBER_TIER_COPY[k]+'</p><label class="field">سعر '+MEMBER_TIER_NAMES[k]+' (ريال) <input type="number" name="price_'+k+'" min="0" step="0.01" placeholder="اتركه فارغًا لتحديده لاحقًا" value="'+esc(tiers.prices?.[k]??"")+'"></label><div class="member-feature-grid">'+MEMBER_FEATURES.map(([key,label])=>'<label class="checkbox-field"><input type="checkbox" name="'+k+'" value="'+key+'" '+((tiers[k]||[]).includes(key)?"checked":"")+'><span>'+label+'</span></label>').join("")+'</div></fieldset>').join("")+'<button class="btn btn-primary" type="submit">حفظ مزايا وأسعار الباقات</button><span class="form-msg"></span></form></section>';
 const accountFilters='<div class="owner-filter-box owner-account-filters"><input type="search" class="owner-search" placeholder="ابحث بالاسم أو البريد أو الجوال…"><select id="ownerMembershipFilter"><option value="all">كل العضويات</option><option value="premium">المميزة</option><option value="free">غير المميزة</option></select><select id="ownerAccountTypeFilter"><option value="all">كل الحسابات</option><option value="seller">المؤلفون والمتاجر</option><option value="reader">القراء</option></select></div>';
 return tierForm+'<section class="panel"><h2>حسابات DEELA Books</h2><p>تظهر هنا كل الحسابات المسجلة، مع تمييز المؤلفين والمتاجر والقراء، ويمكن تصفية الحسابات المميزة وغير المميزة.</p>'+accountFilters+'<div class="list-rows">'+(rows.length?rows.map(u=>{
  const name=u.shop_name||u.display_name||u.email||u.phone||"حساب قارئ";
  const memberLabel=u.member_status_error?"تعذر قراءة العضوية":u.premium_active?"عضوية مميزة":"غير مشترك";
  const accountLabel=u.is_seller?(statusNames[u.seller_status]||u.seller_status||"مؤلف أو متجر"):"قارئ";
  return '<article class="row-card" data-owner-row data-owner-state="'+(u.blocked?"blocked":"active")+'" data-member-state="'+(u.premium_active?"premium":"free")+'" data-account-type="'+(u.is_seller?"seller":"reader")+'"><div class="row-top"><div><strong>'+esc(name)+'</strong><p>'+esc(u.email||u.phone||u.id)+' · '+(u.is_seller?esc(u.slug||"صفحة المؤلف"):"حساب قارئ")+' · آخر دخول: '+date(u.last_sign_in_at)+' · إنشاء: '+date(u.created_at)+'</p></div><div class="owner-account-badges"><span class="status">'+(u.blocked?"موقوف":esc(accountLabel))+'</span><span class="status '+(u.premium_active?"member-active-status":"muted")+'">'+memberLabel+(u.member_plan_label&&u.premium_active?" · "+esc(u.member_plan_label):"")+'</span></div></div>'+ownerMembershipControls(u)+memberChecks(u)+'<label class="field">ملاحظة إدارية<input data-user-note="'+esc(u.id)+'" value="'+esc(u.note||"")+'" maxlength="500"></label><button class="btn '+(u.blocked?"btn-outline":"danger")+'" data-user-toggle="'+esc(u.id)+'" data-blocked="'+(!u.blocked)+'">'+(u.blocked?"إعادة تفعيل الحساب":u.is_seller?"إيقاف حساب المؤلف أو المتجر":"إيقاف الحساب")+'</button></article>';
 }).join(""):'<div class="empty-state"><h3>ما فيه حسابات مسجلة حتى الآن</h3><p>تظهر الحسابات هنا مباشرة بعد إنشائها.</p></div>')+'</div>'+(state.ownerUsersHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-owner-users>تحميل المزيد من الحسابات</button></div>':"")+'<p>تحديث العضوية والميزات ينعكس على حساب المشترك فورًا.</p></section>';
}
function ownerContestsPanel(){
 const rows=state.ownerContests||[];
 return '<section class="panel"><h2>إعلان أو مسابقة للمجتمع</h2><p>أرسل إعلانًا للقراء، أو أضف سؤالًا تفاعليًا وحدد موعده. يظهر المحتوى في مجتمع ديلا وتصل رسالة تنبيه للمستخدمين.</p>'+
 '<form id="ownerContestForm" class="form-grid"><input type="hidden" name="id"><label class="field">اسم المسابقة<input name="title" required maxlength="160" placeholder="مسابقة DEELA"></label>'+
 '<label class="field">موعد فتح السؤال<input name="starts_at" type="datetime-local"></label>'+
 '<label class="field full">إعلان ينتظرونه القراء<textarea name="announcement" maxlength="1000" placeholder="انتظرونا الساعة 10 مساءً في مسابقة ديلا"></textarea></label>'+
 '<label class="field full">السؤال أو موضوع الاستطلاع<textarea name="question_text" maxlength="1000"></textarea></label>'+
 '<label class="field full">خيارات الاستطلاع (كل خيار في سطر، من 2 إلى 6)<textarea name="poll_options" maxlength="700" placeholder="الخيار الأول&#10;الخيار الثاني&#10;الخيار الثالث"></textarea></label>'+
 '<label class="field full">الإجابة الصحيحة (للمسابقة فقط، اتركها فارغة للاستطلاع)<input name="correct_answer" maxlength="500"></label>'+
 '<button class="btn btn-primary" type="button" data-owner-contest-save>نشر الإعلان أو الاستطلاع</button><span class="form-msg"></span></form></section>'+
 '<section class="panel"><h2>المسابقات والإجابات</h2><div class="list-rows">'+(rows.length?rows.map(c=>'<article class="row-card"><div class="row-top"><strong>'+esc(c.title)+'</strong><span class="status">'+esc(c.status)+'</span></div><p>'+esc(c.announcement||"")+'</p><p>الموعد: '+date(c.starts_at)+' · الإجابات: '+(c.answers||[]).length+'</p>'+
 (c.question_text?'<p><strong>السؤال:</strong> '+esc(c.question_text)+'</p>':"")+
 '<div class="contest-answers">'+(c.answers||[]).map((x,i)=>'<div class="contest-answer '+(x.is_correct===true?"correct":x.is_correct===false?"incorrect":"")+'"><b>'+(i+1)+'.</b> '+esc(x.answer)+' <span>'+(x.is_correct===true?"✅ صحيح":x.is_correct===false?"✖ خطأ":"بانتظار التصحيح")+'</span><small>'+date(x.created_at)+'</small></div>').join("")+'</div>'+
 (c.status!=="closed"?'<button class="btn btn-outline" data-contest-close="'+esc(c.id)+'">إنهاء المسابقة</button>':"")+'</article>').join(""):'<p>لا توجد مسابقات بعد.</p>')+'</div></section>';
}
function ownerControlCenter(top){
 const conf=state.ownerData?.settings||state.settings;
 const actions=[["features","تشغيل وإيقاف المميزات","تأثير فوري على واجهة الزوار والخادم"],["sections","الأقسام والبنرات","ترتيب المحتوى وأقسام المالك"],["settings","الهوية والتصميم","الألوان والخط والصور العامة"],["users","الحسابات","مراجعة حسابات البائعين"],["contests","المجتمع","المسابقات والأسئلة"]];
 return top+'<section class="panel owner-command-center"><div class="owner-section-title"><div><span class="eyebrow">DEELA CONTROL ROOM</span><h2>لوحة التحكم الشاملة</h2><p>إدارة تشغيل الموقع ورسائله وأقسامه من لوحة المالك.</p></div><span class="status">مالك المنصة</span></div><div class="owner-command-grid">'+actions.map(([key,title,desc])=>'<button type="button" class="owner-command-card" data-owner-tab="'+key+'"><strong>'+esc(title)+'</strong><small>'+esc(desc)+'</small><span>فتح الإعدادات ←</span></button>').join("")+'</div></section>'+
 '<form id="ownerControlForm" class="panel"><h2>رسالة الموقع العامة</h2><p>تظهر في الشريط العلوي للزوار ويمكن إفراغها لإخفائها.</p><label class="field full">نص الإعلان<input name="announcement" maxlength="150" value="'+esc(conf.announcement||"")+'" placeholder="رسالة قصيرة للزوار"></label><div class="form-actions"><button class="btn btn-primary" type="submit">حفظ رسالة الموقع</button></div><p class="form-msg" id="ownerControlMessage"></p></form>'+
 '<form id="ownerBroadcastForm" class="panel"><h2>إرسال إشعار داخل الموقع</h2><p>يصل إلى مركز الإشعارات للمستخدمين المسجلين. ويمكنك تفعيل إشعار المتصفح لمن سبق لهم السماح به.</p><label class="field full">عنوان الإشعار<input name="title" maxlength="120" required placeholder="مثال: وصل إصدار جديد"></label><label class="field full">الرسالة<textarea name="body" maxlength="240" required placeholder="اكتب رسالة واضحة ومختصرة"></textarea></label><label class="field">المستلمون<select name="audience"><option value="all">كل المستخدمين</option><option value="readers">القراء</option><option value="sellers">أصحاب المتاجر</option></select></label><label class="checkbox-field full"><input type="checkbox" name="send_push"> إرسال إشعار متصفح للأجهزة التي فعّلت الإشعارات</label><div class="form-actions full"><button class="btn btn-primary" type="submit">إرسال الإشعار</button></div><p class="form-msg" id="broadcastMessage"></p></form>';
}
function ownerPage(){
 const tab=state.ownerTab;
 const tabs=[
  ["overview","الرئيسية والإحصائيات"],["control","لوحة التحكم الشاملة"],["features","تشغيل المميزات"],
  ["sections","الأقسام والبنرات"],["payments","المدفوعات"],["paid-requests","اشتراكات البائعين"],["users","الحسابات"],
  ["sellers","المؤلفون والمتاجر"],["listings","إدارة الكتب والعروض"],
  ["orders","الطلبات والمبيعات"],["contests","المجتمع والمسابقات"],["alerts","تنبيهات الإطلاق"],["reports","التقييمات والبلاغات"],
  ["settings","الهوية والإعدادات"]
 ];
 const top=heading("مركز قيادة DEELA Books","كل إعدادات الكتب، المؤلفين، القراء والمبيعات في لوحة واحدة.","DEELA CONTROL CENTER")+
 '<div class="owner-private-banner"><div><strong>🔒 المنصة في الوضع الخاص</strong><p>تقدر تضيف الكتب وتجرب المميزات؛ النشر للعامة محجوب على مستوى الخادم حتى تصرح بذلك.</p></div>'+
 '<div class="owner-status-tags"><span>الموقع خاص</span><span>الدفع الآلي مغلق</span><span>الشحن غير متاح</span></div></div>'+
 '<details class="owner-tools-menu" '+(tab!=="overview"?"open":"")+'><summary>خيارات المالك داخل المتجر <span>إعداد القسم والكتب والحسابات</span></summary><div class="owner-tools-grid">'+tabs.map(([key,label])=>
 '<button class="owner-tool-link '+(tab===key?"active":"")+'" data-owner-tab="'+key+'">'+esc(label)+'</button>').join("")+'</div></details>';
 if(tab==="control")return ownerControlCenter(top);
 if(tab==="overview"){
  const d=state.ownerData||{};
  const metrics=[["المؤلفون والمتاجر",d.shops],["متاجر تنتظر الموافقة",d.pending_shops],
   ["إجمالي الكتب",d.books],["كتب تنتظر النشر",d.pending_books],
   ["الكتب المعتمدة",d.published_books],["إجمالي الطلبات",d.orders],
   ["طلبات قيد المراجعة",d.pending_orders],["البلاغات المفتوحة",d.open_reports],
   ["الإعجابات",d.likes],["المتابعون",d.followers],
   ["التقييمات",d.reviews],["الرسائل",d.messages]];
  return top+'<div class="summary-grid owner-metrics">'+metrics.map(([label,value])=>
   '<div class="metric"><small>'+esc(label)+'</small><strong>'+Number(value||0)+'</strong></div>').join("")+'</div>'+
  '<section class="panel owner-revenue"><div class="owner-revenue-intro"><div><h2>إجمالي مبالغ الدفع المؤكدة يدويًا</h2>'+
  '<strong>'+sar(d.confirmed_amount_sar||0)+'</strong><p>يعرض الطلبات التي سجل المالك استلام قيمتها بالفعل، وليس تحصيلًا من بوابة دفع.</p>'+
  (d.confirmed_amount_limited?'<p>الأرقام محدودة بآخر 1000 طلب مؤكد.</p>':"")+
  '</div><span class="owner-revenue-icon">▥</span></div></section>'+
  '<section class="panel"><h2>عمليات سريعة</h2><p>تفتح لك الأدوات المهمة مباشرة، وكل زر متصل بالعمليات الفعلية.</p>'+
  '<div class="owner-quick-actions">'+[
   ["features","⚙ تشغيل وإيقاف الميزات"],["sellers","✦ اعتماد متجر"],
   ["listings","▤ مراجعة رواية"],["orders","◈ متابعة الطلبات"],
   ["reports","★ إدارة المراجعات"],["settings","◇ تعديل الواجهة"]
  ].map(([target,label])=>'<button type="button" class="btn btn-outline" data-owner-tab="'+target+'">'+label+'</button>').join("")+
  '</div></section>';
 }
 if(tab==="paid-requests"){
  const d=state.ownerData||{},subs=d.subscriptions||[],promos=d.promotions||[],pending=[...subs.filter(x=>x.status==="pending").map(x=>({...x,kind:"subscription"})),...promos.filter(x=>x.status==="pending").map(x=>({...x,kind:"promotion"}))];
  return top+'<section class="panel"><h2>طلبات الباقات والترويج</h2><p>راجع التحويل خارج الموقع، ثم اضغط تأكيد الدفع لتفعيل الميزة فعليًا. لا توجد بوابة دفع إلكترونية.</p><div class="list-rows">'+(pending.length?pending.map(x=>'<article class="row-card"><div class="row-top"><div><strong>'+esc(x.deela_books_sellers?.shop_name||"متجر")+' · '+(x.kind==="subscription"?"باقة "+esc(x.tier_key.toUpperCase()):"ترويج "+esc(x.deela_books_listings?.title||"منتج"))+'</strong><p>'+esc(x.term_key||({day:"يوم",week:"7 أيام",month:"30 يومًا"}[x.plan_key]||x.plan_key))+' · '+sar(x.price_sar)+' · '+date(x.requested_at)+'</p></div><span class="status">بانتظار التأكيد</span></div><div class="form-actions"><button type="button" class="btn btn-primary" data-paid-request-review="'+esc(x.id)+'" data-kind="'+x.kind+'" data-decision="confirm">تأكيد الدفع والتفعيل</button><button type="button" class="btn btn-outline" data-paid-request-review="'+esc(x.id)+'" data-kind="'+x.kind+'" data-decision="reject">رفض الطلب</button></div></article>').join(""):'<p class="empty-state">لا توجد طلبات بانتظار المراجعة.</p>')+'</div><h3>الطلبات السابقة</h3><div class="list-rows">'+[...subs.filter(x=>x.status!=="pending").map(x=>({...x,kind:"باقة "+x.tier_key})),...promos.filter(x=>x.status!=="pending").map(x=>({...x,kind:"ترويج "+(x.deela_books_listings?.title||"")}))].map(x=>'<article class="row-card"><div class="row-top"><strong>'+esc(x.deela_books_sellers?.shop_name||"متجر")+' · '+esc(x.kind)+'</strong><span class="status">'+esc(x.status)+'</span></div><p>'+sar(x.price_sar)+' · '+date(x.requested_at)+'</p></article>').join("")+'</div></section>';
 }
 if(tab==="features"){
  const conf=state.ownerData?.settings||state.settings;
  return top+'<form class="owner-features" id="featuresForm">'+
  '<div class="owner-locked-panel"><strong>مفاتيح مقفلة للحماية</strong><p>🌍 النشر للعامة: مغلق · 💳 بوابة الدفع الإلكتروني: غير مفعلة · 🚚 الشحن: مستبعد حاليًا</p>'+
  '<small>هذه الثلاثة لا يمكن فتحها من لوحة المميزات قبل موافقتك على إطلاق الموقع وربط الخدمات.</small></div>'+
  FEATURE_GROUPS.map(g=>ownerFeatureGroup(g,conf)).join("")+
  '<div class="owner-save-bar"><div><strong>التحكم المباشر</strong><p>تعطيل أي ميزة يمنع استخدامها من واجهة القراء وكذلك من الخادم.</p></div>'+
  '<button class="btn btn-primary" type="submit">حفظ وتطبيق المميزات</button></div><p class="form-msg" id="featuresMessage"></p></form>';
 }
 if(tab==="sections")return top+managedOwnerTabs();
 if(tab==="payments")return top+paymentOwnerPanel();
 if(tab==="alerts")return top+ownerLaunchAlertsPanel();
 if(tab==="contests")return top+ownerContestsPanel();
 if(tab==="users")return top+accountOwnerPanel();
 if(tab==="sellers"){
  const arr=state.ownerData?.sellers||[];
  return top+'<div class="panel"><div class="owner-section-title"><div><h2>طلبات المؤلفين والمتاجر</h2><p>اعتماد أو تعليق أو رفض كل متجر على حدة.</p></div><span class="status">'+arr.length+' متجر</span></div>'+
  '<div class="owner-filter-box"><input type="search" class="owner-search" placeholder="ابحث عن اسم المؤلف أو المتجر…"></div>'+
  '<div class="list-rows">'+(arr.length?arr.map(x=>'<div class="row-card" data-owner-row data-owner-state="'+esc(x.status)+'"><div class="row-top"><div><h3>'+esc(x.shop_name)+'</h3>'+
  '<p>'+esc(x.slug)+' · '+esc(x.city||"المدينة غير محددة")+'</p></div><span class="status '+(x.status==="approved"?"":"muted")+'">'+esc(statusNames[x.status]||x.status)+'</span></div>'+
  '<div class="toolbar">'+[["approved","اعتماد المتجر"],["rejected","رفض"],["suspended","تعليق المتجر"]].map(([v,label])=>
   '<button class="btn '+(v==="approved"?"btn-primary":"btn-outline")+'" data-seller-status="'+esc(x.id)+'" data-status="'+v+'">'+esc(label)+'</button>').join("")+
  '</div></div>').join(""):'<p class="empty-state">ما فيه طلبات لفتح متاجر حاليًا.</p>')+'</div></div>'+(state.ownerSellersHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-owner-sellers>تحميل المزيد من المتاجر</button></div>':"");
 }
 if(tab==="listings"){
  const arr=state.ownerData?.listings||[];
  return top+'<div class="panel"><div class="owner-section-title"><div><h2>إدارة الكتب والروايات</h2><p>مراجعة المحتوى والسعر والموافقة، وإضافة الكتب المعتمدة إلى المميزة.</p></div><span class="status">'+arr.length+' كتاب</span></div>'+
  '<div class="owner-filter-box"><input type="search" class="owner-search" placeholder="ابحث عن الرواية أو المؤلف…">'+
  '<select id="ownerStatusFilter"><option value="all">جميع الحالات</option><option value="pending">بانتظار الموافقة</option>'+
  '<option value="published">منشورة</option><option value="rejected">مرفوضة</option><option value="archived">مخفية</option></select></div>'+
  '<div class="list-rows">'+(arr.length?arr.map(b=>
  '<div class="row-card" data-owner-row data-owner-state="'+esc(b.status)+'"><div class="row-top"><div><h3>'+esc(b.title)+'</h3>'+
  '<p>'+esc(b.author||b.deela_books_sellers?.shop_name||"")+' · '+esc(kinds[b.format])+' · '+sar(b.price_sar)+'</p>'+
  '<div class="community-strip"><span class="like-chip">♥ '+Number(b.like_count||0)+' إعجاب</span><span class="rating-chip">★ '+(b.review_count?Number(b.average_rating||0).toFixed(1):"جديد")+'</span></div></div>'+
  '<span class="status '+(b.status==="published"?"":"muted")+'">'+esc(statusNames[b.status]||b.status)+'</span></div>'+
  '<p>'+esc((b.description||"").slice(0,250))+'</p>'+(b.format!=="physical"?'<button class="btn btn-soft" data-reader="'+esc(b.id)+'">معاينة محتوى الكتاب كمالك</button>':"")+'<p>القسم الحالي: <strong>'+esc(b.category||"—")+'</strong> · المشاهدات: '+Number(b.view_count||0)+'</p>'+
  '<div class="toolbar"><select data-listing-category="'+esc(b.id)+'" aria-label="القسم الصحيح للرواية">'+categoryOptions().filter(c=>c!=="الكل").map(c=>'<option '+(b.category===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select><button class="btn btn-soft" data-move-category="'+esc(b.id)+'">نقل للقسم المختار</button></div>'+
  (b.subtitle?'<p><strong>العنوان الفرعي: </strong>'+esc(b.subtitle)+'</p>':"")+
  '<div class="toolbar">'+
  '<button class="btn btn-primary" data-owner-status="'+esc(b.id)+'" data-status="published">اعتماد ونشر</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="rejected">رفض</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="archived">إخفاء</button>'+
  (enabled("enable_featured_section")&&b.status==="published"?'<button class="btn btn-soft" data-feature-book="'+esc(b.id)+'" data-feature-status="'+esc(b.status)+'" data-featured="'+(b.featured===true?"false":"true")+'">'+
  (b.featured?"★ إزالة من المميزة":"☆ تمييز الرواية")+'</button>':"")+
  '</div></div>').join(""):'<p class="empty-state">لا توجد كتب في لوحة المراجعة حاليًا.</p>')+'</div></div>'+(state.ownerListingsHasMore?'<div class="pagination-control"><button class="btn btn-outline" data-load-owner-listings>تحميل المزيد من الكتب</button></div>':"");
 }
 if(tab==="orders"){
  const arr=state.ownerData?.orders||[];
  return top+'<div class="panel"><div class="owner-section-title"><div><h2>الطلبات وحالات الدفع</h2><p>تحديث الحالة والتتبع والتأكيد اليدوي للدفع. لم نربط أي بوابة دفع بعد.</p></div><span class="status">'+arr.length+' طلب</span></div>'+
  '<div class="owner-filter-box"><input type="search" class="owner-search" placeholder="ابحث برقم الطلب أو البريد…"></div>'+
  '<div class="list-rows">'+(arr.length?arr.map(o=>
  '<div class="row-card" data-owner-row data-owner-state="'+esc(o.status)+'"><div class="row-top"><div><h3>'+esc(o.code)+'</h3><p>'+esc(o.buyer_email)+' · '+date(o.created_at)+'</p></div>'+
  '<span class="status">'+esc(statusNames[o.status]||o.status)+'</span></div>'+
  '<p>إجمالي الطلب: '+sar(o.total_sar)+' · الجوال: '+esc(o.phone||"—")+'</p>'+
  '<p>'+(o.deela_books_order_items||[]).map(x=>esc(x.title_snapshot)+' × '+x.quantity).join(" · ")+'</p>'+
  (o.support_status&&o.support_status!=="none"?'<section class="order-support-status"><strong>طلب مساعدة · '+esc(({open:"مفتوح",investigating:"قيد المتابعة",resolved:"تم الحل",rejected:"مرفوض"}[o.support_status])||o.support_status)+'</strong><p>'+esc(o.support_reason||"")+' — '+esc(o.support_message||"")+'</p>'+(o.support_resolution?'<p>رد المسؤول: '+esc(o.support_resolution)+'</p>':"")+'<button class="btn btn-outline" data-resolve-order-support="'+esc(o.id)+'">تحديث ومراسلة العميل</button></section>':'')+
  '<label class="field">حالة الطلب<select data-order-state="'+esc(o.id)+'">'+Object.entries(statusNames).filter(([key])=>
   ["pending_review","awaiting_payment","paid","preparing","delivered","cancelled"].includes(key)).map(([key,label])=>
   '<option value="'+key+'" '+(o.status===key?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select></label>'+
  '<label class="field">ملاحظة للعميل<textarea data-owner-note="'+esc(o.id)+'">'+esc(o.owner_note||"")+'</textarea></label>'+
  '<label class="checkfield"><input type="checkbox" data-paid="'+esc(o.id)+'">أؤكد أني استلمت القيمة الحقيقية لهذا الطلب بالفعل.</label>'+
  '<div class="form-actions"><button class="btn btn-primary" data-save-order="'+esc(o.id)+'">حفظ حالة الطلب</button></div></div>').join(""):'<p class="empty-state">لا توجد طلبات حتى الآن.</p>')+'</div></div>';
 }
 if(tab==="reports"){
  const d=state.ownerData||{};
  return top+'<section class="panel"><h2>البلاغات</h2><p>أي بلاغ على محتوى أو كتاب يراجع هنا.</p><div class="list-rows">'+
  (d.reports?.length?d.reports.map(r=>'<div class="row-card"><p>'+esc(r.reason)+'</p><span class="status">'+esc(r.status)+'</span><div class="toolbar">'+
   '<button class="btn btn-outline" data-report-status="'+esc(r.id)+'" data-status="resolved">تمت المعالجة</button>'+
   '<button class="btn btn-outline" data-report-status="'+esc(r.id)+'" data-status="dismissed">رفض البلاغ</button></div></div>').join(""):'<p>لا توجد بلاغات حاليًا.</p>')+'</div></section>'+
  '<section class="panel"><h2>مراجعات وتقييمات القراء</h2><p>تظهر فقط مراجعات المشترين بعد التسليم، ويعتمدها المالك قبل الظهور.</p><div class="list-rows">'+
  (d.reviews?.length?d.reviews.map(r=>
   '<div class="row-card"><div class="row-top"><strong>'+("★".repeat(r.rating))+'</strong>'+
   '<span class="status '+(r.approved?"":"muted")+'">'+(r.approved?"معتمدة":"معلقة")+'</span></div><p>'+esc(r.body)+'</p>'+
   '<div class="toolbar"><button class="btn btn-primary" data-review-status="'+esc(r.id)+'" data-approved="true">اعتماد</button>'+
   '<button class="btn btn-outline" data-review-status="'+esc(r.id)+'" data-approved="false">إخفاء</button></div></div>').join(""):'<p>لا توجد تقييمات بعد.</p>')+'</div></section>';
 }
 if(tab==="settings"){
  const conf=state.ownerData?.settings||state.settings;
  return top+'<form class="panel owner-settings" id="settingsForm"><h2>الهوية والعروض والعمولة</h2>'+
  '<p>غيّر عناوين الموقع وصفه ورسالة الإعلان ووسيلة التواصل دون تعديل أي كود.</p>'+
  '<div class="owner-settings-accordions">'+
  '<details class="owner-setting-accordion"><summary><span>الألوان والخامة</span><small>ألوان المتجر وخلفيته</small></summary><div class="form-grid settings-accordion-body">'+themeFields(conf)+materialFields(conf)+'</div></details>'+
  '<details class="owner-setting-accordion"><summary><span>التصميم والخط</span><small>استدارة البطاقات وحجم الخط وحركة البنر</small></summary><div class="form-grid settings-accordion-body">'+designFields(conf)+'</div></details>'+
  '<details class="owner-setting-accordion"><summary><span>صور الموقع العامة</span><small>الشعار والخلفية والصورة الرئيسية</small></summary><div class="form-grid settings-accordion-body">'+imageFields(conf)+'</div></details>'+
  '<details class="owner-setting-accordion"><summary><span>بيانات الموقع والعروض</span><small>الاسم والعروض وروابط التواصل والعمولة</small></summary><div class="form-grid settings-accordion-body">'+field("اسم المنصة","name","text",true,"DEELA Books",conf.name||"DEELA Books")+
  field("عنوان الواجهة الرئيسية","hero_title","text",true,"لكل كتاب حكاية",conf.hero_title||"")+
  
  field("عنوان الحملة أو العرض","home_promo_title","text",false,"أحدث إصدارات ديلا",conf.home_promo_title||"")+
  field("رابط الدعم الآمن HTTPS","support_url","url",false,"https://...",conf.support_url||"")+
  field("بريد التواصل","contact_email","email",false,"contact@example.com",conf.contact_email||"")+
  field("عمولة المنصة (%)","commission_percent","number",false,"10",conf.commission_percent??10)+
  field("سعر إعلان إطلاق الرواية (ريال) · صفر لإيقاف الخدمة","launch_alert_price_sar","number",false,"مثال: 25",conf.launch_alert_price_sar??0)+
  '<label class="field full">الوصف الرئيسي<textarea name="hero_subtitle">'+esc(conf.hero_subtitle||"")+'</textarea></label>'+
  '<label class="field full">تفاصيل الحملة أو العرض<textarea name="home_promo_description">'+esc(conf.home_promo_description||"")+'</textarea></label>'+
  '</div></details></div><div class="owner-locked-panel"><strong>سياسة الخصوصية الحالية</strong>'+
  '<p>🔒 الموقع غير منشور للعامة، والشحن غير متاح والدفع الإلكتروني غير مفعّل.</p></div>'+
  '<div class="form-actions"><button class="btn btn-primary" type="submit">حفظ هوية ديلا والإعلانات</button>'+
  '<button type="button" class="btn btn-outline" data-owner-tab="features">إعدادات تشغيل المميزات</button></div>'+
  '<p id="settingsMessage" class="form-msg"></p></form>';
 }
 return top;
}
async function ownerData(){
 if(!state.me?.is_owner)return;
 let tab=state.ownerTab;
 if(tab==="overview")state.ownerData=await api("/owner/overview");
 if(tab==="control")state.ownerData=await api("/owner/settings");
 if(tab==="sellers"){state.ownerSellersOffset=0;const r=await api("/owner/sellers?limit=40&offset=0");state.ownerData=r;state.ownerSellersOffset=r.next_offset||((r.sellers||[]).length);state.ownerSellersHasMore=!!r.has_more;}
 if(tab==="listings"){state.ownerListingsOffset=0;const r=await api("/owner/listings?limit=40&offset=0");state.ownerData=r;state.ownerListingsOffset=r.next_offset||((r.listings||[]).length);state.ownerListingsHasMore=!!r.has_more;}
 if(tab==="orders")state.ownerData=await api("/owner/orders");
 if(tab==="reports")state.ownerData=await api("/owner/reports");
 if(tab==="features"||tab==="settings")state.ownerData=await api("/owner/settings");
 if(tab==="sections"){const [sections,banners]=await Promise.all([api("/owner/sections"),api("/owner/banners")]);state.ownerData={...sections,...banners};}
 if(tab==="payments")state.ownerData=await api("/owner/payments");
 if(tab==="paid-requests")state.ownerData=await api("/owner/paid-requests");
 if(tab==="users"){state.ownerUsersOffset=0;const [users,tierData]=await Promise.all([api("/owner/users?limit=40&offset=0"),api("/owner/member-tiers")]);state.ownerData={...users,tiers:tierData.tiers||{}};state.ownerUsersOffset=users.next_offset||((users.users||[]).length);state.ownerUsersHasMore=!!users.has_more;}
 if(tab==="alerts")state.ownerData=await api("/owner/launch-alerts");
 if(tab==="contests")state.ownerContests=(await api("/owner/contests")).contests||[];
}
let sellerDataCacheAt=0;
async function sellerData(){
 if(Date.now()-sellerDataCacheAt<15000&&(state.sellerListings.length||state.sellerPaidRequests))return;
 const [r,n,a,promo,orders,paid]=await Promise.all([api("/my/listings?limit=40&offset=0"),api("/seller/notifications"),api("/seller/launch-alerts"),api("/seller/promotions"),api("/seller/orders"),api("/seller/paid-requests")]);state.sellerPaidRequests=paid;state.sellerListings=r.listings||[];state.sellerListingsOffset=r.next_offset||state.sellerListings.length;state.sellerListingsHasMore=!!r.has_more;state.sellerNotifications=n.notifications||[];state.sellerLaunchAlerts=a.campaigns||[];state.launchAlertPrice=Number(a.price_sar||0);state.sellerPromotions=promo.promotions||[];state.sellerOrders=orders.orders||[];state.sellerMetrics=orders.metrics||{};sellerDataCacheAt=Date.now();
 if(!state.sellerNotificationsReady){state.sellerNotificationIds=new Set(state.sellerNotifications.map(x=>x.id));state.sellerNotificationsReady=true;}
}
async function pollLaunchAlerts(){
 if(!state.token)return;
 try{
  const r=await api("/launch-alerts/feed"),items=r.alerts||[];
  if(!state.launchAlertsReady){state.launchAlertIds=new Set(items.map(x=>x.id));state.launchAlertFeed=items;state.launchAlertsReady=true;return;}
  const fresh=items.filter(x=>!state.launchAlertIds.has(x.id));for(const x of items)state.launchAlertIds.add(x.id);state.launchAlertFeed=items;
  if(fresh.length){const a=fresh[0],title=a.deela_books_listings?.title||"كتاب جديد",body=(a.deela_books_sellers?.shop_name||"أحد المؤلفين")+" نشر كتابًا جديدًا";toast(title+" · "+body);if("Notification" in window&&Notification.permission==="granted"){const n=new Notification("إطلاق كتاب جديد",{body:title+" — "+body,tag:"deela-books-launch-"+a.id});n.onclick=()=>{window.focus();route("alerts",false);n.close()};}if(state.view==="alerts")await route("alerts",false);}
 }catch{}
}
function startLaunchAlertPolling(){if(state.launchAlertTimer)clearInterval(state.launchAlertTimer);void pollLaunchAlerts();state.launchAlertTimer=setInterval(pollLaunchAlerts,60000);}
function launchAlertsPage(){
 const rows=state.launchAlertFeed||[];
 return heading("تنبيهات إطلاق الكتب","إعلانات الكتب والروايات الجديدة بعد اعتماد الدفع.","DEELA BOOK ALERTS")+'<section class="panel"><p>الإشعارات التلقائية تظهر أثناء فتح التطبيق. إشعارات الهاتف في الخلفية تتطلب ربط خدمة Push.</p><div class="list-rows">'+(rows.length?rows.map(a=>'<article class="row-card"><div class="row-top"><div><h3>'+esc(a.deela_books_listings?.title||"كتاب جديد")+'</h3><p>'+esc(a.deela_books_sellers?.shop_name||"مؤلف ديلا")+' · '+esc(a.deela_books_listings?.category||"كتب")+'</p></div><small>'+date(a.published_at)+'</small></div><button class="btn btn-outline" data-book="'+esc(a.listing_id)+'">عرض الكتاب</button></article>').join(""):'<p class="empty-state">لا توجد إعلانات كتب جديدة حتى الآن.</p>')+'</div>'+("Notification" in window&&Notification.permission!=="granted"?'<button class="btn btn-outline" data-enable-launch-notifications>تفعيل إشعارات هذا المتصفح</button>':"")+'</section>';
}
async function pollSellerNotifications(){
 if(!state.token||!state.me)return;
 try{
  const r=await api("/seller/notifications"),items=r.notifications||[];
  if(!state.sellerNotificationsReady){state.sellerNotificationIds=new Set(items.map(x=>x.id));state.sellerNotifications=items;state.sellerNotificationsReady=true;updateNotificationBadge();return;}
  const fresh=items.filter(x=>!state.sellerNotificationIds.has(x.id));
  for(const x of items)state.sellerNotificationIds.add(x.id);
  state.sellerNotifications=items;updateNotificationBadge();
  if(fresh.length){
   toast(fresh.length===1?fresh[0].title:"لديك "+fresh.length+" تنبيهات جديدة للبائع");
   if("Notification" in window&&Notification.permission==="granted"){
    const n=fresh[0];const notice=new Notification(n.title,{body:n.body,tag:"deela-books-"+n.id});notice.onclick=()=>{window.focus();route("seller",false);notice.close()};
   }
   if(state.view==="seller")await route("seller",false);else if(state.view==="notifications")await route("notifications",false);
  }
 }catch{}
}
function startSellerNotificationPolling(){
 if(state.sellerNotificationTimer)clearInterval(state.sellerNotificationTimer);
 void pollSellerNotifications();
 state.sellerNotificationTimer=setInterval(pollSellerNotifications,60000);
}
function pushKeyBytes(value){
 const padded=String(value).replace(/-/g,"+").replace(/_/g,"/")+"===".slice((String(value).length+3)%4);
 const raw=atob(padded);return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function enableSellerNotifications(){
 if(!("Notification" in window))return toast("هذا المتصفح لا يدعم إشعارات المواقع");
 try{
  const permission=await Notification.requestPermission();
  if(permission!=="granted")return toast(permission==="denied"?"ارفض المتصفح الإذن؛ فعّله من إعدادات الموقع.":"لم يتم تفعيل الإشعارات.");
  if(!("serviceWorker" in navigator)||!("PushManager" in window))return toast("تم السماح بإشعارات المتصفح، لكن هذا الجهاز لا يدعم تنبيهات الخلفية.");
  const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
  await navigator.serviceWorker.ready;
  const config=await api("/push/key");
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(config.public_key)});
  await api("/push/subscribe",{method:"POST",data:subscription.toJSON()});
  toast("تم تفعيل إشعارات الخلفية لهذا الجهاز.");
  if(state.view==="seller")await route("seller",false);
 }catch(e){toast(errorMessage(e)||"تعذر تفعيل إشعارات الخلفية");}
}
async function messagesData(){
 const r=await api("/messages");return r.messages||[];
}
function routeMarkup(view){
 let markup=view==="catalog"?catalogPage():view==="detail"?detailPage():view==="shops"?shopsPage():
  view==="shop"?shopPage():view==="subscriptions"?subscriptionsPage():view==="favorites"?favoritesPage():view==="cart"?cartPage():
  view==="orders"?ordersPage():view==="seller"?sellerPage():view==="alerts"?launchAlertsPage():view==="notifications"?notificationsPage():view==="profile"?accountPage():view==="owner"?ownerPage():"";
 if(view==="messages")markup=messagesPage(state.messages||[]);
 if(view==="owner")markup+=accountLogoutPanel();
 return markup;
}
function paintRoute(view,routeId){
 if(routeId!==window.__deelaRouteId)return;
 $("pageContent").innerHTML=routeMarkup(view);
 if(view==="catalog"){
  $("productTypeFilter").value=state.productType;$("nearbyRadius").value=String(state.radiusKm);
  $("formatFilter").value=state.format;$("sortFilter").value=state.sort;$("priceSortFilter").value=state.priceOrder;
  $("conditionFilter").value=state.condition;$("cityFilter").value=state.cityFilter;
 }
}
async function route(view,push=true){
 const routeId=(window.__deelaRouteId=(window.__deelaRouteId||0)+1);
 if(!state.token&&!("home,catalog,shops,shop,detail,subscriptions".split(",").includes(view))){openLogin();return}
 if(view==="owner"&&!state.me?.is_owner){toast("مركز الإدارة خاص بالمالك");return}
 state.view=view;state.current=state.current||"";
 const topMenu=$("topMenu");if(topMenu){if(view!=="home")topMenu.open=false;topMenu.hidden=view!=="home";}
 if(view!=="shop"&&view!=="detail")applyPublicStorePageTheme("");
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===view));
 $("home").classList.toggle("active",view==="home");$("home").hidden=view!=="home";
 $("dynamicPage").hidden=view==="home";$("dynamicPage").classList.toggle("active",view!=="home");
 if(push)history.replaceState(null,"","#"+(view==="detail"?"book/"+state.current:view));
 let refresh=Promise.resolve();
 if(view==="home")renderHome();
 else{
  paintRoute(view,routeId);
  refresh=(async()=>{
   try{
    if(view==="shop"&&state.shopLoadedSlug!==state.current){
     state.shopListings=[];state.shopBooksOffset=0;
     const shopBooks=await api("/catalog?limit=24&offset=0&shop="+encodeURIComponent(state.current));
     state.shopListings=shopBooks.listings||[];state.shopBooksOffset=shopBooks.next_offset||state.shopListings.length;
     state.shopBooksHasMore=!!shopBooks.has_more;state.shopLoadedSlug=state.current;
    }
    if(view==="subscriptions"&&state.me?.seller)state.sellerPaidRequests=await api("/seller/paid-requests");
    else if((view==="seller"||view==="profile")&&state.me?.seller)await sellerData();
    if(view==="notifications"){const r=await api("/seller/notifications");state.sellerNotifications=r.notifications||[];updateNotificationBadge();}
    if(view==="alerts"){const d=await api("/launch-alerts/feed");state.launchAlertFeed=d.alerts||[];for(const x of state.launchAlertFeed)state.launchAlertIds.add(x.id);state.launchAlertsReady=true;}
    if(view==="orders"){const d=await api("/orders");state.orders=d.orders||[];}
    if(view==="owner")await ownerData();
    if(view==="messages")state.messages=enabled("enable_messages")?await messagesData():[];
    if(routeId!==window.__deelaRouteId)return;
    paintRoute(view,routeId);
    if(view==="detail")trackBookView(state.current);
   }catch(e){if(routeId===window.__deelaRouteId)toast(errorMessage(e));}
  })();
 }
 window.scrollTo({top:0,behavior:"instant"});
 return refresh;
}async function loadMoreSellerBooks(){if(!state.sellerListingsHasMore)return;const btn=document.querySelector("[data-load-seller-books]");if(btn)btn.disabled=true;const y=window.scrollY;try{const r=await api("/my/listings?limit=40&offset="+state.sellerListingsOffset);state.sellerListings.push(...(r.listings||[]));state.sellerListingsOffset=r.next_offset??state.sellerListings.length;state.sellerListingsHasMore=!!r.has_more;$("pageContent").innerHTML=sellerPage();window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreCatalog(){if(!state.catalogHasMore)return;const btn=document.querySelector("[data-load-catalog]");if(btn)btn.disabled=true;const y=window.scrollY;try{const r=await api("/catalog?limit=24&offset="+state.catalogOffset);state.listings.push(...(r.listings||[]));state.catalogOffset=r.next_offset??state.listings.length;state.catalogHasMore=!!r.has_more;await route("catalog",false);window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreShopBooks(){if(!state.shopBooksHasMore)return;const btn=document.querySelector("[data-load-shop-books]");if(btn)btn.disabled=true;const y=window.scrollY;try{const r=await api("/catalog?limit=24&offset="+state.shopBooksOffset+"&shop="+encodeURIComponent(state.current));state.shopListings.push(...(r.listings||[]));state.shopBooksOffset=r.next_offset??state.shopListings.length;state.shopBooksHasMore=!!r.has_more;await route("shop",false);window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreShops(){if(!state.shopsHasMore)return;const btn=document.querySelector("[data-load-shops]");if(btn)btn.disabled=true;const y=window.scrollY;try{const r=await api("/shops?limit=24&offset="+state.shopsOffset);state.shops.push(...(r.shops||[]));state.shopsOffset=r.next_offset??state.shops.length;state.shopsHasMore=!!r.has_more;await route("shops",false);window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreOwnerSellers(){if(!state.ownerSellersHasMore)return;const y=window.scrollY;try{const r=await api("/owner/sellers?limit=40&offset="+state.ownerSellersOffset);state.ownerData.sellers.push(...(r.sellers||[]));state.ownerSellersOffset=r.next_offset??state.ownerData.sellers.length;state.ownerSellersHasMore=!!r.has_more;$("pageContent").innerHTML=ownerPage()+accountLogoutPanel();window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreOwnerListings(){if(!state.ownerListingsHasMore)return;const y=window.scrollY;try{const r=await api("/owner/listings?limit=40&offset="+state.ownerListingsOffset);state.ownerData.listings.push(...(r.listings||[]));state.ownerListingsOffset=r.next_offset??state.ownerData.listings.length;state.ownerListingsHasMore=!!r.has_more;$("pageContent").innerHTML=ownerPage()+accountLogoutPanel();window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
async function loadMoreOwnerUsers(){if(!state.ownerUsersHasMore)return;const btn=document.querySelector("[data-load-owner-users]");if(btn)btn.disabled=true;const y=window.scrollY;try{const r=await api("/owner/users?limit=40&offset="+state.ownerUsersOffset);state.ownerData.users.push(...(r.users||[]));state.ownerUsersOffset=r.next_offset??state.ownerData.users.length;state.ownerUsersHasMore=!!r.has_more;$("pageContent").innerHTML=ownerPage()+accountLogoutPanel();window.scrollTo({top:y,behavior:"instant"})}catch(e){toast(errorMessage(e))}}
function book(id){state.current=id;route("detail")}
function trackBookView(id){
 if(!id||!state.token||!state.listings.some(b=>b.id===id&&b.status==="published"))return;
 const key="deela-books-view-day-"+id,day=new Date().toISOString().slice(0,10);
 if(sessionStorage.getItem(key)===day)return;
 sessionStorage.setItem(key,day);api("/view",{method:"POST",data:{listing_id:id}}).catch(()=>sessionStorage.removeItem(key));
}
function openShop(slug){state.current=slug;state.shopLoadedSlug="";route("shop")}
function cartChange(id,delta){
 if(!enabled("enable_orders")||!enabled("show_book_prices"))return toast("استقبال الطلبات متوقف من لوحة المالك");
 const b=state.listings.find(x=>x.id===id);if(!b||b.status!=="published"||(b.format==="physical"&&b.stock<1))return toast("الكتاب غير متاح للشراء");
 const current=state.cart.find(x=>x.id===id);
 if(current)current.qty=Math.max(0,Math.min(Math.min(b.stock,10),current.qty+delta));
 else if(delta>0){if(b.format==="physical"&&b.pickup_available!==true)return toast("هذا الكتاب الورقي للتصفح فقط حاليًا؛ لا يوجد شحن أو استلام متاح.");state.cart.push({id,qty:1,fulfillment:b.format==="physical"?"pickup":"digital"})}
 state.cart=state.cart.filter(x=>x.qty>0);saveCart();
 if(state.view==="cart")route("cart",false);
 else toast("تم تحديث السلة");
}
async function toggleLike(id){
 if(!enabled("enable_reader_likes"))return toast("الميزة متوقفة من مركز المالك");
 const target=state.listings.find(x=>x.id===id)||state.sellerListings.find(x=>x.id===id);
 if(target&&state.me?.seller?.id&&target.seller_id===state.me.seller.id)return toast("هذا كتابك؛ لا يمكن إضافة إعجاب من حساب الناشر.");
 if(!state.me)return openLogin();
 const liked=!state.me.likes?.includes(id);
 try{
  const result=await api("/like",{method:"POST",data:{listing_id:id,liked}});
  state.me.likes=state.me.likes||[];
  state.me.likes=result.liked?[...state.me.likes.filter(x=>x!==id),id]:state.me.likes.filter(x=>x!==id);
  const b=state.listings.find(x=>x.id===id);
  if(b)b.like_count=result.like_count;
  if(state.view==="home")renderHome();
  else if(["catalog","detail","favorites","shop"].includes(state.view))await route(state.view,false);
  toast(result.liked?"أعجبتك الرواية ♥":"ألغيت الإعجاب");
 }catch(e){toast(errorMessage(e))}
}
async function toggleFollow(id){
 if(state.me?.seller?.id===id)return toast("هذا متجرك؛ لا يمكنك متابعة نفسك");
 if(!enabled("enable_author_follows"))return toast("الميزة متوقفة من مركز المالك");
 if(!state.me)return openLogin();
 const following=!state.me.following?.includes(id);
 try{
  const result=await api("/follow",{method:"POST",data:{seller_id:id,following}});
  state.me.following=state.me.following||[];
  state.me.following=result.following?[...state.me.following.filter(x=>x!==id),id]:state.me.following.filter(x=>x!==id);
  const seller=state.shops.find(x=>x.id===id);
  if(seller)seller.follower_count=result.follower_count;
  if(state.view==="home")renderHome();
  else if(["shops","shop"].includes(state.view))await route(state.view,false);
  toast(result.following?"تتابع المتجر الآن":"ألغيت متابعة المتجر");
 }catch(e){toast(errorMessage(e))}
}
async function toggleFavorite(id){
 if(!enabled("enable_favorites"))return toast("الميزة متوقفة من مركز المالك");
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
 const max=type==="cover"?5242880:type==="branding"?3145728:52428800;
 if(file.size>max)throw Error(type==="cover"?"حجم الغلاف أكثر من 5MB":type==="branding"?"حجم صورة الهوية أكثر من 3MB":"حجم الكتاب أكثر من 50MB");
 const signed=await api("/upload/sign",{method:"POST",data:{type,extension:ext}});
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm");
 const client=createClient(ROOT,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const r=await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type||undefined});
 if(r.error)throw Error("رفع الملف لم ينجح: "+r.error.message);
 return signed.path;
}
let oauthClientPromise;
async function oauthClient(){
 if(!oauthClientPromise)oauthClientPromise=import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm").then(({createClient})=>createClient(ROOT,KEY,{auth:{persistSession:true,storage:window.sessionStorage,storageKey:"deela-books-auth-v1",autoRefreshToken:true,detectSessionInUrl:true}}));
 return oauthClientPromise;
}
async function adoptAuth(data,email="",password=""){
 if(!data?.access_token)throw Error("لم يكتمل تسجيل الدخول");
 state.token=data.access_token;state.refreshToken=data.refresh_token||"";sessionStorage.setItem("deela-books-token",state.token);if(state.refreshToken)sessionStorage.setItem("deela-books-refresh",state.refreshToken);
 if(email&&$("rememberPassword")?.checked){localStorage.setItem("deela-books-saved-email",email);try{if(password&&window.PasswordCredential&&navigator.credentials?.store)await navigator.credentials.store(new PasswordCredential({id:email,password,name:"DEELA Books"}))}catch{}}
 closeLogin();await reload();startSellerNotificationPolling();startLaunchAlertPolling();
}
async function login(ev){
 ev.preventDefault();const form=$("loginForm"),submit=form.querySelector('button[type="submit"]');submit.disabled=true;setAuthMessage("loginMessage","جارٍ تسجيل الدخول…");
 const email=$("loginEmail").value.trim().toLowerCase(),password=$("loginPassword").value;
 try{const data=await api("/auth/login",{method:"POST",data:{email,password}});await adoptAuth(data,email,password);$("loginPassword").value=""}
 catch(e){setAuthMessage("loginMessage",errorMessage(e),true)}finally{submit.disabled=false}
}
function setAuthMessage(id,text,isError=false){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle("error",isError)}
function switchAuthMethod(mode){
 const phone=mode==="phone";$("phoneAuthPanel").classList.toggle("hidden",!phone);$("emailAuthPanel").classList.toggle("hidden",phone);
 document.querySelectorAll("[data-auth-mode]").forEach(b=>b.classList.toggle("active",b.dataset.authMode===mode));
}
function switchEmailMode(mode){
 const register=mode==="register";$("loginForm").classList.toggle("hidden",register);$("registerForm").classList.toggle("hidden",!register);$("emailVerifyForm").classList.add("hidden");
 document.querySelectorAll("[data-email-mode]").forEach(b=>b.classList.toggle("active",b.dataset.emailMode===mode));
 $("loginHeading").textContent=register?"أنشئ حساب DEELA Books":"أهلًا بك في ديلا";
}
async function sendPhoneCode(ev){
 ev.preventDefault();const button=$("sendPhoneCode");button.disabled=true;setAuthMessage("phoneMessage","جارٍ إرسال رمز التحقق…");
 const entered=$("authPhone").value.replace(/\D/g,"");const phone="+966"+entered;const channel=document.querySelector('[name="phoneChannel"]:checked')?.value||"sms";
 try{const result=await api("/auth/phone/send",{method:"POST",data:{phone,channel}});sessionStorage.setItem("deela-books-pending-phone",result.phone||phone);$("phoneSendForm").classList.add("hidden");$("phoneVerifyForm").classList.remove("hidden");setAuthMessage("phoneVerifyMessage",result.message||"أدخل الرمز المرسل إلى جوالك.")}
 catch(e){setAuthMessage("phoneMessage",errorMessage(e),true)}finally{button.disabled=false}
}
async function verifyPhone(ev){
 ev.preventDefault();const button=ev.currentTarget.querySelector('button[type="submit"]');button.disabled=true;setAuthMessage("phoneVerifyMessage","جارٍ التحقق…");
 const phone=sessionStorage.getItem("deela-books-pending-phone")||("+966"+$("authPhone").value.replace(/\D/g,""));
 try{const data=await api("/auth/phone/verify",{method:"POST",data:{phone,token:$("phoneCode").value.trim()}});sessionStorage.removeItem("deela-books-pending-phone");await adoptAuth(data)}catch(e){setAuthMessage("phoneVerifyMessage",errorMessage(e),true)}finally{button.disabled=false}
}
async function registerEmail(ev){
 ev.preventDefault();const button=ev.currentTarget.querySelector('button[type="submit"]');button.disabled=true;setAuthMessage("registerMessage","جارٍ إنشاء الحساب…");
 const email=$("registerEmail").value.trim().toLowerCase(),password=$("registerPassword").value;
 if(password!==$("registerPasswordAgain").value){setAuthMessage("registerMessage","كلمتا المرور غير متطابقتين",true);button.disabled=false;return}
 try{const data=await api("/auth/register",{method:"POST",data:{email,password}});if(data.access_token){await adoptAuth(data,email,password);return}$("emailVerifyForm").dataset.email=email;$("emailVerifyForm").classList.remove("hidden");$("registerForm").classList.add("hidden");setAuthMessage("emailVerifyMessage",data.message||"تحقق من بريدك لإكمال التسجيل.")}
 catch(e){setAuthMessage("registerMessage",errorMessage(e),true)}finally{button.disabled=false}
}
async function verifyEmail(ev){
 ev.preventDefault();const button=ev.currentTarget.querySelector('button[type="submit"]');button.disabled=true;setAuthMessage("emailVerifyMessage","جارٍ تأكيد بريدك…");
 const email=ev.currentTarget.dataset.email||$("registerEmail").value.trim().toLowerCase();
 try{const data=await api("/auth/verify-email",{method:"POST",data:{email,token:$("emailCode").value.trim()}});await adoptAuth(data,email,$("registerPassword").value)}catch(e){setAuthMessage("emailVerifyMessage",errorMessage(e),true)}finally{button.disabled=false}
}
async function resendPhone(){try{const phone=sessionStorage.getItem("deela-books-pending-phone");const channel=document.querySelector('[name="phoneChannel"]:checked')?.value||"sms";await api("/auth/phone/send",{method:"POST",data:{phone,channel}});setAuthMessage("phoneVerifyMessage","تم طلب رمز جديد.")}catch(e){setAuthMessage("phoneVerifyMessage",errorMessage(e),true)}}
async function resendEmail(){try{const email=$("emailVerifyForm").dataset.email||$("registerEmail").value.trim().toLowerCase();await api("/auth/resend-verification",{method:"POST",data:{email}});setAuthMessage("emailVerifyMessage","إذا كان البريد غير موثّق، أرسلنا رسالة تحقق جديدة.")}catch(e){setAuthMessage("emailVerifyMessage",errorMessage(e),true)}}
async function requestPasswordReset(){const email=$("loginEmail").value.trim();if(!email)return setAuthMessage("loginMessage","أدخل بريدك أولًا ثم اضغط استعادة كلمة المرور.",true);try{const d=await api("/auth/recover",{method:"POST",data:{email}});setAuthMessage("loginMessage",d.message)}catch(e){setAuthMessage("loginMessage",errorMessage(e),true)}}
async function loadAuthProviders(){
 const buttons=[...document.querySelectorAll("[data-oauth]")];try{const d=await api("/auth/providers");
  for(const b of buttons){const active=d.enabled?.[b.dataset.oauth]===true;b.dataset.authEnabled=String(active);b.title=active?"متاح عبر حساب المزود المرتبط":"يلزم ربط بيانات المطوّر في إعدادات Supabase";b.textContent=({google:"Google",apple:"Apple",twitter:"X"}[b.dataset.oauth])+(active?"":" · غير مربوط")}
  const active=buttons.filter(x=>x.dataset.authEnabled==="true").map(x=>x.dataset.oauth);$("authProviderNote").textContent=active.length?"الدخول المفعّل: "+active.map(x=>({google:"Google",apple:"Apple",twitter:"X"}[x])).join("، "):"الزر جاهز، لكن Google وApple لم يُربطا ببيانات المطوّر في Supabase بعد.";
 }catch{$("authProviderNote").textContent="يتطلب الدخول الاجتماعي ربط حساب المطوّر مرة واحدة."}
}
async function oauthLogin(ev){const b=ev.currentTarget,provider=b.dataset.oauth;if(b.dataset.authEnabled!=="true"){toast("يلزم أولًا ربط بيانات "+({google:"Google",apple:"Apple",twitter:"X"}[provider])+" في إعدادات Supabase");return}try{b.disabled=true;const client=await oauthClient();const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(error)throw error}catch(e){toast(errorMessage(e))}finally{b.disabled=false}}
function openLogin(message=""){ $("shade").hidden=false;$("loginModal").hidden=false;switchAuthMethod("email");if(message)setAuthMessage("emailMessage",message,true);void loadAuthProviders(); }
function closeLogin(){$("shade").hidden=true;$("loginModal").hidden=true;}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function saveOwnerContest(form,button){
 if(form.dataset.saving==="true")return;
 const submit=button||form.querySelector('button[data-owner-contest-save],button[type="submit"]');
 const message=form.querySelector(".form-msg");
 const raw=formData(form),title=String(raw.title||"").trim();
 const poll_options=String(raw.poll_options||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(title.length<2){if(message)message.textContent="اكتب اسم المسابقة أولًا.";return toast("اكتب اسم المسابقة أولًا");}
 if(poll_options.length===1||poll_options.length>6){if(message)message.textContent="الاستطلاع يحتاج من خيارين إلى ستة خيارات.";return toast("الاستطلاع يحتاج من خيارين إلى ستة خيارات");}
 let starts_at=null;
 if(raw.starts_at){const parsed=new Date(raw.starts_at);if(Number.isNaN(parsed.getTime())){if(message)message.textContent="موعد المسابقة غير صالح.";return toast("موعد المسابقة غير صالح");}starts_at=parsed.toISOString();}
 form.dataset.saving="true";if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent="جارٍ النشر…";}
 if(message)message.textContent="جارٍ إرسال الإعلان وحفظه…";
 try{
  await api("/owner/contest/save",{method:"POST",data:{...raw,title,starts_at,poll_options}});
  toast(poll_options.length?"تم نشر الاستطلاع وإشعار المستخدمين":"تم نشر إعلان المجتمع وإشعار المستخدمين");
  state.ownerContests=(await api("/owner/contests")).contests||[];
  await route("owner",false);
 }catch(e){if(message)message.textContent=errorMessage(e);toast(errorMessage(e));}
 finally{form.dataset.saving="false";if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalText||"نشر الإعلان أو الاستطلاع";}}
}
async function handleForm(ev){
 const form=ev.target,id=form.id;if(!id||["loginForm","registerForm","phoneSendForm","phoneVerifyForm","emailVerifyForm"].includes(id))return;ev.preventDefault();
 const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
 const raw=formData(form);
 try{
  if(id==="loginForm")return;
  if(id==="memberTiersForm"){
    const tiers={month:[],half_year:[],year:[],prices:{}};for(const key of ["month","half_year","year"]){tiers[key]=[...form.querySelectorAll('input[name="'+key+'"]:checked')].map(x=>x.value);const price=String(form.elements["price_"+key]?.value||"").trim();tiers.prices[key]=price===""?"":Number(price)}
    await api("/owner/member-tiers",{method:"POST",data:{tiers}});toast("حُفظت مزايا ومدد العضوية؛ ستُمنح تلقائيًا عند تفعيل الاشتراك");await ownerData();return route("owner",false);
  }else if(id==="ownerMembershipForm"){
    const user_id=form.elements.user_id.value,plan=String(raw.plan||"free");
    await api("/owner/user-membership",{method:"POST",data:{user_id,plan}});
    toast(plan==="free"?"تم إلغاء العضوية اليدوية لهذا الحساب":"تم تطبيق "+({month:"العضوية الشهرية",half_year:"العضوية النصف سنوية",year:"العضوية السنوية"}[plan]||"الاشتراك")+" على الحساب");
    await ownerData();return route("owner",false);
  }else if(id==="userPremiumForm"){
    const features=[...form.querySelectorAll('input[name="feature"]:checked')].map(x=>x.value),user_id=form.elements.user_id.value;
    await api("/owner/user-premium-features",{method:"POST",data:{user_id,features}});toast("تم حفظ مزايا هذا المشترك");await ownerData();return route("owner",false);
  }else if(id==="premiumAppearanceForm"){
    const avatar=form.querySelector("#premiumAvatarFile")?.files?.[0],avatar_path=avatar?await upload(avatar,"avatar"):state.me?.member_appearance?.avatar_path||"";
    await api("/seller/premium-appearance",{method:"POST",data:{display_name:raw.display_name,avatar_path,avatar_frame:raw.avatar_frame,book_frame:raw.book_frame,profile_theme:raw.profile_theme,shine:form.elements.shine?.checked===true}});
    toast("تم حفظ الهوية المميزة");await reload();return route("seller",false);
   }else if(id==="sellerApplyForm"){
    const logo=form.querySelector("#sellerLogoFile")?.files?.[0],novel=form.querySelector("#authorNovelFile")?.files?.[0];
    if(novel&&novel.size>52428800)throw Error("حجم ملف الرواية يجب ألا يتجاوز 50MB");
    const logo_path=logo?await upload(logo,"shop_logo"):"";const {author_novel_file,...applyData}=raw;const d=await api("/seller/apply",{method:"POST",data:{...applyData,logo_path}});
    let novelUploadError="";
    if(novel){try{state.pendingAuthorNovelPath=await upload(novel,"file");sessionStorage.setItem("deela-author-first-novel-path",state.pendingAuthorNovelPath)}catch(e){novelUploadError=errorMessage(e)}}
    toast("تم إنشاء صفحة الكاتب: "+d.shop.shop_name);
    await reload();await route("seller",false);
    if(novelUploadError)toast("تم إنشاء الصفحة، لكن تعذر رفع ملف الرواية. أرفقه من قسم «أضف رواية»: "+novelUploadError);
    if(state.pendingAuthorNovelPath){
     editor("new");
     const listingForm=$("listingForm"),radio=listingForm?.querySelector('input[name="format-choice"][value="ebook"]');
     if(radio){radio.checked=true;radio.dispatchEvent(new Event("change",{bubbles:true}))}
     const status=$("digitalFileStatus");if(status)status.textContent="تم إرفاق ملف الرواية. أكمل عنوانها وسعرها ثم احفظها.";
    }
  }else if(id==="sellerProfileForm"){const logo=form.querySelector("#sellerLogoFile")?.files?.[0];const logo_path=logo?await upload(logo,"shop_logo"):state.me?.seller?.logo_path||"";await api("/seller/profile",{method:"POST",data:{...raw,logo_path}});toast("تم تحديث واجهة متجرك");await reload();await route("seller",false);
  }else if(id==="listingForm"){
    const cover=form.querySelector("#coverFile")?.files?.[0];
    const gallery=[...(form.querySelector("#galleryFiles")?.files||[])].slice(0,7);
    if((form.querySelector("#galleryFiles")?.files?.length||0)>7)throw Error("يمكنك إضافة 7 صور إضافية كحد أقصى");
    const digital=form.querySelector("#digitalFile")?.files?.[0];
    const existing=state.editing;
    const coverPath=cover?await upload(cover,"cover"):existing?.cover_path||"";
    const galleryPaths=await Promise.all(gallery.map(file=>upload(file,"cover")));
    const imagePaths=[...new Set([...(coverPath?[coverPath]:[]),...galleryPaths,...(existing?.image_paths||[])])].slice(0,8);
    const filePath=digital?await upload(digital,"file"):existing?.file_path||state.pendingAuthorNovelPath||"";
    const payload={...raw,cover_path:coverPath||imagePaths[0]||"",image_paths:imagePaths,file_path:filePath,shipping_available:false,pickup_available:raw.pickup_available==="on",
      id:form.dataset.id||undefined,rights_confirmed:form.querySelector('[name="rights_confirmed"]')?.checked===true,test_publish:form.querySelector('[name="test_publish"]')?.checked===true,
      stock:Number(raw.stock),price_sar:Number(raw.price_sar),shipping_fee_sar:0,
      compare_at_sar:raw.compare_at_sar===""?null:Number(raw.compare_at_sar),
      page_count:raw.page_count===""?null:Number(raw.page_count),
      publication_year:raw.publication_year===""?null:Number(raw.publication_year)};
    const msg=$("listingMessage");if(msg)msg.textContent="جارٍ رفع الكتاب وحفظه…";
    const saved=await api("/listing",{method:"POST",data:payload});
    if(state.pendingAuthorNovelPath){state.pendingAuthorNovelPath="";sessionStorage.removeItem("deela-author-first-novel-path")}
    toast(saved.listing?.status==="published"?"نُشرت الرواية في مساحة الاختبار ويمكن للحسابات المسجّلة رؤيتها.":"تم حفظ الرواية؛ تحقق من الملف الرقمي وحالة النشر.");
    state.editing=null;await reload();await route("seller",false);
  }else if(id==="checkoutForm"){
    const d=await api("/order",{method:"POST",data:{
      items:state.cart,buyer_name:raw.buyer_name,phone:raw.buyer_phone,test_payment_method:raw.test_payment_method,
      country:raw.buyer_country,city:raw.buyer_city,address:raw.address,note:raw.note,fulfillment:state.cart.map(x=>({id:x.id,method:x.fulfillment||"digital"})),coupon_code:state.couponCode
    }});
    state.cart=[];saveCart();
    toast(d.test_access?"تم إتمام الشراء التجريبي بلا خصم؛ الكتاب مفتوح في مكتبتك.":"تم تسجيل طلب الاختبار "+d.order.code+" دون تحصيل دفع.");
    await reload();await route("orders",false);
    if(d.unlocked_listing_ids?.length)await openReader(d.unlocked_listing_ids[0]);
  }else if(id==="orderSupportForm"){
    await api("/order/support",{method:"POST",data:raw});toast("وصل طلب المساعدة للمسؤولين والبائع");await route("orders",false);
  }else if(id==="ownerOrderSupportForm"){
    await api("/owner/order-support",{method:"POST",data:raw});toast("تم تحديث طلب المساعدة وإشعار العميل");await ownerData();await route("owner",false);
  }else if(id==="launchAlertRequestForm"){
    const result=await api("/seller/launch-alerts/request",{method:"POST",data:raw});
    toast(result.message||"أُرسل طلب التنبيه للمراجعة");
    await sellerData();await route("seller",false);
  }else if(id==="featuresForm"){
    const flags=Object.fromEntries(ALL_FEATURE_KEYS.map(key=>[key,form.elements.namedItem(key)?.checked===true]));
    await api("/owner/settings",{method:"POST",data:{
      ...state.settings,
      ...state.ownerData?.settings,
      ...flags,site_public:false,payments_live:false
    }});
    toast("تم تطبيق خيارات التحكم على الموقع والخادم");
    await reload();await route("owner",false);
  }else if(id==="ownerControlForm"){
    await api("/owner/settings",{method:"POST",data:{...state.settings,...state.ownerData?.settings,announcement:raw.announcement||"",site_public:false,payments_live:false}});
    toast("تم حفظ رسالة الموقع");await reload();state.ownerTab="control";await route("owner",false);
  }else if(id==="ownerBroadcastForm"){
    const result=await api("/owner/broadcast",{method:"POST",data:{title:raw.title,body:raw.body,audience:raw.audience,send_push:form.elements.namedItem("send_push")?.checked===true}});
    toast("تم إرسال الإشعار إلى "+Number(result.delivered||0)+" مستخدم");form.reset();form.querySelector("#broadcastMessage").textContent="مركز الإشعارات: "+Number(result.delivered||0)+" · إشعارات المتصفح: "+Number(result.push_sent||0)+(result.test_mode?" · وضع خاص":"");
  }else if(id==="settingsForm"){
    const payload={...state.settings,...state.ownerData?.settings,...raw,
      theme_images:Object.fromEntries(Object.keys(imageKeys).map(k=>[k,raw['image_'+k+'_path']||''])),theme_sections:state.settings.theme_sections||state.ownerData?.settings?.theme_sections||{},theme_design:{...designDefaults,...state.settings.theme_design,radius:Number(raw.design_radius),font_size:Number(raw.design_font_size),banner_motion:raw.design_banner_motion},theme_material:raw.theme_material,theme_colors:Object.fromEntries(Object.keys(themeKeys).map(k=>[k,raw["theme_"+k]])),site_public:false,payments_live:false};
    await api("/owner/settings",{method:"POST",data:payload});
    toast("تم حفظ هوية المنصة والعروض");await reload();await route("owner",false);
  }else if(id==="sectionForm"){
    const data={...raw,visible:form.elements.namedItem("visible").checked,sort_order:Number(raw.sort_order),design:{background_color:raw.background_color||"",accent_color:raw.accent_color||"",pattern:raw.material}};
    const saved=await api("/owner/sections/save",{method:"POST",data});
    toast("تم حفظ القسم: "+saved.section.title);await reload();await route("owner",false);
  }else if(id==="bannerForm"){
    const data={...raw,active:form.elements.namedItem("active").checked,sort_order:Number(raw.sort_order),starts_at:raw.starts_at?new Date(raw.starts_at).toISOString():null,ends_at:raw.ends_at?new Date(raw.ends_at).toISOString():null};
    await api("/owner/banners/save",{method:"POST",data});
    toast("تم حفظ البنر وجدول ظهوره");await reload();await route("owner",false);
  }else if(id==="paymentsForm"){
    const data={...raw,tax_percent:Number(raw.tax_percent),refund_window_days:Number(raw.refund_window_days),discounts_enabled:form.elements.namedItem("discounts_enabled").checked};
    await api("/owner/payments",{method:"POST",data});toast("حُفظت إعدادات الاختبار. الدفع الحقيقي ما زال مغلقًا.");await route("owner",false);
  }else if(id==="messageForm"){
    await api("/messages",{method:"POST",data:{listing_id:raw.listing_id,body:raw.body}});
    toast("تم إرسال رسالتك للبائع");await route("messages",false);
  }else if(id==="replyForm"){
    await api("/messages/reply",{method:"POST",data:{id:raw.id,body:raw.body}});
    toast("تم إرسال الرد");await route("messages",false);
  }else if(id==="reviewForm"){
    const result=await api("/reviews",{method:"POST",data:{listing_id:raw.listing_id,rating:Number(raw.rating),body:raw.body}});
    toast(result.pending_moderation?"تم إرسال التقييم لمراجعة المالك":"تم نشر تعليقك وتقييمك في مساحة الاختبار");
    if(state.settings.private_test_mode){const c=await api("/catalog");state.listings=c.listings||[];state.settings=c.settings||state.settings;state.current=raw.listing_id;await route("detail",false);}
    else await route("detail",false);
  }else if(id==="ownerContestForm"){
    await saveOwnerContest(form,button);
    return;
  }else if(id==="contestAnswerForm"){
    const result=await api("/contests/answer",{method:"POST",data:{contest_id:raw.contest_id,answer:raw.answer}});
    toast("تم تسجيل مشاركتك");
    const c=await api("/contests");state.contests=c.contests||[];await route("home",false);
  }else if(id==="reportForm"){
    await api("/reports",{method:"POST",data:{listing_id:raw.listing_id,reason:raw.reason}});
    toast("تم تسجيل البلاغ للمراجعة");await route("catalog",false);
  }
 }catch(e){const feedback=form.querySelector(".form-msg");if(feedback)feedback.textContent=errorMessage(e);toast(errorMessage(e))}
 finally{if(button)button.disabled=false}
}
async function deleteSellerListing(id){
 if(!await confirmAction("حذف هذه الرواية من متجرك؟ ستُخفى عن القراء مع الاحتفاظ بسجل الطلبات."))return;
 try{await api("/listing/delete",{method:"POST",data:{id}});toast("تم حذف الرواية من واجهة المتجر");await reload();await route("seller",false);}
 catch(e){toast(errorMessage(e))}
}
async function closeContest(id){
 if(!await confirmAction("إنهاء هذه المسابقة؟"))return;
 try{await api("/owner/contest/close",{method:"POST",data:{id}});state.ownerContests=(await api("/owner/contests")).contests||[];toast("انتهت المسابقة");await route("owner",false)}
 catch(e){toast(errorMessage(e))}
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
async function toggleBookFeatured(id,status,featured){
 if(!await confirmAction(featured?"تعيين هذه الرواية ضمن الكتب المميزة؟":"إزالة الرواية من قائمة المميزة؟"))return;
 try{
  await api("/owner/listing-status",{method:"POST",data:{id,status,featured}});
  toast(featured?"تم تمييز الرواية":"تمت إزالة الرواية من المميزة");
  await reload();await route("owner",false);
 }catch(e){toast(errorMessage(e))}
}
async function moveListingCategory(id){
 const category=document.querySelector('[data-listing-category="'+id+'"]')?.value;
 if(!category)return toast("اختر القسم الصحيح أولًا");
 try{await api("/owner/listing-category",{method:"POST",data:{id,category}});toast("تم نقل الرواية إلى قسم «"+category+"» وإشعار البائع");await route("owner",false)}catch(e){toast(errorMessage(e))}
}
async function moderateLaunchAlert(id,status){
 if(status==="published"&&!document.querySelector('[data-launch-payment-confirm="'+id+'"]')?.checked)return toast("أكد استلام المبلغ الحقيقي بعد التحقق من كشف الحساب");
 if(!await confirmAction(status==="published"?"تأكيد استلام التحويل ونشر إعلان الكتاب لجميع القراء؟":"رفض طلب إعلان الإطلاق؟"))return;
 try{await api("/owner/launch-alert-status",{method:"POST",data:{id,status}});toast(status==="published"?"تم تأكيد المبلغ ونشر الإعلان داخل موجز التطبيق":"تم رفض الطلب");await route("owner",false)}catch(e){toast(errorMessage(e))}
}
async function markSellerNotifications(id=""){
 try{await api("/seller/notifications/read",{method:"POST",data:id?{id}:{}});await sellerData();updateNotificationBadge();await route("seller",false)}catch(e){toast(errorMessage(e))}
}
async function saveOrderStatus(id){
 const status=document.querySelector('[data-order-state="'+id+'"]')?.value;
 const paid=document.querySelector('[data-paid="'+id+'"]')?.checked;
 if(!await confirmAction("تأكيد تغيير الطلب إلى «"+(statusNames[status]||status)+"»؟ لا تؤكد الدفع قبل استلامه فعليًا."))return;
 try{
  await api("/owner/order-status",{method:"POST",data:{id,status,payment_confirmed:paid,
   owner_note:document.querySelector('[data-owner-note="'+id+'"]')?.value||"",
  }});
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
async function removeManaged(kind,id){
 if(!await confirmAction(kind==="section"?"حذف هذا القسم نهائيًا؟":"حذف هذا البنر نهائيًا؟"))return;
 try{await api("/owner/"+kind+"s/delete",{method:"POST",data:{id}});toast("تم الحذف");await route("owner",false)}catch(e){toast(errorMessage(e))}
}
async function setUserBlocked(id,blocked){
 if(!await confirmAction(blocked?"إيقاف هذا الحساب عن استخدام DEELA Books؟":"إعادة تفعيل هذا الحساب؟"))return;
 try{await api("/owner/user-status",{method:"POST",data:{user_id:id,blocked,note:document.querySelector('[data-user-note="'+id+'"]')?.value||""}});toast("تم تحديث حالة الحساب");await route("owner",false)}catch(e){toast(errorMessage(e))}
}
function editManaged(kind,id){
 const row=kind==="section"?(state.ownerData?.sections||[]).find(x=>x.id===id):(state.ownerData?.banners||[]).find(x=>x.id===id);
 const form=document.getElementById(kind+"Form");if(!row||!form)return;
 const values={...row,...(kind==="section"?{background_color:row.design?.background_color||"#18283d",accent_color:row.design?.accent_color||"#8bdccf"}:{})};
 for(const [key,value] of Object.entries(values)){
  const field=form.elements.namedItem(key);if(!field)continue;
  if(field.type==="checkbox")field.checked=value===true;
  else if(field.type==="datetime-local")field.value=value?new Date(value).toISOString().slice(0,16):"";
  else if(field.value!==undefined)field.value=value??"";
 }
 form.scrollIntoView({behavior:"smooth",block:"center"});
 const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent="حفظ التعديلات";
}
function editor(id){
 if(id==="close"){state.editing=null;$("sellerEditor").innerHTML="";return}
 state.editing=id==="new"?null:state.sellerListings.find(x=>x.id===id)||null;
 $("sellerEditor").innerHTML=editorPage(state.editing);
 const initialFormat=state.editing?.format||"physical";document.querySelectorAll("#listingForm .physical-only").forEach(x=>x.hidden=initialFormat!=="physical");document.querySelectorAll("#listingForm .digital-only").forEach(x=>x.hidden=false);
 $("sellerEditor").scrollIntoView({behavior:"smooth",block:"start"});
}
async function ownerArchiveListing(id){
 if(!state.me?.is_owner)return;
 if(!confirm("إخفاء هذا الكتاب من المتجر؟ يمكنك إعادته لاحقًا من إدارة الكتب."))return;
 try{await api("/owner/listing-status",{method:"POST",data:{id,status:"archived"}});toast("تم إخفاء الكتاب");await reload();await route("catalog",false)}
 catch(e){toast(errorMessage(e))}
}
async function download(id){
 try{const x=await api("/download?id="+encodeURIComponent(id));window.open(x.url,"_blank","noopener")}
 catch(e){toast(errorMessage(e))}
}
async function openReader(id){
 try{
  const x=await api("/download?id="+encodeURIComponent(id));
  const book=state.listings.find(b=>b.id===id),shade=document.createElement("div"),modal=document.createElement("section");
  shade.className="shade";shade.style.zIndex="100";modal.className="modal deela-reader-modal";modal.style.zIndex="101";
  modal.innerHTML='<button class="close" type="button" aria-label="إغلاق">✕</button><h2>'+esc(book?.title||"كتابك")+'</h2><p class="muted">مكتبتك الرقمية · DEELA Books</p><iframe title="قارئ الكتاب" src="'+esc(x.url)+'" allow="fullscreen"></iframe><p><a class="btn btn-outline" href="'+esc(x.url)+'" target="_blank" rel="noopener">إذا لم يظهر الملف، افتحه أو حمّله من هنا</a></p>';
  const close=()=>{shade.remove();modal.remove()};shade.onclick=close;modal.querySelector(".close").onclick=close;
  document.body.append(shade,modal);
 }catch(e){toast(errorMessage(e))}
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
function openOwnerStaticSectionSettings(key){
 if(!state.me?.is_owner)return;
 const def=sectionDefs[key];if(!def)return;const cfg={...(state.settings.theme_sections||{})},d=cfg[key]||{},idx=Object.keys(sectionDefs).indexOf(key);
 const shade=document.createElement("div"),modal=document.createElement("section");shade.className="shade";shade.style.zIndex="120";modal.className="modal owner-inline-modal section-settings-modal";modal.style.zIndex="121";
 modal.innerHTML='<button class="close" type="button" aria-label="إغلاق">✕</button><span class="eyebrow">تحكم خاص بالمالك</span><h2>تخصيص '+esc(def[0])+'</h2><p class="muted">عدّل هذا القسم وحده؛ تظهر النتيجة للزوار بعد الحفظ.</p><form id="ownerStaticSectionForm" class="form-grid"><label class="field full">اسم القسم<input name="title" maxlength="100" value="'+esc(d.title||"")+'"></label><label class="field full">وصف قصير<input name="description" maxlength="180" value="'+esc(d.description||"")+'" placeholder="سطر يظهر تحت العنوان"></label><label class="field full">نص رابط القسم<input name="link_text" maxlength="60" value="'+esc(d.link_text||"")+'" placeholder="مثال: تصفح المكتبة ←"></label>'+(key==="banner"?"" : '<label class="field">عدد العناصر الظاهرة<input name="items_limit" type="number" min="1" max="30" value="'+(Number(d.items_limit)||({categories:12,books:8,shops:6,faq:4,contests:6}[key]||6))+'"></label>')+'<label class="field">ترتيب الظهور<input name="order" type="number" min="1" max="99" value="'+(Number(d.order)||idx+1)+'"></label><label class="field">الخامة<select name="material">'+Object.entries(materials).map(([v,t])=>'<option value="'+esc(v)+'" '+((d.material||"none")===v?"selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label><label class="field">لون الخلفية<input name="background_color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(d.background_color||"")?d.background_color:"#18283d")+'"></label><label class="field">لون الإبراز<input name="accent_color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"#8bdccf")+'"></label><label class="field full">رابط صورة بنر<input name="banner_url" type="url" maxlength="500" value="'+esc(d.banner_url||"")+'" placeholder="https://..."></label><label class="field full">حجم القسم <output data-scale-value>'+(Number(d.scale)||100)+'%</output><input name="scale" type="range" min="85" max="120" value="'+(Number(d.scale)||100)+'"></label><label class="field full">تأثير الحركة<select name="motion"><option value="none" '+(d.motion==="none"?"selected":"")+'">بدون حركة</option><option value="glow" '+((d.motion||"shimmer")==="glow"?"selected":"")+'">وهج تفاعلي هادئ</option><option value="shimmer" '+((d.motion||"shimmer")==="shimmer"?"selected":"")+'">لمعان متحرك</option></select></label><label class="checkbox-field full"><input name="visible" type="checkbox" '+(d.visible===false?"":"checked")+'> إظهار القسم للزوار</label><div class="form-actions full"><button class="btn btn-outline" type="button" data-owner-inline-close>إغلاق</button><button class="btn btn-primary" type="submit">حفظ التخصيص</button></div><p class="form-msg full"></p></form>';
 const close=()=>{shade.remove();modal.remove()};shade.onclick=close;modal.querySelector(".close").onclick=close;modal.querySelector("[data-owner-inline-close]").onclick=close;
 const range=modal.querySelector('[name="scale"]');range.oninput=()=>modal.querySelector("[data-scale-value]").textContent=range.value+"%";
 modal.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]'),raw=Object.fromEntries(new FormData(f)),next={...cfg,[key]:{...d,title:raw.title||"",description:raw.description||"",link_text:raw.link_text||"",items_limit:Number(raw.items_limit)||({categories:12,books:8,shops:6,faq:4,contests:6}[key]||6),order:Number(raw.order),material:raw.material,background_color:raw.background_color,accent_color:raw.accent_color,banner_url:raw.banner_url||"",scale:Number(raw.scale),motion:raw.motion,visible:f.elements.visible.checked}};b.disabled=true;try{const r=await api("/owner/settings",{method:"POST",data:{...state.settings,theme_sections:next,site_public:false,payments_live:false}});state.settings={...state.settings,...r.settings,theme_sections:next};applySections(next);renderHome();close();toast("تم حفظ تخصيص "+def[0])}catch(err){f.querySelector(".form-msg").textContent=errorMessage(err);b.disabled=false}};
 document.body.append(shade,modal);
}
function openOwnerWelcomeSettings(){
 if(!state.me?.is_owner)return;
 const cfg={...(state.settings.theme_sections||{})},d=cfg.welcome||{},shade=document.createElement("div"),modal=document.createElement("section");shade.className="shade";shade.style.zIndex="120";modal.className="modal owner-inline-modal section-settings-modal";modal.style.zIndex="121";
 modal.innerHTML='<button class="close" type="button" aria-label="إغلاق">✕</button><span class="eyebrow">رسالة الترحيب</span><h2>تخصيص الترحيب</h2><p class="muted">عدّل النص والحجم واللمعان للمشتركين.</p><form id="ownerWelcomeForm" class="form-grid"><label class="field full">نص الترحيب<input name="title" maxlength="100" value="'+esc(d.title||"أهلاً بك في DEELA، {name}")+'"><small>اكتب {name} ليظهر اسم المشترك.</small></label><label class="field full">سطر توضيحي<input name="description" maxlength="180" value="'+esc(d.description||"اكتشف مكتبتك المفضلة وواصل القراءة.")+'"></label><label class="field">لون الترحيب<input name="accent_color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"#8bdccf")+'"></label><label class="field">الحجم<select name="scale"><option value="90" '+(Number(d.scale)===90?"selected":"")+'>صغير</option><option value="100" '+(!d.scale||Number(d.scale)===100?"selected":"")+'>متوسط</option><option value="110" '+(Number(d.scale)===110?"selected":"")+'>كبير</option></select></label><label class="field full">الحركة<select name="animation"><option value="glow" '+(d.animation!=="none"?"selected":"")+'>لمعان هادئ</option><option value="none" '+(d.animation==="none"?"selected":"")+'>بدون حركة</option></select></label><label class="checkbox-field full"><input name="visible" type="checkbox" '+(d.visible===false?"":"checked")+'> إظهار الترحيب</label><div class="form-actions full"><button class="btn btn-outline" type="button" data-owner-inline-close>إغلاق</button><button class="btn btn-primary" type="submit">حفظ الترحيب</button></div><p class="form-msg full"></p></form>';
 const close=()=>{shade.remove();modal.remove()};shade.onclick=close;modal.querySelector(".close").onclick=close;modal.querySelector("[data-owner-inline-close]").onclick=close;
 modal.querySelector("form").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]'),raw=Object.fromEntries(new FormData(f)),next={...cfg,welcome:{title:raw.title||"",description:raw.description||"",order:1,material:"none",visible:f.elements.visible.checked,background_color:"",accent_color:raw.accent_color,scale:Number(raw.scale),animation:raw.animation}};b.disabled=true;try{const r=await api("/owner/settings",{method:"POST",data:{...state.settings,theme_sections:next,site_public:false,payments_live:false}});state.settings={...state.settings,...r.settings,theme_sections:next};renderHome();close();toast("تم حفظ رسالة الترحيب")}catch(err){f.querySelector(".form-msg").textContent=errorMessage(err);b.disabled=false}};
 document.body.append(shade,modal);
}
function addOwnerHomeSettingsGears(){
 document.querySelectorAll("[data-owner-static-settings],[data-owner-welcome-settings]").forEach(el=>el.remove());
 if(!state.me?.is_owner)return;
 for(const [key,[label,selector]] of Object.entries(sectionDefs)){
  const node=document.querySelector(selector)?.closest("section.container");if(!node)continue;
  const title=node.querySelector(".section-title");const btn=document.createElement("button");btn.type="button";btn.className="owner-inline-control owner-section-gear";btn.dataset.ownerStaticSettings=key;btn.setAttribute("aria-label","إعدادات قسم "+label);btn.title="تخصيص "+label;btn.textContent="⚙";if(key==="banner")node.append(btn);else if(title?.querySelector(".text-button"))title.querySelector(".text-button").insertAdjacentElement("afterend",btn);else if(title?.firstElementChild)title.firstElementChild.append(btn);else (title||node).append(btn);
 }
 const welcome=document.getElementById("ownerWelcome");if(welcome){const btn=document.createElement("button");btn.type="button";btn.className="owner-inline-control owner-welcome-gear";btn.dataset.ownerWelcomeSettings="true";btn.setAttribute("aria-label","إعدادات الترحيب");btn.textContent="⚙";welcome.append(btn)}
}

function bind(){
 const topMenu=$("topMenu");
 topMenu?.addEventListener("toggle",()=>topMenu.setAttribute("aria-expanded",String(topMenu.open)));
 document.addEventListener("click",ev=>{const menu=$("topMenu");if(menu?.open&&!menu.contains(ev.target))menu.open=false});
 document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){const menu=$("topMenu");if(menu?.open)menu.open=false}});
 document.addEventListener("click",async ev=>{
  const t=ev.target.closest("button,a,[data-book]");
  if(!t)return;
  if(t.hasAttribute("data-owner-contest-save")){ev.preventDefault();const form=t.closest("#ownerContestForm");if(form)return saveOwnerContest(form,t)}
  if(t.hasAttribute("data-load-seller-books")){ev.preventDefault();return loadMoreSellerBooks()}
  if(t.hasAttribute("data-load-catalog")){ev.preventDefault();return loadMoreCatalog()}
  if(t.hasAttribute("data-load-shops")){ev.preventDefault();return loadMoreShops()}
  if(t.hasAttribute("data-load-shop-books")){ev.preventDefault();return loadMoreShopBooks()}
  if(t.hasAttribute("data-load-owner-users")){ev.preventDefault();return loadMoreOwnerUsers()}
  if(t.hasAttribute("data-load-owner-sellers")){ev.preventDefault();return loadMoreOwnerSellers()}
  if(t.hasAttribute("data-load-owner-listings")){ev.preventDefault();return loadMoreOwnerListings()}
  if(t.dataset.ownerSectionSettings){ev.preventDefault();ev.stopPropagation();return openOwnerSectionSettings(t.dataset.ownerSectionSettings)}
  if(t.dataset.ownerStaticSettings){ev.preventDefault();ev.stopPropagation();return openOwnerStaticSectionSettings(t.dataset.ownerStaticSettings)}
  if(t.dataset.ownerWelcomeSettings){ev.preventDefault();ev.stopPropagation();return openOwnerWelcomeSettings()}
  if(t.dataset.book){ev.preventDefault();return book(t.dataset.book)}
  if(t.dataset.gallery){ev.preventDefault();const b=state.listings.find(x=>x.id===state.current),urls=b?.image_urls||[];const img=document.querySelector("#productGalleryMain img");if(img&&urls[Number(t.dataset.gallery)])img.src=urls[Number(t.dataset.gallery)];return}
  if(t.dataset.shop){ev.preventDefault();return openShop(t.dataset.shop)}
  if(t.dataset.add){ev.preventDefault();return cartChange(t.dataset.add,1)}
  if(t.hasAttribute("data-coupon-apply")){ev.preventDefault();const code=(document.getElementById("couponCode")?.value||"").trim().toUpperCase();if(code==="FIRST20"){state.couponCode=code;toast("تم تطبيق خصم الاختبار 20%");return route("cart",false)}state.couponCode="";toast("رمز الخصم غير صالح. جرّب FIRST20.");return}
  if(t.dataset.like){ev.preventDefault();return toggleLike(t.dataset.like)}
  if(t.dataset.favorite){ev.preventDefault();return toggleFavorite(t.dataset.favorite)}
  if(t.dataset.follow){ev.preventDefault();return toggleFollow(t.dataset.follow)}
  if(t.dataset.cartPlus){ev.preventDefault();return cartChange(t.dataset.cartPlus,1)}
  if(t.dataset.cartMinus){ev.preventDefault();return cartChange(t.dataset.cartMinus,-1)}
  if(t.dataset.cartRemove){ev.preventDefault();state.cart=state.cart.filter(x=>x.id!==t.dataset.cartRemove);saveCart();return route("cart",false)}
  if(t.dataset.subscriptionTab){ev.preventDefault();state.subscriptionTab=t.dataset.subscriptionTab;return route("subscriptions",false)}
  if(t.dataset.packageSelect){ev.preventDefault();state.selectedSellerPackage=t.dataset.packageSelect;return route("subscriptions",false)}
  if(t.dataset.packageTerm){ev.preventDefault();state.selectedPackageTerm=t.dataset.packageTerm;return route("subscriptions",false)}
  if(t.dataset.promotionTerm){ev.preventDefault();state.selectedPromotionTerm=t.dataset.promotionTerm;return route("subscriptions",false)}
  if(t.hasAttribute("data-submit-seller-subscription")){ev.preventDefault();if(!state.me){openLogin();return}if(!state.me.seller){toast("أنشئ متجرك أولًا");return route("seller",false)}try{const r=await api("/seller/subscription-request",{method:"POST",data:{tier_key:t.dataset.tier,term_key:t.dataset.term}});toast(r.message);await reload();state.subscriptionTab="packages";return route("subscriptions",false)}catch(e){return toast(errorMessage(e))}}
  if(t.hasAttribute("data-submit-promotion")){ev.preventDefault();if(!state.me){openLogin();return}if(!state.me.seller){toast("أنشئ متجرك أولًا");return route("seller",false)}const listingId=document.getElementById("promotionListing")?.value||"";if(!listingId)return toast("اختر منتجًا منشورًا أولًا");try{const r=await api("/seller/promotion-request",{method:"POST",data:{plan_key:t.dataset.plan,listing_id:listingId}});toast(r.message);await reload();state.subscriptionTab="promotions";return route("subscriptions",false)}catch(e){return toast(errorMessage(e))}}
  if(t.dataset.paidRequestReview){ev.preventDefault();const ok=window.confirm(t.dataset.decision==="confirm"?"هل تحققت من وصول المبلغ فعلًا؟ سيتم تفعيل الباقة فورًا.":"هل تريد رفض هذا الطلب؟");if(!ok)return;try{await api("/owner/paid-requests/review",{method:"POST",data:{id:t.dataset.paidRequestReview,kind:t.dataset.kind,decision:t.dataset.decision}});toast(t.dataset.decision==="confirm"?"تم تأكيد الدفع وتفعيل الباقة":"تم رفض الطلب");await ownerData();return route("owner",false)}catch(e){return toast(errorMessage(e))}}
  if(t.dataset.listingDelete){ev.preventDefault();return deleteSellerListing(t.dataset.listingDelete)}
  if(t.dataset.contestClose){ev.preventDefault();return closeContest(t.dataset.contestClose)}
  if(t.hasAttribute("data-nearby")){ev.preventDefault();if(state.nearbyOnly){state.nearbyOnly=false;state.userCoords=null;state.sort="newest";return route("catalog",false)}return useDeviceLocation(true)}
  if(t.hasAttribute("data-store-location")){ev.preventDefault();const form=t.closest("form");if(!navigator.geolocation)return toast("خدمة الموقع غير متاحة");navigator.geolocation.getCurrentPosition(pos=>{form.elements.latitude.value=pos.coords.latitude;form.elements.longitude.value=pos.coords.longitude;toast("تم تحديد موقع المتجر؛ يحفظ تقريبيًا فقط")},()=>toast("اسمح للموقع لتحديد موقع المتجر"),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});return}
    if(t.dataset.category){ev.preventDefault();state.category=t.dataset.category;return route("catalog")}
  if(t.dataset.editorCategory){ev.preventDefault();const form=t.closest("form"),select=form?.querySelector('[name="category"]');if(select){select.value=t.dataset.editorCategory;form.querySelectorAll("[data-editor-category]").forEach(x=>x.classList.toggle("active",x===t));}return}
  if(t.hasAttribute("data-logout")){ev.preventDefault();return logout()}
  if(t.dataset.ownerTab){ev.preventDefault();state.ownerTab=t.dataset.ownerTab;return route("owner")}
  if(t.dataset.sectionDelete){ev.preventDefault();return removeManaged("section",t.dataset.sectionDelete)}
  if(t.dataset.bannerDelete){ev.preventDefault();return removeManaged("banner",t.dataset.bannerDelete)}
  if(t.dataset.sectionEdit){ev.preventDefault();return editManaged("section",t.dataset.sectionEdit)}
  if(t.dataset.bannerEdit){ev.preventDefault();return editManaged("banner",t.dataset.bannerEdit)}
  if(t.dataset.userToggle){ev.preventDefault();return setUserBlocked(t.dataset.userToggle,t.dataset.blocked==="true")}
  if(t.dataset.sellerStatus){ev.preventDefault();return applySellerStatus(t.dataset.sellerStatus,t.dataset.status)}
  if(t.dataset.ownerStatus){ev.preventDefault();return applyListingStatus(t.dataset.ownerStatus,t.dataset.status)}
  if(t.dataset.moveCategory){ev.preventDefault();return moveListingCategory(t.dataset.moveCategory)}
  if(t.dataset.notificationRead){ev.preventDefault();return markSellerNotifications(t.dataset.notificationRead)}
  if(t.dataset.launchStatus){ev.preventDefault();return moderateLaunchAlert(t.dataset.launchStatus,t.dataset.status)}
  if(t.hasAttribute("data-notifications-read-all")){ev.preventDefault();return markSellerNotifications()}
  if(t.hasAttribute("data-enable-seller-notifications")){ev.preventDefault();return enableSellerNotifications()}
  if(t.hasAttribute("data-enable-launch-notifications")){ev.preventDefault();return enableSellerNotifications()}
  if(t.dataset.featureBook){
    ev.preventDefault();return toggleBookFeatured(t.dataset.featureBook,t.dataset.featureStatus,t.dataset.featured==="true");
  }
  if(t.dataset.saveOrder){ev.preventDefault();return saveOrderStatus(t.dataset.saveOrder)}
  if(t.dataset.sellerOrder){ev.preventDefault();return saveSellerOrder(t.dataset.sellerOrder,t.dataset.status)}
  
  if(t.dataset.orderSupport){ev.preventDefault();return quickModal("طلب مساعدة بخصوص الطلب","orderSupportForm",'<input type="hidden" name="order_id" value="'+esc(t.dataset.orderSupport)+'"><label class="field">الموضوع<select name="reason"><option value="digital_access">فتح الكتاب الرقمي</option><option value="product">مشكلة في المنتج</option><option value="cancel">إلغاء الطلب</option><option value="other">موضوع آخر</option></select></label><label class="field">اشرح المشكلة<textarea name="message" required maxlength="1000"></textarea></label>')}
  if(t.dataset.resolveOrderSupport){ev.preventDefault();return quickModal("تحديث طلب المساعدة","ownerOrderSupportForm",'<input type="hidden" name="id" value="'+esc(t.dataset.resolveOrderSupport)+'"><label class="field">الحالة<select name="status"><option value="investigating">قيد المتابعة</option><option value="resolved">تم الحل</option><option value="rejected">مرفوض</option></select></label><label class="field">الرد للعميل<textarea name="resolution" maxlength="1000"></textarea></label>')}
  if(t.dataset.reportStatus){ev.preventDefault();return moderate(t.dataset.reportStatus,"report",t.dataset.status)}
  if(t.dataset.reviewStatus){ev.preventDefault();return moderate(t.dataset.reviewStatus,"review",t.dataset.approved)}
  if(t.dataset.editor){ev.preventDefault();return editor(t.dataset.editor)}
  if(t.dataset.download){ev.preventDefault();return download(t.dataset.download)}
  if(t.dataset.reader){ev.preventDefault();return openReader(t.dataset.reader)}
  if(t.dataset.ownerArchive){ev.preventDefault();return ownerArchiveListing(t.dataset.ownerArchive)}
  if(t.dataset.ask){ev.preventDefault();return quickModal("راسل بائع الكتاب","messageForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.ask)+'"><label class="field">رسالتك<textarea name="body" required minlength="2" maxlength="1000"></textarea></label>')}
  if(t.dataset.reply){ev.preventDefault();return quickModal("الرد على رسالة","replyForm",
   '<input type="hidden" name="id" value="'+esc(t.dataset.reply)+'"><label class="field">ردك<textarea name="body" required minlength="2" maxlength="1000"></textarea></label>')}
  if(t.dataset.review){ev.preventDefault();return quickModal("تقييم كتاب قرأته","reviewForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.review)+'"><label class="field">التقييم<select name="rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></label><label class="field">رأيك<textarea name="body" required maxlength="1000"></textarea></label>')}
  if(t.dataset.report){ev.preventDefault();return quickModal("الإبلاغ عن كتاب","reportForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.report)+'"><label class="field">سبب البلاغ<textarea name="reason" required minlength="10" maxlength="1000"></textarea></label>')}
  if(t.dataset.route){ev.preventDefault();if(t.closest("#topMenu")){const menu=$("topMenu");if(menu)menu.open=false}return route(t.dataset.route)}
 });
 document.addEventListener("change",ev=>{
 const el=ev.target;if(!el)return;
 if(el.id==="formatFilter")state.format=el.value;
 if(el.id==="sortFilter"){
  if(el.value==="nearest"&&!state.userCoords){el.value=state.sort;return useDeviceLocation(false)}
  state.sort=el.value;state.priceOrder="";
 }
 if(el.id==="priceSortFilter"){state.priceOrder=el.value;state.sort="newest";}
 if(el.id==="conditionFilter")state.condition=el.value;
 if(el.id==="cityFilter")state.cityFilter=el.value;
 if(el.id==="discountFilter")state.discountOnly=el.checked;
 if(el.dataset.fulfillment){const row=state.cart.find(x=>x.id===el.dataset.fulfillment);if(row)row.fulfillment=el.value;saveCart();route("cart",false);return}
 if(["formatFilter","sortFilter","priceSortFilter","conditionFilter","cityFilter","discountFilter"].includes(el.id))route("catalog",false);
});
 document.addEventListener("submit",handleForm);
 $("loginForm").addEventListener("submit",login);
 $("registerForm").addEventListener("submit",registerEmail);
 $("phoneSendForm").addEventListener("submit",sendPhoneCode);
 $("phoneVerifyForm").addEventListener("submit",verifyPhone);
 $("emailVerifyForm").addEventListener("submit",verifyEmail);
 document.querySelectorAll("[data-auth-mode]").forEach(b=>b.onclick=()=>switchAuthMethod(b.dataset.authMode));
 document.querySelectorAll("[data-email-mode]").forEach(b=>b.onclick=()=>switchEmailMode(b.dataset.emailMode));
 document.querySelectorAll("[data-password-toggle]").forEach(b=>b.onclick=()=>{const input=$(b.dataset.passwordToggle);input.type=input.type==="password"?"text":"password";b.textContent=input.type==="password"?"إظهار":"إخفاء"});
 document.querySelectorAll("[data-oauth]").forEach(b=>b.onclick=oauthLogin);
 $("resendPhoneCode").onclick=resendPhone;$("resendEmailCode").onclick=resendEmail;$("forgotPassword").onclick=requestPasswordReset;
 const savedEmail=localStorage.getItem("deela-books-saved-email");if(savedEmail){$("loginEmail").value=savedEmail;$("rememberPassword").checked=true}
 const accountAction=()=>state.me?route("profile"):openLogin();
 $("accountButton").onclick=accountAction;
 if($("mobileAccountButton"))$("mobileAccountButton").onclick=accountAction;
 $("closeModal").onclick=closeLogin;$("shade").onclick=closeLogin;
 $("search").addEventListener("input",ev=>{
  state.search=ev.target.value.trim().toLocaleLowerCase();
  if(state.view!=="catalog"&&state.search)route("catalog",false);
  else if(state.view==="catalog")route("catalog",false);
 });
 document.addEventListener("input",ev=>{
  if(ev.target?.classList?.contains("owner-search"))filterOwnerRows();
 });
 document.addEventListener("change",ev=>{
  if(ev.target?.closest("#listingForm")&&ev.target.name==="format-choice"){
   const form=ev.target.closest("#listingForm"),select=form.querySelector('[name="format"]');if(select)select.value=ev.target.value;
   form.querySelectorAll(".format-card").forEach(x=>x.classList.toggle("active",x.querySelector("input")===ev.target));
   const physical=ev.target.value==="physical";form.querySelectorAll(".physical-only").forEach(x=>x.hidden=!physical);form.querySelectorAll(".digital-only").forEach(x=>x.hidden=false);
  }
  if(ev.target?.closest("#listingForm")&&ev.target.name==="format"){
   const physical=ev.target.value==="physical";document.querySelectorAll("#listingForm .physical-only").forEach(x=>x.hidden=!physical);document.querySelectorAll("#listingForm .digital-only").forEach(x=>x.hidden=false);
  }
  if(ev.target?.id==="digitalFile"){const status=document.getElementById("digitalFileStatus");if(status)status.textContent=ev.target.files?.[0]?.name||"أرفق نسخة الكتاب الرقمية عند توفرها. الملفات لا تظهر للعامة."}
  if(ev.target?.id==="productTypeFilter"){state.productType=ev.target.value;route("catalog",false)}
  if(ev.target?.id==="nearbyRadius"){state.radiusKm=Number(ev.target.value)||25;route("catalog",false)}
  if(ev.target?.id==="formatFilter"){state.format=ev.target.value;route("catalog",false)}
  if(ev.target?.id==="sortFilter"){state.sort=ev.target.value;route("catalog",false)}
  if(["ownerStatusFilter","ownerMembershipFilter","ownerAccountTypeFilter"].includes(ev.target?.id))filterOwnerRows();
 });
 window.addEventListener("hashchange",()=>{
  const hash=location.hash.slice(1);
  if(hash.startsWith("book/")){state.current=hash.slice(5);route("detail",false)}
  else if(["home","catalog","shops","seller","favorites","orders","messages","cart","owner"].includes(hash))route(hash,false);
 });
}
async function logout(){
 try{const client=await oauthClient();await client.auth.signOut({scope:"local"})}catch{}
 for(const key of ["deela-books-token","deela-books-refresh","deela-books-auth-v1","deela-books-pending-phone"])sessionStorage.removeItem(key);
 state.token="";state.refreshToken="";state.me=null;state.email="";state.sellerListings=[];state.sellerNotifications=[];state.sellerLaunchAlerts=[];state.listings=[];state.shops=[];state.sections=[];state.banners=[];state.ownerData=null;state.settings={};state.view="home";renderHome();openLogin("تم تسجيل الخروج من DEELA Books.");
}
async function loadHeroStorybook(){
 const img=$("heroStorybook");
 if(img){try{const response=await fetch("./storybook.webp.b64",{cache:"force-cache"});if(response.ok){const encoded=(await response.text()).trim();if(encoded)img.src="data:image/webp;base64,"+encoded}}catch{}}
 try{
  const response=await fetch("./blush-texture.webp.b64?v=20261128-blush-exact-v1",{cache:"force-cache"});
  if(response.ok){const encoded=(await response.text()).trim();if(encoded){
   document.body.style.backgroundColor="#F9E9E7";
   document.body.style.backgroundImage="url(\"data:image/webp;base64,"+encoded+"\")";
   document.body.style.backgroundSize="100% auto";
   document.body.style.backgroundRepeat="repeat-y";
   document.body.style.backgroundPosition="center top";
   document.body.style.backgroundAttachment="scroll";
  }}
 }catch{}
}
async function boot(){
 bind();loadHeroStorybook();saveCart();$("year").textContent=new Date().getFullYear();
 const hash=location.hash.slice(1);
 if(hash.startsWith("book/")){state.current=hash.slice(5);state.view="detail"}
 else if(["catalog","shops","seller","favorites","orders","messages","cart","owner"].includes(hash))state.view=hash;
 try{
  const hashTokens=new URLSearchParams(location.hash.slice(1));
  if(hashTokens.get("access_token")){await adoptAuth({access_token:hashTokens.get("access_token"),refresh_token:hashTokens.get("refresh_token")});history.replaceState(null,"",location.pathname+location.search)}
  else if(new URLSearchParams(location.search).has("code")||sessionStorage.getItem("deela-books-auth-v1")){
   const client=await oauthClient(),{data,error}=await client.auth.getSession();if(error)throw error;
   if(data?.session){state.token=data.session.access_token;state.refreshToken=data.session.refresh_token||"";sessionStorage.setItem("deela-books-token",state.token);if(state.refreshToken)sessionStorage.setItem("deela-books-refresh",state.refreshToken)}
  }else if(!state.token&&state.refreshToken){const renewed=await api("/auth/refresh",{method:"POST",data:{refresh_token:state.refreshToken}});state.token=renewed.access_token;state.refreshToken=renewed.refresh_token;sessionStorage.setItem("deela-books-token",state.token);sessionStorage.setItem("deela-books-refresh",state.refreshToken)}
 }catch(e){if(new URLSearchParams(location.search).has("code"))toast("تعذر إكمال تسجيل الدخول الخارجي: "+errorMessage(e))}
 if(!state.token){await loadGuest();return}
 await reload();
 startSellerNotificationPolling();startContestPolling();
}
boot();
})();
