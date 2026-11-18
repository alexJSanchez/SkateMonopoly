// The hand-painted, low-poly look ("Littlest Tokyo"-style miniature): a small,
// strictly applied colour band, soft painted gradients, and dark inverted-hull
// outlines. Everything else in the scene goes through these helpers.
import { createContext } from "react";
import * as THREE from "three";

export const PAL = {
  terracotta: "#C8553D",
  brick: "#9E3F32",
  cream: "#F1E3C6",
  tan: "#E8C9A8",
  teal: "#3F8F8B",
  deepTeal: "#2E5E63",
  slate: "#4F6FA3",
  asphalt: "#4A4A52",
  street: "#B9B4A8",
  ink: "#2E3440",
  outline: "#2a2230",
  mustard: "#F2B632", // RESERVED: owned-spot flags only. Nothing else may use it.
  ply: "#B9825A",
  slab: "#7a7064",
  under: "#4a423a",
};

// Muted greens are allowed for foliage and grass only.
const GREENS = ["#6f8f5a", "#5d7f52", "#7f9a68"];

// Everything that may be painted onto scenery: the palette without mustard.
const toEntry = (hex) => ({ hex, c: new THREE.Color(hex) });
const ALLOWED = [
  PAL.terracotta, PAL.brick, PAL.cream, PAL.tan, PAL.teal, PAL.deepTeal, PAL.slate,
  PAL.asphalt, PAL.street, PAL.ink, PAL.ply, PAL.slab, PAL.under, PAL.outline,
].map(toEntry);
const FOLIAGE = GREENS.map(toEntry);

const snapCache = new Map();

const distance = (c, p) => {
  // weighted so luminance differences count a little more than hue
  const dr = c.r - p.c.r;
  const dg = c.g - p.c.g;
  const db = c.b - p.c.b;
  return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db + 0.4 * Math.pow(0.3 * dr + 0.59 * dg + 0.11 * db, 2);
};

// Snap any colour to the nearest palette colour (idempotent). Mustard is never a
// target. Clearly green colours (leaves, grass) go to the muted greens, which are
// only ever used for foliage.
export function snap(color) {
  if (typeof color !== "string") return color;
  const hit = snapCache.get(color);
  if (hit) return hit;
  const c = new THREE.Color(color);
  const greenish = c.g > c.r * 1.12 && c.g > c.b * 1.12;
  const pool = greenish ? FOLIAGE : ALLOWED;
  let best = pool[0];
  let bestD = Infinity;
  for (const p of pool) {
    const d = distance(c, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  snapCache.set(color, best.hex);
  return best.hex;
}

// Cached flat materials, by (snapped) colour.
const lamCache = new Map();
export function lam(color) {
  const key = snap(color);
  if (!lamCache.has(key)) lamCache.set(key, new THREE.MeshLambertMaterial({ color: key }));
  return lamCache.get(key);
}

// Inverted hull: a BackSide dark shell, scaled out a little from the same geometry.
export const HULL = new THREE.MeshBasicMaterial({ color: PAL.outline, side: THREE.BackSide });
export const OutlineCtx = createContext(true);

// Outline thickness by size (world units): thick on slabs and walls, thin on
// mid-size props, none on small props.
export function outlineFor(maxDim) {
  if (maxDim >= 8) return 0.13;
  if (maxDim >= 3) return 0.085;
  if (maxDim >= 1.2) return 0.05;
  if (maxDim >= 0.75) return 0.03;
  return 0;
}

// Painted finish for a vertical surface: a soft top light, grime toward the
// bottom, and highlights on the vertical edges.
export function paintGradients(ctx, w, h) {
  let g = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  g.addColorStop(0, "rgba(255,255,255,0.24)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.5);
  g = ctx.createLinearGradient(0, h * 0.6, 0, h);
  g.addColorStop(0, "rgba(30,20,30,0)");
  g.addColorStop(1, "rgba(30,20,30,0.36)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 0, 5, h);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(w - 5, 0, 5, h);
}

// The players' colours: slate blue and terracotta, from the palette.
export const PLAYER_PAL = [PAL.slate, PAL.terracotta];

// Sky colour per location mood: soft and pastel, so the diorama always floats in a calm sky.
export const SKY_BY_MOOD = {
  day: "#BFD9E8", golden: "#EBCDA6", dusk: "#C5B6D0", night: "#6b78a0", overcast: "#BCC4CA",
  indoor: "#D4CCBB", neon: "#8a7aa8", snow: "#DEE8EF", home: "#BFD9E8",
};
