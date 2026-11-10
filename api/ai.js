// PRIME WEBS AI — server-side Anthropic adapter
// Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Optional: set ANTHROPIC_MODEL. The key is never sent to the browser.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const SYSTEM = `You are the production website-generation engine for PRIME WEBS AI.
Return ONLY valid JSON, no markdown fences or commentary.
The JSON must have this shape:
{"site":{"v":1,"meta":{"title":"...","theme":{"accent":"#2540D9","font":"sans","mode":"light"}},"blocks":[...]}, "reply":"short Danish explanation"}
Allowed block types:
hero: {id,type:"hero",title,text,cta}
features: {id,type:"features",title,items:[{t,d},{t,d},{t,d}]}
about: {id,type:"about",title,text}
contact: {id,type:"contact",title,text,email,phone}
Keep all content specific, useful, polished, and in the language requested by the user (Danish by default).
Use realistic business copy, clear calls to action, and no fabricated certifications, awards, addresses, reviews, or guarantees.
For generate, create a complete coherent first version with all four block types.
For edit, preserve the existing site structure and content unless the user asks to change it. Apply the requested change to the site JSON. Keep existing block IDs where possible and add IDs to new blocks.
Theme accent must be a valid hex color; font must be "sans" or "serif"; mode must be "light" or "dark".`;

function extractJSON(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("AI'en returnerede ikke gyldig JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Brug POST til AI-generatoren." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: "AI-generatoren er klar i koden, men mangler en API-nøgle. Tilføj ANTHROPIC_API_KEY under Vercel → Settings → Environment Variables."
    });
  }
  const body = req.body || {};
  const action = body.action;
  if (!["generate", "edit"].includes(action)) return res.status(400).json({ error: "Ukendt AI-handling." });
  if (action === "generate" && (!body.name || !String(body.name).trim())) {
    return res.status(400).json({ error: "Virksomhedens navn mangler." });
  }
  if (action === "edit" && (!body.site || !body.message)) {
    return res.status(400).json({ error: "Hjemmeside eller ændringsbesked mangler." });
  }

  const task = action === "generate"
    ? "Create a new website for this business. Return the complete site JSON.\nBusiness: " + String(body.name).slice(0, 160) +
      "\nDescription: " + String(body.description || "").slice(0, 5000) +
      "\nStyle preference: " + String(body.style || "Moderne")
    : "Edit this existing website according to the user's request. Return the complete updated site JSON.\nCurrent site: " +
      JSON.stringify(body.site).slice(0, 24000) + "\nUser request: " + String(body.message).slice(0, 3000);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 7000,
        system: SYSTEM,
        messages: [{ role: "user", content: task }]
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      const detail = result && result.error && result.error.message;
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: detail || "AI-udbyderen afviste forespørgslen. Kontrollér API-nøgle og model."
      });
    }
    const text = (result.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
    const parsed = extractJSON(text);
    if (!parsed.site || !Array.isArray(parsed.site.blocks) || !parsed.site.meta) {
      throw new Error("AI'en returnerede en ufuldstændig hjemmeside.");
    }
    return res.status(200).json({
      site: parsed.site,
      reply: String(parsed.reply || (action === "generate" ? "Din hjemmeside er genereret. Fortæl mig, hvad du vil ændre." : "Ændringerne er udført.")).slice(0, 1000)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Der opstod en fejl i AI-generatoren." });
  }
};
