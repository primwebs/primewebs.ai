// PRIME WEBS AI — server-side Anthropic adapter
// Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Optional: set ANTHROPIC_MODEL. The key is never sent to the browser.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// Accept the exact environment-variable name already saved in Vercel (it was entered with a typo).
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.anthropec_api_key;

const SYSTEM = `You are the production website-generation engine for PRIME WEBS AI.
Return ONLY valid JSON, no markdown fences or commentary.
The JSON must have this shape:
{"site":{"v":1,"meta":{"title":"...","language":"da","theme":{"accent":"#2540D9","font":"sans","mode":"light"}},"blocks":[...]}, "reply":"short Danish explanation"}
Allowed block types:
hero: {id,type:"hero",title,text,cta}
features: {id,type:"features",title,items:[{t,d},{t,d},{t,d}]}
about: {id,type:"about",title,text}
contact: {id,type:"contact",title,text,email,phone,address,whatsapp}
reviews: {id,type:"reviews",title,items:[{name,text,rating}]} (ONLY genuine reviews supplied by the user; never invent testimonials or ratings)
map: {id,type:"map",title,address} (only when a real full business address is explicitly supplied)
services: {id,type:"services",title,items:[{t,d},...]} (4-6 concrete services)
steps: {id,type:"steps",title,items:[{t,d},...]} (3-5 steps)
faq: {id,type:"faq",title,items:[{t,d},...]} (t is the question, d the answer; 4-6 items)
cta: {id,type:"cta",title,text,cta}
gallery: {id,type:"gallery",title,images:["img:..." or https URL]} (only keep existing images, never create any)\nbooking: {id,type:"booking",title,text,cta} (separate booking page link and booking form)
pricing: {id,type:"pricing",title,items:[{t,d,price}]} (only use exact prices supplied by the user or existing site)
team: {id,type:"team",title,items:[{t,d}]} (only use real names and roles supplied by the user or existing site)
hero and about may also have an "image" field: keep it exactly as given and never invent image URLs
Keep all content specific, useful, polished, and in the language requested by the user (Danish by default).
Use realistic business copy, clear calls to action, and no fabricated certifications, awards, addresses, reviews, ratings, social accounts, or guarantees. Add a WhatsApp action when a real phone number is supplied (use the same number, normalized to digits, only if the user confirms it is WhatsApp-enabled). Add a map block only when an exact business address is explicitly supplied. Add a reviews block only when genuine review text, reviewer names and ratings are provided in the request or existing site; otherwise omit it. Include contact.address and contact.whatsapp only when provided.
For generate, create a rich, complete first version with these blocks in this order: hero, features (4-6 items), services, about, steps, faq, cta, contact. Add map only when a full address is supplied; add reviews only when genuine supplied reviews exist. If the user asks for online booking, appointments, reservations, or a booking system, also include a booking block before contact so the renderer adds a separate booking page. Write substantial, specific copy: the hero text is 2-3 sentences, the about text is two short paragraphs separated by a blank line, and every item description is 1-2 full sentences. Base everything on the business description. Where facts are missing, write general, honest copy and never invent prices, years of experience, numbers, addresses, names or reviews.
For edit, use the latest request together with recent conversation context. Short replies such as “all”, “everything”, “yes”, or “do that” refer to the immediately preceding assistant question or proposal; do not call them unclear when the context resolves them. If the user asks for a whole-site redesign, redesign the complete visual system, not just buttons: update theme.accent, theme.background, theme.surface, theme.text, font/mode as appropriate, and rewrite/reorganize relevant blocks while preserving true business facts and contact details. If the user asks to change the main/page color (for example “make it red”), set both theme.accent and theme.background to suitable coordinated shades so the entire page visibly changes, not only CTA buttons. For ordinary targeted edits, preserve unrelated content and structure. Always return the complete updated site JSON, keep existing block IDs where possible, and add IDs to new blocks. Never claim that a change was made unless the returned JSON actually contains it.
NATURAL BUSINESS SECTIONS:
The renderer supports pricing and team sections. Add a pricing section only when the user has supplied actual prices or price ranges; preserve the exact amounts and currency and never invent a price. Add a team section only when the user has supplied real team-member names and roles; never invent employees, biographies or portraits. A pricing item uses t for the package/service name, price for the supplied price text, and d for a concise explanation. A team item uses t for the person's supplied name and d for their supplied role or verified description. Do not add empty sections.
AI COLLABORATION AND REAL-WORLD WEBSITE QUALITY:
Behave like an experienced website strategist working together with the user, not like a one-shot text generator. Understand the business, audience, goal and requested style from the full conversation. If a critical fact is missing, ask at most one focused question; otherwise make sensible design/content decisions and keep moving. In the reply, explain briefly what you actually created or changed and suggest one useful next improvement, without claiming integrations or actions that are not implemented.
Create natural, complete business websites using the supported blocks: hero, features, services, about, steps, faq, cta, gallery, booking, contact, reviews and map. Choose only sections that genuinely fit the business; organize them in a persuasive, human reading order. Include practical details visitors expect where supported by the user's information: clear service descriptions, pricing only when supplied, opening hours only when supplied, who the service is for, how the process works, answers to common questions, a clear contact route and a strong next step. Make copy sound specific and natural, not repetitive AI filler. Avoid repeating the same CTA wording in every section. Use meaningful headings, useful descriptions and realistic customer journeys.
When a booking system is requested, include the booking block and make every booking CTA lead to the dedicated booking screen. Make the booking flow clear about what information is requested and that a booking is only confirmed after the business responds unless a real-time booking integration is actually connected. Never pretend that a mailto form stores bookings, sends automatically, checks availability or confirms appointments.
When contact, phone, email, WhatsApp, address, reviews, opening hours, prices, social links or business credentials are absent, do not invent them. Do not insert placeholder buttons or fake links. Use only the facts supplied by the user or already present in the current site. Keep the site editable and consistent: preserve existing IDs and real information during targeted edits, and do not remove working sections unless requested.
For every AI edit, understand natural-language follow-ups such as “make it more premium”, “add more details”, “make it look like a real company website”, “change everything” and “keep the rest”. Apply the requested scope to the actual JSON, not just the explanatory reply. For a full redesign, revisit every relevant section and the complete theme; for a targeted request, preserve unrelated work.
For every new website, act as a senior art director and responsive web designer. Do not output a generic template, a blank white canvas, or a stack of identical white cards. First choose one coherent visual concept that fits the business, then apply it consistently to the hero, page background, navigation, section surfaces, cards, buttons, and footer. Always set theme.accent, theme.background, theme.backgroundStyle (valid CSS linear-gradient(...) or radial-gradient(...) using hex colors only), theme.surface, theme.text, theme.font, theme.mode, and theme.radius. Prioritize excellent mobile-first layouts, readable contrast, accessible button labels, clear heading hierarchy, concise navigation, fast-scanning content, and conversion-focused calls to action. Use varied section layouts and purposeful visual rhythm rather than repeating identical cards. Include SEO-friendly page titles and headings, natural local search terms only when location is supplied, and clear contact pathways. Never claim schema markup, analytics, live chat, payment, booking availability, or integrations unless implemented by the platform. Every generated website MUST have a clearly visible, intentional page-background gradient with at least two coordinated color stops; use richer, more distinctive color palettes rather than defaulting to pale gray/white. Choose dark, saturated, warm, earthy, ocean, or premium palettes when suitable for the industry, while maintaining readable contrast. The page background must remain visible around and between sections; use alternating translucent or tinted section surfaces so the whole page feels like one designed system. Use the same palette and visual language throughout every section. Make the hero visually distinctive and substantial, with a confident headline, short supporting copy, clear CTA, layered gradient treatment, and visual depth created with CSS surfaces/shapes rather than fabricated photographs. Use varied full-width section compositions, asymmetric layouts where appropriate, editorial headings, generous spacing, strong typography, rounded corners, subtle borders, restrained shadows, and clear visual hierarchy. Cards should not all have the same layout: vary feature, service, process, FAQ, gallery and CTA compositions while preserving a coherent system. Build a complete first version with meaningful content and no empty/placeholder sections. Responsive design is mandatory: assume mobile-first, avoid fixed widths, use flexible grids, fluid typography, wrapping navigation, touch-friendly buttons, and ensure no horizontal overflow at 320px, 375px, 768px, and desktop widths. Keep all content readable and buttons usable on small screens. On edits, interpret requests for more modern/professional/advanced design as a request to improve the complete visual system, not just text or buttons. For whole-site redesigns, redesign all relevant sections while preserving true business facts, images, contact details and IDs where possible. Add a gallery only when real image URLs already exist in the current site or request; never invent image URLs or fake photographs. If no real images exist, create visual richness with coordinated gradients, CSS shapes, layered surfaces and typographic composition. Never claim a visual change unless the returned JSON contains the corresponding theme and content changes. Theme accent/background/surface/text must be valid hex colors; backgroundStyle must be a CSS linear-gradient or radial-gradient using hex colors only; font must be "sans" or "serif"; mode must be "light" or "dark"; radius must be "medium" or "large".`;

function extractJSON(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("AI'en returnerede ikke gyldig JSON.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

// --- Sikkerhed: begrænsning og validering ---
const hits = new Map();
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

const TEXT_FIELDS = { hero: ["title", "text", "cta"], about: ["title", "text"], cta: ["title", "text", "cta"], contact: ["title", "text", "email", "phone", "address", "whatsapp"] };
const str = (v, n) => String(v == null ? "" : v).slice(0, n);
const hexLum = h => { const n = parseInt(String(h).slice(1), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000; };
const gradientIsVisible = value => {
  const stops = [...String(value || "").matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toUpperCase());
  return new Set(stops).size >= 2 && stops.some(c => hexLum(c) < 242);
};

// Sikrer, at AI'ens svar kun indeholder kendte blokke og gyldige værdier.
const imgRef = v => { const s = String(v || ""); return (/^img:[a-z0-9]{3,12}$/.test(s) || /^https?:\/\/[^\s"'<>]{1,500}$/i.test(s)) ? s : ""; };

function normalizeLanguage(value, fallback) {
  const raw = String(value || fallback || "da").trim().toLowerCase();
  const aliases = { dansk: "da", danish: "da", english: "en", español: "es", spanish: "es", deutsch: "de", german: "de", français: "fr", french: "fr" };
  const code = aliases[raw] || raw;
  return ["da", "en", "es", "de", "fr"].includes(code) ? code : "da";
}

function sanitizeSite(site, fallbackLanguage) {
  const meta = site.meta || {};
  const t = meta.theme || {};
  const out = {
    v: 1,
    meta: {
      title: str(meta.title, 160),
      language: normalizeLanguage(meta.language, fallbackLanguage),
      theme: {
        accent: /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : "#2540D9",
        background: /^#[0-9a-fA-F]{6}$/.test(t.background) ? t.background : "",
        backgroundStyle: typeof t.backgroundStyle === "string" && /^(linear|radial)-gradient\([#a-zA-Z0-9.% ,()-]+\)$/.test(t.backgroundStyle) ? t.backgroundStyle : "",
        surface: /^#[0-9a-fA-F]{6}$/.test(t.surface) ? t.surface : "",
        text: /^#[0-9a-fA-F]{6}$/.test(t.text) ? t.text : "",
        font: t.font === "serif" ? "serif" : "sans",
        mode: t.mode === "dark" ? "dark" : "light",
        radius: t.radius === "large" ? "large" : "medium"
      }
    },
    blocks: []
  };
  // Reliable visual defaults: a generated site must never fall back to a blank white canvas.
  if (!out.meta.theme.background) out.meta.theme.background = out.meta.theme.mode === "dark" ? "#111827" : "#F3F5FA";
  if (!out.meta.theme.backgroundStyle) out.meta.theme.backgroundStyle = out.meta.theme.mode === "dark"
    ? "linear-gradient(135deg,#101827 0%,#1E293B 55%,#172033 100%)"
    : "linear-gradient(135deg,#263B73 0%,#5367A8 52%,#B7A5D8 100%)";
  // Reject gradients that technically parse but render as an almost blank white page.
  if (!gradientIsVisible(out.meta.theme.backgroundStyle)) out.meta.theme.backgroundStyle = out.meta.theme.mode === "dark"
    ? "linear-gradient(135deg,#101827 0%,#263653 52%,#34264F 100%)"
    : "linear-gradient(135deg,#263B73 0%,#5367A8 52%,#B7A5D8 100%)";
  if (!out.meta.theme.surface) out.meta.theme.surface = out.meta.theme.mode === "dark" ? "#1E293B" : "#FFFFFF";
  if (!out.meta.theme.text) out.meta.theme.text = out.meta.theme.mode === "dark" ? "#F8FAFC" : "#182230";

  for (const b of site.blocks.slice(0, 12)) {
    if (!b || typeof b !== "object") continue;
    const id = str(b.id, 40) || Math.random().toString(36).slice(2, 9);
    if (["features", "services", "steps", "faq", "team"].includes(b.type)) {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(i => ({ t: str(i && i.t, 160), d: str(i && i.d, 600) }));
      out.blocks.push({ id, type: b.type, title: str(b.title, 160), items });
    } else if (b.type === "pricing") {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(i => ({ t: str(i && i.t, 160), d: str(i && i.d, 600), price: str(i && i.price, 80) }));
      if (items.length) out.blocks.push({ id, type: "pricing", title: str(b.title || "Priser", 160), items });
    } else if (b.type === "reviews") {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(i => ({ name: str(i && i.name, 120), text: str(i && i.text, 600), rating: Math.max(0, Math.min(5, Number(i && i.rating) || 0)) })).filter(i => i.name && i.text);
      if (items.length) out.blocks.push({ id, type: "reviews", title: str(b.title || "Det siger vores kunder", 160), items });
    } else if (b.type === "map") {
      const address = str(b.address, 300).trim();
      if (address) out.blocks.push({ id, type: "map", title: str(b.title || "Find os", 160), address });
    } else if (b.type === "booking") {
      out.blocks.push({ id, type: "booking", title: str(b.title || "Book en tid", 160), text: str(b.text || "Vælg en ydelse og ønsket tidspunkt.", 600), cta: str(b.cta || "Book en tid", 80) });
    } else if (b.type === "gallery") {
      out.blocks.push({ id, type: "gallery", title: str(b.title, 160), images: (Array.isArray(b.images) ? b.images : []).map(imgRef).filter(Boolean).slice(0, 8) });
    } else if (TEXT_FIELDS[b.type]) {
      const o = { id, type: b.type };
      TEXT_FIELDS[b.type].forEach(k => { o[k] = str(b[k], k === "text" ? 1200 : 160); });
      if (b.type === "hero" || b.type === "about") { const im = imgRef(b.image); if (im) o.image = im; }
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
  if (/^#[0-9a-fA-F]{6}$/.test(t("background", 7))) parts.push("Use exactly this page background color in theme.background: " + t("background", 7));
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
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const authorization = String((req.headers || {}).authorization || "");
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!supabaseUrl || !publishableKey) {
    return res.status(503).json({ error: "Supabase-serverkonfigurationen mangler i Vercel." });
  }
  if (!token) return res.status(401).json({ error: "Log ind for at bruge AI-generatoren." });
  try {
    const verified = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: "Bearer " + token }
    });
    if (!verified.ok) return res.status(401).json({ error: "Din session er udløbet. Log ind igen." });
  } catch (_) {
    return res.status(503).json({ error: "Kunne ikke kontrollere din Supabase-session." });
  }
  if (!ANTHROPIC_API_KEY) {
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
      JSON.stringify(body.site).slice(0, 24000) + "\nRecent conversation context (oldest first): " + JSON.stringify(Array.isArray(body.history) ? body.history.slice(-10).map(x => ({ role: x.r === "u" ? "user" : "assistant", text: String(x.t || "").slice(0, 1200) })) : []).slice(0, 10000) + "\nLatest user request: " + String(body.message).slice(0, 3000);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
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
      site: sanitizeSite(parsed.site, action === "generate" ? body.language : (body.site && body.site.meta && body.site.meta.language)),
      reply: String(parsed.reply || (action === "generate" ? "Din hjemmeside er genereret. Fortæl mig, hvad du vil ændre." : "Ændringerne er udført.")).slice(0, 1000)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Der opstod en fejl i AI-generatoren." });
  }
};
