// Cloudflare Pages Function — proxies /api/* to the PropUber Python backend.
// Set env PROPUBER_BACKEND_URL (e.g. https://your-backend.workers.dev) in the
// CF Pages project settings. If unset, listings/gigs are served statically.
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const backend = env.PROPUBER_BACKEND_URL || "";

  // Static fallback for read endpoints when no backend is configured
  if (!backend) {
    if (url.pathname === "/api/listings") {
      return Response.json({ success: true, count: 6, data: LISTINGS, _source: "static-fallback" });
    }
    if (url.pathname === "/api/gigs") {
      return Response.json({ success: true, count: 6, data: GIGS, _source: "static-fallback" });
    }
    return Response.json(
      { success: false, error: "Backend not configured. Set PROPUBER_BACKEND_URL in Pages env." },
      { status: 503 }
    );
  }

  // Proxy everything else to the live Python backend
  const target = backend.replace(/\/$/, "") + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  const res = await fetch(target, { method: request.method, headers, body: request.body });
  return new Response(res.body, { status: res.status, headers: res.headers });
}

const LISTINGS = [
  { id: 1, title: "Modern Studio, Sandton", location: "Johannesburg · Gauteng", price: "R 8,500", per: "/mo", badge: "For Rent", rating: 4.93, reviews: 128, beds: 1, baths: 1, sqm: 45, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80" },
  { id: 2, title: "Family Home, Pretoria East", location: "Pretoria · Gauteng", price: "R 2,800,000", per: "", badge: "For Sale", rating: 4.87, reviews: 64, beds: 4, baths: 3, sqm: 280, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80" },
  { id: 3, title: "Co-Work Space CBD", location: "Cape Town · Western Cape", price: "R 3,200", per: "/mo", badge: "Co-Work", rating: 4.98, reviews: 210, beds: 0, baths: 2, sqm: 120, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80" },
  { id: 4, title: "Luxury Townhouse, Umhlanga", location: "Durban · KwaZulu-Natal", price: "R 5,200,000", per: "", badge: "For Sale", rating: 4.91, reviews: 47, beds: 3, baths: 2, sqm: 210, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" },
  { id: 5, title: "Agricultural Plot", location: "Polokwane · Limpopo", price: "R 950,000", per: "", badge: "For Sale", rating: 4.76, reviews: 19, beds: 0, baths: 0, sqm: 5000, img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80" },
  { id: 6, title: "Sea-View Flat, Blouberg", location: "Cape Town · Western Cape", price: "R 12,000", per: "/mo", badge: "For Rent", rating: 4.96, reviews: 183, beds: 2, baths: 2, sqm: 95, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
];

const GIGS = [
  { icon: "🔧", title: "Maintenance Tech", pay: "R 280/hr", cat: "Technical", open: 12 },
  { icon: "🧹", title: "Property Cleaner", pay: "R 150/hr", cat: "Cleaning", open: 34 },
  { icon: "🌿", title: "Landscaper", pay: "R 200/hr", cat: "Outdoor", open: 8 },
  { icon: "🚛", title: "Moving Assistant", pay: "R 180/hr", cat: "Logistics", open: 21 },
  { icon: "🎨", title: "Painter", pay: "R 260/hr", cat: "Creative", open: 9 },
  { icon: "📸", title: "Property Photographer", pay: "R 500/hr", cat: "Creative", open: 3 },
];
