const crypto = require("crypto");
const a = require("../_auth");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

function blocked(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}

function matches(given, expected) {
  const x = crypto.createHash("sha256").update(String(given || "")).digest();
  const y = crypto.createHash("sha256").update(String(expected || "")).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST til login." });
  if (!a.adminCodeEnabled()) return res.status(503).json({ error: "Admin Code-login er ikke konfigureret på serveren." });

  const ip = String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "ukendt").trim();
  if (blocked(ip)) return res.status(429).json({ error: "For mange forsøg. Vent 15 minutter, og prøv igen." });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const given = String(body.code || "");
  if (!given || given.length > 128 || !matches(given, a.env("ADMIN_CODE"))) {
    return res.status(401).json({ error: "Admin Code er forkert." });
  }

  const maxAge = 30 * 24 * 60 * 60;
  const email = a.env("ALLOWED_EMAIL").toLowerCase();
  const token = a.sign({ email, exp: Date.now() + maxAge * 1000, method: "admin-code" });
  res.setHeader("Set-Cookie", a.cookie("pw_session", token, maxAge));
  return res.status(200).json({ ok: true });
};
