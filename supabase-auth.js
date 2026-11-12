/* Midad teacher authentication — Supabase JS v2 */
(() => {
  const SUPABASE_URL = 'https://titltzjtsxmlqadpmezr.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2084oivvToJNqZvQwHTBiA_YXR3ouo7';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let mode = 'login';
  let busy = false;
  let currentUser = null;
  let pendingConfirmationEmail = '';

  const css = document.createElement('style');
  css.textContent = `
    .app,.mobile-nav{display:none!important}
    body.midad-authenticated .app{display:block!important}
    body.midad-authenticated .mobile-nav{display:flex!important}
    body.student-mode .mobile-nav{display:none!important}
    .mobile-nav [hidden]{display:none!important}
    .midad-auth-guest{width:100%;margin-top:12px;min-height:48px;border:1px solid #cbd9c8;border-radius:14px;background:#f7faf5;color:#36533c;font:700 15px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .2s,border-color .2s}
    .midad-auth-guest:hover{background:#edf4e9;border-color:#a9c2a5}
    body.midad-guest [onclick="midadCreateInvite()"],body.midad-guest [onclick="midadSignOut()"]{display:none!important}
    #midad-auth-gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 12% 12%,#dce9d9 0,transparent 36%),radial-gradient(ellipse at 88% 90%,#e8e3d2 0,transparent 34%),#f3f5ef;font-family:Tajawal,Arial,sans-serif;color:#26372c;direction:rtl;position:relative;overflow:hidden}
    #midad-auth-gate:before,#midad-auth-gate:after{content:'';position:absolute;border:1px solid #cbd9c8;border-radius:50%;pointer-events:none}
    #midad-auth-gate:before{width:330px;height:330px;top:-190px;right:-120px}.midad-auth-gate:after{width:260px;height:260px;bottom:-170px;left:-90px}
    .midad-auth-card{position:relative;z-index:1;width:min(460px,100%);background:rgba(255,255,252,.96);border:1px solid #dfe8dc;border-radius:28px;padding:32px;box-shadow:0 24px 70px #314b3517,0 3px 12px #314b3508}
    .midad-auth-brand{text-align:center;margin-bottom:25px}
    .midad-auth-mark{width:66px;height:66px;border-radius:22px;background:linear-gradient(145deg,#496c50,#314c38);color:#fff;display:grid;place-items:center;margin:0 auto 13px;box-shadow:0 9px 20px #314c3828}
    .midad-auth-mark svg{width:34px;height:34px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .midad-auth-brand h1{margin:0;color:#304b36;font-size:31px;font-weight:900;letter-spacing:-.5px}
    .midad-auth-brand p{margin:7px 0 0;color:#829184;font-size:13px}
    .midad-auth-tabs{display:flex;gap:6px;background:#edf2eb;border:1px solid #e3ebe1;border-radius:15px;padding:5px;margin:22px 0 24px}
    .midad-auth-tabs button{flex:1;border:0;border-radius:11px;padding:12px 9px;background:transparent;color:#718174;font-family:inherit;font-size:14px;font-weight:800;transition:background .2s,color .2s,box-shadow .2s}
    .midad-auth-tabs button.active{background:#fff;color:#35553b;box-shadow:0 2px 9px #304b3614}
    .midad-auth-field{display:block;margin:15px 0}
    .midad-auth-field span{display:block;font-size:13px;font-weight:800;margin-bottom:8px;color:#425b46}
    .midad-auth-field input{box-sizing:border-box;width:100%;height:50px;border:1px solid #dce6d9;border-radius:13px;background:#fbfcf9;padding:0 14px;color:#26372c;outline:none;font-family:inherit;font-size:14px;transition:border-color .2s,box-shadow .2s}
    .midad-auth-field input::placeholder{color:#a1ada0}
    .midad-auth-field input:focus{border-color:#78977a;box-shadow:0 0 0 4px #78977a20;background:#fff}
    .midad-auth-submit{width:100%;border:0;border-radius:14px;padding:15px;background:linear-gradient(110deg,#496c50,#314c38);color:white;font-family:inherit;font-size:15px;font-weight:900;margin-top:14px;box-shadow:0 8px 18px #314c3825;transition:transform .2s,filter .2s}
    .midad-auth-submit:not(:disabled):active{transform:translateY(1px);filter:brightness(.96)}
    .midad-auth-submit:disabled{opacity:.55;box-shadow:none}
    @media(max-width:520px){#midad-auth-gate{padding:16px;min-height:100svh}.midad-auth-card{padding:25px 21px;border-radius:23px}.midad-auth-brand{margin-bottom:20px}.midad-auth-mark{width:60px;height:60px}.midad-auth-brand h1{font-size:28px}.midad-auth-tabs{margin:19px 0 21px}}
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
      <div class="midad-auth-brand"><div class="midad-auth-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5c2.8-.9 5.4-.4 8 1.4v12c-2.6-1.8-5.2-2.3-8-1.4z"/><path d="M20 5.5c-2.8-.9-5.4-.4-8 1.4v12c2.6-1.8 5.2-2.3 8-1.4z"/><path d="m8 10 2 1m-2 2 2 1m6-4-2 1m2 1-2 1"/></svg></div><h1>مِداد</h1><p>مساحة الأستاذ التعليمية</p></div>
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
      <button type="button" class="midad-auth-guest" onclick="midadGuestMode()">الدخول مؤقتًا دون حساب</button>
      <button type="button" class="midad-auth-guest" id="midad-auth-resend" hidden onclick="midadResendConfirmation()">إعادة إرسال رسالة التأكيد</button>
      <div class="midad-auth-msg" id="midad-auth-msg" role="status"></div>
      <p class="midad-auth-note">إنشاء حساب الأستاذ الجديد يتطلب رمز دعوة صالحاً بعد إنشاء الحساب الأول.</p>
    </div>`;
  document.body.insertBefore(gate, document.body.firstChild);

  function message(text, type='ok') {
    const el = document.getElementById('midad-auth-msg');
    el.textContent = text;
    el.className = 'midad-auth-msg show ' + type;
    const resend = document.getElementById('midad-auth-resend');
    if (resend) resend.hidden = !pendingConfirmationEmail;
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
    pendingConfirmationEmail = '';
    document.getElementById('midad-auth-resend').hidden = true;
    setBusy(false);
  };

  window.midadGuestMode = () => {
    currentUser = null;
    if (window.midadUseGuestWorkspace) window.midadUseGuestWorkspace();
    gate.style.display = 'none';
    document.body.classList.add('midad-authenticated', 'midad-guest');
    if (typeof window.toast === 'function') window.toast('وضع مؤقت: تُحفظ بياناتك على هذا الجهاز فقط.');
  };

  function showWorkspace(user) {
    document.body.classList.remove('midad-guest');
    const changedUser = !currentUser || currentUser.id !== user.id;
    currentUser = user;
    if (changedUser && typeof window.midadUseUserWorkspace === 'function') window.midadUseUserWorkspace(user);
    gate.style.display = 'none';
    document.body.classList.add('midad-authenticated');
  }
  function showGate() {
    document.body.classList.remove('midad-guest');
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
          pendingConfirmationEmail = email;
          message('تم إنشاء الحساب. افتح رسالة تأكيد البريد واضغط رابط التأكيد (لا يلزم إدخال رمز). إذا لم تصلك الرسالة، استخدم زر إعادة الإرسال أدناه.', 'ok');
        }
      }
    } catch (error) {
      message(error.message || 'تعذّر إكمال العملية. تحقق من البيانات وحاول مجدداً.', 'error');
    } finally {
      setBusy(false);
    }
  });


  window.midadResendConfirmation = async () => {
    if (busy || !pendingConfirmationEmail) return;
    setBusy(true);
    try {
      const { error } = await client.auth.resend({ type: 'signup', email: pendingConfirmationEmail });
      if (error) throw error;
      message('طلبنا إعادة إرسال رسالة التأكيد. افحص الوارد والرسائل غير المرغوب فيها، ولا تكرر الطلب بسرعة.', 'ok');
    } catch (error) {
      const raw = String(error.message || '');
      if (/rate|too many|frequency/i.test(raw)) message('وصلت إلى حد إعادة الإرسال مؤقتاً. انتظر قبل المحاولة مجدداً.', 'error');
      else if (/not authorized|email address/i.test(raw)) message('Supabase لا يسمح بإرسال البريد إلى هذا العنوان عبر خادم البريد الافتراضي. يلزم إعداد SMTP مخصص للمشروع.', 'error');
      else message(raw || 'تعذرت إعادة إرسال رسالة التأكيد.', 'error');
    } finally { setBusy(false); }
  };

  window.midadCopyInvite = async () => {
    const value = document.getElementById('midad-generated-invite')?.textContent || '';
    try { await navigator.clipboard.writeText(value); toast('تم نسخ الرمز'); }
    catch (error) { toast('يمكنك تحديد الرمز ونسخه يدوياً'); }
  };
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
    else if (event === 'SIGNED_OUT') { if (window.midadCloudStop) window.midadCloudStop(); showGate(); }
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) message(error.message, 'error');
    if (data.session?.user) showWorkspace(data.session.user);
    else showGate();
  });
})();