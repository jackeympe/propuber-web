// PropUber Cloudflare-native API — all cash rails run here on Pages Functions + KV.
// No external backend. PayFast checkout, ITN webhook, escrow, invoices — all local.
import {
  buildCheckout, isPayfastIp, verifyItn, confirmItn,
  recordSettlement, settlementTotals, createInvoice, listInvoices, cashSummary,
} from '../_lib/payfast.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

async function formToObj(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json();
  const fd = await request.formData();
  const o = {};
  for (const [k, v] of fd.entries()) o[k] = String(v);
  return o;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  const m = request.method;

  try {
    // ── Health ──
    if (p === '/api/health') return json({ status: 'ok', service: 'propuber-cf', approval_threshold_zar: 5000 });

    // ── Cash truth ──
    if (p === '/api/cash/summary') return json(await cashSummary(env));

    // ── RAIL 1: checkout ──
    if (p === '/api/pay/checkout' && m === 'POST') {
      const b = await formToObj(request);
      if (!b.amount || !b.item_name) return json({ success: false, error: 'amount and item_name required' }, 400);
      return json({ success: true, ...buildCheckout(env, b) });
    }

    // ── ITN webhook: 4-step verification ──
    if (p === '/api/pay/notify' && m === 'POST') {
      const data = await formToObj(request);
      const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
      if (ip && !isPayfastIp(ip)) return json({ error: 'ITN not from a PayFast IP' }, 403);
      if (!verifyItn(env, data)) return json({ error: 'Invalid ITN signature' }, 400);
      if (!(await confirmItn(env, data))) return json({ error: 'PayFast did not confirm ITN' }, 400);
      if (data.payment_status === 'COMPLETE') {
        await recordSettlement(env, {
          m_payment_id: data.m_payment_id || '',
          amount: Number(data.amount_gross || 0),
          source: 'payfast', status: 'COMPLETE',
          pf_payment_id: data.pf_payment_id || '',
        });
      }
      return json({ success: true });
    }

    // ── RAIL 2: escrow / settlement ──
    if (p === '/api/settlement/record' && m === 'POST') {
      const b = await formToObj(request);
      return json({ success: true, entry: await recordSettlement(env, b) });
    }
    if (p === '/api/settlement/totals') return json({ success: true, ...(await settlementTotals(env)) });

    // ── RAIL 3: invoices ──
    if (p === '/api/invoice/create' && m === 'POST') {
      const b = await formToObj(request);
      return json({ success: true, invoice: await createInvoice(env, b) });
    }
    if (p === '/api/invoice/list') return json({ success: true, ...(await listInvoices(env)) });

    // ── Static read fallbacks (listings / gigs) ──
    if (p === '/api/listings') return json({ success: true, count: LISTINGS.length, data: LISTINGS });
    if (p === '/api/gigs') return json({ success: true, count: GIGS.length, data: GIGS });

    return json({ success: false, error: 'Not found' }, 404);
  } catch (e) {
    return json({ success: false, error: String(e && e.message || e) }, 500);
  }
}

const LISTINGS = [
  { id: 1, title: 'Modern Studio, Sandton', location: 'Johannesburg · Gauteng', price: 'R 8,500', per: '/mo', badge: 'For Rent', rating: 4.93, reviews: 128, beds: 1, baths: 1, sqm: 45, img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80' },
  { id: 2, title: 'Family Home, Pretoria East', location: 'Pretoria · Gauteng', price: 'R 2,800,000', per: '', badge: 'For Sale', rating: 4.87, reviews: 64, beds: 4, baths: 3, sqm: 280, img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80' },
  { id: 3, title: 'Co-Work Space CBD', location: 'Cape Town · Western Cape', price: 'R 3,200', per: '/mo', badge: 'Co-Work', rating: 4.98, reviews: 210, beds: 0, baths: 2, sqm: 120, img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80' },
  { id: 4, title: 'Luxury Townhouse, Umhlanga', location: 'Durban · KwaZulu-Natal', price: 'R 5,200,000', per: '', badge: 'For Sale', rating: 4.91, reviews: 47, beds: 3, baths: 2, sqm: 210, img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
  { id: 5, title: 'Agricultural Plot', location: 'Polokwane · Limpopo', price: 'R 950,000', per: '', badge: 'For Sale', rating: 4.76, reviews: 19, beds: 0, baths: 0, sqm: 5000, img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80' },
  { id: 6, title: 'Sea-View Flat, Blouberg', location: 'Cape Town · Western Cape', price: 'R 12,000', per: '/mo', badge: 'For Rent', rating: 4.96, reviews: 183, beds: 2, baths: 2, sqm: 95, img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80' },
];
const GIGS = [
  { icon: '🔧', title: 'Maintenance Tech', pay: 'R 280/hr', cat: 'Technical', open: 12 },
  { icon: '🧹', title: 'Property Cleaner', pay: 'R 150/hr', cat: 'Cleaning', open: 34 },
  { icon: '🌿', title: 'Landscaper', pay: 'R 200/hr', cat: 'Outdoor', open: 8 },
  { icon: '🚛', title: 'Moving Assistant', pay: 'R 180/hr', cat: 'Logistics', open: 21 },
  { icon: '🎨', title: 'Painter', pay: 'R 260/hr', cat: 'Creative', open: 9 },
  { icon: '📸', title: 'Property Photographer', pay: 'R 500/hr', cat: 'Creative', open: 3 },
];
