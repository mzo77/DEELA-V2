export function simulate(body:Record<string,unknown>){
  // Pure local rules: NO connections to Snapchat or any external account.
  const platform=String(body.platform||"deela-demo");
  const username=String(body.test_username||"").trim();
  if(!["deela-demo","snapchat-demo"].includes(platform))return {error:"اختر بيئة تجريبية من الخيارات المحددة."};
  if(!/^test_[a-zA-Z0-9_]{3,32}$/.test(username))return {error:"اسم الحساب التجريبي يجب أن يبدأ بـ test_ ثم 3 إلى 32 حرفًا إنجليزيًا أو رقمًا."};
  const mfa=body.mfa_enabled===true;
  const throttle=body.rate_limit_enabled===true;
  const lockout=body.lockout_enabled===true;
  const maxAttempts=5;
  const events=[
    "تشغيل محاكاة محلية لحساب افتراضي؛ لم تُرسل أي طلبات إلى "+(platform==="snapchat-demo"?"Snapchat":"DEELA")+".",
    throttle?"بعد المحاولات المتكررة: نظام تحديد المعدل يمنع الطلبات الزائدة (افتراض إعداد صحيح).":"لا توجد سياسة تحديد معدل في السيناريو؛ قد يزيد خطر التخمين.",
    lockout?"قفل الحساب التجريبي بعد "+maxAttempts+" محاولات فاشلة (افتراض إعداد صحيح).":"السيناريو لا يفرض قفلًا بعد المحاولات الفاشلة.",
    mfa?"اختبار قرار المصادقة: تُرفض الجلسة دون عامل تحقق ثانٍ صحيح.":"السيناريو لا يطلب عامل تحقق ثانٍ.",
  ];
  const recommendations=[
    ...(!throttle?["فعّل تحديد معدل المحاولات عند تسجيل الدخول."]:[]),
    ...(!lockout?["فعّل قفلًا مؤقتًا متدرجًا مع إشعارات للمستخدم."]:[]),
    ...(!mfa?["فعّل المصادقة متعددة العوامل في الحساب التجريبي ونظامك."]:[]),
    "لا تستخدم أسماء مستخدمين حقيقية أو كلمات مرور أو رموز تحقق في هذا المختبر.",
  ];
  return {ok:true,kind:"synthetic_auth_simulation",real_requests:0,attacks_executed:0,
    platform,username,attempts_simulated:maxAttempts,
    checks:{password_guessing_protection:throttle&&lockout?"simulated_protected":"simulated_needs_improvement",
            two_factor:mfa?"simulated_required":"simulated_disabled"},
    events,recommendations,
    notice:"النتائج افتراضية طبقًا للخيارات المحددة؛ لا تحقق فعليًا من أمان Snapchat أو DEELA ولا تسترجع كلمات مرور."};
}
