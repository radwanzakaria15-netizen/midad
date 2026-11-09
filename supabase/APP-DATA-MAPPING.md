# خريطة بيانات مِداد إلى Supabase

هذه الخريطة مبنية على بنية الواجهة الحالية في `index.html` وملفات JavaScript الملحقة بها. لا توجد مزامنة سحابية مفعّلة حتى الآن.

| بيانات الواجهة الحالية | جدول Supabase | التحويل المطلوب عند الربط |
| --- | --- | --- |
| `db.teacher`, `db.school`, `db.year` | `profiles` | `full_name`, `school_name`, `school_year`، ومعرّف الصف هو `auth.uid()` |
| `db.classes[]` | `classes` | `id` يصبح UUID؛ `year` و`stage` و`level` و`capacity` حقول مستقلة |
| `db.students[]` | `students` | `name` ↔ `full_name`، و`number` ↔ `student_number`، و`classId` ↔ `class_id` |
| `db.lessons[]` | `lessons` + `lesson_files` | سجل لكل مجموعة رفع، وملف metadata لكل ملف؛ الملف الثنائي يرفع إلى Storage لا إلى JSONB |
| `db.activities[]` | `activities` | `type` ↔ `activity_type`، و`items` تحفظ كـ JSONB |
| `db.assessments[]` | `assessments` | `kind`, `duration`, `questions` تحفظ مع بيانات المادة والمستوى |
| `db.attendance[]` | `attendance` | `date` ↔ `attendance_date`، مع ربط السجل بالقسم والتلميذ |
| `db.resources[]` | `resources` | العنوان والنوع والرابط والملاحظة |
| `db.experiences[]` | `experiences` | `source` ↔ `source_text`، وبيانات التجربة في `data` JSONB، والنمط أحد board / interactive / summary |

## ملاحظات تنفيذ الربط

- كل سجل يرسل من المتصفح يجب أن يحمل `owner_id = session.user.id`، وتظل سياسات RLS هي خط الدفاع الأساسي.
- لا تستخدم المعرّفات النصية القديمة التي تنشئها الواجهة المحلية مباشرةً كمعرّفات UUID؛ أنشئ سجلات سحابية ثم احتفظ بخريطة تربط المعرّف المحلي بالـ UUID السحابي.
- ملفات التحضير الحالية محفوظة بصيغة Data URL داخل `localStorage`. عند الربط، ارفع الملف كـ Blob إلى bucket الخاص، بمسار يبدأ بـ `<auth.uid()>/<lesson-id>/...`، ثم احفظ بياناته الوصفية في `lesson_files`.
- عند أول تسجيل دخول، لا تمسح `midad_workspace_v3` تلقائياً. اعرض على الأستاذ خيار استيراد البيانات المحلية إلى حسابه، ثم تحقّق من نجاح الإدخال قبل اعتماد النسخة السحابية.
- لا تضع `service_role key` أو كلمة مرور قاعدة البيانات في GitHub أو JavaScript المنشور. يستخدم المتصفح رابط المشروع ومفتاح publishable/anon فقط بعد إعداد المصادقة وRLS.
