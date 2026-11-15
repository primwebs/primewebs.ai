const a = require("../_auth");

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 3000) hits.clear();
  return recent.length > 4;
}
const ipOf = req => String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "unknown").trim();
const OWNER_EMAIL = "primewebssupport@gmail.com";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST." });
  if (!a.supabaseEnabled()) return res.status(503).json({ error: "Supabase-login er ikke konfigureret." });
  if (limited(ipOf(req))) return res.status(429).json({ error: "For mange forsøg. Vent 10 minutter." });

  const email = String((req.body || {}).email || "").trim().toLowerCase();
  if (email !== OWNER_EMAIL) return res.status(200).json({ ok: true, message: "Hvis adressen er godkendt, er der sendt en engangskode." });

  try {
    const base = a.env("SUPABASE_URL").replace(/\/+$/, "");
    const response = await fetch(base + "/auth/v1/otp", {
      method: "POST",
      headers: { apikey: a.env("SUPABASE_PUBLISHABLE_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, create_user: false })
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      return res.status(502).json({ error: detail.msg || detail.message || "Supabase kunne ikke sende login-koden. Prøv igen senere." });
    }
    return res.status(200).json({ ok: true, message: "Login-koden er sendt til ejerens e-mailadresse." });
  } catch (e) {
    return res.status(502).json({ error: "Kunne ikke kontakte Supabase. Prøv igen senere." });
  }
};
