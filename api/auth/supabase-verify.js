const a = require("../_auth");

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 3000) hits.clear();
  return recent.length > 8;
}
const ipOf = req => String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "unknown").trim();
const OWNER_EMAIL = "primewebssupport@gmail.com";
const WEEK = 7 * 24 * 60 * 60;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST." });
  if (!a.supabaseEnabled()) return res.status(503).json({ error: "Supabase-login er ikke konfigureret." });
  if (limited(ipOf(req))) return res.status(429).json({ error: "For mange kodeforsøg. Vent 10 minutter." });

  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const token = String(body.token || "").trim().replace(/\s/g, "");
  if (email !== OWNER_EMAIL || !/^\d{6}$/.test(token)) return res.status(400).json({ error: "E-mail eller engangskode er ugyldig." });

  try {
    const base = a.env("SUPABASE_URL").replace(/\/+$/, "");
    const key = a.env("SUPABASE_PUBLISHABLE_KEY");
    const verified = await fetch(base + "/auth/v1/verify", {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, token, type: "email" })
    });
    const authData = await verified.json().catch(() => ({}));
    if (!verified.ok || !authData.access_token || !authData.user || String(authData.user.email || "").toLowerCase() !== OWNER_EMAIL) {
      return res.status(401).json({ error: "Koden er forkert eller udløbet. Bed om en ny kode." });
    }

    const userId = String(authData.user.id || "");
    if (!userId) return res.status(401).json({ error: "Supabase returnerede ikke en gyldig ejerkonto." });
    const query = new URLSearchParams({ id: "eq." + userId, select: "role", limit: "1" });
    const profileResponse = await fetch(base + "/rest/v1/profiles?" + query.toString(), {
      headers: { apikey: key, Authorization: "Bearer " + authData.access_token, Accept: "application/json" }
    });
    const profiles = await profileResponse.json().catch(() => []);
    if (!profileResponse.ok || !Array.isArray(profiles) || !profiles.some(p => p && p.role === "owner")) {
      return res.status(403).json({ error: "Kontoen er ikke registreret som ejer i PRIME WEBS AI." });
    }

    const payload = {
      provider: "supabase",
      role: "owner",
      email: OWNER_EMAIL,
      userId,
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token || null,
      exp: Date.now() + WEEK * 1000
    };
    res.setHeader("Set-Cookie", a.cookie("pw_session", a.sign(payload), WEEK));
    return res.status(200).json({ ok: true, email: OWNER_EMAIL, role: "owner" });
  } catch (e) {
    return res.status(502).json({ error: "Kunne ikke gennemføre login hos Supabase. Prøv igen." });
  }
};
