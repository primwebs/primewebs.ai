# Animation & 3D implementation

- Adds a persistent per-site animation profile to the existing `site.meta` JSON object; no database migration is required.
- Defaults existing and newly generated sites to `immersive`.
- Adds four animation levels in the visual editor.
- Exported HTML includes scroll reveal, heading reveal, CSS depth/tilt, floating visual accents and reduced-motion handling.
- AI server sanitizer accepts only known levels and boolean flags; unknown values are discarded.
- Uses native CSS and browser APIs only; no paid service or external 3D dependency.
- The current 3D treatment is CSS-based perspective/depth, not a Three.js scene or imported 3D model. A true model/scene editor is a later extension.
- Production/main is untouched. This branch is for code review and isolated preview only.
