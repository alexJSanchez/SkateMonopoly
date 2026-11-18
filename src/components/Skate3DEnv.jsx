/* eslint-disable react/no-unknown-property, react/prop-types */
// The street-spot scene: slab, centre mat, props and the looping filmed trick,
// painted in the hand-painted low-poly style (src/components/paint.js): strict
// palette, painted gradients, dark inverted-hull outlines. Everything is
// procedural (canvas textures + primitives) and seeded, so it is the same every
// time. Lambert materials throughout.
import { useContext, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SIZE, UNIT } from "./layout3d";
import { Skater } from "./Skater3D";
import { Camcorder } from "./Models3D";
import { HULL, OutlineCtx, PAL, lam, outlineFor, snap } from "./paint";

export const GROUND_Y = -0.6;
// Palette stand-ins for the colours this scene used to hard-code.
const CREAM = PAL.cream;
const YELLOW = PAL.tan; // (mustard is reserved for flags)
const RED = PAL.terracotta;
const IMPACT = "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif";

// ---- tiny helpers -----------------------------------------------------------
export function rngFor(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(w, h, draw, repeat) {
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

// The tiles' painted surface: a soft top-left light and a little brush-stroke
// texture instead of noise (tinted by the material colour).
let concrete = null;
export function concreteTexture() {
  concrete ??= canvasTexture(128, 128, (ctx, w, h) => {
    const r = rngFor(7);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#dcd9d2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
      ctx.lineWidth = 2 + r() * 3;
      ctx.beginPath();
      const x = r() * w;
      const y = r() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 + r() * 26, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
  });
  return concrete;
}

export function Lam({ color, ...rest }) {
  return <meshLambertMaterial color={snap(color)} {...rest} />;
}

// A box. Its dark inverted-hull outline is sized to the box (see outlineFor);
// pass t to override, t={0} for none.
export function Box({ pos, size, color, rot, cast = true, t }) {
  const outlines = useContext(OutlineCtx);
  const th = t ?? outlineFor(Math.max(...size));
  return (
    <group position={pos} rotation={rot}>
      <mesh material={lam(color)} castShadow={cast} receiveShadow>
        <boxGeometry args={size} />
      </mesh>
      {th > 0 && outlines && (
        <mesh material={HULL} scale={size.map((v) => (v + 2 * th) / v)}>
          <boxGeometry args={size} />
        </mesh>
      )}
    </group>
  );
}

export function Cyl({ pos, r, h, color, seg = 12, rot, rTop, t }) {
  const outlines = useContext(OutlineCtx);
  const th = t ?? outlineFor(Math.max(2 * r, h));
  return (
    <group position={pos} rotation={rot}>
      <mesh material={lam(color)} castShadow receiveShadow>
        <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
      </mesh>
      {th > 0 && outlines && (
        <mesh material={HULL} scale={[(2 * r + 2 * th) / (2 * r), (h + 2 * th) / h, (2 * r + 2 * th) / (2 * r)]}>
          <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
        </mesh>
      )}
    </group>
  );
}

// ---- the slab the board sits on, with its painted curb -------------------------
export function Slab() {
  const half = SIZE / 2 + 0.7;
  return (
    <>
      <Box pos={[0, -0.3, 0]} size={[SIZE + 1.4, 0.6, SIZE + 1.4]} color={PAL.slab} />
      {/* painted curb band around the slab's top edge */}
      {[
        [[0, 0.04, half - 0.14], [SIZE + 1.4, 0.1, 0.28]],
        [[0, 0.04, -half + 0.14], [SIZE + 1.4, 0.1, 0.28]],
        [[half - 0.14, 0.04, 0], [0.28, 0.1, SIZE + 1.4]],
        [[-half + 0.14, 0.04, 0], [0.28, 0.1, SIZE + 1.4]],
      ].map(([pos, size], i) => (
        <Box key={i} pos={pos} size={size} color={YELLOW} cast={false} t={0} />
      ))}
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
        ctx.fillStyle = PAL.ink;
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
  ctx.fillStyle = PAL.asphalt;
  ctx.fillRect(0, 100, w, h - 100);
  // tiny replay: a quarter-pipe and a skater arcing off the lip
  ctx.fillStyle = PAL.ply;
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
          <meshLambertMaterial color={snap(s.c)} />
        </mesh>
      ))}
    </group>
  );
}

// ---- the filmed trick: a 6 s loop ---------------------------------------------------
// 0-12%  a quarter-pipe pops in (squash and stretch) with a flag on its tile
// 15-75% the skater rides it, launches off the lip in an ollie and lands
// ~60%   a camera flash;  72-92% a "NEW SPOT" stamp (in the page overlay);
// 92-100% the ramp shrinks away, then it repeats.
const R = 1.8; // quarter-pipe radius (and height)
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

// Ramp-local position and board pitch of the skater at loop progress p (0.15-0.75).
function trickPose(p) {
  const u = (p - 0.15) / 0.6;
  if (u < 0.32) return { x: -7 + (u / 0.32) * 7, y: 0, pitch: 0 };
  if (u < 0.45) {
    const x = ((u - 0.32) / 0.13) * R * 0.985;
    return { x, y: R - Math.sqrt(R * R - x * x), pitch: Math.min(1.2, Math.atan(x / Math.sqrt(R * R - x * x))) };
  }
  if (u < 0.7) {
    const dt = (u - 0.45) / 0.25;
    return { x: R + dt * 2.6, y: Math.max(0, R + 3.0 * dt - 5.2 * dt * dt), pitch: (0.6 - dt * 1.4) * 0.6 };
  }
  return { x: R + 2.6 + ((u - 0.7) / 0.3) * 1.6, y: 0, pitch: 0 };
}

export function TrickLoop() {
  const outlines = useContext(OutlineCtx);
  const ramp = useRef();
  const rider = useRef();
  const board = useRef();
  const led = useRef();
  const geom = useMemo(() => rampGeometry(2.4), []);
  useFrame((s) => {
    const p = (s.clock.elapsedTime % LOOP) / LOOP;
    if (ramp.current) {
      // pop in with squash and stretch (back-out on Y, widening on XZ), hold, then shrink away
      let k;
      if (p < 0.12) k = Math.max(0, easeOutBack(p / 0.12));
      else if (p < 0.92) k = 1;
      else k = Math.max(0, 1 - (p - 0.92) / 0.08);
      const wide = 1 + (1 - Math.min(1, k)) * 0.25;
      ramp.current.scale.set(wide, k, wide);
    }
    if (rider.current) {
      const on = p >= 0.15 && p <= 0.75;
      rider.current.visible = on;
      if (on) {
        const pose = trickPose(p);
        rider.current.position.set(pose.x, pose.y, 0);
        if (board.current) board.current.rotation.z = pose.pitch;
      }
    }
    if (led.current) led.current.visible = Math.floor(s.clock.elapsedTime * 2) % 2 === 0;
  });
  return (
    <group position={[-1.5, GROUND_Y, SIZE / 2 + 3.6]}>
      <group ref={ramp}>
        <mesh geometry={geom} material={lam(PAL.ply)} castShadow receiveShadow />
        {outlines && <mesh geometry={geom} material={HULL} scale={[1.05, 1.04, 1.07]} />}
        <Cyl pos={[R, R, 0]} r={0.05} h={2.5} color={PAL.street} seg={8} rot={[Math.PI / 2, 0, 0]} t={0} />
      </group>
      <group ref={rider}>
        <group ref={board}>
          <Skater build="lanky" shirt={PAL.teal} scale={1.25} />
        </group>
      </group>
      {/* the owned-spot flag: the one place mustard is allowed */}
      <group position={[-0.6, 0, 2.4]}>
        <Cyl pos={[0, 0.9, 0]} r={0.04} h={1.8} color={PAL.ink} seg={6} t={0} />
        <mesh position={[0.4, 1.55, 0]}>
          <boxGeometry args={[0.8, 0.5, 0.04]} />
          <meshLambertMaterial color={PAL.mustard} />
        </mesh>
      </group>
      {/* the filmer, camcorder up, red REC light blinking */}
      <group position={[2.4, 0, 3.4]} rotation={[0, Math.PI, 0]}>
        <Skater build="shortie" shirt={PAL.deepTeal} board={false} scale={1.25} />
        <group position={[0.1, 0.9, 0.35]} rotation={[0, Math.PI / 2, 0]} scale={0.8}>
          <Camcorder color={PAL.ink} />
        </group>
        <mesh ref={led} position={[0.15, 1.08, 0.42]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color="#ff2a1a" />
        </mesh>
      </group>
    </group>
  );
}
