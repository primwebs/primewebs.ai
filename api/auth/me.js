const a = require("../_auth");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!a.enabled()) return res.status(200).json({ enabled: false, authenticated: false });
  const s = a.session(req);
  return res.status(200).json(s ? { enabled: true, authenticated: true, email: s.email } : { enabled: true, authenticated: false });
};
