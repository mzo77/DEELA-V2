import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const projectUrl=Deno.env.get("SUPABASE_URL")||"";
const adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(projectUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
const responseHeaders={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const answer=(data:Record<string,unknown>,status=200)=>new Response(JSON.stringify(data),{status,headers:responseHeaders});
const allowedModel=/^[a-zA-Z0-9._-]{1,70}$/;
const modelName=()=>{const selected=Deno.env.get("DEELA_AI_MODEL")||"gpt-5.6-luna";return allowedModel.test(selected)?selected:"gpt-5.6-luna";};

Deno.serve(async(req:Request)=>{
  if(req.method!=="GET"&&req.method!=="POST") return answer({error:"طريقة الطلب غير مدعومة"},405);
  const url=new URL(req.url);
  const path=url.pathname.replace(/\\/g,"/");
  if(!path.endsWith("/deela-owner-ai")&&!path.endsWith("/deela-owner-ai/status")&&!path.endsWith("/deela-owner-ai/generate"))return answer({error:"مسار غير معروف"},404);
  const token=(req.headers.get("Authorization")||"").match(/^Bearer (.+)$/)?.[1];
  if(!token)return answer({error:"يجب تسجيل الدخول كمالك"},401);
  try{
    // The client never receives the privileged service key or OpenAI API secret.
    const {data:{user},error:authError}=await admin.auth.getUser(token);
    if(authError||!user)return answer({error:"انتهت الجلسة، سجل الدخول من جديد"},401);
    const {data:profile,error:roleError}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(roleError||profile?.role!=="owner")return answer({error:"هذه الأدوات لحساب المالك فقط"},403);
    const configured=Boolean(Deno.env.get("OPENAI_API_KEY"));
    if(req.method==="GET")return answer({ready:configured,model:modelName(),daily_limit:20,requires_secret:!configured});
    if(!path.endsWith("/generate"))return answer({error:"المسار غير مخصص للإرسال"},404);
    if(!configured)return answer({error:"مفتاح الذكاء الاصطناعي غير مهيأ في Supabase: أضف OPENAI_API_KEY إلى Edge Function Secrets. اشتراك ChatGPT لا يتضمن تلقائيًا رصيد OpenAI API.",code:"ai_unconfigured"},503);
    const length=Number(req.headers.get("content-length")||"0");
    if(length>10000)return answer({error:"الطلب كبير جدًا، الحد الأقصى 5000 حرف"},413);
    let body:Record<string,unknown>={};
    try{body=await req.json();}catch{return answer({error:"صيغة البيانات غير صحيحة"},400);}
    const prompt=String(body.prompt||"").trim();
    const language=String(body.language||"").slice(0,45);
    const mode=String(body.mode||"").slice(0,50);
    if(prompt.length<3||prompt.length>5000)return answer({error:"اكتب طلبًا واضحًا لا يتجاوز 5000 حرف"},400);
    const after=new Date(Date.now()-24*60*60*1000).toISOString();
    const {count:daily,error:countError}=await admin.from("deela_ai_usage").select("id",{count:"exact",head:true}).eq("owner_id",user.id).gte("created_at",after);
    if(countError)return answer({error:"تعذر التحقق من حدود الاستخدام، أعد المحاولة لاحقًا"},503);
    if((daily||0)>=20)return answer({error:"وصلت إلى حد 20 طلب ذكاء اصطناعي خلال 24 ساعة لحماية الرصيد"},429);
    const {error:saveError}=await admin.from("deela_ai_usage").insert({owner_id:user.id,model:modelName(),prompt_chars:prompt.length});
    if(saveError)return answer({error:"تعذر تسجيل عملية الاستخدام"},503);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),52_000);
    let provider:Response;
    try {
      provider=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{"Authorization":"Bearer "+Deno.env.get("OPENAI_API_KEY"),"Content-Type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify({
          model:modelName(),store:false,max_output_tokens:2400,
          instructions:"أنت مساعد عربي متخصص في هندسة البرمجيات داخل لوحة أدوات ديلا للمالك. قدّم حلولًا دقيقة قابلة للتطبيق، أمثلة شيفرة عند الحاجة، وخطوات اختبار. امتنع عن الادعاء بأن الشيفرة نُفّذت. لا تطلب أسرارًا أو مفاتيح. هذه الخدمة ليست بيئة تنفيذ أو وصول إلى ملفات المستخدم.",
          input:"المهمة: "+mode+"\\nالتقنية: "+language+"\\nطلب المالك:\\n"+prompt
        })
      });
    }catch(e){return answer({error:e instanceof DOMException&&e.name==="AbortError"?"استغرق الرد وقتًا طويلًا، حاول بطلب أقصر":"تعذر الاتصال بمزوّد الذكاء الاصطناعي"},504)}
    finally{clearTimeout(timer);}
    if(!provider.ok){
      const status=provider.status;
      let reason="";
      try {
        const responseBody=await provider.json();
        const errorCode=responseBody?.error?.code??responseBody?.error?.type??"";
        reason=typeof errorCode==="string"?errorCode.slice(0,90):"";
      } catch { /* Never expose provider error text or secrets. */ }
      let message="";
      if(status===429){
        if(["credit_balance_exhausted","insufficient_quota"].includes(reason)) {
          message="رصيد OpenAI API غير متاح أو نفد. افتح إعدادات Billing في OpenAI Platform وراجع الرصيد والفوترة. اشتراك ChatGPT منفصل.";
        } else if(["organization_spend_limit_exceeded","project_spend_limit_exceeded"].includes(reason)) {
          message="وصلت إلى حد الإنفاق الذي حددته للمشروع أو المؤسسة. راجع Limits في OpenAI Platform.";
        } else if(reason==="organization_usage_limit_exceeded") {
          message="بلغت الحد المعتمد لاستخدام API. راجع Limits في OpenAI Platform.";
        } else if(reason==="rate_limit_exceeded") {
          message="طلبات OpenAI كثيرة في وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
        } else {
          message="رفض OpenAI الطلب برمز 429. راجع رصيد API وحدود الإنفاق وسرعة الطلبات في OpenAI Platform.";
        }
      } else if(status===401||status===403) {
        message="مفتاح OpenAI API غير صالح أو صلاحياته لا تسمح باستخدام الخدمة.";
      } else if(status===404) {
        message="النموذج غير متاح لمشروعك. راجع DEELA_AI_MODEL أو صلاحيات النموذج.";
      } else if(status===400) {
        message="رفض OpenAI إعداد النموذج أو صيغة الطلب؛ راجع إعدادات الخادم.";
      } else {
        message="تعذر تنفيذ طلب OpenAI API (رمز "+status+").";
      }
      return answer({error:message,provider_status:status,provider_code:reason||"unknown"},status===429?429:502);
    }
    const result=await provider.json();
    const output=String(result.output_text||((result.output||[]).flatMap((x:any)=>(x.content||[]).filter((c:any)=>c.type==="output_text").map((c:any)=>c.text)).join("\\n"))||"").trim();
    if(!output)return answer({error:"لم يُرجع المزوّد نصًا. جرّب سؤالًا أقصر."},502);
    return answer({output:output.slice(0,20000),model:modelName(),remaining:Math.max(0,19-(daily||0))});
  }catch(e){console.error("deela-owner-ai",e instanceof Error?e.name:"error");return answer({error:"تعذر إكمال طلب الذكاء الاصطناعي"},500);}
});
