import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SELLER_PORTAL="https://mzo77.github.io/DEELA-V2/books-private/seller/";
const guest=ANON_KEY?createClient(SUPABASE_URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const db=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
const fn="/deela-books";
const FEATURE_FLAGS=["enable_seller_registration","enable_book_submissions","enable_reader_likes","enable_favorites","enable_author_follows","enable_reviews","enable_messages","enable_orders","enable_discounts","enable_featured_section","enable_launch_alerts","show_book_prices"] as const;
const PRIVATE_SELLER_ROUTES=new Set(["GET /catalog","GET /shops","GET /me","GET /my/listings","GET /seller/notifications","POST /seller/notifications/read","GET /seller/launch-alerts","POST /seller/launch-alerts/request","GET /launch-alerts/feed","POST /listing","POST /upload/sign"]);

const trusted=new Set(["https://mzo77.github.io","https://appassets.androidplatform.net"]);
const allowedOrigins=(req:Request)=>trusted.has(req.headers.get("origin")||"")?req.headers.get("origin")!:"https://mzo77.github.io";
const respond=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"Content-Type":"application/json; charset=utf-8",
 "Access-Control-Allow-Origin":allowedOrigins(req),"Access-Control-Allow-Headers":"authorization,content-type,apikey",
 "Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin",
 "X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"}
});
const fail=(req:Request,message:string,status=400)=>respond(req,{error:message},status);
const str=(v:unknown,n=250)=>typeof v==="string"?v.trim().slice(0,n):"";
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const slugRE=/^[a-z0-9][a-z0-9-]{2,59}$/;
const error=(e:unknown)=>e instanceof Error?e.message:"unexpected";
const currencies=(n:unknown)=>Number.isFinite(Number(n))&&Number(n)>=0&&Number(n)<=50000
 ?Math.round(Number(n)*100)/100:NaN;
function saudiPhone(value:unknown){
 let phone=str(value,24).replace(/[\s()-]/g,"");
 if(/^05\d{8}$/.test(phone))phone="+966"+phone.slice(1);
 else if(/^5\d{8}$/.test(phone))phone="+966"+phone;
 else if(/^9665\d{8}$/.test(phone))phone="+"+phone;
 return /^\+[1-9]\d{7,14}$/.test(phone)?phone:"";
}
async function getUser(req:Request){
 const header=req.headers.get("authorization")||"";
 if(!/^Bearer \S+$/.test(header)||header.length>8192)return null;
 const result=await db.auth.getUser(header.slice(7));
 return result.error?null:result.data.user;
}
async function owner(userId:string){
 const x=await db.from("profiles").select("role").eq("id",userId).maybeSingle();
 return !x.error&&x.data?.role==="owner";
}
async function sellerFor(userId:string){
 const x=await db.from("deela_books_sellers").select("*").eq("user_id",userId).maybeSingle();
 if(x.error)throw Error("seller read failed");
 return x.data;
}
async function settings(){
 const x=await db.from("deela_books_settings").select("*").eq("id",1).single();
 if(x.error)throw Error("books settings unavailable");
 return x.data;
}
async function userBlocked(userId:string){
 const x=await db.from("deela_books_user_controls").select("blocked").eq("user_id",userId).maybeSingle();
 if(x.error)throw Error("account status unavailable");
 return x.data?.blocked===true;
}
async function signedBranding(conf:Record<string,any>){
 const paths=conf.theme_images&&typeof conf.theme_images==="object"?conf.theme_images:{};
 const urls:Record<string,string>={};
 for(const key of ["logo","background","banner"]){
  const path=typeof paths[key]==="string"?paths[key]:"";
  if(path){const r=await db.storage.from("deela-books-covers").createSignedUrl(path,3600);if(!r.error)urls[key]=r.data.signedUrl;}
 }
 return {...conf,theme_images:urls,theme_image_paths:paths};
}
async function signedMerchandising(rows:any[],imageKey="image_path"){
 return await Promise.all(rows.map(async row=>{
  let image_url="";
  if(row[imageKey]){const x=await db.storage.from("deela-books-covers").createSignedUrl(row[imageKey],3600);if(!x.error)image_url=x.data.signedUrl;}
  return {...row,image_url};
 }));
}
function itemInput(raw:Record<string,unknown>){
 const title=str(raw.title,180),author=str(raw.author,100),description=str(raw.description,5000);
 const subtitle=str(raw.subtitle,220),audience=str(raw.audience,30)||"عام";
 const content_warning=str(raw.content_warning,350);
 const page_count=raw.page_count==null||raw.page_count===""?null:Number(raw.page_count);
 const publication_year=raw.publication_year==null||raw.publication_year===""?null:Number(raw.publication_year);
 const category=str(raw.category,80)||"روايات",language=str(raw.language,50)||"العربية";
 const format=str(raw.format,20),condition=str(raw.book_condition,25)||"new";
 const price=currencies(raw.price_sar),shipping=currencies(raw.shipping_fee_sar??0);
 const compare=raw.compare_at_sar===null||raw.compare_at_sar===""||raw.compare_at_sar===undefined?null:currencies(raw.compare_at_sar);
 const stock=Number(raw.stock),cover=str(raw.cover_path,240),file=str(raw.file_path,240);
 const rights=raw.rights_confirmed===true;
 if(title.length<2||!["physical","ebook","audiobook"].includes(format)||!Number.isInteger(stock)||stock<0||stock>100000||
   Number.isNaN(price)||Number.isNaN(shipping)||Number.isNaN(compare)||
   !["new","like_new","good","acceptable","not_applicable"].includes(condition)||
   description.length<20 || !["عام","الناشئة","للبالغين"].includes(audience) ||
   (page_count!==null&&(!Number.isInteger(page_count)||page_count<1||page_count>50000))||
   (publication_year!==null&&(!Number.isInteger(publication_year)||publication_year<1000||publication_year>2100)))
   throw Error("تحقق من عنوان الكتاب ونوعه والسعر والكمية");
 if(!rights)throw Error("يجب تأكيد ملكية حقوق النشر أو إذن التوزيع");
 if(format!=="physical"&&file.length===0)throw Error("الكتاب الرقمي يحتاج ملف PDF أو EPUB أو MP3 مرفوعًا");
 return {title,author,description,subtitle,audience,content_warning,page_count,publication_year,category,language,format,book_condition:format==="physical"?condition:"not_applicable",
   price_sar:price,compare_at_sar:compare,stock,shipping_fee_sar:format==="physical"?shipping:0,
   isbn:str(raw.isbn,30),city:str(raw.city,80),cover_path:cover||null,file_path:file||null,
   preview_excerpt:str(raw.preview_excerpt,3000),rights_confirmed:rights,updated_at:new Date().toISOString()};
}
function publicListing(p:Record<string,unknown>){
 const {file_path,moderation_note,rights_confirmed,...data}=p;
 return data;
}
async function signedCovers(products:any[]){
 return await Promise.all(products.map(async p=>{
   let cover_url:string|null=null;
   if(p.cover_path){
     const z=await db.storage.from("deela-books-covers").createSignedUrl(p.cover_path,600);
     if(!z.error)cover_url=z.data.signedUrl;
   }
   return {...publicListing(p),cover_url};
 }));
}
async function enrichBooks(books:any[]){
 if(!books.length)return books;
 const ids=books.map(x=>x.id);
 const [likes,reviews]=await Promise.all([
  db.from("deela_books_likes").select("listing_id").in("listing_id",ids).limit(10000),
  db.from("deela_books_reviews").select("id,listing_id,rating,body,created_at")
    .in("listing_id",ids).eq("approved",true).order("created_at",{ascending:false}).limit(10000)
 ]);
 if(likes.error||reviews.error)throw Error("book community data unavailable");
 const likeMap=new Map<string,number>(),reviewMap=new Map<string,{count:number,sum:number,items:any[]}>();
 for(const x of likes.data||[])likeMap.set(x.listing_id,(likeMap.get(x.listing_id)||0)+1);
 for(const x of reviews.data||[]){
  const v=reviewMap.get(x.listing_id)||{count:0,sum:0,items:[]};
  v.count++;v.sum+=x.rating;
  if(v.items.length<8)v.items.push({id:x.id,rating:x.rating,body:x.body,created_at:x.created_at});
  reviewMap.set(x.listing_id,v);
 }
 const signed=await signedCovers(books);
 return signed.map(p=>{
  const r=reviewMap.get(p.id);
  return {...p,like_count:likeMap.get(p.id)||0,review_count:r?.count||0,
   average_rating:r?Math.round(r.sum/r.count*10)/10:0,
   reviews:r?.items||[]};
 });
}
async function currentListings(isOwner:boolean,search:URLSearchParams,featureEnabled=true){
 let q=db.from("deela_books_listings")
  .select("*,deela_books_sellers!inner(id,shop_name,slug,status,city)");
 if(featureEnabled)q=q.order("featured",{ascending:false});
 q=q.order("created_at",{ascending:false}).limit(80);
 if(!isOwner)q=q.eq("status","published").eq("deela_books_sellers.status","approved");
 else if(search.get("only_public")==="1")q=q.eq("status","published");
 if(search.get("format")&&["physical","ebook","audiobook"].includes(search.get("format")!))
   q=q.eq("format",search.get("format")!);
 const result=await q;
 if(result.error)throw result.error;
 const category=str(search.get("category"),80);
 const words=str(search.get("q"),100).toLocaleLowerCase();
 const selected=(result.data||[]).filter(p=>(!category||p.category===category)&&(!words||[p.title,p.author,p.category,p.description].some((v:string)=>String(v||"").toLocaleLowerCase().includes(words))));
 return await enrichBooks(selected);
}
async function ownerOverview(req:Request){
 const checks=[
  ["shops",db.from("deela_books_sellers").select("id",{count:"exact",head:true})],
  ["pending_shops",db.from("deela_books_sellers").select("id",{count:"exact",head:true}).eq("status","pending")],
  ["books",db.from("deela_books_listings").select("id",{count:"exact",head:true})],
  ["pending_books",db.from("deela_books_listings").select("id",{count:"exact",head:true}).eq("status","pending")],
  ["published_books",db.from("deela_books_listings").select("id",{count:"exact",head:true}).eq("status","published")],
  ["orders",db.from("deela_books_orders").select("id",{count:"exact",head:true})],
  ["pending_orders",db.from("deela_books_orders").select("id",{count:"exact",head:true}).in("status",["pending_review","awaiting_payment"])],
  ["open_reports",db.from("deela_books_reports").select("id",{count:"exact",head:true}).eq("status","open")],
  ["messages",db.from("deela_books_messages").select("id",{count:"exact",head:true})],
  ["likes",db.from("deela_books_likes").select("listing_id",{count:"exact",head:true})],
  ["reviews",db.from("deela_books_reviews").select("id",{count:"exact",head:true})],
  ["followers",db.from("deela_books_follows").select("seller_id",{count:"exact",head:true})]
 ] as const;
 const all=await Promise.all(checks.map(async ([name,query])=>({name,res:await query})));
 if(all.some(x=>x.res.error))throw Error("Owner dashboard counters unavailable");
 const totals=Object.fromEntries(all.map(x=>[x.name,x.res.count||0]));
 const paid=await db.from("deela_books_orders")
  .select("total_sar").not("payment_confirmed_at","is",null).limit(1000);
 if(paid.error)throw paid.error;
 const confirmed_amount_sar=(paid.data||[]).reduce((sum,x)=>sum+Number(x.total_sar||0),0);
 return respond(req,{...totals,confirmed_amount_sar,confirmed_amount_note:"مبالغ أكّد المالك استلامها يدويًا، وليست تحصيلًا إلكترونيًا",
   confirmed_amount_limited:(paid.data||[]).length===1000});
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":allowedOrigins(req),"Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":"authorization,content-type,apikey","Vary":"Origin"}});
 const parsed=new URL(req.url),path=parsed.pathname.split(fn)[1]||"/";
 if(req.method==="GET"&&path==="/health")return respond(req,{ok:true,name:"DEELA Books",owner_console_only:true,private_seller_portal:true,payments_live:false,shipping_live:false});
 try{
  const authProviderNames:Record<string,string>={google:"Google",apple:"Apple",azure:"Microsoft",facebook:"Facebook",github:"GitHub",discord:"Discord",twitter:"X",linkedin_oidc:"LinkedIn",gitlab:"GitLab",spotify:"Spotify",slack:"Slack"};
  const authGuest=()=>{if(!guest)throw Error("مصادقة البريد غير مهيأة على الخادم");return guest};
  if(req.method==="GET"&&path==="/seller/registration-info"){
    const conf=await settings();
    const cats=await db.from("deela_books_sections").select("id,title,description,category,sort_order").eq("kind","category").eq("visible",true).order("sort_order").limit(1000);
    if(cats.error)throw cats.error;
    const defaults=["روايات","أدب وشعر","خيال ورعب","تطوير الذات","تاريخ","كتب الأطفال","فلسفة","تقنية","ديني","أخرى"];
    const custom=cats.data||[],present=new Set(custom.map((x:any)=>x.category).filter(Boolean));
    const sections=[...custom,...defaults.filter(title=>!present.has(title)).map((title,index)=>({id:"default-"+index,title,description:"تصنيف متاح لإضافة الكتب والروايات",category:title,sort_order:1000+index}))];
    return respond(req,{site_public:false,registration_enabled:conf.enable_seller_registration===true,submissions_enabled:conf.enable_book_submissions===true,
      sections,formats:["ورقي","إلكتروني","صوتي"],seller_review_required:true,
      pricing_note:"لا توجد رسوم أو عروض مدفوعة مفعّلة حاليًا في البوابة؛ المدفوعات الحقيقية مغلقة."});
  }
  if(req.method==="GET"&&path==="/auth/providers"){
    let enabled:Record<string,boolean>={};
    if(ANON_KEY){try{const r=await fetch(SUPABASE_URL+"/auth/v1/settings",{headers:{apikey:ANON_KEY},signal:AbortSignal.timeout(7000)});if(r.ok){const x=await r.json();const ext=x.external||{};for(const k of Object.keys(authProviderNames))enabled[k]=ext[k]===true;}}catch{}}
    return respond(req,{providers:authProviderNames,enabled});
  }
  if(req.method==="GET"&&path==="/auth/oauth"){
    const provider=parsed.searchParams.get("provider")||"";
    if(!Object.hasOwn(authProviderNames,provider))return fail(req,"مزود تسجيل الدخول غير مدعوم",400);
    if(!ANON_KEY)return fail(req,"إعدادات تسجيل الدخول الخارجي غير مهيأة",503);
    const cfg=await fetch(SUPABASE_URL+"/auth/v1/settings",{headers:{apikey:ANON_KEY},signal:AbortSignal.timeout(7000)});
    const set=cfg.ok?await cfg.json():{};
    if(set.external?.[provider]!==true)return fail(req,"هذا المزود لم يُربط بعد بحساب المطور",503);
    const u=new URL(SUPABASE_URL+"/auth/v1/authorize");u.searchParams.set("provider",provider);u.searchParams.set("redirect_to",SELLER_PORTAL);
    const r=await fetch(u,{headers:{apikey:ANON_KEY},redirect:"manual",signal:AbortSignal.timeout(10000)}),location=r.headers.get("location");
    if(!location||r.status<300||r.status>=400)return fail(req,"تعذر بدء تسجيل الدخول بهذا المزود",502);
    return new Response(null,{status:302,headers:{Location:location,"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
  }
  if(req.method==="POST"&&path==="/auth/register"){
    const conf=await settings();if(!conf.enable_seller_registration)return fail(req,"التسجيل مغلق مؤقتًا",403);
    const b=await req.json(),email=str(b.email,254).toLowerCase(),password=typeof b.password==="string"?b.password:"";
    if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>128)return fail(req,"أدخل بريدًا صحيحًا وكلمة مرور من 12 إلى 128 خانة",400);
    const r=await authGuest().auth.signUp({email,password,options:{data:{deela_books_account:true},emailRedirectTo:SELLER_PORTAL}});
    if(r.error){const msg=r.error.message||"";if(/redirect|allow.?list/i.test(msg))return fail(req,"يلزم إضافة رابط بوابة البائع إلى قائمة Redirect URLs في إعدادات مصادقة Supabase",503);return fail(req,"تعذر إنشاء الحساب. تحقق من البيانات أو حاول لاحقًا",400);}
    return respond(req,{ok:true,email,confirmation_required:!r.data.session,message:r.data.session?"تم إنشاء الحساب وتسجيل الدخول":"أرسلنا رسالة تحقق إلى بريدك. أدخل رمز التحقق أو افتح رابط الرسالة."},201);
  }
  if(req.method==="POST"&&path==="/auth/login"){
    const b=await req.json(),email=str(b.email,254).toLowerCase(),password=typeof b.password==="string"?b.password:"";
    if(!email||!password)return fail(req,"أدخل البريد وكلمة المرور",400);
    const r=await authGuest().auth.signInWithPassword({email,password});
    if(r.error||!r.data.session)return fail(req,"بيانات الدخول غير صحيحة أو لم يتم تأكيد البريد",401);
    return respond(req,{access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token,expires_at:r.data.session.expires_at,user:{id:r.data.user.id,email:r.data.user.email}});
  }
  if(req.method==="POST"&&path==="/auth/refresh"){
    const b=await req.json(),refresh_token=str(b.refresh_token,2048);if(!refresh_token)return fail(req,"جلسة الدخول منتهية. سجّل الدخول مرة أخرى.",401);
    const r=await authGuest().auth.refreshSession({refresh_token});
    if(r.error||!r.data.session)return fail(req,"انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.",401);
    return respond(req,{access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token,expires_at:r.data.session.expires_at,user:{id:r.data.user.id,email:r.data.user.email,phone:r.data.user.phone}});
  }
  if(req.method==="POST"&&path==="/auth/phone/send"){
    const conf=await settings();if(!conf.enable_seller_registration)return fail(req,"التسجيل مغلق مؤقتًا",403);
    const b=await req.json(),phone=saudiPhone(b.phone),channel=str(b.channel,20)==="whatsapp"?"whatsapp":"sms";
    if(!phone)return fail(req,"أدخل رقم جوال سعودي صحيحًا مثل 5XXXXXXXX",400);
    const r=await authGuest().auth.signInWithOtp({phone,options:{channel,shouldCreateUser:true,data:{deela_books_account:true}}});
    if(r.error){
      const details=(r.error.message||"").toLowerCase();
      if(/sms|phone|provider|twilio|whatsapp|not enabled|disabled/.test(details))return fail(req,channel==="whatsapp"?"إرسال واتساب يحتاج ربط Twilio Verify وقالب واتساب معتمد في Supabase؛ اختر SMS بعد ربط مشغل الرسائل.":"إرسال رمز الجوال يحتاج تفعيل مصادقة الهاتف وربط مشغل SMS في Supabase.",503);
      if(r.error.status===429)return fail(req,"طلبات الرموز كثيرة. انتظر قليلًا قبل إعادة المحاولة.",429);
      return fail(req,"تعذر إرسال رمز التحقق. تحقق من الرقم ومشغل الرسائل.",400);
    }
    return respond(req,{ok:true,phone,channel,message:channel==="whatsapp"?"أرسلنا رمزًا إلى واتساب إذا كان المشغل مهيأً.":"أرسلنا رمز التحقق إلى الجوال."});
  }
  if(req.method==="POST"&&path==="/auth/phone/verify"){
    const b=await req.json(),phone=saudiPhone(b.phone),token=str(b.token,12);
    if(!phone||!/^\d{6,8}$/.test(token))return fail(req,"أدخل رقم الجوال والرمز المكوّن من 6 أرقام",400);
    const r=await authGuest().auth.verifyOtp({phone,token,type:"sms"});
    if(r.error||!r.data.session)return fail(req,"الرمز غير صحيح أو انتهت صلاحيته. أعد إرسال رمز جديد.",400);
    return respond(req,{access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token,expires_at:r.data.session.expires_at,user:{id:r.data.user.id,phone:r.data.user.phone}});
  }
  if(req.method==="POST"&&path==="/auth/verify-email"){
    const b=await req.json(),email=str(b.email,254).toLowerCase(),token=str(b.token,20);
    if(!email||!/^\d{6,8}$/.test(token))return fail(req,"أدخل رمز التحقق المرسل إلى بريدك",400);
    const r=await authGuest().auth.verifyOtp({email,token,type:"signup"});
    if(r.error||!r.data.session)return fail(req,"رمز التحقق غير صحيح أو منتهي. اطلب رمزًا جديدًا",400);
    return respond(req,{access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token,expires_at:r.data.session.expires_at,user:{id:r.data.user.id,email:r.data.user.email}});
  }
  if(req.method==="POST"&&path==="/auth/resend-verification"){
    const b=await req.json(),email=str(b.email,254).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return fail(req,"أدخل بريدًا صحيحًا",400);
    const r=await authGuest().auth.resend({type:"signup",email,options:{emailRedirectTo:SELLER_PORTAL}});
    if(r.error)return fail(req,"تعذر إرسال رسالة التحقق الآن",429);
    return respond(req,{ok:true,message:"إذا كان البريد مسجلًا، أُرسلت رسالة التحقق."});
  }
  if(req.method==="POST"&&path==="/auth/recover"){
    const b=await req.json(),email=str(b.email,254).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return fail(req,"أدخل بريدًا صحيحًا",400);
    const r=await authGuest().auth.resetPasswordForEmail(email,{redirectTo:SUPABASE_URL+"/functions/v1/deela-control/recover"});
    if(r.error&&r.error.status===429)return fail(req,"طلبات الاستعادة كثيرة حاليًا. انتظر قليلًا ثم أعد المحاولة.",429);
    if(r.error&&r.error.status>=500)return fail(req,"تعذر إرسال رابط الاستعادة الآن",503);
    return respond(req,{ok:true,message:"إذا كان البريد مسجلًا، أرسلنا رابط استعادة كلمة المرور."});
  }
  const user=await getUser(req),isOwner=user?await owner(user.id):false;
  if(user&&!isOwner&&await userBlocked(user.id))return fail(req,"تم إيقاف هذا الحساب من إدارة DEELA Books",403);
  const conf=await settings();
  const sellerAccount=user&&!isOwner?await sellerFor(user.id):null;
  const privateSeller=!!sellerAccount&&sellerAccount.status==="approved"&&!conf.site_public;
  const pendingSeller=!!sellerAccount&&sellerAccount.status==="pending"&&!conf.site_public;
  const privateApplicant=!!user&&!isOwner&&!sellerAccount&&!conf.site_public&&conf.enable_seller_registration===true;
  // The private marketplace permits only the signed-in applicant profile and application endpoints before owner approval.
  if(!isOwner&&!conf.site_public){
    if(!privateSeller&&!pendingSeller&&!privateApplicant)return fail(req,"موقع DEELA Books خاص، ويتطلب دخول المالك أو بائعًا معتمدًا",403);
    const pendingRoutes=new Set(["GET /catalog","GET /shops","GET /me","GET /my/listings","GET /seller/notifications","POST /seller/notifications/read","GET /seller/launch-alerts","POST /seller/launch-alerts/request","POST /listing","POST /upload/sign"]);
    const allowed=privateSeller?PRIVATE_SELLER_ROUTES.has(req.method+" "+path):pendingSeller?pendingRoutes.has(req.method+" "+path):new Set(["GET /me","POST /seller/apply"]).has(req.method+" "+path);
    if(!allowed)return fail(req,"هذه الخاصية غير متاحة قبل اعتماد المتجر",403);
  }
  if(req.method==="GET"&&path==="/catalog"){
    if(privateSeller||pendingSeller){
      const categories=await db.from("deela_books_sections").select("id,title,description,kind,category,sort_order,visible").eq("kind","category").eq("visible",true).order("sort_order").limit(1000);
      if(categories.error)throw categories.error;
      const sellerSettings={site_public:false,seller_pending:pendingSeller,...Object.fromEntries(FEATURE_FLAGS.map(k=>[k,conf[k]]))};
      return respond(req,{listings:[],settings:sellerSettings,sections:categories.data||[],banners:[],payments_live:false,shipping_live:false,currency:"SAR"});
    }
    const [sectionRows,bannerRows,theme]=await Promise.all([
      db.from("deela_books_sections").select("id,title,description,kind,category,image_path,material,design,sort_order,visible").eq("visible",true).order("sort_order").limit(1000),
      db.from("deela_books_banners").select("id,title,image_path,target_url,motion,active,starts_at,ends_at,sort_order").eq("active",true).or("starts_at.is.null,starts_at.lte."+new Date().toISOString()).or("ends_at.is.null,ends_at.gt."+new Date().toISOString()).order("sort_order").limit(50),
      signedBranding(conf)
    ]);
    if(sectionRows.error||bannerRows.error)throw Error("merchandising settings unavailable");
    const publicSettings={name:conf.name,hero_title:conf.hero_title,hero_subtitle:conf.hero_subtitle,
      announcement:conf.announcement,support_url:conf.support_url,site_public:conf.site_public,
      home_promo_title:conf.home_promo_title,home_promo_description:conf.home_promo_description,
      theme_colors:conf.theme_colors,theme_material:conf.theme_material,theme_design:conf.theme_design,
      theme_sections:conf.theme_sections,theme_images:theme.theme_images,
      ...Object.fromEntries(FEATURE_FLAGS.map(k=>[k,conf[k]]))};
    return respond(req,{
    listings:(await currentListings(isOwner,parsed.searchParams,conf.enable_featured_section)).map((x:any)=>!isOwner&&!conf.show_book_prices?
      {...x,price_sar:null,compare_at_sar:null}:x),
    settings:publicSettings,
    sections:await signedMerchandising(sectionRows.data||[]),
    banners:await signedMerchandising(bannerRows.data||[]),
    payments_live:false,shipping_live:false,currency:"SAR"
    });
  }
  if(req.method==="GET"&&path==="/shops"){
    if(privateSeller||pendingSeller)return respond(req,{shops:[{id:sellerAccount.id,shop_name:sellerAccount.shop_name,slug:sellerAccount.slug,bio:sellerAccount.bio,city:sellerAccount.city,status:sellerAccount.status,follower_count:0}]});
    const q=db.from("deela_books_sellers").select("id,shop_name,slug,bio,city,status,created_at").order("created_at",{ascending:false}).limit(70);
    if(!isOwner)q.eq("status","approved");
    const {data,error:e}=await q;
    if(e)throw e;
    const sellerIds=(data||[]).map(x=>x.id);
    let follows:any[]=[];
    if(sellerIds.length){
      const fr=await db.from("deela_books_follows").select("seller_id").in("seller_id",sellerIds).limit(10000);
      if(fr.error)throw fr.error;
      follows=fr.data||[];
    }
    const counts=new Map<string,number>();
    follows.forEach(x=>counts.set(x.seller_id,(counts.get(x.seller_id)||0)+1));
    return respond(req,{shops:(data||[]).map(x=>({...x,follower_count:counts.get(x.id)||0}))});
  }
  if(!user)return fail(req,"سجّل الدخول أولًا",401);
  if(req.method==="GET"&&path==="/me"){
    const [seller,favs,likes,follows,myOrders]=await Promise.all([
      sellerFor(user.id),
      db.from("deela_books_favorites").select("listing_id").eq("user_id",user.id).limit(200),
      db.from("deela_books_likes").select("listing_id").eq("user_id",user.id).limit(200),
      db.from("deela_books_follows").select("seller_id").eq("user_id",user.id).limit(200),
      db.from("deela_books_orders").select("id,code,status,total_sar,created_at,tracking_number,owner_note").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50)
    ]);
    if(favs.error||likes.error||follows.error||myOrders.error)throw Error("customer profile unavailable");
    return respond(req,{id:user.id,email:user.email||"",phone:user.phone||"",seller,
      favorites:(favs.data||[]).map((x:any)=>x.listing_id),
      likes:(likes.data||[]).map((x:any)=>x.listing_id),
      following:(follows.data||[]).map((x:any)=>x.seller_id),
      orders:myOrders.data||[],is_owner:isOwner});
  }
  if(req.method==="POST"&&path==="/seller/apply"){
    if(!conf.enable_seller_registration)return fail(req,"فتح المتاجر مقفل مؤقتًا من لوحة المالك",403);
    if(!isOwner&&!user.email_confirmed_at&&!user.phone_confirmed_at)return fail(req,"أكد بريدك أو رقم جوالك أولًا قبل طلب فتح المتجر",403);
    const b=await req.json(),shop_name=str(b.shop_name,100),slug=str(b.slug,60).toLowerCase();
    if(shop_name.length<3||!slugRE.test(slug))return fail(req,"أدخل اسم متجر ورابطًا صحيحًا بالإنجليزية");
    if(await sellerFor(user.id))return fail(req,"يوجد طلب متجر مرتبط بهذا الحساب بالفعل",409);
    const payload={user_id:user.id,shop_name,slug,bio:str(b.bio,1000),
      city:str(b.city,80),country:str(b.country,80)||"السعودية",
      status:isOwner?"approved":"pending"};
    const r=await db.from("deela_books_sellers").insert(payload).select("id,shop_name,slug,status").single();
    if(r.error)return fail(req,r.error.code==="23505"?"رابط المتجر محجوز":"تعذر فتح المتجر",409);
    return respond(req,{shop:r.data},201);
  }
  if(req.method==="GET"&&path==="/my/listings"){
    const seller=await sellerFor(user.id);
    if(!seller)return respond(req,{listings:[]});
    const r=await db.from("deela_books_listings").select("*").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(120);
    if(r.error)throw r.error;
    const enriched=await enrichBooks(r.data||[]);
    const original=new Map((r.data||[]).map(p=>[p.id,p]));
    return respond(req,{listings:enriched.map(p=>({...p,
      file_path:original.get(p.id)?.file_path,
      rights_confirmed:original.get(p.id)?.rights_confirmed}))});
  }
  if(req.method==="GET"&&path==="/seller/notifications"){
    const r=await db.from("deela_books_notifications").select("id,listing_id,event_type,title,body,read_at,created_at")
      .eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;
    return respond(req,{notifications:r.data||[]});
  }
  if(req.method==="POST"&&path==="/seller/notifications/read"){
    const b=await req.json(),id=str(b.id,60);
    let q=db.from("deela_books_notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);
    if(id){if(!uuid.test(id))return fail(req,"معرّف التنبيه غير صحيح");q=q.eq("id",id);}
    const r=await q.select("id");if(r.error)throw r.error;
    return respond(req,{ok:true,updated:r.data?.length||0});
  }
  if(req.method==="GET"&&path==="/seller/launch-alerts"){
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"متجر الكاتب غير موجود",404);
    if(seller.status!=="approved")return respond(req,{campaigns:[],price_sar:Number(conf.launch_alert_price_sar||0),enabled:false,payments_live:false,push_background_enabled:false});
    const r=await db.from("deela_books_launch_alerts").select("id,listing_id,amount_sar,payment_reference,status,payment_confirmed_at,published_at,created_at,deela_books_listings(title,category,format)").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;return respond(req,{campaigns:r.data||[],price_sar:Number(conf.launch_alert_price_sar||0),enabled:conf.site_public===true&&conf.enable_launch_alerts===true&&Number(conf.launch_alert_price_sar||0)>0,payments_live:false,push_background_enabled:false});
  }
  if(req.method==="POST"&&path==="/seller/launch-alerts/request"){
    const seller=await sellerFor(user.id);if(!seller||seller.status!=="approved")return fail(req,"يجب اعتماد متجرك أولًا",403);
    const b=await req.json(),price=Number(conf.launch_alert_price_sar||0),reference=str(b.payment_reference,160),listingId=str(b.listing_id,60);
    if(conf.site_public!==true||conf.enable_launch_alerts!==true||!Number.isFinite(price)||price<=0)return fail(req,"الخدمة لا تستقبل مدفوعات ما دام المتجر خاصًا أو الإعلان غير مفعّل",403);
    if(reference.length<3)return fail(req,"أدخل مرجع التحويل البنكي بعد إتمامه خارج المنصة");
    if(!uuid.test(listingId))return fail(req,"اختر رواية منشورة صحيحة");
    const listing=await db.from("deela_books_listings").select("id,title,status,seller_id").eq("id",listingId).eq("seller_id",seller.id).maybeSingle();
    if(listing.error||!listing.data||listing.data.status!=="published")return fail(req,"يمكن طلب التنبيه لكتابك المنشور فقط",404);
    const r=await db.from("deela_books_launch_alerts").insert({seller_id:seller.id,listing_id:listingId,amount_sar:price,payment_reference:reference,status:"payment_review"}).select("id,status,amount_sar").single();
    if(r.error)throw r.error;return respond(req,{ok:true,campaign:r.data,payment_recorded:false,message:"أُرسل المرجع للمراجعة. لا يُرسل الإعلان إلا بعد التحقق اليدوي من وصول المبلغ."});
  }
  if(req.method==="GET"&&path==="/launch-alerts/feed"){
    if(!conf.site_public&&!isOwner)return fail(req,"التنبيهات العامة مغلقة ما دامت المنصة خاصة",403);
    const r=await db.from("deela_books_launch_alerts").select("id,listing_id,published_at,deela_books_sellers(shop_name,slug),deela_books_listings(title,category,format)").eq("status","published").order("published_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;return respond(req,{alerts:r.data||[],push_background_enabled:false});
  }
  if(req.method==="POST"&&path==="/owner/launch-alert-status"){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    const b=await req.json(),id=str(b.id,60),status=str(b.status,20);
    if(!uuid.test(id)||!["published","rejected"].includes(status))return fail(req,"حالة التنبيه غير صحيحة");
    const existing=await db.from("deela_books_launch_alerts").select("id,status,payment_reference").eq("id",id).maybeSingle();
    if(existing.error)throw existing.error;if(!existing.data)return fail(req,"الطلب غير موجود",404);
    if(status==="published"&&(conf.site_public!==true||conf.enable_launch_alerts!==true||Number(conf.launch_alert_price_sar||0)<=0||existing.data.status!=="payment_review"||str(existing.data.payment_reference,160).length<3))return fail(req,"لا يمكن نشر الإعلان قبل إطلاق المتجر وتفعيل الخدمة ومراجعة مرجع الدفع",403);
    const now=new Date().toISOString();
    const update=status==="published"?{status,payment_confirmed_by:user.id,payment_confirmed_at:now,published_at:now,updated_at:now}:{status,updated_at:now};
    const saved=await db.from("deela_books_launch_alerts").update(update).eq("id",id).select("id,status,published_at").single();
    if(saved.error)throw saved.error;return respond(req,{ok:true,campaign:saved.data,payment_live:false,push_background_enabled:false});
  }
  if(req.method==="POST"&&path==="/view"){
    const b=await req.json(),id=str(b.listing_id,60);
    if(!uuid.test(id))return fail(req,"معرّف الرواية غير صحيح");
    const book=await db.from("deela_books_listings").select("id,title,status,seller_id,view_count,deela_books_sellers!inner(user_id,status)").eq("id",id).maybeSingle();
    if(book.error||!book.data)return fail(req,"الرواية غير موجودة",404);
    if(book.data.status!=="published"||(book.data.deela_books_sellers as any)?.status!=="approved")return fail(req,"الرواية غير منشورة",404);
    const sellerUser=(book.data.deela_books_sellers as any)?.user_id;
    if(sellerUser===user.id)return respond(req,{ok:true,counted:false,view_count:Number(book.data.view_count||0)});
    const inserted=await db.from("deela_books_listing_views").insert({listing_id:id,user_id:user.id});
    if(inserted.error&&inserted.error.code!=="23505")throw inserted.error;
    const counted=!inserted.error;
    let current=Number(book.data.view_count||0);
    if(counted){
      const fresh=await db.from("deela_books_listings").select("view_count").eq("id",id).single();
      if(fresh.error)throw fresh.error;current=Number(fresh.data.view_count||0);
      if(current>0&&current%10===0){
        const prior=await db.from("deela_books_notifications").select("id").eq("user_id",sellerUser).eq("listing_id",id).eq("event_type","view_milestone").eq("title",`وصلت روايتك إلى ${current} مشاهدة`).limit(1);
        if(prior.error)throw prior.error;
        if(!prior.data?.length){
          const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,event_type:"view_milestone",title:`وصلت روايتك إلى ${current} مشاهدة`,body:`حققت رواية «${str(book.data.title,120)}» ${current} مشاهدة فريدة.`});
          if(note.error)throw note.error;
        }
      }
    }
    return respond(req,{ok:true,counted,view_count:current});
  }
  if(req.method==="POST"&&path==="/listing"){
    if(!conf.enable_book_submissions)return fail(req,"استقبال الكتب متوقف مؤقتًا",403);
    const b=await req.json(),seller=await sellerFor(user.id);
    if(!seller||(!isOwner&&seller.status!=="approved"&&!(seller.status==="pending"&&!conf.site_public)))return fail(req,"يجب أن يكون متجرك معتمدًا لإضافة الكتب",403);
    const values=itemInput(b),id=str(b.id,60);
    const baseCategories=["روايات","أدب وشعر","خيال ورعب","تطوير الذات","تاريخ","كتب الأطفال","فلسفة","تقنية","ديني","أخرى"];
    if(!baseCategories.includes(values.category)){
      const custom=await db.from("deela_books_sections").select("id").eq("kind","category").eq("category",values.category).limit(1);
      if(custom.error)throw custom.error;
      if(!custom.data?.length)return fail(req,"اختر قسمًا معرفًا في المتجر للرواية",400);
    }
    if(!conf.enable_discounts&&values.compare_at_sar!==null)
      return fail(req,"خصومات الأسعار معطلة من مركز المالك",403);
    // File ownership is always tied to the authenticated upload identity.
    if(values.cover_path&&!values.cover_path.startsWith(user.id+"/covers/"))return fail(req,"ملف الغلاف ليس ملك حسابك",403);
    if(values.file_path&&!values.file_path.startsWith(user.id+"/books/"))return fail(req,"ملف الكتاب ليس ملك حسابك",403);
    let r;
    if(id){
      if(!uuid.test(id))return fail(req,"معرّف الكتاب غير صحيح");
      const prev=await db.from("deela_books_listings").select("id,status").eq("id",id).eq("seller_id",seller.id).maybeSingle();
      if(prev.error||!prev.data)return fail(req,"لا يحق لك تعديل هذا الكتاب",403);
      r=await db.from("deela_books_listings").update({...values,status:"pending",moderation_note:""}).eq("id",id).eq("seller_id",seller.id).select("id,title,status").single();
    }else{
      r=await db.from("deela_books_listings").insert({...values,seller_id:seller.id,status:"pending"}).select("id,title,status").single();
    }
    if(r.error)throw r.error;
    return respond(req,{ok:true,listing:r.data,requires_approval:true},id?200:201);
  }
  if(req.method==="POST"&&path==="/upload/sign"){
    const b=await req.json(),type=str(b.type,16),extension=str(b.extension,12).toLowerCase();
    if(type!=="branding"&&!conf.enable_book_submissions)return fail(req,"رفع الكتب متوقف مؤقتًا",403);
    if(type==="branding"&&!isOwner)return fail(req,"رفع صور الهوية متاح للمالك فقط",403);
    const seller=type==="branding"?null:await sellerFor(user.id);
    if(type!=="branding"&&(!seller||(!isOwner&&seller.status!=="approved"&&!(seller.status==="pending"&&!conf.site_public))))return fail(req,"حساب متجر معتمد مطلوب",403);
    const extOk=type==="branding"?["jpg","jpeg","png","webp"]:type==="cover"?["jpg","jpeg","png","webp"]:["pdf","epub","mp3"];
    if(!extOk.includes(extension))return fail(req,"نوع الملف غير مدعوم",400);
    const folder=type==="branding"?"branding":type==="cover"?"covers":"books";
    const bucket=type==="file"?"deela-books-private-files":"deela-books-covers";
    const path=user.id+"/"+folder+"/"+crypto.randomUUID()+"."+extension;
    const result=await db.storage.from(bucket).createSignedUploadUrl(path);
    if(result.error)throw result.error;
    return respond(req,{bucket,path,token:result.data.token,max_bytes:type==="branding"?3145728:type==="cover"?5242880:52428800});
  }
  if(req.method==="GET"&&path==="/download"){
    const id=str(parsed.searchParams.get("id"),60);
    if(!uuid.test(id))return fail(req,"كتاب غير صحيح");
    const r=await db.from("deela_books_listings").select("id,file_path,format,status").eq("id",id).maybeSingle();
    if(r.error||!r.data||!r.data.file_path)return fail(req,"الكتاب الرقمي غير موجود",404);
    if(!isOwner){
      const paid=await db.from("deela_books_order_items")
        .select("order_id,deela_books_orders!inner(buyer_id,status)")
        .eq("listing_id",id).eq("deela_books_orders.buyer_id",user.id).in("deela_books_orders.status",["paid","preparing","shipped","delivered"]).limit(1);
      if(paid.error||!(paid.data||[]).length)return fail(req,"حمّل الكتاب بعد اعتماد طلبك فقط",403);
    }
    const signed=await db.storage.from("deela-books-private-files").createSignedUrl(r.data.file_path,90);
    if(signed.error)throw signed.error;
    return respond(req,{url:signed.data.signedUrl,expires_in:90});
  }
  if(req.method==="POST"&&path==="/like"){
    if(!conf.enable_reader_likes)return fail(req,"الإعجابات معطلة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60);
    if(!uuid.test(id)||typeof b.liked!=="boolean")return fail(req,"إعجاب غير صالح",400);
    const check=await db.from("deela_books_listings")
      .select("id,title,status,seller_id,deela_books_sellers!inner(status,user_id)").eq("id",id).maybeSingle();
    if(check.error||!check.data)return fail(req,"الكتاب غير موجود",404);
    if(!isOwner&&(check.data.status!=="published"||
       (check.data.deela_books_sellers as any)?.status!=="approved"))
      return fail(req,"الكتاب لم يُنشر بعد",403);
    if(b.liked){
      const prior=await db.from("deela_books_likes").select("listing_id").eq("listing_id",id).eq("user_id",user.id).maybeSingle();
      if(prior.error)throw prior.error;
      const r=await db.from("deela_books_likes").upsert({listing_id:id,user_id:user.id},{onConflict:"user_id,listing_id"});
      if(r.error)throw r.error;
      const sellerUser=(check.data.deela_books_sellers as any)?.user_id;
      if(!prior.data&&sellerUser&&sellerUser!==user.id){
        const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,event_type:"like",title:"إعجاب جديد بروايتك",body:`أعجب قارئ برواية «${str(check.data.title,120)}».`});
        if(note.error)throw note.error;
      }
    }else{
      const r=await db.from("deela_books_likes").delete().eq("listing_id",id).eq("user_id",user.id);
      if(r.error)throw r.error;
    }
    const count=await db.from("deela_books_likes").select("listing_id",{count:"exact",head:true}).eq("listing_id",id);
    if(count.error)throw count.error;
    return respond(req,{ok:true,liked:b.liked,like_count:count.count||0});
  }
  if(req.method==="POST"&&path==="/follow"){
    if(!conf.enable_author_follows)return fail(req,"متابعة المؤلفين معطلة حاليًا",403);
    const b=await req.json(),id=str(b.seller_id,60);
    if(!uuid.test(id)||typeof b.following!=="boolean")return fail(req,"معرف متجر غير صالح");
    const seller=await db.from("deela_books_sellers").select("id,status,user_id").eq("id",id).maybeSingle();
    if(seller.error||!seller.data)return fail(req,"المتجر غير موجود",404);
    if(!isOwner&&seller.data.status!=="approved")return fail(req,"المتجر غير معتمد",403);
    if(seller.data.user_id===user.id)return fail(req,"لا تتابع متجرك الشخصي",400);
    if(b.following){
      const r=await db.from("deela_books_follows").upsert({user_id:user.id,seller_id:id},{onConflict:"user_id,seller_id"});
      if(r.error)throw r.error;
    }else{
      const r=await db.from("deela_books_follows").delete().eq("user_id",user.id).eq("seller_id",id);
      if(r.error)throw r.error;
    }
    const count=await db.from("deela_books_follows").select("seller_id",{count:"exact",head:true}).eq("seller_id",id);
    if(count.error)throw count.error;
    return respond(req,{ok:true,following:b.following,follower_count:count.count||0});
  }
  if(req.method==="POST"&&path==="/favorite"){
    if(!conf.enable_favorites)return fail(req,"المفضلة معطلة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60);
    if(!uuid.test(id))return fail(req,"الكتاب غير صحيح");
    if(b.liked===true){
      const r=await db.from("deela_books_favorites").upsert({listing_id:id,user_id:user.id},{onConflict:"user_id,listing_id"});
      if(r.error)throw r.error;
    }else{
      const r=await db.from("deela_books_favorites").delete().eq("listing_id",id).eq("user_id",user.id);
      if(r.error)throw r.error;
    }
    return respond(req,{ok:true,liked:b.liked===true});
  }
  if(req.method==="POST"&&path==="/order"){
    if(!conf.show_book_prices)return fail(req,"الشراء غير متاح أثناء إخفاء الأسعار",403);
    if(!conf.enable_orders)return fail(req,"استقبال الطلبات معطل حاليًا",403);
    const b=await req.json(),items=Array.isArray(b.items)?b.items:[];
    if(items.length<1||items.length>10)return fail(req,"السلة يجب أن تحتوي من 1 إلى 10 كتب");
    const ids=new Set<string>(),basket:{id:string;qty:number}[]=[];
    for(const x of items){
      const id=str(x.id,60),qty=Number(x.qty);
      if(!uuid.test(id)||ids.has(id)||!Number.isInteger(qty)||qty<1||qty>10)
        return fail(req,"محتويات السلة غير صحيحة");
      ids.add(id);basket.push({id,qty});
    }
    const cutoff=new Date(Date.now()-15*60000).toISOString();
    const recent=await db.from("deela_books_orders").select("id",{count:"exact",head:true}).eq("buyer_id",user.id).gte("created_at",cutoff);
    if(recent.error)throw recent.error;
    if((recent.count||0)>=3)return fail(req,"وصلت إلى حد 3 طلبات خلال 15 دقيقة، حاول لاحقًا",429);
    const r=await db.from("deela_books_listings").select("id,title,price_sar,shipping_fee_sar,stock,format,seller_id,status").in("id",basket.map(x=>x.id));
    if(r.error)throw r.error;
    if((r.data||[]).length!==basket.length)return fail(req,"أحد الكتب لم يعد متاحًا",409);
    let subtotal=0,shipping=0;const lines=[];
    for(const item of basket){
      const p=(r.data||[]).find(x=>x.id===item.id);
      if(!p||p.status!=="published"||p.stock<item.qty)return fail(req,"أحد الكتب غير متاح أو نفد",409);
      subtotal+=Number(p.price_sar)*item.qty;
      shipping+=p.format==="physical"?Number(p.shipping_fee_sar)*item.qty:0;
      lines.push({listing_id:p.id,seller_id:p.seller_id,title_snapshot:p.title,format_snapshot:p.format,quantity:item.qty,unit_price_sar:p.price_sar,shipping_sar:p.format==="physical"?Number(p.shipping_fee_sar)*item.qty:0});
    }
    const data={
      code:"DB-"+crypto.randomUUID().slice(0,8).toUpperCase(),
      buyer_id:user.id,buyer_email:user.email||"",buyer_name:str(b.buyer_name,90),
      phone:str(b.phone,25),address:{
        country:str(b.country,80),city:str(b.city,80),line:str(b.address,280)
      },
      customer_note:str(b.note,500),
      subtotal_sar:Math.round(subtotal*100)/100,
      shipping_sar:Math.round(shipping*100)/100,
      total_sar:Math.round((subtotal+shipping)*100)/100,
      status:"pending_review",payment_method:"manual"
    };
    if(lines.some(x=>x.format_snapshot==="physical")&&(!data.address.city||!data.address.line))
      return fail(req,"الكتب الورقية تتطلب المدينة والعنوان");
    const order=await db.from("deela_books_orders").insert(data).select("id,code,status,total_sar").single();
    if(order.error)throw order.error;
    const itemSave=await db.from("deela_books_order_items").insert(lines.map(x=>({...x,order_id:order.data.id})));
    if(itemSave.error){
      await db.from("deela_books_orders").delete().eq("id",order.data.id).eq("buyer_id",user.id);
      throw itemSave.error;
    }
    return respond(req,{ok:true,order:order.data,payment_collected:false},201);
  }
  if(req.method==="GET"&&path==="/orders"){
    const r=await db.from("deela_books_orders").select("id,code,created_at,status,total_sar,tracking_number,owner_note,deela_books_order_items(listing_id,title_snapshot,quantity,unit_price_sar,format_snapshot)")
     .eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50);
    if(r.error)throw r.error;return respond(req,{orders:r.data||[]});
  }
  if(req.method==="GET"&&path==="/messages"){
    if(!conf.enable_messages)return fail(req,"الرسائل متوقفة حاليًا",403);
    const r=await db.from("deela_books_messages").select("id,listing_id,sender_id,recipient_id,body,created_at")
      .or("sender_id.eq."+user.id+",recipient_id.eq."+user.id)
      .order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;return respond(req,{messages:r.data||[]});
  }
  if(req.method==="POST"&&path==="/messages"){
    if(!conf.enable_messages)return fail(req,"الرسائل متوقفة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60),body=str(b.body,1000);
    if(!uuid.test(id)||body.length<2)return fail(req,"اكتب رسالة صحيحة");
    const listing=await db.from("deela_books_listings").select("seller_id,deela_books_sellers(user_id)").eq("id",id).maybeSingle();
    if(listing.error||!listing.data)return fail(req,"الكتاب غير موجود",404);
    const recipient=(listing.data.deela_books_sellers as any)?.user_id;
    if(!recipient||recipient===user.id)return fail(req,"لا يمكنك مراسلة نفسك");
    const r=await db.from("deela_books_messages").insert({listing_id:id,sender_id:user.id,recipient_id:recipient,body});
    if(r.error)throw r.error;return respond(req,{ok:true});
  }
  if(req.method==="POST"&&path==="/messages/reply"){
    if(!conf.enable_messages)return fail(req,"الردود متوقفة حاليًا",403);
    const b=await req.json(),id=str(b.id,60),body=str(b.body,1000);
    if(!uuid.test(id)||body.length<2)return fail(req,"رسالة غير صحيحة");
    const orig=await db.from("deela_books_messages").select("id,listing_id,sender_id,recipient_id").eq("id",id).maybeSingle();
    if(orig.error||!orig.data)return fail(req,"الرسالة غير موجودة",404);
    if(orig.data.recipient_id!==user.id&&!isOwner)return fail(req,"لا يحق لك الرد على هذه الرسالة",403);
    const to=orig.data.sender_id;
    if(to===user.id)return fail(req,"لا يمكنك الرد على نفسك",400);
    const r=await db.from("deela_books_messages").insert({
      listing_id:orig.data.listing_id,sender_id:user.id,recipient_id:to,body
    });
    if(r.error)throw r.error;
    return respond(req,{ok:true});
  }
  if(req.method==="POST"&&path==="/reports"){
    const b=await req.json(),id=str(b.listing_id,60),reason=str(b.reason,1000);
    if(!uuid.test(id)||reason.length<10)return fail(req,"اكتب سبب بلاغ واضحًا");
    const r=await db.from("deela_books_reports").insert({listing_id:id,reporter_id:user.id,reason});
    if(r.error)throw r.error;return respond(req,{ok:true,status:"open"});
  }
  if(req.method==="POST"&&path==="/reviews"){
    if(!conf.enable_reviews)return fail(req,"التقييمات معطلة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60),rating=Number(b.rating),body=str(b.body,1000);
    if(!uuid.test(id)||!Number.isInteger(rating)||rating<1||rating>5||body.length<8)return fail(req,"اكتب تقييمًا صحيحًا");
    const items=await db.from("deela_books_order_items").select("order_id,deela_books_orders!inner(buyer_id,status)")
      .eq("listing_id",id).eq("deela_books_orders.buyer_id",user.id).eq("deela_books_orders.status","delivered").limit(1);
    if(items.error||!(items.data||[]).length)return fail(req,"التقييم متاح بعد استلام طلب الكتاب فقط",403);
    const r=await db.from("deela_books_reviews").upsert({listing_id:id,user_id:user.id,rating,body,approved:false},{onConflict:"listing_id,user_id"});
    if(r.error)throw r.error;return respond(req,{ok:true,pending_moderation:true});
  }
  if(path.startsWith("/owner/")){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    if(req.method==="GET"&&path==="/owner/overview")return await ownerOverview(req);
    if(req.method==="GET"&&path==="/owner/launch-alerts"){
      const r=await db.from("deela_books_launch_alerts").select("id,listing_id,amount_sar,payment_reference,status,payment_confirmed_at,published_at,created_at,deela_books_sellers(shop_name,slug),deela_books_listings(title,category,format)").order("created_at",{ascending:false}).limit(500);
      if(r.error)throw r.error;return respond(req,{campaigns:r.data||[],price_sar:Number(conf.launch_alert_price_sar||0),enabled:conf.site_public===true&&conf.enable_launch_alerts===true,payments_live:false,push_background_enabled:false});
    }
    if(req.method==="GET"&&path==="/owner/sections"){
      const r=await db.from("deela_books_sections").select("*").order("sort_order").limit(1000);
      if(r.error)throw r.error;return respond(req,{sections:await signedMerchandising(r.data||[])});
    }
    if(req.method==="POST"&&path==="/owner/sections/save"){
      const b=await req.json(),id=str(b.id,60),title=str(b.title,100),kind=str(b.kind,20),material=str(b.material,20),category=str(b.category,80),image=str(b.image_path,240),order=Number(b.sort_order);
      const validMaterials=["none","ceramic","marble","ornament","pearl","metal","velvet","neon","heritage","aurora","granite","wood","floral","sandstone","crystal","geometric","goldleaf","watercolor","leather","linen","mosaic","stars"];
      const design=b.design&&typeof b.design==="object"&&!Array.isArray(b.design)?b.design:{};
      const cleanDesign:Record<string,unknown>={};
      if(design.background_color!==undefined){if(typeof design.background_color!=="string"||!/^#[0-9a-f]{6}$/i.test(design.background_color))return fail(req,"لون خلفية القسم غير صحيح");cleanDesign.background_color=design.background_color;}
      if(design.accent_color!==undefined){if(typeof design.accent_color!=="string"||!/^#[0-9a-f]{6}$/i.test(design.accent_color))return fail(req,"لون إبراز القسم غير صحيح");cleanDesign.accent_color=design.accent_color;}
      if(design.pattern!==undefined){if(typeof design.pattern!=="string"||!validMaterials.includes(design.pattern))return fail(req,"نمط القسم غير صحيح");cleanDesign.pattern=design.pattern;}
      if(title.length<1||!["category","promo"].includes(kind)||!validMaterials.includes(material)||!Number.isInteger(order)||order<1||order>9999)return fail(req,"بيانات القسم غير صحيحة");
      if(image&&!image.startsWith(user.id+"/branding/"))return fail(req,"صورة القسم ليست ضمن ملفات المالك",403);
      const row={title,description:str(b.description,450),kind,category,image_path:image,material,design:cleanDesign,sort_order:order,visible:b.visible===true,updated_by:user.id,updated_at:new Date().toISOString()};
      const q=uuid.test(id)?await db.from("deela_books_sections").update(row).eq("id",id).select("*").single():await db.from("deela_books_sections").insert(row).select("*").single();
      if(q.error)throw q.error;return respond(req,{ok:true,section:(await signedMerchandising([q.data]))[0]});
    }
    if(req.method==="POST"&&path==="/owner/sections/delete"){
      const b=await req.json(),id=str(b.id,60);if(!uuid.test(id))return fail(req,"معرّف القسم غير صحيح");
      const r=await db.from("deela_books_sections").delete().eq("id",id).select("id").maybeSingle();if(r.error)throw r.error;
      return r.data?respond(req,{ok:true}):fail(req,"القسم غير موجود",404);
    }
    if(req.method==="GET"&&path==="/owner/banners"){
      const r=await db.from("deela_books_banners").select("*").order("sort_order").limit(300);
      if(r.error)throw r.error;return respond(req,{banners:await signedMerchandising(r.data||[])});
    }
    if(req.method==="POST"&&path==="/owner/banners/save"){
      const b=await req.json(),id=str(b.id,60),title=str(b.title,120),image=str(b.image_path,240),motion=str(b.motion,16),order=Number(b.sort_order);
      if(title.length<1||!image.startsWith(user.id+"/branding/")||!["none","glow","slide"].includes(motion)||!Number.isInteger(order)||order<1||order>9999)return fail(req,"تحقق من عنوان البنر وصورته وحركته وترتيبه");
      const target=str(b.target_url,500);if(target){try{const u=new URL(target);if(u.protocol!=="https:"||u.username||u.password)throw Error();}catch{return fail(req,"رابط البنر يجب أن يكون HTTPS");}}
      const starts=b.starts_at?new Date(String(b.starts_at)):null,ends=b.ends_at?new Date(String(b.ends_at)):null;
      if((starts&&Number.isNaN(starts.getTime()))||(ends&&Number.isNaN(ends.getTime()))||(starts&&ends&&ends<=starts))return fail(req,"جدول ظهور البنر غير صحيح");
      const row={title,image_path:image,target_url:target,motion,active:b.active===true,starts_at:starts?.toISOString()||null,ends_at:ends?.toISOString()||null,sort_order:order,updated_by:user.id,updated_at:new Date().toISOString()};
      const q=uuid.test(id)?await db.from("deela_books_banners").update(row).eq("id",id).select("*").single():await db.from("deela_books_banners").insert(row).select("*").single();
      if(q.error)throw q.error;return respond(req,{ok:true,banner:(await signedMerchandising([q.data]))[0]});
    }
    if(req.method==="POST"&&path==="/owner/banners/delete"){
      const b=await req.json(),id=str(b.id,60);if(!uuid.test(id))return fail(req,"معرّف البنر غير صحيح");
      const r=await db.from("deela_books_banners").delete().eq("id",id).select("id").maybeSingle();if(r.error)throw r.error;
      return r.data?respond(req,{ok:true}):fail(req,"البنر غير موجود",404);
    }
    if(req.method==="GET"&&path==="/owner/payments")return respond(req,{config:conf.payment_test_config||{mode:"test",live_enabled:false,provider:"",tax_percent:0,refund_window_days:7,discounts_enabled:false}});
    if(req.method==="POST"&&path==="/owner/payments"){
      const b=await req.json(),provider=str(b.provider,30),tax=Number(b.tax_percent),refund=Number(b.refund_window_days);
      if(!["","tap","myfatoorah","moyasar","tamara","tabby","bank"].includes(provider)||!Number.isFinite(tax)||tax<0||tax>25||!Number.isInteger(refund)||refund<0||refund>90||typeof b.discounts_enabled!=="boolean")return fail(req,"إعدادات اختبار المدفوعات غير صحيحة");
      // Provider credentials are never accepted or persisted, and live mode is immutable here.
      const config={mode:"test",live_enabled:false,provider,tax_percent:tax,refund_window_days:refund,discounts_enabled:b.discounts_enabled,methods:["mada","apple_pay","google_pay","visa","mastercard","stc_pay","bank_transfer"],updated_at:new Date().toISOString()};
      const r=await db.from("deela_books_settings").update({payment_test_config:config,updated_at:new Date().toISOString()}).eq("id",1).select("payment_test_config").single();
      if(r.error)throw r.error;return respond(req,{ok:true,config:r.data.payment_test_config,payments_live:false});
    }
    if(req.method==="GET"&&path==="/owner/users"){
      const sellers=await db.from("deela_books_sellers").select("user_id,shop_name,slug,status,created_at").order("created_at",{ascending:false}).limit(500);
      if(sellers.error)throw Error("تعذر قراءة حسابات بائعي DEELA Books");
      const ids=[...new Set((sellers.data||[]).map((x:any)=>x.user_id).filter((x:any)=>uuid.test(String(x))))];
      if(!ids.length)return respond(req,{users:[]});
      const controls=await db.from("deela_books_user_controls").select("user_id,blocked,note,changed_at").in("user_id",ids);
      if(controls.error)throw Error("تعذر قراءة إعدادات بائعي DEELA Books");
      const controlMap=new Map((controls.data||[]).map((x:any)=>[x.user_id,x]));
      const out=[];for(const seller of sellers.data||[]){if(await owner(seller.user_id))continue;const auth=await db.auth.admin.getUserById(seller.user_id);if(auth.error)continue;const u=auth.data.user,c=controlMap.get(seller.user_id) as any;out.push({id:u.id,email:u.email||"",phone:u.phone||"",created_at:seller.created_at||u.created_at,last_sign_in_at:u.last_sign_in_at,is_owner:false,blocked:c?.blocked===true,note:c?.note||"",shop_name:seller.shop_name||"",slug:seller.slug||"",seller_status:seller.status||""});}
      return respond(req,{users:out});
    }
    if(req.method==="POST"&&path==="/owner/user-status"){
      const b=await req.json(),id=str(b.user_id,60),blocked=b.blocked===true,note=str(b.note,500);
      if(!uuid.test(id)||typeof b.blocked!=="boolean")return fail(req,"بيانات حالة الحساب غير صحيحة");
      if(await owner(id))return fail(req,"حساب المالك محمي ولا يمكن إيقافه من هذه الشاشة",403);
      const seller=await db.from("deela_books_sellers").select("user_id").eq("user_id",id).maybeSingle();if(seller.error)throw seller.error;
      if(!seller.data)return fail(req,"إدارة الحسابات هنا مخصصة لبائعي DEELA Books فقط",403);
      const r=await db.from("deela_books_user_controls").upsert({user_id:id,blocked,note,changed_by:user.id,changed_at:new Date().toISOString()},{onConflict:"user_id"});
      if(r.error)throw r.error;return respond(req,{ok:true,user_id:id,blocked});
    }
    if(req.method==="GET"&&path==="/owner/sellers"){
      const r=await db.from("deela_books_sellers").select("*").order("created_at",{ascending:false}).limit(120);
      if(r.error)throw r.error;return respond(req,{sellers:r.data||[]});
    }
    if(req.method==="GET"&&path==="/owner/listings"){
      const [r,categories]=await Promise.all([
        db.from("deela_books_listings").select("*,deela_books_sellers(shop_name,slug)").order("created_at",{ascending:false}).limit(200),
        db.from("deela_books_sections").select("category").eq("kind","category")
      ]);
      if(r.error||categories.error)throw Error("Owner listings unavailable");
      return respond(req,{listings:await enrichBooks(r.data||[]),categories:[...new Set((categories.data||[]).map((x:any)=>x.category).filter(Boolean))]});
    }
    if(req.method==="POST"&&path==="/owner/listing-category"){
      const b=await req.json(),id=str(b.id,60),category=str(b.category,80);
      if(!uuid.test(id)||!category)return fail(req,"اختر الرواية والقسم المطلوب");
      const existing=await db.from("deela_books_listings").select("id,title,category,seller_id,deela_books_sellers!inner(user_id)").eq("id",id).maybeSingle();
      if(existing.error||!existing.data)return fail(req,"الرواية غير موجودة",404);
      if(existing.data.category===category)return respond(req,{ok:true,category,changed:false});
      const customs=await db.from("deela_books_sections").select("category").eq("kind","category").eq("category",category).limit(1);
      if(customs.error)throw customs.error;
      const baseCategories=["روايات","أدب وشعر","خيال ورعب","تطوير الذات","تاريخ","كتب الأطفال","فلسفة","تقنية","ديني","أخرى"];
      if(!baseCategories.includes(category)&&!customs.data?.length)return fail(req,"القسم غير موجود أو غير مخصص للروايات",400);
      const updated=await db.from("deela_books_listings").update({category,updated_at:new Date().toISOString()}).eq("id",id).select("id,title,category").single();
      if(updated.error)throw updated.error;
      const sellerUser=(existing.data.deela_books_sellers as any)?.user_id;
      if(sellerUser){
        const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,event_type:"section_moved",title:"تم نقل روايتك إلى قسمها الصحيح",body:`نُقلت رواية «${str(existing.data.title,120)}» إلى قسم «${category}».`});
        if(note.error)throw note.error;
      }
      return respond(req,{ok:true,listing:updated.data});
    }
    if(req.method==="GET"&&path==="/owner/orders"){
      const r=await db.from("deela_books_orders").select("*,deela_books_order_items(*)").order("created_at",{ascending:false}).limit(150);
      if(r.error)throw r.error;return respond(req,{orders:r.data||[]});
    }
    if(req.method==="GET"&&path==="/owner/reports"){
      const [reports,reviews]=await Promise.all([
        db.from("deela_books_reports").select("id,listing_id,reason,status,created_at").order("created_at",{ascending:false}).limit(120),
        db.from("deela_books_reviews").select("id,listing_id,rating,body,approved,created_at").order("created_at",{ascending:false}).limit(120)
      ]);
      if(reports.error||reviews.error)throw Error("moderation unavailable");
      return respond(req,{reports:reports.data||[],reviews:reviews.data||[]});
    }
    if(req.method==="POST"&&path==="/owner/seller-status"){
      const b=await req.json(),id=str(b.id,60),status=str(b.status,20);
      if(!uuid.test(id)||!["pending","approved","rejected","suspended"].includes(status))return fail(req,"حالة المتجر غير صحيحة");
      const r=await db.from("deela_books_sellers").update({status,updated_at:new Date().toISOString()}).eq("id",id).select("id,shop_name,status").maybeSingle();
      if(r.error)throw r.error;return r.data?respond(req,{ok:true,seller:r.data}):fail(req,"المتجر غير موجود",404);
    }
    if(req.method==="POST"&&path==="/owner/listing-status"){
      if(!conf.enable_featured_section && (await req.clone().json()).featured===true)return fail(req,"ميزة الكتب المختارة معطلة من اللوحة",403);
      const b=await req.json(),id=str(b.id,60),status=str(b.status,20);
      if(!uuid.test(id)||!["draft","pending","published","rejected","archived"].includes(status))return fail(req,"حالة الكتاب غير صحيحة");
      const updates:Record<string,unknown>={status,updated_at:new Date().toISOString()};
      if(typeof b.featured==="boolean")updates.featured=b.featured;
      if(typeof b.note==="string")updates.moderation_note=str(b.note,350);
      const r=await db.from("deela_books_listings").update(updates)
        .eq("id",id).select("id,title,status,featured").maybeSingle();
      if(r.error)throw r.error;return r.data?respond(req,{ok:true,listing:r.data}):fail(req,"الكتاب غير موجود",404);
    }
    if(req.method==="POST"&&path==="/owner/order-status"){
      const b=await req.json(),id=str(b.id,60),status=str(b.status,25);
      if(!uuid.test(id)||!["pending_review","awaiting_payment","paid","preparing","shipped","delivered","cancelled"].includes(status))
        return fail(req,"حالة الطلب غير صحيحة");
      const o=await db.from("deela_books_orders").select("id,status,payment_confirmed_at").eq("id",id).maybeSingle();
      if(o.error||!o.data)return fail(req,"الطلب غير موجود",404);
      // Never fabricate a payment: the owner must explicitly confirm receipt.
      if(["paid","preparing","shipped","delivered"].includes(status)&&!o.data.payment_confirmed_at&&b.payment_confirmed!==true)
        return fail(req,"يجب أن تؤكد استلام الدفع الحقيقي أولًا",409);
      const r=await db.from("deela_books_orders").update({
        status,owner_note:str(b.owner_note,500),tracking_number:str(b.tracking_number,100),
        payment_confirmed_at:o.data.payment_confirmed_at||
          (b.payment_confirmed===true?new Date().toISOString():null),
        updated_at:new Date().toISOString()
      }).eq("id",id).select("id,code,status").single();
      if(r.error)throw r.error;
      return respond(req,{ok:true,order:r.data,payment_automatic:false});
    }
    if(req.method==="POST"&&path==="/owner/moderate"){
      const b=await req.json(),type=str(b.type,20),id=str(b.id,60);
      if(!uuid.test(id))return fail(req,"معرّف غير صحيح");
      if(type==="report"&&["open","investigating","resolved","dismissed"].includes(str(b.status,20))){
        const r=await db.from("deela_books_reports").update({status:b.status}).eq("id",id);
        if(r.error)throw r.error;return respond(req,{ok:true});
      }
      if(type==="review"&&typeof b.approved==="boolean"){
        const r=await db.from("deela_books_reviews").update({approved:b.approved}).eq("id",id);
        if(r.error)throw r.error;return respond(req,{ok:true});
      }
      return fail(req,"عملية غير صحيحة");
    }
    if(req.method==="POST"&&path==="/owner/settings"){
      const b=await req.json();
      if(b.site_public===true||b.payments_live===true)
        return fail(req,"النشر للعامة وربط الدفع غير مسموحين من هذه اللوحة الخاصة",403);
      const configured:Record<string,unknown>={
        name:str(b.name,100)||"DEELA Books",
        hero_title:str(b.hero_title,180)||"لكل كتاب حكاية، ولكل قارئ عالم",
        hero_subtitle:str(b.hero_subtitle,500),
        announcement:str(b.announcement,150),
        support_url:str(b.support_url,350),
        contact_email:str(b.contact_email,254),
        home_promo_title:str(b.home_promo_title,180),
        home_promo_description:str(b.home_promo_description,450),
        site_public:false,payments_live:false,
        commission_percent:Number.isFinite(Number(b.commission_percent))
          ?Math.max(0,Math.min(50,Number(b.commission_percent))):10,
        updated_at:new Date().toISOString()
      };
      if(Object.prototype.hasOwnProperty.call(b,"theme_colors")){
        const keys=["bg","bg2","panel","panel2","panel3","white","muted","muted2","teal","teal2","purple","gold","rose","blue","success","line","line2"];
        if(!b.theme_colors||typeof b.theme_colors!=="object"||Array.isArray(b.theme_colors))return fail(req,"ألوان غير صحيحة",400);
        const colors:Record<string,string>={};
        for(const [key,value] of Object.entries(b.theme_colors)){
          if(!keys.includes(key)||typeof value!=="string"||!/^#[0-9a-f]{6}$/i.test(value))return fail(req,"لون غير صحيح",400);
          colors[key]=value;
        }
        configured.theme_colors=colors;
      }
      if(Object.prototype.hasOwnProperty.call(b,"theme_material")){
        if(!["none","ceramic","marble","ornament","pearl","metal","velvet","neon","heritage","aurora","granite","wood","floral","sandstone","crystal","geometric","goldleaf","watercolor","leather","linen","mosaic","stars"].includes(b.theme_material))return fail(req,"خامة غير صحيحة",400);
        configured.theme_material=b.theme_material;
      }
      if(Object.prototype.hasOwnProperty.call(b,"launch_alert_price_sar")){
        const price=Number(b.launch_alert_price_sar);if(!Number.isFinite(price)||price<0||price>10000||Math.round(price*100)!==price*100)return fail(req,"سعر التنبيه يجب أن يكون من 0 إلى 10000 ريال وبحد أقصى منزلتان عشريتان",400);
        configured.launch_alert_price_sar=price;
      }
      if(Object.prototype.hasOwnProperty.call(b,"theme_design")){
        const d=b.theme_design;
        if(!d||!Number.isInteger(d.radius)||d.radius<0||d.radius>40||!Number.isInteger(d.font_size)||d.font_size<12||d.font_size>22||!["none","glow"].includes(d.banner_motion))return fail(req,"إعدادات التصميم غير صحيحة",400);
        configured.theme_design={radius:d.radius,font_size:d.font_size,banner_motion:d.banner_motion};
      }
      if(Object.prototype.hasOwnProperty.call(b,"theme_sections")){
        const sections=b.theme_sections;
        if(!sections||typeof sections!=="object"||Array.isArray(sections))return fail(req,"إعدادات الأقسام غير صحيحة",400);
        const clean:Record<string,unknown>={};
        for(const [k,v] of Object.entries(sections)){
          const d=v as any;
          const materialList=["none","ceramic","marble","ornament","pearl","metal","velvet","neon","heritage","aurora","granite","wood","floral","sandstone","crystal","geometric","goldleaf","watercolor","leather","linen","mosaic","stars"];
          if(!["categories","books","shops","faq","banner"].includes(k)||!d||typeof d.title!=="string"||d.title.length>100||!Number.isInteger(d.order)||d.order<1||d.order>99||typeof d.visible!=="boolean"||!materialList.includes(d.material)||![undefined,""].includes(d.background_color)&&!(typeof d.background_color==="string"&&/^#[0-9a-f]{6}$/i.test(d.background_color))||![undefined,""].includes(d.accent_color)&&!(typeof d.accent_color==="string"&&/^#[0-9a-f]{6}$/i.test(d.accent_color)))return fail(req,"إعداد قسم غير صحيح",400);
          clean[k]={title:d.title,order:d.order,visible:d.visible,material:d.material,background_color:d.background_color||"",accent_color:d.accent_color||""};
        }
        configured.theme_sections=clean;
      }
      if(Object.prototype.hasOwnProperty.call(b,"theme_images")){
        if(!b.theme_images||typeof b.theme_images!=="object"||Array.isArray(b.theme_images))return fail(req,"صور غير صحيحة",400);
        const images:Record<string,string>={};
        for(const [k,v] of Object.entries(b.theme_images)){
          if(!["logo","background","banner"].includes(k)||typeof v!=="string"||v.length>240)return fail(req,"مسار صورة غير صحيح",400);
          if(v&&!v.startsWith(user.id+"/branding/"))return fail(req,"الصورة يجب أن تكون مرفوعة بحساب المالك",403);
          images[k]=v;
        }
        configured.theme_images=images;
      }
      if(configured.support_url && !/^https:\/\//.test(String(configured.support_url)))
        return fail(req,"رابط الدعم يجب أن يبدأ بـ https://",400);
      if(configured.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(configured.contact_email)))
        return fail(req,"بريد التواصل غير صحيح",400);
      for(const key of FEATURE_FLAGS){
        if(Object.prototype.hasOwnProperty.call(b,key)){
          if(typeof b[key]!=="boolean")return fail(req,"قيمة مفتاح التحكم غير صحيحة: "+key,400);
          configured[key]=b[key];
        }
      }
      const {data,error:e}=await db.from("deela_books_settings").update(configured)
        .eq("id",1).select("*").single();
      if(e)throw e;return respond(req,{ok:true,settings:await signedBranding(data)});
    }
    if(req.method==="GET"&&path==="/owner/settings")return respond(req,{settings:await signedBranding(conf)});
  }
  return fail(req,"المسار غير موجود",404);
 }catch(e){
  console.error("deela-books",error(e));
  return fail(req,"تعذر تنفيذ العملية في خدمة DEELA Books",500);
 }
});
