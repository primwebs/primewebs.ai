const a = require("../_auth");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", a.cookie("pw_session", "", 0));
  res.statusCode = 302;
  res.setHeader("Location", "/");
  res.end();
};
