/* eslint-disable react/no-unknown-property */
// Cel shading: every Lambert material in the scene is shown through a
// MeshToonMaterial whose gradient map snaps the light into four flat bands.
// The swap is done on the live scene (and undone when the look is switched
// off), so all the existing scenery works unchanged.
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

const toonOf = new WeakMap(); // Lambert material -> its toon twin

function twin(m) {
  if (!m.isMeshLambertMaterial) return m;
  let t = toonOf.get(m);
  if (!t) {
    t = new THREE.MeshToonMaterial({ gradientMap: gradientMap() });
    toonOf.set(m, t);
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

export function ToonPass({ on }) {
  const { scene } = useThree();
  const frame = useRef(0);
  const was = useRef(false);

  const apply = () => {
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (on) {
        if (!o.userData.celOriginal) o.userData.celOriginal = o.material;
        const src = o.userData.celOriginal;
        o.material = Array.isArray(src) ? src.map(twin) : twin(src);
      } else if (o.userData.celOriginal) {
        o.material = o.userData.celOriginal;
        delete o.userData.celOriginal;
      }
    });
  };

  // Re-run every few frames so meshes that pop in (new locations) are caught too.
  useFrame(() => {
    frame.current++;
    if (on !== was.current || (on && frame.current % 4 === 0)) {
      apply();
      was.current = on;
    }
  });
  return null;
}
