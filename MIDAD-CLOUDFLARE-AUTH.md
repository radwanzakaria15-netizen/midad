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
2. أضف نطاق موقع Pages ونطاق github.io إلى Authentication > URL Configuration > Redirect URLs / Site URL حسب بيئة النشر.
3. Google OAuth يتطلب إنشاء OAuth Client في Google Cloud وإضافة Client ID/Secret في إعداد مزود Google في Supabase.
4. تفعيل استعادة كلمة المرور يتطلب إعداد SMTP/قوالب البريد في Supabase؛ لا يمكن ضمان التسليم باستخدام إعدادات البريد التجريبية.

## وظائف API المضافة
- GET/POST /api/account: قراءة/إنشاء ملف المستخدم. الدور الافتراضي student.
- POST /api/invites: دعوة أستاذ من حساب teacher/admin.
- POST /api/invites/redeem: استهلاك رمز دعوة من 8 أحرف وصالح 48 ساعة.
- GET/POST/PATCH /api/resources: قراءة الموارد، إرسال مورد pending، ومراجعته حسب التخصص.
- GET/PUT /api/ratings: ملخص التقييم وتقييم واحد لكل UID.
- عميل الواجهة: midad-cloud-auth.js.

## ربط الواجهة
أضف قبل سكربتات التطبيق:
<script src="midad-cloud-auth.js"></script>
واستدعِ MidadCloudAuth بعد تحميل عميل Supabase الحالي. Google وتسجيل username يجب أن يستخدما Supabase Auth. username@midad.app بريد اصطناعي داخلي لا يستقبل رسائل؛ لذلك استرجاع كلمة المرور يحتاج بريد استرجاع حقيقياً موثقاً وربط عملية الإرسال بهذا البريد في تدفق آمن، وليس إرسال reset إلى البريد الاصطناعي.
