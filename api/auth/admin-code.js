const crypto = require("crypto");

const env = k => String(process.env[k] || "").trim();
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function callOwnerFunction(action) {
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  const secret = env("EDGE_INTERNAL_SECRET");
  if (!url || !key || !secret) throw new Error("Ejerlogin mangler serverkonfiguration.");
  const response = await fetch(url + "/functions/v1/owner-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": "Bearer " + key,
      "x-edge-internal-secret": secret,
      "x-client-ip": String(req.headers["x-forwarded-for"] || req.socket && req.socket.remoteAddress || "unknown").split(",")[0].trim()
    },
    body: JSON.stringify({ action })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = new Error(data.error || "Ejerlogin kunne ikke gennemføres.");
    e.status = response.status;
    throw e;
  }
  return data;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST." });

  const supplied = String(req.body && req.body.code || "");
  const expected = env("ADMIN_CODE");
  if (!expected) return res.status(503).json({ error: "Admin-login er ikke konfigureret." });

  try {
    await callOwnerFunction("check");
    if (!safeEqual(supplied, expected)) {
      try { await callOwnerFunction("fail"); } catch (_) {}
      return res.status(401).json({ error: "Admin-koden er forkert." });
    }
    const session = await callOwnerFunction("login");
    if (!session.access_token || !session.refresh_token) {
      return res.status(503).json({ error: "Ejerlogin returnerede ikke en gyldig session." });
    }
    return res.status(200).json(session);
  } catch (e) {
    const status = e.status === 429 ? 429 : 503;
    return res.status(status).json({ error: e.message || "Ejerlogin kunne ikke gennemføres." });
  }
};
