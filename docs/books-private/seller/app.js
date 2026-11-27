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
const conditions={new:"جديد",like_new:"شبه جديد",good:"جيد",acceptable:"مقبول",not_applicable:"رقمي"};
const categories=["الكل","روايات","أدب وشعر","خيال ورعب","تطوير الذات","تاريخ","كتب الأطفال","فلسفة","تقنية","ديني","أخرى"];
function categoryOptions(){return [...new Set([...categories,...(state.sections||[]).filter(x=>x.kind==="category").map(x=>x.category),...(state.ownerData?.categories||[])].filter(Boolean))];}
const statusNames={draft:"مسودة",pending:"بانتظار المراجعة",published:"منشور",rejected:"مرفوض",archived:"مؤرشف",
 approved:"معتمد",suspended:"موقوف",pending_review:"بانتظار مراجعة الطلب",awaiting_payment:"بانتظار الدفع",
 paid:"تم تأكيد الدفع",preparing:"جارٍ التجهيز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي",payment_review:"بانتظار التحقق من التحويل",rejected:"مرفوض"};
const enabled=key=>state.settings?.[key]!==false;
const state={token:window.__DEELA_BOOKS_TOKEN||sessionStorage.getItem("deela-books-token")||sessionStorage.getItem("deela-shop-owner-session")||"",refreshToken:sessionStorage.getItem("deela-books-refresh")||"",
 email:"",view:"home",listings:[],shops:[],cart:[],me:null,settings:{},
 current:null,category:"الكل",format:"all",sort:"newest",search:"",ownerTab:"overview",sellerTab:"books",
 sellerListings:[],sellerNotifications:[],sellerNotificationIds:new Set(),sellerNotificationsReady:false,sellerNotificationTimer:null,sellerLaunchAlerts:[],launchAlertPrice:0,launchAlertFeed:[],launchAlertIds:new Set(),launchAlertTimer:null,launchAlertsReady:false,ownerData:null,editing:null,formNote:"",loading:false,sections:[],banners:[]};
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
 if(r.status===401&&state.refreshToken&&path!=="/auth/refresh"){
  try{const renewed=await fetch(API+"/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:state.refreshToken}),cache:"no-store",credentials:"omit"});const session=await renewed.json().catch(()=>({}));
   if(renewed.ok&&session.access_token){state.token=session.access_token;state.refreshToken=session.refresh_token||state.refreshToken;sessionStorage.setItem("deela-books-token",state.token);sessionStorage.setItem("deela-books-refresh",state.refreshToken);headers.Authorization="Bearer "+state.token;r=await fetch(API+path,{method:opts.method||"GET",headers,body:opts.data===undefined?undefined:JSON.stringify(opts.data),cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(27000)})}
  }catch{}
 }
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(body.error||"تعذّر تنفيذ العملية");
 return body;
}
async function reload(){
 if(!state.token){openLogin();return}
 try{
  const me=await api("/me");state.me=me;state.email=me.email||me.phone||"";
  if(!me.is_owner&&!me.seller){
   const info=await api("/seller/registration-info");
   state.settings={enable_seller_registration:info.registration_enabled,enable_book_submissions:info.submissions_enabled};
   state.sections=info.sections||[];state.listings=[];state.shops=[];state.banners=[];state.view="seller";
   document.querySelectorAll(".owner-only").forEach(x=>x.hidden=true);
   renderHome();await route("seller",false);return;
  }
  const [catalog,shops]=await Promise.all([api("/catalog"),api("/shops")]);
  state.listings=catalog.listings||[];state.shops=shops.shops||[];state.me=me;state.settings=catalog.settings||{};state.sections=catalog.sections||[];state.banners=catalog.banners||[];
  applyTheme(state.settings.theme_colors);applyMaterial(state.settings.theme_material);applyDesign(state.settings.theme_design);applySections(state.settings.theme_sections);applyImages(state.settings.theme_images);state.cart=state.cart.filter(x=>state.listings.some(b=>b.id===x.id));saveCart();
  $("heroTitle").textContent=state.settings.hero_title||"لكل كتاب حكاية، ولكل قارئ عالم";
  $("heroSubtitle").textContent=state.settings.hero_subtitle||"سوق ديلا للكتب والروايات.";
  $("announcement").textContent=state.settings.announcement||"DEELA Books";
  const promo=document.querySelector(".feature-banner");
  if(promo){
    if(state.settings.home_promo_title)promo.querySelector("h2").textContent=state.settings.home_promo_title;
    if(state.settings.home_promo_description)promo.querySelector("p").textContent=state.settings.home_promo_description;
  }
  document.querySelectorAll('[data-route="messages"]').forEach(el=>el.hidden=!enabled("enable_messages"));
  document.querySelectorAll('[data-route="favorites"]').forEach(el=>el.hidden=!enabled("enable_favorites"));
  document.querySelectorAll('[data-route="cart"]').forEach(el=>el.hidden=!enabled("enable_orders")||!enabled("show_book_prices"));
  $("accountButton").innerHTML=state.me?.is_owner?"حساب المالك ◌":"حسابي ◌";
  document.querySelectorAll(".owner-only").forEach(x=>x.hidden=!state.me?.is_owner);
  if(!me.is_owner)state.view="seller";else if(state.view==="seller")state.view="owner";
  renderHome();route(state.view,false);
 }catch(e){openLogin(errorMessage(e))}
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
 const el=ev.target;if(!el.closest("#settingsForm"))return;
 const preview=document.getElementById("materialPreview");if(!preview)return;
 if(el.name==="theme_material"&&Object.hasOwn(materials,el.value))preview.dataset.material=el.value;
 if(el.name==="theme_bg"&&/^#[0-9a-f]{6}$/i.test(el.value))preview.style.backgroundColor=el.value;
 if(el.name==="theme_white"&&/^#[0-9a-f]{6}$/i.test(el.value))preview.style.color=el.value;
});
const designDefaults={radius:18,font_size:14,banner_motion:"none"};
function applyDesign(d){
 const root=document.documentElement;
 root.style.setProperty("--radius",Math.max(0,Math.min(40,Number(d?.radius??18)||0))+"px");
 document.body.style.fontSize=Math.max(12,Math.min(22,Number(d?.font_size??14)||14))+"px";
 document.body.dataset.bannerMotion=d?.banner_motion==="glow"?"glow":"none";
}
function designFields(conf){
 const d={...designDefaults,...conf.theme_design};
 return '<label class="field">استدارة البطاقات<input name="design_radius" type="number" min="0" max="40" value="'+Number(d.radius)+'"></label><label class="field">حجم الخط<input name="design_font_size" type="number" min="12" max="22" value="'+Number(d.font_size)+'"></label><label class="field">حركة البنر<select name="design_banner_motion"><option value="none">ثابت</option><option value="glow" '+(d.banner_motion==="glow"?"selected":"")+'>لمعان متحرك</option></select></label>';
}
const sectionDefs={categories:["التصنيفات","#homeCategories"],books:["الكتب","#homeListings"],shops:["المتاجر","#featuredShops"],faq:["الأسئلة الشائعة",".faq-section"],banner:["البنر",".feature-banner"]};
function sectionFields(conf){
 return Object.entries(sectionDefs).map(([k,[label]])=>{
 const d=conf.theme_sections?.[k]||{};
 return '<fieldset class="field full"><legend>'+label+'</legend><label>العنوان<input name="section_'+k+'_title" maxlength="100" value="'+esc(d.title||"")+'"></label><label>الترتيب<input type="number" min="1" max="99" name="section_'+k+'_order" value="'+(Number(d.order)||Object.keys(sectionDefs).indexOf(k)+1)+'"></label><label>الخامة<select name="section_'+k+'_material">'+Object.entries(materials).map(([v,t])=>'<option value="'+v+'" '+(d.material===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>لون الخلفية<input type="color" name="section_'+k+'_background_color" value="'+esc(/^#[0-9a-f]{6}$/i.test(d.background_color||"")?d.background_color:"#18283d")+'"></label><label>لون العنوان والإبراز<input type="color" name="section_'+k+'_accent_color" value="'+esc(/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"#8bdccf")+'"></label><label><input type="checkbox" name="section_'+k+'_visible" '+(d.visible!==false?"checked":"")+'>إظهار القسم</label></fieldset>';
 }).join("");
}
function applySections(config){
 const sections=Object.entries(sectionDefs).map(([k,[label,selector]],i)=>{
 const node=document.querySelector(selector)?.closest("section.container");const d=config?.[k]||{};
 if(!node)return null;
 const h=node.querySelector("h2");if(h){h.dataset.originalTitle??=h.textContent;if(k!=="banner"||d.title)h.textContent=d.title||h.dataset.originalTitle;}
 node.dataset.material=Object.hasOwn(materials,d.material)?d.material:"none";
 node.style.setProperty("--section-bg",/^#[0-9a-f]{6}$/i.test(d.background_color||"")?d.background_color:"var(--panel)");
 node.style.setProperty("--section-accent",/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"var(--teal)");
 node.style.borderColor="var(--section-accent)";
 node.dataset.ownerHidden=d.visible===false?"true":"false";node.hidden=d.visible===false;
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
 for(const [key,selector] of [["background","body"],["banner",".feature-banner"]]){
 const el=document.querySelector(selector),url=safeImage(images?.[key]);if(el)el.style.backgroundImage=url?'url('+JSON.stringify(url)+')':"";
 }
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
function cover(b){
 const tint=b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold";
 const inner=b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>';
 return '<div class="cover-wrap '+tint+'">'+inner+'<span class="book-badge">'+esc(kinds[b.format]||"كتاب")+'</span></div>';
}
function card(b){
 const isPublished=b.status==="published",fav=state.me?.favorites?.includes(b.id),liked=state.me?.likes?.includes(b.id);
 return '<article class="book-card"><div class="cover-wrap '+(b.format==="ebook"?"purple":b.format==="audiobook"?"teal":"gold")+'" data-book="'+esc(b.id)+'">'+
 (b.cover_url?'<img src="'+esc(b.cover_url)+'" alt="غلاف '+esc(b.title)+'" loading="lazy">':
 '<div class="cover-pseudo"><small>DEELA BOOKS</small><strong>'+esc(b.title.slice(0,38))+'</strong><em>✧</em></div>')+
 '<span class="book-badge">'+esc(kinds[b.format])+(isPublished?"":" · غير منشور")+'</span>'+
 (enabled("enable_favorites")?'<button type="button" data-favorite="'+esc(b.id)+'" class="card-like '+(fav?"liked":"")+'" aria-label="حفظ في المفضلة">'+(fav?"♥":"♡")+'</button>':"")+'</div>'+
 '<div class="book-info"><span class="book-meta">'+esc(b.category||"كتب")+'</span><h3 data-book="'+esc(b.id)+'">'+esc(b.title)+'</h3>'+
 '<p>'+esc(b.subtitle||b.author||"مؤلف مستقل")+'</p>'+
 '<div class="community-strip">'+
 (enabled("enable_reader_likes")?'<button type="button" class="like-chip '+(liked?"active":"")+'" data-like="'+esc(b.id)+'">'+(liked?"♥":"♡")+' '+Number(b.like_count||0)+' إعجاب</button>':"")+
 (enabled("enable_reviews")?'<span class="rating-chip">★ '+(Number(b.review_count)>0?Number(b.average_rating||0).toFixed(1):"جديد")+' · '+Number(b.review_count||0)+' تقييم</span>':"")+
 '</div><div class="book-tags"><span>'+esc(kinds[b.format]||"كتاب")+'</span>'+
 '<span>'+esc(b.format==="physical"?conditions[b.book_condition]:"ملف رقمي")+'</span></div>'+
 '<div class="book-bottom">'+(enabled("show_book_prices")?'<span class="book-price">'+sar(b.price_sar)+'</span>':'<span class="status muted">السعر مخفي</span>')+
 (enabled("enable_orders")&&enabled("show_book_prices")&&isPublished&&b.stock>0?'<button class="card-action" data-add="'+esc(b.id)+'">أضف للسلة</button>':
 '<span class="status muted">'+(b.stock===0?"نفدت الكمية":"قيد المراجعة")+'</span>')+
 '</div></div></article>';
}
function renderHome(){
 $("homeListings").innerHTML=state.listings.length?state.listings.slice(0,8).map(card).join(""):demoCovers();
 $("featuredShops").innerHTML=state.shops.length?state.shops.slice(0,6).map(shopCard).join(""):
 '<div class="empty-state"><h3>هنا تبدأ متاجر ديلا</h3><p>بمجرد اعتماد متجرك الأول، ستظهر هنا متاجر المؤلفين والناشرين الحقيقية.</p><button class="btn btn-outline" data-route="seller">سجّل أول متجر</button></div>';
 renderManagedHome();
}
function renderManagedHome(){
 let host=document.getElementById("managedHomeSections");if(!host){host=document.createElement("div");host.id="managedHomeSections";$("home").append(host)}
 const banners=(state.banners||[]).filter(x=>x.image_url),sections=(state.sections||[]).filter(x=>x.visible);
 host.innerHTML=(banners.length?'<section class="container section"><div class="managed-banner-grid">'+banners.map(b=>'<a class="managed-banner" href="'+(b.target_url?esc(b.target_url):"#home")+'" '+(b.target_url?'target="_blank" rel="noopener noreferrer"':'')+' style="background-image:linear-gradient(90deg,#071326aa,#07132622),url(&quot;'+esc(b.image_url)+'&quot;)"><strong>'+esc(b.title)+'</strong></a>').join("")+'</div></section>':"")+sections.map(s=>{
  const style=(s.image_url?'background-image:linear-gradient(90deg,#071326df,#07132655),url(&quot;'+esc(s.image_url)+'&quot;)':'background-color:'+( /^#[0-9a-f]{6}$/i.test(s.design?.background_color||"")?s.design.background_color:"var(--section-bg, var(--panel))"))+';--section-accent:'+( /^#[0-9a-f]{6}$/i.test(s.design?.accent_color||"")?s.design.accent_color:"var(--teal)");
  const detail=s.kind==="category"?' · '+esc(s.category):"";
  const books=s.kind==="category"?state.listings.filter(b=>b.category===s.category&&b.status==="published").slice(0,4):[];
  return '<section class="container section managed-section" data-material="'+esc(s.design?.pattern||s.material||"none")+'" style="'+style+'"><div class="managed-section-copy"><span class="eyebrow">DEELA BOOKS</span><h2>'+esc(s.title)+detail+'</h2><p>'+esc(s.description||"")+'</p>'+(s.kind==="category"?'<button class="btn btn-outline" data-category="'+esc(s.category)+'">استكشف القسم ←</button>':"")+'</div>'+(books.length?'<div class="books-grid managed-section-books">'+books.map(card).join("")+'</div>':"")+'</section>';
 }).join("");
}
function shopCard(s){
 const following=state.me?.following?.includes(s.id);
 return '<article class="shop-card"><span class="shop-avatar">'+esc((s.shop_name||"D").slice(0,1))+'</span>'+
 '<div><h3>'+esc(s.shop_name)+'</h3><p>'+esc(s.city||"متجر كتب مستقل")+' · '+esc(statusNames[s.status]||"")+'</p></div>'+
 '<div class="shop-actions">'+(enabled("enable_author_follows")?'<small>متابعون: '+Number(s.follower_count||0)+'</small>':"")+
 '<button type="button" data-shop="'+esc(s.slug)+'">زيارة</button>'+
 (enabled("enable_author_follows")?'<button type="button" data-follow="'+esc(s.id)+'">'+(following?"إلغاء المتابعة":"متابعة +")+'</button>':"")+'</div></article>';
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
 const sorters={
  newest:(a,b)=>new Date(b.created_at)-new Date(a.created_at),
  popular:(a,b)=>Number(b.like_count||0)-Number(a.like_count||0),
  rated:(a,b)=>Number(b.average_rating||0)-Number(a.average_rating||0),
  price_low:(a,b)=>Number(a.price_sar)-Number(b.price_sar),
  price_high:(a,b)=>Number(b.price_sar)-Number(a.price_sar)
 };
 books=books.sort(sorters[state.sort]||sorters.newest);
 return heading("مكتبة ديلا","اختر كتابًا يناسب ذوقك من الكتب الحقيقية المعتمدة.","EXPLORE OUR BOOKS")+
 '<div class="filters">'+categoryOptions().map(c=>'<button class="filter '+(state.category===c?"active":"")+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("")+'</div>'+
 '<div class="catalog-toolbar"><p>عدد الكتب: '+books.length+' '+(state.me?.is_owner?"(تظهر كتب المراجعة للمالك فقط)":"")+'</p>'+
 '<div class="filter-selects"><select id="formatFilter" aria-label="تصفية نوع الكتاب"><option value="all">جميع الأنواع</option><option value="physical">ورقي</option><option value="ebook">رقمي</option><option value="audiobook">صوتي</option></select>'+
 '<select id="sortFilter" aria-label="ترتيب الكتب"><option value="newest">الأحدث</option><option value="popular">الأكثر إعجابًا</option><option value="rated">الأعلى تقييمًا</option><option value="price_low">الأقل سعرًا</option><option value="price_high">الأعلى سعرًا</option></select></div></div>'+
 listingGrid(books,!state.listings.length);
}
function detailPage(){
 const b=state.listings.find(x=>x.id===state.current);
 if(!b)return heading("الكتاب غير موجود","ربما حُذف أو لم يُعتمد بعد.")+'<button class="btn btn-primary" data-route="catalog">العودة للمكتبة</button>';
 const available=b.status==="published"&&b.stock>0;
 return '<div class="breadcrumbs"><a href="#home" data-route="home">الرئيسية</a> › <a href="#catalog" data-route="catalog">الكتب</a> › '+esc(b.title)+'</div>'+
 '<div class="detail-grid"><div class="detail-cover">'+cover(b)+'</div>'+
 '<div class="detail-desc"><span class="eyebrow">DEELA BOOKS · '+esc(b.category)+'</span><h1>'+esc(b.title)+'</h1>'+
 (b.subtitle?'<p class="book-subtitle">'+esc(b.subtitle)+'</p>':"")+
 '<p>تأليف '+esc(b.author||"مؤلف مستقل")+' · <button class="text-button" data-shop="'+esc(b.deela_books_sellers?.slug||"")+'">'+esc(b.deela_books_sellers?.shop_name||"متجر ديلا")+'</button></p>'+
 '<div class="community-strip detail-community">'+
 (enabled("enable_reviews")?'<span class="rating-chip">★ '+(Number(b.review_count)>0?Number(b.average_rating||0).toFixed(1):"بلا تقييم")+' · '+Number(b.review_count||0)+' مراجعة</span>':"")+
 (enabled("enable_reader_likes")?'<span class="like-chip">♥ '+Number(b.like_count||0)+' إعجاب</span>':"")+'<span class="rating-chip">◉ '+Number(b.view_count||0)+' مشاهدة</span></div>'+
 (enabled("show_book_prices")?'<strong class="detail-price">'+sar(b.price_sar)+'</strong>':'<span class="status muted">الأسعار مخفية من لوحة المالك</span>')+
 (enabled("enable_discounts")&&enabled("show_book_prices")&&b.compare_at_sar&&Number(b.compare_at_sar)>Number(b.price_sar)?
 '<div class="compare-price">قبل الخصم <s>'+sar(b.compare_at_sar)+'</s></div>':"")+
 '<div class="detail-spec">'+
 '<div><small>نوع الكتاب</small><strong>'+esc(kinds[b.format])+'</strong></div>'+
 '<div><small>الحالة</small><strong>'+esc(conditions[b.book_condition])+'</strong></div>'+
 '<div><small>اللغة</small><strong>'+esc(b.language||"العربية")+'</strong></div>'+
 '<div><small>الكمية المتاحة</small><strong>'+b.stock+'</strong></div>'+
 '<div><small>المدينة</small><strong>'+esc(b.city||"—")+'</strong></div>'+
 '<div><small>التوصيل التقديري</small><strong>'+sar(b.format==="physical"?b.shipping_fee_sar:0)+'</strong></div>'+
 '<div><small>عدد الصفحات</small><strong>'+(b.page_count||"غير محدد")+'</strong></div>'+
 '<div><small>الفئة العمرية</small><strong>'+esc(b.audience||"عام")+'</strong></div>'+
 (b.publication_year?'<div><small>سنة النشر</small><strong>'+Number(b.publication_year)+'</strong></div>':"")+
 '</div>'+
 '<div class="detail-buttons">'+(available&&enabled("enable_orders")&&enabled("show_book_prices")?'<button class="btn btn-primary" data-add="'+esc(b.id)+'">أضف للسلة ♧</button>':'<span class="status muted">الكتاب قيد المراجعة أو نفد</span>')+
 (enabled("enable_reader_likes")?'<button class="btn btn-outline" data-like="'+esc(b.id)+'">'+(state.me?.likes?.includes(b.id)?"♥ إلغاء الإعجاب":"♡ أعجبني")+'</button>':"")+
 (enabled("enable_favorites")?'<button class="btn btn-outline" data-favorite="'+esc(b.id)+'">'+(state.me?.favorites?.includes(b.id)?"♥ محفوظ في المفضلة":"◇ حفظ للمفضلة")+'</button>':"")+
 (enabled("enable_messages")?'<button class="btn btn-outline" data-ask="'+esc(b.id)+'">راسل البائع ✉</button>':"")+
 '<button class="btn btn-outline" data-report="'+esc(b.id)+'">إبلاغ</button>'+
 (state.me?.is_owner&&b.format!=="physical"&&b.file_path?'<button class="btn btn-soft" data-download="'+esc(b.id)+'">تحميل نسخة المالك</button>':"")+
 '</div><p style="margin-top:16px;font-size:11px">الشراء يعتمد على مراجعة المالك؛ لا يوجد دفع أو شحن تلقائي حاليًا.</p></div></div>'+
 '<div class="detail-story"><h2>ملخص الرواية ومضمونها</h2><p>'+esc(b.description||"لم يضف البائع وصفًا بعد.")+'</p></div>'+
 (b.content_warning?'<div class="content-warning"><strong>تنبيه المحتوى</strong><p>'+esc(b.content_warning)+'</p></div>':"")+
 (b.preview_excerpt?'<div class="detail-story"><h2>اقرأ مقتطفًا</h2><p>'+esc(b.preview_excerpt)+'</p></div>':"")+
 (enabled("enable_reviews")?'<div class="detail-story"><h2>تقييمات القراء الحقيقية</h2>'+
 (b.reviews?.length?b.reviews.map(r=>'<article class="reader-review"><span class="rating-chip">'+("★".repeat(r.rating))+'</span>'+
 '<small>'+date(r.created_at)+'</small><p>'+esc(r.body)+'</p></article>').join("")+
 '<p>تظهر المراجعات بعد التأكد من استلام الكتاب وموافقة الإدارة.</p>':
 '<p>لا توجد مراجعات معتمدة بعد. لن نعرض تقييمات وهمية.</p>')+'</div>':"")+
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
 '<div class="panel"><span class="shop-avatar">'+esc(s.shop_name.slice(0,1))+'</span><h2>'+esc(s.shop_name)+'</h2><p>'+esc(s.city||"")+'</p>'+
 (enabled("enable_author_follows")?'<div class="toolbar"><span class="status">'+Number(s.follower_count||0)+' متابع</span>'+
 '<button class="btn btn-soft" data-follow="'+esc(s.id)+'">'+(state.me?.following?.includes(s.id)?"إلغاء متابعة المتجر":"متابعة المؤلف والمتجر +")+'</button></div>':"")+'</div>'+
 listingGrid(state.listings.filter(b=>b.deela_books_sellers?.slug===s.slug));
}
function favoritesPage(){
 if(!enabled("enable_favorites"))return heading("المفضلة معطلة حاليًا","يمكن للمالك إعادة تشغيلها.");
 const ids=state.me?.favorites||[];
 return heading("قائمة المفضلة","كل الكتب التي حفظتها لتعود إليها لاحقًا.","MY WISHLIST")+
 listingGrid(state.listings.filter(b=>ids.includes(b.id)));
}
function cartPage(){
 if(!enabled("enable_orders")||!enabled("show_book_prices"))
   return heading("السلة مغلقة مؤقتًا","قام المالك بإيقاف استقبال الطلبات أو إخفاء الأسعار.");
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
 const orders=state.orders||[];
 return heading("طلباتي","راجع حالة طلبك ومشتريات الكتب الرقمية والورقية.","MY PURCHASES")+
 '<div class="list-rows">'+(orders.length?orders.map(o=>
 '<article class="row-card"><div class="row-top"><div><h3>'+esc(o.code)+'</h3><p>'+date(o.created_at)+'</p></div>'+
 '<span class="status">'+esc(statusNames[o.status]||o.status)+'</span></div>'+
 '<p>الإجمالي: '+sar(o.total_sar)+'</p>'+
 (o.deela_books_order_items||[]).map(x=>'<div class="cart-line"><div><strong>'+esc(x.title_snapshot)+'</strong>'+
 '<p>الكمية: '+x.quantity+'</p></div><div>'+
 (["paid","preparing","shipped","delivered"].includes(o.status)&&x.format_snapshot!=="physical"?
 '<button data-download="'+esc(x.listing_id)+'">تحميل الكتاب</button>':"")+
 (enabled("enable_reviews")&&o.status==="delivered"?'<button data-review="'+esc(x.listing_id)+'">قيّم كتابك</button>':"")+
 '</div></div>').join("")+
 (o.tracking_number?'<p>رقم التتبع: '+esc(o.tracking_number)+'</p>':"")+
 (o.owner_note?'<p>ملاحظة الإدارة: '+esc(o.owner_note)+'</p>':"")+'</article>').join(""):
 '<div class="empty-state"><h3>لا توجد طلبات</h3><p>بعد إرسال أول طلب ستتابعه هنا.</p><button class="btn btn-primary" data-route="catalog">تصفح المكتبة</button></div>')+'</div>';
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
function sellerLaunchAlertPanel(){
 const enabledNow=state.settings.site_public===true&&enabled("enable_launch_alerts")&&Number(state.launchAlertPrice)>0;
 const books=state.sellerListings.filter(x=>x.status==="published");
 return '<section class="panel"><h2>إعلان إطلاق رواية للقراء · '+sar(state.launchAlertPrice||0)+'</h2><p>يصل الإعلان إلى موجز التنبيهات داخل التطبيق. أدخل مرجع التحويل بعد دفع المبلغ خارج المنصة؛ يراجعه المالك ويتحقق من استلامه قبل نشر الإعلان.</p>'+(enabledNow?'<form id="launchAlertRequestForm" class="form-grid"><label class="field">الرواية المنشورة<select name="listing_id" required><option value="">اختر رواية</option>'+books.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+'</option>').join("")+'</select></label>'+field("مرجع التحويل البنكي","payment_reference","text",true,"رقم العملية")+'<div class="field full"><button class="btn btn-primary" type="submit">إرسال طلب التنبيه · '+sar(state.launchAlertPrice)+'</button></div></form>':'<p class="status muted">الخدمة غير متاحة الآن لأن المتجر خاص أو لم يحدد المالك السعر والتفعيل. لا تحوّل أي مبلغ قبل إطلاقها رسميًا.</p>')+'<div class="list-rows">'+(state.sellerLaunchAlerts.length?state.sellerLaunchAlerts.map(c=>'<article class="row-card"><strong>'+esc(c.deela_books_listings?.title||"رواية")+'</strong><p>'+sar(c.amount_sar)+' · '+esc(statusNames[c.status]||c.status)+' · مرجع التحويل: '+esc(c.payment_reference)+'</p><small>'+date(c.created_at)+'</small></article>').join(""):'<p>لا توجد طلبات إعلان حتى الآن.</p>')+'</div></section>';
}
function sellerPage(){
 const seller=state.me?.seller;
 if(!seller&&!enabled("enable_seller_registration"))return heading("فتح المتاجر متوقف حاليًا","أوقف المالك استقبال مؤلفين ومتاجر جديدة مؤقتًا.");
 if(!seller)return heading("حساب الكاتب","أنشئ واجهتك داخل DEELA Books وابدأ بإضافة رواياتك.","DEELA AUTHOR")+
 '<div class="panel"><h2>ابدأ صفحة الكاتب</h2><p>صفحتك تظهر لك داخل حسابك فقط. أرسل أول رواية للمراجعة، ولن تظهر للقراء قبل اعتمادها.</p>'+ 
 '<form id="sellerApplyForm" class="form-grid">'+
 field("اسم الكاتب الظاهر للقراء","shop_name","text",true,"اسمك أو اسمك الأدبي")+
 field("معرّف صفحة الكاتب بالإنجليزية","slug","text",true,"my-novels")+
 field("المدينة","city","text",false,"جدة")+
 '<label class="field">الدولة<select name="country"><option>السعودية</option><option>الإمارات</option><option>الكويت</option><option>قطر</option><option>البحرين</option><option>عُمان</option><option>أخرى</option></select></label>'+ 
 '<label class="field full">نبذة قصيرة عنك وعن رواياتك<textarea name="bio" maxlength="1000" placeholder="عرّف القراء بأسلوبك ونوع الروايات التي تكتبها"></textarea></label>'+ 
 '<div class="form-actions"><button type="submit" class="btn btn-primary">إنشاء صفحة الكاتب ومتابعة ←</button></div></form></div>';
 const available=seller.status==="approved",novels=state.sellerListings.length;
 const views=state.sellerListings.reduce((n,x)=>n+Number(x.view_count||0),0),likes=state.sellerListings.reduce((n,x)=>n+Number(x.like_count||0),0);
 const published=state.sellerListings.filter(x=>x.status==="published").length;
 return heading("حسابي","تابع رواياتك وتفاعل القراء من مكان واحد.","AUTHOR ACCOUNT")+
 '<section class="seller-profile-card"><div class="seller-avatar">'+esc((seller.shop_name||"D").trim().slice(0,1))+'</div><div><h2>'+esc(seller.shop_name)+'</h2><p>@'+esc(seller.slug)+' · '+esc(state.email||state.me?.phone||"حساب DEELA Books")+'</p></div><span class="status '+(available?"":"muted")+'">'+(available?"كاتب معتمد":"طلب الكاتب قيد المراجعة")+'</span></section>'+ 
 '<div class="seller-stat-grid"><div class="seller-stat"><strong>'+published+'</strong><span>رواية منشورة</span></div><div class="seller-stat"><strong>'+novels+'</strong><span>إجمالي الروايات</span></div><div class="seller-stat"><strong>'+views+'</strong><span>مشاهدة</span></div><div class="seller-stat"><strong>'+likes+'</strong><span>إعجاب</span></div></div>'+ 
 '<section class="seller-promo-card"><div><strong>روّج لروايتك في DEELA Books</strong><p>أضف غلافًا ووصفًا وسعرًا جذابًا، ثم أرسلها للمراجعة.</p></div>'+(enabled("enable_book_submissions")?'<button class="btn btn-primary" data-editor="new">＋ أضف رواية</button>':'<span class="status muted">استقبال الروايات متوقف</span>')+'</section>'+ 
 '<div class="toolbar"><span class="status '+(available?"":"muted")+'">'+(available?"صفحة الكاتب مفعّلة":"حساب خاص · لا تظهر الروايات للقراء قبل الاعتماد")+'</span><button class="btn btn-outline" data-route="seller">تحديث الحساب ↻</button><button class="btn btn-outline" data-logout>تسجيل الخروج</button></div>'+ 
 (available?'<div id="sellerEditor"></div>'+sellerLaunchAlertPanel()+'<div class="panel"><h2>تنبيهات وتفاعل القراء</h2><p>تظهر إعجابات رواياتك ومشاهداتها هنا. يتحدث المركز عند فتح الحساب، ويمكن تفعيل إشعارات هذا المتصفح.</p>'+ ("Notification" in window?(Notification.permission==="granted"?'<span class="status">إشعارات المتصفح مفعّلة</span>':Notification.permission==="denied"?'<span class="status muted">إشعارات المتصفح محظورة من إعدادات الجهاز</span>':'<button class="btn btn-outline" data-enable-seller-notifications>تفعيل إشعارات المتصفح</button>'):"")+'<div class="list-rows">'+(state.sellerNotifications.length?state.sellerNotifications.map(n=>'<article class="row-card '+(n.read_at?"":"notification-unread")+'"><div class="row-top"><strong>'+esc(n.title)+'</strong><small>'+date(n.created_at)+'</small></div><p>'+esc(n.body)+'</p>'+(n.read_at?'<span class="status muted">مقروء</span>':'<button class="btn btn-outline" data-notification-read="'+esc(n.id)+'">تعليم كمقروء</button>')+'</article>').join(""):'<p>لا توجد تنبيهات جديدة حاليًا.</p>')+'</div><button class="btn btn-outline" data-notifications-read-all>تعليم كل التنبيهات كمقروءة</button></div>':'<div class="panel status"><strong>طلبك لدى المالك</strong><p>تقدر ترفع روايتك إلى قائمة المراجعة الخاصة الآن. ستظل مخفية عن القراء حتى اعتماد المتجر والرواية.</p><div id="sellerEditor"></div></div>')+
 '<div class="panel"><h2>رواياتي</h2><div class="list-rows">'+(state.sellerListings.length?state.sellerListings.map(l=>'<article class="seller-novel-card"><div class="row-top"><div><h3>'+esc(l.title)+'</h3><p>'+esc(kinds[l.format])+' · '+sar(l.price_sar)+'</p><div class="community-strip"><span class="like-chip">♥ '+Number(l.like_count||0)+' إعجاب</span><span class="rating-chip">◉ '+Number(l.view_count||0)+' مشاهدة</span><span class="rating-chip">★ '+Number(l.review_count||0)+' تقييم</span></div></div><span class="status '+(l.status==="published"?"":"muted")+'">'+esc(statusNames[l.status])+'</span></div><div class="form-actions">'+(enabled("enable_book_submissions")?'<button class="btn btn-outline" data-editor="'+esc(l.id)+'">تعديل الرواية</button>':"")+'</div></article>').join(""):'<p>لم ترفع رواية بعد. اضغط «أضف رواية» لبدء النشر.</p>')+'</div></div>';
}
function editorPage(b=null){
 const selectedCategory=b?.category||"روايات";
 return '<div class="panel" id="editorPanel"><h2>'+(b?"تعديل الكتاب":"إضافة كتاب جديد")+'</h2>'+
 '<form id="listingForm" data-id="'+esc(b?.id||"")+'">'+
 '<div class="form-grid">'+
 '<label class="field full cover-upload-field">غلاف الرواية من معرض الجوال<input id="coverFile" type="file" accept="image/png,image/jpeg,image/webp" capture="environment"><small>اختر صورة محفوظة في جهازك أو التقط الغلاف بالكاميرا · PNG/JPG/WebP حتى 5MB</small></label>'+
 field("اسم الرواية أو الكتاب","title","text",true,"اسم روايتك",b?.title||"")+
 field("عنوان فرعي جذاب","subtitle","text",false,"وصف قصير يظهر في بطاقات الكتب",b?.subtitle||"")+
 field("اسم المؤلف","author","text",false,"اسم الكاتب",b?.author||"")+
 '<label class="field">نوع الكتاب<select name="format">'+
 Object.entries(kinds).map(([key,label])=>'<option value="'+key+'" '+(b?.format===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 '<div class="field full"><span>اختر قسم الرواية</span><div class="category-pills">'+categoryOptions().filter(x=>x!=="الكل").map(x=>'<button type="button" data-editor-category="'+esc(x)+'" class="category-pill '+(selectedCategory===x?"active":"")+'">'+esc(x)+'</button>').join("")+'</div><select name="category" required class="category-select-hidden">'+categoryOptions().filter(x=>x!=="الكل").map(x=>'<option '+(selectedCategory===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></div>'+ 
 '<label class="field physical-only">حالة الكتاب الورقي<select name="book_condition">'+Object.entries(conditions).map(([key,label])=>
 '<option value="'+key+'" '+(b?.book_condition===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+
 '<div class="field full"><div class="seller-price-tip">💰 <strong>السعر يحدده صاحب الكتاب</strong>، وتظهر القيمة للقراء بالريال. يمكنك تعديل السعر، لكن أي تعديل يحتاج مراجعة جديدة.</div></div>'+
 field("سعر الكتاب الذي تختاره (ر.س)","price_sar","number",true,"35",b?.price_sar??"")+
 (enabled("enable_discounts")?field("السعر قبل الخصم (اختياري)","compare_at_sar","number",false,"49",b?.compare_at_sar??""):"")+
 field("الكمية المتاحة","stock","number",true,"1",b?.stock??1)+
 '<label class="field physical-only">تكلفة التوصيل (للكتاب الورقي)<input name="shipping_fee_sar" type="number" min="0" step="0.01" placeholder="0" value="'+esc(b?.shipping_fee_sar??0)+'"></label>'+ 
 field("عدد الصفحات (اختياري)","page_count","number",false,"240",b?.page_count??"")+
 field("سنة النشر (اختياري)","publication_year","number",false,"2026",b?.publication_year??"")+
 '<label class="field">الفئة العمرية<select name="audience">'+
 ["عام","الناشئة","للبالغين"].map(x=>'<option '+(b?.audience===x?"selected":"")+'>'+x+'</option>').join("")+'</select></label>'+
 field("رقم ISBN (اختياري)","isbn","text",false,"",b?.isbn||"")+
 field("مدينة الشحن","city","text",false,"جدة",b?.city||"")+
 '<label class="field full">مضمون الرواية وملخص أحداثها (20 حرفًا على الأقل)<textarea name="description" required minlength="20" maxlength="5000" rows="6" placeholder="عن ماذا تتحدث الرواية؟ وما الذي يميزها؟ بدون حرق النهاية">'+esc(b?.description||"")+'</textarea></label>'+
 '<label class="field full">تنبيهات المحتوى (اختياري)<textarea name="content_warning" maxlength="350" rows="2" placeholder="مثلًا: مشاهد رعب، عنف، موضوعات للكبار">'+esc(b?.content_warning||"")+'</textarea></label>'+
 '<label class="field full">مقتطف للمعاينة (اختياري)<textarea name="preview_excerpt" rows="4">'+esc(b?.preview_excerpt||"")+'</textarea></label>'+
 '<label class="field digital-only">ملف الكتاب الرقمي (PDF/EPUB/MP3، حتى 50MB)<input id="digitalFile" type="file" accept=".pdf,.epub,.mp3"></label>'+ 
 '<label class="field full"><span class="checkfield"><input type="checkbox" name="rights_confirmed" required '+(b?.rights_confirmed?"checked":"")+'>'+
 'أؤكد أن لي حق نشر أو بيع هذا الكتاب وأنه لا ينتهك حقوق مؤلف أو ناشر آخر.</span></label>'+
 '</div><div class="form-actions"><button type="submit" class="btn btn-primary" id="saveListing">رفع الكتاب للمراجعة</button>'+
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
 return '<section class="owner-feature-group"><div class="owner-feature-heading"><h3>'+esc(group.title)+'</h3><p>'+esc(group.desc)+'</p></div>'+
 group.items.map(([key,title,description])=>
 '<label class="owner-feature"><span class="owner-feature-copy"><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span>'+
 '<span class="switch"><input type="checkbox" name="'+esc(key)+'" '+(conf[key]===true?"checked":"")+'><span class="switch-track"></span></span></label>'
 ).join("")+'</section>';
}
function managedOwnerTabs(){
 const rows=state.ownerData?.sections||[];
 return '<section class="panel"><h2>أقسام الروايات والتصنيفات</h2><p>أنشئ عددًا مفتوحًا من التصنيفات، مثل الفانتازيا والرعب والرومانسية والغموض والتاريخي والخيال العلمي والسير الذاتية. تظهر اختيارات البائع هنا تلقائيًا.</p><form id="sectionForm" class="form-grid">'+
 '<label class="field">عنوان القسم<input name="title" required maxlength="100"></label><label class="field">النوع<select name="kind"><option value="category">تصنيف كتب</option><option value="promo">قسم ترويجي</option></select></label>'+
 '<label class="field">التصنيف<input name="category" maxlength="80" placeholder="روايات"></label><label class="field">الترتيب<input name="sort_order" type="number" min="1" max="9999" value="1"></label>'+
 '<label class="field full">الوصف<textarea name="description" maxlength="450"></textarea></label><label class="field">الخامة والزخرفة<select name="material">'+Object.entries(materials).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("")+'</select></label><label class="field">لون خلفية القسم<input type="color" name="background_color" value="#18283d"></label><label class="field">لون إبراز العنوان<input type="color" name="accent_color" value="#8bdccf"></label>'+imageUploader("section")+
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
 const c=state.ownerData?.config||{mode:"test",live_enabled:false,provider:"",tax_percent:0,refund_window_days:7,discounts_enabled:false};
 return '<section class="panel"><h2>مركز المدفوعات · بيئة اختبار فقط</h2><p>لا يجري تحصيل أموال هنا. لا نقبل مفاتيح سرية ولا نسجل نجاح دفع تجريبي على أنه حقيقي.</p><form id="paymentsForm" class="form-grid">'+
 '<label class="field">بوابة الربط المقترحة<select name="provider"><option value="">غير محددة</option>'+[["tap","Tap"],["myfatoorah","MyFatoorah"],["moyasar","Moyasar"],["tamara","Tamara"],["tabby","Tabby"],["bank","تحويل بنكي"]].map(([k,v])=>'<option value="'+k+'" '+(c.provider===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label class="field">الضريبة (%)<input name="tax_percent" type="number" min="0" max="25" step="0.01" value="'+Number(c.tax_percent||0)+'"></label><label class="field">نافذة الاسترداد (أيام)<input name="refund_window_days" type="number" min="0" max="90" value="'+Number(c.refund_window_days??7)+'"></label><label class="field"><input name="discounts_enabled" type="checkbox" '+(c.discounts_enabled?"checked":"")+'>تفعيل خصومات الاختبار</label><div class="field full"><p>طرق الدفع المخطط لها: مدى، Apple Pay، Google Pay، Visa، Mastercard، STC Pay، والتحويل البنكي. مزود الخدمة وبيانات التاجر مطلوبة قبل الربط الحقيقي.</p></div><div class="owner-locked-panel full"><strong>الحالة: اختبار معطل فعليًا · الدفع الحقيقي مغلق</strong><p>مفاتيح الربط لا تدخل هنا. أدخلها لاحقًا في مخزن أسرار الخادم، بعد موافقة منفصلة على تفعيل المدفوعات.</p></div><div class="field full"><button class="btn btn-primary" type="submit">حفظ إعدادات الاختبار</button><span class="form-msg"></span></div></form></section>';
}
function accountOwnerPanel(){
 const rows=state.ownerData?.users||[];
 return '<section class="panel"><h2>حسابات المؤلفين والمتاجر</h2><p>تظهر هنا حسابات البائعين المسجلين في DEELA Books فقط. حسابات مشتركي تطبيق DEELA للبرامج لا تُعرض ولا تُدار من هذه اللوحة.</p><div class="list-rows">'+(rows.length?rows.map(u=>'<article class="row-card"><div class="row-top"><div><strong>'+esc(u.shop_name||"متجر كتب")+'</strong><p>'+esc(u.email||u.phone||u.id)+' · آخر دخول: '+date(u.last_sign_in_at)+' · إنشاء: '+date(u.created_at)+'</p></div><span class="status">'+(u.blocked?"موقوف":esc(statusNames[u.seller_status]||u.seller_status||"بائع كتب"))+'</span></div>'+'<label class="field">ملاحظة إدارية<input data-user-note="'+esc(u.id)+'" value="'+esc(u.note)+'" maxlength="500"></label><button class="btn '+(u.blocked?"btn-outline":"danger")+'" data-user-toggle="'+esc(u.id)+'" data-blocked="'+(!u.blocked)+'">'+(u.blocked?"إعادة تفعيل حساب البائع":"إيقاف حساب البائع")+'</button></article>').join(""):'<div class="empty-state"><h3>لا توجد حسابات بائعين في DEELA Books بعد</h3><p>حسابات مشتركي تطبيق البرامج منفصلة ولن تظهر هنا.</p></div>')+'</div><p>القائمة تشمل بائعي الكتب فقط؛ إجراء الإيقاف محمي كذلك على الخادم.</p></section>';
}
function ownerPage(){
 const tab=state.ownerTab;
 const tabs=[
  ["overview","الرئيسية والإحصائيات"],["features","تشغيل المميزات"],
  ["sections","الأقسام والبنرات"],["payments","المدفوعات"],["users","الحسابات"],
  ["sellers","المؤلفون والمتاجر"],["listings","إدارة الكتب والعروض"],
  ["orders","الطلبات والمبيعات"],["alerts","تنبيهات الإطلاق المدفوعة"],["reports","التقييمات والبلاغات"],
  ["settings","الهوية والإعدادات"]
 ];
 const top=heading("مركز قيادة DEELA Books","كل إعدادات الكتب، المؤلفين، القراء والمبيعات في لوحة واحدة.","DEELA CONTROL CENTER")+
 '<div class="owner-private-banner"><div><strong>🔒 المنصة في الوضع الخاص</strong><p>تقدر تضيف الكتب وتجرب المميزات؛ النشر للعامة محجوب على مستوى الخادم حتى تصرح بذلك.</p></div>'+
 '<div class="owner-status-tags"><span>الموقع خاص</span><span>الدفع الآلي مغلق</span><span>الشحن الآلي مغلق</span></div></div>'+
 '<div class="tab-bar owner-tabs">'+tabs.map(([key,label])=>
 '<button class="'+(tab===key?"active":"")+'" data-owner-tab="'+key+'">'+esc(label)+'</button>').join("")+'</div>';
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
 if(tab==="features"){
  const conf=state.ownerData?.settings||state.settings;
  return top+'<form class="owner-features" id="featuresForm">'+
  '<div class="owner-locked-panel"><strong>مفاتيح مقفلة للحماية</strong><p>🌍 النشر للعامة: مغلق · 💳 بوابة الدفع الإلكتروني: غير مفعلة · 🚚 الشحن الآلي: غير مفعّل</p>'+
  '<small>هذه الثلاثة لا يمكن فتحها من لوحة المميزات قبل موافقتك على إطلاق الموقع وربط الخدمات.</small></div>'+
  FEATURE_GROUPS.map(g=>ownerFeatureGroup(g,conf)).join("")+
  '<div class="owner-save-bar"><div><strong>التحكم المباشر</strong><p>تعطيل أي ميزة يمنع استخدامها من واجهة القراء وكذلك من الخادم.</p></div>'+
  '<button class="btn btn-primary" type="submit">حفظ وتطبيق المميزات</button></div><p class="form-msg" id="featuresMessage"></p></form>';
 }
 if(tab==="sections")return top+managedOwnerTabs();
 if(tab==="payments")return top+paymentOwnerPanel();
 if(tab==="alerts")return top+ownerLaunchAlertsPanel();
 if(tab==="users")return top+accountOwnerPanel();
 if(tab==="sellers"){
  const arr=state.ownerData?.sellers||[];
  return top+'<div class="panel"><div class="owner-section-title"><div><h2>طلبات المؤلفين والمتاجر</h2><p>اعتماد أو تعليق أو رفض كل متجر على حدة.</p></div><span class="status">'+arr.length+' متجر</span></div>'+
  '<div class="owner-filter-box"><input type="search" class="owner-search" placeholder="ابحث عن اسم المؤلف أو المتجر…"></div>'+
  '<div class="list-rows">'+(arr.length?arr.map(x=>'<div class="row-card" data-owner-row data-owner-state="'+esc(x.status)+'"><div class="row-top"><div><h3>'+esc(x.shop_name)+'</h3>'+
  '<p>'+esc(x.slug)+' · '+esc(x.city||"المدينة غير محددة")+'</p></div><span class="status '+(x.status==="approved"?"":"muted")+'">'+esc(statusNames[x.status]||x.status)+'</span></div>'+
  '<div class="toolbar">'+[["approved","اعتماد المتجر"],["rejected","رفض"],["suspended","تعليق المتجر"]].map(([v,label])=>
   '<button class="btn '+(v==="approved"?"btn-primary":"btn-outline")+'" data-seller-status="'+esc(x.id)+'" data-status="'+v+'">'+esc(label)+'</button>').join("")+
  '</div></div>').join(""):'<p class="empty-state">ما فيه طلبات لفتح متاجر حاليًا.</p>')+'</div></div>';
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
  '<p>'+esc((b.description||"").slice(0,250))+'</p><p>القسم الحالي: <strong>'+esc(b.category||"—")+'</strong> · المشاهدات: '+Number(b.view_count||0)+'</p>'+
  '<div class="toolbar"><select data-listing-category="'+esc(b.id)+'" aria-label="القسم الصحيح للرواية">'+categoryOptions().filter(c=>c!=="الكل").map(c=>'<option '+(b.category===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select><button class="btn btn-soft" data-move-category="'+esc(b.id)+'">نقل للقسم المختار</button></div>'+
  (b.subtitle?'<p><strong>العنوان الفرعي: </strong>'+esc(b.subtitle)+'</p>':"")+
  '<div class="toolbar">'+
  '<button class="btn btn-primary" data-owner-status="'+esc(b.id)+'" data-status="published">اعتماد ونشر</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="rejected">رفض</button>'+
  '<button class="btn btn-outline" data-owner-status="'+esc(b.id)+'" data-status="archived">إخفاء</button>'+
  (enabled("enable_featured_section")&&b.status==="published"?'<button class="btn btn-soft" data-feature-book="'+esc(b.id)+'" data-feature-status="'+esc(b.status)+'" data-featured="'+(b.featured===true?"false":"true")+'">'+
  (b.featured?"★ إزالة من المميزة":"☆ تمييز الرواية")+'</button>':"")+
  '</div></div>').join(""):'<p class="empty-state">لا توجد كتب في لوحة المراجعة حاليًا.</p>')+'</div></div>';
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
  '<label class="field">حالة الطلب<select data-order-state="'+esc(o.id)+'">'+Object.entries(statusNames).filter(([key])=>
   ["pending_review","awaiting_payment","paid","preparing","shipped","delivered","cancelled"].includes(key)).map(([key,label])=>
   '<option value="'+key+'" '+(o.status===key?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select></label>'+
  '<label class="field">رقم التتبع<input data-track="'+esc(o.id)+'" value="'+esc(o.tracking_number||"")+'"></label>'+
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
  '<div class="form-grid">'+
  themeFields(conf)+materialFields(conf)+designFields(conf)+sectionFields(conf)+imageFields(conf)+field("اسم المنصة","name","text",true,"DEELA Books",conf.name||"DEELA Books")+
  field("عنوان الواجهة الرئيسية","hero_title","text",true,"لكل كتاب حكاية",conf.hero_title||"")+
  field("الرسالة العلوية","announcement","text",false,"",conf.announcement||"")+
  field("عنوان الحملة أو العرض","home_promo_title","text",false,"أحدث إصدارات ديلا",conf.home_promo_title||"")+
  field("رابط الدعم الآمن HTTPS","support_url","url",false,"https://...",conf.support_url||"")+
  field("بريد التواصل","contact_email","email",false,"contact@example.com",conf.contact_email||"")+
  field("عمولة المنصة (%)","commission_percent","number",false,"10",conf.commission_percent??10)+
  field("سعر إعلان إطلاق الرواية (ريال) · صفر لإيقاف الخدمة","launch_alert_price_sar","number",false,"مثال: 25",conf.launch_alert_price_sar??0)+
  '<label class="field full">الوصف الرئيسي<textarea name="hero_subtitle">'+esc(conf.hero_subtitle||"")+'</textarea></label>'+
  '<label class="field full">تفاصيل الحملة أو العرض<textarea name="home_promo_description">'+esc(conf.home_promo_description||"")+'</textarea></label>'+
  '</div><div class="owner-locked-panel"><strong>سياسة الخصوصية الحالية</strong>'+
  '<p>🔒 الموقع غير منشور للعامة، والدفع والشحن الآلي غير متاحين.</p></div>'+
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
 if(tab==="sellers")state.ownerData=await api("/owner/sellers");
 if(tab==="listings")state.ownerData=await api("/owner/listings");
 if(tab==="orders")state.ownerData=await api("/owner/orders");
 if(tab==="reports")state.ownerData=await api("/owner/reports");
 if(tab==="features"||tab==="settings")state.ownerData=await api("/owner/settings");
 if(tab==="sections"){const [sections,banners]=await Promise.all([api("/owner/sections"),api("/owner/banners")]);state.ownerData={...sections,...banners};}
 if(tab==="payments")state.ownerData=await api("/owner/payments");
 if(tab==="users")state.ownerData=await api("/owner/users");
 if(tab==="alerts")state.ownerData=await api("/owner/launch-alerts");
}
async function sellerData(){
 const [r,n,a]=await Promise.all([api("/my/listings"),api("/seller/notifications"),api("/seller/launch-alerts")]);state.sellerListings=r.listings||[];state.sellerNotifications=n.notifications||[];state.sellerLaunchAlerts=a.campaigns||[];state.launchAlertPrice=Number(a.price_sar||0);
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
 if(!state.token||!state.me?.seller||state.me.seller.status!=="approved")return;
 try{
  const r=await api("/seller/notifications"),items=r.notifications||[];
  if(!state.sellerNotificationsReady){state.sellerNotificationIds=new Set(items.map(x=>x.id));state.sellerNotifications=items;state.sellerNotificationsReady=true;return;}
  const fresh=items.filter(x=>!state.sellerNotificationIds.has(x.id));
  for(const x of items)state.sellerNotificationIds.add(x.id);
  state.sellerNotifications=items;
  if(fresh.length){
   toast(fresh.length===1?fresh[0].title:"لديك "+fresh.length+" تنبيهات جديدة للبائع");
   if("Notification" in window&&Notification.permission==="granted"){
    const n=fresh[0];const notice=new Notification(n.title,{body:n.body,tag:"deela-books-"+n.id});notice.onclick=()=>{window.focus();route("seller",false);notice.close()};
   }
   if(state.view==="seller")await route("seller",false);
  }
 }catch{}
}
function startSellerNotificationPolling(){
 if(state.sellerNotificationTimer)clearInterval(state.sellerNotificationTimer);
 void pollSellerNotifications();
 state.sellerNotificationTimer=setInterval(pollSellerNotifications,60000);
}
async function enableSellerNotifications(){
 if(!("Notification" in window))return toast("هذا المتصفح لا يدعم إشعارات المواقع");
 try{const p=await Notification.requestPermission();toast(p==="granted"?"تم تفعيل إشعارات البائع على هذا المتصفح":p==="denied"?"ارفض المتصفح الإذن؛ يمكنك تغييره من إعدادات الموقع":"لم يتم تفعيل الإشعارات");if(state.view==="seller")await route("seller",false)}catch{toast("تعذر طلب إذن الإشعارات")}
}
async function messagesData(){
 const r=await api("/messages");return r.messages||[];
}
async function route(view,push=true){
 if(!state.token){openLogin();return}
 if(view==="owner"&&!state.me?.is_owner){toast("مركز الإدارة خاص بالمالك");return}
 if(!state.me?.is_owner&&!state.me?.seller&&view!=="seller"&&view!=="home"){toast("أكمل إعداد صفحة الكاتب أولًا");view="seller"}
 state.view=view;state.current=state.current||"";
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===view));
 $("home").classList.toggle("active",view==="home");$("home").hidden=view!=="home";
 $("dynamicPage").hidden=view==="home";$("dynamicPage").classList.toggle("active",view!=="home");
 if(push)history.replaceState(null,"","#"+(view==="detail"?"book/"+state.current:view));
 if(view==="home")renderHome();
 else{
  if(view==="seller"&&state.me?.seller)await sellerData();
  if(view==="alerts"){const d=await api("/launch-alerts/feed");state.launchAlertFeed=d.alerts||[];for(const x of state.launchAlertFeed)state.launchAlertIds.add(x.id);state.launchAlertsReady=true;}
  if(view==="orders"){const d=await api("/orders");state.orders=d.orders||[];}
  if(view==="owner")await ownerData();
  let markup=view==="catalog"?catalogPage():view==="detail"?detailPage():view==="shops"?shopsPage():
   view==="shop"?shopPage():view==="favorites"?favoritesPage():view==="cart"?cartPage():
   view==="orders"?ordersPage():view==="seller"?sellerPage():view==="alerts"?launchAlertsPage():view==="owner"?ownerPage():"";
  if(view==="messages")markup=messagesPage(enabled("enable_messages")?await messagesData():[]);
  $("pageContent").innerHTML=markup;
  if(view==="detail")trackBookView(state.current);
  if(view==="catalog"){$("formatFilter").value=state.format;$("sortFilter").value=state.sort}
 }
 window.scrollTo({top:0,behavior:"instant"});
}
function book(id){state.current=id;route("detail")}
function trackBookView(id){
 if(!id||!state.token||!state.listings.some(b=>b.id===id&&b.status==="published"))return;
 const key="deela-books-view-day-"+id,day=new Date().toISOString().slice(0,10);
 if(sessionStorage.getItem(key)===day)return;
 sessionStorage.setItem(key,day);api("/view",{method:"POST",data:{listing_id:id}}).catch(()=>sessionStorage.removeItem(key));
}
function openShop(slug){state.current=slug;route("shop")}
function cartChange(id,delta){
 if(!enabled("enable_orders")||!enabled("show_book_prices"))return toast("استقبال الطلبات متوقف من لوحة المالك");
 const b=state.listings.find(x=>x.id===id);if(!b||b.status!=="published"||b.stock<1)return toast("الكتاب غير متاح للشراء");
 const current=state.cart.find(x=>x.id===id);
 if(current)current.qty=Math.max(0,Math.min(Math.min(b.stock,10),current.qty+delta));
 else if(delta>0)state.cart.push({id,qty:1});
 state.cart=state.cart.filter(x=>x.qty>0);saveCart();
 if(state.view==="cart")route("cart",false);
 else toast("تم تحديث السلة");
}
async function toggleLike(id){
 if(!enabled("enable_reader_likes"))return toast("الميزة متوقفة من مركز المالك");
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
  const active=buttons.filter(x=>x.dataset.authEnabled==="true").map(x=>x.dataset.oauth);$("authProviderNote").textContent=active.length?"الدخول المفعّل: "+active.map(x=>({google:"Google",apple:"Apple",twitter:"X"}[x])).join("، "):"الزر جاهز، لكن حساب Google وApple وX لم يُربط بمفاتيحه بعد.";
 }catch{$("authProviderNote").textContent="يتطلب الدخول الاجتماعي ربط حساب المطوّر مرة واحدة."}
}
async function oauthLogin(ev){const b=ev.currentTarget,provider=b.dataset.oauth;if(b.dataset.authEnabled!=="true"){toast("يلزم أولًا ربط بيانات "+({google:"Google",apple:"Apple",twitter:"X"}[provider])+" في إعدادات Supabase");return}try{b.disabled=true;const client=await oauthClient();const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});if(error)throw error}catch(e){toast(errorMessage(e))}finally{b.disabled=false}}
function openLogin(message=""){ $("shade").hidden=false;$("loginModal").hidden=false;switchAuthMethod("phone");if(message)setAuthMessage("phoneMessage",message,true);void loadAuthProviders(); }
function closeLogin(){$("shade").hidden=true;$("loginModal").hidden=true;}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
async function handleForm(ev){
 const form=ev.target,id=form.id;if(!id||["loginForm","registerForm","phoneSendForm","phoneVerifyForm","emailVerifyForm"].includes(id))return;ev.preventDefault();
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
      stock:Number(raw.stock),price_sar:Number(raw.price_sar),shipping_fee_sar:Number(raw.shipping_fee_sar||0),
      compare_at_sar:raw.compare_at_sar===""?null:Number(raw.compare_at_sar),
      page_count:raw.page_count===""?null:Number(raw.page_count),
      publication_year:raw.publication_year===""?null:Number(raw.publication_year)};
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
  }else if(id==="settingsForm"){
    const payload={...state.settings,...state.ownerData?.settings,...raw,
      theme_images:Object.fromEntries(Object.keys(imageKeys).map(k=>[k,raw['image_'+k+'_path']||''])),theme_sections:Object.fromEntries(Object.keys(sectionDefs).map(k=>[k,{title:raw["section_"+k+"_title"]||"",order:Number(raw["section_"+k+"_order"]),material:raw["section_"+k+"_material"],background_color:raw["section_"+k+"_background_color"]||"",accent_color:raw["section_"+k+"_accent_color"]||"",visible:raw["section_"+k+"_visible"]==="on"}])),theme_design:{radius:Number(raw.design_radius),font_size:Number(raw.design_font_size),banner_motion:raw.design_banner_motion},theme_material:raw.theme_material,theme_colors:Object.fromEntries(Object.keys(themeKeys).map(k=>[k,raw["theme_"+k]])),site_public:false,payments_live:false};
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
    await api("/reviews",{method:"POST",data:{listing_id:raw.listing_id,rating:Number(raw.rating),body:raw.body}});
    toast("تم إرسال التقييم لمراجعة المالك");await route("orders",false);
  }else if(id==="reportForm"){
    await api("/reports",{method:"POST",data:{listing_id:raw.listing_id,reason:raw.reason}});
    toast("تم تسجيل البلاغ للمراجعة");await route("catalog",false);
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
 try{await api("/seller/notifications/read",{method:"POST",data:id?{id}:{}});await sellerData();await route("seller",false)}catch(e){toast(errorMessage(e))}
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
 const initialFormat=state.editing?.format||"physical";document.querySelectorAll("#listingForm .physical-only").forEach(x=>x.hidden=initialFormat!=="physical");document.querySelectorAll("#listingForm .digital-only").forEach(x=>x.hidden=initialFormat==="physical");
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
  if(t.dataset.like){ev.preventDefault();return toggleLike(t.dataset.like)}
  if(t.dataset.favorite){ev.preventDefault();return toggleFavorite(t.dataset.favorite)}
  if(t.dataset.follow){ev.preventDefault();return toggleFollow(t.dataset.follow)}
  if(t.dataset.cartPlus){ev.preventDefault();return cartChange(t.dataset.cartPlus,1)}
  if(t.dataset.cartMinus){ev.preventDefault();return cartChange(t.dataset.cartMinus,-1)}
  if(t.dataset.cartRemove){ev.preventDefault();state.cart=state.cart.filter(x=>x.id!==t.dataset.cartRemove);saveCart();return route("cart",false)}
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
  if(t.dataset.reportStatus){ev.preventDefault();return moderate(t.dataset.reportStatus,"report",t.dataset.status)}
  if(t.dataset.reviewStatus){ev.preventDefault();return moderate(t.dataset.reviewStatus,"review",t.dataset.approved)}
  if(t.dataset.editor){ev.preventDefault();return editor(t.dataset.editor)}
  if(t.dataset.download){ev.preventDefault();return download(t.dataset.download)}
  if(t.dataset.ask){ev.preventDefault();return quickModal("راسل بائع الكتاب","messageForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.ask)+'"><label class="field">رسالتك<textarea name="body" required minlength="2" maxlength="1000"></textarea></label>')}
  if(t.dataset.reply){ev.preventDefault();return quickModal("الرد على رسالة","replyForm",
   '<input type="hidden" name="id" value="'+esc(t.dataset.reply)+'"><label class="field">ردك<textarea name="body" required minlength="2" maxlength="1000"></textarea></label>')}
  if(t.dataset.review){ev.preventDefault();return quickModal("تقييم كتاب قرأته","reviewForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.review)+'"><label class="field">التقييم<select name="rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></label><label class="field">رأيك<textarea name="body" required minlength="8" maxlength="1000"></textarea></label>')}
  if(t.dataset.report){ev.preventDefault();return quickModal("الإبلاغ عن كتاب","reportForm",
   '<input type="hidden" name="listing_id" value="'+esc(t.dataset.report)+'"><label class="field">سبب البلاغ<textarea name="reason" required minlength="10" maxlength="1000"></textarea></label>')}
  if(t.dataset.route){ev.preventDefault();return route(t.dataset.route)}
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
 $("accountButton").onclick=()=>state.me?route(state.me.is_owner?"owner":"seller"):openLogin();
 $("closeModal").onclick=closeLogin;$("shade").onclick=closeLogin;
 $("search").addEventListener("input",ev=>{
  state.search=ev.target.value.trim().toLocaleLowerCase();
  if(state.view!=="catalog"&&state.search)route("catalog",false);
  else if(state.view==="catalog")route("catalog",false);
 });
 document.addEventListener("input",ev=>{
  if(!ev.target?.classList?.contains("owner-search"))return;
  const filter=ev.target.value.trim().toLocaleLowerCase();
  document.querySelectorAll("[data-owner-row]").forEach(row=>{
    const byText=!filter||row.textContent.toLocaleLowerCase().includes(filter);
    const status=document.getElementById("ownerStatusFilter")?.value||"all";
    row.hidden=!(byText&&(status==="all"||row.dataset.ownerState===status));
  });
 });
 document.addEventListener("change",ev=>{
  if(ev.target?.closest("#listingForm")&&ev.target.name==="format"){
   const physical=ev.target.value==="physical";document.querySelectorAll("#listingForm .physical-only").forEach(x=>x.hidden=!physical);document.querySelectorAll("#listingForm .digital-only").forEach(x=>x.hidden=physical);
  }
  if(ev.target?.id==="formatFilter"){state.format=ev.target.value;route("catalog",false)}
  if(ev.target?.id==="sortFilter"){state.sort=ev.target.value;route("catalog",false)}
  if(ev.target?.id==="ownerStatusFilter"){
    const status=ev.target.value,search=document.querySelector(".owner-search")?.value.trim().toLocaleLowerCase()||"";
    document.querySelectorAll("[data-owner-row]").forEach(row=>{
      row.hidden=!((status==="all"||row.dataset.ownerState===status)&&(!search||row.textContent.toLocaleLowerCase().includes(search)));
    });
  }
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
 state.token="";state.refreshToken="";state.me=null;state.sellerListings=[];state.sellerNotifications=[];state.view="home";openLogin("تم تسجيل الخروج من DEELA Books.");
}
async function boot(){
 bind();saveCart();$("year").textContent=new Date().getFullYear();
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
 if(!state.token)return openLogin();
 await reload();
 startSellerNotificationPolling();
}
boot();
})();
