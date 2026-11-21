// PRIME WEBS AI — DomainNameAPI test-environment availability search.
// Search only: this endpoint cannot register, renew, transfer, or charge for domains.
const DNA_BASE_URL = "https://ote.domainresellerapi.com";
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 3000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Brug POST til domænesøgning." });
  }

  const ip = String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] ||
    (req.socket && req.socket.remoteAddress) || "unknown").trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "For mange søgninger. Vent et minut, og prøv igen." });
  }

  // Require the same signed-in Supabase user session as the AI endpoint.
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const authorization = String((req.headers || {}).authorization || "");
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

  if (!supabaseUrl || !publishableKey) {
    return res.status(503).json({ error: "Supabase-serverkonfigurationen mangler i Vercel." });
  }
  if (!token) return res.status(401).json({ error: "Log ind for at søge efter domæner." });

  try {
    const verified = await fetch(supabaseUrl.replace(/\/+$/, "") + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: "Bearer " + token }
    });
    if (!verified.ok) return res.status(401).json({ error: "Din login-session er udløbet. Log ind igen." });
  } catch (_) {
    return res.status(503).json({ error: "Kunne ikke kontrollere din login-session." });
  }

  const apiKey = String(process.env.DNA_TEST_API_KEY || "").trim();
  const resellerId = String(process.env.DNA_RESELLER_ID || "").trim();
  if (!apiKey || !resellerId) {
    return res.status(503).json({
      error: "DomainNameAPI mangler testopsætning i Vercel. Tilføj DNA_TEST_API_KEY og DNA_RESELLER_ID."
    });
  }

  const domainName = String((req.body || {}).domainName || "").trim().toLowerCase();
  if (!domainName || domainName.length > 253 || !domainName.includes(".") ||
      !/^[a-z0-9.-]+$/.test(domainName) ||
      domainName.split(".").some(label => !label || label.length > 63 ||
        label.startsWith("-") || label.endsWith("-"))) {
    return res.status(400).json({ error: "Skriv et gyldigt domænenavn, fx eksempel.com." });
  }

  const correlationId = "primewebs-domain-search-" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 8);

  try {
    const upstream = await fetch(DNA_BASE_URL + "/api/v1/domains/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "__reseller": resellerId,
        "X-Correlation-ID": correlationId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domainName })
    });

    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) {
      return res.status(upstream.status || 502).json({
        error: upstream.status === 401
          ? "DomainNameAPI afviste testlogin. Kontrollér, at testnøglen bruges sammen med testadressen."
          : "DomainNameAPI returnerede et svar, som ikke kunne læses.",
        correlationId
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.reason || data.message || "Domænesøgningen kunne ikke gennemføres.",
        code: data.code || null,
        correlationId
      });
    }

    // DNA success means the lookup completed; info.status determines availability.
    return res.status(200).json({
      success: true,
      info: data.info || null,
      reason: data.reason || null,
      correlationId
    });
  } catch (_) {
    return res.status(502).json({
      error: "Kunne ikke oprette forbindelse til DomainNameAPI's testmiljø.",
      correlationId
    });
  }
};
