module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Brug POST." });
  return res.status(410).json({ error: "Admin-login håndteres direkte af den beskyttede Supabase-funktion." });
};
