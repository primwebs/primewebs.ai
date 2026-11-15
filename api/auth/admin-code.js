const crypto = require("crypto");
const a = require("../_auth");

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function limited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}

function sameSecret(given, expected) {
  const x = crypto.createHash("sha256").update(String(given || "")).digest();
  const y = crypto.createHash("sha256").update(String(expected || "")).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST." });
  if (!a.adminCodeEnabled()) return res.status(503).json({ error: "Admin-login er ikke konfigureret endnu." });

  const ip = String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "ukendt").trim();
  if (limited(ip)) return res.status(429).json({ error: "For mange forsøg. Vent 15 minutter, og prøv igen." });

  const body = req.body || {};
  if (!sameSecret(body.code, a.env("ADMIN_CODE"))) {
    return res.status(401).json({ error: "Admin-koden er forkert." });
  }

  const week = 7 * 24 * 3600;
  const token = a.sign({ role: "admin", email: "Admin", exp: Date.now() + week * 1000 });
  res.setHeader("Set-Cookie", a.cookie("pw_session", token, week));
  return res.status(200).json({ ok: true, role: "admin" });
};
