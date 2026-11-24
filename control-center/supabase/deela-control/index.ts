import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"",ANON=Deno.env.get("SUPABASE_ANON_KEY")||"",SECRET=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const guest=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(SUPABASE_URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});
const RECOVERY_PAGE="<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <meta name=\"referrer\" content=\"no-referrer\">\n  <title>ديلا | استعادة كلمة المرور</title>\n  <style>\n    :root{color-scheme:dark}\n    *{box-sizing:border-box}\n    body{background:#0b080d;color:#fff;font:16px/1.7 system-ui,Tahoma,Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}\n    main{width:min(100%,470px);padding:28px;background:#201018;border:1px solid #763046;border-radius:20px;box-shadow:0 10px 36px #0008}\n    h1{color:#ff315e;margin:0 0 8px;text-align:center;font-size:30px}\n    h2{font-size:21px;margin:0 0 12px}\n    p{margin:8px 0 16px;color:#e8cad4}\n    input,button{box-sizing:border-box;width:100%;font:inherit;border-radius:11px;padding:13px;margin:8px 0}\n    input{background:#110b10;color:white;border:1px solid #945469}\n    button{background:#ff2857;color:white;border:0;font-weight:bold;cursor:pointer}\n    button:disabled{opacity:.65;cursor:wait}\n    #msg{min-height:28px;white-space:pre-wrap}\n    .muted{color:#cbaeb9;font-size:13px}\n    [hidden]{display:none!important}\n  </style>\n</head>\n<body>\n<main>\n  <h1>تطبيقات ديلا ❤️</h1>\n  <section id=\"reset-panel\">\n    <h2>تعيين كلمة مرور جديدة</h2>\n    <p>أدخل كلمة المرور الجديدة ثم اضغط «حفظ». لن تختفي هذه الصفحة تلقائيًا أثناء الكتابة.</p>\n    <form id=\"reset-form\">\n      <label for=\"password\">كلمة المرور الجديدة</label>\n      <input id=\"password\" name=\"new-password\" type=\"password\" autocomplete=\"new-password\" minlength=\"12\" maxlength=\"128\" required placeholder=\"12 حرفًا على الأقل\">\n      <label for=\"confirm\">تأكيد كلمة المرور</label>\n      <input id=\"confirm\" name=\"confirm-password\" type=\"password\" autocomplete=\"new-password\" minlength=\"12\" maxlength=\"128\" required>\n      <button id=\"save\" type=\"submit\">حفظ كلمة المرور</button>\n    </form>\n    <p class=\"muted\">الرابط آمن ويُستخدم لمرة واحدة. لا تشاركه مع أي شخص.</p>\n  </section>\n  <section id=\"new-link-panel\" hidden>\n    <h2>طلب رابط استعادة جديد</h2>\n    <p>إذا انتهت صلاحية الرابط، اطلب رابطًا جديدًا وافتح أحدث رسالة وصلتك.</p>\n    <form id=\"new-link-form\">\n      <label for=\"email\">البريد الإلكتروني المسجّل في ديلا</label>\n      <input id=\"email\" name=\"email\" type=\"email\" autocomplete=\"email\" maxlength=\"254\" required>\n      <button id=\"send-link\" type=\"submit\">إرسال رابط جديد</button>\n    </form>\n  </section>\n  <p id=\"msg\" role=\"status\" aria-live=\"polite\"></p>\n</main>\n<script>\n(() => {\n  'use strict';\n  const base = 'https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control';\n  const qs = new URLSearchParams(location.search);\n  const hs = new URLSearchParams(location.hash.slice(1));\n  const tokenHash = qs.get('token_hash') || '';\n  const accessToken = hs.get('access_token') || '';\n  const type = qs.get('type') || hs.get('type') || 'recovery';\n  const callbackError = qs.get('error_description') || hs.get('error_description') || '';\n  const hasProof = (!!tokenHash && tokenHash.length >= 10) || (!!accessToken && accessToken.length >= 10);\n  const form = document.getElementById('reset-form');\n  const resetPanel = document.getElementById('reset-panel');\n  const newLinkPanel = document.getElementById('new-link-panel');\n  const msg = document.getElementById('msg');\n  const save = document.getElementById('save');\n  const show = (s) => { msg.textContent = s; };\n  const requestLink = () => { resetPanel.hidden = true; newLinkPanel.hidden = false; };\n  // Do NOT remove the fragment or query token on page load.\n  // In-app browsers can reload or reopen pages when switching apps.\n  // Keep the proof available until an actual successful password change.\n  if (!hasProof || type !== 'recovery' || callbackError) {\n    requestLink();\n    show(callbackError ? 'تعذر استخدام رابط الاستعادة. اطلب رسالة جديدة وافتح أحدث رابط.' :\n      'الرابط غير مكتمل أو انتهت صلاحيته. يمكنك طلب رسالة جديدة.');\n  }\n  form.addEventListener('submit', async event => {\n    event.preventDefault();\n    const password = document.getElementById('password').value;\n    const confirmation = document.getElementById('confirm').value;\n    if (password !== confirmation) { show('كلمتا المرور غير متطابقتين.'); return; }\n    if (password.length < 12 || password.length > 128) { show('كلمة المرور يجب أن تتكون من 12 إلى 128 حرفًا.'); return; }\n    save.disabled = true;\n    show('جارٍ تغيير كلمة المرور...');\n    try {\n      const response = await fetch(base + '/api/v1/auth/reset', {\n        method: 'POST',\n        headers: {'Content-Type': 'application/json'},\n        cache: 'no-store',\n        body: JSON.stringify({token_hash: tokenHash, recovery_access_token: accessToken, password})\n      });\n      const body = await response.json();\n      if (!response.ok) {\n        if (response.status === 401) {\n          requestLink();\n          show('انتهت صلاحية رمز الاستعادة أو استُخدم من قبل. اطلب أحدث رسالة وأعد المحاولة.');\n          return;\n        }\n        show(body.error || 'تعذر حفظ كلمة المرور. حاول مرة أخرى دون إغلاق الصفحة.');\n        return;\n      }\n      resetPanel.hidden = true;\n      newLinkPanel.hidden = true;\n      // Erase the one-time proof only after the server confirms success.\n      history.replaceState(null, '', location.pathname);\n      show('تم تغيير كلمة المرور بنجاح ✅ افتح تطبيق ديلا وسجّل دخولك بكلمة المرور الجديدة.');\n    } catch (_) {\n      show('تعذر الاتصال الآن. كلمة المرور لم تتغير. حاول مجددًا والصفحة ما زالت مفتوحة.');\n    } finally {\n      save.disabled = false;\n    }\n  });\n  document.getElementById('new-link-form').addEventListener('submit', async event => {\n    event.preventDefault();\n    const address = document.getElementById('email').value.trim();\n    const btn = document.getElementById('send-link');\n    btn.disabled = true;\n    show('جارٍ طلب رسالة جديدة...');\n    try {\n      const response = await fetch(base + '/api/v1/auth/recover', {\n        method: 'POST',headers: {'Content-Type':'application/json'},cache:'no-store',\n        body: JSON.stringify({email: address})\n      });\n      const body = await response.json();\n      if (response.status === 429) {\n        show('طلبات الاستعادة كثيرة حاليًا. انتظر قليلًا قبل المحاولة مجددًا.');\n      } else if (!response.ok) {\n        show(body.error || 'تعذر إرسال رابط الاستعادة حاليًا.');\n      } else {\n        show('إذا كان البريد مسجّلًا، ستصلك رسالة الاستعادة. افتح أحدث رسالة، وتحقق من البريد غير المرغوب فيه أيضًا.');\n      }\n    } catch (_) {\n      show('تعذر الاتصال. حاول مرة أخرى لاحقًا.');\n    } finally {\n      btn.disabled = false;\n    }\n  });\n})();\n</script>\n</body></html>";
const PAGE="<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>ديلا | مركز التحكم</title><style>\n:root{color-scheme:dark;--hot:#ff234f;--fg:#fff1f4;--bg:#050507}*{box-sizing:border-box}body{background:radial-gradient(ellipse at 80% 0%,#300e1a,transparent 45%),var(--bg);color:var(--fg);font-family:system-ui,Tahoma,sans-serif;margin:0}header{padding:20px;background:#190e16;border-bottom:1px solid #61293a;display:flex;align-items:center;justify-content:space-between}h1{font-size:26px}h2{font-size:19px}main{max-width:1000px;padding:16px;margin:18px auto}.card{padding:22px;border:1px solid #5a2a39;border-radius:18px;background:#191117;margin-bottom:17px}.login{max-width:470px;margin:6vh auto}input,button{font:inherit;border-radius:10px;padding:12px}input{width:100%;background:#0b090c;border:1px solid #743246;color:var(--fg);margin:5px 0 13px}button{background:var(--hot);color:white;border:0;cursor:pointer;font-weight:700}button.secondary{background:#37202b;border:1px solid #743246}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row input{flex:1;min-width:0}.muted,small{color:#c7abb3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric{font-size:32px;color:#ff7696;font-weight:900}nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}nav button{background:#3d1b29}nav button.active{background:var(--hot)}.hidden{display:none!important}table{border-collapse:collapse;width:100%;min-width:650px}td,th{padding:12px;border-bottom:1px solid #5e2a3b;text-align:right;font-size:13px}td button{padding:8px;margin:2px}.scroll{overflow-x:auto}a{color:#ffb0c4}.note{padding:14px;border-right:3px solid var(--hot);background:#26111c;border-radius:8px}#msg{padding:12px;background:#471b2a;border-radius:10px;margin-bottom:12px;display:none}@media(max-width:600px){main{padding:10px}.card{padding:16px}}\n\n/* DEELA platform-separated subscriber cards (mobile first) */\n:root{--owner-soft:#ba688f;--line-soft:#6b3f58}button:disabled{opacity:.55;cursor:not-allowed}\n.member-platforms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:19px 0 15px}.platform-tab{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;min-width:0;padding:12px 6px;color:#ead8e1;background:#281822;border:1px solid #6f3c53;border-radius:12px;font-size:14px}.platform-tab.active{background:#6b3656;border-color:#d98cb7;color:white}.platform-count{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;background:#160f19;border-radius:99px;font-weight:800;font-size:12px}\n.member-toolbar{display:grid;grid-template-columns:1fr minmax(125px,185px);gap:12px;margin-bottom:9px}.search-label,.months-label{display:block;min-width:0;font-size:13px;color:#dbc7d3;font-weight:650}.member-toolbar input,.member-toolbar select,.invite-row input{display:block;width:100%;margin:5px 0 0;border-radius:11px;padding:12px;min-height:45px;font-size:14px;color:#fff1f4;background:#0c090e;border:1px solid #75465f}.member-toolbar select{color-scheme:dark}.invite-row{align-items:end;margin-bottom:12px}.invite-row .search-label{flex:1;min-width:180px}.invite-row button{min-height:45px;background:#79425f}.invite-row button.secondary{background:#33232f}\n.member-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:15px}.member-card{min-width:0;padding:17px;border:1px solid var(--line-soft);border-radius:17px;background:linear-gradient(160deg,#261a26,#15121b);box-shadow:0 9px 30px #0002}.member-top{display:flex;align-items:start;justify-content:space-between;gap:9px;margin-bottom:12px}.member-label{display:inline-flex;align-items:center;border-radius:99px;padding:4px 10px;font-size:12px;background:#372842;color:#ead3f5;border:1px solid #785a91}.member-label.ios{background:#2d2948;border-color:#7765a7;color:#e1d9ff}.member-label.android{background:#24362e;border-color:#426950;color:#bbefd1}.member-status{font-size:12px;font-weight:800;border-radius:99px;padding:4px 9px;white-space:nowrap;border:1px solid #67735d;background:#273529;color:#c6e6bc}.member-status.stopped{background:#38232c;border-color:#855466;color:#ffd0dc}.member-status.expired{background:#302a2a;border-color:#755e59;color:#e7c7bf}\n.member-email{font-size:15px;font-weight:800;overflow-wrap:anywhere;word-break:break-word;margin:4px 0 12px;line-height:1.6}.member-info{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:#cbb6c3}.member-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.member-actions button{min-width:0;background:#653a58;border:1px solid #865973;padding:10px 7px;font-size:12px;border-radius:10px;line-height:1.6}.member-actions button.trial-action{background:#40334d;border-color:#76638a}.member-actions button.danger-action{background:#492632;border-color:#845163}.member-actions button:disabled{opacity:.4}.member-empty{grid-column:1/-1;padding:26px 15px;border:1px dashed #684355;border-radius:14px;text-align:center;color:#cbb2c0;line-height:1.8}#memberSummary{margin:10px 0 0;font-size:13px}body{overflow-x:hidden}\n@media(max-width:640px){main{width:100%;padding:10px;max-width:100%}.member-cards{grid-template-columns:1fr}.member-platforms{gap:5px}.platform-tab{font-size:12px;padding:11px 3px}.member-toolbar{grid-template-columns:1fr 122px;gap:8px}.member-card{padding:15px}.card{padding:14px}.invite-row{gap:8px}.invite-row button{flex:1}.invite-row .search-label{flex-basis:100%}}\n@media(max-width:350px){.member-toolbar{grid-template-columns:1fr}.member-platforms{grid-template-columns:1fr 1fr}.member-platforms .platform-tab:last-child{grid-column:1/-1}}\n.owner-catalog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:10px;margin:14px 0}\n.owner-app-card{background:#211823;border:1px solid #6b3f58;border-radius:14px;padding:13px;min-width:0}\n.owner-app-card.hidden-app{border-style:dashed;opacity:.8}.owner-app-card h3{font-size:15px;margin:0 0 5px;overflow-wrap:anywhere}\n.owner-app-card p{margin:0 0 10px;color:#c3adbb;font-size:12px}\n.owner-app-buttons{display:flex;gap:6px;flex-wrap:wrap}.owner-app-buttons button{font-size:12px;padding:9px}\n#catalogRefresh,#catalogMore{align-self:end;min-height:44px;margin-bottom:1px}\n@media(max-width:550px){#catalogPlatformTabs{grid-template-columns:1fr 1fr}#catalogApps{grid-template-columns:1fr}#catalogRefresh{width:100%}}\n\n.apple-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;align-items:end;margin:12px 0 20px}\n.apple-form label{font-size:13px;color:#dbc7d3;display:block;font-weight:650}\n.apple-form input,.apple-form select{display:block;width:100%;padding:12px;border-radius:10px;color:#fff;background:#100c12;border:1px solid #764c66;margin-top:6px;min-height:45px}\n.apple-form button{min-height:46px}.apple-certificate-grid,.apple-device-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}\n.apple-certificate,.apple-device{padding:15px;border:1px solid #70485e;background:#211723;border-radius:15px;min-width:0}\n.apple-certificate h4,.apple-device h4{margin:0 0 8px}.apple-certificate p,.apple-device p{color:#dbc7d3;font-size:13px;margin:5px 0;overflow-wrap:anywhere}\n#apple code{display:inline-block;padding:5px 8px;background:#121016;color:#e7cced;border-radius:7px;font-size:11px;margin:4px 2px;word-break:break-all}\n@media(max-width:600px){.apple-form{grid-template-columns:1fr}.apple-certificate-grid,.apple-device-grid{grid-template-columns:1fr}}\n</style></head><body><header><strong>✦ تطبيقات ديلا <span style=\"color:#ff234f\">👑</span></strong><button id=\"logout\" class=\"secondary hidden\">تسجيل الخروج</button></header><main><div id=\"msg\"></div>\n<section id=\"login\" class=\"card login\"><h1>تسجيل دخول المالك</h1><p class=\"muted\">بعد تسجيل الدخول يمكنك اختيار اسم المستخدم وتغيير كلمة المرور.</p><form id=\"lf\">\n<label>اسم المستخدم أو البريد الإلكتروني<input name=\"username\" id=\"loginName\" autocomplete=\"username\" required></label>\n<label>كلمة المرور</label><div class=\"row\"><input id=\"loginPass\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required><button id=\"eye\" class=\"secondary\" type=\"button\" aria-label=\"إظهار كلمة المرور\">👁</button></div>\n<label><input id=\"remember\" type=\"checkbox\" style=\"width:20px\"> تذكر اسم المستخدم</label>\n<p><button id=\"loginBtn\" type=\"submit\">دخول لوحة المالك</button></p><small>حفظ كلمة المرور وتعبئتها تلقائيًا يتم عبر مدير كلمات المرور في هاتفك، وليس في تخزين الموقع.</small></form></section>\n<section id=\"app\" class=\"hidden\"><h1>مركز تحكم المالك</h1><nav><button class=\"active\" data-tab=\"home\">الرئيسية</button><button data-tab=\"members\">الاشتراكات</button><button data-tab=\"apps\">إدارة التطبيقات</button><button data-tab=\"apple\">شهادات Apple</button><button data-tab=\"power\">قوة غاشمة ⚡</button><button data-tab=\"account\">الحساب والأمان</button></nav>\n<div id=\"home\" class=\"tab\"><div class=\"grid\"><div class=\"card\"><small>مكتبة تطبيقات الآيفون</small><p class=\"metric\" id=\"iosLibraryCount\">—</p><p class=\"muted\">Accretion · مكتبة مستقلة عن أندرويد</p><a href=\"https://mzo77.github.io/DEELA-V2/ios/\" target=\"_blank\" rel=\"noopener noreferrer\">فتح متجر الآيفون والمكتبة</a></div><div class=\"card\"><small>إجمالي المستخدمين</small><p class=\"metric\" id=\"total\">—</p></div><div class=\"card\"><small>اشتراكات فعالة</small><p class=\"metric\" id=\"active\">—</p></div><div class=\"card\"><small>اشتراكات موقوفة</small><p class=\"metric\" id=\"suspended\">—</p></div></div><div class=\"note\">المالك يتحكم بالتجربة المجانية لمدة 24 ساعة وتجديد الاشتراكات وإلغائها. لا يمكن للمشترك دخول المتجر باشتراك منتهٍ.</div><div class=\"card\"><h2>آخر العمليات</h2><div id=\"logs\"></div></div></div>\n<div id=\"members\" class=\"tab hidden\">\n <section class=\"card\">\n  <h2>إدارة المشتركين</h2>\n  <p class=\"muted\">لوحة واحدة لآيفون وأندرويد. اختر المنصة لعرض حساباتها وتجديد اشتراكاتها وإيقافها. حساب المالك منفصل عن المشتركين.</p>\n  <div class=\"member-platforms\" role=\"group\" aria-label=\"اختيار منصة المشتركين\">\n   <button type=\"button\" class=\"platform-tab active\" data-platform-filter=\"ios\" aria-pressed=\"true\">◉ الآيفون <span id=\"iosCount\" class=\"platform-count\">0</span></button>\n   <button type=\"button\" class=\"platform-tab\" data-platform-filter=\"android\" aria-pressed=\"false\">▣ أندرويد <span id=\"androidCount\" class=\"platform-count\">0</span></button>\n   <button type=\"button\" class=\"platform-tab\" data-platform-filter=\"all\" aria-pressed=\"false\">الكل <span id=\"allCount\" class=\"platform-count\">0</span></button>\n  </div>\n  <div class=\"member-toolbar\">\n   <label class=\"search-label\" for=\"memberSearch\">البحث عن مشترك<input id=\"memberSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"اكتب البريد أو الاسم...\"></label>\n   <label class=\"months-label\" for=\"renewMonths\">مدة التجديد<select id=\"renewMonths\"><option value=\"1\">شهر واحد</option><option value=\"2\">شهران</option><option value=\"3\">3 أشهر</option><option value=\"6\">6 أشهر</option><option value=\"12\">سنة</option></select></label>\n  </div>\n  <div class=\"row invite-row\">\n   <label class=\"search-label\" for=\"inviteEmail\">دعوة مشترك بالبريد<input type=\"email\" id=\"inviteEmail\" autocomplete=\"off\" placeholder=\"البريد الإلكتروني للمشترك\"></label>\n   <button type=\"button\" id=\"invite\">إرسال دعوة</button><button type=\"button\" id=\"reload\" class=\"secondary\">تحديث البيانات</button>\n  </div>\n  <p id=\"memberSummary\" class=\"muted\" aria-live=\"polite\">جارٍ عرض المشتركين...</p>\n  <div id=\"memberCards\" class=\"member-cards\" aria-live=\"polite\"></div>\n </section>\n</div>\n<div id=\"apps\" class=\"tab hidden\">\n <div class=\"card\">\n  <h2>إدارة تطبيقات المتجر</h2>\n  <p class=\"muted\">لوحة واحدة للمالك. إخفاء تطبيقات أندرويد مستقل عن الآيفون؛ والإخفاء لا يحذف الملفات.</p>\n  <div class=\"member-platforms\" id=\"catalogPlatformTabs\">\n   <button type=\"button\" class=\"platform-tab active\" data-catalog-platform=\"android\">▣ تطبيقات أندرويد</button>\n   <button type=\"button\" class=\"platform-tab\" data-catalog-platform=\"ios\">◉ تطبيقات الآيفون</button>\n  </div>\n  <div class=\"member-toolbar\">\n   <label class=\"search-label\" for=\"catalogSearch\">بحث باسم التطبيق أو المعرف\n    <input id=\"catalogSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"ابحث في التطبيقات...\">\n   </label>\n   <button type=\"button\" id=\"catalogRefresh\" class=\"secondary\">تحديث القائمة</button>\n  </div>\n  <p id=\"catalogStatus\" class=\"muted\" role=\"status\">اختر النظام لعرض التطبيقات.</p>\n  <div id=\"catalogApps\" class=\"owner-catalog-grid\"></div>\n  <button type=\"button\" id=\"catalogMore\" class=\"secondary hidden\">عرض المزيد</button>\n </div>\n</div>\n<div id=\"power\" class=\"tab hidden\"><div class=\"card\"><h2>⚡ قوة غاشمة — خاص بالمالك</h2><p class=\"muted\">نقلت تنظيم أدوات مركز الأوامر من مشروعك الأول. الوصول للروابط يعمل الآن؛ تشغيل أدوات المختبر المحلية كاملة يحتاج نقلها في مرحلة مستقلة.</p><div class=\"grid\"><div class=\"card\"><h3>⌘ دليل الأوامر</h3><a href=\"https://github.com/mzo77/DEELA-APPS/blob/main/app/src/main/assets/index.html\" target=\"_blank\" rel=\"noopener\">فتح الكود القديم</a></div><div class=\"card\"><h3>⌨ مختبر البرمجة</h3><a href=\"https://github.com/mzo77/DEELA-APPS\" target=\"_blank\" rel=\"noopener\">المشروع الأول</a></div><div class=\"card\"><h3>⚙ أدوات المطور</h3><a href=\"https://github.com/mzo77/DEELA-V2/actions\" target=\"_blank\" rel=\"noopener\">بناء تطبيقات ديلا</a></div><div class=\"card\"><h3>🎮 مختبر ملفات الألعاب</h3><a href=\"https://github.com/mzo77/DEELA-APPS\" target=\"_blank\" rel=\"noopener\">المصدر الأصلي</a></div><div class=\"card\"><h3>◇ مركز الأمان</h3><a href=\"https://supabase.com/dashboard/project/rxlynynjetajtsqlhkrq\" target=\"_blank\" rel=\"noopener\">إعدادات الخادم</a></div></div></div></div>\n\n<div id=\"apple\" class=\"tab hidden\">\n <section class=\"card\">\n  <h2>شهادات Apple وتفعيل أجهزة المشتركين</h2>\n  <p class=\"muted\">إنشاء سجل شهادة، حفظ ملفات P12 وmobileprovision في مساحة خاصة، وربط UDID بالمشترك. لا تتحول حالة الجهاز إلى «مسجل لدى Apple» إلا بعد نجاح طلب Apple الرسمي. توقيع وتثبيت IPA يحتاجان إعدادًا منفصلًا.</p>\n  <div class=\"note\">تنبيه: Ad Hoc مخصص للتطوير والاختبار على أجهزة مسجلة، وليس توزيعًا تجاريًا غير محدود. حد Apple هو 100 جهاز آيفون لكل سنة عضوية، وليس 100 جهاز جديد لكل شهادة. خدمة Enterprise ليست للمشتركين الخارجيين.</div>\n  <p id=\"appleApiStatus\" class=\"muted\" role=\"status\">جارٍ فحص ربط Apple...</p>\n  <h3>1. إضافة شهادة أو مزود توقيع</h3>\n  <form id=\"appleCertificateForm\" class=\"apple-form\">\n   <label>اسم الشهادة أو المجموعة<input name=\"title\" required minlength=\"2\" maxlength=\"100\" placeholder=\"شهادة ديلا الأولى\"></label>\n   <label>النوع<select name=\"method\" id=\"appleMethod\"><option value=\"ad_hoc\">حساب Apple Developer — Ad Hoc</option><option value=\"licensed_provider\">مزود توقيع مرخّص (بدون ربط تلقائي حتى توفير API)</option></select></label>\n   <label>اسم المزود<input name=\"provider_name\" maxlength=\"100\" value=\"Apple Developer\" placeholder=\"Apple Developer\"></label>\n   <label>Team ID من Apple<input name=\"team_id\" id=\"appleTeamId\" maxlength=\"32\" autocomplete=\"off\" placeholder=\"AB12CD34EF\"></label>\n   <label>رقم الشهادة (اختياري)<input name=\"certificate_serial\" maxlength=\"120\" autocomplete=\"off\" placeholder=\"Serial / Certificate ID\"></label>\n   <label>تاريخ انتهاء الشهادة (اختياري)<input name=\"certificate_expires_at\" type=\"date\"></label>\n   <label>عدد الأجهزة المحلي (1–100)<input name=\"device_limit\" type=\"number\" min=\"1\" max=\"100\" value=\"100\"></label>\n   <button type=\"submit\">حفظ الشهادة</button>\n  </form>\n  <div id=\"appleCertificates\" class=\"apple-certificate-grid\"></div>\n </section>\n <section class=\"card\">\n  <h3>2. إدارة ملفات الشهادة الخاصة</h3>\n  <p class=\"muted\">يمكنك رفع P12 وملف mobileprovision إلى مساحة تخزين خاصة؛ لا يظهر محتواهما ولا رابط تحميلهما للمشتركين. لا تُدخل كلمة مرور P12 هنا؛ ستُطلب لاحقًا في خطوة توقيع آمنة عند توفير محرك توقيع.</p>\n  <form id=\"appleFileForm\" class=\"apple-form\">\n    <label>الشهادة<select id=\"appleFileGroup\" required></select></label>\n    <label>نوع الملف<select id=\"appleFileType\"><option value=\"p12\">شهادة .p12</option><option value=\"profile\">ملف توزيع .mobileprovision</option></select></label>\n    <label>الملف<input type=\"file\" id=\"appleFile\" accept=\".p12,.mobileprovision\" required></label>\n    <button type=\"submit\">رفع الملف بصورة خاصة</button>\n  </form>\n </section>\n <section class=\"card\">\n  <h3>3. إضافة جهاز مشترك إلى شهادة</h3>\n  <form id=\"appleDeviceForm\" class=\"apple-form\">\n    <label>الشهادة<select id=\"appleDeviceGroup\" required></select></label>\n    <label>المشترك (آيفون فقط)<select id=\"appleSubscriber\" required></select></label>\n    <label>اسم الجهاز<input id=\"appleDeviceName\" maxlength=\"100\" placeholder=\"iPhone 16 Pro\" required></label>\n    <label>UDID الخاص بالجهاز<input id=\"appleDeviceUdid\" maxlength=\"45\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"00008110-0012345678901234\" required></label>\n    <button type=\"submit\">إضافة إلى قائمة الأجهزة</button>\n  </form>\n  <p class=\"muted\">بعد الإضافة تظهر حالة «بانتظار التسجيل». عندما تجهّز مفتاح App Store Connect API في أسرار Supabase يمكن إرسال تسجيل الجهاز إلى Apple من زر منفصل؛ ويشترط اشتراك آيفون ساريًا.</p>\n  <div id=\"appleDevices\" class=\"apple-device-grid\"></div>\n </section>\n <section class=\"card\">\n  <h3>4. تجهيز التفعيل الفعلي</h3>\n  <p>لتشغيل تسجيل الأجهزة مباشرة باستخدام حساب Apple Developer الخاص بك، أضف في <a href=\"https://supabase.com/dashboard/project/rxlynynjetajtsqlhkrq/functions\" target=\"_blank\" rel=\"noopener\">Supabase Edge Functions → Secrets</a> ثلاثة أسرار خادم فقط:</p>\n  <code>DEELA_APPLE_ISSUER_ID</code> · <code>DEELA_APPLE_KEY_ID</code> · <code>DEELA_APPLE_API_PRIVATE_KEY_P8</code>\n  <p class=\"muted\">هذه مفاتيح واجهة App Store Connect API، وليست كلمة مرور حساب Apple. لا ترسل ملف .p8 أو كلمة مرور Apple في دردشة ولا تضعها في كود GitHub أو صفحات الويب.</p>\n  <p class=\"muted\">نجاح تسجيل UDID لا يثبت صلاحية ملف mobileprovision أو توقيع IPA أو تثبيته. ستظل هذه العمليات غير مفعّلة إلى أن يتوفر توقيع صحيح وتوزيع مسموح به.</p>\n </section>\n</div>\n<div id=\"account\" class=\"tab hidden\"><div class=\"card\"><h2>اسم المستخدم الخاص بك</h2><form id=\"uf\"><label>اختر اسم المستخدم<input id=\"newUsername\" autocomplete=\"off\" minlength=\"3\" maxlength=\"32\" pattern=\"[A-Za-z][A-Za-z0-9_.-]{2,31}\" placeholder=\"Mzo\" required></label><button>حفظ اسم المستخدم</button></form></div>\n<div class=\"card\"><h2>تغيير كلمة المرور</h2><form id=\"pf\"><label>كلمة المرور الحالية<input type=\"password\" autocomplete=\"current-password\" id=\"current\" required></label><label>كلمة مرور جديدة (12 رمزًا على الأقل)<input type=\"password\" autocomplete=\"new-password\" id=\"next\" minlength=\"12\" required></label><button>تغيير كلمة المرور</button></form></div></div></section></main>\n<script>\n(function(){'use strict';const $=id=>document.getElementById(id),base='https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-control';let token=sessionStorage.getItem('deela-token')||'',membersCache=[],platformFilter='ios',memberBusy=false;\nfunction say(s){$('msg').textContent=s;$('msg').style.display='block'}function go(tab){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hidden',x.id!==tab));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));if(tab==='apps'&&token)loadOwnerApps(true).catch(e=>say(e.message));if(tab==='apple'&&token)loadApplePanel().catch(e=>say(e.message));}\nasync function call(path,method,body){let r=await fetch(base+path,{method:method||'GET',cache:'no-store',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined}),j=await r.json();if(!r.ok)throw Error(j.error||'تعذرت العملية');return j}\nfunction authed(){ $('login').classList.add('hidden');$('app').classList.remove('hidden');$('logout').classList.remove('hidden')}\nfunction out(){token='';sessionStorage.removeItem('deela-token');$('app').classList.add('hidden');$('login').classList.remove('hidden');$('logout').classList.add('hidden');$('loginPass').value=''}\n\nfunction date(s){if(!s)return '—';const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('ar-SA'):'—'}\nfunction element(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e}\nfunction infoRow(card,label,value){const row=element('div','member-info');row.append(element('span','',label),element('strong','',value));card.append(row)}\nfunction statusOf(m){if(m.suspended)return {label:'موقوف',cls:'stopped'};if(m.active)return {label:'ساري',cls:''};return {label:m.ends_at?'منتهي':'غير مفعّل',cls:'expired'}}\nfunction filteredMembers(){\n const q=$('memberSearch').value.trim().toLocaleLowerCase();\n return membersCache.filter(m=>\n  (platformFilter==='all'||m.platform===platformFilter)&&\n  (!q||[m.email,m.display_name,m.id].some(v=>String(v||'').toLocaleLowerCase().includes(q)))\n );\n}\nfunction renderMembers(){\n const subscribers=membersCache;\n $('iosCount').textContent=subscribers.filter(m=>m.platform==='ios').length;\n $('androidCount').textContent=subscribers.filter(m=>m.platform==='android').length;\n $('allCount').textContent=subscribers.length;\n document.querySelectorAll('[data-platform-filter]').forEach(b=>{\n  const chosen=b.dataset.platformFilter===platformFilter;\n  b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));\n });\n const cards=$('memberCards');cards.replaceChildren();\n const matches=filteredMembers();\n const label=platformFilter==='ios'?'الآيفون':platformFilter==='android'?'الأندرويد':'جميع المنصات';\n $('memberSummary').textContent=matches.length+' مشترك في '+label+' · حساب المالك غير مدرج';\n if(!matches.length){cards.append(element('div','member-empty','لا توجد حسابات مطابقة في هذا القسم. جرّب البحث أو اختر منصة أخرى.'));return}\n for(const m of matches){\n  const card=element('article','member-card');\n  const top=element('div','member-top');\n  top.append(element('span','member-label '+(m.platform==='ios'?'ios':'android'),m.platform==='ios'?'◉ آيفون · iOS':'▣ أندرويد · Android'));\n  const status=statusOf(m);top.append(element('span','member-status '+status.cls,status.label));card.append(top);\n  card.append(element('div','member-email',m.email||m.display_name||'مشترك'));\n  infoRow(card,'نهاية الاشتراك',date(m.ends_at));\n  const actions=element('div','member-actions');\n  const addAction=(label,action,className,disabled=false)=>{\n   const b=element('button',className,label);b.type='button';b.disabled=disabled||memberBusy;\n   b.addEventListener('click',()=>act(m,action));actions.append(b);\n  };\n  addAction('تجربة 24 ساعة','trial','trial-action');\n  addAction('تجديد الاشتراك','renew','');\n  addAction(m.suspended?'استئناف':'إيقاف',m.suspended?'resume':'suspend','',!m.ends_at);\n  addAction('إلغاء الاشتراك','revoke','danger-action',!m.ends_at);\n  card.append(actions);cards.append(card);\n }\n}\nasync function load(){\n const data=await call('/api/owner/dashboard');\n authed();\n $('total').textContent=data.members.length;\n $('active').textContent=data.members.filter(x=>x.active).length;\n $('suspended').textContent=data.members.filter(x=>x.suspended).length;\n $('newUsername').value=data.owner.username||'';\n const logs=$('logs');logs.replaceChildren();\n for(const x of data.audit){const p=document.createElement('p');p.textContent=date(x.created_at)+' · '+x.action;logs.append(p)}\n membersCache=data.members.filter(m=>m.role!=='owner').map(m=>({...m,platform:m.platform==='ios'?'ios':'android'}));\n renderMembers();\n}\nasync function act(m,action){\n if(memberBusy)return;\n const months=Number($('renewMonths').value);\n const label=action==='trial'?'تفعيل تجربة مجانية لمدة 24 ساعة':\n  action==='renew'?'تجديد الاشتراك لمدة '+months+' شهر':\n  action==='suspend'?'إيقاف اشتراك المشترك':\n  action==='resume'?'استئناف اشتراك المشترك':'إلغاء اشتراك المشترك';\n if(!confirm(label+' على '+(m.platform==='ios'?'الآيفون':'الأندرويد')+' للحساب '+(m.email||m.id)+'؟'))return;\n memberBusy=true;renderMembers();\n try{\n  await call('/api/owner/subscription','POST',{\n   user_id:m.id,action,platform:m.platform,months:action==='renew'?months:undefined\n  });\n  say('تم تنفيذ الإجراء بنجاح.');\n  await load();\n }catch(e){say(e.message)}\n finally{memberBusy=false;renderMembers()}\n}\n\nlet appPlatform='android',appOffset=0,appCache=[],appHasMore=false,appBusy=false;\nasync function appApi(path,method='GET',payload=null){\n const baseUrl=appPlatform==='ios'?'https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web':base;\n const res=await fetch(baseUrl+path,{method,cache:'no-store',headers:{\n  'Authorization':'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})\n },body:payload?JSON.stringify(payload):undefined});\n let result={};try{result=await res.json()}catch{}\n if(!res.ok)throw Error(result.error||'تعذر الوصول إلى قائمة التطبيقات');\n return result;\n}\nfunction renderOwnerApps(){\n const box=$('catalogApps');box.replaceChildren();\n const frag=document.createDocumentFragment();\n for(const app of appCache){\n  const card=element('article','owner-app-card'+(app.is_hidden?' hidden-app':''));\n  card.append(element('h3','',app.title||'تطبيق'));\n  card.append(element('p','',String(app.category||'')+' · '+(app.is_hidden?'مخفي عن المشتركين':'ظاهر للمشتركين')));\n  const buttons=element('div','owner-app-buttons');\n  const toggle=element('button',app.is_hidden?'secondary':'',app.is_hidden?'إظهار':'إخفاء');\n  toggle.type='button';toggle.disabled=appBusy;\n  toggle.onclick=async()=>{\n   if(appBusy)return;\n   appBusy=true;toggle.disabled=true;\n   try{\n    const payload={catalog_key:app.catalog_key,is_hidden:!app.is_hidden};\n    if(appPlatform==='ios')payload.is_featured=Boolean(app.is_featured);\n    await appApi(appPlatform==='ios'?'/api/owner/catalog-rules':'/api/owner/android-catalog','POST',payload);\n    app.is_hidden=!app.is_hidden;\n    renderOwnerApps();say('تم تحديث التطبيق: '+app.title);\n   }catch(e){say(e.message);toggle.disabled=false}\n   finally{appBusy=false;renderOwnerApps()}\n  };\n  buttons.append(toggle);\n  if(appPlatform==='ios'){\n   const feature=element('button','secondary',app.is_featured?'إلغاء التمييز':'تمييز');\n   feature.type='button';\n   feature.onclick=async()=>{\n    if(appBusy)return;appBusy=true;feature.disabled=true;\n    try{\n      await appApi('/api/owner/catalog-rules','POST',{catalog_key:app.catalog_key,is_hidden:Boolean(app.is_hidden),is_featured:!app.is_featured});\n      app.is_featured=!app.is_featured;renderOwnerApps();say('تم تعديل تمييز '+app.title);\n    }catch(e){say(e.message);feature.disabled=false}finally{appBusy=false;renderOwnerApps()}\n   };\n   buttons.append(feature);\n  }\n  card.append(buttons);frag.append(card);\n }\n box.append(frag);\n if(!appCache.length)box.append(element('div','member-empty','لا توجد تطبيقات مطابقة.'));\n $('catalogMore').classList.toggle('hidden',!appHasMore);\n $('catalogStatus').textContent=appCache.length.toLocaleString('ar-SA')+' تطبيق ظاهر في الإدارة · '+(appPlatform==='ios'?'آيفون':'أندرويد');\n}\nasync function loadOwnerApps(reset=false){\n if(appBusy)return;\n appBusy=true;\n if(reset){appOffset=0;appCache=[];$('catalogApps').replaceChildren()}\n $('catalogStatus').textContent='جارٍ جلب تطبيقات '+(appPlatform==='ios'?'الآيفون':'أندرويد')+'...';\n try{\n  const query=$('catalogSearch').value.trim();\n  const url=appPlatform==='ios'?'/api/source?id=0&page='+(Math.floor(appOffset/40)+1)+'&limit=40&q='+encodeURIComponent(query):\n   '/api/owner/android-catalog?offset='+appOffset+'&limit=40&q='+encodeURIComponent(query);\n  const r=await appApi(url);\n  appCache=reset?(r.apps||[]):appCache.concat(r.apps||[]);\n  appHasMore=Boolean(r.has_more);renderOwnerApps();\n }catch(e){$('catalogStatus').textContent=e.message;throw e}\n finally{appBusy=false}\n}\ndocument.querySelectorAll('[data-catalog-platform]').forEach(b=>b.onclick=()=>{\n appPlatform=b.dataset.catalogPlatform;appOffset=0;appCache=[];$('catalogSearch').value='';\n document.querySelectorAll('[data-catalog-platform]').forEach(x=>x.classList.toggle('active',x===b));\n loadOwnerApps(true).catch(e=>say(e.message));\n});\nlet catalogSearchDebounce=null;\n$('catalogSearch').oninput=()=>{clearTimeout(catalogSearchDebounce);catalogSearchDebounce=setTimeout(()=>loadOwnerApps(true).catch(e=>say(e.message)),300)};\n$('catalogRefresh').onclick=()=>loadOwnerApps(true).catch(e=>say(e.message));\n$('catalogMore').onclick=()=>{appOffset+=40;loadOwnerApps().catch(e=>say(e.message))};\n\n\nlet appleGroups=[],appleDevices=[],appleApiConnected=false,appleBusy=false;\nfunction appleSelectItems(id,first){\n const node=$(id),saved=node.value;node.replaceChildren();\n const empty=element('option','',first);empty.value='';node.append(empty);\n for(const g of appleGroups){const option=element('option','',g.title+' · '+(g.method==='ad_hoc'?'Apple':'مزود'));option.value=g.id;node.append(option)}\n if(appleGroups.some(g=>g.id===saved))node.value=saved;\n}\nfunction appleUserList(){\n const target=$('appleSubscriber'),saved=target.value;target.replaceChildren();\n const empty=element('option','','اختر حساب آيفون');empty.value='';target.append(empty);\n for(const member of membersCache.filter(m=>m.platform==='ios')){\n  const option=element('option','',member.email||member.display_name||member.id);\n  option.value=member.id;target.append(option);\n }\n if(membersCache.some(m=>m.id===saved&&m.platform==='ios'))target.value=saved;\n}\nfunction renderApplePanel(){\n $('appleApiStatus').textContent=appleApiConnected?\n  'اتصال Apple API مهيأ على الخادم. التسجيل الحقيقي يتم عند طلبك وبشرط قبول Apple.' :\n  'مفاتيح Apple API غير موصولة بعد؛ يمكنك الآن إضافة الشهادات والمشتركين وملفاتهم، وستبقى حالة الجهاز بانتظار التسجيل.';\n appleSelectItems('appleFileGroup','اختر الشهادة');\n appleSelectItems('appleDeviceGroup','اختر الشهادة');\n appleUserList();\n const certs=$('appleCertificates');certs.replaceChildren();\n for(const g of appleGroups){\n  const count=appleDevices.filter(d=>d.signing_group_id===g.id).length;\n  const registered=appleDevices.filter(d=>d.signing_group_id===g.id&&d.state==='apple_registered').length;\n  const card=element('article','apple-certificate');\n  card.append(element('h4','',g.title));\n  card.append(element('p','',g.method==='ad_hoc'?'Apple Developer — Ad Hoc':'مزود توقيع خارجي'));\n  card.append(element('p','','المزود: '+g.provider_name+' · Team: '+(g.team_id||'غير محدد')));\n  card.append(element('p','','أجهزة مضافة: '+count+'/'+g.device_limit+' · أكدتها Apple: '+registered));\n  card.append(element('p','','P12: '+(g.has_p12?'محفوظة بصورة خاصة':'لم تُرفع')+' · ملف التوزيع: '+(g.has_profile?'مرفوع غير متحقق':'لم يُرفع')));\n  card.append(element('p','','انتهاء الصلاحية: '+date(g.certificate_expires_at)));\n  const choose=element('button','secondary','استخدام هذه الشهادة');\n  choose.onclick=()=>{$('appleFileGroup').value=g.id;$('appleDeviceGroup').value=g.id;document.getElementById('appleDeviceForm').scrollIntoView({behavior:'smooth',block:'start'})};\n  card.append(choose);certs.append(card);\n }\n if(!appleGroups.length)certs.append(element('div','member-empty','لم تُضف أي شهادة بعد. ابدأ بالنموذج أعلاه.'));\n const list=$('appleDevices');list.replaceChildren();\n for(const device of appleDevices){\n  const group=appleGroups.find(g=>g.id===device.signing_group_id);\n  const sub=membersCache.find(m=>m.id===device.user_id);\n  const card=element('article','apple-device');\n  const label=device.state==='apple_registered'?'مسجل لدى Apple (بدون توقيع IPA)':\n              device.state==='registration_failed'?'فشل التسجيل لدى Apple':'بانتظار Apple';\n  card.append(element('h4','',device.device_name));\n  card.append(element('p','',sub?.email||sub?.display_name||'مشترك '+device.user_id.slice(0,8)));\n  card.append(element('p','','الشهادة: '+(group?.title||'غير معروفة')));\n  card.append(element('p','','UDID: ••••'+String(device.udid||'').slice(-7)));\n  card.append(element('p','','الحالة: '+label));\n  if(device.last_error)card.append(element('p','',String(device.last_error).slice(0,120)));\n  if(device.state!=='apple_registered'&&group?.method==='ad_hoc'){\n   const action=element('button','secondary','تسجيل الجهاز في Apple');\n   action.type='button';action.disabled=appleBusy||!appleApiConnected;\n   action.onclick=async()=>{\n    if(!confirm('سيرسل UDID إلى Apple Developer باستخدام حسابك، وسيستهلك موضع جهاز من حد Apple السنوي إذا نجح. متابعة؟'))return;\n    action.disabled=true;\n    try{\n      const result=await call('/api/owner/apple/devices/register','POST',{enrollment_id:device.id});\n      if(result.state==='apple_registered'||result.already_registered)say('أكدت Apple تسجيل الجهاز. التوقيع والتثبيت لم يبدآ بعد.');\n      await loadApplePanel();\n    }catch(e){say(e.message);await loadApplePanel()}finally{action.disabled=false}\n   };\n   card.append(action);\n  }\n  list.append(card);\n }\n if(!appleDevices.length)list.append(element('div','member-empty','لم تضف أجهزة مشتركين بعد.'));\n}\nasync function loadApplePanel(){\n const result=await call('/api/owner/apple/certificates');\n appleGroups=result.certificates||[];appleDevices=result.devices||[];\n appleApiConnected=Boolean(result.apple_api_configured);\n renderApplePanel();\n}\n$('appleCertificateForm').onsubmit=async event=>{\n event.preventDefault();if(appleBusy)return;\n const form=event.currentTarget,b=new FormData(form);\n const data={title:b.get('title'),method:b.get('method'),provider_name:b.get('provider_name'),\n  team_id:b.get('team_id'),certificate_serial:b.get('certificate_serial'),\n  certificate_expires_at:b.get('certificate_expires_at'),device_limit:Number(b.get('device_limit')||100)};\n appleBusy=true;\n try{\n  const saved=await call('/api/owner/apple/certificates','POST',data);\n  say('تم حفظ سجل الشهادة. لم يتم تفعيلها أو تسجيل أجهزة بها بعد.');\n  form.reset();await loadApplePanel();\n  $('appleFileGroup').value=saved.certificate.id;$('appleDeviceGroup').value=saved.certificate.id;\n }catch(e){say(e.message)}finally{appleBusy=false}\n};\n$('appleFileForm').onsubmit=async event=>{\n event.preventDefault();if(appleBusy)return;\n const group=$('appleFileGroup').value,kind=$('appleFileType').value,file=$('appleFile').files[0];\n if(!group||!file){say('اختر الشهادة والملف أولاً');return}\n if(file.size>4*1024*1024){say('الملف يتجاوز 4 ميجابايت');return}\n const payload=new FormData();payload.append('certificate_id',group);payload.append('kind',kind);payload.append('file',file,file.name);\n appleBusy=true;\n try{\n  const response=await fetch(base+'/api/owner/apple/certificates/file',{\n   method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token},body:payload\n  });\n  let data={};try{data=await response.json()}catch{}\n  if(!response.ok)throw Error(data.error||'فشل رفع الملف');\n  say('تم حفظ ملف الشهادة في تخزين خاص. لا يزال التحقق من صلاحيته والتوقيع غير منفذين.');\n  $('appleFile').value='';await loadApplePanel();\n }catch(e){say(e.message)}finally{appleBusy=false}\n};\n$('appleDeviceForm').onsubmit=async event=>{\n event.preventDefault();if(appleBusy)return;\n const payload={certificate_id:$('appleDeviceGroup').value,user_id:$('appleSubscriber').value,\n  device_name:$('appleDeviceName').value.trim(),udid:$('appleDeviceUdid').value.trim()};\n if(!/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{8}-[a-fA-F0-9]{16})$/.test(payload.udid)){\n  say('تحقق من UDID. يجب نقله من جهاز المشترك بدقة.');return;\n }\n appleBusy=true;\n try{\n  await call('/api/owner/apple/devices','POST',payload);\n  say('تمت إضافة جهاز المشترك للقائمة، وحالته الآن بانتظار التسجيل لدى Apple.');\n  $('appleDeviceName').value='';$('appleDeviceUdid').value='';\n  await loadApplePanel();\n }catch(e){say(e.message)}finally{appleBusy=false}\n};\n\n$('lf').onsubmit=async e=>{e.preventDefault();const b=$('loginBtn');b.disabled=true;try{const name=$('loginName').value.trim(),r=await call('/api/v1/auth/login','POST',{email:name,password:$('loginPass').value,platform:'android'});token=r.access_token;sessionStorage.setItem('deela-token',token);await load();if($('remember').checked)localStorage.setItem('deela-username',name);else localStorage.removeItem('deela-username');say('تم الدخول بحساب المالك')}catch(x){out();say(x.message)}finally{b.disabled=false}};\n$('eye').onclick=()=>{const p=$('loginPass');p.type=p.type==='password'?'text':'password';$('eye').setAttribute('aria-label',p.type==='text'?'إخفاء كلمة المرور':'إظهار كلمة المرور')};\n$('logout').onclick=out;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));\n$('reload').onclick=()=>load().catch(e=>say(e.message));\ndocument.querySelectorAll('[data-platform-filter]').forEach(b=>b.addEventListener('click',()=>{platformFilter=b.dataset.platformFilter;renderMembers()}));\n$('memberSearch').addEventListener('input',renderMembers);\n$('invite').onclick=async()=>{try{await call('/api/owner/invite','POST',{email:$('inviteEmail').value.trim()});say('تم إرسال الدعوة');await load()}catch(e){say(e.message)}};\n$('uf').onsubmit=async e=>{e.preventDefault();try{const x=await call('/api/owner/username','POST',{username:$('newUsername').value});say('تم اعتماد اسم المستخدم: '+x.username)}catch(x){say(x.message)}};\n$('pf').onsubmit=async e=>{e.preventDefault();try{await call('/api/owner/password','POST',{current_password:$('current').value,new_password:$('next').value});out();say('تم تغيير كلمة المرور، ادخل مجددًا.')}catch(x){say(x.message)}finally{$('current').value='';$('next').value=''}};\n// Read-only public aggregate count; never expose subscriber credentials or IPA download links.\nfetch(\"https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-ios-web/api/catalog-stats\",{cache:\"no-store\"})\n .then(r=>r.ok?r.json():Promise.reject(Error(\"stats\")))\n .then(data=>{const n=document.getElementById(\"iosLibraryCount\");if(n)n.textContent=Number(data.apps||0).toLocaleString(\"ar-SA\");})\n .catch(()=>{const n=document.getElementById(\"iosLibraryCount\");if(n)n.textContent=\"غير متاح\";});\nconst name=localStorage.getItem('deela-username');if(name){$('loginName').value=name;$('remember').checked=true}if(token)load().catch(()=>out());\n})();\n</script></body></html>";
const headers={"Content-Type":"application/json;charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Authorization,Content-Type,apikey","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};
const j=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fail=(text:string,status=400)=>j({error:text},status);
async function who(req:Request){const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))return null;const t=h.slice(7);const {data:{user},error}=await guest.auth.getUser(t);if(error||!user)return null;const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();return {id:user.id,email:user.email||"",role:p?.role||"subscriber"};}
async function member(u:{id:string,role:string},platform="android"){if(u.role==="owner")return {active:true,expires_at_epoch:4102444800};const {data:s}=await admin.from("subscriptions").select("ends_at,suspended,platform").eq("user_id",u.id).maybeSingle();const expiry=s?.ends_at?Date.parse(s.ends_at):0;const active=!!s&&!s.suspended&&expiry>Date.now()&&(!s.platform||s.platform===platform);return {active,expires_at_epoch:active?Math.floor(expiry/1000):0};}
async function log(actor:string,action:string,target?:string){const {error}=await admin.from("deela_control_audit").insert({actor_id:actor,action,target_user_id:target||null});if(error)console.error("audit failed",error.message)}
async function dashboard(owner:{id:string,email:string}){const [profiles,subs,audits,alias,list]=await Promise.all([admin.from("profiles").select("id,role,display_name").limit(500),admin.from("subscriptions").select("user_id,ends_at,suspended,platform").limit(500),admin.from("deela_control_audit").select("action,created_at").order("created_at",{ascending:false}).limit(40),admin.from("deela_admin_usernames").select("username").eq("user_id",owner.id).maybeSingle(),admin.auth.admin.listUsers({page:1,perPage:500})]);if(profiles.error||subs.error)throw Error("dashboard data load failed");const map=new Map((subs.data||[]).map(s=>[s.user_id,s]));const emails=new Map((list.data?.users||[]).map(u=>[u.id,u.email||""]));const iosRequests=new Set((list.data?.users||[]).filter(u=>u.user_metadata?.requested_platform==="ios").map(u=>u.id));const {data:pending,error:pendingError}=await admin.from("deela_subscription_requests").select("id,user_id,months,platform,created_at").eq("status","pending").order("created_at",{ascending:false}).limit(200);if(pendingError)throw pendingError;return {requests:(pending||[]).map(r=>({...r,email:emails.get(r.user_id)||""})),owner:{username:alias.data?.username||"",email:owner.email},members:(profiles.data||[]).map(p=>{const s=map.get(p.id);return {id:p.id,email:emails.get(p.id)||"",display_name:p.display_name,role:p.role,platform:s?.platform||(iosRequests.has(p.id)?"ios":"android"),ends_at:s?.ends_at||null,suspended:s?.suspended||false,active:p.role==="owner"||!!s&&!s.suspended&&Date.parse(s.ends_at)>Date.now()}}),audit:audits.data||[]};}

const SCAN_SOURCES=new Set(["LITEAPKS","NINEMOD","FIVEPLAY","GETMODSAPK","AN1","APKVISION"]);
function parts(v:string):number[] {const m=v.match(/\d+(?:\.\d+)+/);return m?m[0].split(".").map(n=>Number(n)):[];}
function newerVersion(current:string,next:string):boolean {
 const a=parts(current),b=parts(next);if(!a.length||!b.length)return false;
 for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return y>x;}
 return false;
}
async function pendingSourceCount():Promise<number> {
 const {count,error}=await admin.from("deela_source_inventory").select("source",{count:"exact",head:true}).not("pending_version","is",null);
 if(error)throw error;return count||0;
}


type DeelaMailStatus="sent"|"pending"|"failed"|"unconfigured";
function escapeDeelaMail(x:unknown):string{
 return String(x??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
}
function localDeelaDate(value:string):string {
 return new Intl.DateTimeFormat("ar-SA-u-ca-gregory",{
  timeZone:"Asia/Riyadh",year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"
 }).format(new Date(value));
}
async function sendDeelaActivationEmail(requestId:string):Promise<DeelaMailStatus>{
 const {data:entry,error}=await admin.from("deela_subscription_email_outbox").select("*").eq("request_id",requestId).maybeSingle();
 if(error||!entry){console.error("Subscription mail record unavailable",error?.code);return "failed";}
 if(entry.delivery_status==="sent")return "sent";
 const token=Deno.env.get("RESEND_API_KEY")||"";
 const from=Deno.env.get("DEELA_EMAIL_FROM")||"";
 if(!token||!from){
  await admin.from("deela_subscription_email_outbox").update({delivery_status:"unconfigured",
   last_error_code:"email_provider_not_configured",updated_at:new Date().toISOString()}).eq("request_id",requestId);
  return "unconfigured";
 }
 const user=await admin.auth.admin.getUserById(entry.user_id);
 const email=user.data.user?.email||"";
 if(user.error||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
  await admin.from("deela_subscription_email_outbox").update({delivery_status:"failed",
   last_error_code:"no_valid_recipient",updated_at:new Date().toISOString()}).eq("request_id",requestId);
  return "failed";
 }
 const start=localDeelaDate(entry.starts_at),end=localDeelaDate(entry.ends_at);
 const duration=entry.months===12?"سنة واحدة":entry.months===1?"شهر واحد":entry.months+" أشهر";
 const number=requestId.slice(0,8).toUpperCase();
 const support=(Deno.env.get("DEELA_SUPPORT_EMAIL")||"").trim();
 const details=[
  "تم تفعيل اشتراكك في تطبيقات ديلا ❤️",
  "الحالة: اشتراك فعّال","المدة: "+duration,
  "تاريخ بداية الاشتراك (توقيت السعودية): "+start,
  "تاريخ نهاية الاشتراك (توقيت السعودية): "+end,
  "رقم مرجع التفعيل: "+number,
  "حساب الدخول: "+email,
  "للدخول افتح تطبيق ديلا وسجّل باستخدام البريد الإلكتروني وكلمة المرور التي اخترتها أثناء التسجيل.",
  "إذا لم يتم تأكيد بريدك الإلكتروني بعد، أكمل التحقق أولاً لتسجيل الدخول.",
  "هذه الرسالة لتأكيد الاشتراك فقط وليست إيصال دفع.",
  ...(support?["للمساعدة: "+support]:[]),
  "لا تشارك كلمة المرور أو رموز التحقق مع أي شخص."
 ];
 const safe=(x:string)=>escapeDeelaMail(x);
 const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
 <body style="margin:0;background:#0a080b;font-family:Tahoma,Arial,sans-serif;color:#fce8ed">
 <div style="max-width:540px;margin:24px auto;background:#170f15;border:1px solid #693047;border-radius:20px;padding:28px">
 <div style="text-align:center;color:#ff315e;font-size:27px;font-weight:bold">تطبيقات ديلا ❤️</div>
 <h2 style="text-align:center;color:#fff">تم تفعيل اشتراكك بنجاح ✅</h2>
 <p style="line-height:1.9;color:#f6dce3">أهلاً بك في متجر ديلا! نؤكد لك تفعيل اشتراكك كما يلي:</p>
 <table style="width:100%;border-collapse:collapse;color:#fff">
 ${[["حالة الاشتراك","فعّال"],["مدة الاشتراك",duration],["بداية الاشتراك",start],
  ["نهاية الاشتراك",end],["الرقم المرجعي",number],["حساب الدخول",email]]
  .map(([a,b])=>`<tr><td style="padding:11px;border-bottom:1px solid #422935;color:#e1b8c3">${safe(a)}</td>
  <td style="padding:11px;border-bottom:1px solid #422935">${safe(b)}</td></tr>`).join("")}
 </table><p style="line-height:1.9">افتح تطبيق ديلا وسجّل الدخول بحسابك وكلمة المرور التي اخترتها. إذا لم تؤكد بريدك الإلكتروني، أكمل التحقق أولاً.</p>
 ${support?`<p style="line-height:1.9">الدعم: ${safe(support)}</p>`:""}
 <p style="color:#bcaab1;font-size:12px">هذه رسالة تأكيد للاشتراك وليست إيصال دفع. لا تشارك كلمة المرور أو رموز التحقق.</p>
 </div></body></html>`;
 let status:DeelaMailStatus="failed",lastError="provider_error",providerId:string|null=null;
 try{
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",signal:AbortSignal.timeout(15000),
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json",
    "Idempotency-Key":"deela-activation-"+requestId},
   body:JSON.stringify({from,to:[email],subject:"تأكيد تفعيل اشتراكك في تطبيقات ديلا ❤️",
    html,text:details.join("\n")})
  });
  if(response.ok){
   const result=await response.json();providerId=String(result.id||"")||null;status="sent";lastError="";
  }else{
   lastError="provider_http_"+response.status;
   console.error("DEELA activation email rejected",response.status);
  }
 }catch(e){
  lastError="provider_unreachable";
  console.error("DEELA activation email failed",e instanceof Error?e.name:"unknown");
 }
 const {error:saveError}=await admin.from("deela_subscription_email_outbox")
  .update({delivery_status:status,provider_message_id:providerId,
   last_error_code:lastError||null,attempts:(entry.attempts||0)+1,
   sent_at:status==="sent"?new Date().toISOString():null,
   updated_at:new Date().toISOString()}).eq("request_id",requestId);
 if(saveError)console.error("Email status save failed",saveError.code);
 return status;
}

Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
const pathname=new URL(req.url).pathname,pivot=pathname.indexOf("/deela-control");const path=pivot<0?"":pathname.slice(pivot+14).replace(/\/$/,"");
if(req.method==="GET"&&(path===""||path==="/"))return new Response(PAGE,{headers:{...headers,"Content-Type":"text/html;charset=utf-8","Content-Security-Policy":"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';connect-src 'self';img-src data:;frame-ancestors 'none';base-uri 'none'"}});
if(req.method==="GET"&&path==="/recover")return new Response(RECOVERY_PAGE,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store, no-cache, max-age=0","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
if(req.method==="GET"&&path==="/health")return j({ok:true,service:"DEELA Control Center"});
try{
if(req.method==="POST"&&path==="/api/v1/auth/recover"){const b=await req.json();const email=String(b.email||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail("أدخل بريدًا إلكترونيًا صحيحًا");const {error}=await guest.auth.resetPasswordForEmail(email,{redirectTo:SUPABASE_URL+"/functions/v1/deela-control/recover"});if(error){console.error("Password recovery email failed",error.code||error.status);if(error.status===429||error.code==="over_email_send_rate_limit")return fail("تم تجاوز حد رسائل الاستعادة مؤقتًا. حاول لاحقًا.",429);if(error.status>=500)return fail("تعذر إرسال رسالة الاستعادة حاليًا. حاول لاحقًا.",503);}return j({ok:true,message:"إذا كان البريد مسجلًا فستصلك رسالة استعادة كلمة المرور."});}
if(req.method==="POST"&&path==="/api/v1/auth/reset"){const b=await req.json(),tokenHash=String(b.token_hash||""),password=String(b.password||"");if(password.length<12||password.length>128||(!String(b.recovery_access_token||"") && tokenHash.length<10)||tokenHash.length>512)return fail("رابط الاستعادة غير صالح أو كلمة المرور قصيرة",400);const recoveryToken=String(b.recovery_access_token||"");let verifiedUser=null;if(recoveryToken){const {data:checked,error:checkError}=await guest.auth.getUser(recoveryToken);if(!checkError)verifiedUser=checked.user;}const {data,error}=verifiedUser?{data:{user:verifiedUser},error:null}:await guest.auth.verifyOtp({token_hash:tokenHash,type:"recovery"});if(error||!data.user)return fail("رابط الاستعادة منتهي أو غير صالح",401);const {error:changed}=await admin.auth.admin.updateUserById(data.user.id,{password});if(changed)throw changed;return j({ok:true});}
if(req.method==="POST"&&path==="/api/v1/auth/register"){const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),months=Number(b.months);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("صيغة البريد الإلكتروني غير صحيحة",400);if(password.length<8||password.length>128)return fail("كلمة المرور يجب أن تكون 8 رموز على الأقل",400);if(![1,2,3,6,12].includes(months))return fail("اختر مدة الاشتراك",400);const displayName=String(b.display_name||"").trim().slice(0,80);if(displayName.length<2)return fail("أدخل اسمًا من حرفين على الأقل",400);const {data,error}=await guest.auth.signUp({email,password,options:{data:{display_name:displayName,requested_months:months,requested_platform:"android"}}});if(error){console.error("signup error:",error.code||error.message);if(error.code==="email_exists"||error.code==="user_already_exists")return fail("البريد مسجل مسبقًا، استخدم تسجيل الدخول أو استعادة كلمة المرور",409);if(error.code==="over_email_send_rate_limit"||error.status===429)return fail("تم تجاوز حد رسائل البريد مؤقتًا. حاول لاحقًا.",429);return fail("تعذر إنشاء الحساب: "+(error.code||"يرجى المحاولة لاحقًا"),400)}return j({ok:true,needs_email_confirmation:!data.session});}
if(req.method==="POST"&&path==="/api/v1/requests"){const u=await who(req);if(!u)return fail("سجّل دخولك أولًا",401);if(u.role==="owner")return fail("حساب المالك لا يحتاج اشتراكًا",403);const b=await req.json(),months=Number(b.months),platform=String(b.platform||"android");if(![1,2,3,6,12].includes(months)||!["android","ios"].includes(platform))return fail("المدة أو المنصة غير صحيحة",400);const {data:existing}=await admin.from("deela_subscription_requests").select("id").eq("user_id",u.id).eq("status","pending").maybeSingle();if(existing)return fail("لديك طلب قيد المراجعة بالفعل",409);const {error}=await admin.from("deela_subscription_requests").insert({user_id:u.id,months,platform});if(error)return fail("تعذر إرسال الطلب",500);return j({ok:true,message:"تم إرسال طلبك إلى لوحة المالك"});}
if(req.method==="GET"&&path==="/api/v1/requests/me"){const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);const {data,error}=await admin.from("deela_subscription_requests").select("id,months,platform,status,created_at").eq("user_id",u.id).order("created_at",{ascending:false}).limit(10);if(error)return fail("تعذر قراءة الطلبات",500);return j({requests:data||[]});}
if(req.method==="POST"&&path==="/api/v1/auth/login"){const b=await req.json();const name=String(b.email||b.username||"").trim().toLowerCase(),password=String(b.password||"");if(!name||!password||name.length>254||password.length>1024)return fail("بيانات الدخول غير صحيحة",401);let email=name;if(!name.includes("@")){if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(name))return fail("بيانات الدخول غير صحيحة",401);const {data:alias}=await admin.from("deela_admin_usernames").select("user_id").eq("username",name).maybeSingle();if(!alias)return fail("بيانات الدخول غير صحيحة",401);const {data:u}=await admin.auth.admin.getUserById(alias.user_id);email=u?.user?.email||"";}if(!email)return fail("بيانات الدخول غير صحيحة",401);const {data,error}=await guest.auth.signInWithPassword({email,password});if(error||!data.session)return fail("بيانات الدخول غير صحيحة",401);const {data:p}=await admin.from("profiles").select("role").eq("id",data.user.id).maybeSingle();const u={id:data.user.id,role:p?.role||"subscriber"};const entitlement=await member(u,b.platform==="ios"?"ios":"android");if(u.role!=="owner"&&!entitlement.active){const months=Number(data.user.user_metadata?.requested_months);if([1,2,3,6,12].includes(months)){const {data:existing}=await admin.from("deela_subscription_requests").select("id").eq("user_id",u.id).eq("status","pending").maybeSingle();if(!existing){const {error:requestError}=await admin.from("deela_subscription_requests").insert({user_id:u.id,months,platform:"android"});if(requestError)console.error("auto request failed",requestError.code);}}}return j({access_token:data.session.access_token,refresh_token:data.session.refresh_token,role:u.role,subscription_active:entitlement.active,expires_in:data.session.expires_in});}
// Rotate the Supabase refresh token and independently verify the current subscription.
if(req.method==="POST"&&path==="/api/v1/auth/refresh"){
 const b=await req.json();
 const refreshToken=String(b.refresh_token||"").trim();
 if(refreshToken.length<10||refreshToken.length>4096)return fail("جلسة الدخول منتهية",401);
 const isolated=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await isolated.auth.refreshSession({refresh_token:refreshToken});
 if(error||!data.session||!data.user){
  if(error&&![400,401,403].includes(Number(error.status||0))){console.error("refresh unavailable",error.code||error.message);return fail("تعذر التحقق مؤقتًا",503);}
  return fail("جلسة الدخول منتهية",401);
 }
 const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
 if(profileError)throw profileError;
 const role=profile?.role||"subscriber";
 const subscription=await member({id:data.user.id,role},b.platform==="ios"?"ios":"android");
 return j({access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_in:data.session.expires_in,role,subscription_active:subscription.active,expires_at_epoch:subscription.expires_at_epoch});
}
if(req.method==="GET"&&path==="/api/v1/entitlements/me"){const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);return j(await member(u));}

if(req.method==="GET"&&path==="/api/v1/source/updates"){
 const u=await who(req);if(!u)return fail("مطلوب تسجيل الدخول",401);
 const entitlement=await member(u,"android");if(!entitlement.active)return fail("الاشتراك غير نشط",403);
 const since=new Date(Date.now()-60*86400000).toISOString();
 const {data,error}=await admin.from("deela_published_source_updates")
  .select("source,app_key,title,version,page_url,icon_url,published_at")
  .gte("published_at",since).order("published_at",{ascending:false}).limit(300);
 if(error)throw error;return j({updates:data||[]});
}
if(path.startsWith("/api/owner/")){const u=await who(req);if(!u||u.role!=="owner")return fail("صلاحية المالك مطلوبة",403);
if(path==="/api/owner/service-observations"){
 const names=["hexstrike","pentestgpt","pentagi","pentest-swarm"];
 const states=["responding","not_responding","unknown"];
 if(req.method==="GET"){
  const {data,error}=await admin.from("deela_owner_status_observations").select("service_name,reported_status,received_at").eq("owner_id",u.id);
  if(error)return fail("تعذر قراءة التقارير",500);
  const observations=names.map(service_name=>{
   const row=(data||[]).find(x=>x.service_name===service_name);
   return {service_name,reported_status:row?.reported_status||"unknown",received_at:row?.received_at||null,fresh:!!row&&Date.now()-Date.parse(row.received_at)<120000};
  });
  return new Response(JSON.stringify({observations,source:"owner_reported"}),{headers:{...headers,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
 }
 if(req.method==="POST"){
  const b=await req.json();
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>!["service_name","reported_status"].includes(k))||!names.includes(b.service_name)||!states.includes(b.reported_status))return fail("تقرير غير صالح",400);
  const {error}=await admin.from("deela_owner_status_observations").upsert({owner_id:u.id,service_name:b.service_name,reported_status:b.reported_status,received_at:new Date().toISOString()},{onConflict:"owner_id,service_name"});
  if(error)return fail("تعذر حفظ التقرير",500);
  return j({ok:true,source:"owner_reported"});
 }
 return fail("الطريقة غير مسموحة",405);
}

if(req.method==="GET"&&path==="/api/owner/connection-status")return new Response(JSON.stringify({ok:true}),{headers:{...headers,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});


if(path==="/api/owner/apple/certificates"&&req.method==="GET"){
 const [groups,enrollments]=await Promise.all([
  admin.from("deela_apple_signing_groups").select("id,title,method,provider_name,team_id,certificate_serial,certificate_expires_at,device_limit,p12_storage_path,profile_storage_path,created_at").order("created_at",{ascending:false}).limit(100),
  admin.from("deela_apple_device_enrollments").select("id,signing_group_id,user_id,device_name,udid,state,apple_device_id,registered_at,created_at,last_error").order("created_at",{ascending:false}).limit(1000)
 ]);
 if(groups.error||enrollments.error)return fail("تعذر جلب الشهادات أو الأجهزة",500);
 const certificates=(groups.data||[]).map(g=>({
  id:g.id,title:g.title,method:g.method,provider_name:g.provider_name,team_id:g.team_id,
  certificate_serial:g.certificate_serial,certificate_expires_at:g.certificate_expires_at,
  device_limit:g.device_limit,has_p12:Boolean(g.p12_storage_path),has_profile:Boolean(g.profile_storage_path),
  created_at:g.created_at
 }));
 return j({certificates,devices:enrollments.data||[],apple_api_configured:appleConfigured(),
  note:"Registration with Apple only after verified Apple API response. No IPA signing or installation is implied."});
}
if(path==="/api/owner/apple/certificates"&&req.method==="POST"){
 let b:Record<string,unknown>;try{b=await req.json()}catch{return fail("بيانات الشهادة غير صحيحة",400)}
 const title=cleanString(b.title,100),method=cleanString(b.method,30),team=cleanString(b.team_id,32).toUpperCase();
 const provider=cleanString(b.provider_name,100)||"Apple Developer";
 const serial=cleanString(b.certificate_serial,120),rawExpiry=cleanString(b.certificate_expires_at,30);
 const limit=Number(b.device_limit??100);
 if(title.length<2||!["ad_hoc","licensed_provider"].includes(method)||provider.length<2)return fail("تحقق من اسم الشهادة ونوعها",400);
 if(method==="ad_hoc"&&!/^[A-Z0-9]{10}$/.test(team))return fail("أدخل Team ID الصحيح المكوّن من 10 رموز",400);
 if(!Number.isInteger(limit)||limit<1||limit>100)return fail("العدد المحلي للشهادة يجب أن يكون من 1 إلى 100",400);
 const expiry=rawExpiry?new Date(rawExpiry):null;
 if(expiry&&(!Number.isFinite(expiry.getTime())||expiry.getTime()<=Date.now()))return fail("تاريخ الصلاحية غير صحيح أو منتهٍ",400);
 const {data,error}=await admin.from("deela_apple_signing_groups").insert({
  title,method,provider_name:provider,team_id:team||null,certificate_serial:serial||null,
  certificate_expires_at:expiry?.toISOString()||null,device_limit:limit,created_by:u.id
 }).select("id,title,method,device_limit").single();
 if(error){console.error("Apple certificate metadata save",error.code);return fail("تعذر حفظ سجل الشهادة",500)}
 await log(u.id,"apple_certificate_added");
 return j({ok:true,certificate:data,status:"record_created_not_activated"});
}
if(path==="/api/owner/apple/certificates/file"&&req.method==="POST"){
 let form:FormData;try{form=await req.formData()}catch{return fail("ملف غير صالح",400)}
 const id=String(form.get("certificate_id")||""),kind=String(form.get("kind")||"");
 if(!UUID_RE.test(id)||!["p12","profile"].includes(kind))return fail("اختر الشهادة ونوع الملف",400);
 const file=form.get("file");
 if(!(file instanceof File)||file.size<32||file.size>4*1024*1024)return fail("حجم الملف غير صالح (الحد 4 ميجابايت)",400);
 const filename=file.name.toLowerCase();
 if((kind==="p12"&&!filename.endsWith(".p12"))||(kind==="profile"&&!filename.endsWith(".mobileprovision")))return fail("امتداد الملف غير صحيح",400);
 const {data:group,error:findError}=await admin.from("deela_apple_signing_groups").select("id,p12_storage_path,profile_storage_path").eq("id",id).maybeSingle();
 if(findError||!group)return fail("الشهادة غير موجودة",404);
 const content=new Uint8Array(await file.arrayBuffer());
 if(content[0]!==0x30)return fail("الملف لا يشبه حاوية شهادة أو ملف توزيع Apple",400);
 const name=id+"/"+crypto.randomUUID()+"."+(kind==="p12"?"p12":"mobileprovision");
 const {error:uploadError}=await admin.storage.from(APPLE_VAULT).upload(name,content,{contentType:"application/octet-stream",upsert:false});
 if(uploadError){console.error("Apple signing vault upload",uploadError.message);return fail("تعذر حفظ الملف في المساحة الخاصة",500)}
 const column=kind==="p12"?"p12_storage_path":"profile_storage_path";
 const prior=kind==="p12"?group.p12_storage_path:group.profile_storage_path;
 const {error:updateError}=await admin.from("deela_apple_signing_groups").update({[column]:name,updated_at:new Date().toISOString()}).eq("id",id);
 if(updateError){await admin.storage.from(APPLE_VAULT).remove([name]);return fail("تعذر ربط ملف الشهادة بالسجل",500)}
 if(prior)await admin.storage.from(APPLE_VAULT).remove([prior]);
 await log(u.id,kind==="p12"?"apple_p12_uploaded":"apple_profile_uploaded");
 return j({ok:true,kind,stored_private:true,verified:false,detail:"حُفظ الملف بسرية؛ لم يتم التحقق من صلاحيته أو توقيع تطبيق."});
}
if(path==="/api/owner/apple/devices"&&req.method==="POST"){
 let b:Record<string,unknown>;try{b=await req.json()}catch{return fail("بيانات غير صالحة",400)}
 const groupId=cleanString(b.certificate_id,50),userId=cleanString(b.user_id,50),name=cleanString(b.device_name,100);
 const udid=cleanString(b.udid,45).toUpperCase();
 if(!UUID_RE.test(groupId)||!UUID_RE.test(userId)||name.length<2||!UDID_RE.test(udid))return fail("تحقق من المشترك واسم الجهاز وUDID الصحيح",400);
 const [{data:g},{data:profile},{data:sub},{data:requestRows},{count}]=await Promise.all([
  admin.from("deela_apple_signing_groups").select("id,device_limit,certificate_expires_at").eq("id",groupId).maybeSingle(),
  admin.from("profiles").select("role").eq("id",userId).maybeSingle(),
  admin.from("subscriptions").select("platform").eq("user_id",userId).maybeSingle(),
  admin.from("deela_subscription_requests").select("id").eq("user_id",userId).eq("platform","ios").limit(1),
  admin.from("deela_apple_device_enrollments").select("id",{count:"exact",head:true}).eq("signing_group_id",groupId)
 ]);
 if(!g||!profile||profile.role==="owner")return fail("الشهادة أو حساب المشترك غير موجود",404);
 if(sub?.platform!=="ios"&&!(requestRows||[]).length)return fail("الحساب ليس مشترك آيفون",400);
 if(g.certificate_expires_at&&Date.parse(g.certificate_expires_at)<=Date.now())return fail("الشهادة مسجلة كمنتهية",409);
 if((count||0)>=g.device_limit)return fail("وصلت الشهادة إلى العدد المحلي المحدد؛ لا يعني هذا سعة Apple الفعلية",409);
 const {data,error}=await admin.from("deela_apple_device_enrollments").insert({
  signing_group_id:groupId,user_id:userId,device_name:name,udid,created_by:u.id
 }).select("id,state").single();
 if(error?.code==="23505")return fail("الجهاز مسجل بالفعل ضمن هذه الشهادة",409);
 if(error){console.error("Apple device queue insert",error.code);return fail("تعذر إضافة جهاز المشترك",500)}
 await log(u.id,"apple_device_queued",userId);
 return j({ok:true,device:data,apple_registered:false});
}
if(path==="/api/owner/apple/devices/register"&&req.method==="POST"){
 let b:Record<string,unknown>;try{b=await req.json()}catch{return fail("طلب غير صالح",400)}
 const id=cleanString(b.enrollment_id,50);
 if(!UUID_RE.test(id))return fail("معرف الجهاز غير صالح",400);
 const {data:enrollment,error:enErr}=await admin.from("deela_apple_device_enrollments")
   .select("id,signing_group_id,user_id,device_name,udid,state,apple_device_id").eq("id",id).maybeSingle();
 if(enErr||!enrollment)return fail("الجهاز غير موجود",404);
 if(enrollment.state==="apple_registered")return j({ok:true,already_registered:true,apple_device_id:enrollment.apple_device_id});
 const {data:g}=await admin.from("deela_apple_signing_groups").select("id,method,certificate_expires_at").eq("id",enrollment.signing_group_id).maybeSingle();
 if(!g||g.method!=="ad_hoc")return fail("هذا النوع يحتاج مزود توقيع يدعم الربط الرسمي",409);
 if(g.certificate_expires_at&&Date.parse(g.certificate_expires_at)<=Date.now())return fail("الشهادة منتهية",409);
 if(!appleConfigured())return fail("اربط مفاتيح App Store Connect API في أسرار الخادم أولاً، ولا تضعها في لوحة المشتركين",409);
 const [{data:sub},{data:profile}]=await Promise.all([
  admin.from("subscriptions").select("platform,starts_at,ends_at,suspended").eq("user_id",enrollment.user_id).maybeSingle(),
  admin.from("profiles").select("role").eq("id",enrollment.user_id).maybeSingle()
 ]);
 if(profile?.role==="owner"||sub?.platform!=="ios"||sub?.suspended||!sub?.starts_at||Date.parse(sub.starts_at)>Date.now()||Date.parse(sub.ends_at)<=Date.now())
  return fail("يلزم اشتراك آيفون فعّال قبل تسجيل الجهاز لدى Apple",403);
 try{
  const deviceId=await appleRegisterDevice(enrollment.udid,enrollment.device_name);
  const {error}=await admin.from("deela_apple_device_enrollments").update({
   state:"apple_registered",apple_device_id:deviceId,registered_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error)throw Error("Apple responded, but local registration record could not be updated");
  await log(u.id,"apple_device_registered",enrollment.user_id);
  return j({ok:true,state:"apple_registered",apple_device_id:deviceId,app_signed:false,installed:false});
 }catch(e){
  const reason=String(e instanceof Error?e.message:e).slice(0,180);
  await admin.from("deela_apple_device_enrollments").update({state:"registration_failed",last_error:reason,updated_at:new Date().toISOString()}).eq("id",id);
  console.error("DEELA Apple registration failed",reason);
  return fail("تعذر تسجيل الجهاز لدى Apple. "+reason,502);
 }
}


if(path==="/api/owner/android-catalog"){
 if(req.method==="GET"){
  const params=new URL(req.url).searchParams;
  const query=String(params.get("q")||"").trim().slice(0,100);
  const offset=Math.max(0,Math.min(100000,Number(params.get("offset"))||0));
  const limit=Math.max(1,Math.min(100,Number(params.get("limit"))||40));
  const {data,error}=await admin.rpc("deela_android_owner_catalog_page",{p_limit:limit+1>100?100:limit+1,p_offset:offset,p_query:query||null});
  if(error){console.error("Owner Android catalogue list",error.code);return fail("تعذر قراءة قائمة أندرويد",500);}
  const items=data||[];
  return j({apps:items.slice(0,limit),offset,limit,has_more:items.length>limit,platform:"android"});
 }
 if(req.method==="POST"){
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return fail("البيانات غير صحيحة",400);}
  const key=typeof body.catalog_key==="string"?body.catalog_key.trim().toLowerCase():"";
  if(!/^(app|mod|ext):[^\s]{4,590}$/.test(key)||key.length>600||typeof body.is_hidden!=="boolean")
   return fail("المعرف أو حالة الإخفاء غير صحيحة",400);
  const {data:valid,error:validationError}=await admin.rpc("deela_android_owner_catalog_page",{p_limit:5,p_offset:0,p_query:key});
  if(validationError)throw validationError;
  if(!(valid||[]).some((app:{catalog_key:string})=>app.catalog_key===key))
   return fail("التطبيق غير موجود في قائمة أندرويد",404);
  const {error:saveError}=await admin.from("deela_android_catalog_rules")
   .upsert({catalog_key:key,is_hidden:body.is_hidden,updated_at:new Date().toISOString(),updated_by:u.id},{onConflict:"catalog_key"});
  if(saveError){console.error("Owner Android catalogue update",saveError.code);return fail("تعذر تحديث حالة التطبيق",500);}
  await log(u.id,body.is_hidden?"android_app_hide":"android_app_show");
  return j({ok:true,platform:"android",catalog_key:key,is_hidden:body.is_hidden});
 }
 return fail("الطريقة غير مدعومة",405);
}
if(req.method==="GET"&&path==="/api/owner/source/candidates"){
 const {data,error}=await admin.from("deela_source_inventory")
  .select("source,app_key,title,version,pending_version,page_url,scanned_at")
  .not("pending_version","is",null).order("scanned_at",{ascending:false}).limit(500);
 if(error)throw error;
 return j({pending_count:await pendingSourceCount(),updates:data||[]});
}
if(req.method==="POST"&&path==="/api/owner/source/scan"){
 const b=await req.json(),source=String(b.source||"");
 if(!SCAN_SOURCES.has(source)||!Array.isArray(b.apps)||b.apps.length>100)return fail("بيانات الفحص غير صحيحة",400);
 const unique=new Map<string,{source:string,app_key:string,title:string,version:string,page_url:string|null,icon_url:string|null}>();
 for(const raw of b.apps){
  if(!raw||typeof raw!=="object")continue;
  const key=String(raw.key||"").trim(),title=String(raw.title||"").trim(),version=String(raw.version||"").trim();
  if(!key||key.length>300||!title||title.length>180||version.length>100||!parts(version).length)continue;
  const url=String(raw.page_url||"").trim(),icon=String(raw.icon_url||"").trim();
  unique.set(key,{source,app_key:key,title,version,page_url:url.startsWith("https://")&&url.length<600?url:null,icon_url:icon.startsWith("https://")&&icon.length<600?icon:null});
 }
 const rows=[...unique.values()];
 if(!rows.length)return j({scanned:0,pending_count:await pendingSourceCount()});
 const {data:old,error:readErr}=await admin.from("deela_source_inventory")
  .select("app_key,version,pending_version,last_published_version").eq("source",source)
  .in("app_key",rows.map(a=>a.app_key));
 if(readErr)throw readErr;
 const known=new Map((old||[]).map(x=>[x.app_key,x]));
 const now=new Date().toISOString();
 const updates=rows.map(item=>{
  const prior=known.get(item.app_key),changed=!!prior&&newerVersion(prior.version,item.version);
  return {...item,version:changed||!prior?item.version:prior.version,
   pending_version:changed?item.version:(prior?.pending_version||null),
   last_published_version:prior?.last_published_version||null,scanned_at:now};
 });
 const {error}=await admin.from("deela_source_inventory").upsert(updates,{onConflict:"source,app_key"});
 if(error)throw error;
 return j({scanned:rows.length,pending_count:await pendingSourceCount()});
}
if(req.method==="POST"&&path==="/api/owner/source/publish"){
 const {data:rows,error:readErr}=await admin.from("deela_source_inventory")
  .select("source,app_key,title,pending_version,page_url,icon_url")
  .not("pending_version","is",null).limit(500);
 if(readErr)throw readErr;
 if(!rows?.length)return j({published:0,pending_count:0});
 const now=new Date().toISOString();
 const {error}=await admin.from("deela_published_source_updates").upsert(
  rows.map(x=>({source:x.source,app_key:x.app_key,title:x.title,version:x.pending_version,
   page_url:x.page_url,icon_url:x.icon_url,published_at:now})),
  {onConflict:"source,app_key"});
 if(error)throw error;
 // Do not erase a newer candidate that arrived during publishing.
 for(const row of rows) {
   const {error:clearError}=await admin.from("deela_source_inventory")
    .update({pending_version:null,last_published_version:row.pending_version})
    .eq("source",row.source).eq("app_key",row.app_key).eq("pending_version",row.pending_version);
   if(clearError)throw clearError;
 }
 await log(u.id,"source_updates_published");
 return j({published:rows.length,pending_count:await pendingSourceCount()});
}
if(req.method==="GET"&&path==="/api/owner/dashboard")return j(await dashboard(u));
if(req.method==="POST"&&path==="/api/owner/username"){const b=await req.json(),username=String(b.username||"").trim().toLowerCase();if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(username))return fail("اسم المستخدم من 3 إلى 32 حرفًا ويبدأ بحرف إنجليزي");const {error}=await admin.from("deela_admin_usernames").upsert({user_id:u.id,username,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)return fail("اسم المستخدم مستخدم أو غير صالح");await log(u.id,"owner_username_updated");return j({username});}
if(req.method==="POST"&&path==="/api/owner/password"){const b=await req.json(),old=String(b.current_password||""),next=String(b.new_password||"");if(next.length<12||next.length>128)return fail("كلمة المرور الجديدة من 12 إلى 128 رمزًا");const {error:check}=await guest.auth.signInWithPassword({email:u.email,password:old});if(check)return fail("كلمة المرور الحالية غير صحيحة",401);const {error}=await admin.auth.admin.updateUserById(u.id,{password:next});if(error)throw error;await log(u.id,"owner_password_changed");return j({ok:true});}
if(req.method==="POST"&&path==="/api/owner/invite"){const b=await req.json(),email=String(b.email||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("بريد إلكتروني غير صحيح");const {error}=await admin.auth.admin.inviteUserByEmail(email);if(error)return fail("تعذرت الدعوة: "+error.message);await log(u.id,"subscriber_invited");return j({ok:true});}
if(req.method==="POST"&&path==="/api/owner/requests/review"){
 const b=await req.json(),id=String(b.id||""),decision=String(b.decision||"");
 if(!["approved","rejected"].includes(decision)||!/^[a-f0-9-]{36}$/i.test(id))return fail("طلب غير صالح",400);
 const {data:r,error:requestError}=await admin.from("deela_subscription_requests").select("*").eq("id",id).eq("status","pending").maybeSingle();
 if(requestError)throw requestError;
 if(!r)return fail("الطلب غير موجود أو تمت مراجعته",409);
 let startsAt="",endsAt="";
 if(decision==="approved"){
  const {data:old,error:oldError}=await admin.from("subscriptions").select("ends_at").eq("user_id",r.user_id).maybeSingle();
  if(oldError)throw oldError;
  const now=new Date(),base=new Date(Math.max(now.getTime(),old?.ends_at?Date.parse(old.ends_at):0));
  startsAt=now.toISOString();
  base.setUTCMonth(base.getUTCMonth()+r.months);endsAt=base.toISOString();
  const {error}=await admin.from("subscriptions").upsert({user_id:r.user_id,starts_at:startsAt,ends_at:endsAt,suspended:false,platform:r.platform,updated_at:startsAt},{onConflict:"user_id"});
  if(error)return fail("تعذر تفعيل الاشتراك",500);
 }
 const {data:reviewed,error:reviewError}=await admin.from("deela_subscription_requests")
  .update({status:decision,reviewed_at:new Date().toISOString(),reviewed_by:u.id})
  .eq("id",id).eq("status","pending").select("id").maybeSingle();
 if(reviewError)throw reviewError;
 if(!reviewed)return fail("تمت مراجعة الطلب مسبقًا؛ حدث القائمة",409);
 let emailStatus:DeelaMailStatus|null=null;
 if(decision==="approved"){
  const {error:outboxError}=await admin.from("deela_subscription_email_outbox").upsert({
   request_id:id,user_id:r.user_id,months:r.months,starts_at:startsAt,ends_at:endsAt,
   delivery_status:"pending"
  },{onConflict:"request_id",ignoreDuplicates:true});
  if(outboxError){console.error("Failed to queue activation email",outboxError.code);emailStatus="failed";}
  else {
   try {emailStatus=await sendDeelaActivationEmail(id);}
   catch(e){console.error("Activation email failed unexpectedly",e instanceof Error?e.name:"unknown");emailStatus="failed";}
  }
 }
 await log(u.id,"request_"+decision,r.user_id);
 return j({ok:true,email_status:emailStatus});
}
if(req.method==="GET"&&path==="/api/owner/subscription-email/status"){
 const {data:messages,error}=await admin.from("deela_subscription_email_outbox")
  .select("request_id,user_id,delivery_status,last_error_code,sent_at,updated_at")
  .order("created_at",{ascending:false}).limit(100);
 if(error)throw error;
 return j({ready:!!(Deno.env.get("RESEND_API_KEY")&&Deno.env.get("DEELA_EMAIL_FROM")),messages:messages||[]});
}
if(req.method==="POST"&&path==="/api/owner/subscription-email/test"){
 const apiKey=(Deno.env.get("RESEND_API_KEY")||"").trim();
 const sender=(Deno.env.get("DEELA_EMAIL_FROM")||"").trim();
 if(!apiKey||!sender)return j({ok:false,status:"unconfigured",reason:"email_provider_not_configured"},503);
 const recipient=u.email.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
  return fail("حساب المالك لا يحتوي على بريد صالح للاختبار",400);
 const label="اختبار إرسال البريد من تطبيقات ديلا ❤️";
 const bodyText="مرحبًا بك!\\n\\nهذه رسالة اختبار من نظام البريد في تطبيقات ديلا. "+
  "لا توجد أي عملية تفعيل اشتراك مرتبطة بهذه الرسالة، ولا حاجة لاتخاذ أي إجراء.\\n\\nتطبيقات ديلا ❤️";
 const bodyHtml=`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
 <body style="margin:0;background:#0c090b;font-family:Tahoma,Arial,sans-serif;color:#fce8ed">
 <div style="max-width:510px;margin:30px auto;padding:28px;background:#1c1118;border-radius:16px">
 <h1 style="color:#ff315e">تطبيقات ديلا ❤️</h1>
 <h2 style="color:#fff">اختبار إرسال البريد ✅</h2>
 <p style="line-height:1.9">هذا اختبار لخدمة الإشعارات البريدية في تطبيقات ديلا.
 لم يتم تفعيل أي اشتراك أو إجراء أي تعديل على حسابات المشتركين.</p>
 <p style="font-size:12px;color:#cba3b2">رسالة اختبار داخلية للمالك فقط.</p></div></body></html>`;
 try {
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",signal:AbortSignal.timeout(15000),
   headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json",
    "Idempotency-Key":"deela-test-"+u.id+"-"+Math.floor(Date.now()/300000)},
   body:JSON.stringify({from:sender,to:[recipient],subject:label,html:bodyHtml,text:bodyText})
  });
  if(!response.ok){
   console.error("DEELA test email was rejected",response.status);
   await log(u.id,"owner_email_test_failed");
   return j({ok:false,status:"failed",reason:"provider_http_"+response.status},502);
  }
  const result=await response.json();
  await log(u.id,"owner_email_test_accepted");
  return j({ok:true,status:"accepted",provider_message_id:String(result.id||"")||null});
 } catch(error) {
  console.error("DEELA test email transport failure",error instanceof Error?error.name:"unknown");
  await log(u.id,"owner_email_test_failed");
  return j({ok:false,status:"failed",reason:"provider_unreachable"},502);
 }
}
if(req.method==="POST"&&path==="/api/owner/subscription-email/retry"){
 const b=await req.json(),id=String(b.request_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(id))return fail("طلب غير صالح",400);
 const {data:reqRow,error}=await admin.from("deela_subscription_requests").select("status").eq("id",id).maybeSingle();
 if(error)throw error;
 if(!reqRow||reqRow.status!=="approved")return fail("لا يمكن إرسال رسالة لطلب غير مفعل",409);
 let status:DeelaMailStatus="failed";
 try {status=await sendDeelaActivationEmail(id);}
 catch(e){console.error("Email retry failed unexpectedly",e instanceof Error?e.name:"unknown");}
 return j({ok:true,email_status:status});
}

if(req.method==="POST"&&path==="/api/owner/subscription"){const b=await req.json(),id=String(b.user_id||""),action=String(b.action||"");if(!/^[a-f0-9-]{36}$/i.test(id)||!["trial","renew","suspend","resume","revoke"].includes(action))return fail("طلب غير صالح");if(id===u.id)return fail("لا يمكن تعديل المالك",403);const {data:target}=await admin.from("profiles").select("role").eq("id",id).maybeSingle();if(!target||target.role==="owner")return fail("لا يمكن تعديل هذا الحساب",403);const {data:old}=await admin.from("subscriptions").select("ends_at,suspended,platform").eq("user_id",id).maybeSingle();const now=Date.now(),oldEnd=old?.ends_at?Date.parse(old.ends_at):0;const chosenPlatform=String(b.platform||old?.platform||"android");if(!["android","ios"].includes(chosenPlatform))return fail("نوع الجهاز غير صحيح",400);let change:Record<string,unknown>={user_id:id,updated_at:new Date().toISOString(),platform:(action==="trial"||action==="renew")?chosenPlatform:(old?.platform||"android")};
if(action==="trial")Object.assign(change,{starts_at:new Date().toISOString(),ends_at:new Date(now+86400000).toISOString(),suspended:false});
if(action==="renew"){const months=Number(b.months);if(!Number.isInteger(months)||months<1||months>36)return fail("مدة التجديد من شهر إلى 36 شهرًا",400);const base=new Date(Math.max(now,oldEnd));base.setUTCMonth(base.getUTCMonth()+months);Object.assign(change,{starts_at:new Date().toISOString(),ends_at:base.toISOString(),suspended:false});}
if(action==="suspend"||action==="resume"||action==="revoke"){if(!old)return fail("لا يوجد اشتراك لهذا المستخدم");change.suspended=action!=="resume";if(action==="revoke")change.ends_at=new Date(now).toISOString();}
const {error}=await admin.from("subscriptions").upsert(change,{onConflict:"user_id"});if(error){console.error(error);return fail("تعذر تعديل الاشتراك",500)}await log(u.id,"subscription_"+action,id);return j({ok:true});}
}
return fail("مسار غير موجود",404);
}catch(e){console.error("deela-control",e);return fail("خطأ في الخادم",500)}
});