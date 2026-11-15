// Public browser configuration only. Never expose service-role or secret keys here.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Brug GET til Supabase-konfigurationen." });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const supabasePublishableKey = String(
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
  ).trim();

  return res.status(200).json({
    configured: Boolean(supabaseUrl && supabasePublishableKey),
    supabaseUrl: supabaseUrl || null,
    supabasePublishableKey: supabasePublishableKey || null
  });
};
