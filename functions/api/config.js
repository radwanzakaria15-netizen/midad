// Public browser configuration for Supabase Auth. The publishable/anon key is designed for client use.
export async function onRequestGet({ env }) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'إعدادات Supabase غير مكتملة في بيئة Cloudflare.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
  return new Response(JSON.stringify({ url, anonKey: key }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
