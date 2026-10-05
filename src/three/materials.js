// Product materials (MeshPhysicalMaterial presets) + the strip-light sweep: an analytic moving strip light whose
// mirror reflection is added in the material shader (a band in reflection-direction space), so a highlight glides
// over chrome / glass / glossy plastic as a pure function of time without re-filtering the environment.
export function makeMaterials(THREE) {
  const P = o => new THREE.MeshPhysicalMaterial(o);
  const col = c => new THREE.Color(c != null ? c : 0xffffff);
  const M = {
    chrome: (o = {}) => P({ color: col(o.color || 0xf4f6fa), metalness: 1, roughness: o.roughness != null ? o.roughness : .05, envMapIntensity: o.env != null ? o.env : 1.25 }),
    metal: (o = {}) => P({ color: col(o.color || 0xb9bec7), metalness: 1, roughness: o.roughness != null ? o.roughness : .32, envMapIntensity: o.env != null ? o.env : 1.1, clearcoat: o.clearcoat || 0, clearcoatRoughness: .1 }),
    gold: (o = {}) => M.metal({ color: 0xffc66b, roughness: .22, ...o }),
    titanium: (o = {}) => M.metal({ color: 0x8e9196, roughness: .38, ...o }),
    anodized: (o = {}) => M.metal({ color: o.color || 0x2b4c8c, roughness: .42, clearcoat: .6, ...o }),
    // physically transmissive glass (three's transmission pass): tint, ior, thickness, attenuation
    glass: (o = {}) => P({ color: col(o.color || 0xffffff), metalness: 0, roughness: o.roughness != null ? o.roughness : .04, transmission: 1, thickness: o.thickness != null ? o.thickness : .6, ior: o.ior || 1.5,
      attenuationColor: col(o.tint || 0xffffff), attenuationDistance: o.attenuation || 2.5, specularIntensity: 1, envMapIntensity: o.env != null ? o.env : 1.3, dispersion: o.dispersion || 0, side: o.side != null ? o.side : THREE.FrontSide }),
    // cheap glass: no transmission pass (transparent + fresnel-heavy reflections), for many objects / speed
    glassLite: (o = {}) => P({ color: col(o.color || 0xdfe8ff), metalness: 0, roughness: .03, transparent: true, opacity: o.opacity != null ? o.opacity : .22, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: .02, depthWrite: false }),
    ceramic: (o = {}) => P({ color: col(o.color || 0xe6e6e3), metalness: 0, roughness: o.roughness != null ? o.roughness : .32, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: o.env != null ? o.env : 1 }),
    plastic: (o = {}) => P({ color: col(o.color || 0x1c1d22), metalness: 0, roughness: o.roughness != null ? o.roughness : .45, clearcoat: o.clearcoat != null ? o.clearcoat : .3, clearcoatRoughness: .25 }),
    matte: (o = {}) => P({ color: col(o.color || 0x9a9ca3), metalness: 0, roughness: .85 }),
    rubber: (o = {}) => P({ color: col(o.color || 0xe9e9e6), metalness: 0, roughness: .62, sheen: .4, sheenRoughness: .6, sheenColor: col(0xffffff) }),
    // emissive screen from a canvas (or texture); intensity > 1 blooms
    screen: (o = {}) => { const m = P({ color: col(0x050608), metalness: 0, roughness: .12, clearcoat: .35, clearcoatRoughness: .02, emissive: col(0xffffff), emissiveIntensity: o.intensity != null ? o.intensity : 1.6 }); if (o.map) { m.emissiveMap = o.map; } return m; },
  };
  return M;
}
// shared sweep uniforms; sweepify(material, S) injects the strip highlight (keeps the material's own shader otherwise)
export function makeSweep(THREE) {
  // the strip is a vertical light bar standing on a circle (radius uSwRad around the product) at azimuth uSwPhi;
  // a fragment sees it when its reflected ray passes within uSwW of the bar (finite distance → parallax, so the
  // highlight also glides across flat faces), between world heights uSwY.
  const S = { uSwPhi: { value: 0 }, uSwW: { value: .3 }, uSwI: { value: 0 }, uSwRad: { value: 4 }, uSwCol: { value: new THREE.Color(1, 1, 1) }, uSwY: { value: new THREE.Vector2(-.5, 3) } };
  S.apply = m => {
    if (!m || m.__vkSweep || !(m.isMeshStandardMaterial)) return m;
    m.__vkSweep = true;
    // the strip reflects in the sharpest coat: clearcoat roughness when coated (baked as a constant → per-roughness program)
    const ro = Math.min(m.roughness, m.clearcoat > 0 ? m.clearcoatRoughness : 1).toFixed(2);
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, { uSwPhi: S.uSwPhi, uSwW: S.uSwW, uSwI: S.uSwI, uSwRad: S.uSwRad, uSwCol: S.uSwCol, uSwY: S.uSwY });
      sh.fragmentShader = 'uniform float uSwPhi, uSwW, uSwI, uSwRad; uniform vec3 uSwCol; uniform vec2 uSwY;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uSwI > 0.) {
        vec3 swV = normalize(vViewPosition);
        vec3 swR = inverseTransformDirection(reflect(-swV, normal), viewMatrix);
        vec3 swP = cameraPosition + (vec4(-vViewPosition, 0.) * viewMatrix).xyz;
        vec2 swL = uSwRad * vec2(sin(uSwPhi), cos(uSwPhi)), swO = swP.xz; float swLr = max(length(swR.xz), 1e-4); vec2 swDir = swR.xz / swLr;
        float swS0 = dot(swL - swO, swDir), swDd = length(swO + swDir * swS0 - swL), swY = swP.y + swR.y * swS0 / swLr;
        float swW = uSwW + float(${ro}) * max(swS0, 0.) * .5;
        float swB = step(0., swS0) * exp(-swDd * swDd / (swW * swW)) * smoothstep(uSwY.x, uSwY.x + .3, swY) * (1. - smoothstep(uSwY.y - .3, uSwY.y, swY));
        float swF = .04 + .96 * pow(1. - clamp(dot(normal, swV), 0., 1.), 5.);
        vec3 swS = mix(vec3(min(1., swF * 6.)), diffuseColor.rgb, metalnessFactor); // dielectrics: artistic x6 so the strip reads on plastic/ceramic
        float swRo = 1. - float(${ro});
        totalEmissiveRadiance += uSwCol * uSwI * swB * swS * swRo;
      }`);
    };
    m.customProgramCacheKey = () => 'vk-sweep' + ro;
    m.needsUpdate = true; return m;
  };
  S.applyAll = root => { root.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(S.apply); }); return root; };
  // sweeps: [{t, d, from, to (deg azimuth of the bar; 0 = +z, the default camera side), width (world units),
  //           radius (bar distance from the centre), intensity, color, y: [lo, hi] world heights}]
  S.at = (sweeps, t, ease) => {
    let I = 0;
    for (const w of sweeps || []) {
      const u = (t - w.t) / (w.d || 1.2); if (u < 0 || u > 1) continue;
      const e = ease ? ease(u) : u, env = Math.sin(Math.PI * Math.min(1, u * 1.05)) ** .7;
      S.uSwPhi.value = ((w.from != null ? w.from : -70) + ((w.to != null ? w.to : 70) - (w.from != null ? w.from : -70)) * e) * Math.PI / 180;
      S.uSwW.value = w.width || .3; S.uSwRad.value = w.radius || 4; I = (w.intensity != null ? w.intensity : 4) * env;
      S.uSwCol.value.set(w.color || 0xffffff); S.uSwY.value.set(...(w.y || [-.5, 3]));
    }
    S.uSwI.value = I; return I;
  };
  return S;
}
