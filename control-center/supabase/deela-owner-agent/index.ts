import {createClient} from "npm:@supabase/supabase-js@2.95.0";

const endpoint="https://api.github.com/repos/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml/dispatches";
const runsUrl="https://github.com/mzo77/DEELA-V2/actions/workflows/deela-arabic-coding-agent.yml";
const url=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const database=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
function response(data:Record<string,unknown>,status=200){return new Response(JSON.stringify(data),{status,headers});}

Deno.serve(async(request:Request)=>{
  if(request.method!=="GET"&&request.method!=="POST")return response({error:"طريقة الطلب غير مدعومة"},405);
  const token=(request.headers.get("Authorization")||"").match(/^Bearer (.+)$/)?.[1];
  if(!token)return response({error:"سجل دخولك إلى حساب مالك ديلا أولًا"},401);
  try{
    const {data:{user},error:authError}=await database.auth.getUser(token);
    if(authError||!user)return response({error:"جلسة ديلا غير صالحة أو منتهية"},401);
    const {data:profile,error:profileError}=await database.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profileError||profile?.role!=="owner")return response({error:"تشغيل وكيل البرمجة مخصص للمالك فقط"},403);

    const githubKey=(Deno.env.get("DEELA_GITHUB_TOKEN")||"").trim();
    if(request.method==="GET"){
      return response({ready:githubKey.length>10,engine:"OpenCode",runs_url:runsUrl,requires_secret:!githubKey,
        free_model_limited:true,max_tasks_per_24h:5});
    }
    if(!githubKey)return response({code:"manual_mode",error:"لم يُربط مفتاح GitHub المجاني على الخادم بعد؛ استخدم تشغيل GitHub Actions اليدوي.",runs_url:runsUrl},503);
    const size=Number(request.headers.get("content-length")||"0");
    if(size>12000)return response({error:"النص طويل جدًا"},413);
    let content:Record<string,unknown>;
    try{content=await request.json();}catch{return response({error:"صيغة الطلب غير صحيحة"},400);}
    const task=String(content.task||"").trim();
    if(task.length<10||task.length>1400)return response({error:"اكتب مهمة بين 10 و1400 حرف"},400);
    const start=new Date(Date.now()-24*60*60*1000).toISOString();
    const {count,error:countError}=await database.from("deela_agent_dispatches")
      .select("id",{head:true,count:"exact"}).eq("owner_id",user.id)
      .gte("created_at",start);
    if(countError)return response({error:"تعذر فحص حدود تشغيل الوكيل"},503);
    if((count||0)>=5)return response({error:"وصلت إلى حد 5 مهام خلال 24 ساعة لحماية موارد GitHub المجانية"},429);
    const {data:record,error:insertError}=await database.from("deela_agent_dispatches")
      .insert({owner_id:user.id,result_status:"requested"}).select("id").single();
    if(insertError||!record)return response({error:"تعذر تسجيل المهمة"},503);

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let result:Response;
    try {
      result=await fetch(endpoint,{
        method:"POST",signal:controller.signal,
        headers:{"Authorization":"Bearer "+githubKey,"Accept":"application/vnd.github+json",
          "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},
        body:JSON.stringify({ref:"main",inputs:{task}})
      });
    }catch{
      await database.from("deela_agent_dispatches").update({result_status:"failed"}).eq("id",record.id);
      return response({error:"تعذر الاتصال بخدمة تشغيل GitHub؛ لم نؤكد بدء المهمة"},502);
    }finally{clearTimeout(timeout);}
    if(result.status===204){
      await database.from("deela_agent_dispatches").update({result_status:"queued"}).eq("id",record.id);
      return response({queued:true,runs_url:runsUrl,
        message:"تم إرسال الأمر إلى GitHub Actions. يمكنك فتح صفحة التنفيذ لمراجعة النتيجة وطلب سحب التعديلات."});
    }
    await database.from("deela_agent_dispatches").update({result_status:"failed"}).eq("id",record.id);
    if(result.status===401||result.status===403)
      return response({code:"github_auth",error:"مفتاح GitHub يحتاج صلاحية Actions: Read and write على مستودع DEELA-V2.",runs_url:runsUrl},503);
    if(result.status===404)
      return response({code:"github_missing",error:"تعذر العثور على مسار وكيل ديلا في GitHub. تأكد من اختيار مستودع DEELA-V2.",runs_url:runsUrl},503);
    return response({error:"تعذر بدء مهمة GitHub (رمز "+result.status+"). يمكنك تشغيلها يدويًا.",runs_url:runsUrl},502);
  }catch(e){
    console.error("deela-owner-agent",e instanceof Error?e.name:"unknown");
    return response({error:"تعذر معالجة أمر وكيل ديلا"},500);
  }
});
