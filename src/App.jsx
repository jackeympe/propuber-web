import { useState, useEffect, useRef } from "react";

/* ── TOKENS ────────────────────────────────────────────────── */
const C = {
  black: "#000000",
  coral: "#FF385C",
  coralDark: "#E0284A",
  white: "#FFFFFF",
  offwhite: "#F7F7F7",
  muted: "#717171",
  border: "#EBEBEB",
  cardShadow: "0 4px 24px rgba(0,0,0,0.09)",
};

/* ── DATA ──────────────────────────────────────────────────── */
const LISTINGS = [
  {
    id: 1,
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    title: "Modern Studio, Sandton",
    location: "Johannesburg · Gauteng",
    price: "R 8,500", per: "/mo",
    badge: "For Rent", rating: 4.93, reviews: 128,
    host: "Thabo M.", hostAvatar: "https://i.pravatar.cc/32?img=11",
    beds: 1, baths: 1, sqm: 45,
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
    title: "Family Home, Pretoria East",
    location: "Pretoria · Gauteng",
    price: "R 2,800,000", per: "",
    badge: "For Sale", rating: 4.87, reviews: 64,
    host: "Naledi K.", hostAvatar: "https://i.pravatar.cc/32?img=23",
    beds: 4, baths: 3, sqm: 280,
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
    title: "Co-Work Space CBD",
    location: "Cape Town · Western Cape",
    price: "R 3,200", per: "/mo",
    badge: "Co-Work", rating: 4.98, reviews: 210,
    host: "Amara D.", hostAvatar: "https://i.pravatar.cc/32?img=32",
    beds: 0, baths: 2, sqm: 120,
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
    title: "Luxury Townhouse, Umhlanga",
    location: "Durban · KwaZulu-Natal",
    price: "R 5,200,000", per: "",
    badge: "For Sale", rating: 4.91, reviews: 47,
    host: "Sipho V.", hostAvatar: "https://i.pravatar.cc/32?img=44",
    beds: 3, baths: 2, sqm: 210,
  },
  {
    id: 5,
    img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80",
    title: "Agricultural Plot",
    location: "Polokwane · Limpopo",
    price: "R 950,000", per: "",
    badge: "For Sale", rating: 4.76, reviews: 19,
    host: "Boitumelo R.", hostAvatar: "https://i.pravatar.cc/32?img=56",
    beds: 0, baths: 0, sqm: 5000,
  },
  {
    id: 6,
    img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
    title: "Sea-View Flat, Blouberg",
    location: "Cape Town · Western Cape",
    price: "R 12,000", per: "/mo",
    badge: "For Rent", rating: 4.96, reviews: 183,
    host: "Zara N.", hostAvatar: "https://i.pravatar.cc/32?img=68",
    beds: 2, baths: 2, sqm: 95,
  },
];

const GIGS = [
  { icon: "🔧", title: "Maintenance Tech", pay: "R 280/hr", cat: "Technical", open: 12 },
  { icon: "🧹", title: "Property Cleaner", pay: "R 150/hr", cat: "Cleaning", open: 34 },
  { icon: "🌿", title: "Landscaper", pay: "R 200/hr", cat: "Outdoor", open: 8 },
  { icon: "🚛", title: "Moving Assistant", pay: "R 180/hr", cat: "Logistics", open: 21 },
  { icon: "🎨", title: "Painter", pay: "R 260/hr", cat: "Creative", open: 9 },
  { icon: "📸", title: "Property Photographer", pay: "R 500/hr", cat: "Creative", open: 3 },
];

const PROVINCES = ["All SA", "Gauteng", "Western Cape", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Eastern Cape", "Free State"];

/* ── COMPONENT ─────────────────────────────────────────────── */
export default function PropUberFrontPage() {
  const [liked, setLiked] = useState({});
  const [filter, setFilter] = useState("All SA");
  const [search, setSearch] = useState("");
  const [heroWord, setHeroWord] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [modal, setModal] = useState(null);
  const [gigApplied, setGigApplied] = useState({});
  const heroRef = useRef(null);

  const words = ["Property.", "Income.", "Freedom.", "Community."];

  useEffect(() => {
    const t = setInterval(() => setHeroWord(p => (p + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLike = (id, e) => {
    e?.stopPropagation();
    setLiked(p => ({ ...p, [id]: !p[id] }));
  };

  const filtered = LISTINGS.filter(l => {
    const matchProv = filter === "All SA" || l.location.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.location.toLowerCase().includes(search.toLowerCase());
    return matchProv && matchSearch;
  });

  const badgeStyle = (b) => {
    if (b === "For Rent") return { bg: C.black, color: C.white };
    if (b === "For Sale") return { bg: "#FFF3F5", color: C.coral };
    return { bg: "#E8F5E9", color: "#2E7D32" };
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offwhite, fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', sans-serif", color: C.black, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
        .card{transition:transform .28s cubic-bezier(.25,.8,.25,1),box-shadow .28s;cursor:pointer}
        .card:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(0,0,0,.13)!important}
        .hb{cursor:pointer;border:none;background:none;transition:transform .15s}.hb:hover{transform:scale(1.2)}
        .pill{cursor:pointer;border:none;transition:all .18s;white-space:nowrap}.pill:hover{border-color:#222!important}
        .prov-chip{cursor:pointer;transition:all .18s;border:none}.prov-chip:hover{color:${C.coral}}
        .gcard{transition:box-shadow .2s,transform .2s;cursor:pointer}.gcard:hover{box-shadow:0 8px 28px rgba(0,0,0,.1)!important;transform:translateY(-3px)}
        .cta{cursor:pointer;border:none;transition:background .18s,transform .15s;font-family:inherit}
        .cta:hover{transform:scale(.98)}
        .overlay{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.58);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fIn .2s}
        @keyframes fIn{from{opacity:0}to{opacity:1}}
        .mbox{background:#fff;border-radius:20px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;animation:sUp .22s cubic-bezier(.25,.8,.25,1)}
        @keyframes sUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .word-swap{display:inline-block;animation:wIn .4s cubic-bezier(.25,.8,.25,1)}
        @keyframes wIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .nav-link{cursor:pointer;background:none;border:none;font-family:inherit;transition:color .15s}
        .nav-link:hover{color:${C.black}!important}
        .slash-line::after{content:'';position:absolute;top:0;right:0;width:120px;height:100%;background:${C.offwhite};clip-path:polygon(40px 0,100% 0,100% 100%,0 100%)}
        @media(max-width:640px){.hero-grid{flex-direction:column!important}.hero-cards{display:none!important}}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? C.white : "transparent",
        borderBottom: scrollY > 60 ? `1px solid ${C.border}` : "none",
        transition: "background .3s, border .3s",
        padding: "0 5%", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 68, gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: scrollY > 60 ? C.black : C.white, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s" }}>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 19, color: scrollY > 60 ? C.white : C.black, lineHeight: 1 }}>P</span>
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-.5px", color: scrollY > 60 ? C.black : C.white }}>
            prop<span style={{ color: C.coral }}>uber</span>
          </span>
        </div>

        {/* Search pill (visible after scroll) */}
        {scrollY > 200 && (
          <div style={{
            flex: 1, maxWidth: 360,
            display: "flex", alignItems: "center",
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 40, padding: "9px 16px",
            boxShadow: "0 1px 6px rgba(0,0,0,.08)", gap: 8,
          }}>
            <span style={{ fontSize: 13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search properties..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: C.black, background: "transparent", fontFamily: "inherit" }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {["Explore", "Gig Jobs", "List Property"].map(v => (
            <button key={v} className="nav-link"
              style={{ padding: "8px 13px", borderRadius: 22, fontSize: 13.5, fontWeight: 600, color: scrollY > 60 ? C.muted : "rgba(255,255,255,.8)" }}>
              {v}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: scrollY > 60 ? C.border : "rgba(255,255,255,.25)", margin: "0 4px" }} />
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            border: `1px solid ${scrollY > 60 ? C.border : "rgba(255,255,255,.35)"}`,
            borderRadius: 22, padding: "5px 6px 5px 13px",
            cursor: "pointer", background: scrollY > 60 ? C.white : "rgba(255,255,255,.1)",
            transition: "all .3s",
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, marginRight: 10, color: scrollY > 60 ? C.black : C.white }}>☰</span>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.muted, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13 }}>👤</div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        background: C.black, minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "100px 5% 80px", position: "relative", overflow: "hidden",
      }}>
        {/* Diagonal slash — the signature element */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: "42%", height: "100%",
          background: "linear-gradient(135deg, transparent 0%, rgba(255,56,92,.06) 100%)",
          clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)",
          pointerEvents: "none",
        }} />

        {/* Floating coral dot grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: .045,
          backgroundImage: `radial-gradient(circle, ${C.coral} 1px, transparent 1px)`,
          backgroundSize: "36px 36px", pointerEvents: "none",
        }} />

        <div className="hero-grid" style={{ display: "flex", alignItems: "center", gap: 64, position: "relative" }}>
          {/* Left: copy */}
          <div style={{ flex: "0 0 auto", maxWidth: 580 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,56,92,.14)", border: "1px solid rgba(255,56,92,.3)",
              borderRadius: 100, padding: "5px 14px", marginBottom: 28,
              fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: "1.2px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.coral, display: "inline-block", animation: "pulse 2s infinite" }} />
              SA'S PROPERTY + GIG PLATFORM
            </div>

            <h1 style={{
              fontFamily: "Syne, sans-serif", fontWeight: 800,
              fontSize: "clamp(46px, 7vw, 82px)", lineHeight: 1.02,
              letterSpacing: "-2.5px", color: C.white, marginBottom: 22,
            }}>
              Your next<br />
              <span key={heroWord} className="word-swap" style={{ color: C.coral }}>{words[heroWord]}</span>
            </h1>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,.55)", lineHeight: 1.75, maxWidth: 440, marginBottom: 40 }}>
              Buy, sell and rent across South Africa — then hire local gig workers to move, clean and transform it. One platform. Real impact.
            </p>

            {/* Search bar */}
            <div style={{
              display: "flex", gap: 0, maxWidth: 520,
              background: C.white, borderRadius: 14, padding: 6,
              boxShadow: "0 8px 40px rgba(0,0,0,.35)", marginBottom: 40,
            }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search city, suburb or property type..."
                style={{
                  flex: 1, border: "none", outline: "none",
                  padding: "13px 16px", fontSize: 14, color: C.black,
                  background: "transparent", fontFamily: "inherit",
                }}
              />
              <button className="cta" style={{
                padding: "13px 26px", borderRadius: 10,
                background: C.coral, color: C.white,
                fontSize: 14, fontWeight: 700,
              }}>Search</button>
            </div>

            {/* Quick links */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["🏠 Houses", "🏢 Apartments", "🌾 Farms", "💼 Office Space", "🔧 Gig Work"].map(v => (
                <button key={v} className="pill"
                  style={{
                    padding: "8px 16px", borderRadius: 100,
                    background: "rgba(255,255,255,.07)",
                    border: "1px solid rgba(255,255,255,.18)",
                    color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 500,
                  }}>{v}</button>
              ))}
            </div>
          </div>

          {/* Right: stacked property cards */}
          <div className="hero-cards" style={{ flex: 1, position: "relative", height: 440 }}>
            {[LISTINGS[0], LISTINGS[1], LISTINGS[2]].map((l, i) => (
              <div key={l.id} onClick={() => setModal(l)} style={{
                position: "absolute",
                top: i === 0 ? 0 : i === 1 ? 60 : 30,
                left: i === 0 ? 80 : i === 1 ? 0 : 160,
                width: 240, borderRadius: 18, overflow: "hidden",
                background: C.white, boxShadow: "0 16px 48px rgba(0,0,0,.4)",
                transform: `rotate(${i === 0 ? -3 : i === 1 ? 2 : -1}deg)`,
                transition: "transform .3s", cursor: "pointer",
                zIndex: 3 - i,
              }}>
                <img src={l.img} alt={l.title} style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.black, marginBottom: 3 }}>{l.title}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>{l.location}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: C.black }}>{l.price}<span style={{ fontWeight: 500, fontSize: 12, color: C.muted }}>{l.per}</span></span>
                    <span style={{ fontSize: 11, color: C.coral }}>⭐ {l.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex", gap: "clamp(28px, 5vw, 80px)",
          marginTop: 72, paddingTop: 36,
          borderTop: "1px solid rgba(255,255,255,.08)",
          flexWrap: "wrap",
        }}>
          {[["14,200+", "Active Listings"], ["8,900+", "Gig Workers"], ["R 2.4B+", "Transacted"], ["9 Provinces", "SA Coverage"]].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px,3vw,32px)", color: C.coral }}>{v}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 4, letterSpacing: ".2px" }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROVINCE FILTER STRIP ── */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "0 5%", display: "flex", gap: 0, overflowX: "auto",
        scrollbarWidth: "none", position: "sticky", top: 68, zIndex: 50,
      }}>
        {PROVINCES.map(p => (
          <button key={p} className="prov-chip"
            onClick={() => setFilter(p)}
            style={{
              padding: "18px 20px", fontSize: 13, fontWeight: 600,
              background: "transparent",
              color: filter === p ? C.black : C.muted,
              borderBottom: filter === p ? `2.5px solid ${C.black}` : "2.5px solid transparent",
              flexShrink: 0, whiteSpace: "nowrap", fontFamily: "inherit",
            }}>{p}</button>
        ))}
      </div>

      {/* ── LISTINGS GRID ── */}
      <section style={{ padding: "48px 5% 64px", background: C.offwhite }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px,3vw,30px)", letterSpacing: "-.5px" }}>
            {filter === "All SA" ? "Featured Listings" : `Listings in ${filter}`}
            <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 500, fontSize: 15, color: C.muted, marginLeft: 10 }}>({filtered.length})</span>
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All", "For Sale", "For Rent", "Co-Work"].map(f => (
              <button key={f} className="pill"
                style={{
                  padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                  background: "All" === f ? C.black : C.white,
                  color: "All" === f ? C.white : C.black,
                  border: `1.5px solid ${C.border}`,
                }}>{f}</button>
            ))}
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
        }}>
          {filtered.map(l => {
            const { bg, color } = badgeStyle(l.badge);
            return (
              <div key={l.id} className="card"
                onClick={() => setModal(l)}
                style={{ background: C.white, borderRadius: 18, overflow: "hidden", boxShadow: C.cardShadow }}>
                {/* Image */}
                <div style={{ position: "relative", height: 218, overflow: "hidden" }}>
                  <img src={l.img} alt={l.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .5s" }} />
                  <span style={{
                    position: "absolute", top: 13, left: 13,
                    padding: "3px 11px", borderRadius: 100,
                    background: bg, color, fontSize: 11, fontWeight: 700,
                  }}>{l.badge}</span>
                  <button className="hb" onClick={e => toggleLike(l.id, e)}
                    style={{
                      position: "absolute", top: 11, right: 11,
                      fontSize: 21,
                      filter: liked[l.id] ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,.35))",
                    }}>
                    {liked[l.id] ? "❤️" : "🤍"}
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: "16px 18px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, paddingRight: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.black, lineHeight: 1.25 }}>{l.title}</div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{l.location}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, flexShrink: 0, textAlign: "right" }}>
                      ⭐ {l.rating}<br />
                      <span style={{ fontSize: 10.5 }}>({l.reviews})</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 14, margin: "12px 0", fontSize: 12.5, color: "#555" }}>
                    {l.beds > 0 && <span>🛏 {l.beds}</span>}
                    {l.baths > 0 && <span>🚿 {l.baths}</span>}
                    <span>📐 {l.sqm}m²</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 17, color: C.black }}>{l.price}</span>
                      <span style={{ fontSize: 13, color: C.muted }}>{l.per}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <img src={l.hostAvatar} alt={l.host} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{l.host}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 44 }}>
          <button className="cta" style={{
            padding: "14px 36px", borderRadius: 12,
            background: C.black, color: C.white,
            fontSize: 14.5, fontWeight: 700,
          }}>View all listings →</button>
        </div>
      </section>

      {/* ── GIG ECONOMY STRIP ── */}
      <section style={{ background: C.black, padding: "72px 5%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, letterSpacing: "1.5px", marginBottom: 10 }}>GIG ECONOMY</div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px,3.5vw,36px)", color: C.white, letterSpacing: "-.8px", lineHeight: 1.1 }}>
              Every property<br />creates a job.
            </h2>
          </div>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.45)", maxWidth: 300, lineHeight: 1.7 }}>
            Pick up a gig near any listing — cleaning, maintenance, photography, landscaping, and more.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {GIGS.map(g => (
            <div key={g.title} className="gcard"
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 16, padding: "22px 22px 20px",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(255,56,92,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{g.icon}</div>
                <span style={{ padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", fontSize: 10.5, fontWeight: 600 }}>{g.open} open</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: C.white, marginBottom: 3 }}>{g.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>{g.cat}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.coral }}>{g.pay}</span>
                <button className="cta"
                  onClick={() => setGigApplied(p => ({ ...p, [g.title]: !p[g.title] }))}
                  style={{
                    padding: "8px 18px", borderRadius: 8,
                    background: gigApplied[g.title] ? "rgba(255,255,255,.1)" : C.coral,
                    color: C.white, fontSize: 12.5, fontWeight: 700,
                  }}>
                  {gigApplied[g.title] ? "✓ Applied" : "Apply"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: C.white, padding: "80px 5%" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px,3.5vw,38px)", letterSpacing: "-.8px", marginBottom: 12 }}>
            How <span style={{ color: C.coral }}>PropUber</span> works
          </h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 480, margin: "0 auto" }}>
            Built for South Africa — property ownership and gig income in the same place.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 28, maxWidth: 900, margin: "0 auto" }}>
          {[
            { num: "01", icon: "🏠", title: "List your property", body: "Sellers post for free. Buyers, renters and investors discover it instantly." },
            { num: "02", icon: "🔍", title: "Browse & enquire", body: "Filter by province, property type, budget. Contact the seller directly." },
            { num: "03", icon: "💼", title: "Hire a gig worker", body: "Every listing shows available local gig workers — cleaning, painting, moving." },
            { num: "04", icon: "💰", title: "Get paid or move in", body: "Sellers receive commission, gig workers get paid per job. Tracked in real-time." },
          ].map(s => (
            <div key={s.num} style={{ padding: "28px 24px", borderRadius: 18, background: C.offwhite, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 11, color: C.coral, letterSpacing: "1px", marginBottom: 16 }}>{s.num}</div>
              <div style={{ fontSize: 26, marginBottom: 14 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: C.black, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        background: C.coral, padding: "72px 5%",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 28,
      }}>
        <div>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(26px,4vw,44px)", color: C.white, letterSpacing: "-1px", marginBottom: 10 }}>
            Ready to list or earn?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.75)", maxWidth: 420 }}>
            Join 14,200+ listings and 8,900+ gig workers already on PropUber.co.za
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="cta" style={{
            padding: "15px 32px", borderRadius: 12,
            background: C.black, color: C.white,
            fontSize: 15, fontWeight: 700,
          }}>List a Property</button>
          <button className="cta" style={{
            padding: "15px 32px", borderRadius: 12,
            background: "rgba(255,255,255,.18)", color: C.white,
            border: "2px solid rgba(255,255,255,.35)",
            fontSize: 15, fontWeight: 700,
          }}>Find Gig Work</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.black, color: C.white, padding: "52px 5% 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne", fontWeight: 800, fontSize: 16 }}>P</div>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18 }}>propuber<span style={{ color: C.coral }}>.co.za</span></span>
            </div>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13, maxWidth: 240, lineHeight: 1.65 }}>
              South Africa's property platform connecting buyers, renters, sellers and gig workers.
            </p>
          </div>
          {[
            ["Platform", ["Browse", "Post Property", "Gig Jobs", "Pricing"]],
            ["Support", ["Help Centre", "Safety", "Terms", "Privacy"]],
            ["Company", ["About", "Careers", "Press", "Contact"]],
          ].map(([h, links]) => (
            <div key={h}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: C.white }}>{h}</div>
              {links.map(l => (
                <div key={l} style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 10, cursor: "pointer", transition: "color .15s" }}
                  onMouseEnter={e => e.target.style.color = C.white}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.4)"}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)" }}>© 2025 PropUber (Pty) Ltd · Reg No. 2024/XXXXXX/07</span>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)" }}>🇿🇦 South Africa · ZAR · English</span>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div style={{ position: "relative" }}>
              <img src={modal.img} alt={modal.title}
                style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: "20px 20px 0 0", display: "block" }} />
              <button onClick={() => setModal(null)}
                style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.5)", color: C.white, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <button className="hb" onClick={e => toggleLike(modal.id, e)}
                style={{ position: "absolute", top: 14, left: 14, fontSize: 22, filter: liked[modal.id] ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>
                {liked[modal.id] ? "❤️" : "🤍"}
              </button>
            </div>

            <div style={{ padding: "24px 28px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, flex: 1, paddingRight: 12 }}>{modal.title}</h2>
                <div style={{ fontSize: 13, color: C.muted, textAlign: "right", flexShrink: 0 }}>
                  ⭐ {modal.rating}<br /><span style={{ fontSize: 11 }}>({modal.reviews} reviews)</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 18 }}>📍 {modal.location}</p>

              <div style={{ display: "flex", gap: 18, fontSize: 13.5, color: "#555", marginBottom: 18, flexWrap: "wrap" }}>
                {modal.beds > 0 && <span>🛏 {modal.beds} beds</span>}
                {modal.baths > 0 && <span>🚿 {modal.baths} baths</span>}
                <span>📐 {modal.sqm}m²</span>
              </div>

              <div style={{ padding: "14px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".5px", marginBottom: 10 }}>HOSTED BY</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={modal.hostAvatar} alt={modal.host} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{modal.host}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Verified PropUber host</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 26 }}>{modal.price}</span>
                  <span style={{ fontSize: 14, color: C.muted }}>{modal.per}</span>
                </div>
                <button className="cta" style={{
                  padding: "13px 28px", borderRadius: 12,
                  background: C.coral, color: C.white, fontSize: 15, fontWeight: 700,
                }}>Contact Agent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
