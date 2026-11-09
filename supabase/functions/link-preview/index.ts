// Life Reset – náhled odkazu pro wishlist: z URL e-shopu vytáhne název, fotku a cenu.
// Volá ho jen přihlášený uživatel (verify_jwt). Bere jen veřejné http(s) adresy.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function isPrivate(host: string) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return h.startsWith('[') || h.includes(':');
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).trim();

function meta(html: string, names: string[]) {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${n}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m) return decode(m[1]);
  }
  return '';
}
function findProduct(node: any): any {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const r = findProduct(n); if (r) return r; } return null; }
  const t = node['@type'];
  if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) return node;
  if (node['@graph']) return findProduct(node['@graph']);
  return null;
}
function fromJsonLd(html: string) {
  const out: Record<string, string> = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const p = findProduct(JSON.parse(m[1].trim()));
      if (!p) continue;
      out.title = out.title || p.name || '';
      const img = Array.isArray(p.image) ? p.image[0] : p.image;
      out.image = out.image || (typeof img === 'string' ? img : img?.url) || '';
      let o = p.offers;
      if (Array.isArray(o)) o = o[0];
      if (o) {
        const price = o.price ?? o.lowPrice ?? o.priceSpecification?.price;
        if (price != null && !out.price) { out.price = String(price); out.currency = o.priceCurrency || o.priceSpecification?.priceCurrency || ''; }
      }
    } catch { /* špatné JSON-LD */ }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { url } = await req.json();
    let u: URL;
    try { u = new URL(String(url)); } catch { return json({ error: 'Neplatný odkaz' }, 400); }
    if (!/^https?:$/.test(u.protocol) || isPrivate(u.hostname)) return json({ error: 'Nepodporovaný odkaz' }, 400);
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 9000);
    const res = await fetch(u.toString(), {
      redirect: 'follow', signal: ctl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(to);
    const final = new URL(res.url || u.toString());
    if (isPrivate(final.hostname)) return json({ error: 'Nepodporovaný odkaz' }, 400);
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const dec = new TextDecoder();
      let size = 0;
      while (size < 1_500_000) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        html += dec.decode(value, { stream: true });
      }
      try { await reader.cancel(); } catch { /* */ }
    }
    const ld = fromJsonLd(html);
    const title = ld.title || meta(html, ['og:title', 'twitter:title']) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
    let image = ld.image || meta(html, ['og:image', 'og:image:secure_url', 'twitter:image', 'image']);
    if (image) { try { image = new URL(image, final).toString(); } catch { image = ''; } }
    const price = ld.price || meta(html, ['product:price:amount', 'og:price:amount', 'price', 'twitter:data1']);
    const currency = ld.currency || meta(html, ['product:price:currency', 'og:price:currency', 'priceCurrency']);
    const site = meta(html, ['og:site_name']) || final.hostname.replace(/^www\./, '');
    const num = price ? parseFloat(String(price).replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(/,(\d{1,2})$/, '.$1').replace(/,/g, '')) : null;
    return json({ ok: res.ok, status: res.status, url: final.toString(), title: title.slice(0, 200), image, price: num && !isNaN(num) ? num : null, currency: currency || (num ? 'CZK' : ''), site });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
