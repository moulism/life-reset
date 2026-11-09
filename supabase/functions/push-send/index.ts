// Life Reset – odešle připomínky z fronty (lr_push_queue) jako Web Push na zařízení uživatele.
// Volá ji pg_cron každou minutu s hlavičkou x-cron-secret (proto verify_jwt = false).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let cfg: Record<string, string> | null = null;

async function config() {
  if (cfg) return cfg;
  const { data, error } = await sb.from('lr_push_config').select('key,value');
  if (error) throw error;
  cfg = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private);
  return cfg;
}

Deno.serve(async (req) => {
  try {
    const c = await config();
    if (!c.cron_secret || req.headers.get('x-cron-secret') !== c.cron_secret) return new Response('forbidden', { status: 403 });
    const now = Date.now();
    const { data: due, error } = await sb.from('lr_push_queue').select('*')
      .eq('sent', false).lte('at', new Date(now + 30_000).toISOString()).gte('at', new Date(now - 30 * 60_000).toISOString())
      .order('at').limit(300);
    if (error) throw error;
    let sent = 0, gone = 0;
    const users = [...new Set((due || []).map(d => d.user_id))];
    const { data: subs } = users.length ? await sb.from('lr_push_subs').select('*').in('user_id', users) : { data: [] };
    for (const n of due || []) {
      const mine = (subs || []).filter(s => s.user_id === n.user_id);
      for (const s of mine) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.id }), { TTL: 900, urgency: 'high' });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) { await sb.from('lr_push_subs').delete().eq('endpoint', s.endpoint); gone++; }
          else console.error('push fail', code, (e as Error).message);
        }
      }
      await sb.from('lr_push_queue').update({ sent: true }).eq('id', n.id);
    }
    // úklid: staré a propadlé položky
    await sb.from('lr_push_queue').delete().lt('at', new Date(now - 2 * 86400_000).toISOString());
    return new Response(JSON.stringify({ due: (due || []).length, sent, gone }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500 });
  }
});
