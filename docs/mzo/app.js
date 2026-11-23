(()=>{"use strict";
const ENDPOINT="https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/mzo-site";
const $=id=>document.getElementById(id);
let data=[];
function escapeUrl(url){try{const parsed=new URL(url);return parsed.protocol==="https:"&&!parsed.username&&!parsed.password?parsed.href:null}catch{return null}}
function render(query=""){
 const needle=query.trim().toLocaleLowerCase();
 const filtered=data.filter(x=>[x.title,x.description,x.category,x.url].some(v=>String(v||"").toLocaleLowerCase().includes(needle)));
 const container=$("cards");
 const frag=document.createDocumentFragment();
 for(const [idx,item] of filtered.entries()){
  const link=escapeUrl(item.url);if(!link)continue;
  const a=document.createElement("a");a.className="project";a.href=link;
  if(new URL(link).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}
  const icon=document.createElement("span");icon.className="circle";icon.textContent=["◈","⌑","▣","✦","◎"][idx%5];
  const tag=document.createElement("span");tag.className="tag";tag.textContent=item.category||"مشروع";
  const heading=document.createElement("h3");heading.textContent=item.title;
  const desc=document.createElement("p");desc.textContent=item.description||"استكشف هذه الوجهة";
  const more=document.createElement("span");more.className="go";more.textContent="اكتشف المشروع ↗";
  a.append(icon,tag,heading,desc,more);frag.append(a);
 }
 container.replaceChildren(frag);
 $("empty").classList.toggle("hidden",filtered.length!==0);
}
const fallback=[
 {title:"متجر DEELA iOS",description:"استعرض متجر ديلا للآيفون عبر الويب.",url:"https://mzo77.github.io/DEELA-V2/ios/",category:"تطبيقات"},
 {title:"تثبيت ديلا للآيفون",description:"حالة التوقيع ورابط التثبيت للأجهزة المؤهلة.",url:"https://mzo77.github.io/DEELA-V2/ios/install/",category:"تطبيقات"},
 {title:"مشروع DEELA Android",description:"المشروع العام لنظام متجر ديلا على GitHub.",url:"https://github.com/mzo77/DEELA-V2",category:"مشاريع"}
];
data=fallback;
$("search").addEventListener("input",()=>render($("search").value));
$("year").textContent=new Date().getFullYear();
(async()=>{
 try{
  const response=await fetch(ENDPOINT+"/public",{cache:"no-store",credentials:"omit"});
  if(!response.ok)throw Error("Unable to load current content");
  const result=await response.json();
  if(!Array.isArray(result.links)||!result.settings)throw Error("Bad content");
  data=result.links;
  const info=result.settings;
  $("brandText").textContent=info.brand_name||"MZO";
  $("heroTitle").textContent=info.heading||"أهلًا بك في MZO";
  $("heroDesc").textContent=info.description||"مشاريعي الرقمية في مكان واحد.";
  document.title=(info.brand_name||"MZO")+" | مشاريع رقمية";
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=info.description||meta.content;
  $("projectCount").textContent=String(data.length).padStart(2,"0");
  if(info.announcement){
   $("notice").textContent=info.announcement;$("notice").classList.remove("hidden");
  }
  render($("search").value);
 }catch(err){console.warn("Using MZO static content fallback");}
})();
})();