import {createClient} from "npm:@supabase/supabase-js@2.95.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SELLER_PORTAL="https://mzo77.github.io/DEELA-V2/books-private/seller/";
const guest=ANON_KEY?createClient(SUPABASE_URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const db=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
const fn="/deela-books";
const MEMBER_FEATURE_IDS=["profile_glow","display_name_style","profile_avatar","avatar_frame","avatar_frame_gold","avatar_frame_rose","avatar_frame_diamond","book_frame","book_frame_gold","book_frame_rose","book_frame_diamond","profile_theme","verified_badge","book_shine","book_shine_prism"] as const;
const MEMBER_TIER_LABELS:Record<string,string>={day:"أساسية · يوم",week:"متقدمة · أسبوع",month:"الأعلى · شهر"};
const MEMBER_DEFAULT_TIERS:Record<string,string[]> = {"day":["profile_glow","display_name_style","avatar_frame","book_frame"],"week":["profile_glow","display_name_style","profile_avatar","avatar_frame","avatar_frame_gold","book_frame","book_frame_gold","book_frame_rose","profile_theme","book_shine"],"month":["profile_glow","display_name_style","profile_avatar","avatar_frame","avatar_frame_gold","avatar_frame_rose","avatar_frame_diamond","book_frame","book_frame_gold","book_frame_rose","book_frame_diamond","profile_theme","verified_badge","book_shine","book_shine_prism"]};
async function memberTiers(){
 const r=await db.from("deela_books_membership_tiers").select("tiers").eq("id",1).maybeSingle();
 if(r.error)throw r.error;
 return r.data?.tiers||MEMBER_DEFAULT_TIERS;
}
async function memberEntitlements(account:any,privateMode:boolean,knownSeller?:any){
 const seller=knownSeller||await sellerFor(account.id);
 if(!seller)return {premium_active:false,member_plan:"",member_plan_label:"مجاني",member_features:[],member_custom_features:false,premium_ends_at:null,avatar_url:null,member_appearance:{}};
 const q=db.from("deela_books_promotions").select("plan_key,is_test,ends_at").eq("seller_id",seller.id).eq("kind","premium").eq("status","active").gt("ends_at",new Date().toISOString()).order("ends_at",{ascending:false}).limit(10);
 const rows=await q;if(rows.error)throw rows.error;
 const active=(rows.data||[]).filter((x:any)=>!x.is_test||privateMode);
 const rank:Record<string,number>={day:1,week:2,month:3};
 const membership=active.sort((a:any,b:any)=>(rank[b.plan_key]||0)-(rank[a.plan_key]||0))[0];
 if(!membership)return {premium_active:false,member_plan:"",member_plan_label:"مجاني",member_features:[],member_custom_features:false,premium_ends_at:null,avatar_url:null,member_appearance:{}};
 const tiers=await memberTiers(),metadata=account.user_metadata||{};
 const custom=Array.isArray(metadata.deela_member_features)?metadata.deela_member_features.filter((x:string)=>MEMBER_FEATURE_IDS.includes(x as any)):null;
 const selectedFeatures=custom||tiers[membership.plan_key]||MEMBER_DEFAULT_TIERS[membership.plan_key]||[];
 const features=[...new Set(selectedFeatures)];
 if(features.some((x:string)=>["avatar_frame_gold","avatar_frame_rose","avatar_frame_diamond"].includes(x))&&!features.includes("avatar_frame"))features.push("avatar_frame");
 if(features.some((x:string)=>["book_frame_gold","book_frame_rose","book_frame_diamond"].includes(x))&&!features.includes("book_frame"))features.push("book_frame");
 if(features.includes("book_shine_prism")&&!features.includes("book_shine"))features.push("book_shine");
 const avatarPath=String(metadata.deela_member_avatar_path||"");
 const avatar=avatarPath.startsWith(account.id+"/avatars/")?await db.storage.from("deela-books-covers").createSignedUrl(avatarPath,600):null;
 const avatarGates:Record<string,string>={aurora:"avatar_frame",velvet:"avatar_frame",crystal:"avatar_frame",gold:"avatar_frame_gold",rose:"avatar_frame_rose",diamond:"avatar_frame_diamond"};
 const bookGates:Record<string,string>={starlight:"book_frame",velvet:"book_frame",crystal:"book_frame",gold:"book_frame_gold",rose:"book_frame_rose",diamond:"book_frame_diamond"};
 const wantedAvatar=String(metadata.deela_member_avatar_frame||"aurora"),wantedBook=String(metadata.deela_member_book_frame||"starlight");
 const avatarFrame=features.includes(avatarGates[wantedAvatar]||"")?wantedAvatar:"aurora",bookFrame=features.includes(bookGates[wantedBook]||"")?wantedBook:"starlight";
 const profileTheme=features.includes("profile_theme")&&["ocean","emerald","royal","rose"].includes(String(metadata.deela_member_profile_theme))?String(metadata.deela_member_profile_theme):"ocean";
 return {premium_active:true,member_plan:membership.plan_key,member_plan_label:MEMBER_TIER_LABELS[membership.plan_key]||"عضوية مميزة",member_features:features,member_custom_features:Array.isArray(custom),premium_ends_at:membership.ends_at||null,avatar_url:avatar&&!avatar.error?avatar.data.signedUrl:null,member_appearance:{display_name:String(metadata.deela_member_display_name||"").slice(0,90),avatar_path:avatarPath,avatar_frame:avatarFrame,book_frame:bookFrame,profile_theme:profileTheme,shine:metadata.deela_member_shine!==false}};
}
const FEATURE_FLAGS=["enable_seller_registration","enable_book_submissions","enable_reader_likes","enable_favorites","enable_author_follows","enable_reviews","enable_messages","enable_orders","enable_discounts","enable_featured_section","enable_launch_alerts","show_book_prices"] as const;
const PRIVATE_SELLER_ROUTES=new Set(["GET /catalog","GET /shops","GET /me","GET /my/listings","POST /seller/premium-appearance","GET /owner/member-tiers","POST /owner/member-tiers","POST /owner/user-premium-features","GET /seller/activity","GET /seller/orders","POST /seller/order-item/status","POST /seller/apply","POST /seller/profile","POST /listing/delete","GET /orders","POST /order","POST /order/support","GET /download","POST /like","POST /follow","POST /favorite","POST /view","POST /reports","GET /reviews","POST /reviews","GET /messages","POST /messages","POST /messages/reply","GET /seller/notifications","POST /seller/notifications/read","POST /push/subscribe","POST /push/unsubscribe","GET /seller/launch-alerts","POST /seller/launch-alerts/request","GET /seller/promotions","POST /seller/promotions/test","GET /contests","POST /contests/answer","GET /launch-alerts/feed","POST /listing","POST /upload/sign"]);

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
async function signedSeller(row:any){
 if(!row)return row;let logo_url:string|null=null;
 if(row.logo_path){const z=await db.storage.from("deela-books-covers").createSignedUrl(row.logo_path,600);if(!z.error)logo_url=z.data.signedUrl;}
 return {...row,logo_url};
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
 const product_type=str(raw.product_type,30)||"book";
 const format=str(raw.format,20),condition=str(raw.book_condition,25)||"new";
 const price=currencies(raw.price_sar),shipping=currencies(raw.shipping_fee_sar??0);
 const compare=raw.compare_at_sar===null||raw.compare_at_sar===""||raw.compare_at_sar===undefined?null:currencies(raw.compare_at_sar);
 const stock=format==="physical"?Number(raw.stock):100000,cover=str(raw.cover_path,240),file=str(raw.file_path,240);
 const image_paths=Array.isArray(raw.image_paths)?[...new Set(raw.image_paths.map(x=>str(x,240)).filter(Boolean))].slice(0,8):[];
 const tags=Array.isArray(raw.tags)?raw.tags.map(x=>str(x,48).replace(/^#/,"").trim()).filter(Boolean).slice(0,20):str(raw.tags,900).split(/[,،\n]/).map(x=>x.trim().replace(/^#/,"")).filter(Boolean).slice(0,20);
 const pickup_available=raw.pickup_available===true;
 const shipping_available=raw.shipping_available!==false;
 const rights=raw.rights_confirmed===true;
 if(title.length<2||!["book","game","stationery","art","coffee","business_service","technology","music","collectible","fashion","home","other"].includes(product_type)||!["physical","ebook","audiobook"].includes(format)||!Number.isInteger(stock)||stock<0||stock>100000||
   Number.isNaN(price)||Number.isNaN(shipping)||Number.isNaN(compare)||
   !["new","like_new","good","acceptable","not_applicable"].includes(condition)||
   !["عام","الناشئة","للبالغين"].includes(audience) ||
   (page_count!==null&&(!Number.isInteger(page_count)||page_count<1||page_count>50000))||
   (publication_year!==null&&(!Number.isInteger(publication_year)||publication_year<1000||publication_year>2100))||
   (format==="physical"&&!pickup_available&&!shipping_available)||
   image_paths.length>8||tags.some(x=>x.length>48))
   throw Error("تحقق من اسم المنتج ونوعه والسعر والكمية وطرق الاستلام");
 if(!rights)throw Error("يجب تأكيد ملكية حقوق النشر أو إذن التوزيع");
 if(format!=="physical"&&file.length===0)throw Error("الكتاب الرقمي يحتاج ملف PDF أو EPUB أو MP3 مرفوعًا");
 return {title,author,description,subtitle,audience,content_warning,page_count,publication_year,category,product_type,language,format,book_condition:format==="physical"?condition:"not_applicable",
   price_sar:price,compare_at_sar:compare,stock,shipping_fee_sar:format==="physical"&&shipping_available?shipping:0,
   isbn:str(raw.isbn,30),city:str(raw.city,80),cover_path:cover||image_paths[0]||null,image_paths,tags,file_path:file||null,
   pickup_available:format==="physical"&&pickup_available,shipping_available:format!=="physical"||shipping_available,
   preview_excerpt:str(raw.preview_excerpt,3000),rights_confirmed:rights,updated_at:new Date().toISOString()};
}
function publicListing(p:Record<string,unknown>){
 const {file_path,moderation_note,rights_confirmed,...data}=p;
 return data;
}
async function signedCovers(products:any[]){
 return await Promise.all(products.map(async p=>{
   const paths=[...new Set([...(Array.isArray(p.image_paths)?p.image_paths:[]),p.cover_path].filter(Boolean))].slice(0,8);
   const image_urls=(await Promise.all(paths.map(async path=>{
     const z=await db.storage.from("deela-books-covers").createSignedUrl(path,600);
     return z.error?null:z.data.signedUrl as string;
   }))).filter(Boolean) as string[];
   const cover_url=image_urls[0]||null;
   return {...publicListing(p),image_paths:paths,image_urls,cover_url};
 }));
}
async function displayNames(ids:string[]){
 const names=new Map<string,string>();
 await Promise.all([...new Set(ids)].slice(0,80).map(async id=>{try{
  const u=await db.auth.admin.getUserById(id),m=u.data?.user?.user_metadata||{};
  names.set(id,String(m.display_name||m.full_name||m.name||("قارئ #"+id.slice(0,6))).slice(0,80));
 }catch{names.set(id,"قارئ #"+id.slice(0,6));}}));
 return names;
}
async function enrichBooks(books:any[],includeTest=false){
 if(!books.length)return books;
 const ids=books.map(x=>x.id);
 let likeQuery=db.from("deela_books_likes").select("listing_id,user_id,created_at").in("listing_id",ids).limit(10000);
 let reviewQuery=db.from("deela_books_reviews").select("id,listing_id,user_id,rating,body,created_at,is_test")
    .in("listing_id",ids).eq("approved",true).order("created_at",{ascending:false}).limit(10000);
 if(!includeTest){likeQuery=likeQuery.eq("is_test",false);reviewQuery=reviewQuery.eq("is_test",false);}
 let viewQuery=db.from("deela_books_listing_views").select("listing_id").in("listing_id",ids).limit(20000);
 if(!includeTest)viewQuery=viewQuery.eq("is_test",false);
 const salesQuery=db.from("deela_books_order_items").select("listing_id,quantity,deela_books_orders!inner(status,is_test)").in("listing_id",ids).in("deela_books_orders.status",["paid","preparing","shipped","delivered"]).limit(20000);
 if(!includeTest)salesQuery.eq("deela_books_orders.is_test",false);
 const [likes,reviews,views,sales]=await Promise.all([likeQuery,reviewQuery,viewQuery,salesQuery]);
 if(likes.error||reviews.error||views.error||sales.error)throw Error("book community data unavailable");
 const actorIds=[...(likes.data||[]).map(x=>x.user_id),...(reviews.data||[]).map(x=>x.user_id)],names=await displayNames(actorIds);
 const likeMap=new Map<string,any[]>(),viewMap=new Map<string,number>(),salesMap=new Map<string,number>(),reviewMap=new Map<string,{count:number,sum:number,items:any[]}>();
 for(const x of likes.data||[]){const items=likeMap.get(x.listing_id)||[];items.push({actor_name:names.get(x.user_id)||("قارئ #"+x.user_id.slice(0,6)),created_at:x.created_at});likeMap.set(x.listing_id,items);}
 for(const x of views.data||[])viewMap.set(x.listing_id,(viewMap.get(x.listing_id)||0)+1);
 for(const x of sales.data||[])salesMap.set(x.listing_id,(salesMap.get(x.listing_id)||0)+Number(x.quantity||0));
 for(const x of reviews.data||[]){
  const v=reviewMap.get(x.listing_id)||{count:0,sum:0,items:[]};
  v.count++;v.sum+=x.rating;
  if(v.items.length<8)v.items.push({id:x.id,rating:x.rating,body:x.body,created_at:x.created_at,actor_name:names.get(x.user_id)||("قارئ #"+x.user_id.slice(0,6)),is_test:x.is_test});
  reviewMap.set(x.listing_id,v);
 }
 const signed=await signedCovers(books);
 return signed.map(p=>{
  const r=reviewMap.get(p.id);
  return {...p,like_count:likeMap.get(p.id)?.length||0,likes:likeMap.get(p.id)||[],view_count:viewMap.get(p.id)||0,sales_count:salesMap.get(p.id)||0,review_count:r?.count||0,
   average_rating:r?Math.round(r.sum/r.count*10)/10:0,
   reviews:r?.items||[]};
 });
}
async function currentListings(isOwner:boolean,search:URLSearchParams,featureEnabled=true,includeTest=false){
 let q=db.from("deela_books_listings")
   .select("*,deela_books_sellers!inner(id,user_id,shop_name,slug,status,city,latitude,longitude)");
 if(featureEnabled)q=q.order("featured",{ascending:false});
 q=q.order("created_at",{ascending:false}).limit(80);
 if(!isOwner||search.get("only_public")==="1")q=q.eq("status","published");
 if((!isOwner||search.get("only_public")==="1")&&!includeTest)q=q.eq("deela_books_sellers.status","approved");
 if(search.get("format")&&["physical","ebook","audiobook"].includes(search.get("format")!))
   q=q.eq("format",search.get("format")!);
 const result=await q;
 if(result.error)throw result.error;
 const category=str(search.get("category"),80);
 const words=str(search.get("q"),100).toLocaleLowerCase();
 const selected=(result.data||[]).filter(p=>(!category||p.category===category)&&(!words||[p.title,p.author,p.category,p.description].some((v:string)=>String(v||"").toLocaleLowerCase().includes(words))));
 const enriched=await enrichBooks(selected,includeTest),sellerMap=new Map<string,any>();
 const sellerRows=[...new Map(enriched.map((x:any)=>[x.deela_books_sellers?.id,x.deela_books_sellers]).filter((x:any)=>x[0]&&x[1]?.user_id)).values()];
 const sellerIds=sellerRows.map((x:any)=>x.id);
 if(sellerIds.length){
  let pq=db.from("deela_books_promotions").select("seller_id,is_test").in("seller_id",sellerIds).eq("kind","premium").eq("status","active").gt("ends_at",new Date().toISOString());
  const promos=await (includeTest?pq:pq.eq("is_test",false));if(promos.error)throw promos.error;
  const ids=new Set((promos.data||[]).map((x:any)=>x.seller_id));
  await Promise.all(sellerRows.filter((s:any)=>ids.has(s.id)).map(async(s:any)=>{
   const auth=await db.auth.admin.getUserById(s.user_id);if(auth.error||!auth.data.user)return;
   const member=await memberEntitlements(auth.data.user,includeTest,s);
   if(member.premium_active)sellerMap.set(s.id,{features:member.member_features,appearance:member.member_appearance,avatar_url:member.avatar_url,plan:member.member_plan});
  }));
 }
 return enriched.map((x:any)=>({...x,deela_books_sellers:{...x.deela_books_sellers,member_profile:sellerMap.get(x.deela_books_sellers?.id)||null}}));
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

  const pushSecrets=async()=>{
    const result=await db.rpc("deela_books_get_push_secrets");
    if(result.error||!result.data)throw Error("خدمة الإشعارات غير مهيأة");
    const raw=JSON.parse(String(result.data.deela_books_vapid||"{}"));
    return {publicKey:String(raw.publicKey||""),privateKey:String(raw.privateKey||""),subject:String(raw.subject||"https://mzo77.github.io/"),trigger:String(result.data.deela_books_push_trigger_secret||"")};
  };
  if(req.method==="GET"&&path==="/push/key"){
    const cfg=await pushSecrets();
    if(!cfg.publicKey)return fail(req,"إشعارات الخلفية غير مهيأة",503);
    return respond(req,{public_key:cfg.publicKey});
  }
  if(req.method==="POST"&&path==="/push/send"){
    const cfg=await pushSecrets();
    if(!cfg.trigger||req.headers.get("x-deela-push-secret")!==cfg.trigger)return fail(req,"غير مصرح",403);
    const b=await req.json(),userId=str(b.user_id,60),title=str(b.title,120)||"إشعار من DEELA Books",body=str(b.body,240);
    if(!uuid.test(userId))return fail(req,"معرف المستخدم غير صحيح");
    const rows=await db.from("deela_books_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id",userId).limit(20);
    if(rows.error)throw rows.error;
    if(!(rows.data||[]).length)return respond(req,{ok:true,sent:0});
    webpush.setVapidDetails(cfg.subject,cfg.publicKey,cfg.privateKey);
    const payload=JSON.stringify({title,body,url:"./#notifications",tag:String(b.notification_id||"deela-books")});
    const results=await Promise.allSettled((rows.data||[]).map(async s=>{
      try {
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:60});
        return true;
      } catch(e) {
        const status=Number((e as any)?.statusCode||0);
        if(status===404||status===410)await db.from("deela_books_push_subscriptions").delete().eq("id",s.id);
        throw e;
      }
    }));
    return respond(req,{ok:true,sent:results.filter(x=>x.status==="fulfilled").length,expired:results.filter(x=>x.status==="rejected").length});
  }

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
    const conf=await settings();if(conf.site_public&&!conf.enable_seller_registration)return fail(req,"التسجيل مغلق مؤقتًا",403);
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
  const storedConf=await settings();
  const testFlags=["enable_seller_registration","enable_book_submissions","enable_reader_likes","enable_favorites","enable_author_follows","enable_reviews","enable_messages","enable_orders","enable_discounts","enable_featured_section","show_book_prices"];
  const conf=storedConf.site_public?storedConf:{...storedConf,private_test_mode:true,...Object.fromEntries(testFlags.map(k=>[k,true]))};
  
  if(req.method==="POST"&&path==="/push/subscribe"){
    if(!user)return fail(req,"سجّل الدخول أولًا",401);
    const b=await req.json(),endpoint=str(b.endpoint,3000),keys=b.keys||{},p256dh=str(keys.p256dh,256),authKey=str(keys.auth,256);
    if(!endpoint.startsWith("https://")||!p256dh||!authKey)return fail(req,"بيانات اشتراك الإشعارات غير صالحة");
    const r=await db.from("deela_books_push_subscriptions").upsert({user_id:user.id,endpoint,p256dh,auth:authKey,updated_at:new Date().toISOString()},{onConflict:"endpoint"}).select("id").single();
    if(r.error)throw r.error;return respond(req,{ok:true});
  }
  if(req.method==="POST"&&path==="/push/unsubscribe"){
    if(!user)return fail(req,"سجّل الدخول أولًا",401);
    const b=await req.json(),endpoint=str(b.endpoint,3000);
    if(!endpoint.startsWith("https://"))return fail(req,"رابط الاشتراك غير صالح");
    const r=await db.from("deela_books_push_subscriptions").delete().eq("user_id",user.id).eq("endpoint",endpoint);
    if(r.error)throw r.error;return respond(req,{ok:true});
  }
const sellerAccount=user&&!isOwner?await sellerFor(user.id):null;
  const privateSeller=!!sellerAccount&&sellerAccount.status==="approved"&&!conf.site_public;
  const pendingSeller=!!sellerAccount&&sellerAccount.status==="pending"&&!conf.site_public;
  const privateApplicant=!!user&&!isOwner&&!sellerAccount&&!conf.site_public&&conf.enable_seller_registration===true;
  // Guests may read only approved stores and published books; all account and write routes stay protected.
  const guestBrowse=req.method==="GET"&&["/catalog","/shops"].includes(path);
  const readerRoutes=new Set(["GET /me","GET /contests","GET /reviews","GET /orders","GET /messages","GET /seller/notifications","GET /launch-alerts/feed","POST /order","POST /like","POST /follow","POST /favorite","POST /view","POST /reports","POST /reviews","POST /messages","POST /messages/reply","POST /seller/notifications/read","POST /contests/answer","GET /download"]);
  const signedReader=!!user&&readerRoutes.has(req.method+" "+path);
  if(!isOwner&&!conf.site_public&&!guestBrowse&&!signedReader){
    if(!privateSeller&&!pendingSeller&&!privateApplicant)return fail(req,"موقع DEELA Books خاص، ويتطلب دخول المالك أو بائعًا معتمدًا",403);
    const pendingRoutes=new Set(["GET /catalog","GET /shops","GET /me","GET /my/listings","GET /seller/notifications","POST /seller/notifications/read","GET /seller/launch-alerts","POST /seller/launch-alerts/request","POST /listing","POST /upload/sign"]);
    const allowed=PRIVATE_SELLER_ROUTES.has(req.method+" "+path)||new Set(["GET /me","POST /seller/apply"]).has(req.method+" "+path);
    if(!allowed)return fail(req,"هذه الخاصية غير متاحة قبل اعتماد المتجر",403);
  }
  if(req.method==="GET"&&path==="/catalog"){
    if(privateSeller||pendingSeller){
      const categories=await db.from("deela_books_sections").select("id,title,description,kind,category,sort_order,visible").eq("kind","category").eq("visible",true).order("sort_order").limit(1000);
      if(categories.error)throw categories.error;
      let ownListings:any[]=[];
      if(sellerAccount?.id){
        const mine=await db.from("deela_books_listings").select("*,deela_books_sellers!inner(id,shop_name,slug,status,city,latitude,longitude)").eq("seller_id",sellerAccount.id).order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(120);
        if(mine.error)throw mine.error;
        ownListings=await enrichBooks(mine.data||[],true);
      }
      const otherPublished=await currentListings(true,new URLSearchParams("only_public=1"),true,true);
      const seen=new Set(ownListings.map(x=>x.id));
      ownListings=[...ownListings,...otherPublished.filter(x=>!seen.has(x.id))];
      const sellerSettings={site_public:false,private_test_mode:true,seller_pending:pendingSeller,...Object.fromEntries(FEATURE_FLAGS.map(k=>[k,conf[k]]))};
      return respond(req,{listings:ownListings,settings:sellerSettings,sections:categories.data||[],banners:[],payments_live:false,shipping_live:false,currency:"SAR"});
    }
    const [sectionRows,bannerRows,theme]=await Promise.all([
      db.from("deela_books_sections").select("id,title,description,kind,category,image_path,material,design,sort_order,visible").eq("visible",true).order("sort_order").limit(1000),
      db.from("deela_books_banners").select("id,title,image_path,target_url,motion,active,starts_at,ends_at,sort_order").eq("active",true).or("starts_at.is.null,starts_at.lte."+new Date().toISOString()).or("ends_at.is.null,ends_at.gt."+new Date().toISOString()).order("sort_order").limit(50),
      signedBranding(conf)
    ]);
    if(sectionRows.error||bannerRows.error)throw Error("merchandising settings unavailable");
    const publicSettings={name:conf.name,private_test_mode:!conf.site_public&&!!user,hero_title:conf.hero_title,hero_subtitle:conf.hero_subtitle,
      announcement:conf.announcement,support_url:conf.support_url,site_public:conf.site_public,
      home_promo_title:conf.home_promo_title,home_promo_description:conf.home_promo_description,
      theme_colors:conf.theme_colors,theme_material:conf.theme_material,theme_design:conf.theme_design,
      theme_sections:conf.theme_sections,theme_images:theme.theme_images,
      ...Object.fromEntries(FEATURE_FLAGS.map(k=>[k,conf[k]]))};
    return respond(req,{
    listings:(await currentListings(isOwner,parsed.searchParams,conf.enable_featured_section,!conf.site_public&&!!user)).map((x:any)=>!isOwner&&!conf.show_book_prices?
      {...x,price_sar:null,compare_at_sar:null}:x),
    settings:publicSettings,
    sections:await signedMerchandising(sectionRows.data||[]),
    banners:await signedMerchandising(bannerRows.data||[]),
    payments_live:false,shipping_live:false,currency:"SAR"
    });
  }
  if(req.method==="GET"&&path==="/shops"){
    const q=db.from("deela_books_sellers").select("id,user_id,shop_name,slug,bio,city,status,created_at,logo_path,latitude,longitude").order("created_at",{ascending:false}).limit(70);
    if(!isOwner&&(!user||conf.site_public))q.eq("status","approved");
    const {data,error:e}=await q;if(e)throw e;
    const sellers=data||[],sellerIds=sellers.map(x=>x.id);
    const followRows=sellerIds.length?await db.from("deela_books_follows").select("seller_id,is_test").in("seller_id",sellerIds).limit(10000):{data:[],error:null};
    if(followRows.error)throw followRows.error;
    const productRows=sellerIds.length?await db.from("deela_books_listings").select("id,seller_id,featured").in("seller_id",sellerIds).eq("status","published").limit(10000):{data:[],error:null};
    if(productRows.error)throw productRows.error;
    const listingIds=(productRows.data||[]).map(x=>x.id);
    const reviewRows=listingIds.length?await db.from("deela_books_reviews").select("listing_id,rating,is_test").in("listing_id",listingIds).eq("approved",true).limit(20000):{data:[],error:null};
    if(reviewRows.error)throw reviewRows.error;
    const stats=new Map<string,{products:number,featured:number,sum:number,count:number}>();
    for(const x of productRows.data||[])stats.set(x.seller_id,{...(stats.get(x.seller_id)||{products:0,featured:0,sum:0,count:0}),products:(stats.get(x.seller_id)?.products||0)+1,featured:(stats.get(x.seller_id)?.featured||0)+(x.featured?1:0),sum:stats.get(x.seller_id)?.sum||0,count:stats.get(x.seller_id)?.count||0});
    const listingOwner=new Map((productRows.data||[]).map(x=>[x.id,x.seller_id]));
    for(const x of reviewRows.data||[]){
      if(conf.site_public&&x.is_test)continue;
      const sid=listingOwner.get(x.listing_id);if(!sid)continue;
      const v=stats.get(sid)||{products:0,featured:0,sum:0,count:0};v.sum+=Number(x.rating)||0;v.count++;stats.set(sid,v);
    }
    const follows=new Map<string,number>();
    for(const x of followRows.data||[])if(!conf.site_public||!x.is_test)follows.set(x.seller_id,(follows.get(x.seller_id)||0)+1);
    const premiumQ=db.from("deela_books_promotions").select("seller_id,is_test").in("seller_id",sellerIds).eq("kind","premium").eq("status","active").gt("ends_at",new Date().toISOString());
    const premium=await (conf.site_public?premiumQ.eq("is_test",false):premiumQ);if(premium.error)throw premium.error;
    const verifiedIds=new Set((premium.data||[]).filter(x=>x.is_test===false).map(x=>x.seller_id)),trialIds=new Set((premium.data||[]).filter(x=>x.is_test===true).map(x=>x.seller_id));
    const memberProfiles=new Map<string,any>();
    await Promise.all(sellers.filter(s=>verifiedIds.has(s.id)||(!conf.site_public&&trialIds.has(s.id))).map(async s=>{
      const auth=await db.auth.admin.getUserById(s.user_id);if(auth.error||!auth.data.user)return;
      const ent=await memberEntitlements(auth.data.user,!conf.site_public,s);
      if(ent.premium_active)memberProfiles.set(s.id,{features:ent.member_features,appearance:ent.member_appearance,avatar_url:ent.avatar_url,plan:ent.member_plan});
    }));
    const shops=await Promise.all(sellers.map(async s=>{
      const z=stats.get(s.id)||{products:0,featured:0,sum:0,count:0};
      const logo=s.logo_path?await db.storage.from("deela-books-covers").createSignedUrl(s.logo_path,600):null;
      return {...s,logo_url:logo&&!logo.error?logo.data.signedUrl:null,follower_count:follows.get(s.id)||0,product_count:z.products,featured_count:z.featured,rating:z.count?Math.round(z.sum/z.count*10)/10:0,rating_count:z.count,premium_active:verifiedIds.has(s.id),premium_test_active:trialIds.has(s.id),member_profile:memberProfiles.get(s.id)||null};
    }));
    return respond(req,{shops});
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
    const membership=await memberEntitlements(user,!conf.site_public);
    return respond(req,{id:user.id,email:user.email||"",phone:user.phone||user.user_metadata?.phone||"",display_name:String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.user_metadata?.name||"").slice(0,90),country:String(user.user_metadata?.country||""),city:String(user.user_metadata?.city||""),address:String(user.user_metadata?.address||""),seller:seller?await signedSeller(seller):null,...membership,
      favorites:(favs.data||[]).map((x:any)=>x.listing_id),
      likes:(likes.data||[]).map((x:any)=>x.listing_id),
      following:(follows.data||[]).map((x:any)=>x.seller_id),
      orders:myOrders.data||[],is_owner:isOwner});
  }
  if(req.method==="POST"&&path==="/seller/apply"){
    if(!conf.enable_seller_registration)return fail(req,"فتح المتاجر مقفل مؤقتًا من لوحة المالك",403);
    if(!isOwner&&!user.email_confirmed_at&&!user.phone_confirmed_at)return fail(req,"أكد بريدك أو رقم جوالك أولًا قبل طلب فتح المتجر",403);
    const b=await req.json(),shop_name=str(b.shop_name,100),slug=str(b.slug,60).toLowerCase(),logo_path=str(b.logo_path,240);
    const latitude=approxCoord(b.latitude,-90,90),longitude=approxCoord(b.longitude,-180,180);
    if(Number.isNaN(latitude)||Number.isNaN(longitude)||(latitude===null)!==(longitude===null))return fail(req,"إحداثيات المتجر غير صحيحة",400);
    if(shop_name.length<3||!slugRE.test(slug))return fail(req,"أدخل اسم متجر ورابطًا صحيحًا بالإنجليزية");
    if(await sellerFor(user.id))return fail(req,"يوجد طلب متجر مرتبط بهذا الحساب بالفعل",409);
    if(logo_path&&!logo_path.startsWith(user.id+"/seller-logos/"))return fail(req,"ملف شعار المتجر غير صالح",403);
    const payload={user_id:user.id,shop_name,slug,bio:str(b.bio,1000),logo_path:logo_path||null,
      city:str(b.city,80),country:str(b.country,80)||"السعودية",latitude,longitude,
      status:isOwner?"approved":"pending"};
    const r=await db.from("deela_books_sellers").insert(payload).select("id,shop_name,slug,status").single();
    if(r.error)return fail(req,r.error.code==="23505"?"رابط المتجر محجوز":"تعذر فتح المتجر",409);
    return respond(req,{shop:r.data},201);
  }
  if(req.method==="POST"&&path==="/seller/premium-appearance"){
    const ent=await memberEntitlements(user,!conf.site_public);if(!ent.premium_active)return fail(req,"هذه المزايا للمشتركين النشطين فقط",403);
    const b=await req.json(),metadata={...(user.user_metadata||{})},features=ent.member_features as string[];
    const display_name=str(b.display_name,90),avatar_path=str(b.avatar_path,240);
    if(display_name&&!features.includes("display_name_style"))return fail(req,"اسم العرض المميز غير متاح في باقتك",403);
    if(avatar_path&&(!features.includes("profile_avatar")||!avatar_path.startsWith(user.id+"/avatars/")))return fail(req,"صورة العرض غير متاحة في باقتك أو مسار الصورة غير صالح",403);
    const avatar_frame=str(b.avatar_frame,20),book_frame=str(b.book_frame,20),profile_theme=str(b.profile_theme,20);
    const avatarGates:Record<string,string>={aurora:"avatar_frame",velvet:"avatar_frame",crystal:"avatar_frame",gold:"avatar_frame_gold",rose:"avatar_frame_rose",diamond:"avatar_frame_diamond"};
    const bookGates:Record<string,string>={starlight:"book_frame",velvet:"book_frame",crystal:"book_frame",gold:"book_frame_gold",rose:"book_frame_rose",diamond:"book_frame_diamond"};
    if(avatar_frame&&!features.includes(avatarGates[avatar_frame]))return fail(req,"هذا الإطار غير متاح في باقتك",403);
    if(book_frame&&!features.includes(bookGates[book_frame]))return fail(req,"هذا الإطار غير متاح في باقتك",403);
    if(profile_theme&&!features.includes("profile_theme"))return fail(req,"ثيم المتجر غير متاح في باقتك",403);
    if(profile_theme&&!["ocean","emerald","royal","rose"].includes(profile_theme))return fail(req,"الثيم المختار غير صالح",400);
    Object.assign(metadata,{deela_member_display_name:display_name||"",deela_member_avatar_path:avatar_path||"",deela_member_avatar_frame:avatar_frame||"aurora",deela_member_book_frame:book_frame||"starlight",deela_member_profile_theme:profile_theme||"ocean",deela_member_shine:features.includes("book_shine")&&b.shine!==false});
    const saved=await db.auth.admin.updateUserById(user.id,{user_metadata:metadata});if(saved.error)throw saved.error;
    return respond(req,{ok:true,message:"تم حفظ هوية العضوية المميزة"});
  }
  if(req.method==="POST"&&path==="/seller/profile"){
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"أنشئ صفحة متجرك أولًا",404);
    const b=await req.json(),shop_name=str(b.shop_name,100),bio=str(b.bio,1000),city=str(b.city,80),logo_path=str(b.logo_path,240);
    const latitude=approxCoord(b.latitude,-90,90),longitude=approxCoord(b.longitude,-180,180);
    if(Number.isNaN(latitude)||Number.isNaN(longitude)||(latitude===null)!==(longitude===null))return fail(req,"إحداثيات المتجر غير صحيحة",400);
    if(shop_name.length<3)return fail(req,"اسم المتجر يجب ألا يقل عن 3 أحرف");
    if(logo_path&&!logo_path.startsWith(user.id+"/seller-logos/"))return fail(req,"ملف شعار المتجر غير صالح",403);
    const saved=await db.from("deela_books_sellers").update({shop_name,bio,city,logo_path:logo_path||null,latitude,longitude,updated_at:new Date().toISOString()}).eq("id",seller.id).eq("user_id",user.id).select("*").single();
    if(saved.error)throw saved.error;
    return respond(req,{shop:await signedSeller(saved.data)});
  }
  if(req.method==="GET"&&path==="/seller/orders"){
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"أنشئ متجرًا أولًا",404);
    let q=db.from("deela_books_order_items").select("id,order_id,listing_id,title_snapshot,quantity,unit_price_sar,shipping_sar,format_snapshot,fulfillment_method,seller_status,shipping_carrier,item_tracking_number,seller_note,seller_updated_at,deela_books_orders!inner(id,code,buyer_id,buyer_email,buyer_name,phone,address,status,total_sar,created_at,customer_note,is_test),deela_books_listings(city)").eq("seller_id",seller.id).order("seller_updated_at",{ascending:false}).limit(150);
    if(conf.site_public)q=q.eq("deela_books_orders.is_test",false);
    const rows=await q;if(rows.error)throw rows.error;
    const stats=rows.data||[],responded=stats.filter(x=>x.seller_status!=="pending").length,accepted=stats.filter(x=>["accepted","preparing","shipped","delivered"].includes(x.seller_status)).length;
    return respond(req,{orders:stats,metrics:{count:stats.length,responded,accepted,acceptance_rate:responded?Math.round(accepted/responded*100):null},payments_live:false});
  }
  if(req.method==="POST"&&path==="/seller/order-item/status"){
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"حساب البائع غير موجود",404);
    const b=await req.json(),id=str(b.id,60),status=str(b.status,20),carrier=str(b.shipping_carrier,80),tracking=str(b.item_tracking_number,100),seller_note=str(b.seller_note,500);
    if(!uuid.test(id)||!["accepted","rejected","preparing","shipped","delivered","cancelled"].includes(status))return fail(req,"حالة المبيعة غير صحيحة");
    const current=await db.from("deela_books_order_items").select("id,seller_id,listing_id,order_id,fulfillment_method,seller_status,deela_books_orders!inner(buyer_id,is_test),deela_books_listings(title)").eq("id",id).eq("seller_id",seller.id).maybeSingle();
    if(current.error||!current.data)return fail(req,"الطلب غير موجود في متجرك",404);
    if(conf.site_public&&!(current.data.deela_books_orders as any)?.is_test&&status!=="accepted"&&status!=="rejected")return fail(req,"يلزم تأكيد الدفع قبل تجهيز الطلب",409);
    if(status==="shipped"&&current.data.fulfillment_method==="delivery"&&!tracking)return fail(req,"أدخل رقم التتبع قبل وضع علامة تم الشحن",400);
    const saved=await db.from("deela_books_order_items").update({seller_status:status,shipping_carrier:carrier,item_tracking_number:tracking,seller_note,seller_updated_at:new Date().toISOString()}).eq("id",id).eq("seller_id",seller.id).select("id,seller_status,shipping_carrier,item_tracking_number").single();
    if(saved.error)throw saved.error;
    const buyer=(current.data.deela_books_orders as any)?.buyer_id;
    if(buyer&&buyer!==user.id){
      const titles:Record<string,string>={accepted:"قبل البائع طلبك",rejected:"تعذر قبول أحد منتجات طلبك",preparing:"بدأ تجهيز طلبك",shipped:"تم شحن منتجك",delivered:"تم تسليم المنتج",cancelled:"أُلغي منتج من طلبك"};
      const note=await db.from("deela_books_notifications").insert({user_id:buyer,actor_id:user.id,listing_id:current.data.listing_id,event_type:"order_update",title:titles[status],body:str((current.data.deela_books_listings as any)?.title,120)+" · "+(status==="shipped"&&tracking?"رقم التتبع "+tracking:"تحديث من البائع"),is_test:!conf.site_public});
      if(note.error)throw note.error;
    }
    return respond(req,{ok:true,item:saved.data,test_mode:!conf.site_public});
  }
  if(req.method==="GET"&&path==="/my/listings"){
    const seller=await sellerFor(user.id);
    if(!seller)return respond(req,{listings:[]});
    const r=await db.from("deela_books_listings").select("*").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(120);
    if(r.error)throw r.error;
    const enriched=await enrichBooks(r.data||[],!conf.site_public);
    const original=new Map((r.data||[]).map(p=>[p.id,p]));
    return respond(req,{listings:enriched.map(p=>({...p,
      file_path:original.get(p.id)?.file_path,
      rights_confirmed:original.get(p.id)?.rights_confirmed}))});
  }
  if(req.method==="GET"&&path==="/seller/activity"){
    const seller=await sellerFor(user.id);if(!seller)return respond(req,{activity:[]});
    const books=await db.from("deela_books_listings").select("id,title,status,created_at").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(120);
    if(books.error)throw books.error;const ids=(books.data||[]).map(x=>x.id);
    if(!ids.length)return respond(req,{activity:[]});
    let likesQ=db.from("deela_books_likes").select("listing_id,user_id,created_at").in("listing_id",ids).limit(10000);
    let reviewsQ=db.from("deela_books_reviews").select("id,listing_id,user_id,rating,body,created_at,is_test").in("listing_id",ids).eq("approved",true).limit(10000);
    if(conf.site_public){likesQ=likesQ.eq("is_test",false);reviewsQ=reviewsQ.eq("is_test",false);}
    const [likes,reviews]=await Promise.all([likesQ,reviewsQ]);if(likes.error||reviews.error)throw Error("تعذر تحميل تفاعل الكتب");
    const actorIds=[...new Set([...(likes.data||[]).map(x=>x.user_id),...(reviews.data||[]).map(x=>x.user_id)].filter((x:string)=>x!==user.id))].slice(0,60);
    const names=new Map<string,string>();
    await Promise.all(actorIds.map(async id=>{try{const u=await db.auth.admin.getUserById(id),m=u.data?.user?.user_metadata||{};names.set(id,String(m.display_name||m.full_name||m.name||("قارئ #"+id.slice(0,6))).slice(0,80));}catch{names.set(id,"قارئ #"+id.slice(0,6));}}));
    return respond(req,{activity:(books.data||[]).map(book=>({listing:book,
      likes:(likes.data||[]).filter(x=>x.listing_id===book.id&&x.user_id!==user.id).map(x=>({actor_id:x.user_id,actor_name:names.get(x.user_id)||("قارئ #"+x.user_id.slice(0,6)),created_at:x.created_at})),
      comments:(reviews.data||[]).filter(x=>x.listing_id===book.id&&x.user_id!==user.id).map(x=>({id:x.id,actor_id:x.user_id,actor_name:names.get(x.user_id)||("قارئ #"+x.user_id.slice(0,6)),rating:x.rating,body:x.body,created_at:x.created_at,is_test:x.is_test}))
    }))});
  }
  if(req.method==="POST"&&path==="/listing/delete"){
    const b=await req.json(),id=str(b.id,60);if(!uuid.test(id))return fail(req,"رقم الكتاب غير صالح");
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"حساب المؤلف غير موجود",404);
    const book=await db.from("deela_books_listings").select("id,status,seller_id").eq("id",id).maybeSingle();
    if(book.error||!book.data||(!isOwner&&book.data.seller_id!==seller.id))return fail(req,"لا تملك صلاحية حذف هذا الكتاب",403);
    const r=await db.from("deela_books_listings").update({status:"archived",featured:false,updated_at:new Date().toISOString()}).eq("id",id).select("id,status").single();
    if(r.error)throw r.error;return respond(req,{ok:true,listing:r.data,soft_delete:true});
  }
  if(req.method==="GET"&&path==="/seller/notifications"){
    let noticesQuery=db.from("deela_books_notifications").select("id,listing_id,actor_id,event_type,title,body,read_at,created_at,is_test").eq("user_id",user.id);
    if(conf.site_public)noticesQuery=noticesQuery.eq("is_test",false);
    const r=await noticesQuery.order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;
    const ids=[...new Set((r.data||[]).map(x=>x.actor_id).filter(Boolean))],names=new Map<string,string>();
    await Promise.all(ids.slice(0,50).map(async id=>{try{const u=await db.auth.admin.getUserById(id),m=u.data?.user?.user_metadata||{};names.set(id,String(m.display_name||m.full_name||m.name||("قارئ #"+id.slice(0,6))).slice(0,80));}catch{names.set(id,"قارئ #"+id.slice(0,6));}}));
    return respond(req,{notifications:(r.data||[]).map(x=>({...x,actor_name:x.actor_id?names.get(x.actor_id)||("قارئ #"+String(x.actor_id).slice(0,6)):null}))});
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
  if(req.method==="GET"&&path==="/seller/promotions"){
    const seller=await sellerFor(user.id);if(!seller)return fail(req,"متجر الكاتب غير موجود",404);
    let q=db.from("deela_books_promotions").select("id,kind,plan_key,status,is_test,starts_at,ends_at,listing_id,deela_books_listings(title)").eq("seller_id",seller.id).order("created_at",{ascending:false}).limit(100);
    if(conf.site_public)q=q.eq("is_test",false);
    const r=await q;if(r.error)throw r.error;return respond(req,{promotions:r.data||[],payments_live:false});
  }
  if(req.method==="POST"&&path==="/seller/promotions/test"){
    const seller=await sellerFor(user.id);if(!seller||!["approved","pending"].includes(seller.status))return fail(req,"أنشئ متجرك أولًا لتجربة الترويج",403);
    const b=await req.json(),kind=str(b.kind,20),plan=str(b.plan_key,12),listingId=str(b.listing_id,60);
    const days:Record<string,number>={day:1,week:7,month:30};
    if(!["boost","premium"].includes(kind)||!days[plan])return fail(req,"خيار الترويج غير صالح");
    let linked:string|null=null;
    if(kind==="boost"){
      if(!uuid.test(listingId))return fail(req,"اختر رواية من متجرك");
      const l=await db.from("deela_books_listings").select("id,title").eq("id",listingId).eq("seller_id",seller.id).maybeSingle();
      if(l.error||!l.data)return fail(req,"الرواية ليست ضمن متجرك",404);
      linked=listingId;
    }
    const now=new Date(),ends=new Date(now.getTime()+days[plan]*86400000);
    const dup=await db.from("deela_books_promotions").select("id,ends_at").eq("seller_id",seller.id).eq("kind",kind).eq("plan_key",plan).eq("status","active").gt("ends_at",now.toISOString()).limit(1).maybeSingle();
    if(dup.error)throw dup.error;
    if(!dup.data){
      const saved=await db.from("deela_books_promotions").insert({seller_id:seller.id,listing_id:linked,kind,plan_key:plan,status:"active",is_test:true,starts_at:now.toISOString(),ends_at:ends.toISOString()}).select("id,kind,plan_key,status,is_test,starts_at,ends_at,listing_id").single();
      if(saved.error)throw saved.error;
      if(kind==="boost"){
        const featured=await db.from("deela_books_listings").update({featured:true,updated_at:now.toISOString()}).eq("id",linked).eq("seller_id",seller.id);
        if(featured.error)throw featured.error;
        const fs=await db.from("deela_books_follows").select("user_id").eq("seller_id",seller.id).limit(10000);
        if(fs.error)throw fs.error;
        const audience=(fs.data||[]).filter((x:any)=>x.user_id!==user.id).map((x:any)=>({user_id:x.user_id,actor_id:user.id,listing_id:linked,event_type:"test_promotion",title:"رواية مروّجة من متجر تتابعه",body:"روّج "+seller.shop_name+" لروايته الجديدة في مساحة الاختبار.",is_test:true}));
        if(audience.length){const notices=await db.from("deela_books_notifications").insert(audience);if(notices.error)throw notices.error;}
      }
      return respond(req,{ok:true,promotion:saved.data,payment_live:false,message:"تم تفعيل الميزة مجانًا في وضع الاختبار."},201);
    }
    return respond(req,{ok:true,promotion:dup.data,payment_live:false,message:"هذه التجربة مفعّلة بالفعل."});
  }
  if(req.method==="GET"&&path==="/contests"){
    const now=new Date().toISOString();
    const due=await db.from("deela_books_contests").select("id,question_text").eq("status","announced").lte("starts_at",now).neq("question_text","");
    if(due.error)throw due.error;
    if(due.data?.length)await db.from("deela_books_contests").update({status:"open",updated_at:now}).in("id",due.data.map(x=>x.id));
    let contestsQuery=db.from("deela_books_contests").select("id,title,announcement,starts_at,status,question_text,poll_options,created_at").in("status",["announced","open"]);
    if(conf.site_public)contestsQuery=contestsQuery.eq("is_test",false);
    const r=await contestsQuery.order("starts_at",{ascending:true}).limit(20);
    if(r.error)throw r.error;
    const ids=(r.data||[]).map(x=>x.id);let answers:any[]=[];const pollCounts:Record<string,Record<string,number>>={};
    if(ids.length){const own=await db.from("deela_books_contest_answers").select("contest_id,answer,is_correct").eq("user_id",user.id).in("contest_id",ids);if(own.error)throw own.error;answers=own.data||[];}
    const pollIds=(r.data||[]).filter(x=>Array.isArray(x.poll_options)&&x.poll_options.length>=2).map(x=>x.id);
    if(pollIds.length){const votes=await db.from("deela_books_contest_answers").select("contest_id,answer").in("contest_id",pollIds).limit(10000);if(votes.error)throw votes.error;for(const vote of votes.data||[]){const group=pollCounts[vote.contest_id]||(pollCounts[vote.contest_id]={});group[vote.answer]=(group[vote.answer]||0)+1;}}
    return respond(req,{contests:(r.data||[]).map(x=>({...x,my_answer:answers.find(y=>y.contest_id===x.id)||null,poll_counts:pollCounts[x.id]||{}}))});
  }
  if(req.method==="POST"&&path==="/contests/answer"){
    const b=await req.json(),id=str(b.contest_id,60),answer=str(b.answer,1000).trim();
    if(!uuid.test(id)||!answer)return fail(req,"اكتب إجابتك");
    const c=await db.from("deela_books_contests").select("id,status,starts_at,question_text,poll_options").eq("id",id).maybeSingle();
    if(c.error||!c.data)return fail(req,"المسابقة غير موجودة",404);
    if(c.data.status!=="open"||!c.data.question_text||(c.data.starts_at&&new Date(c.data.starts_at).getTime()>Date.now()))return fail(req,"لم يبدأ استقبال الإجابات بعد",409);
    const pollOptions=Array.isArray(c.data.poll_options)?c.data.poll_options:[];if(pollOptions.length&& !pollOptions.includes(answer))return fail(req,"اختر خيارًا من خيارات الاستطلاع");
    const saved=await db.from("deela_books_contest_answers").upsert({contest_id:id,user_id:user.id,answer,is_correct:null,is_test:!conf.site_public},{onConflict:"contest_id,user_id"}).select("id,answer,created_at").single();
    if(saved.error)throw saved.error;return respond(req,{ok:true,answer:saved.data});
  }
  if(req.method==="GET"&&path==="/owner/contests"){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    const r=await db.from("deela_books_contests").select("*").order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;
    const contests=await Promise.all((r.data||[]).map(async c=>{
      const answers=await db.from("deela_books_contest_answers").select("id,user_id,answer,is_correct,created_at").eq("contest_id",c.id).order("is_correct",{ascending:false,nullsFirst:false}).order("created_at",{ascending:true}).limit(2000);
      if(answers.error)throw answers.error;return {...c,answers:answers.data||[]};
    }));
    return respond(req,{contests});
  }
  if(req.method==="POST"&&path==="/owner/contest/save"){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    const b=await req.json(),id=str(b.id,60),title=str(b.title,160),announcement=str(b.announcement,1000),question=str(b.question_text,1000),correct=str(b.correct_answer,500).trim(),startRaw=str(b.starts_at,40);
    const pollOptions=Array.isArray(b.poll_options)?[...new Set(b.poll_options.map((x:unknown)=>str(x,100).trim()).filter(Boolean))]:[];
    if(b.poll_options!==undefined&&(!Array.isArray(b.poll_options)||(pollOptions.length!==0&&(pollOptions.length<2||pollOptions.length>6))))return fail(req,"الاستطلاع يحتاج من خيارين إلى ستة خيارات");
    if(title.length<2)return fail(req,"أدخل اسم المسابقة");
    let startsAt:string|null=null;if(startRaw){const d=new Date(startRaw);if(Number.isNaN(d.getTime()))return fail(req,"موعد المسابقة غير صالح");startsAt=d.toISOString();}
    const now=new Date(),due=!startsAt||new Date(startsAt).getTime()<=now.getTime(),status=question&&due?"open":"announced";
    const values={title,announcement,question_text:question,correct_answer:pollOptions.length?"":correct,poll_options:pollOptions,starts_at:startsAt,status,updated_at:now.toISOString()};
    let result;
    if(id){if(!uuid.test(id))return fail(req,"رقم المسابقة غير صالح");result=await db.from("deela_books_contests").update(values).eq("id",id).select("*").single();}
    else result=await db.from("deela_books_contests").insert({...values,created_by:user.id,is_test:!conf.site_public}).select("*").single();
    if(result.error)throw result.error;
    if(correct){
      const list=await db.from("deela_books_contest_answers").select("id,answer").eq("contest_id",result.data.id).limit(2000);
      if(list.error)throw list.error;
      for(const answer of list.data||[])await db.from("deela_books_contest_answers").update({is_correct:answer.answer.trim().toLocaleLowerCase()===correct.toLocaleLowerCase()}).eq("id",answer.id);
    }else await db.from("deela_books_contest_answers").update({is_correct:null}).eq("contest_id",result.data.id);
    if(!id&&announcement){
      const audience=await db.from("profiles").select("id").limit(10000);if(audience.error)throw audience.error;
      const unique=[...new Set((audience.data||[]).map((x:any)=>x.id).filter((x:string)=>x&&x!==user.id))];
      for(let i=0;i<unique.length;i+=500){
        const batch=unique.slice(i,i+500).map(user_id=>({user_id,actor_id:user.id,event_type:"contest",title:"مسابقة DEELA Books",body:announcement,is_test:!conf.site_public}));
        if(batch.length){const n=await db.from("deela_books_notifications").insert(batch);if(n.error)throw n.error;}
      }
    }
    return respond(req,{ok:true,contest:result.data});
  }
  if(req.method==="POST"&&path==="/owner/contest/close"){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    const b=await req.json(),id=str(b.id,60);if(!uuid.test(id))return fail(req,"رقم المسابقة غير صالح");
    const r=await db.from("deela_books_contests").update({status:"closed",updated_at:new Date().toISOString()}).eq("id",id).select("id,status").single();
    if(r.error)throw r.error;return respond(req,{ok:true,contest:r.data});
  }
  if(req.method==="POST"&&path==="/view"){
    const b=await req.json(),id=str(b.listing_id,60);
    if(!uuid.test(id))return fail(req,"معرّف الرواية غير صحيح");
    const book=await db.from("deela_books_listings").select("id,title,status,seller_id,view_count,deela_books_sellers!inner(user_id,status)").eq("id",id).maybeSingle();
    if(book.error||!book.data)return fail(req,"الرواية غير موجودة",404);
    if(book.data.status!=="published"||(conf.site_public&&(book.data.deela_books_sellers as any)?.status!=="approved"))return fail(req,"الرواية غير منشورة",404);
    const sellerUser=(book.data.deela_books_sellers as any)?.user_id;
    if(sellerUser===user.id)return respond(req,{ok:true,counted:false,view_count:Number(book.data.view_count||0)});
    const inserted=await db.from("deela_books_listing_views").insert({listing_id:id,user_id:user.id,is_test:!conf.site_public});
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
          const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,event_type:"view_milestone",title:`وصلت روايتك إلى ${current} مشاهدة`,body:`حققت رواية «${str(book.data.title,120)}» ${current} مشاهدة فريدة.`,is_test:!conf.site_public});
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
    const values=itemInput(b),id=str(b.id,60),testPublish=!conf.site_public,autoPublish=testPublish||(!isOwner&&seller.status==="approved");
    const baseCategories=["كتب","روايات","خيال ورعب","أدب وشعر","قصص قصيرة","رومانسية","أكشن","مغامرة","غموض","جريمة","تشويق","رعب","فانتازيا","خيال علمي","تاريخية","اجتماعية","دراما","كوميديا","بوليسية","شعر","أدب","تطوير الذات","أعمال","تعليم","تاريخ","كتب الأطفال","سيرة ذاتية","فلسفة","تقنية","ديني","ألعاب فيديو","قرطاسية","فنون وحرف","قهوة","موسيقى","مجسمات","أزياء","أخرى"];
    if(!baseCategories.includes(values.category)){
      const custom=await db.from("deela_books_sections").select("id").eq("kind","category").eq("category",values.category).limit(1);
      if(custom.error)throw custom.error;
      if(!custom.data?.length)return fail(req,"اختر قسمًا معرفًا في المتجر للرواية",400);
    }
    if(!conf.enable_discounts&&values.compare_at_sar!==null)
      return fail(req,"خصومات الأسعار معطلة من مركز المالك",403);
    // File ownership is always tied to the authenticated upload identity.
    if(values.cover_path&&!values.cover_path.startsWith(user.id+"/covers/"))return fail(req,"ملف الغلاف ليس ملك حسابك",403);
    if((values.image_paths||[]).some((path:string)=>!path.startsWith(user.id+"/covers/")))return fail(req,"إحدى صور المنتج ليست ملك حسابك",403);
    if(values.file_path&&!values.file_path.startsWith(user.id+"/books/"))return fail(req,"ملف الكتاب ليس ملك حسابك",403);
    let r,wasPublished=false;
    if(id){
      if(!uuid.test(id))return fail(req,"معرّف الكتاب غير صحيح");
      const prev=await db.from("deela_books_listings").select("id,status").eq("id",id).eq("seller_id",seller.id).maybeSingle();
      if(prev.error||!prev.data)return fail(req,"لا يحق لك تعديل هذا الكتاب",403);
      wasPublished=prev.data.status==="published";
      if(prev.data.status==="published"&&!isOwner)return fail(req,"بعد نشر الرواية لا يمكن تعديلها؛ احذفها وأعد رفع نسخة جديدة",403);
      r=await db.from("deela_books_listings").update({...values,status:autoPublish?"published":"pending",moderation_note:testPublish?"نشر في وضع الاختبار الخاص":autoPublish?"نشر تلقائيًا بعد اعتماد المتجر":"",updated_at:new Date().toISOString()}).eq("id",id).eq("seller_id",seller.id).select("id,title,status").single();
    }else{
      r=await db.from("deela_books_listings").insert({...values,seller_id:seller.id,status:autoPublish?"published":"pending",moderation_note:testPublish?"نشر في وضع الاختبار الخاص":autoPublish?"نشر تلقائيًا بعد اعتماد المتجر":""}).select("id,title,status").single();
    }
    if(r.error)throw r.error;
    if(r.data.status==="published"&&!wasPublished){
      const fs=await db.from("deela_books_follows").select("user_id").eq("seller_id",seller.id).limit(10000);
      if(fs.error)throw fs.error;
      const audience=(fs.data||[]).filter((x:any)=>x.user_id!==user.id).map((x:any)=>({user_id:x.user_id,actor_id:user.id,listing_id:r.data.id,event_type:conf.site_public?"new_book":"test_new_book",title:"رواية جديدة من متجر تتابعه",body:"أضاف "+seller.shop_name+" رواية «"+str(r.data.title,120)+"» إلى متجره.",is_test:!conf.site_public}));
      if(audience.length){const notices=await db.from("deela_books_notifications").insert(audience);if(notices.error)throw notices.error;}
    }
    return respond(req,{ok:true,listing:r.data,requires_approval:r.data.status!=="published",test_mode:!conf.site_public},id?200:201);
  }
  if(req.method==="POST"&&path==="/upload/sign"){
    const b=await req.json(),type=str(b.type,16),extension=str(b.extension,12).toLowerCase();
    if(type!=="branding"&&type!=="avatar"&&!conf.enable_book_submissions)return fail(req,"رفع الكتب متوقف مؤقتًا",403);
    if(type==="branding"&&!isOwner)return fail(req,"رفع صور الهوية متاح للمالك فقط",403);
    const membership=type==="avatar"?await memberEntitlements(user,!conf.site_public):null;
    if(type==="avatar"&&(!membership?.premium_active||!membership.member_features.includes("profile_avatar")))return fail(req,"رفع صورة العرض ضمن مزايا العضوية المفعلة فقط",403);
    const seller=type==="branding"||type==="shop_logo"||type==="avatar"?null:await sellerFor(user.id);
    if(type!=="branding"&&type!=="shop_logo"&&type!=="avatar"&&(!seller||(!isOwner&&seller.status!=="approved"&&!(seller.status==="pending"&&!conf.site_public))))return fail(req,"حساب متجر معتمد مطلوب",403);
    const imageType=["branding","shop_logo","cover","avatar"].includes(type);
    const extOk=imageType?["jpg","jpeg","png","webp"]:["pdf","epub","mp3"];
    if(!extOk.includes(extension))return fail(req,"نوع الملف غير مدعوم",400);
    const folder=type==="branding"?"branding":type==="shop_logo"?"seller-logos":type==="avatar"?"avatars":type==="cover"?"covers":"books";
    const bucket=type==="file"?"deela-books-private-files":"deela-books-covers";
    const path=user.id+"/"+folder+"/"+crypto.randomUUID()+"."+extension;
    const result=await db.storage.from(bucket).createSignedUploadUrl(path);
    if(result.error)throw result.error;
    return respond(req,{bucket,path,token:result.data.token,max_bytes:type==="branding"||type==="shop_logo"||type==="avatar"?3145728:type==="cover"?5242880:52428800});
  }
  if(req.method==="GET"&&path==="/download"){
    const id=str(parsed.searchParams.get("id"),60);
    if(!uuid.test(id))return fail(req,"كتاب غير صحيح");
    const r=await db.from("deela_books_listings").select("id,file_path,format,status,seller_id").eq("id",id).maybeSingle();
    if(r.error||!r.data||!r.data.file_path)return fail(req,"الكتاب الرقمي غير موجود",404);
    if(!isOwner&&!(privateSeller&&r.data.seller_id===sellerAccount?.id)){
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
    const sellerUser=(check.data.deela_books_sellers as any)?.user_id;
    if(b.liked&&sellerUser===user.id)return fail(req,"لا يمكنك الإعجاب بكتابك من حساب الناشر",403);
    const ownTest=(privateSeller||pendingSeller)&&check.data.seller_id===sellerAccount?.id;
    if(!isOwner&&!ownTest&&(check.data.status!=="published"||
       (conf.site_public&&(check.data.deela_books_sellers as any)?.status!=="approved")))
      return fail(req,"الكتاب لم يُنشر بعد",403);
    if(b.liked){
      const prior=await db.from("deela_books_likes").select("listing_id").eq("listing_id",id).eq("user_id",user.id).maybeSingle();
      if(prior.error)throw prior.error;
      const r=await db.from("deela_books_likes").upsert({listing_id:id,user_id:user.id,is_test:!conf.site_public},{onConflict:"user_id,listing_id"});
      if(r.error)throw r.error;
      const sellerUser=(check.data.deela_books_sellers as any)?.user_id;
      if(!prior.data&&sellerUser&&sellerUser!==user.id){
        const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,actor_id:user.id,event_type:conf.site_public?"like":"test_like",title:conf.site_public?"إعجاب جديد بروايتك":"إعجاب جديد (اختبار خاص)",body:`أعجب قارئ برواية «${str(check.data.title,120)}».`,is_test:!conf.site_public});
        if(note.error)throw note.error;
      }
    }else{
      const r=await db.from("deela_books_likes").delete().eq("listing_id",id).eq("user_id",user.id);
      if(r.error)throw r.error;
    }
    let countQuery=db.from("deela_books_likes").select("listing_id",{count:"exact",head:true}).eq("listing_id",id);
    if(conf.site_public)countQuery=countQuery.eq("is_test",false);
    const count=await countQuery;if(count.error)throw count.error;
    return respond(req,{ok:true,liked:b.liked,like_count:count.count||0});
  }
  if(req.method==="POST"&&path==="/follow"){
    if(!conf.enable_author_follows)return fail(req,"متابعة المؤلفين معطلة حاليًا",403);
    const b=await req.json(),id=str(b.seller_id,60);
    if(!uuid.test(id)||typeof b.following!=="boolean")return fail(req,"معرف متجر غير صالح");
    const seller=await db.from("deela_books_sellers").select("id,status,user_id").eq("id",id).maybeSingle();
    if(seller.error||!seller.data)return fail(req,"المتجر غير موجود",404);
    if(!isOwner&&conf.site_public&&seller.data.status!=="approved")return fail(req,"المتجر غير معتمد",403);
    if(seller.data.user_id===user.id)return fail(req,"لا تتابع متجرك الشخصي",400);
    const priorFollow=await db.from("deela_books_follows").select("seller_id").eq("user_id",user.id).eq("seller_id",id).maybeSingle();
    if(priorFollow.error)throw priorFollow.error;
    if(b.following){
      const r=await db.from("deela_books_follows").upsert({user_id:user.id,seller_id:id,is_test:!conf.site_public},{onConflict:"user_id,seller_id"});
      if(r.error)throw r.error;
      if(!priorFollow.data&&seller.data.user_id!==user.id){
        const n=await db.from("deela_books_notifications").insert({user_id:seller.data.user_id,actor_id:user.id,event_type:conf.site_public?"follow":"test_follow",title:conf.site_public?"متابع جديد":"متابع جديد (اختبار خاص)",body:"قارئ جديد بدأ متابعة متجرك.",is_test:!conf.site_public});
        if(n.error)throw n.error;
      }
    }else{
      const r=await db.from("deela_books_follows").delete().eq("user_id",user.id).eq("seller_id",id);
      if(r.error)throw r.error;
    }
    let countQuery=db.from("deela_books_follows").select("seller_id",{count:"exact",head:true}).eq("seller_id",id);
    if(conf.site_public)countQuery=countQuery.eq("is_test",false);
    const count=await countQuery;if(count.error)throw count.error;
    return respond(req,{ok:true,following:b.following,follower_count:count.count||0});
  }
  if(req.method==="POST"&&path==="/favorite"){
    if(!conf.enable_favorites)return fail(req,"المفضلة معطلة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60);
    if(!uuid.test(id))return fail(req,"الكتاب غير صحيح");
    if(b.liked===true){
      const r=await db.from("deela_books_favorites").upsert({listing_id:id,user_id:user.id,is_test:!conf.site_public},{onConflict:"user_id,listing_id"});
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
    const ids=new Set<string>(),basket:{id:string;qty:number}[]=[],fulfillmentMap=new Map<string,string>((Array.isArray(b.fulfillment)?b.fulfillment:[]).map((x:any)=>[str(x.id,60),str(x.method,20)]));
    for(const x of items){
      const id=str(x.id,60),qty=Number(x.qty);
      if(!uuid.test(id)||ids.has(id)||!Number.isInteger(qty)||qty<1||qty>10)
        return fail(req,"محتويات السلة غير صحيحة");
      ids.add(id);basket.push({id,qty});
    }
    const cutoff=new Date(Date.now()-15*60000).toISOString();
    const recent=await db.from("deela_books_orders").select("id",{count:"exact",head:true}).eq("buyer_id",user.id).gte("created_at",cutoff);
    if(recent.error)throw recent.error;
    if(conf.site_public&&(recent.count||0)>=3)return fail(req,"وصلت إلى حد 3 طلبات خلال 15 دقيقة، حاول لاحقًا",429);
    const r=await db.from("deela_books_listings").select("id,title,price_sar,shipping_fee_sar,stock,format,seller_id,status,file_path,pickup_available,shipping_available").in("id",basket.map(x=>x.id));
    if(r.error)throw r.error;
    if((r.data||[]).length!==basket.length)return fail(req,"أحد الكتب لم يعد متاحًا",409);
    let subtotal=0,shipping=0;const lines=[];
    for(const item of basket){
      const p=(r.data||[]).find(x=>x.id===item.id);
      if(!p||p.status!=="published"||p.stock<item.qty)return fail(req,"أحد الكتب غير متاح أو نفد",409);
      if(p.format!=="physical"&&!p.file_path)return fail(req,"لا يمكن إتمام هذا الطلب لأن ملف الكتاب الرقمي غير مرفوع بعد",409);
      const method=p.format!=="physical"?"digital":(fulfillmentMap.get(p.id)||((p.shipping_available===false&&p.pickup_available)?"pickup":"delivery"));
      if(p.format==="physical"&&method==="delivery"&&p.shipping_available===false)return fail(req,"التوصيل غير متاح لهذا الكتاب",400);
      if(p.format==="physical"&&method==="pickup"&&p.pickup_available!==true)return fail(req,"الاستلام من البائع غير متاح لهذا الكتاب",400);
      if(p.format==="physical"&&!["delivery","pickup"].includes(method))return fail(req,"اختر طريقة استلام الكتاب الورقي",400);
      subtotal+=Number(p.price_sar)*item.qty;
      const lineShipping=p.format==="physical"&&method==="delivery"?Number(p.shipping_fee_sar)*item.qty:0;
      shipping+=lineShipping;
      lines.push({listing_id:p.id,seller_id:p.seller_id,title_snapshot:p.title,format_snapshot:p.format,quantity:item.qty,unit_price_sar:p.price_sar,shipping_sar:lineShipping,fulfillment_method:method});
    }
    const testDigital=!conf.site_public&&lines.length>0&&lines.every(x=>x.format_snapshot!=="physical");
    const couponCode=str(b.coupon_code,30).toUpperCase();
    if(couponCode&& (conf.site_public||couponCode!=="FIRST20"||!conf.enable_discounts))return fail(req,"رمز الخصم غير متاح في هذا الطلب",400);
    const discount=couponCode==="FIRST20"?Math.round(subtotal*0.2*100)/100:0;
    const testMethodLabels:Record<string,string>={mada:"مدى",apple_pay:"Apple Pay",visa:"Visa",stc_pay:"STC Pay",tabby:"تابي",tamara:"تمارا",cash_on_delivery:"الدفع عند الاستلام"};
    const selectedTestMethod=str(b.test_payment_method,24)||"mada";
    if(!conf.site_public&&!Object.hasOwn(testMethodLabels,selectedTestMethod))return fail(req,"اختر وسيلة الدفع التجريبية",400);
    const buyerNote=str(b.note,500);
    const orderNote=!conf.site_public?[buyerNote,"وسيلة الدفع المختارة للاختبار: "+testMethodLabels[selectedTestMethod]+" — لا يوجد تحصيل حقيقي."].filter(Boolean).join(" · "):buyerNote;
    const data={
      code:"DB-"+crypto.randomUUID().slice(0,8).toUpperCase(),
      buyer_id:user.id,buyer_email:user.email||"",buyer_name:str(b.buyer_name,90),
      phone:str(b.phone,25),address:{
        country:str(b.country,80),city:str(b.city,80),line:str(b.address,280)
      },
      customer_note:orderNote,
      subtotal_sar:Math.round(subtotal*100)/100,discount_sar:discount,coupon_code:couponCode,
      shipping_sar:Math.round(shipping*100)/100,
      total_sar:Math.round(Math.max(0,subtotal-discount+shipping)*100)/100,
      status:testDigital?"delivered":"pending_review",payment_method:"manual",is_test:!conf.site_public
    };
    if(lines.some(x=>x.fulfillment_method==="delivery")&&(!data.address.city||!data.address.line))
      return fail(req,"الكتب الورقية تتطلب المدينة والعنوان");
    const order=await db.from("deela_books_orders").insert(data).select("id,code,status,total_sar").single();
    if(order.error)throw order.error;
    const itemSave=await db.from("deela_books_order_items").insert(lines.map(x=>({...x,order_id:order.data.id,seller_status:x.fulfillment_method==="digital"?"delivered":"pending"})));
    const profileMeta={...(user.user_metadata||{}),display_name:data.buyer_name||user.user_metadata?.display_name||"",phone:data.phone||user.user_metadata?.phone||"",country:data.address.country||"السعودية",city:data.address.city||"",address:data.address.line||""};
    const profileUpdate=await db.auth.admin.updateUserById(user.id,{user_metadata:profileMeta});if(profileUpdate.error)console.error("buyer profile metadata update failed",profileUpdate.error.message);
    if(itemSave.error){
      await db.from("deela_books_orders").delete().eq("id",order.data.id).eq("buyer_id",user.id);
      throw itemSave.error;
    }
    return respond(req,{ok:true,order:order.data,payment_collected:false,test_access:testDigital,test_payment_method:!conf.site_public?selectedTestMethod:null,unlocked_listing_ids:testDigital?lines.map(x=>x.listing_id):[]},201);
  }
  if(req.method==="GET"&&path==="/orders"){
    const r=await db.from("deela_books_orders").select("id,code,created_at,status,total_sar,tracking_number,owner_note,is_test,support_status,support_reason,support_message,support_resolution,deela_books_order_items(id,listing_id,title_snapshot,quantity,unit_price_sar,format_snapshot,seller_status,shipping_carrier,item_tracking_number,fulfillment_method)")
     .eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50);
    if(r.error)throw r.error;return respond(req,{orders:r.data||[]});
  }
  if(req.method==="POST"&&path==="/order/support"){
    const b=await req.json(),id=str(b.order_id,60),reason=str(b.reason,80),message=str(b.message,1000);
    if(!uuid.test(id)||reason.length<2||message.length<1)return fail(req,"أدخل سبب الطلب ورسالتك",400);
    const order=await db.from("deela_books_orders").select("id,code,buyer_id,support_status,deela_books_order_items(seller_id,listing_id)").eq("id",id).eq("buyer_id",user.id).maybeSingle();
    if(order.error||!order.data)return fail(req,"الطلب غير موجود",404);
    if(order.data.support_status==="open"||order.data.support_status==="investigating")return fail(req,"لديك طلب مساعدة مفتوح لهذا الطلب");
    const saved=await db.from("deela_books_orders").update({support_status:"open",support_reason:reason,support_message:message,support_resolution:"",support_updated_at:new Date().toISOString()}).eq("id",id).eq("buyer_id",user.id).select("id,code,support_status").single();
    if(saved.error)throw saved.error;
    const sellerIds=[...new Set((order.data.deela_books_order_items||[]).map((x:any)=>x.seller_id).filter(Boolean))];
    const users=sellerIds.length?await db.from("deela_books_sellers").select("user_id").in("id",sellerIds):{data:[],error:null};
    if(users.error)throw users.error;
    const recipients=[...new Set((users.data||[]).map((x:any)=>x.user_id))].filter(x=>x&&x!==user.id);
    if(recipients.length){const rows=recipients.map(user_id=>({user_id,actor_id:user.id,event_type:"order_support",title:"طلب مساعدة جديد على طلب",body:saved.data.code+" · "+reason,is_test:!conf.site_public}));const n=await db.from("deela_books_notifications").insert(rows);if(n.error)throw n.error;}
    return respond(req,{ok:true,order:saved.data},201);
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
    if(!recipient||(recipient===user.id&&conf.site_public))return fail(req,"لا يمكنك مراسلة نفسك إلا في وضع الاختبار الخاص");
    const r=await db.from("deela_books_messages").insert({listing_id:id,sender_id:user.id,recipient_id:recipient,body}).select("id").single();
    if(r.error)throw r.error;
    const note=await db.from("deela_books_notifications").insert({user_id:recipient,actor_id:user.id,listing_id:id,event_type:conf.site_public?"message":"test_message",title:"رسالة جديدة عن كتابك",body:body.slice(0,180),is_test:!conf.site_public});
    if(note.error)throw note.error;
    return respond(req,{ok:true});
  }
  if(req.method==="POST"&&path==="/messages/reply"){
    if(!conf.enable_messages)return fail(req,"الردود متوقفة حاليًا",403);
    const b=await req.json(),id=str(b.id,60),body=str(b.body,1000);
    if(!uuid.test(id)||body.length<2)return fail(req,"رسالة غير صحيحة");
    const orig=await db.from("deela_books_messages").select("id,listing_id,sender_id,recipient_id").eq("id",id).maybeSingle();
    if(orig.error||!orig.data)return fail(req,"الرسالة غير موجودة",404);
    if(orig.data.recipient_id!==user.id&&!isOwner)return fail(req,"لا يحق لك الرد على هذه الرسالة",403);
    const to=orig.data.sender_id;
    if(to===user.id&&conf.site_public)return fail(req,"لا يمكنك الرد على نفسك",400);
    const r=await db.from("deela_books_messages").insert({
      listing_id:orig.data.listing_id,sender_id:user.id,recipient_id:to,body
    }).select("id").single();
    if(r.error)throw r.error;
    const note=await db.from("deela_books_notifications").insert({user_id:to,actor_id:user.id,listing_id:orig.data.listing_id,event_type:conf.site_public?"message_reply":"test_message_reply",title:"رد جديد على رسالتك",body:body.slice(0,180),is_test:!conf.site_public});
    if(note.error)throw note.error;
    return respond(req,{ok:true});
  }
  if(req.method==="POST"&&path==="/reports"){
    const b=await req.json(),id=str(b.listing_id,60),reason=str(b.reason,1000);
    if(!uuid.test(id)||reason.length<10)return fail(req,"اكتب سبب بلاغ واضحًا");
    const r=await db.from("deela_books_reports").insert({listing_id:id,reporter_id:user.id,reason});
    if(r.error)throw r.error;return respond(req,{ok:true,status:"open"});
  }
  if(req.method==="GET"&&path==="/reviews"){
    const id=str(parsed.searchParams.get("listing_id"),60);if(!uuid.test(id))return fail(req,"معرّف الكتاب غير صحيح");
    const book=await db.from("deela_books_listings").select("id,seller_id").eq("id",id).maybeSingle();
    if(book.error||!book.data)return fail(req,"الكتاب غير موجود",404);
    const ownTest=(privateSeller||pendingSeller)&&book.data.seller_id===sellerAccount?.id;
    if(!isOwner&&!ownTest&&!conf.site_public)return fail(req,"المراجعات غير متاحة لهذا الكتاب في المعاينة الخاصة",403);
    let q=db.from("deela_books_reviews").select("id,user_id,rating,body,created_at,is_test").eq("listing_id",id).eq("approved",true).order("created_at",{ascending:false}).limit(100);
    if(conf.site_public)q=q.eq("is_test",false);
    const r=await q;if(r.error)throw r.error;
    return respond(req,{reviews:r.data||[]});
  }
  if(req.method==="POST"&&path==="/reviews"){
    if(!conf.enable_reviews)return fail(req,"التقييمات معطلة حاليًا",403);
    const b=await req.json(),id=str(b.listing_id,60),rating=Number(b.rating),body=str(b.body,1000);
    if(!uuid.test(id)||!Number.isInteger(rating)||rating<1||rating>5||body.length<1)return fail(req,"اكتب تقييمًا صحيحًا");
    const book=await db.from("deela_books_listings").select("id,seller_id,status").eq("id",id).maybeSingle();
    if(book.error||!book.data)return fail(req,"الكتاب غير موجود",404);
    const ownTest=(privateSeller||pendingSeller)&&book.data.seller_id===sellerAccount?.id;
    if(!conf.site_public&&!isOwner&&book.data.status!=="published")return fail(req,"الرواية لم تُنشر داخل مساحة الاختبار",403);
    if(conf.site_public){
      const items=await db.from("deela_books_order_items").select("order_id,deela_books_orders!inner(buyer_id,status,is_test)")
        .eq("listing_id",id).eq("deela_books_orders.buyer_id",user.id).eq("deela_books_orders.status","delivered").eq("deela_books_orders.is_test",false).limit(1);
      if(items.error||!(items.data||[]).length)return fail(req,"التقييم متاح بعد استلام طلب الكتاب فقط",403);
    }
    const r=await db.from("deela_books_reviews").upsert({listing_id:id,user_id:user.id,rating,body,approved:!conf.site_public,is_test:!conf.site_public},{onConflict:"listing_id,user_id"});
    if(r.error)throw r.error;
    const ownerRow=await db.from("deela_books_sellers").select("user_id").eq("id",book.data.seller_id).maybeSingle();
    if(ownerRow.error)throw ownerRow.error;
    if(ownerRow.data?.user_id&&ownerRow.data.user_id!==user.id){
      const note=await db.from("deela_books_notifications").insert({user_id:ownerRow.data.user_id,actor_id:user.id,listing_id:id,event_type:conf.site_public?"review":"test_review",title:"تعليق وتقييم جديد",body:"وصل تقييم جديد ("+rating+"/5) لكتابك.",is_test:!conf.site_public});
      if(note.error)throw note.error;
    }
    return respond(req,{ok:true,pending_moderation:conf.site_public,test_mode:!conf.site_public});
  }
  if(path.startsWith("/owner/")){
    if(!isOwner)return fail(req,"حساب المالك فقط",403);
    if(req.method==="POST"&&path==="/owner/broadcast"){
      const b=await req.json(),title=str(b.title,120),body=str(b.body,240),audience=str(b.audience,20);
      if(title.length<2||body.length<2||!["all","readers","sellers"].includes(audience))return fail(req,"عنوان الإشعار أو نصه أو فئته غير صحيح");
      const recipientIds=new Set<string>();
      if(audience==="sellers"){
        const rows=await db.from("deela_books_sellers").select("user_id").limit(10000);if(rows.error)throw rows.error;
        for(const row of rows.data||[])if(uuid.test(String(row.user_id))&&row.user_id!==user.id)recipientIds.add(row.user_id);
      }else{
        const sellerIds=new Set<string>();
        if(audience==="readers"){
          const rows=await db.from("deela_books_sellers").select("user_id").limit(10000);if(rows.error)throw rows.error;
          for(const row of rows.data||[])sellerIds.add(row.user_id);
        }
        for(let page=1;page<=50;page++){
          const result=await db.auth.admin.listUsers({page,perPage:1000});if(result.error)throw result.error;
          const users=result.data.users||[];
          for(const account of users)if(account.id!==user.id&&(audience==="all"||!sellerIds.has(account.id)))recipientIds.add(account.id);
          if(users.length<1000)break;
        }
      }
      const ids=[...recipientIds];let delivered=0;
      for(let i=0;i<ids.length;i+=500){
        const rows=ids.slice(i,i+500).map(user_id=>({user_id,event_type:"announcement",title,body,is_test:!conf.site_public}));
        const inserted=await db.from("deela_books_notifications").insert(rows);if(inserted.error)throw inserted.error;delivered+=rows.length;
      }
      let pushSent=0;
      if(b.send_push===true&&ids.length){
        try{
          const cfg=await pushSecrets();
          if(cfg.publicKey&&cfg.privateKey){
            webpush.setVapidDetails(cfg.subject,cfg.publicKey,cfg.privateKey);
            for(let i=0;i<ids.length;i+=500){
              const subscriptions=await db.from("deela_books_push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id",ids.slice(i,i+500)).limit(2000);
              if(subscriptions.error)throw subscriptions.error;
              const result=await Promise.allSettled((subscriptions.data||[]).map(async sub=>{
                try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:"./#notifications",tag:"deela-announcement-"+Date.now()}),{TTL:60});return true;}
                catch(err){const status=Number((err as any)?.statusCode||0);if(status===404||status===410)await db.from("deela_books_push_subscriptions").delete().eq("id",sub.id);throw err;}
              }));
              pushSent+=result.filter(x=>x.status==="fulfilled").length;
            }
          }
        }catch(e){console.error("DEELA broadcast push",error(e));}
      }
      return respond(req,{ok:true,delivered,push_sent:pushSent,audience,test_mode:!conf.site_public});
    }
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
      const config={mode:"test",live_enabled:false,provider:provider||"tap",marketplace:true,tax_percent:tax,refund_window_days:refund,discounts_enabled:b.discounts_enabled,methods:["mada","apple_pay","visa","stc_pay","tabby","tamara"],excluded_methods:["mastercard"],updated_at:new Date().toISOString()};
      const r=await db.from("deela_books_settings").update({payment_test_config:config,updated_at:new Date().toISOString()}).eq("id",1).select("payment_test_config").single();
      if(r.error)throw r.error;return respond(req,{ok:true,config:r.data.payment_test_config,payments_live:false});
    }
    if(req.method==="GET"&&path==="/owner/member-tiers"){
      if(!isOwner)return fail(req,"هذه العملية للمالك فقط",403);
      return respond(req,{tiers:await memberTiers(),features:MEMBER_FEATURE_IDS});
    }
    if(req.method==="POST"&&path==="/owner/member-tiers"){
      if(!isOwner)return fail(req,"هذه العملية للمالك فقط",403);
      const b=await req.json(),tiers=b.tiers;
      if(!tiers||typeof tiers!=="object"||Array.isArray(tiers))return fail(req,"إعدادات الباقات غير صحيحة",400);
      const clean:Record<string,string[]>={};
      for(const key of ["day","week","month"]){const values=tiers[key];if(!Array.isArray(values)||values.some((x:any)=>!MEMBER_FEATURE_IDS.includes(x)))return fail(req,"ميزة غير معروفة في باقة "+key,400);clean[key]=[...new Set(values)];}
      const saved=await db.from("deela_books_membership_tiers").upsert({id:1,tiers:clean,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"id"});
      if(saved.error)throw saved.error;
      return respond(req,{ok:true,tiers:clean});
    }
    if(req.method==="POST"&&path==="/owner/user-premium-features"){
      if(!isOwner)return fail(req,"هذه العملية للمالك فقط",403);
      const b=await req.json(),id=str(b.user_id,60),features=b.features;
      if(!uuid.test(id)||!Array.isArray(features)||features.some((x:any)=>!MEMBER_FEATURE_IDS.includes(x)))return fail(req,"قائمة مزايا المشترك غير صحيحة",400);
      if(await owner(id))return fail(req,"لا يمكن تعديل صلاحيات حساب المالك من هنا",403);
      const seller=await sellerFor(id);if(!seller)return fail(req,"إدارة مزايا العضوية متاحة لبائعي DEELA Books فقط",404);
      const auth=await db.auth.admin.getUserById(id);if(auth.error||!auth.data.user)return fail(req,"الحساب غير موجود",404);
      const ent=await memberEntitlements(auth.data.user,!conf.site_public);if(!ent.premium_active)return fail(req,"لا توجد عضوية نشطة لهذا الحساب؛ فعّل الباقة من نظام الاشتراك أولًا",409);
      const metadata={...(auth.data.user.user_metadata||{}),deela_member_features:[...new Set(features)],deela_member_custom_features:true};
      const saved=await db.auth.admin.updateUserById(id,{user_metadata:metadata});if(saved.error)throw saved.error;
      return respond(req,{ok:true,user_id:id,features:metadata.deela_member_features});
    }
    if(req.method==="GET"&&path==="/owner/users"){
      const sellers=await db.from("deela_books_sellers").select("user_id,shop_name,slug,status,created_at").order("created_at",{ascending:false}).limit(500);
      if(sellers.error)throw Error("تعذر قراءة حسابات بائعي DEELA Books");
      const ids=[...new Set((sellers.data||[]).map((x:any)=>x.user_id).filter((x:any)=>uuid.test(String(x))))];
      if(!ids.length)return respond(req,{users:[]});
      const controls=await db.from("deela_books_user_controls").select("user_id,blocked,note,changed_at").in("user_id",ids);
      if(controls.error)throw Error("تعذر قراءة إعدادات بائعي DEELA Books");
      const controlMap=new Map((controls.data||[]).map((x:any)=>[x.user_id,x]));
      const out=[];for(const seller of sellers.data||[]){if(await owner(seller.user_id))continue;const auth=await db.auth.admin.getUserById(seller.user_id);if(auth.error)continue;const u=auth.data.user,c=controlMap.get(seller.user_id) as any;const member=await memberEntitlements(u,!conf.site_public);out.push({id:u.id,email:u.email||"",phone:u.phone||"",created_at:seller.created_at||u.created_at,last_sign_in_at:u.last_sign_in_at,is_owner:false,blocked:c?.blocked===true,note:c?.note||"",shop_name:seller.shop_name||"",slug:seller.slug||"",seller_status:seller.status||"",...member});}
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
      return respond(req,{listings:await enrichBooks(r.data||[],!conf.site_public),categories:[...new Set((categories.data||[]).map((x:any)=>x.category).filter(Boolean))]});
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
        const note=await db.from("deela_books_notifications").insert({user_id:sellerUser,listing_id:id,event_type:"section_moved",title:"تم نقل روايتك إلى قسمها الصحيح",body:`نُقلت رواية «${str(existing.data.title,120)}» إلى قسم «${category}».`,is_test:!conf.site_public});
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
    if(req.method==="POST"&&path==="/owner/order-support"){
      const b=await req.json(),id=str(b.id,60),status=str(b.status,20),resolution=str(b.resolution,1000);
      if(!uuid.test(id)||!["investigating","resolved","rejected"].includes(status))return fail(req,"حالة طلب المساعدة غير صحيحة");
      const order=await db.from("deela_books_orders").select("id,code,buyer_id").eq("id",id).maybeSingle();
      if(order.error||!order.data)return fail(req,"الطلب غير موجود",404);
      const saved=await db.from("deela_books_orders").update({support_status:status,support_resolution:resolution,support_updated_at:new Date().toISOString()}).eq("id",id).select("id,code,support_status").single();
      if(saved.error)throw saved.error;
      const n=await db.from("deela_books_notifications").insert({user_id:order.data.buyer_id,actor_id:user.id,event_type:"order_support_update",title:"تحديث طلب المساعدة",body:order.data.code+" · "+(resolution||status),is_test:!conf.site_public});
      if(n.error)throw n.error;
      return respond(req,{ok:true,order:saved.data});
    }
    if(req.method==="POST"&&path==="/owner/order-status"){
      const b=await req.json(),id=str(b.id,60),status=str(b.status,25);
      if(!uuid.test(id)||!["pending_review","awaiting_payment","paid","preparing","shipped","delivered","cancelled"].includes(status))
        return fail(req,"حالة الطلب غير صحيحة");
      const o=await db.from("deela_books_orders").select("id,status,payment_confirmed_at,is_test").eq("id",id).maybeSingle();
      if(o.error||!o.data)return fail(req,"الطلب غير موجود",404);
      const privateTestOrder=!conf.site_public&&o.data.is_test===true;
      // Test orders can move through the workflow without representing a payment.
      if(["paid","preparing","shipped","delivered"].includes(status)&&!o.data.payment_confirmed_at&&b.payment_confirmed!==true&&!privateTestOrder)
        return fail(req,"يجب أن تؤكد استلام الدفع الحقيقي أولًا",409);
      const r=await db.from("deela_books_orders").update({
        status,owner_note:str(b.owner_note,500),tracking_number:str(b.tracking_number,100),
        payment_confirmed_at:o.data.payment_confirmed_at||
          (b.payment_confirmed===true&&!privateTestOrder?new Date().toISOString():null),
        updated_at:new Date().toISOString()
      }).eq("id",id).select("id,code,status").single();
      if(r.error)throw r.error;
      return respond(req,{ok:true,order:r.data,payment_automatic:false,test_mode:privateTestOrder});
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
        const categorySize=Number.isInteger(d?.category_icon_size)?d.category_icon_size:36;
        const navSize=Number.isInteger(d?.nav_icon_size)?d.nav_icon_size:20;
        const actionSize=Number.isInteger(d?.book_action_icon_size)?d.book_action_icon_size:42;
        const categoryShape=d?.category_icon_shape||"soft";
        const bookCoverHeight=Number.isInteger(d?.book_cover_height)?d.book_cover_height:251;
        const bookCardWidth=Number.isInteger(d?.book_card_width)?d.book_card_width:220;
        const bookCardRadius=Number.isInteger(d?.book_card_radius)?d.book_card_radius:18;
        if(!d||!Number.isInteger(d.radius)||d.radius<0||d.radius>40||!Number.isInteger(d.font_size)||d.font_size<12||d.font_size>22||!["none","glow"].includes(d.banner_motion)||categorySize<0||categorySize>500||navSize<14||navSize>32||actionSize<28||actionSize>52||!["soft","round","square"].includes(categoryShape)||bookCoverHeight<0||bookCoverHeight>1200||bookCardWidth<0||bookCardWidth>1200||bookCardRadius<0||bookCardRadius>100)return fail(req,"إعدادات التصميم غير صحيحة",400);
        configured.theme_design={radius:d.radius,font_size:d.font_size,banner_motion:d.banner_motion,category_icon_size:categorySize,nav_icon_size:navSize,book_action_icon_size:actionSize,category_icon_shape:categoryShape,book_cover_height:bookCoverHeight,book_card_width:bookCardWidth,book_card_radius:bookCardRadius};
      }
      if(Object.prototype.hasOwnProperty.call(b,"theme_sections")){
        const sections=b.theme_sections;
        if(!sections||typeof sections!=="object"||Array.isArray(sections))return fail(req,"إعدادات الأقسام غير صحيحة",400);
        const clean:Record<string,unknown>={};
        for(const [k,v] of Object.entries(sections)){
          const d=v as any;
          const materialList=["none","ceramic","marble","ornament","pearl","metal","velvet","neon","heritage","aurora","granite","wood","floral","sandstone","crystal","geometric","goldleaf","watercolor","leather","linen","mosaic","stars"];
          if(!["categories","books","shops","faq","banner","welcome"].includes(k)||!d||typeof d.title!=="string"||d.title.length>100||!Number.isInteger(d.order)||d.order<1||d.order>99||typeof d.visible!=="boolean"||!materialList.includes(d.material)||![undefined,""].includes(d.background_color)&&!(typeof d.background_color==="string"&&/^#[0-9a-f]{6}$/i.test(d.background_color))||![undefined,""].includes(d.accent_color)&&!(typeof d.accent_color==="string"&&/^#[0-9a-f]{6}$/i.test(d.accent_color)))return fail(req,"إعداد قسم غير صحيح",400);
          const scale=d.scale===undefined?100:Number(d.scale);if(!Number.isInteger(scale)||scale<80||scale>120)return fail(req,"حجم القسم غير صحيح",400);
          const itemsLimit=d.items_limit===undefined?6:Number(d.items_limit);if(!Number.isInteger(itemsLimit)||itemsLimit<1||itemsLimit>30)return fail(req,"عدد العناصر غير صحيح",400);
          const description=d.description===undefined?"":String(d.description);if(description.length>180)return fail(req,"وصف القسم طويل",400);const linkText=d.link_text===undefined?"":String(d.link_text);if(linkText.length>60)return fail(req,"نص الرابط طويل",400);
          const bannerUrl=d.banner_url===undefined?"":String(d.banner_url);if(bannerUrl&&(!/^https:\/\//i.test(bannerUrl)||bannerUrl.length>500))return fail(req,"رابط البنر يجب أن يكون HTTPS",400);
          const animation=d.animation===undefined?"glow":d.animation;if(!["glow","none"].includes(animation))return fail(req,"حركة الترحيب غير صحيحة",400);
          const motion=d.motion===undefined?"shimmer":d.motion;if(!["glow","none","shimmer"].includes(motion))return fail(req,"تأثير الحركة غير صحيح",400);
          clean[k]={title:d.title,description,link_text:linkText,items_limit:itemsLimit,order:d.order,visible:d.visible,material:d.material,background_color:d.background_color||"",accent_color:d.accent_color||"",banner_url:bannerUrl,scale,motion,animation};
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
