// PRIME WEBS AI — free local-business discovery using OpenStreetMap.
// No Google Maps scraping, paid API key, or paid enrichment provider is used.

const CATEGORY = {
  hairdresser: { label: "Frisør", filter: 'nwr["shop"="hairdresser"]' },
  beauty: { label: "Skønhed", filter: 'nwr["shop"~"beauty|cosmetics|massage"]' },
  restaurant: { label: "Restaurant/café", filter: 'nwr["amenity"~"restaurant|cafe|fast_food|bar"]' },
  auto: { label: "Autoværksted", filter: 'nwr["shop"~"car_repair|tyres|car"]' },
  fitness: { label: "Fitness", filter: 'nwr["leisure"~"fitness_centre|sports_centre"]' },
  trades: { label: "Håndværker", filter: 'nwr["craft"~"painter|plumber|electrician|carpenter|roofer|builder|handyman|tiler"]' },
  all: { label: "Virksomhed", filter: 'nwr["name"]' }
};
const requestCounts = new Map();
const responseCache = new Map();
let lastGeocodeAt = 0;

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=0, no-store");
  return res.status(status).json(body);
}
function text(v) { return String(v || "").trim(); }
function first(tags, keys) {
  for (const key of keys) if (text(tags[key])) return text(tags[key]);
  return "";
}
function addressFrom(tags) {
  return [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    tags["addr:postcode"], tags["addr:city"] || tags["addr:town"] || tags["addr:village"]
  ].filter(Boolean).join(", ");
}
function normalize(el, category, city) {
  const tags = el.tags || {};
  const lat = el.lat ?? (el.center && el.center.lat);
  const lon = el.lon ?? (el.center && el.center.lon);
  const rawWebsite = first(tags, ["website", "contact:website", "url", "contact:url"]);
  const phone = first(tags, ["phone", "contact:phone", "mobile", "contact:mobile"]);
  const email = first(tags, ["email", "contact:email"]);
  return {
    sourceId: String(el.type || "element") + "/" + String(el.id || ""),
    name: first(tags, ["name", "brand", "operator"]),
    industry: category.label,
    city: first(tags, ["addr:city", "addr:town", "addr:village"]) || city,
    address: addressFrom(tags),
    website: rawWebsite ? (/^https?:\/\//i.test(rawWebsite) ? rawWebsite : "https://" + rawWebsite) : "",
    phone, email,
    latitude: Number.isFinite(Number(lat)) ? Number(lat) : null,
    longitude: Number.isFinite(Number(lon)) ? Number(lon) : null,
    opportunityScore: Math.min(100, (rawWebsite ? 25 : 70) + (phone ? 15 : 0) + (email ? 10 : 0)),
    source: "OpenStreetMap"
  };
}
async function fetchJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error("Datakilden svarede " + response.status + ".");
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
async function queryOverpass(query) {
  let lastError;
  for (const endpoint of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
    try {
      return await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "User-Agent": "PRIME-WEBS-AI-LeadFinder/1.0"
        },
        body: query
      }, 22000);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Overpass unavailable");
}
function finish(data, category, city, limit, cacheKey, res) {
  const seen = new Set();
  const results = (Array.isArray(data && data.elements) ? data.elements : [])
    .map(el => normalize(el, category, city))
    .filter(item => item.name)
    .filter(item => {
      const key = item.name.toLowerCase() + "|" + (item.phone.replace(/\D/g, "") || item.address.toLowerCase());
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })
    .slice(0, limit);
  const payload = {
    source: "OpenStreetMap",
    attribution: "© OpenStreetMap contributors",
    city, industry: category.label,
    results,
    total: results.length,
    note: "Resultaterne afhænger af frivillige OpenStreetMap-registreringer. Manglende hjemmeside betyder kun, at kilden ikke har registreret en hjemmeside."
  };
  responseCache.set(cacheKey, { at: Date.now(), data: payload });
  return send(res, 200, payload);
}
export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Brug GET til scanning." });
  const ip = text(req.headers["x-forwarded-for"]).split(",")[0] || "unknown";
  const now = Date.now();
  const bucket = requestCounts.get(ip) || [];
  const recent = bucket.filter(t => now - t < 5 * 60 * 1000);
  if (recent.length >= 6) return send(res, 429, { error: "Du har startet mange scanninger. Vent fem minutter og prøv igen." });
  recent.push(now); requestCounts.set(ip, recent);

  const city = text(req.query && req.query.city).slice(0, 100);
  const categoryKey = text(req.query && req.query.industry).toLowerCase();
  const category = CATEGORY[categoryKey] || CATEGORY.all;
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query && req.query.limit, 10) || 50));
  if (!city) return send(res, 400, { error: "Angiv en by eller et område." });

  const cacheKey = [city.toLowerCase(), categoryKey, limit].join("|");
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.at < 15 * 60 * 1000) return send(res, 200, { ...cached.data, cached: true });

  let phase = "geocoding";
  try {
    // One lookup per scan; do not use this endpoint for autocomplete or bulk geocoding.
    const waitMs = Math.max(0, 1100 - (now - lastGeocodeAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    lastGeocodeAt = Date.now();
    const geoUrl = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=" + encodeURIComponent(city);
    const places = await fetchJson(geoUrl, {
      headers: { "User-Agent": "PRIME-WEBS-AI-LeadFinder/1.0", "Accept": "application/json" }
    }, 12000);
    if (!Array.isArray(places) || !places.length) {
      return send(res, 404, { error: "Vi kunne ikke finde området. Prøv bynavn efterfulgt af land, fx Málaga, Spain." });
    }

    const place = places.find(p => p.osm_type === "relation" || p.osm_type === "way") || places[0];
    let areaSelector;
    if (place.osm_type === "relation") areaSelector = "area(" + (Number(place.osm_id) + 3600000000) + ")->.searchArea;";
    else if (place.osm_type === "way") areaSelector = "area(" + (Number(place.osm_id) + 2400000000) + ")->.searchArea;";
    else {
      const lat = Number(place.lat), lon = Number(place.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return send(res, 422, { error: "Områdets geografiske placering kunne ikke bestemmes." });
      phase = "business search";
      const nearbyQuery = '[out:json][timeout:20];(' + category.filter + '(around:12000,' + lat + ',' + lon + '););out center tags ' + limit + ';';
      const nearbyData = await queryOverpass(nearbyQuery);
      return finish(nearbyData, category, city, limit, cacheKey, res);
    }

    phase = "business search";
    const query = '[out:json][timeout:20];' + areaSelector + '(' + category.filter + '(area.searchArea););out center tags ' + limit + ';';
    const data = await queryOverpass(query);
    return finish(data, category, city, limit, cacheKey, res);
  } catch (error) {
    const message = error && error.name === "AbortError"
      ? "Søgningen via " + phase + " tog for lang tid. Prøv et mindre område eller igen senere."
      : "Den gratis OpenStreetMap-datakilde er midlertidigt utilgængelig under " + phase + ". Prøv igen senere.";
    return send(res, 503, { error: message });
  }
}
