import { useState } from "react";

/**
 * SmartBiz / PropUber payment component.
 *
 * Posts to the Cloudflare-native /api/pay/checkout endpoint, which returns a
 * server-signed PayFast payload, then auto-submits to PayFast live checkout.
 * This is safer than a hosted Pay Now button: amount + signature are built
 * server-side and the ITN is verified (IP + signature + confirm) on return.
 *
 * Usage:
 *   <PayButton
 *     itemName="Annual Fire Extinguisher Service"
 *     unitAmount={18500}
 *     email="accounts@client.co.za"
 *     showQuantity
 *     showShipping
 *   />
 */
export default function PayButton({
  itemName = "SmartBiz Group Pty Ltd",
  unitAmount = 5,
  email = "",
  showQuantity = false,
  showShipping = false,
  apiBase = "",
  returnUrl,
  cancelUrl,
  onError,
}) {
  const [qty, setQty] = useState(1);
  const [ship, setShip] = useState({
    line1: "", line2: "", city: "", region: "", country: "", code: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const total = Math.max(0, Number(unitAmount) * Number(qty || 1));
  const fmt = (n) =>
    "R " + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function validate() {
    if (!showShipping) return true;
    const required = ["line1", "city", "region", "country", "code"];
    for (const f of required) {
      if (!String(ship[f] || "").trim()) {
        setErr("Complete all mandatory address fields.");
        return false;
      }
    }
    return true;
  }

  async function pay() {
    setErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${apiBase}/api/pay/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          item_name: itemName,
          email,
          return_url: returnUrl || `${origin}/paid`,
          cancel_url: cancelUrl || `${origin}/cancel`,
          notify_url: `${origin}/api/pay/notify`,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.process_url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      // Build + auto-submit the signed PayFast form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.process_url;
      Object.entries(data.fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      const msg = e?.message || "Payment failed to start.";
      setErr(msg);
      onError?.(e);
      setLoading(false);
    }
  }

  const S = styles;
  return (
    <div style={S.card}>
      <div style={S.brand}>SmartBiz&nbsp;·&nbsp;PropUber</div>
      <div style={S.item}>{itemName}</div>
      <div style={S.amount}>{fmt(total)}</div>

      {showQuantity && (
        <div style={S.row}>
          <label htmlFor="pf-qty" style={S.label}>Quantity</label>
          <input
            id="pf-qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
            style={S.input}
          />
        </div>
      )}

      {showShipping && (
        <div style={S.ship}>
          <div style={S.shipTitle}>Shipping Address</div>
          {[
            ["line1", "Address Line 1 *"],
            ["line2", "Address Line 2"],
            ["city", "City *"],
            ["region", "Province *"],
            ["code", "Postal Code *"],
          ].map(([k, ph]) => (
            <input
              key={k}
              placeholder={ph}
              value={ship[k]}
              onChange={(e) => setShip({ ...ship, [k]: e.target.value })}
              style={S.input}
            />
          ))}
          <select
            value={ship.country}
            onChange={(e) => setShip({ ...ship, country: e.target.value })}
            style={S.input}
          >
            <option value="">- Select Country * -</option>
            <option value="South Africa">South Africa</option>
            <option value="Botswana">Botswana</option>
            <option value="Lesotho">Lesotho</option>
            <option value="Mauritius">Mauritius</option>
            <option value="Mozambique">Mozambique</option>
            <option value="Swaziland">Eswatini (Swaziland)</option>
            <option value="Zimbabwe">Zimbabwe</option>
          </select>
        </div>
      )}

      {err && <div style={S.error}>{err}</div>}

      <button onClick={pay} disabled={loading} style={{ ...S.btn, ...(loading ? S.btnLoading : {}) }}>
        {loading ? "Redirecting to PayFast…" : `Pay ${fmt(total)} →`}
      </button>

      <div style={S.secure}>🔒 Secure PayFast checkout · Merchant 34149035</div>
    </div>
  );
}

const styles = {
  card: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    background: "#151922", color: "#eaeef5", border: "1px solid #232a38",
    borderRadius: 20, padding: 32, maxWidth: 420, width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,.45)", boxSizing: "border-box",
  },
  brand: { fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#8b95a7", marginBottom: 6 },
  item: { fontSize: 16, color: "#c3ccdb", marginBottom: 8 },
  amount: { fontSize: 40, fontWeight: 800, color: "#3ddc84", marginBottom: 20 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 },
  label: { fontSize: 14, color: "#8b95a7" },
  ship: { display: "grid", gap: 10, marginBottom: 16 },
  shipTitle: { fontSize: 14, fontWeight: 700, color: "#c3ccdb", marginBottom: 2 },
  input: {
    background: "#0f131b", border: "1px solid #2a3242", color: "#eaeef5",
    borderRadius: 10, padding: "12px 14px", fontSize: 15, width: "100%", boxSizing: "border-box",
  },
  error: { background: "#2a1416", border: "1px solid #5b2327", color: "#ff9ba3", borderRadius: 10, padding: "10px 14px", fontSize: 14, marginBottom: 14 },
  btn: {
    background: "#3ddc84", color: "#062012", border: 0, borderRadius: 12,
    padding: "16px 28px", fontSize: 16, fontWeight: 700, width: "100%", cursor: "pointer",
  },
  btnLoading: { opacity: 0.7, cursor: "wait" },
  secure: { marginTop: 16, color: "#67718a", fontSize: 12, textAlign: "center" },
};
