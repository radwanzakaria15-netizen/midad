# مِداد — المصادقة وبيانات Cloudflare

## البنية
- Supabase Auth: كلمة المرور وGoogle والجلسة واستعادة كلمة المرور.
- Cloudflare Pages Functions: تحقق الخادم من جلسة Supabase وتطبيق الصلاحيات.
- Cloudflare D1: ملفات الحسابات والدعوات والموارد والتقييمات والنقاشات.
- لا يحدد المتصفح دور الأستاذ مطلقاً. التسجيل العام ينشئ دور student فقط؛ دعوة الأستاذ تستهلك على الخادم.

## إعداد Cloudflare
1. في Pages > Settings > Variables and Secrets > Production تأكد من وجود SUPABASE_URL وSUPABASE_ANON_KEY.
2. اربط D1 باسم midad بالـ binding DB (الموجود في wrangler.toml).
3. نفّذ migration 0002_accounts_resources.sql على قاعدة D1. إن كان التنفيذ من Wrangler متاحاً: npx wrangler d1 migrations apply midad --remote.
4. تأكد أن Pages ينشر من main وأن مجلد functions ضمن جذر المشروع.

## إعداد Supabase
1. Authentication > Providers: فعّل Email، وGoogle إن رغبت.
2. من Authentication > Sign In / Providers > Email عطّل Confirm email؛ لأن اسم المستخدم يُحوّل داخلياً إلى عنوان اصطناعي مثل username@midad.app ولا يمكنه استقبال رسالة تأكيد.
3. بريد الاستعادة الذي يدخله الأستاذ يُحفظ في ملفه على D1، لكن إرسال رابط إعادة تعيين إليه لم يُفعّل بعد؛ لا تستخدم resetPasswordForEmail مع البريد الاصطناعي.
4. أنشئ أول حساب مشرف يدوياً: سجّل حساب المصادقة الأول باسم مستخدم، ثم خذ UID الخاص به من Supabase Authentication > Users وأضف ملفه في D1 بعد تطبيق migration، مع role='admin'. لا تمنح أي حساب آخر هذا الدور من المتصفح.
5. أضف نطاق موقع Pages إلى Authentication > URL Configuration > Redirect URLs / Site URL.
6. Google OAuth يتطلب إنشاء OAuth Client في Google Cloud وإضافة Client ID/Secret في إعداد مزود Google في Supabase. أول دخول عبر Google يطلب الاسم واسم المستخدم ورمز دعوة أستاذ.

## وظائف API المضافة
- GET/POST /api/account: قراءة/إنشاء ملف المستخدم. الدور الافتراضي student.
- POST /api/invites: دعوة أستاذ من حساب teacher/admin.
- POST /api/invites/validate: التحقق من رمز الدعوة واسم المستخدم قبل إنشاء حساب المصادقة.
- POST /api/invites/redeem: استهلاك رمز دعوة من 8 أحرف وصالح 48 ساعة بعد تسجيل الدخول.
- GET/POST/PATCH /api/resources: قراءة الموارد، إرسال مورد pending، ومراجعته حسب التخصص.
- GET/PUT /api/ratings: ملخص التقييم وتقييم واحد لكل UID.
- عميل الواجهة: midad-cloud-auth.js.

## سلوك الواجهة
- الطالب يختار «طالب» من شاشة البداية ويدخل بمعرّفه المكوّن من 6 أرقام فقط؛ لا تظهر له واجهة تسجيل الأستاذ.
- الأستاذ يدخل باسم المستخدم وكلمة المرور، ويمكنه إنشاء حساب برمز دعوة، وإضافة بريد استعادة اختياري.
- التصفح العام متاح دون حساب؛ عمليات النشر والتفاعل تتطلب حساباً.
- ملف midad-cloud-auth.js يجب أن يُحمّل قبل supabase-auth.js.
