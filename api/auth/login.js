const crypto = require("crypto");
const a = require("../_auth");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!a.enabled()) return res.status(404).send("Login er ikke aktiveret.");
  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader("Set-Cookie", a.cookie("pw_state", state, 600));
  const q = new URLSearchParams({
    client_id: a.env("GITHUB_CLIENT_ID"),
    redirect_uri: a.base(req) + "/api/auth/callback",
    scope: "user:email",
    state,
    allow_signup: "false"
  });
  res.statusCode = 302;
  res.setHeader("Location", "https://github.com/login/oauth/authorize?" + q);
  res.end();
};
