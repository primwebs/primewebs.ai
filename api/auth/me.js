const a = require("../_auth");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!a.enabled()) {
    return res.status(503).json({
      enabled: true,
      authenticated: false,
      adminCodeEnabled: false,
      githubEnabled: false,
      configurationError: true
    });
  }
  const s = a.session(req);
  return res.status(200).json({
    enabled: true,
    authenticated: Boolean(s),
    email: s ? s.email : null,
    adminCodeEnabled: a.adminCodeEnabled(),
    githubEnabled: a.githubEnabled()
  });
};
