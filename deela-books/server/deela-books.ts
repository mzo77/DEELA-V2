import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
const fn="/deela-books";
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
function itemInput(raw:Record<string,unknown>){
 const title=str(raw.title,180),author=str(raw.author,100),description=str(raw.description,5000);
 const category=str(raw.category,80)||"روايات",language=str(raw.language,50)||"العربية";
 const format=str(raw.format,20),condition=str(raw.book_condition,25)||"new";
 const price=currencies(raw.price_sar),shipping=currencies(raw.shipping_fee_sar??0);
 const compare=raw.compare_at_sar===null||raw.compare_at_sar===""||raw.compare_at_sar===undefined?null:currencies(raw.compare_at_sar);
 const stock=Number(raw.stock),cover=str(raw.cover_path,240),file=str(raw.file_path,240);
 const rights=raw.rights_confirmed===true;
 if(title.length<2||!["physical","ebook","audiobook"].includes(format)||!Number.isInteger(stock)||stock<0||stock>100000||
   Number.isNaN(price)||Number.isNaN(shipping)||Number.isNaN(compare)||
   !["new","like_new","good","acceptable","not_applicable"].includes(condition))
   throw Error("تحقق من عنوان الكتاب ونوعه والسعر والكمية");
 if(!rights)throw Error("يجب تأكيد ملكية حقوق النشر أو إذن التوزيع");
 if(format!=="physical"&&file.length===0)throw Error("الكتاب الرقمي يحتاج ملف PDF أو EPUB أو MP3 مرفوعًا");
 return {title,author,description,category,language,format,book_condition:format==="physical"?condition:"not_applicable",
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
async function currentListings(isOwner:boolean,search:URLSearchParams){
 let q=db.from("deela_books_listings")
  .select("*,deela_books_sellers!inner(id,shop_name,slug,status,city)")
  .order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(80);
 if(!isOwner)q=q.eq("status","published").eq("deela_books_sellers.status","approved");
 else if(search.get("only_public")==="1")q=q.eq("status","published");
 if(search.get("format")&&["physical","ebook","audiobook"].includes(search.get("format")!))
   q=q.eq("format",search.get("format")!);
 const result=await q;
 if(result.error)throw result.error;
 const category=str(search.get("category"),80);
 const words=str(search.get("q"),100).toLocaleLowerCase();
 const selected=(result.data||[]).filter(p=>(!category||p.category===category)&&(!words||[p.title,p.author,p.category,p.description].some((v:string)=>String(v||"").toLocaleLowerCase().includes(words))));
 return await signedCovers(selected);
}
async function ownerOverview(req:Request){
 const [s,l,o,r,m]=await Promise.all([
  db.from("deela_books_sellers").select("id",{count:"exact",head:true}),
  db.from("deela_books_listings").select("id",{count:"exact",head:true}),
  db.from("deela_books_orders").select("id",{count:"exact",head:true}),
  db.from("deela_books_reports").select("id",{count:"exact",head:true}).eq("status","open"),
  db.from("deela_books_messages").select("id",{count:"exact",head:true})
 ]);
 if([s,l,o,r,m].some(x=>x.error))throw Error("owner overview unavailable");
 return respond(req,{shops:s.count||0,books:l.count||0,orders:o.count||0,open_reports:r.count||0,messages:m.count||0});
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":allowedOrigins(req),"Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":"authorization,content-type,apikey","Vary":"Origin"}});
 const parsed=new URL(req.url),path=parsed.pathname.split(fn)[1]||"/";
 if(req.method==="GET"&&path==="/health")return respond(req,{ok:true,name:"DEELA Books",owner_only:true,payments_live:false,shipping_live:false});
 try{
  const user=await getUser(req),isOwner=user?await owner(user.id):false;
  const conf=await settings();
  // Launch gate is always enforced: no public marketplace until the owner explicitly authorizes launch.
  if(!isOwner&&!conf.site_public)return fail(req,"موقع DEELA Books خاص بالمالك ولم يُفتح للجمهور بعد",403);
  if(req.method==="GET"&&path==="/catalog")return respond(req,{
    listings:await currentListings(isOwner,parsed.searchParams),
    settings:{name:conf.name,hero_title:conf.hero_title,hero_subtitle:conf.hero_subtitle,
      announcement:conf.announcement,support_url:conf.support_url,site_public:conf.site_public},
    payments_live:false,shipping_live:false,currency:"SAR"
  });
  if(req.method==="GET"&&path==="/shops"){
    const q=db.from("deela_books_sellers").select("id,shop_name,slug,bio,city,status,created_at").order("created_at",{ascending:false}).limit(70);
    if(!isOwner)q.eq("status","approved");
    const {data,error:e}=await q;
    if(e)throw e;return respond(req,{shops:data||[]});
  }
  if(!user)return fail(req,"سجّل الدخول أولًا",401);
  if(req.method==="GET"&&path==="/me"){
    const [seller,favs,myOrders]=await Promise.all([
      sellerFor(user.id),
      db.from("deela_books_favorites").select("listing_id").eq("user_id",user.id).limit(200),
      db.from("deela_books_orders").select("id,code,status,total_sar,created_at,tracking_number,owner_note").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50)
    ]);
    if(favs.error||myOrders.error)throw Error("customer profile unavailable");
    return respond(req,{id:user.id,email:user.email||"",seller,
      favorites:(favs.data||[]).map((x:any)=>x.listing_id),orders:myOrders.data||[],is_owner:isOwner});
  }
  if(req.method==="POST"&&path==="/seller/apply"){
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
    return respond(req,{listings:await Promise.all((r.data||[]).map(async p=>({...(await signedCovers([p]))[0],file_path:p.file_path,rights_confirmed:p.rights_confirmed})))});
  }
  if(req.method==="POST"&&path==="/listing"){
    const b=await req.json(),seller=await sellerFor(user.id);
    if(!seller||(!isOwner&&seller.status!=="approved"))return fail(req,"يجب أن يكون متجرك معتمدًا لإضافة الكتب",403);
    const values=itemInput(b),id=str(b.id,60);
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
    const seller=await sellerFor(user.id);
    if(!seller||(!isOwner&&seller.status!=="approved"))return fail(req,"حساب متجر معتمد مطلوب",403);
    const extOk=type==="cover"?["jpg","jpeg","png","webp"]:["pdf","epub","mp3"];
    if(!extOk.includes(extension))return fail(req,"نوع الملف غير مدعوم",400);
    const folder=type==="cover"?"covers":"books";
    const bucket=type==="cover"?"deela-books-covers":"deela-books-private-files";
    const path=user.id+"/"+folder+"/"+crypto.randomUUID()+"."+extension;
    const result=await db.storage.from(bucket).createSignedUploadUrl(path);
    if(result.error)throw result.error;
    return respond(req,{bucket,path,token:result.data.token,max_bytes:type==="cover"?5242880:52428800});
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
  if(req.method==="POST"&&path==="/favorite"){
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
    const r=await db.from("deela_books_messages").select("id,listing_id,sender_id,recipient_id,body,created_at")
      .or("sender_id.eq."+user.id+",recipient_id.eq."+user.id)
      .order("created_at",{ascending:false}).limit(100);
    if(r.error)throw r.error;return respond(req,{messages:r.data||[]});
  }
  if(req.method==="POST"&&path==="/messages"){
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
    if(req.method==="GET"&&path==="/owner/sellers"){
      const r=await db.from("deela_books_sellers").select("*").order("created_at",{ascending:false}).limit(120);
      if(r.error)throw r.error;return respond(req,{sellers:r.data||[]});
    }
    if(req.method==="GET"&&path==="/owner/listings"){
      const r=await db.from("deela_books_listings").select("*,deela_books_sellers(shop_name,slug)").order("created_at",{ascending:false}).limit(200);
      if(r.error)throw r.error;return respond(req,{listings:await signedCovers(r.data||[])});
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
      const b=await req.json(),id=str(b.id,60),status=str(b.status,20);
      if(!uuid.test(id)||!["draft","pending","published","rejected","archived"].includes(status))return fail(req,"حالة الكتاب غير صحيحة");
      const r=await db.from("deela_books_listings").update({
        status,moderation_note:str(b.note,350),featured:b.featured===true,updated_at:new Date().toISOString()
      }).eq("id",id).select("id,title,status").maybeSingle();
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
      if(b.site_public===true)return fail(req,"النشر العام مقفل بأمر المالك الحالي. يلزم تصريح نشر مستقل.",403);
      const {data,error:e}=await db.from("deela_books_settings").update({
        name:str(b.name,100)||"DEELA Books",
        hero_title:str(b.hero_title,180)||"لكل كتاب حكاية، ولكل قارئ عالم",
        hero_subtitle:str(b.hero_subtitle,500),
        announcement:str(b.announcement,150),
        support_url:str(b.support_url,350),
        site_public:false,payments_live:false,
        commission_percent:Number.isFinite(Number(b.commission_percent))?Math.max(0,Math.min(50,Number(b.commission_percent))):10,
        updated_at:new Date().toISOString()
      }).eq("id",1).select("id,name,hero_title,hero_subtitle,announcement,support_url,commission_percent,site_public").single();
      if(e)throw e;return respond(req,{ok:true,settings:data});
    }
    if(req.method==="GET"&&path==="/owner/settings")return respond(req,{settings:conf});
  }
  return fail(req,"المسار غير موجود",404);
 }catch(e){
  console.error("deela-books",error(e));
  return fail(req,"تعذر تنفيذ العملية في خدمة DEELA Books",500);
 }
});