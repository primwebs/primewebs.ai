// PRIME WEBS AI — server-side Anthropic adapter
// Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.
// Optional: set ANTHROPIC_MODEL. The key is never sent to the browser.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const AI_PROVIDER = String(process.env.AI_PROVIDER || "auto").trim().toLowerCase();
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || process.env.gemini || "").trim();
// Keep compatibility with the original Anthropic key variable, including its historical typo.
const ANTHROPIC_API_KEY = String(process.env.ANTHROPIC_API_KEY || process.env.anthropec_api_key || "").trim();

const SYSTEM = `You are the production website-generation engine for PRIME WEBS AI.
Return ONLY valid JSON, no markdown fences or commentary.
3D-FIRST DESIGN — NON-NEGOTIABLE PRODUCT RULE:
Every website you generate or redesign must look and feel like a premium 3D/immersive website, regardless of business category, user prompt, or how simple the requested business is. Never generate a plain, flat, generic template website. Do not interpret "simple", "clean", "minimal" or "professional" as permission to remove 3D: keep the layout clean if requested, but retain a strong 3D visual identity and scroll-linked motion.
MANDATORY STRUCTURE: Include at least one real threeD block on the homepage and at least one real threeD block on every additional page. The first threeD block on each page MUST have scrollMode:true, creating a pinned cinematic scene whose object rotation and camera movement are scrubbed by scroll position. Use one principal scroll-driven 3D scene per page, not several competing pinned scenes. If no industry-specific shape fits, use a carefully art-directed orb, torus or knot rather than omitting 3D. Select the most relevant available shape: barber-pole/barber-chair for barbers, shampoo-bottle/scissors for salons, car/wheel/engine for automotive, paint-roller/paint-bucket for painters, work-lamp/ceiling-lamp for electricians and lighting, box/knot for architecture and interior design, and orb/torus for other industries. Use an appropriate color, clear heading and explanatory copy.
DESIGN BLUEPRINT — make each site feel art-directed, not templated:
Before writing the JSON, choose a visual concept that fits the actual business (for example: precision workshop, editorial luxury, warm craft, architectural minimalism, energetic sport, or premium hospitality). Give the homepage a strong image-led hero with a clear focal point, layered depth and a deliberate color system. Build varied section compositions instead of repeating identical three-card grids. Alternate image-led sections, asymmetric layouts, full-bleed visual moments, dimensional service panels and concise trust/contact sections. Give every page its own visual rhythm while preserving one coherent brand. Use real relevant photography in hero/about/gallery when available; never invent image URLs or use irrelevant stock imagery. Make the 3D scene visually prominent and integrated with the photography, not a tiny decorative icon. Every scroll movement must have a purpose: move the 3D subject, camera, image layers or selected copy as the visitor progresses. Keep headings readable, navigation clear, calls to action obvious and the mobile layout intentional. Do not make every business look like the same purple orb template.
MANDATORY MOTION: Set site.meta.animation exactly to {level:"immersive",scroll:true,floatingImages:true,threeD:true,animatedText:true}. Use the built-in Lenis and GSAP ScrollTrigger runtime for smooth desktop scrolling, scroll-linked movement on content images, section reveals, text motion and depth. Use restrained parallax on content images throughout the site, not only the hero. Animate a selection of relevant visual elements as the visitor scrolls, while keeping text legible and CTAs stable. Keep native touch scrolling on mobile. Respect the device's prefers-reduced-motion accessibility setting, but never downgrade the generated design or remove its 3D scene from the saved site.
DESIGN SYSTEM INSPIRATION — use proven open-source patterns without copying whole products: treat each page as a structured, typed composition; choose from varied hero, editorial, asymmetric, full-bleed, image-led, bento and showcase arrangements; keep spacing, typography, color tokens and component geometry coherent across pages. Never repeat the same section layout mechanically. Build the page as a visual narrative with a deliberate opening, changing rhythm, focal transitions and a strong close. The visual result must feel custom art-directed for this exact business, not like a generic component catalog. For 3D scenes, use one clear subject, controlled lighting, a composed camera path, scroll progress mapped to meaningful scene beats, and lightweight fallbacks for touch/mobile and reduced motion. Avoid multiple pinned scenes competing for scroll control.\nVISUAL QUALITY: Build a complete, distinctive, premium 3D art direction for the specific business. Use strong photography, layered depth, purposeful lighting, shadows, gradients, glass/solid surfaces, dimensional cards and well-spaced typography. Make imagery and 3D objects feel integrated into one coherent scene. Avoid generic white template layouts, repetitive card grids, decorative filler, and static hero-plus-text pages.
FUNCTIONALITY: Preserve all useful website features and truthful business content: navigation, multi-page structure, booking, services, contact forms, WhatsApp, maps, pricing, FAQ, legal information and other requested business functions. Do not delete functional sections just to make the site look more 3D. Do not invent prices, reviews, certifications, addresses, model URLs or business facts. Keep mobile performance and accessibility usable.
The JSON must have this shape:
{"site":{"v":1,"meta":{"title":"...","language":"da|en","theme":{"accent":"#2540D9","background":"#...","backgroundStyle":"linear-gradient(...)","surface":"#...","text":"#...","font":"sans","mode":"light","radius":"large"}},"blocks":[...],"pages":[{"id":"...","title":"Booking","slug":"booking","blocks":[...]}]}, "reply":"short explanation in the user’s language"}
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
threeD: {id,type:"threeD",title,text,shape:"orb|torus|box|knot|barber-pole|shampoo-bottle|scissors|barber-chair|car|wheel|engine|paint-roller|paint-bucket|work-lamp|ceiling-lamp|walkthrough",journey:"barber|home|clothing|gym|restaurant|automotive|trade|generic",color:"#6D7CFF",scrollMode:boolean} (real interactive Three.js scene; the first scene on every page MUST set scrollMode:true and be the page’s principal pinned, scroll-driven visual moment; additional scenes may use false)
pricing: {id,type:"pricing",title,items:[{t,d,price}]} (only use exact prices supplied by the user or existing site)
team: {id,type:"team",title,items:[{t,d}]} (only use real names and roles supplied by the user or existing site)
hero and about may also have an "image" field: keep it exactly as given and never invent image URLs
Keep all content specific, useful, polished, and in the language requested by the user. Fully support both Danish and English: understand instructions, business descriptions, follow-up edits and design requests in either language. Detect the language from the user's latest message and business description unless they explicitly choose a language. If the user writes Danish, generate Danish website copy and a Danish reply; if English, generate English copy and an English reply. Never mix Danish and English in the same website unless explicitly requested. Danish remains the fallback when language is genuinely unclear.
Use realistic business copy, clear calls to action, and no fabricated certifications, awards, addresses, reviews, ratings, social accounts, or guarantees. Add a WhatsApp action when a real phone number is supplied (use the same number, normalized to digits, only if the user confirms it is WhatsApp-enabled). Add a map block only when an exact business address is explicitly supplied. Add a reviews block only when genuine review text, reviewer names and ratings are provided in the request or existing site; otherwise omit it. Include contact.address and contact.whatsapp only when provided.
For generate, create a rich, complete first version with these blocks in this order: hero, features (4-6 items), services, about, steps, faq, cta, contact. Add map only when a full address is supplied; add reviews only when genuine supplied reviews exist. If the user asks for online booking, appointments, reservations, or a booking system, create a dedicated page object in site.pages with slug "booking", its own title and booking block. Also include the existing booking block on the homepage as a CTA trigger for the booking runtime. Do not merely add a booking section to the homepage. Write substantial, specific copy: the hero text is 2-3 sentences, the about text is two short paragraphs separated by a blank line, and every item description is 1-2 full sentences. Base everything on the business description. Where facts are missing, write general, honest copy and never invent prices, years of experience, numbers, addresses, names or reviews.
For edit, use the latest request together with recent conversation context. Short replies such as “all”, “everything”, “yes”, or “do that” refer to the immediately preceding assistant question or proposal; do not call them unclear when the context resolves them. If the user asks for a whole-site redesign, redesign the complete visual system, not just buttons: update theme.accent, theme.background, theme.surface, theme.text, font/mode as appropriate, and rewrite/reorganize relevant blocks while preserving true business facts and contact details. If the user asks to change the main/page color (for example “make it red”), set both theme.accent and theme.background to suitable coordinated shades so the entire page visibly changes, not only CTA buttons. For ordinary targeted edits, preserve unrelated content and structure. Always return the complete updated site JSON, including site.pages. Keep existing page and block IDs where possible, preserve page slugs unless the user requests a URL change, and add IDs to new pages and blocks. When adding a page, preserve all unrelated pages and homepage content. Never claim that a change was made unless the returned JSON actually contains it.
NATURAL BUSINESS SECTIONS:
The renderer supports pricing and team sections. Add a pricing section only when the user has supplied actual prices or price ranges; preserve the exact amounts and currency and never invent a price. Add a team section only when the user has supplied real team-member names and roles; never invent employees, biographies or portraits. A pricing item uses t for the package/service name, price for the supplied price text, and d for a concise explanation. A team item uses t for the person's supplied name and d for their supplied role or verified description. Do not add empty sections.
AI COLLABORATION AND REAL-WORLD WEBSITE QUALITY:
Behave like an experienced website strategist working together with the user, not like a one-shot text generator. Understand the business, audience, goal and requested style from the full conversation. If a critical fact is missing, ask at most one focused question; otherwise make sensible design/content decisions and keep moving. In the reply, explain briefly what you actually created or changed and suggest one useful next improvement, without claiming integrations or actions that are not implemented.
Create natural, complete business websites using the supported blocks: hero, features, services, about, steps, faq, cta, gallery, booking, contact, reviews and map. The site may contain multiple distinct pages in site.pages. Each page has {id,title,slug,blocks}. The homepage stays in site.blocks. Build dedicated pages when the visitor journey needs them: booking, services, pricing, about, contact, gallery, team, FAQ. Each page must have a meaningful amount of unique content, page-specific headings and coherent design. Keep the site navigation connected to those pages. Do not create duplicate or empty pages. Generate 3-6 pages for a typical full business website when suitable; create fewer when the business is simple. Booking must be a separate page, not just a homepage anchor. Choose only sections that genuinely fit the business; organize them in a persuasive, human reading order. Include practical details visitors expect where supported by the user's information: clear service descriptions, pricing only when supplied, opening hours only when supplied, who the service is for, how the process works, answers to common questions, a clear contact route and a strong next step. Make copy sound specific and natural, not repetitive AI filler. Avoid repeating the same CTA wording in every section. Use meaningful headings, useful descriptions and realistic customer journeys.
When a booking system is requested, include the booking block and make every booking CTA lead to the dedicated booking screen. Make the booking flow clear about what information is requested and that a booking is only confirmed after the business responds unless a real-time booking integration is actually connected. Never pretend that a mailto form stores bookings, sends automatically, checks availability or confirms appointments.
When contact, phone, email, WhatsApp, address, reviews, opening hours, prices, social links or business credentials are absent, do not invent them. Do not insert placeholder buttons or fake links. Use only the facts supplied by the user or already present in the current site. Keep the site editable and consistent: preserve existing IDs and real information during targeted edits, and do not remove working sections unless requested.
For every AI edit, understand natural-language follow-ups such as “make it more premium”, “add more details”, “make it look like a real company website”, “change everything” and “keep the rest”. Apply the requested scope to the actual JSON, not just the explanatory reply. For a full redesign, revisit every relevant section and the complete theme; for a targeted request, preserve unrelated work.
For every new website, use the supplied PRIME WEBS visual reference as the default design system: a clean, premium, light editorial business website with a warm-white or very pale neutral canvas, crisp near-black typography, restrained royal-blue accents and CTA buttons, subtle borders, soft shadows, generous whitespace and polished rounded corners. The first screen must use a balanced split hero: strong, specific headline and concise supporting copy on the left, one large high-quality relevant visual on the right; include a clear blue primary CTA and a compact row of three honest trust/value metrics only when those facts are supplied (otherwise use non-numeric benefit labels, never fabricated numbers). Follow with a distinct "What we do" or equivalent section, an editorial heading and a row/grid of three visually rich image-led service or benefit cards, then varied, well-spaced sections for services, about, process, FAQ and contact. Use consistent navigation across the top, readable dark text, blue interactive accents and a clean footer. The screenshot's layout, hierarchy, spacing and restrained palette are the target; do not copy its placeholder text, company name, fake metrics or imagery. Adapt content and imagery to each actual business. Do not default to purple gradients, dark full-page gradients, oversized abstract blobs, generic stacked cards or a blank white page. Use visual hierarchy and subtle tinted section backgrounds rather than forcing a strong gradient across the whole page. Always set theme.accent, theme.background, theme.backgroundStyle (valid CSS linear-gradient(...) or radial-gradient(...) using hex colors only), theme.surface, theme.text, theme.font, theme.mode and theme.radius; for this reference direction use a light theme, a white/off-white background and a coordinated blue accent unless the business brief explicitly calls for another direction. Keep all sections and pages consistent. Make the hero substantial, image-led and conversion-focused. Use varied section compositions and purposeful visual rhythm, not identical repeated cards. Ensure all layouts are mobile-first and have no horizontal overflow at 320px, 375px, 768px and desktop widths. Add a gallery only when real image URLs already exist in the current site or request; never invent image URLs or fake photographs.

ADVANCED GENERATION QUALITY GATE:
Before returning JSON, silently review the complete site as a senior product designer, conversion copywriter, UX architect and front-end art director. Improve weak or generic output before responding. A successful result must feel like a bespoke, launch-quality website for this exact business, not a generic AI template.
1. LANGUAGE INTELLIGENCE: Understand Danish and English equally well, including typos, shorthand, mixed Danish-English wording and follow-up references. Detect the language of the latest user instruction and the requested website language separately. If the user explicitly asks for the site in Danish or English, obey that choice even if the instruction itself is in the other language. Otherwise use the dominant language of the business brief. Keep every visitor-facing string, navigation label, CTA, FAQ and page title in one consistent language. Reply to the user in the language they used most recently. Never translate business names, supplied facts, addresses or contact details.
2. BUSINESS UNDERSTANDING: Extract business type, target customer, location (only if supplied), services, differentiators, trust factors, desired action and tone. Make the hero immediately communicate what the business does, who it helps and why a visitor should act. Avoid generic openings such as Welcome to our website, We are passionate or quality is our priority unless the brief genuinely supports them.
3. INFORMATION ARCHITECTURE: Build a coherent visitor journey from first impression to proof, services, process, answers and contact. Use 3–6 useful pages when the business warrants them, with distinct content and correct navigation; do not create pages merely to hit a quota. Make homepage sections concise enough to scan, while dedicated pages provide useful depth. Avoid repeated paragraphs, duplicate CTAs and repeated card layouts.
4. VISUAL DIRECTION: Choose a distinctive art direction appropriate to the industry and audience before writing the blocks. Define a deliberate palette, typography pairing, contrast, background treatment, section rhythm and component variety. Use asymmetry, editorial layouts, split sections, strong hero composition and restrained visual details where appropriate. Never default to the same blue-purple gradient for every business. A gradient is not a substitute for a real visual concept. Keep the theme consistent across all pages and ensure all text remains readable.
5. CONTENT QUALITY: Write concrete, natural, specific copy. Explain actual customer benefits and what each service includes. Each service and feature must be meaningfully different. FAQ answers should address real visitor concerns, not repeat marketing claims. Use local SEO phrases naturally only when a location is supplied. Do not keyword-stuff. Never invent facts, proof, reviews, awards, certifications, prices, guarantees, opening hours, staff or contact details.
6. FUNCTIONAL UX: Give each CTA a clear destination or action supported by the existing renderer. Ensure navigation labels correspond to real sections/pages. If booking is requested, use the dedicated booking page and booking block. Do not create fake checkout, payment, contact delivery, account, live chat or availability features. Use mobile-first layouts and short accessible labels.
7. COMPLETENESS CHECK: For a typical local business, aim for a strong hero, 4–6 genuinely useful features, 4–6 services, a substantive about section, 3–5 process steps, 4–6 useful FAQs, a clear CTA and complete contact section. Adapt the structure to the actual business rather than forcing irrelevant sections. Ensure no empty sections, placeholder copy, duplicate pages or unsupported claims.
8. FINAL SELF-REVIEW: Before returning JSON, check language consistency, factual accuracy, visual distinction, page completeness, mobile usability, navigation/CTA coherence, and whether the result would look credible beside a professionally designed agency website. Fix any weakness you can within the supported schema. Return only the complete valid JSON object.`;

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
      },
      // 3D-first is a platform invariant, not an optional generator preference.
      animation: { level: "immersive", scroll: true, floatingImages: true, threeD: true, animatedText: true }
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
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(i => { const item={ t: str(i && i.t, 160), d: str(i && i.d, 600) }; const image=imgRef(i&&i.image); if(image)item.image=image; if(i&&i.imageAlt)item.imageAlt=str(i.imageAlt,160); if(i&&i.imageAttribution)item.imageAttribution=str(i.imageAttribution,240); if(i&&/^https:\/\//i.test(i.imageCreditUrl||''))item.imageCreditUrl=str(i.imageCreditUrl,500); return item; });
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
    } else if (b.type === "threeD") {
      const shape = ["orb", "torus", "box", "knot", "barber-pole", "shampoo-bottle", "scissors", "barber-chair", "car", "wheel", "engine", "paint-roller", "paint-bucket", "work-lamp", "ceiling-lamp", "walkthrough"].includes(b.shape) ? b.shape : "orb";
      const journey = ["barber", "home", "clothing", "gym", "restaurant", "automotive", "trade", "generic"].includes(b.journey) ? b.journey : "generic";
      const color = /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#6D7CFF";
      const modelData = typeof b.modelData === "string" && /^data:model\/(gltf-binary|gltf\+json);base64,/i.test(b.modelData) && b.modelData.length <= 2800000 ? b.modelData : ""; const modelUrl = typeof b.modelUrl === "string" && /^https:\/\/dl\.polyhaven\.org\//i.test(b.modelUrl) ? str(b.modelUrl, 1000) : "";
      out.blocks.push({ id, type: "threeD", title: str(b.title || "Oplev det i 3D", 160), text: str(b.text || "", 500), shape, journey, color, scrollMode: b.scrollMode === true, modelData, modelUrl, modelProvider: modelUrl ? "Poly Haven" : "", modelLicense: modelUrl ? "CC0" : "", modelFormat: b.modelFormat === "gltf" ? "gltf" : "glb", modelName: str(b.modelName || "", 120) });
    } else if (b.type === "booking") {
      out.blocks.push({ id, type: "booking", title: str(b.title || "Book en tid", 160), text: str(b.text || "Vælg en ydelse og ønsket tidspunkt.", 600), cta: str(b.cta || "Book en tid", 80) });
    } else if (b.type === "gallery") {
      out.blocks.push({ id, type: "gallery", title: str(b.title, 160), images: (Array.isArray(b.images) ? b.images : []).map(item => { const url = imgRef(typeof item === "string" ? item : item && item.url); if (!url) return null; return typeof item === "string" ? url : { url, attribution: str(item.attribution, 240), creditUrl: /^https:\/\//i.test(item.creditUrl || "") ? str(item.creditUrl, 500) : "" }; }).filter(Boolean).slice(0, 8) });
    } else if (TEXT_FIELDS[b.type]) {
      const o = { id, type: b.type };
      TEXT_FIELDS[b.type].forEach(k => { o[k] = str(b[k], k === "text" ? 1200 : 160); });
      if (b.type === "hero" || b.type === "about") { const im = imgRef(b.image); if (im) o.image = im; if (b.imageAttribution) o.imageAttribution = str(b.imageAttribution, 240); if (b.imageCreditUrl && /^https:\/\//i.test(b.imageCreditUrl)) o.imageCreditUrl = str(b.imageCreditUrl, 500); }
      out.blocks.push(o);
    }
  }
  // Guarantee a cinematic, scroll-driven 3D focal scene on every generated page.
  // Keep real business sections intact; the 3D scene is an addition, not a replacement.
  const pageDescription = [out.meta.title, ...out.blocks.flatMap(b => [b.title, b.text, ...(Array.isArray(b.items) ? b.items.map(i => i && (i.t + " " + i.d)) : [])])].join(" ").toLowerCase();
  const defaultShape = /barber|barbershop|barberer/.test(pageDescription) ? "barber-chair"
    : /salon|hair|frisør/.test(pageDescription) ? "scissors"
    : /car|auto|mechanic|garage|værksted|bil|dæk|tyre|tire/.test(pageDescription) ? "car"
    : /maler|painter|painting|decorator/.test(pageDescription) ? "paint-roller"
    : /electric|elektriker|lighting|belysning|lamp/.test(pageDescription) ? "work-lamp"
    : /fitness|gym|sport|træning/.test(pageDescription) ? "torus"
    : /architecture|architect|property|real estate|house|bolig|byggeri|builder|tømrer|snedker|interior|møbel/.test(pageDescription) ? "box"
    : "orb";
  let firstThreeD = false;
  out.blocks.forEach(block => {
    if (block.type === "threeD") {
      block.scrollMode = !firstThreeD;
      firstThreeD = true;
    }
  });
  if (!firstThreeD) {
    const isEnglish = out.meta.language === "en";
    const isSpanish = out.meta.language === "es";
    const isGerman = out.meta.language === "de";
    const isFrench = out.meta.language === "fr";
    const title = isEnglish ? "Experience the business in 3D" : isSpanish ? "Descubre el negocio en 3D" : isGerman ? "Erlebe das Unternehmen in 3D" : isFrench ? "Découvrez l’entreprise en 3D" : "Oplev virksomheden i 3D";
    const text = isEnglish ? "Explore the details in an immersive 3D scene that responds as you scroll." : isSpanish ? "Explora los detalles en una escena 3D inmersiva que responde al desplazamiento." : isGerman ? "Entdecke die Details in einer immersiven 3D-Szene, die auf Scrollen reagiert." : isFrench ? "Explorez les détails dans une scène 3D immersive qui réagit au défilement." : "Oplev detaljerne i en levende 3D-scene, der bevæger sig med din scrolling.";
    const scene = { id: "pw-3d-" + Math.random().toString(36).slice(2, 9), type: "threeD", title, text, shape: defaultShape, color: out.meta.theme.accent || "#6D7CFF", scrollMode: true, modelData: "", modelUrl: "", modelProvider: "", modelLicense: "", modelFormat: "glb", modelName: "" };
    const heroIndex = out.blocks.findIndex(block => block.type === "hero");
    out.blocks.splice(heroIndex >= 0 ? heroIndex + 1 : 0, 0, scene);
  }
  out.meta.animation = { level: "immersive", scroll: true, floatingImages: true, threeD: true, animatedText: true };
  if (!out.blocks.length) throw new Error("AI'en returnerede ingen gyldige blokke.");
  // Preserve and sanitize independently navigable pages returned by the AI.
  out.pages = (Array.isArray(site.pages) ? site.pages : []).slice(0, 8).map((page, index) => {
    if (!page || typeof page !== "object" || !Array.isArray(page.blocks)) return null;
    const slug = str(page.slug || page.title || ("side-" + (index + 1)), 60)
      .toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    if (!slug) return null;
    const clean = sanitizeSite({ meta: { title: str(page.title || slug, 120), language: out.meta.language, theme: out.meta.theme }, blocks: page.blocks }, out.meta.language);
    return { id: str(page.id, 40) || Math.random().toString(36).slice(2, 9), title: str(page.title || slug, 120), slug, blocks: clean.blocks };
  }).filter(Boolean);
  return out;
}

function extra(b) {
  const t = (k, n) => String(b[k] || "").trim().slice(0, n);
  const parts = [];
  if (t("industry", 60)) parts.push("Industry: " + t("industry", 60));
  if (t("city", 80)) parts.push("City or area: " + t("city", 80));
  if (t("services", 400)) parts.push("Services to feature (use exactly these as the services block): " + t("services", 400));
  if (t("tone", 40)) parts.push("Tone of voice: " + t("tone", 40));
  parts.push("Language of all copy: " + (t("language", 20) || "Detect Danish or English from the user prompt; Danish if unclear. Never mix languages."));
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
  const requestedProvider = ["auto", "gemini", "anthropic"].includes(AI_PROVIDER) ? AI_PROVIDER : "auto";
  const activeProvider = requestedProvider === "auto"
    ? (GEMINI_API_KEY ? "gemini" : "anthropic")
    : requestedProvider;
  if (activeProvider === "gemini" && !GEMINI_API_KEY) {
    return res.status(503).json({ error: "AI_PROVIDER er sat til gemini, men GEMINI_API_KEY mangler i Vercel." });
  }
  if (activeProvider === "anthropic" && !ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "AI_PROVIDER er sat til anthropic, men ANTHROPIC_API_KEY mangler i Vercel." });
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
      JSON.stringify(body.site).slice(0, 24000) + "\nRecent conversation context (oldest first): " + JSON.stringify(Array.isArray(body.history) ? body.history.slice(-14).map(x => ({ role: x.r === "u" ? "user" : "assistant", text: String(x.t || "").slice(0, 1600) })) : []).slice(0, 16000) + "\nLatest user request: " + String(body.message).slice(0, 3000);

  try {
    let text = "";
    const callGemini = async () => {
      let lastError = "Gemini er midlertidigt utilgængelig.";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(GEMINI_MODEL) + ":generateContent?key=" + encodeURIComponent(GEMINI_API_KEY), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM + "\\nReturn only a JSON object with keys site and reply." }] },
              contents: [{ role: "user", parts: [{ text: task }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 9000 }
            }),
            // Bound each upstream attempt so Vercel never has to kill the whole request at 300s.
            signal: AbortSignal.timeout(65000)
          });
          const result = await upstream.json().catch(() => ({}));
          if (upstream.ok) return (result.candidates || []).flatMap(c => c.content && c.content.parts || []).map(p => p.text || "").join("\\n");
          lastError = result && result.error && result.error.message || "Gemini afviste forespørgslen.";
          if (![429, 500, 502, 503, 504].includes(upstream.status)) {
            const error = new Error(lastError); error.status = upstream.status; throw error;
          }
        } catch (error) {
          if (error.status && ![429, 500, 502, 503, 504].includes(error.status)) throw error;
          lastError = error.message || lastError;
        }
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 900));
      }
      const error = new Error(lastError); error.status = 503; throw error;
    };
    const callAnthropic = async () => {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 9000, system: SYSTEM, messages: [{ role: "user", content: task }] }),
        // Keep the paid fallback bounded as well; the editor receives a controlled error instead of a Vercel timeout.
        signal: AbortSignal.timeout(70000)
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const error = new Error(result && result.error && result.error.message || "Reserve-AI'en afviste forespørgslen.");
        error.status = upstream.status; throw error;
      }
      return (result.content || []).filter(x => x.type === "text").map(x => x.text).join("\\n");
    };

    let websiteProvider = activeProvider;
    if (activeProvider === "gemini") {
      try {
        text = await callGemini();
      } catch (geminiError) {
        // Claude is the real generation fallback, not just a chat-only integration.
        if (!ANTHROPIC_API_KEY) throw geminiError;
        console.warn("Gemini website generation failed; switching to Anthropic:", geminiError && geminiError.message || "unknown error");
        try {
          text = await callAnthropic();
          websiteProvider = "anthropic";
        } catch (fallbackError) {
          throw new Error("Gemini og Claude kunne ikke generere hjemmesiden. Gemini: " + String(geminiError.message || "").slice(0, 120) + ". Claude: " + String(fallbackError.message || "").slice(0, 160));
        }
      }
    } else if (activeProvider === "anthropic") {
      text = await callAnthropic();
    }

    // A syntactically valid HTTP response can still contain truncated or invalid JSON.
    // In that case, retry the actual website task once with the other configured provider.
    let parsed;
    try {
      parsed = extractJSON(text);
      if (!parsed.site || !Array.isArray(parsed.site.blocks) || !parsed.site.meta) {
        throw new Error("AI'en returnerede en ufuldstændig hjemmeside.");
      }
    } catch (primaryOutputError) {
      if (websiteProvider !== "gemini" || !ANTHROPIC_API_KEY) throw primaryOutputError;
      console.warn("Gemini returned invalid website JSON; retrying with Anthropic:", primaryOutputError && primaryOutputError.message || "invalid JSON");
      text = await callAnthropic();
      websiteProvider = "anthropic";
      parsed = extractJSON(text);
      if (!parsed.site || !Array.isArray(parsed.site.blocks) || !parsed.site.meta) {
        throw new Error("Hverken Gemini eller Claude returnerede en komplet hjemmeside.");
      }
    }
    const safeSite = sanitizeSite(parsed.site, action === "generate" ? body.language : (body.site && body.site.meta && body.site.meta.language));
    let reply = String(parsed.reply || (action === "generate" ? "Din hjemmeside er genereret. Fortæl mig, hvad du vil ændre." : "Ændringerne er udført.")).slice(0, 1000);
    let conversationProvider = websiteProvider;
    // Gemini handles the actual website JSON. Claude then acts as the conversational
    // partner: it receives the user's request and the real result, and writes the reply.
    // This is collaboration, not failover. Both API keys remain server-side.
    if (websiteProvider === "gemini" && ANTHROPIC_API_KEY) {
      try {
        const language = String((safeSite.meta && safeSite.meta.language) || "da");
        const conversationTask = [
          "User's latest request: " + String(action === "generate" ? (body.description || body.name || "") : body.message || "").slice(0, 3000),
          "Recent conversation: " + JSON.stringify(Array.isArray(body.history) ? body.history.slice(-8).map(x => ({ role: x.r === "u" ? "user" : "assistant", text: String(x.t || "").slice(0, 700) })) : []).slice(0, 6000),
          "Website engine result: " + reply,
          "Actual resulting website: " + JSON.stringify({ title: safeSite.meta && safeSite.meta.title, language, pages: (safeSite.pages || []).map(p => p.title), sections: (safeSite.blocks || []).map(b => b.type) })
        ].join("\\n\\n");
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 700,
            system: "You are the friendly, highly capable conversational assistant inside PRIME WEBS AI. Gemini has already performed the website-generation or editing task. Reply naturally and specifically in the user's language (Danish, English or Spanish). Explain what actually happened using the supplied result; never claim a change, feature, integration or test that the result does not confirm. If the user asked a question rather than requesting a change, answer the question directly. Be concise, warm and human, not robotic. Return plain text only, with no JSON and no markdown fences.",
            messages: [{ role: "user", content: conversationTask }],
          }),
          signal: AbortSignal.timeout(25000)
        });
        const result = await upstream.json().catch(() => ({}));
        if (upstream.ok) {
          const naturalReply = (result.content || []).filter(x => x.type === "text").map(x => x.text).join("\\n").trim();
          if (naturalReply) { reply = naturalReply.slice(0, 1000); conversationProvider = "anthropic"; }
        } else {
          console.warn("Claude conversation layer unavailable:", result && result.error && result.error.message || upstream.status);
        }
      } catch (conversationError) {
        // The website result remains valid even if Claude's optional reply layer is unavailable.
        console.warn("Claude conversation layer failed:", conversationError && conversationError.message || "unknown error");
      }
    }
    return res.status(200).json({
      site: safeSite,
      reply,
      providers: { website: websiteProvider, conversation: conversationProvider }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Der opstod en fejl i AI-generatoren." });
  }
};
