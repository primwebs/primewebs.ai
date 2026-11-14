// Exposes only the public Supabase project URL and publishable/anon key.
// Never expose SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY from this endpoint.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  return res.status(200).json({
    configured: Boolean(url && key),
    supabaseUrl: url,
    supabasePublishableKey: key
  });
};
