// Login med GitHub. Kun aktivt, når alle fire variabler er sat i Vercel.
// Adgang gives kun til den GitHub-konto, der har en bekræftet e-mail, som er lig ALLOWED_EMAIL.
const crypto = require("crypto");

const env = k => String(process.env[k] || "").trim();
const enabled = () => Boolean(env("GITHUB_CLIENT_ID") && env("GITHUB_CLIENT_SECRET") && env("ALLOWED_EMAIL") && env("SESSION_SECRET").length >= 32);

const b64 = s => Buffer.from(s).toString("base64url");
const mac = data => crypto.createHmac("sha256", env("SESSION_SECRET")).update(data).digest("base64url");

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + "." + mac(body);
}
function verify(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(mac(body)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p && p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}
function cookies(req) {
  const out = {};
  String((req.headers || {}).cookie || "").split(";").forEach(c => {
    const i = c.indexOf("=");
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
const cookie = (name, value, maxAge) =>
  name + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge;

function session(req) {
  if (!enabled()) return null;
  const p = verify(cookies(req).pw_session);
  return p && p.email ? { email: p.email } : null;
}
function base(req) {
  const h = req.headers || {};
  return env("PUBLIC_URL").replace(/\/+$/, "") || "https://" + (h["x-forwarded-host"] || h.host);
}

module.exports = { enabled, sign, verify, cookies, cookie, session, base, env };
