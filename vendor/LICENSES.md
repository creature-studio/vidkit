# Vendored third-party files

Everything under `vendor/` is redistributed unmodified (except the HDR, which is downsampled) under its own licence.
These files are only used by the optional 3D bundle `dist/vidkit-three.js` (`vk.three`) or by CLI tools (acorn → `vk lint`); `dist/vidkit.js` does not include them.

| Path | What | Version / source | Licence |
|---|---|---|---|
| `three/build/three.core.js`, `three/build/three.module.js` | three.js core (WebGLRenderer build) | three r186 (npm `three@0.186.1`) — https://github.com/mrdoob/three.js | MIT (`three/LICENSE`, © 2010–2026 three.js authors) |
| `three/examples/jsm/loaders/{GLTFLoader,DRACOLoader,HDRLoader,FontLoader}.js`, `three/examples/jsm/utils/{BufferGeometryUtils,SkeletonUtils}.js`, `three/examples/jsm/environments/RoomEnvironment.js`, `three/examples/jsm/geometries/{RoundedBoxGeometry,TextGeometry}.js` | three.js addons | same release | MIT (`three/LICENSE`) |
| `three/examples/jsm/libs/draco/gltf/draco_decoder.wasm`, `draco_wasm_wrapper.js` | Google Draco mesh decoder (glTF build), loaded at runtime only for Draco-compressed GLB files | shipped with three r186 | Apache License 2.0 (https://github.com/google/draco/blob/master/LICENSE; see `three/examples/jsm/libs/draco/README.md`) |
| `hdri/studio_loft_1k.hdr` | "Photo Studio Loft Hall" HDRI, box-downsampled 2048×1024 → 1024×512 (flat RGBE) | Poly Haven — https://polyhaven.com/a/photo_studio_loft_hall | CC0 1.0 (public domain) |
| `acorn/acorn.mjs` | acorn JavaScript parser (ESM build), used only by the `vk lint` CLI (never bundled into dist/) | acorn 8.8.1 — https://github.com/acornjs/acorn | MIT (`acorn/LICENSE`) |

The vidkit code that uses three (`src/three/`) is MIT like the rest of vidkit and is not derived from non-MIT sources.
The HDR sub-frame accumulation-before-bloom design follows the idea described in mexicat/pdoom-video (MIT); the code is a fresh implementation.
