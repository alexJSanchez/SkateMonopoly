/* eslint-disable react/no-unknown-property, react/prop-types */
// The look of the 3D board: a gritty 90s VHS skate-video street spot.
// Everything is procedural (canvas textures + primitives) and seeded, so the
// scene is the same every time. Lambert materials throughout.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SIZE, UNIT } from "./layout3d";
import { Skater } from "./Skater3D";
import { Camcorder } from "./Models3D";

export const GROUND_Y = -0.6;
const CREAM = "#E8DCC0";
const YELLOW = "#F2B632";
const RED = "#D6402B";
const IMPACT = "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif";

// ---- tiny helpers -----------------------------------------------------------
function rngFor(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return t;
}

// Concrete speckle, used on every tile (tinted by the material colour).
let concrete = null;
export function concreteTexture() {
  concrete ??= canvasTexture(128, 128, (ctx, w, h) => {
    const r = rngFor(7);
    ctx.fillStyle = "#f2f0ea";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 150 + Math.floor(r() * 105);
      ctx.fillStyle = `rgba(${v},${v},${v - 6},${0.25 + r() * 0.5})`;
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });
  return concrete;
}

function Lam({ color, ...rest }) {
  return <meshLambertMaterial color={color} {...rest} />;
}

function Box({ pos, size, color, rot, cast = true }) {
  return (
    <mesh position={pos} rotation={rot} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <Lam color={color} />
    </mesh>
  );
}

function Cyl({ pos, r, h, color, seg = 12, rot, rTop }) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
      <Lam color={color} />
    </mesh>
  );
}

// ---- ground, slab, curb -----------------------------------------------------
export function GroundAndSlab() {
  const asphalt = useMemo(
    () =>
      canvasTexture(
        512,
        512,
        (ctx, w, h) => {
          const r = rngFor(11);
          ctx.fillStyle = "#2B2A28";
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 9000; i++) {
            const v = 30 + Math.floor(r() * 55);
            ctx.fillStyle = `rgba(${v},${v},${v},${0.3 + r() * 0.5})`;
            ctx.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
          }
          ctx.strokeStyle = "rgba(10,10,10,0.85)";
          for (let k = 0; k < 7; k++) {
            ctx.lineWidth = 1 + r() * 1.5;
            ctx.beginPath();
            let x = r() * w;
            let y = r() * h;
            ctx.moveTo(x, y);
            for (let s = 0; s < 9; s++) {
              x += (r() - 0.5) * 70;
              y += (r() - 0.3) * 60;
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        },
        10
      ),
    []
  );
  const half = SIZE / 2 + 0.7;
  return (
    <>
      <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[170, 170]} />
        <meshLambertMaterial map={asphalt} />
      </mesh>
      <Box pos={[0, -0.3, 0]} size={[SIZE + 1.4, 0.6, SIZE + 1.4]} color="#6a675f" />
      {/* yellow painted curb band around the slab's top edge */}
      {[
        [[0, 0.04, half - 0.14], [SIZE + 1.4, 0.1, 0.28]],
        [[0, 0.04, -half + 0.14], [SIZE + 1.4, 0.1, 0.28]],
        [[half - 0.14, 0.04, 0], [0.28, 0.1, SIZE + 1.4]],
        [[-half + 0.14, 0.04, 0], [0.28, 0.1, SIZE + 1.4]],
      ].map(([pos, size], i) => (
        <Box key={i} pos={pos} size={size} color={YELLOW} cast={false} />
      ))}
    </>
  );
}

// ---- back walls with graffiti -----------------------------------------------
const TAGS = ["SESSION", "KICKFLIP", "NO COMPLY", "TAPE 94", "RAD", "FILM IT"];
const TAG_COLORS = [RED, YELLOW, "#3E7CB1", CREAM, "#7ad06b", "#e06fb0"];

function wallTexture(seed) {
  return canvasTexture(1450, 350, (ctx, w, h) => {
    const r = rngFor(seed);
    ctx.fillStyle = "#5b5750";
    ctx.fillRect(0, 0, w, h);
    // brick lines
    ctx.strokeStyle = "rgba(20,18,16,0.55)";
    ctx.lineWidth = 2;
    for (let y = 0, row = 0; y < h; y += 22, row++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      for (let x = (row % 2) * 30; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }
    // spray blobs
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = TAG_COLORS[Math.floor(r() * TAG_COLORS.length)];
      ctx.globalAlpha = 0.2 + r() * 0.35;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 20 + r() * 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // outlined tags
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    TAGS.forEach((tag, i) => {
      ctx.save();
      ctx.translate(120 + i * 235 + r() * 40, 70 + r() * 210);
      ctx.rotate((r() - 0.5) * 0.35);
      ctx.font = `${58 + Math.floor(r() * 36)}px ${IMPACT}`;
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#101010";
      ctx.strokeText(tag, 0, 0);
      ctx.fillStyle = TAG_COLORS[i % TAG_COLORS.length];
      ctx.fillText(tag, 0, 0);
      ctx.restore();
    });
    // stickers
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = TAG_COLORS[Math.floor(r() * TAG_COLORS.length)];
      ctx.fillRect(r() * w, r() * (h - 30), 20 + r() * 26, 14 + r() * 18);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r() * w, r() * (h - 30), 14, 10);
    }
  });
}

export function Walls() {
  const tex = useMemo(() => [wallTexture(21), wallTexture(33)], []);
  const L = SIZE + 8;
  const H = 7;
  const off = SIZE / 2 + 3.4;
  const y = GROUND_Y + H / 2;
  return (
    <>
      {/* wall on the far -x side, facing +x */}
      <group position={[-off, 0, 0]}>
        <Box pos={[0, y, 0]} size={[0.5, H, L]} color="#4a4742" cast={false} />
        <mesh position={[0.26, y, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[L, H]} />
          <meshLambertMaterial map={tex[0]} />
        </mesh>
        <Box pos={[0, GROUND_Y + H + 0.12, 0]} size={[0.8, 0.25, L + 0.3]} color="#8c8a82" cast={false} />
      </group>
      {/* wall on the far -z side, facing +z */}
      <group position={[0, 0, -off]}>
        <Box pos={[0, y, 0]} size={[L, H, 0.5]} color="#4a4742" cast={false} />
        <mesh position={[0, y, 0.26]} receiveShadow>
          <planeGeometry args={[L, H]} />
          <meshLambertMaterial map={tex[1]} />
        </mesh>
        <Box pos={[0, GROUND_Y + H + 0.12, 0]} size={[L + 0.3, 0.25, 0.8]} color="#8c8a82" cast={false} />
      </group>
    </>
  );
}

// ---- street lamp and street props -------------------------------------------
export function StreetLamp() {
  const x = -SIZE / 2 - 1.6;
  const z = -SIZE / 2 - 1.6;
  const top = GROUND_Y + 7.6;
  return (
    <group position={[x, 0, z]}>
      <Cyl pos={[0, GROUND_Y + 3.8, 0]} r={0.14} h={7.6} color="#33363a" seg={8} />
      <Cyl pos={[0, GROUND_Y + 0.15, 0]} r={0.3} h={0.3} color="#2a2c2f" seg={8} />
      <Box pos={[0.9, top, 0.9]} size={[2.2, 0.12, 0.12]} color="#33363a" rot={[0, -Math.PI / 4, 0]} />
      <mesh position={[1.7, top - 0.2, 1.7]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshBasicMaterial color="#ffe7b0" />
      </mesh>
      <pointLight position={[1.7, top - 0.5, 1.7]} color="#ffd9a0" intensity={90} distance={34} decay={2} />
    </group>
  );
}

function Cone({ pos }) {
  return (
    <group position={pos}>
      <Box pos={[0, 0.04, 0]} size={[0.6, 0.08, 0.6]} color="#e8631f" />
      <Cyl pos={[0, 0.45, 0]} r={0.26} rTop={0.05} h={0.75} color="#f26a1f" seg={10} />
      <Cyl pos={[0, 0.5, 0]} r={0.19} rTop={0.14} h={0.1} color="#ececec" seg={10} />
    </group>
  );
}

export function StreetProps() {
  const g = GROUND_Y;
  const d = SIZE / 2 + 2.6;
  return (
    <>
      {/* traffic cones */}
      {[
        [d + 0.4, g, 7],
        [d + 1.6, g, 8.2],
        [8.5, g, d + 2.4],
        [-d - 0.2, g, -4],
      ].map((p, i) => (
        <Cone key={i} pos={p} />
      ))}
      {/* fire hydrant */}
      <group position={[d + 1.2, g, -6]}>
        <Cyl pos={[0, 0.5, 0]} r={0.22} h={1} color="#c23b2a" seg={10} />
        <mesh position={[0, 1.02, 0]} castShadow>
          <sphereGeometry args={[0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Lam color="#c23b2a" />
        </mesh>
        <Cyl pos={[0, 0.65, 0]} r={0.11} h={0.7} color="#a52f20" seg={8} rot={[0, 0, Math.PI / 2]} />
      </group>
      {/* crates */}
      <Box pos={[d + 1.5, g + 0.45, 3]} size={[0.9, 0.9, 0.9]} color="#8a6a3e" rot={[0, 0.2, 0]} />
      <Box pos={[d + 1.4, g + 1.35, 3.1]} size={[0.8, 0.8, 0.8]} color="#7a5c34" rot={[0, -0.3, 0]} />
      <Box pos={[-d - 1.2, g + 0.45, 5]} size={[0.9, 0.9, 0.9]} color="#8a6a3e" rot={[0, 0.5, 0]} />
      {/* trash can */}
      <group position={[-d - 0.8, g, -7]}>
        <Cyl pos={[0, 0.55, 0]} r={0.4} rTop={0.46} h={1.1} color="#585b5e" seg={12} />
        <Cyl pos={[0, 1.14, 0]} r={0.5} h={0.1} color="#44474a" seg={12} />
      </group>
      {/* manhole cover */}
      <mesh position={[-7, g + 0.015, d + 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.7, 20]} />
        <Lam color="#3a3a38" />
      </mesh>
    </>
  );
}

// ---- the 9x9 centre mat -----------------------------------------------------
function Barcode({ ctx, x, y, w, h, seed }) {
  const r = rngFor(seed);
  ctx.fillStyle = CREAM;
  for (let bx = x; bx < x + w; ) {
    const bw = 1 + Math.floor(r() * 4);
    ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(r() * 4);
  }
}

export function CenterMat() {
  const inner = 9 * UNIT;
  const tex = useMemo(
    () =>
      canvasTexture(768, 768, (ctx, w, h) => {
        ctx.fillStyle = "#1c1d20";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(232,220,192,0.07)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= w; i += 48) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, h);
          ctx.moveTo(0, i);
          ctx.lineTo(w, i);
          ctx.stroke();
        }
        ctx.strokeStyle = YELLOW;
        ctx.lineWidth = 6;
        ctx.setLineDash([26, 16]);
        ctx.strokeRect(18, 18, w - 36, h - 36);
        ctx.setLineDash([]);
        // everything below reads along the screen's horizontal (turned 45deg)
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `130px ${IMPACT}`;
        ctx.fillStyle = RED;
        ctx.fillText("TAPE 94", 6, -34);
        ctx.fillStyle = CREAM;
        ctx.fillText("TAPE 94", 0, -40);
        ctx.font = `bold 22px monospace`;
        ctx.fillText("SIDE A - SKATE SESSION - SP", 0, 40);
        Barcode({ ctx, x: -130, y: 62, w: 260, h: 26, seed: 5 });
        ctx.restore();
      }),
    []
  );
  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[inner, inner]} />
      <meshLambertMaterial map={tex} />
    </mesh>
  );
}

// ---- the CRT TV that replays the trick --------------------------------------
function drawTvFrame(ctx, w, h, t, rng) {
  ctx.fillStyle = "#35634f";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#2b2a28";
  ctx.fillRect(0, 100, w, h - 100);
  // tiny replay: a quarter-pipe and a skater arcing off the lip
  ctx.fillStyle = "#c9964e";
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(90, 100);
  ctx.lineTo(90, 50);
  ctx.quadraticCurveTo(90, 100, 40, 100);
  ctx.fill();
  const p = (t % 3.6) / 3.6;
  const sx = 10 + p * 140;
  const sy = 98 - Math.sin(Math.min(1, Math.max(0, (p - 0.35) / 0.4)) * Math.PI) * 46;
  ctx.fillStyle = CREAM;
  ctx.fillRect(sx - 5, sy - 16, 10, 14);
  ctx.fillRect(sx - 11, sy - 2, 22, 4);
  // static lines
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + rng() * 0.18})`;
    ctx.fillRect(0, rng() * h, w, 1 + rng() * 2);
  }
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.font = "bold 11px monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = CREAM;
  ctx.fillText("PLAY ▶", 8, 8);
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = RED;
    ctx.fillText("● REC", w - 50, 8);
  }
  ctx.fillStyle = CREAM;
  ctx.fillText("SEP 12 1994", 8, h - 18);
}

function TvSet() {
  const mesh = useRef();
  const state = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 120;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const rng = rngFor(99);
    drawTvFrame(c.getContext("2d"), 160, 120, 0, rng); // first frame, before the timed redraws
    return { c, tex, acc: 0, rng };
  }, []);
  useFrame((s, dt) => {
    state.acc += dt;
    if (state.acc < 1 / 8) return;
    state.acc = 0;
    drawTvFrame(state.c.getContext("2d"), 160, 120, s.clock.elapsedTime, state.rng);
    state.tex.needsUpdate = true;
  });
  return (
    <group ref={mesh}>
      <Box pos={[0, 0.2, 0]} size={[2.3, 0.4, 1.5]} color="#26282b" />
      <Box pos={[1.0, 0.2, 0.76]} size={[0.3, 0.06, 0.02]} color={YELLOW} cast={false} />
      <Box pos={[0, 1.25, 0]} size={[2.1, 1.7, 1.3]} color="#7b756a" />
      <Box pos={[0, 1.25, -0.5]} size={[1.6, 1.3, 0.8]} color="#6d675d" />
      <mesh position={[-0.12, 1.25, 0.652]}>
        <planeGeometry args={[1.5, 1.12]} />
        <meshBasicMaterial map={state.tex} />
      </mesh>
      <Cyl pos={[0.85, 1.55, 0.66]} r={0.08} h={0.06} color="#222" seg={10} rot={[Math.PI / 2, 0, 0]} />
      <Cyl pos={[0.85, 1.2, 0.66]} r={0.08} h={0.06} color="#222" seg={10} rot={[Math.PI / 2, 0, 0]} />
      <Box pos={[0.2, 2.3, -0.1]} size={[0.04, 0.5, 0.04]} color="#bbb" rot={[0, 0, 0.5]} />
      <Box pos={[-0.2, 2.3, -0.1]} size={[0.04, 0.5, 0.04]} color="#bbb" rot={[0, 0, -0.5]} />
    </group>
  );
}

// ---- centre props -----------------------------------------------------------
const STICKER_COLORS = [RED, YELLOW, "#3E7CB1", CREAM, "#7ad06b", "#e06fb0"];

export function CenterProps() {
  const stickers = useMemo(() => {
    const r = rngFor(404);
    return Array.from({ length: 16 }, () => {
      const x = (r() - 0.5) * 8.4;
      let z = (r() - 0.5) * 8.4;
      // keep clear of the title band, which runs along x = -z
      const u = x + z;
      if (Math.abs(u) < 2.4) z += (u >= 0 ? 1 : -1) * (2.4 - Math.abs(u));
      return {
        x,
        z: THREE.MathUtils.clamp(z, -4.4, 4.4),
        rot: r() * Math.PI,
        s: 0.28 + r() * 0.3,
        c: STICKER_COLORS[Math.floor(r() * STICKER_COLORS.length)],
      };
    });
  }, []);
  const y = 0.012;
  return (
    <group position={[0, y, 0]}>
      {/* CRT TV on a VCR, in the far corner, turned to face the camera */}
      <group position={[-2.9, 0, -2.9]} rotation={[0, Math.PI / 4, 0]}>
        <TvSet />
      </group>

      {/* The title runs along the screen's horizontal (the board's x = -z diagonal),
          so props live toward the top and bottom corners and out at the sides. */}
      {/* stack of 4 VHS tapes */}
      <group position={[-4.0, 0, -0.5]} rotation={[0, 0.5, 0]}>
        {["#D6402B", "#F2B632", "#3E7CB1", "#E8DCC0"].map((c, i) => (
          <group key={c} position={[0, 0.07 + i * 0.14, 0]} rotation={[0, (i - 1.5) * 0.12, 0]}>
            <Box pos={[0, 0, 0]} size={[1.0, 0.13, 0.55]} color="#1d1f21" />
            <Box pos={[0, 0.07, 0]} size={[0.6, 0.01, 0.3]} color={c} cast={false} />
          </group>
        ))}
      </group>

      {/* camcorder */}
      <group position={[1.8, 0, 3.0]} rotation={[0, 0.7, 0]} scale={1.5}>
        <Camcorder color="#555a5e" />
      </group>

      {/* boombox */}
      <group position={[-1.6, 0, 4.0]} rotation={[0, Math.PI / 4 + 0.15, 0]}>
        <Box pos={[0, 0.4, 0]} size={[1.7, 0.8, 0.6]} color="#3a3d41" />
        {[-0.5, 0.5].map((x) => (
          <group key={x}>
            <Cyl pos={[x, 0.4, 0.31]} r={0.24} h={0.06} color="#15171a" seg={14} rot={[Math.PI / 2, 0, 0]} />
            <Cyl pos={[x, 0.4, 0.34]} r={0.09} h={0.05} color="#8c8a82" seg={10} rot={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
        <Box pos={[0, 0.84, 0]} size={[1.0, 0.06, 0.06]} color="#b9bcba" cast={false} />
        <Box pos={[0, 0.55, 0.31]} size={[0.5, 0.18, 0.02]} color={YELLOW} cast={false} />
      </group>

      {/* stack of 3 skate decks */}
      <group position={[3.5, 0, 0.6]} rotation={[0, -0.3, 0]}>
        {["#D6402B", "#3E7CB1", "#F2B632"].map((c, i) => (
          <group key={c} position={[0, 0.03 + i * 0.07, 0]} rotation={[0, i * 0.18 - 0.15, 0]}>
            <Box pos={[0, 0, 0]} size={[1.5, 0.06, 0.42]} color="#c99a52" />
            <Box pos={[0, 0.035, 0]} size={[1.2, 0.005, 0.1]} color={c} cast={false} />
          </group>
        ))}
      </group>

      {/* spray cans */}
      {[
        [0.9, -4.3, RED],
        [1.35, -4.4, YELLOW],
        [1.8, -4.25, "#3E7CB1"],
        [2.2, -4.4, "#7ad06b"],
      ].map(([x, z, c], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl pos={[0, 0.3, 0]} r={0.1} h={0.6} color={c} seg={10} />
          <Cyl pos={[0, 0.66, 0]} r={0.05} h={0.12} color="#cfcfcf" seg={8} />
        </group>
      ))}

      {/* Chance and Chest card stacks */}
      <Box pos={[4.1, 0.06, -0.9]} size={[0.55, 0.12, 0.8]} color="#e8a05a" rot={[0, 0.2, 0]} />
      <Box pos={[4.2, 0.06, -1.9]} size={[0.55, 0.12, 0.8]} color="#6fa0d8" rot={[0, -0.15, 0]} />

      {/* money stacks */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.4 + i * 0.75, 0, -4.1]} rotation={[0, i * 0.3, 0]}>
          <Box pos={[0, 0.07 + i * 0.03, 0]} size={[0.6, 0.14 + i * 0.06, 0.3]} color="#7cab76" />
          <Box pos={[0, 0.16 + i * 0.06, 0]} size={[0.15, 0.01, 0.31]} color="#e8dcc0" cast={false} />
        </group>
      ))}

      {/* scattered stickers */}
      {stickers.map((s, i) => (
        <mesh key={i} position={[s.x, 0.012, s.z]} rotation={[-Math.PI / 2, 0, s.rot]}>
          <planeGeometry args={[s.s, s.s * 0.7]} />
          <meshLambertMaterial color={s.c} />
        </mesh>
      ))}
    </group>
  );
}

// ---- the looping trick: skater, ramp, filmer ---------------------------------
const R = 1.8; // quarter-pipe radius (and height)
const LOOP = 3.6;

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

// Position and board pitch of the trick skater over the loop (ramp-local space).
function trickPose(t) {
  if (t < 1.3) return { x: -7 + (t / 1.3) * 7, y: 0, pitch: 0 };
  if (t < 2.0) {
    const x = ((t - 1.3) / 0.7) * R * 0.985;
    return { x, y: R - Math.sqrt(R * R - x * x), pitch: Math.min(1.2, Math.atan(x / Math.sqrt(R * R - x * x))) };
  }
  if (t < 2.8) {
    const dt = t - 2.0;
    const vy = 3.4 - 14 * dt;
    return { x: R + 2.2 * dt, y: Math.max(0, R + 3.4 * dt - 7 * dt * dt), pitch: Math.atan2(vy, 2.2) * 0.5 };
  }
  return { x: R + 2.2 * 0.8 + ((t - 2.8) / 0.8) * 1.7, y: 0, pitch: 0 };
}

export function TrickLoop() {
  const rider = useRef();
  const led = useRef();
  const geom = useMemo(() => rampGeometry(2.4), []);
  useFrame((s) => {
    const p = trickPose(s.clock.elapsedTime % LOOP);
    if (rider.current) {
      rider.current.position.set(p.x, p.y, 0);
      rider.current.rotation.z = p.pitch;
    }
    if (led.current) led.current.visible = Math.floor(s.clock.elapsedTime * 2) % 2 === 0;
  });
  return (
    <group position={[-1.5, GROUND_Y, SIZE / 2 + 3.6]}>
      <mesh geometry={geom} castShadow receiveShadow>
        <meshLambertMaterial color="#8a6a3e" />
      </mesh>
      <Cyl pos={[R, R, 0]} r={0.05} h={2.5} color="#c3c6c8" seg={8} rot={[Math.PI / 2, 0, 0]} />
      <group ref={rider}>
        <Skater build="pro" shirt="#d6402b" scale={1.25} />
      </group>
      {/* the filmer, camcorder up, red REC light blinking */}
      <group position={[2.0, 0, 2.7]} rotation={[0, Math.PI, 0]}>
        <Skater build="shortie" shirt="#3E7CB1" board={false} scale={1.25} />
        <group position={[0.05, 0.72, 0.28]} rotation={[0, Math.PI / 2, 0]} scale={0.7}>
          <Camcorder color="#444" />
        </group>
        <mesh ref={led} position={[0.1, 0.86, 0.36]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
      </group>
    </group>
  );
}
