"use strict";
self.addEventListener("push",event=>{
 let payload={};
 try{payload=event.data?event.data.json():{}}catch{payload={body:event.data?.text()||""}}
 const title=String(payload.title||"إشعار من DEELA Books");
 const options={
  body:String(payload.body||"لديك تحديث جديد في DEELA Books"),
  icon:"./icon.svg",
  badge:"./icon.svg",
  tag:String(payload.tag||"deela-books"),
  data:{url:String(payload.url||"./")}
 };
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||"./",self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{
  for(const client of clients){
   if("focus" in client){await client.focus();if("navigate" in client)await client.navigate(target);return;}
  }
  if(self.clients.openWindow)await self.clients.openWindow(target);
 }));
});
