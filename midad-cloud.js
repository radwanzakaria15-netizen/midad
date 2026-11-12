/* Midad cloud workspace sync. Relies on Supabase RLS for owner isolation. */
(() => {
  let activeUser = null;
  let saveTimer = null;
  let lastSaved = '';
  let loading = false;

  const clone = value => JSON.parse(JSON.stringify(value || {}));
  const mergeWorkspace = (remote, local) => {
    // Cloud values are the baseline on a second device; only meaningful local
    // profile values override them, never blank/default local defaults.
    const merged = { ...local, ...remote };
    if (local?.teacher && local.teacher !== 'الأستاذ') merged.teacher = local.teacher;
    if (local?.school) merged.school = local.school;
    if (local?.year && local.year !== '2026 / 2027') merged.year = local.year;
    const arrayKeys = ['classes','students','lessons','activities','assessments','attendance','resources','experiences'];
    for (const key of arrayKeys) {
      const cloudRows = Array.isArray(remote?.[key]) ? remote[key] : [];
      const localRows = Array.isArray(local?.[key]) ? local[key] : [];
      const byId = new Map();
      cloudRows.forEach((row, index) => byId.set(row?.id || '__cloud_'+key+'_'+index, row));
      localRows.forEach((row, index) => byId.set(row?.id || '__local_'+key+'_'+index, row));
      merged[key] = Array.from(byId.values());
    }
    return merged;
  };

  async function readCloud(userId) {
    const { data, error } = await window.midadSupabase
      .from('teacher_workspaces')
      .select('workspace,updated_at')
      .eq('owner_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function writeCloud(userId, workspace) {
    const serialized = JSON.stringify(workspace);
    if (serialized.length > 850000) {
      throw new Error('حجم بيانات مساحة العمل كبير للمزامنة الحالية. الملفات المرفقة تحتاج نقلها إلى التخزين السحابي المخصص أولاً.');
    }
    const { error } = await window.midadSupabase
      .from('teacher_workspaces')
      .upsert({ owner_id: userId, workspace, updated_at: new Date().toISOString() }, { onConflict: 'owner_id' });
    if (error) throw error;
    lastSaved = serialized;
  }

  window.midadCloudLoadWorkspace = async (user, localWorkspace) => {
    activeUser = user;
    loading = true;
    try {
      const remote = await readCloud(user.id);
      let result;
      if (!remote) {
        result = clone(localWorkspace);
        await writeCloud(user.id, result);
        if (typeof window.toast === 'function') window.toast('تم إنشاء النسخة السحابية لمساحة عملك.');
      } else {
        result = mergeWorkspace(remote.workspace, localWorkspace);
        const before = JSON.stringify(remote.workspace || {});
        const after = JSON.stringify(result);
        if (before !== after) await writeCloud(user.id, result);
        else lastSaved = after;
        if (typeof window.toast === 'function') window.toast('تم تحميل بياناتك ومزامنتها.');
      }
      return result;
    } finally {
      loading = false;
    }
  };

  window.midadCloudQueueSave = workspace => {
    if (!activeUser || loading) return;
    const snapshot = clone(workspace);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSaved) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await writeCloud(activeUser.id, snapshot);
        if (typeof window.toast === 'function') window.toast('تم حفظ التغييرات سحابياً.');
      } catch (error) {
        console.error('Midad cloud sync:', error);
        if (typeof window.toast === 'function') window.toast(error.message || 'تعذرت المزامنة؛ بياناتك المحلية محفوظة.');
      }
    }, 1200);
  };

  window.midadCloudStop = () => {
    clearTimeout(saveTimer);
    activeUser = null;
    lastSaved = '';
  };
})();