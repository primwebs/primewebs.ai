const a = require("../_auth");

const done = (res, where, cookies) => {
  res.setHeader("Set-Cookie", cookies);
  res.statusCode = 302;
  res.setHeader("Location", where);
  res.end();
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!a.enabled()) return res.status(404).send("Login er ikke aktiveret.");
  const clear = a.cookie("pw_state", "", 0);
  const url = new URL(req.url, "http://x");
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const saved = a.cookies(req).pw_state;
  if (!code || !state || !saved || state !== saved) return done(res, "/?login=denied", [clear]);
  try {
    const t = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: a.env("GITHUB_CLIENT_ID"), client_secret: a.env("GITHUB_CLIENT_SECRET"), code, redirect_uri: a.base(req) + "/api/auth/callback" })
    }).then(r => r.json());
    if (!t || !t.access_token) return done(res, "/?login=denied", [clear]);
    const emails = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: "Bearer " + t.access_token, Accept: "application/vnd.github+json", "User-Agent": "primewebs-ai" }
    }).then(r => r.json());
    const want = a.env("ALLOWED_EMAIL").toLowerCase();
    const ok = Array.isArray(emails) && emails.some(e => e && e.verified === true && String(e.email).toLowerCase() === want);
    if (!ok) return done(res, "/?login=denied", [clear]);
    const week = 7 * 24 * 3600;
    const token = a.sign({ email: want, exp: Date.now() + week * 1000 });
    return done(res, "/", [clear, a.cookie("pw_session", token, week)]);
  } catch (e) {
    return done(res, "/?login=denied", [clear]);
  }
};
