const a = require("../_auth");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const s = a.session(req);
  return res.status(200).json({
    enabled: a.enabled(),
    supabaseEnabled: a.supabaseEnabled(),
    authenticated: Boolean(s),
    email: s ? s.email : null,
    role: s ? s.role : null,
    provider: s ? s.provider : null
  });
};
