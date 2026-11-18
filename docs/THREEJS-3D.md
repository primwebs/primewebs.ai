# Three.js interactive 3D scenes

- Adds a dedicated `threeD` content block to the isolated Animation & 3D branch.
- Adds the block to the visual editor's Add Section menu.
- AI output is sanitized to a fixed shape allowlist (`orb`, `torus`, `box`, `knot`) and a six-digit hex color; text is length-limited.
- Exported HTML lazy-loads the pinned Three.js 0.170.0 ES module from jsDelivr only when a 3D block exists and the visitor is not requesting reduced motion.
- Scene rendering pauses when outside the viewport, caps device pixel ratio, and resizes with ResizeObserver.
- A CSS fallback remains visible if WebGL or the CDN module is unavailable.
- No customer website, production deployment, domain, or live data was accessed or changed.
- Limitation: Three.js is delivered from a public CDN, so an internet connection and CDN availability are required for real WebGL scenes. The CSS fallback works without it.
