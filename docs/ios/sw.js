/* Cache only the public storefront shell. Never cache tokens, API responses or IPA files. */
const CACHE="deela-ios-shell-v3";
const BASE="/DEELA-V2/ios";
const ASSETS=[BASE+"/",BASE+"/app.js",BASE+"/icon.svg",BASE+"/manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>{})
));
self.addEventListener("activate",event=>event.waitUntil(
 caches.keys().then(names=>Promise.all(names.filter(name=>name!==CACHE&&name.startsWith("deela-ios-shell-")).map(name=>caches.delete(name)))).then(()=>self.clients.claim())
));
self.addEventListener("fetch",event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=="GET"||u.origin!==self.location.origin||!ASSETS.includes(u.pathname))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{})}
  return response;
 }).catch(()=>caches.match(event.request)));
});