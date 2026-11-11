// PRIME WEBS AI — server-side Anthropic adapter
// Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Optional: set ANTHROPIC_MODEL. The key is never sent to the browser.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are the production website-generation engine for PRIME WEBS AI.
Return ONLY valid JSON, no markdown fences or commentary.
The JSON must have this shape:
{"site":{"v":1,"meta":{"title":"...","theme":{"accent":"#2540D9","font":"sans","mode":"light"}},"blocks":[...]}, "reply":"short Danish explanation"}
Allowed block types:
hero: {id,type:"hero",title,text,cta}
features: {id,type:"features",title,items:[{t,d},{t,d},{t,d}]}
about: {id,type:"about",title,text}
contact: {id,type:"contact",title,text,email,phone}
services: {id,type:"services",title,items:[{t,d},...]} (4-6 concrete services)
steps: {id,type:"steps",title,items:[{t,d},...]} (3-5 steps)
faq: {id,type:"faq",title,items:[{t,d},...]} (t is the question, d the answer; 4-6 items)
cta: {id,type:"cta",title,text,cta}
Keep all content specific, useful, polished, and in the language requested by the user (Danish by default).
Use realistic business copy, clear calls to action, and no fabricated certifications, awards, addresses, reviews, or guarantees.
For generate, create a rich, complete first version with these blocks in this order: hero, features (4-6 items), services, about, steps, faq, cta, contact. Write substantial, specific copy: the hero text is 2-3 sentences, the about text is two short paragraphs separated by a blank line, and every item description is 1-2 full sentences. Base everything on the business description. Where facts are missing, write general, honest copy and never invent prices, years of experience, numbers, addresses, names or reviews.
For edit, preserve the existing site structure and content unless the user asks to change it. Apply the requested change to the site JSON. Keep existing block IDs where possible and add IDs to new blocks.
Theme accent must be a valid hex color; font must be "sans" or "serif"; mode must be "light" or "dark".`;

function extractJSON(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("AI'en returnerede ikke gyldig JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

// --- Sikkerhed: adgangskode, begrænsning og validering ---
const crypto = require("crypto");
const hits = new Map(); // simpel begrænsning pr. IP (nulstilles, når serverinstansen genstarter)
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function codeOk(given) {
  const expected = String(process.env.ACCESS_CODE || "");
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(String(given || "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const TEXT_FIELDS = { hero: ["title", "text", "cta"], about: ["title", "text"], cta: ["title", "text", "cta"], contact: ["title", "text", "email", "phone"] };
const str = (v, n) => String(v == null ? "" : v).slice(0, n);

// Sikrer, at AI'ens svar kun indeholder kendte blokke og gyldige værdier.
function sanitizeSite(site) {
  const meta = site.meta || {};
  const t = meta.theme || {};
  const out = {
    v: 1,
    meta: {
      title: str(meta.title, 160),
      theme: {
        accent: /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : "#2540D9",
        font: t.font === "serif" ? "serif" : "sans",
        mode: t.mode === "dark" ? "dark" : "light"
      }
    },
    blocks: []
  };
  for (const b of site.blocks.slice(0, 12)) {
    if (!b || typeof b !== "object") continue;
    const id = str(b.id, 40) || Math.random().toString(36).slice(2, 9);
    if (["features", "services", "steps", "faq"].includes(b.type)) {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(i => ({ t: str(i && i.t, 160), d: str(i && i.d, 600) }));
      out.blocks.push({ id, type: b.type, title: str(b.title, 160), items });
    } else if (TEXT_FIELDS[b.type]) {
      const o = { id, type: b.type };
      TEXT_FIELDS[b.type].forEach(k => { o[k] = str(b[k], k === "text" ? 1200 : 160); });
      out.blocks.push(o);
    }
  }
  if (!out.blocks.length) throw new Error("AI'en returnerede ingen gyldige blokke.");
  return out;
}

function extra(b) {
  const t = (k, n) => String(b[k] || "").trim().slice(0, n);
  const parts = [];
  if (t("industry", 60)) parts.push("Industry: " + t("industry", 60));
  if (t("city", 80)) parts.push("City or area: " + t("city", 80));
  if (t("services", 400)) parts.push("Services to feature (use exactly these as the services block): " + t("services", 400));
  if (t("tone", 40)) parts.push("Tone of voice: " + t("tone", 40));
  parts.push("Language of all copy: " + (t("language", 20) || "Danish"));
  if (/^#[0-9a-fA-F]{6}$/.test(t("color", 7))) parts.push("Use exactly this accent color in theme.accent: " + t("color", 7));
  const em = t("email", 120), ph = t("phone", 40);
  parts.push("Contact block: " + (em || ph ? "use exactly this email '" + em + "' and phone '" + ph + "' and do not invent any other contact details" : "do not invent contact details; leave email and phone as empty strings"));
  return "\n" + parts.join("\n");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Brug POST til AI-generatoren." });
  }
  const ip = String(((req.headers || {})["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "ukendt").trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "For mange forespørgsler. Vent et minut, og prøv igen." });
  }
  const auth = require("./_auth");
  if (auth.enabled() && !auth.session(req)) {
    return res.status(401).json({ error: "Log ind for at bruge AI-generatoren." });
  }
  if (!process.env.ACCESS_CODE) {
    return res.status(503).json({ error: "AI-generatoren er låst, indtil ACCESS_CODE er sat under Vercel → Settings → Environment Variables." });
  }
  if (!codeOk((req.headers || {})["x-access-code"])) {
    return res.status(401).json({ error: "Adgangskoden mangler eller er forkert. Skriv den under Indstillinger → AI-adgangskode." });
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
      "\nStyle preference: " + String(body.style || "Moderne").slice(0, 40) + extra(body)
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
        max_tokens: 9000,
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
      site: sanitizeSite(parsed.site),
      reply: String(parsed.reply || (action === "generate" ? "Din hjemmeside er genereret. Fortæl mig, hvad du vil ændre." : "Ændringerne er udført.")).slice(0, 1000)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Der opstod en fejl i AI-generatoren." });
  }
};
