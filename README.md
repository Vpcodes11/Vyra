# VYRA Energy

A complete cinematic product website inspired by the supplied 14-second reference recording. Original fictional brand, copy, procedural 3D cans and generated fallback artwork. Three.js is bundled locally; no installation or build step is required.

## Run

With Node.js installed, run `npm start` and open `http://127.0.0.1:3000`. Use an HTTP server for the ES-module 3D renderer. Opening `dist/index.html` directly shows the flat artwork fallback. No installation or build step is required. Serve the `dist` directory on any static host.

## Experience

- Continuous five-can WebGL carousel with damped movement, subtle settling sway, modeled lids and pull tabs, metallic reflections, and smoothly interpolated flavor lighting. The selected can's modeled lid and base separate in the collection, then close into place as the product moves into its detail chapter.
- Drag, swipe, arrow buttons, color selectors, and keyboard Left/Right/Home/End.
- Three scroll-controlled product chapters with actual continuous 360-degree model rotation and a single uninterrupted transition from lineup to close-up.
- Responsive desktop, tablet and mobile layouts; local display font; no third-party runtime requests.
- Reduced-motion preference and persistent manual motion toggle; visible keyboard focus; skip link; semantic FAQ; accessible chapter buttons and flavor announcements.

## Files

`dist/index.html` — structure and copy. `dist/styles.css` — all presentation and responsive rules. `dist/app.js` — flavor data, carousel, input and scroll behavior. `dist/scene.js` — Three.js geometry, original label textures, lighting, carousel damping and scroll presentation. `dist/vendor` — locally bundled Three.js (MIT license). `dist/assets` — optimized fallback artwork and Anton typeface, including its OFL license. `server.cjs` — optional local preview server.

## Reference and implementation limits

The reference is an angled camera recording of a laptop, not original website source or a clean screen capture. Its visible composition and progression were inspected at one-second intervals. The result follows that visible experience but does not claim pixel-identical measurements or unseen interactions.

The main product presentation uses modeled can bodies, lids, rims and pull tabs, physically based clearcoat materials, a studio reflection environment, and accent lighting. Labels are original brand typography wrapped around the cylinders. WebGL-unavailable devices retain the image-based fallback. The former cropped floating lid image has been replaced with moving 3D metal parts. VYRA remains fictional and has no checkout or manufactured formula.

## Verification

Checked in Chromium/Edge at 1440×1000, 390×844 and 768×844. Visually reviewed the hero, flavor close-up, rear view, FAQ, and mobile composition. Verified flavor buttons, keyboard changes, chapter navigation, FAQ expansion, menu/Escape, motion setting, and no horizontal overflow. Browser checks reported no page errors or failed asset requests.

## Asset credits

Product images: original AI-generated artwork created for this project. Anton: Vernon Adams, licensed under the SIL Open Font License (see `dist/assets/FONT-LICENSE.txt`). All assets are bundled locally.



## Premium material revision

The can now has a refined multi-ring shoulder, rolled metal seams, recessed aluminum lid, extruded pull tab with rivet, and a concave base. Separate print/metal reflectance maps preserve the ivory label while the lacquer carries broader studio reflections. Locally bundled area lights provide warm softbox fill, a narrow white rim, overhead metal highlights, and flavor-colored fill. Aluminum uses a subtle deterministic brushed bump texture. Supporting cans have reduced exposure and clearcoat to maintain selected-product emphasis.

The selected product also has two restrained spotlights aimed at different parts of its body: a warm shoulder glint and a flavor-colored reflection near the lower label. Their position and color ease with the carousel and scroll transition, and pointer movement shifts the highlights subtly on desktop.

## Scroll spotlight sequence

The product starts at a restrained size on the first detail chapter. In the middle chapter it turns toward its back print and grows while the flavor backdrop dims almost to black. A narrow flavor light follows the label, and a separate emissive ink mask keeps only the small can text readable. The environment and lacquer reflections drop in intensity during this beat; the saturated backdrop and larger can return as the final chapter arrives. The 3D body uses the same full classic-can proportions as the artwork visible while WebGL initializes.

The collection and middle chapter were inspected in-browser after this revision.

The original video was reviewed again for the middle scroll beat. The studio softboxes now dim together while a tighter flavor-colored beam catches one small group of back-label text. The can's other print stays dark; the background retains a soft flavor glow instead of fading to black. The text-focus moment was checked on desktop and mobile in the local preview, followed by the brighter final chapter.

## Performance

The five can labels now use 1024px color maps and 512px lighting masks. This cuts their raw texture pixels by about eight times compared with the earlier 2048px maps while preserving the visible print and spotlight. The renderer caps its pixel ratio at 1.4 on desktop and 1.2 on mobile, skips 3D rendering after the product experience leaves the viewport, and avoids rewriting unchanged lighting styles every frame. Pointer parallax updates once per animation frame. The flavor carousel and scroll spotlight were checked in the local preview after these changes.
