/* eslint-disable react/no-unknown-property */
// Cel shading and the comic look. Every Lambert material in the scene is shown
// through a MeshToonMaterial whose gradient map snaps the light into four flat
// bands. In "comic" mode the same material is also patched to:
//   - posterize and over-saturate its colour (flat, printed-ink colour),
//   - lay a halftone dot screen over the shaded areas (dots grow with the shade),
//   - add a bright rim highlight on lit edges.
// The swap is done on the live scene (and undone when the look is switched
// back), so all the existing scenery works unchanged.
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Four hard steps from shadow to full light.
let bands = null;
function gradientMap() {
  if (!bands) {
    bands = new THREE.DataTexture(new Uint8Array([48, 112, 188, 255]), 4, 1, THREE.RedFormat);
    bands.minFilter = bands.magFilter = THREE.NearestFilter;
    bands.generateMipmaps = false;
    bands.needsUpdate = true;
  }
  return bands;
}

// The comic patch, spliced into the toon fragment shader.
function comicShader(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      {
        // flat printed colour: a touch more saturation, then posterize
        float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, 1.18);
        // posterize the brightness (in perceptual space), keeping the hue, so
        // gradients become flat tonal steps without colour shifts
        vec3 g = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
        float gl = max(dot(g, vec3(0.299, 0.587, 0.114)), 0.001);
        float gq = floor(gl * 7.0 + 0.5) / 7.0;
        g = clamp(g * (max(gq, 0.02) / gl), 0.0, 1.0);
        diffuseColor.rgb = pow(g, vec3(2.2));
      }`
    )
    .replace(
      "#include <opaque_fragment>",
      `{
        // how shaded is this fragment? (lit colour compared with its own colour)
        float lit = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        float own = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.02);
        float shade = clamp(lit / own, 0.0, 1.6);
        // halftone screen at 45 degrees; the dots swell as the shade deepens
        vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 9.0;
        float d = length(fract(q) - 0.5);
        float radius = (1.0 - smoothstep(0.30, 0.85, shade)) * 0.62;
        outgoingLight = mix(outgoingLight, outgoingLight * 0.42, step(d, radius));
        // rim light: a bright edge where the surface turns away from the viewer
        float rim = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += vec3(1.0, 0.95, 0.82) * smoothstep(0.62, 0.78, rim) * 0.32 * step(0.7, shade);
      }
      #include <opaque_fragment>`
    );
}

const cache = { toon: new WeakMap(), comic: new WeakMap() }; // Lambert material -> its twin

function twin(m, mode) {
  if (!m.isMeshLambertMaterial) return m;
  const store = cache[mode];
  let t = store.get(m);
  if (!t) {
    t = new THREE.MeshToonMaterial({ gradientMap: gradientMap() });
    if (mode === "comic") {
      t.onBeforeCompile = comicShader;
      t.customProgramCacheKey = () => "comic";
    }
    store.set(m, t);
  }
  // keep the twin in step with the original (hover glow, textures, colours)
  t.color.copy(m.color);
  t.map = m.map;
  t.emissive.copy(m.emissive);
  t.emissiveIntensity = m.emissiveIntensity;
  t.side = m.side;
  t.transparent = m.transparent;
  t.opacity = m.opacity;
  t.flatShading = m.flatShading;
  return t;
}

export function ToonPass({ mode }) {
  const { scene } = useThree();
  const frame = useRef(0);
  const was = useRef("painted");

  const apply = () => {
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (mode !== "painted") {
        if (!o.userData.celOriginal) o.userData.celOriginal = o.material;
        const src = o.userData.celOriginal;
        o.material = Array.isArray(src) ? src.map((m) => twin(m, mode)) : twin(src, mode);
      } else if (o.userData.celOriginal) {
        o.material = o.userData.celOriginal;
        delete o.userData.celOriginal;
      }
    });
  };

  // Re-run every few frames so meshes that pop in (new locations) are caught too.
  useFrame(() => {
    frame.current++;
    if (mode !== was.current || (mode !== "painted" && frame.current % 4 === 0)) {
      apply();
      was.current = mode;
    }
  });
  return null;
}
