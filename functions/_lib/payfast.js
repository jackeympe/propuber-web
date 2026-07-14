// Cloudflare-native PayFast cash rails — ported from backend/payments.py.
// Cloudflare Workers has no MD5 in Web Crypto, so a compact pure-JS MD5 is embedded.
// Storage uses the CASH KV namespace (binding in wrangler.toml).

// ─────────────────────────── MD5 (RFC 1321, pure JS) ───────────────────────────
function md5(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function au(x, y) {
    const l = (x & 0xFFFF) + (y & 0xFFFF);
    return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF);
  }
  function cmn(q, a, b, x, s, t) { return au(rl(au(au(a, q), au(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function tb(s) {
    const bin = []; const mask = (1 << 8) - 1;
    for (let i = 0; i < s.length * 8; i += 8) bin[i >> 5] |= (s.charCodeAt(i / 8) & mask) << (i % 32);
    return bin;
  }
  function bh(bin) {
    let s = ''; const hc = '0123456789abcdef';
    for (let i = 0; i < bin.length * 4; i++)
      s += hc.charAt((bin[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) + hc.charAt((bin[i >> 2] >> ((i % 4) * 8)) & 0xF);
    return s;
  }
  function utf8(s) { return unescape(encodeURIComponent(s)); }
  function core(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222);
      c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = au(a, oa); b = au(b, ob); c = au(c, oc); d = au(d, od);
    }
    return [a, b, c, d];
  }
  const s = utf8(str);
  return bh(core(tb(s), s.length * 8));
}

// PayFast uses application/x-www-form-urlencoded with spaces as '+' and upper-case %XX.
function pfEncode(v) {
  return encodeURIComponent(String(v).trim())
    .replace(/%20/g, '+')
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// ─────────────────────────── PayFast config ───────────────────────────
const HOSTS = {
  live: 'https://www.payfast.co.za/eng/process',
  sandbox: 'https://sandbox.payfast.co.za/eng/process',
};
const VALIDATE = {
  live: 'https://www.payfast.co.za/eng/query/validate',
  sandbox: 'https://sandbox.payfast.co.za/eng/query/validate',
};
const IP_RANGES = [
  '197.97.145.144/28', '41.74.179.192/27', '102.216.36.0/28',
  '102.216.36.128/28', '144.126.193.139/32',
];

function cfg(env) {
  return {
    merchantId: env.PAYFAST_MERCHANT_ID || '',
    merchantKey: env.PAYFAST_MERCHANT_KEY || '',
    passphrase: env.PAYFAST_PASSPHRASE || '',
    mode: (env.PAYFAST_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox',
  };
}
function liveReady(c) { return !!(c.merchantId && c.merchantKey); }

// Signature over insertion-ordered non-blank fields + passphrase (custom-form order).
function signature(fields, passphrase) {
  const pairs = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === '' || v === null || v === undefined) continue;
    pairs.push(`${k}=${pfEncode(v)}`);
  }
  let query = pairs.join('&');
  if (passphrase) query += `&passphrase=${pfEncode(passphrase)}`;
  return md5(query);
}

// RAIL 1: build a signed checkout payload
export function buildCheckout(env, { amount, item_name, return_url, cancel_url, notify_url, email = '', m_payment_id = '' }) {
  const c = cfg(env);
  const mpid = m_payment_id || `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const fields = {
    merchant_id: c.merchantId,
    merchant_key: c.merchantKey,
    return_url, cancel_url, notify_url,
    email_address: email,
    m_payment_id: mpid,
    amount: Number(amount).toFixed(2),
    item_name,
  };
  fields.signature = signature(fields, c.passphrase);
  return {
    process_url: HOSTS[c.mode], mode: c.mode, live_ready: liveReady(c),
    m_payment_id: mpid, fields,
    note: liveReady(c) ? 'LIVE credentials loaded.' : 'SANDBOX/no creds.',
  };
}

// ITN step 1: source IP whitelist
function ipToLong(ip) { return ip.split('.').reduce((a, o) => (a << 8) + parseInt(o, 10), 0) >>> 0; }
export function isPayfastIp(ip) {
  if (!ip) return false;
  const addr = ipToLong(ip);
  for (const cidr of IP_RANGES) {
    const [net, bits] = cidr.split('/');
    const mask = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0;
    if ((addr & mask) === (ipToLong(net) & mask)) return true;
  }
  return false;
}

// ITN step 2: signature check
export function verifyItn(env, data) {
  const c = cfg(env);
  const received = data.signature || '';
  const check = { ...data };
  delete check.signature;
  return !!received && signature(check, c.passphrase) === received;
}

// ITN step 3: confirm with PayFast server
export async function confirmItn(env, data) {
  const c = cfg(env);
  const body = Object.entries(data).map(([k, v]) => `${k}=${pfEncode(v)}`).join('&');
  try {
    const r = await fetch(VALIDATE[c.mode], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = (await r.text()).trim().split('\n')[0].trim().toUpperCase();
    return text === 'VALID';
  } catch { return false; }
}

// ── KV-backed cash storage (settlements + invoices) ──
export async function recordSettlement(env, { m_payment_id, amount, source, status = 'COMPLETE', pf_payment_id = '' }) {
  const kv = env.CASH;
  const entry = {
    settled_at: new Date().toISOString(), m_payment_id, pf_payment_id,
    amount: Math.round(Number(amount) * 100) / 100, currency: 'ZAR', source, status,
  };
  await kv.put(`settlement:${m_payment_id || crypto.randomUUID()}`, JSON.stringify(entry));
  return entry;
}

export async function settlementTotals(env) {
  const kv = env.CASH;
  let total = 0, count = 0;
  const list = await kv.list({ prefix: 'settlement:' });
  for (const k of list.keys) {
    const v = JSON.parse((await kv.get(k.name)) || '{}');
    if (v.status === 'COMPLETE') { total += Number(v.amount) || 0; count++; }
  }
  return { real_cash_zar: Math.round(total * 100) / 100, settlements: count };
}

export async function createInvoice(env, { client, description, amount, subsidiary = 'SmartBiz Fire Safety', email = '' }) {
  const kv = env.CASH;
  const invoice_id = `INV-${Math.floor(Date.now() / 1000)}-${crypto.randomUUID().slice(0, 6)}`;
  const inv = {
    invoice_id, client, description, amount: Math.round(Number(amount) * 100) / 100,
    currency: 'ZAR', subsidiary, email, status: 'ISSUED',
    created_at: new Date().toISOString(), paid_at: null,
  };
  await kv.put(`invoice:${invoice_id}`, JSON.stringify(inv));
  return inv;
}

export async function listInvoices(env) {
  const kv = env.CASH;
  const list = await kv.list({ prefix: 'invoice:' });
  const items = [];
  for (const k of list.keys) items.push(JSON.parse((await kv.get(k.name)) || '{}'));
  const issued = items.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = items.filter((i) => i.status === 'PAID').reduce((s, i) => s + (i.amount || 0), 0);
  return {
    count: items.length, issued_zar: Math.round(issued * 100) / 100,
    paid_zar: Math.round(paid * 100) / 100,
    outstanding_zar: Math.round((issued - paid) * 100) / 100, items,
  };
}

export async function cashSummary(env) {
  const c = cfg(env);
  const st = await settlementTotals(env);
  const inv = await listInvoices(env);
  return {
    success: true,
    real_cash_collected_zar: st.real_cash_zar,
    settlements: st.settlements,
    invoices_issued_zar: inv.issued_zar,
    invoices_paid_zar: inv.paid_zar,
    invoices_outstanding_zar: inv.outstanding_zar,
    payfast_live_ready: liveReady(c),
  };
}
