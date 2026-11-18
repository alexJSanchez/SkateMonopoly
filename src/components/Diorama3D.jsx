/* eslint-disable react/no-unknown-property, react/prop-types */
// "Littlest Tokyo"-style art direction: a hand-painted, low-poly diorama.
// Chunky narrow buildings with painted facades, dark inverted-hull outlines,
// a floating slab in a flat sky, a quiet plaza in the middle, and a looping
// "filmed trick". Everything is written in the board's own track units
// (the ring is 11.8 across) and scaled up by UNIT, so tiles and pieces from
// the game sit exactly in it.
//
// Palette (strict): warm terracotta/brick/cream/tan, cool teal/deep teal/slate,
// asphalt + light street + ink. Mustard is reserved for owned-spot flags.
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import boardSpaces from "../game/BoardSpaces";
import { LOCATION_THEMES, MOODS } from "../game/locationThemes";
import { UNIT, track } from "./layout3d";
import { canvasTexture, rngFor } from "./Skate3DEnv";
import { Skater } from "./Skater3D";
import { Camcorder } from "./Models3D";

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
  mustard: "#F2B632", // reserved: owned-spot flags only
  ply: "#B9825A",
  slab: "#7a7064",
  under: "#4a423a",
};
export const DIORAMA_PLAYERS = [PAL.slate, PAL.terracotta];
const SKY = { bg: "#BFD9E8" };

// ---- helpers ---------------------------------------------------------------
const OutlineCtx = createContext(true);
const matCache = new Map();
const lam = (color) => {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
};
const HULL = new THREE.MeshBasicMaterial({ color: PAL.outline, side: THREE.BackSide });

// A box. `t` is the outline thickness (0 = none); `mats` overrides the material.
function B({ pos = [0, 0, 0], size, color, t = 0, rot, mats, cast = true }) {
  const outlines = useContext(OutlineCtx);
  return (
    <group position={pos} rotation={rot}>
      <mesh material={mats ?? lam(color)} castShadow={cast} receiveShadow>
        <boxGeometry args={size} />
      </mesh>
      {t > 0 && outlines && (
        <mesh material={HULL} scale={size.map((s) => (s + 2 * t) / s)}>
          <boxGeometry args={size} />
        </mesh>
      )}
    </group>
  );
}

function Cyl({ pos, r, rTop, h, color, seg = 10, rot, t = 0 }) {
  const outlines = useContext(OutlineCtx);
  return (
    <group position={pos} rotation={rot}>
      <mesh material={lam(color)} castShadow receiveShadow>
        <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
      </mesh>
      {t > 0 && outlines && (
        <mesh material={HULL} scale={[(2 * r + 2 * t) / (2 * r), (h + 2 * t) / h, (2 * r + 2 * t) / (2 * r)]}>
          <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
        </mesh>
      )}
    </group>
  );
}

function Sph({ pos, r, color, flat = false }) {
  return (
    <mesh position={pos} castShadow>
      {flat ? <icosahedronGeometry args={[r, 1]} /> : <sphereGeometry args={[r, 10, 8]} />}
      <meshLambertMaterial color={color} flatShading={flat} />
    </mesh>
  );
}

// ---- tile look (the ring itself is the game's own Space component) ---------------
// Curb strip colours by side, as the art brief asks; the colour-group band on
// the outer edge keeps country sets readable, using palette colours only.
const GROUP_BAND = {
  usa: PAL.terracotta, canada: PAL.slate, spain: PAL.tan, china: PAL.brick, germany: PAL.deepTeal,
  mexico: PAL.teal, africa: PAL.cream, brand: PAL.ink, other: PAL.slab,
};
export function dioramaTile(index) {
  const sp = boardSpaces[index];
  const { row, col } = track(index);
  const even = index % 2 === 0;
  let curb;
  if (row === 10) curb = even ? PAL.terracotta : PAL.brick; // bottom
  else if (col === 0) curb = even ? PAL.teal : PAL.deepTeal; // left
  else if (row === 0) curb = even ? PAL.slate : PAL.teal; // top
  else curb = even ? PAL.brick : PAL.terracotta; // right
  if (sp.type === "chance") curb = PAL.cream;
  return {
    base: sp.type === "corner" ? "#5a5a63" : PAL.asphalt,
    curb,
    band: sp.group ? GROUP_BAND[sp.group] : null,
    text: PAL.cream,
  };
}

// ---- painted textures --------------------------------------------------------
const WORDS = ["KICKS", "RAMEN", "DECKS", "CAFE", "BAR", "TAPES", "NOODLE", "PIZZA", "ARCADE", "SUSHI", "GRIND", "TACOS"];
const SIGN_STYLES = [
  [PAL.cream, PAL.ink], [PAL.deepTeal, PAL.cream], [PAL.ink, PAL.cream], [PAL.brick, PAL.cream], [PAL.tan, PAL.ink],
];

function facadeTexture(w, h, color, seed) {
  const PX = 120;
  const cw = Math.max(64, Math.round(w * PX));
  const ch = Math.round(h * PX);
  return canvasTexture(cw, ch, (ctx) => {
    const r = rngFor(seed);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cw, ch);
    // soft top light, grime toward the bottom, edge highlights
    let g = ctx.createLinearGradient(0, 0, 0, ch * 0.5);
    g.addColorStop(0, "rgba(255,255,255,0.24)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch * 0.5);
    g = ctx.createLinearGradient(0, ch * 0.6, 0, ch);
    g.addColorStop(0, "rgba(30,20,30,0)");
    g.addColorStop(1, "rgba(30,20,30,0.36)");
    ctx.fillStyle = g;
    ctx.fillRect(0, ch * 0.6, cw, ch * 0.4);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(0, 0, 5, ch);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(cw - 5, 0, 5, ch);
    // grid of windows
    const groundH = 0.72 * PX;
    const cols = Math.max(2, Math.round(w / 0.5));
    const floors = Math.max(2, Math.floor((h - 0.72) / 0.55));
    const cellW = cw / cols;
    const cellH = (ch - groundH - 0.2 * PX) / floors;
    const ww = cellW * 0.52;
    const wh = cellH * 0.58;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + (cellW - ww) / 2;
        const y = 0.2 * PX + f * cellH + (cellH - wh) / 2;
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const lit = r() < 0.2;
        ctx.fillStyle = lit ? "#f6e6bd" : PAL.ink;
        ctx.fillRect(x, y, ww, wh);
        if (!lit && r() < 0.3) {
          ctx.fillStyle = r() < 0.5 ? PAL.terracotta : PAL.teal; // a curtain
          ctx.fillRect(x, y, ww, wh * 0.45);
        }
        ctx.fillStyle = PAL.cream; // mullions
        ctx.fillRect(x + ww / 2 - 1, y, 2, wh);
        ctx.fillRect(x, y + wh / 2 - 1, ww, 2);
      }
    }
    // ground-floor shopfront with a door
    ctx.fillStyle = "rgba(46,52,64,0.9)";
    ctx.fillRect(0, ch - groundH, cw, groundH);
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(cw * 0.06, ch - groundH * 0.88, cw * 0.58, groundH * 0.78);
    ctx.fillStyle = "#3a4a5a";
    ctx.fillRect(cw * 0.06 + 3, ch - groundH * 0.88 + 3, cw * 0.58 - 6, groundH * 0.78 - 6);
    ctx.fillStyle = PAL.deepTeal;
    ctx.fillRect(cw * 0.72, ch - groundH * 0.9, cw * 0.2, groundH * 0.9);
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(cw * 0.72 + 4, ch - groundH * 0.55, 5, 8);
  });
}

function signTexture(text, [bg, fg]) {
  return canvasTexture(192, 48, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${text.length > 7 ? 24 : 30}px "Arial Narrow", Impact, "Arial Black", sans-serif`;
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

function stripeTexture(a, b) {
  return canvasTexture(64, 32, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? a : b;
      ctx.fillRect((i * w) / 8, 0, w / 8, h);
    }
  });
}

// ---- a building ----------------------------------------------------------------
// Front face is local +z; the caller rotates it to face the street.
function Building({ w, h, d, facade, roof, word, seed, gable, tall, signStyle, awning, label }) {
  const front = useMemo(() => facadeTexture(w, h, facade, seed), [w, h, facade, seed]);
  const sign = useMemo(() => signTexture(label ?? word, signStyle), [label, word, signStyle]);
  const blade = useMemo(() => signTexture(word, signStyle), [word, signStyle]);
  const stripes = useMemo(() => stripeTexture(PAL.cream, awning), [awning]);
  useEffect(() => () => [front, sign, blade, stripes].forEach((t) => t.dispose()), [front, sign, blade, stripes]);
  const r = useMemo(() => rngFor(seed * 7 + 3), [seed]);
  const extras = useMemo(
    () => ({
      acs: Array.from({ length: 1 + Math.floor(r() * 2) }, () => ({ x: (r() - 0.5) * w * 0.6, y: 1.1 + r() * (h - 1.9) })),
      balcony: r() < 0.45 && h > 2.4,
      tank: r() < 0.4,
      antenna: r() < 0.4,
      pipeSide: r() < 0.5 ? -1 : 1,
    }),
    [r, w, h]
  );
  // sides and roof in flat colour, the painted facade on the front (+z) face
  const mats = useMemo(() => {
    const side = lam(facade);
    return [side, side, lam(roof), lam(PAL.slab), new THREE.MeshLambertMaterial({ map: front }), side];
  }, [facade, roof, front]);
  useEffect(() => () => mats[4].dispose(), [mats]);
  return (
    <group>
      <B pos={[0, h / 2, 0]} size={[w, h, d]} color={facade} mats={mats} t={0.055} />
      {/* roof: a gable, or a flat roof with an overhanging cap */}
      {gable ? <GableRoof w={w + 0.12} d={d + 0.14} h={0.55} y={h} color={roof} /> : (
        <B pos={[0, h + 0.06, 0]} size={[w + 0.14, 0.12, d + 0.14]} color={roof} t={0.03} />
      )}
      {/* shop sign, blade sign, awning */}
      <mesh position={[0, 0.98, d / 2 + 0.03]}>
        <planeGeometry args={[w * 0.78, 0.26]} />
        <meshLambertMaterial map={sign} />
      </mesh>
      {tall && (
        <mesh position={[w / 2 + 0.06, h * 0.62, d / 2 - 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.42, 0.7]} />
          <meshLambertMaterial map={blade} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, 0.66, d / 2 + 0.2]} rotation={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.04, 0.42]} />
        <meshLambertMaterial map={stripes} />
      </mesh>
      {/* AC units with fan discs, a pipe, a balcony with plants */}
      {extras.acs.map((a, i) => (
        <group key={i} position={[a.x, a.y, d / 2 + 0.1]}>
          <B size={[0.34, 0.26, 0.2]} color={PAL.street} />
          <Cyl pos={[0, 0, 0.11]} r={0.09} h={0.02} color={PAL.ink} seg={12} rot={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
      <Cyl pos={[extras.pipeSide * (w / 2 - 0.07), h / 2, d / 2 + 0.04]} r={0.035} h={h} color={PAL.slab} seg={6} />
      {extras.balcony && (
        <group position={[0, 1.7, d / 2 + 0.16]}>
          <B size={[w * 0.7, 0.05, 0.3]} color={PAL.tan} t={0.02} />
          <B pos={[0, 0.16, 0.14]} size={[w * 0.7, 0.03, 0.03]} color={PAL.ink} cast={false} />
          {[-0.3, 0, 0.3].map((k) => (
            <Sph key={k} pos={[k * w * 0.7 * 0.8, 0.12, 0]} r={0.07} color="#6f8f5a" />
          ))}
        </group>
      )}
      {/* rooftop props */}
      {extras.tank && (
        <group position={[w * 0.18, h + (gable ? 0.55 : 0.12), -d * 0.1]}>
          <Cyl pos={[0, 0.24, 0]} r={0.2} h={0.4} color={PAL.tan} t={0.02} />
          <Cyl pos={[0, 0.54, 0]} r={0.23} rTop={0.02} h={0.22} color={PAL.deepTeal} seg={10} />
        </group>
      )}
      {extras.antenna && (
        <group position={[-w * 0.25, h + (gable ? 0.55 : 0.12), -d * 0.15]}>
          <Cyl pos={[0, 0.3, 0]} r={0.015} h={0.6} color={PAL.ink} seg={5} />
          <B pos={[0, 0.45, 0]} size={[0.26, 0.015, 0.015]} color={PAL.ink} cast={false} />
          <B pos={[0, 0.34, 0]} size={[0.2, 0.015, 0.015]} color={PAL.ink} cast={false} />
        </group>
      )}
    </group>
  );
}

// An extruded triangular gable roof with a dark outline.
function GableRoof({ w, d, h, y, color }) {
  const outlines = useContext(OutlineCtx);
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, -h / 2, -d / 2); // bbox centre at the origin
    return g;
  }, [w, d, h]);
  const t = 0.04;
  return (
    <group position={[0, y + h / 2, 0]}>
      <mesh geometry={geom} material={lam(color)} castShadow receiveShadow />
      {outlines && <mesh geometry={geom} material={HULL} scale={[(w + 2 * t) / w, (h + 2 * t) / h, (d + 2 * t) / d]} />}
    </group>
  );
}

// ---- the street layout ----------------------------------------------------------
// Ring (track units): tiles run from |4.5| to |5.9|. Near sides (+x, +z; what the
// camera faces) have their buildings inside the ring; the far sides have them
// outside it, so every facade faces the camera and no building hides a tile.
const WARM_FACADES = [PAL.terracotta, PAL.brick, PAL.cream, PAL.tan];
const COOL_ROOFS = [PAL.teal, PAL.deepTeal, PAL.slate];
const COOL_FACADES = [PAL.teal, PAL.deepTeal, PAL.slate, PAL.cream];
const RED_ROOFS = [PAL.terracotta, PAL.brick];
const WIDTHS = [1.1, 0.9, 1.2, 0.9, 1.1].map((w) => w * 1.5);
const SLOT = [-3.4, -1.7, 0, 1.7, 3.4];
const FRONT = 4.2; // front face of an inside building (sidewalk edge)
const FAR_FRONT = 6.2; // front face of an outside building

function buildLayout() {
  const rng = rngFor(1234);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const out = [];
  const sides = [
    // [name, rotY, warm, front position fn]
    { n: "+z", rot: 0, warm: true, at: (s, d) => [s, 0, FRONT - d / 2] },
    { n: "+x", rot: Math.PI / 2, warm: true, at: (s, d) => [FRONT - d / 2, 0, s] },
    { n: "-z", rot: 0, warm: false, at: (s, d) => [s, 0, -FAR_FRONT - d / 2] },
    { n: "-x", rot: Math.PI / 2, warm: false, at: (s, d) => [-FAR_FRONT - d / 2, 0, s] },
  ];
  sides.forEach((sd, si) => {
    SLOT.forEach((s, i) => {
      // corner slots are taken by the landmarks
      if (sd.n === "+x" && i === 4) return;
      if (sd.n === "+z" && (i === 4 || i === 0)) return;
      if (sd.n === "+x" && i === 0) return;
      const d = 1.5 + rng() * 0.25;
      const h = 2.0 + rng() * 1.4;
      out.push({
        key: `${sd.n}${i}`,
        w: WIDTHS[i], h, d,
        pos: sd.at(s, d), rot: sd.rot,
        facade: pick(sd.warm ? WARM_FACADES : COOL_FACADES),
        roof: pick(sd.warm ? COOL_ROOFS : RED_ROOFS),
        word: pick(WORDS), seed: 100 + si * 10 + i,
        gable: rng() < 0.34, tall: h > 2.7 && rng() < 0.7,
        signStyle: pick(SIGN_STYLES), awning: rng() < 0.5 ? PAL.terracotta : PAL.teal,
      });
    });
  });
  return out;
}

function Landmark({ pos, rot = 0, w, h, d, facade, roof, label, seed, gable = true, awning = PAL.teal }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Building w={w} h={h} d={d} facade={facade} roof={roof} word={label} label={label} seed={seed}
        gable={gable} tall={false} signStyle={[PAL.cream, PAL.ink]} awning={awning} />
    </group>
  );
}

function PocketPark() {
  return (
    <group position={[-7.1, 0, -7.1]}>
      <B pos={[0, 0.04, 0]} size={[1.9, 0.08, 1.9]} color="#7f9a68" t={0.03} />
      {[[-0.5, -0.4], [0.45, 0.35]].map(([x, z], i) => (
        <group key={i} position={[x, 0.08, z]}>
          <Cyl pos={[0, 0.35, 0]} r={0.08} h={0.7} color="#7a5a3e" seg={6} />
          <Sph pos={[0, 0.95, 0]} r={0.46} color={i ? "#5d7f52" : "#6f8f5a"} flat />
        </group>
      ))}
      <B pos={[0.3, 0.2, -0.65]} size={[0.8, 0.07, 0.24]} color={PAL.ply} />
      <B pos={[0.3, 0.36, -0.75]} size={[0.8, 0.22, 0.05]} color={PAL.ply} />
    </group>
  );
}

// ---- plaza: quiet, with a fountain, benches and two trees ---------------------------
function plazaTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const n = 12;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? PAL.tan : PAL.cream;
        ctx.fillRect((x * w) / n, (y * h) / n, w / n + 1, h / n + 1);
      }
    }
    [0.46, 0.36, 0.26].forEach((r, i) => {
      ctx.strokeStyle = i % 2 ? PAL.teal : PAL.terracotta;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = PAL.deepTeal;
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, w - 22, h - 22);
  });
}

function Plaza() {
  const tex = useMemo(plazaTexture, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const jet = useRef();
  useFrame((s) => {
    if (jet.current) jet.current.scale.y = 1 + Math.sin(s.clock.elapsedTime * 3) * 0.12;
  });
  return (
    <group position={[-0.9, 0, -0.9]}>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.4, 5.4]} />
        <meshLambertMaterial map={tex} />
      </mesh>
      {/* fountain */}
      <Cyl pos={[0, 0.22, 0]} r={0.95} h={0.34} color={PAL.street} seg={20} t={0.03} />
      <Cyl pos={[0, 0.4, 0]} r={0.82} h={0.02} color={PAL.teal} seg={20} />
      <Cyl pos={[0, 0.65, 0]} r={0.1} h={0.55} color={PAL.street} seg={8} />
      <Cyl pos={[0, 0.98, 0]} r={0.34} rTop={0.06} h={0.14} color={PAL.street} seg={12} />
      <Cyl pos={[0, 1.02, 0]} r={0.28} h={0.02} color={PAL.teal} seg={12} />
      <mesh ref={jet} position={[0, 1.25, 0]}>
        <coneGeometry args={[0.07, 0.42, 7]} />
        <meshBasicMaterial color="#cfe6ee" />
      </mesh>
      {/* benches */}
      {[[-1.9, 0.2, Math.PI / 2], [1.9, -0.3, -Math.PI / 2], [0.2, 2.0, Math.PI]].map(([x, z, r], i) => (
        <group key={i} position={[x, 0.05, z]} rotation={[0, r, 0]}>
          <B pos={[0, 0.22, 0]} size={[0.9, 0.06, 0.28]} color={PAL.ply} />
          <B pos={[0, 0.4, -0.12]} size={[0.9, 0.2, 0.04]} color={PAL.ply} />
          {[-0.38, 0.38].map((k) => (
            <B key={k} pos={[k, 0.1, 0]} size={[0.06, 0.2, 0.24]} color={PAL.ink} cast={false} />
          ))}
        </group>
      ))}
      {/* two trees */}
      {[[-2.1, -2.0], [2.0, 1.9]].map(([x, z], i) => (
        <group key={i} position={[x, 0.05, z]}>
          <Cyl pos={[0, 0.4, 0]} r={0.09} h={0.8} color="#7a5a3e" seg={6} />
          <Sph pos={[0, 1.1, 0]} r={0.55} color={i ? "#5d7f52" : "#6f8f5a"} flat />
          <Sph pos={[0.25, 0.85, 0.2]} r={0.34} color="#7f9a68" flat />
        </group>
      ))}
    </group>
  );
}

// ---- slab, sidewalks, lamps ----------------------------------------------------------
function Lamp({ pos }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.7, 0]} r={0.03} h={1.4} color={PAL.ink} seg={6} />
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshBasicMaterial color={PAL.cream} />
      </mesh>
    </group>
  );
}

function Base() {
  const lo = -8.0;
  const hi = 5.9;
  const size = hi - lo;
  const c = (hi + lo) / 2;
  return (
    <>
      {/* chunky floating slab with a darker underside block */}
      <B pos={[c, -0.25, c]} size={[size, 0.5, size]} color={PAL.slab} t={0.07} />
      <B pos={[c, -0.78, c]} size={[size - 1.4, 0.56, size - 1.4]} color={PAL.under} t={0.06} />
      {/* light street: the inner ground, and sidewalk strips against every ring side */}
      <mesh position={[c, 0.01, c]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size - 0.04, size - 0.04]} />
        <meshLambertMaterial color={PAL.street} />
      </mesh>
      {[
        [[0, 0.03, 4.35], [9, 0.06, 0.3]],
        [[4.35, 0.03, 0], [0.3, 0.06, 9]],
        [[0, 0.03, -4.35], [9, 0.06, 0.3]],
        [[-4.35, 0.03, 0], [0.3, 0.06, 9]],
        [[0, 0.03, -6.05], [11.8, 0.06, 0.3]],
        [[-6.05, 0.03, 0], [0.3, 0.06, 11.8]],
      ].map(([p, s], i) => (
        <B key={i} pos={p} size={s} color="#cfcabd" cast={false} />
      ))}
      {/* lamps on the street side opposite the buildings */}
      {[-2.8, 0, 2.8].flatMap((s) => [
        <Lamp key={`a${s}`} pos={[s, 0, 5.75]} />,
        <Lamp key={`b${s}`} pos={[5.75, 0, s]} />,
        <Lamp key={`c${s}`} pos={[s, 0, -4.6]} />,
        <Lamp key={`d${s}`} pos={[-4.6, 0, s]} />,
      ])}
    </>
  );
}

// ---- the filmed trick loop (6 s) ---------------------------------------------------------
const R = 0.7;
const LOOP = 6;
const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

function rampGeometry(width) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(R, 0);
  shape.lineTo(R, R);
  for (let i = 20; i >= 0; i--) {
    const x = (R * i) / 20;
    shape.lineTo(x, R - Math.sqrt(Math.max(0, R * R - x * x)));
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  g.translate(0, 0, -width / 2);
  return g;
}

function riderPose(p) {
  // p in [0.15, 0.75] -> ramp-local x/y and board pitch
  const u = (p - 0.15) / 0.6;
  if (u < 0.32) return { x: -2.2 + (u / 0.32) * 2.2, y: 0, pitch: 0 };
  if (u < 0.45) {
    const x = ((u - 0.32) / 0.13) * R * 0.985;
    return { x, y: R - Math.sqrt(R * R - x * x), pitch: Math.min(1.2, Math.atan(x / Math.sqrt(R * R - x * x))) };
  }
  if (u < 0.7) {
    const dt = (u - 0.45) / 0.25;
    return { x: R + dt * 1.0, y: Math.max(0, R + 1.5 * dt - 3 * dt * dt), pitch: (0.6 - dt * 1.4) * 0.6 };
  }
  return { x: R + 1.0 + ((u - 0.7) / 0.3) * 0.9, y: 0, pitch: 0 };
}

function TrickLoop() {
  const group = useRef();
  const rider = useRef();
  const skater = useRef();
  const led = useRef();
  const geom = useMemo(() => rampGeometry(0.9), []);
  const outlines = useContext(OutlineCtx);
  useFrame((s) => {
    const p = (s.clock.elapsedTime % LOOP) / LOOP;
    if (group.current) {
      let k = 0;
      if (p < 0.12) k = Math.max(0, easeOutBack(p / 0.12));
      else if (p < 0.92) k = 1;
      else k = Math.max(0, 1 - (p - 0.92) / 0.08);
      group.current.scale.set(1 + (1 - Math.min(1, k)) * 0.25, k, 1 + (1 - Math.min(1, k)) * 0.25);
    }
    if (rider.current) {
      const on = p >= 0.15 && p <= 0.75;
      rider.current.visible = on;
      if (on) {
        const pose = riderPose(p);
        rider.current.position.set(pose.x, pose.y, 0);
        if (skater.current) skater.current.rotation.z = pose.pitch;
      }
    }
    if (led.current) led.current.visible = Math.floor(s.clock.elapsedTime * 2) % 2 === 0;
  });
  return (
    <group position={[-1.9, 0.05, 1.55]} rotation={[0, 0, 0]}>
      <group ref={group}>
        <mesh geometry={geom} material={lam(PAL.ply)} castShadow receiveShadow />
        {outlines && <mesh geometry={geom} material={HULL} scale={[1.05, 1.03, 1.06]} />}
        <Cyl pos={[R, R, 0]} r={0.025} h={0.95} color={PAL.street} seg={8} rot={[Math.PI / 2, 0, 0]} />
        <group ref={rider}>
          <group ref={skater}>
            <Skater build="lanky" shirt={PAL.teal} scale={0.6} />
          </group>
        </group>
      </group>
      {/* the owned-spot flag: the one place mustard is allowed */}
      <group position={[-0.2, 0, 0.7]}>
        <Cyl pos={[0, 0.4, 0]} r={0.02} h={0.8} color={PAL.ink} seg={6} />
        <B pos={[0.17, 0.68, 0]} size={[0.34, 0.2, 0.02]} color={PAL.mustard} cast={false} />
      </group>
      {/* the filmer, camcorder up, red REC light blinking */}
      <group position={[1.4, 0, 0.9]} rotation={[0, -2.4, 0]}>
        <Skater build="shortie" shirt={PAL.deepTeal} board={false} scale={0.6} />
        <group position={[0.04, 0.4, 0.18]} rotation={[0, Math.PI / 2, 0]} scale={0.45}>
          <Camcorder color={PAL.ink} />
        </group>
        <mesh ref={led} position={[0.07, 0.5, 0.22]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
      </group>
    </group>
  );
}

// ---- sky and light (eases between the locations' moods) ----------------------------------
const SKY_BY_MOOD = {
  day: "#BFD9E8", golden: "#EBCDA6", dusk: "#C5B6D0", night: "#56628a", overcast: "#BCC4CA",
  indoor: "#D4CCBB", neon: "#6a5a8a", snow: "#DEE8EF", home: "#BFD9E8",
};
const tmp = new THREE.Color();
function DioramaAtmosphere({ theme }) {
  const hemi = useRef();
  const key = useRef();
  const { scene } = useThree();
  const mood = MOODS[theme.mood] ?? MOODS.home;
  const sky = SKY_BY_MOOD[theme.mood] ?? SKY.bg;
  // The brief's light colours, nudged toward the location's mood.
  const hemiColor = useMemo(() => new THREE.Color("#dfe8f2").lerp(new THREE.Color(mood.hemi[0]), 0.35), [mood]);
  const keyColor = useMemo(() => new THREE.Color("#fff0d8").lerp(new THREE.Color(mood.key[0]), 0.45), [mood]);
  useEffect(() => {
    scene.background = new THREE.Color(sky);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3);
    scene.background.lerp(tmp.set(sky), k);
    if (hemi.current) hemi.current.color.lerp(hemiColor, k);
    if (key.current) {
      key.current.color.lerp(keyColor, k);
      key.current.intensity += (2.7 + mood.key[1] * 0.18 - key.current.intensity) * k;
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#dfe8f2", "#7a7064", 2.5]} />
      <directionalLight
        ref={key}
        position={[-14, 32, 20]}
        color="#fff0d8"
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

// ---- everything that is not the ring itself -------------------------------------------------
export function DioramaWorld({ sceneSpace, outlines }) {
  const layout = useMemo(buildLayout, []);
  const theme = LOCATION_THEMES[sceneSpace];
  return (
    <OutlineCtx.Provider value={outlines}>
      <DioramaAtmosphere theme={theme} />
      <group scale={UNIT}>
        <Base />
        <Plaza />
        {layout.map((b) => (
          <group key={b.key} position={b.pos} rotation={[0, b.rot, 0]}>
            <Building {...b} />
          </group>
        ))}
        {/* corner landmarks */}
        <Landmark pos={[3.4, 0, FRONT - 1.1]} w={2.2} h={3.1} d={2.2} facade={PAL.terracotta} roof={PAL.teal} label="SKATE SHOP" seed={901} />
        <Landmark pos={[FRONT - 0.9, 0, -3.4]} rot={Math.PI / 2} w={1.9} h={3.0} d={1.8} facade={PAL.slate} roof={PAL.brick} label="POLICE" seed={902} awning={PAL.cream} />
        <Landmark pos={[-3.4, 0, FRONT - 0.9]} w={1.8} h={2.7} d={1.8} facade={PAL.brick} roof={PAL.deepTeal} label="ALLEY" seed={903} gable={false} awning={PAL.terracotta} />
        <PocketPark />
        <TrickLoop />
      </group>
    </OutlineCtx.Provider>
  );
}
