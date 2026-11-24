# تشغيل PentAGI وربطه بـ DEELA من جوال أندرويد فقط

**24 نوفمبر 2026 — دليل واقعي ومجانـي من ناحية الاشتراك.**

> لا تحتاج كمبيوترًا شخصيًا؛ الهاتف يتحكم في خادم سحابي. PentAGI لا يُشغَّل داخل Supabase Edge Functions أو Termux بشكل مضمون، لأنه يحتاج Docker Compose وعزل حاويات. لا يمكن جعل نظام فحص قوي يعمل 24/7 بلا أي موارد حوسبة. لا تفحص إلا أنظمة تملكها أو لديك تصريح صريح.

## المسار المناسب للتشغيل المستمر: Oracle Cloud Always Free

المصدر الرسمي: https://www.oracle.com/sa/cloud/free/

1. افتح صفحة التسجيل بمتصفح Android واطلب وضع سطح المكتب إذا لزم. تُطلب بطاقة بنكية وهاتف للتحقق غالبًا، وليست هذه الخدمة بدون تحقق أو مضمونة التوفر. لا تضف أي خدمة مدفوعة ولا تُرقِّ الحساب دون مراجعة الأسعار.
2. بعد نجاح إنشاء حساب Free Tier، أنشئ **Compute instance** بخيار **Always Free Eligible**: `VM.Standard.A1.Flex`، **2 OCPU و12GB RAM إجمالًا**. اختر صورة **Ubuntu Linux ARM64** واستفد من التخزين المجاني في حدود حسابك، مع مساحة 25GB حرة على الأقل. إذا لم تتوفر قدرة A1 في منطقتك، لا يعني ذلك وجود بديل مجاني مكافئ مضمون.
3. أنشئ مفتاح SSH في Termux وخزّن المفتاح الخاص على جوالك، ولا تشاركه في الدردشة أو GitHub:
   ```bash
   pkg update && pkg install openssh
   ssh-keygen -t ed25519 -f ~/.ssh/deela_oracle_a1
   cat ~/.ssh/deela_oracle_a1.pub
   ```
   انسخ **المفتاح العام فقط** إلى إعداد إنشاء الخادم. بعد حصولك على IP الخادم:
   ```bash
   ssh -i ~/.ssh/deela_oracle_a1 ubuntu@YOUR_SERVER_IP
   ```
   `YOUR_SERVER_IP` عنوانك الحقيقي الظاهر في Oracle، لا تكتب النص كما هو.
4. على **الخادم**، ثبّت Docker Engine وCompose من [دليل Docker الرسمي](https://docs.docker.com/engine/install/ubuntu/)، وتأكد من `docker version` و`docker compose version`. لا تنفذ أوامر Docker على Termux؛ هو مجرد وسيلة اتصال SSH بالخادم.
5. ثبّت PentAGI وفق [الدليل الرسمي](https://pentagi.com/docs/getting-started/quickstart/) الذي يدعم Linux ARM64:
   ```bash
   mkdir -p ~/pentagi && cd ~/pentagi
   uname -sm | sed -e 's,Linux ,linux/,' -e 's,Darwin ,darwin/,' -e s/x86_64/amd64/ -e s/aarch64/arm64/ | xargs -I PLATFORM curl -fLo installer.zip https://pentagi.com/downloads/PLATFORM/installer-latest.zip
   unzip -o installer.zip
   sudo ./installer
   ```
   اقرأ تحذيرات المُثبّت وأكد هوية المصدر قبل التنفيذ. استخدم أحدث إصدار أمني؛ لا تُعطِ وكلاء الفحص وصولًا إلى Docker host خارج الضوابط الرسمية.
6. في معالج الإعداد اختر Ollama كموفر. تشغيل نموذج محلي ضخم على 12GB غير واقعي؛ لتجربة ذات جودة أفضل يمكن البحث في **Ollama Cloud Free** ضمن حدوده وبحسب التوافق مع مزوّد PentAGI. الاستضافة المجانية للنموذج محدودة، وليست بديلًا مضمونًا لذكاء مدفوع بلا قيود.
7. أول تشغيل يربط واجهة PentAGI افتراضيًا بـ localhost:8443. **لا تفتح منافذ Docker التشغيلية 28000–29999 للعامة**. استخدم SSH port forwarding لفتح الواجهة من هاتفك أو اتصال VPN موثوق. غيّر كلمة مرور حساب PentAGI الافتراضي قبل أي نشر. تجنب تعريض منفذ Docker API أو خادم Ollama إلى الإنترنت.
8. الربط بـ DEELA يتطلب **واجهة HTTPS عامة موثوقة ومحمية** يمكن لخدمة Supabase الوصول إليها. الوصول عبر SSH Tunnel للهاتف وحده لا يكفي لربط Supabase. بعد إعداد اسم نطاق وشهادة صالحة وبوابة وصول مناسبة، أنشئ رمزًا من **PentAGI > Settings > API Tokens**. ثم اضبط أسرار مشروع Supabase `rxlynynjetajtsqlhkrq`:
   - `DEELA_PENTAGI_URL`: عنوان HTTPS الموثوق لخادم PentAGI
   - `DEELA_PENTAGI_TOKEN`: رمز Bearer من PentAGI (لا يخرج للواجهة)
   - `DEELA_PENTAGI_SCOPE_URL`: نطاق **مملوك لك ومصرح بفحصه** يبدأ بـ https://
   - `DEELA_PENTAGI_PROVIDER`: اختياري، مثل `ollama` إذا كان مضبوطًا في PentAGI
9. افتح **DEELA > مركز الذكاء 🤖 > فحص الاتصال**. لا ترسل أمرًا قبل ظهور حالة متصل. اختر هدفًا تجريبيًا صغيرًا ومصرحًا به، ثم راجع سجل التدفقات والتقارير.

## المسار التجريبي بدون بطاقة: GitHub Codespaces

- افتح https://github.com/vxcontrol/pentagi من كروم Android واختر **Code > Codespaces > Create codespace** (قد يختلف العرض وفق حسابك). يتيح الحساب الشخصي المجاني حصة شهرية، لكن تنفد مع الاستخدام، والتخزين محدود.
- في Terminal افحص Docker والموارد قبل تنزيل الصور الكبيرة:
  ```bash
  docker version
  docker compose version
  free -h
  df -h .
  ```
- تحتاج PentAGI إلى **2 vCPU و4GB RAM و25GB من المساحة الخالية** على الأقل. إذا لم تتحقق الشروط لا تُكمل. راجع دليل PentAGI أعلاه.
- **هذه تجربة فقط**: Codespaces يتوقف عند الخمول (30 دقيقة افتراضيًا) ولا يستضيف دائمًا. أبقِ منافذ PentAGI خاصة، ولا تحوّل منفذًا إلى `public` لمجرد أن Supabase يحتاجه؛ منافذ العامل 28000-29999 تتطلب قيود شبكة. لا تعتبر الرابط المؤقت ربطًا دائمًا مع DEELA.
- استخدام نموذج Ollama محلي على 2-core Codespace قد يكون بطيئًا جدًا؛ Ollama Cloud Free محدود حسب الحصة، ولذا لا نَعِد بنفس جودة نموذج تجاري كبير.

## ما جرى تحضيره في DEELA

- الموقع: https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control — تبويب **مركز الذكاء 🤖** منشور بالفعل.
- خدمة API الخاصة بالمالك: `deela-owner-agent` في Supabase، تطلب JWT المالك وتُبقي مفتاح PentAGI خارج تطبيق Android.
- تطبيق المالك 0.9.10: كود الشاشة في `feature/deela-pentagi-0910`، طلب مراجعة https://github.com/mzo77/DEELA-V2/pull/5، **لم يُدمج ولم ينشر APK نهائيًا**.
- قبل وجود خادم PentAGI ورموزه سيظهر الزر غير متصل. هذا سلوك مقصود، وليس نجاحًا زائفًا.
- الملفات المذكورة في مربع الأوامر ليست mounted تلقائيًا؛ استخدم أداة رفع الملفات في تطبيق المالك أو ميزة إدارة ملفات PentAGI مع صلاحيات واضحة.

## مراجع رسمية

- https://pentagi.com/docs/getting-started/quickstart/
- https://pentagi.com/docs/api/overview/
- https://pentagi.com/docs/configuration/security/
- https://pentagi.com/docs/configuration/llm-providers/
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces
- https://ollama.com/pricing
