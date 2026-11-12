/* Midad teacher authentication — Supabase JS v2 */
(() => {
  const SUPABASE_URL = 'https://titltzjtsxmlqadpmezr.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2084oivvToJNqZvQwHTBiA_YXR3ouo7';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let mode = 'login';
  let busy = false;
  let currentUser = null;

  const css = document.createElement('style');
  css.textContent = `
    .app,.mobile-nav{display:none!important}
    body.midad-authenticated .app{display:block!important}
    body.midad-authenticated .mobile-nav{display:flex!important}
    #midad-auth-gate{min-height:100vh;display:grid;place-items:center;padding:22px;background:linear-gradient(145deg,#f5eee4,#eee3d6);font-family:Tajawal,Arial,sans-serif;color:#30231d}
    .midad-auth-card{width:min(440px,100%);background:#fffaf2;border:1px solid #eaded1;border-radius:25px;padding:26px;box-shadow:0 18px 50px #49302216}
    .midad-auth-brand{text-align:center;margin-bottom:22px}
    .midad-auth-mark{width:58px;height:58px;border-radius:19px;background:#563829;color:#fff8ef;display:grid;place-items:center;margin:0 auto 12px;font-size:28px;font-weight:900}
    .midad-auth-brand h1{margin:0;color:#563829;font-size:29px}
    .midad-auth-brand p{margin:5px 0 0;color:#8e786a;font-size:13px}
    .midad-auth-tabs{display:flex;gap:7px;background:#f2e8dc;border-radius:13px;padding:5px;margin:18px 0}
    .midad-auth-tabs button{flex:1;border:0;border-radius:10px;padding:10px;background:transparent;color:#79513d;font-weight:800}
    .midad-auth-tabs button.active{background:#fffaf2;box-shadow:0 2px 8px #56382912;color:#563829}
    .midad-auth-field{display:block;margin:12px 0}
    .midad-auth-field span{display:block;font-size:13px;font-weight:800;margin-bottom:6px;color:#563829}
    .midad-auth-field input{width:100%;height:46px;border:1px solid #eaded1;border-radius:12px;background:#fffdf9;padding:0 13px;color:#30231d;outline:none}
    .midad-auth-field input:focus{border-color:#9c765e;box-shadow:0 0 0 3px #b7795520}
    .midad-auth-submit{width:100%;border:0;border-radius:13px;padding:13px;background:#563829;color:white;font-weight:900;margin-top:10px}
    .midad-auth-submit:disabled{opacity:.55}
    .midad-auth-msg{font-size:13px;line-height:1.8;margin-top:13px;padding:10px 12px;border-radius:11px;display:none;white-space:pre-wrap}
    .midad-auth-msg.show{display:block}
    .midad-auth-msg.error{background:#f9e9e5;color:#8c3f35}
    .midad-auth-msg.ok{background:#eaf1e8;color:#42634a}
    .midad-auth-note{font-size:11px;line-height:1.8;color:#8e786a;text-align:center;margin:15px 0 0}
    .midad-auth-user{font-size:12px;color:#8e786a;text-align:center;margin-top:12px;direction:ltr}
    .midad-auth-invite{direction:ltr;text-align:center;font-weight:900;letter-spacing:2px;font-size:23px;padding:13px;background:#f2e8dc;border-radius:12px;margin:12px 0;user-select:all}
  `;
  document.head.appendChild(css);

  const gate = document.createElement('section');
  gate.id = 'midad-auth-gate';
  gate.innerHTML = `
    <div class="midad-auth-card">
      <div class="midad-auth-brand"><div class="midad-auth-mark">م</div><h1>مِداد</h1><p>مساحة الأستاذ التعليمية</p></div>
      <div class="midad-auth-tabs">
        <button type="button" id="midad-login-tab" class="active" onclick="midadAuthMode('login')">تسجيل الدخول</button>
        <button type="button" id="midad-signup-tab" onclick="midadAuthMode('signup')">إنشاء حساب</button>
      </div>
      <form id="midad-auth-form">
        <label class="midad-auth-field" id="midad-name-wrap" hidden><span>اسم الأستاذ</span><input id="midad-auth-name" autocomplete="name" maxlength="90" placeholder="الاسم الكامل"></label>
        <label class="midad-auth-field"><span>البريد الإلكتروني</span><input id="midad-auth-email" type="email" autocomplete="email" required placeholder="name@example.com" dir="ltr"></label>
        <label class="midad-auth-field"><span>كلمة المرور</span><input id="midad-auth-password" type="password" autocomplete="current-password" minlength="6" required placeholder="ستة أحرف على الأقل" dir="ltr"></label>
        <label class="midad-auth-field" id="midad-invite-wrap" hidden><span>رمز الدعوة (يُترك فارغاً لإنشاء أول حساب فقط)</span><input id="midad-auth-invite" autocomplete="off" maxlength="32" placeholder="رمز الدعوة" dir="ltr"></label>
        <button class="midad-auth-submit" id="midad-auth-submit" type="submit">دخول إلى مِداد</button>
      </form>
      <div class="midad-auth-msg" id="midad-auth-msg" role="status"></div>
      <p class="midad-auth-note">إنشاء حساب الأستاذ الجديد يتطلب رمز دعوة صالحاً بعد إنشاء الحساب الأول.</p>
    </div>`;
  document.body.insertBefore(gate, document.body.firstChild);

  function message(text, type='ok') {
    const el = document.getElementById('midad-auth-msg');
    el.textContent = text;
    el.className = 'midad-auth-msg show ' + type;
  }
  function setBusy(value) {
    busy = value;
    const button = document.getElementById('midad-auth-submit');
    button.disabled = value;
    button.textContent = value ? 'يرجى الانتظار…' : (mode === 'login' ? 'دخول إلى مِداد' : 'إنشاء الحساب');
  }
  window.midadAuthMode = (next) => {
    mode = next === 'signup' ? 'signup' : 'login';
    document.getElementById('midad-login-tab').classList.toggle('active', mode === 'login');
    document.getElementById('midad-signup-tab').classList.toggle('active', mode === 'signup');
    document.getElementById('midad-name-wrap').hidden = mode !== 'signup';
    document.getElementById('midad-invite-wrap').hidden = mode !== 'signup';
    document.getElementById('midad-auth-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    document.getElementById('midad-auth-msg').className = 'midad-auth-msg';
    setBusy(false);
  };

  function showWorkspace(user) {
    currentUser = user;
    if (typeof window.midadUseUserWorkspace === 'function') window.midadUseUserWorkspace(user);
    gate.style.display = 'none';
    document.body.classList.add('midad-authenticated');
  }
  function showGate() {
    currentUser = null;
    document.body.classList.remove('midad-authenticated');
    gate.style.display = 'grid';
    window.midadAuthMode('login');
  }

  document.getElementById('midad-auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = document.getElementById('midad-auth-email').value.trim();
    const password = document.getElementById('midad-auth-password').value;
    setBusy(true);
    try {
      if (mode === 'login') {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showWorkspace(data.user);
      } else {
        const fullName = document.getElementById('midad-auth-name').value.trim();
        const inviteCode = document.getElementById('midad-auth-invite').value.trim().toUpperCase();
        if (!fullName) throw new Error('أدخل اسم الأستاذ.');
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, invite_code: inviteCode } }
        });
        if (error) throw error;
        if (data.session && data.user) {
          showWorkspace(data.user);
          message('تم إنشاء الحساب وتسجيل الدخول بنجاح.');
        } else {
          message('تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. أكّد البريد ثم ارجع إلى مِداد وسجّل الدخول.', 'ok');
        }
      }
    } catch (error) {
      message(error.message || 'تعذّر إكمال العملية. تحقق من البيانات وحاول مجدداً.', 'error');
    } finally {
      setBusy(false);
    }
  });

  window.midadCreateInvite = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await client.rpc('create_midad_teacher_invite');
      if (error) throw error;
      openModal('دعوة أستاذ جديد', 'أرسل هذا الرمز إلى الأستاذ الذي تريد دعوته. الرمز صالح لمرة واحدة ولمدة 7 أيام.', '<div class="midad-auth-invite" id="midad-generated-invite">'+String(data).replace(/[&<>"]/g,'')+'</div><div class="modal-actions"><button class="btn primary" onclick="navigator.clipboard?.writeText(document.getElementById(\'midad-generated-invite\').textContent).then(()=>toast(\'تم نسخ الرمز\')).catch(()=>toast(\'انسخ الرمز يدوياً\'))">نسخ الرمز</button><button class="btn light" onclick="closeModal()">إغلاق</button></div>');
    } catch (error) {
      toast(error.message || 'تعذر إنشاء رمز الدعوة');
    }
  };
  window.midadSignOut = async () => {
    const { error } = await client.auth.signOut();
    if (error) toast(error.message);
  };

  window.midadSupabase = client;
  client.auth.onAuthStateChange((event, session) => {
    if (session?.user) showWorkspace(session.user);
    else if (event === 'SIGNED_OUT') showGate();
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) message(error.message, 'error');
    if (data.session?.user) showWorkspace(data.session.user);
    else showGate();
  });
})();