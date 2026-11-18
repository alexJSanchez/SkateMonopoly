/* eslint-disable react/no-unknown-property, react/prop-types */
// Location scenery. Each board space has a theme (src/game/locationThemes.js);
// this turns a theme into ground, back walls, props, sky and light. Everything
// is procedural (canvas textures + primitives), seeded, Lambert-shaded.
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MOODS } from "../game/locationThemes";
import { SIZE, TILE_H, outerEdgePoint, spaceRect } from "./layout3d";
import { Box, Cyl, GROUND_Y, Lam, TrickLoop, canvasTexture, rngFor } from "./Skate3DEnv";
import { BounceGroup, OUT_S, PopCtx, PopGroup, STAGGER, nowS } from "./pop";
import { HULL, OutlineCtx, PAL, SKY_BY_MOOD, lam, look, paintGradients, snap } from "./paint";

const IMPACT = "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif";
const CJK = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";
const CREAM = PAL.cream;
const WALL_OFF = SIZE / 2 + 6.5; // the two back walls stand this far from the centre
const WALL_H = 8;

// Where props can stand, as [x, z] on the ground around the board. They hug the
// two back walls (the sides the isometric camera looks toward) so the setting
// is always on screen; BL / BR sit on the right-hand edge.
const SLOTS = {
  F: [-12.6, -12.6],
  FL: [-14.4, -5.6],
  FR: [-5.6, -14.4],
  FLL: [-14.4, 2.4],
  FRR: [2.4, -14.4],
  LF: [-14.4, 10],
  RF: [10, -14.4],
  LB: [-14.4, -11],
  RB: [-11, -14.4],
  BL: [15.4, -8],
  BR: [15.4, 0],
};

// ---- ground -----------------------------------------------------------------
function speckle(ctx, w, h, r, n, lo, hi, a = 0.5) {
  for (let i = 0; i < n; i++) {
    const v = lo + Math.floor(r() * (hi - lo));
    ctx.fillStyle = `rgba(${v},${v},${v},${(0.2 + r() * a) * 0.45})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

function groundTexture([kind, color]) {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const r = rngFor(kind.length * 31 + 5);
      ctx.fillStyle = snap(color);
      ctx.fillRect(0, 0, w, h);
      switch (kind) {
        case "sand":
          speckle(ctx, w, h, r, 9000, 150, 255, 0.5);
          ctx.strokeStyle = "rgba(120,90,50,0.18)";
          for (let y = 20; y < h; y += 34) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 40 + y) * 5);
            ctx.stroke();
          }
          break;
        case "dirt":
          speckle(ctx, w, h, r, 7000, 40, 200, 0.5);
          for (let i = 0; i < 40; i++) {
            ctx.fillStyle = `rgba(60,30,10,${0.06 + r() * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(r() * w, r() * h, 10 + r() * 36, 6 + r() * 22, r() * 3, 0, 7);
            ctx.fill();
          }
          break;
        case "grass":
          for (let i = 0; i < 9000; i++) {
            const g = 90 + Math.floor(r() * 90);
            ctx.fillStyle = `rgba(${40 + r() * 40},${g},${40 + r() * 30},0.55)`;
            ctx.fillRect(r() * w, r() * h, 1.5, 3 + r() * 4);
          }
          break;
        case "snow":
          speckle(ctx, w, h, r, 6000, 200, 255, 0.5);
          for (let i = 0; i < 14; i++) {
            ctx.fillStyle = "rgba(150,170,200,0.25)";
            ctx.beginPath();
            ctx.ellipse(r() * w, r() * h, 14 + r() * 30, 5 + r() * 10, r() * 3, 0, 7);
            ctx.fill();
          }
          break;
        case "wood":
          for (let x = 0; x < w; x += 64) {
            ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`;
            ctx.fillRect(x, 0, 64, h);
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(x, 0, 2, h);
          }
          for (let i = 0; i < 70; i++) {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(r() * w, r() * h, 1, 20 + r() * 40);
          }
          break;
        case "tile":
          speckle(ctx, w, h, r, 3000, 100, 230, 0.3);
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 2;
          for (let i = 0; i <= w; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, h);
            ctx.moveTo(0, i);
            ctx.lineTo(w, i);
            ctx.stroke();
          }
          break;
        case "cobble":
          for (let y = 0; y < h; y += 28) {
            for (let x = ((y / 28) % 2) * 18; x < w; x += 36) {
              const v = -22 + r() * 44;
              ctx.fillStyle = `rgba(${128 + v},${120 + v},${110 + v},0.55)`;
              ctx.beginPath();
              ctx.roundRect(x + 2, y + 2, 32, 24, 7);
              ctx.fill();
            }
          }
          break;
        case "lot":
          speckle(ctx, w, h, r, 7000, 30, 90, 0.5);
          ctx.strokeStyle = "rgba(235,235,225,0.85)";
          ctx.lineWidth = 5;
          for (let x = 40; x < w; x += 110) {
            ctx.beginPath();
            ctx.moveTo(x, 90);
            ctx.lineTo(x, 300);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(240,190,60,0.85)";
          ctx.beginPath();
          ctx.moveTo(0, 400);
          ctx.lineTo(w, 400);
          ctx.stroke();
          break;
        case "floor":
          speckle(ctx, w, h, r, 2500, 60, 160, 0.25);
          ctx.strokeStyle = "rgba(255,255,255,0.07)";
          ctx.lineWidth = 3;
          for (let i = 0; i <= w; i += 128) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, h);
            ctx.stroke();
          }
          break;
        case "concrete":
          speckle(ctx, w, h, r, 8000, 90, 200, 0.5);
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 2;
          for (let i = 0; i <= w; i += 170) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, h);
            ctx.moveTo(0, i);
            ctx.lineTo(w, i);
            ctx.stroke();
          }
          break;
        default: {
          // asphalt: speckle plus cracks
          speckle(ctx, w, h, r, 9000, 30, 85, 0.5);
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
        }
      }
    },
    3
  );
}

// ---- back walls ---------------------------------------------------------------
function tag(ctx, text, x, y, color, size, rot, font = IMPACT) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${size}px ${font}`;
  ctx.lineWidth = Math.max(4, size / 7);
  ctx.strokeStyle = "#101010";
  ctx.lineJoin = "round";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function wallTexture(wall, seed) {
  const W = 1600;
  const H = 356;
  return canvasTexture(W, H, (ctx, w, h) => {
    const r = rngFor(seed);
    const acc = wall.accent.map(snap);
    const pick = () => acc[Math.floor(r() * acc.length)];
    ctx.fillStyle = snap(wall.base);
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    switch (wall.kind) {
      case "brick":
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
        break;
      case "concrete":
        speckle(ctx, w, h, r, 6000, 60, 160, 0.4);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 3;
        for (let x = 0; x < w; x += 200) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        break;
      case "stucco":
        speckle(ctx, w, h, r, 9000, 120, 255, 0.35);
        ctx.fillStyle = "rgba(60,40,20,0.12)";
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
        break;
      case "storefront": {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(0, h * 0.62, w, h * 0.38);
        for (let x = 0; x < w; x += 70) {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(x, h * 0.62, 3, h * 0.38);
        }
        ctx.fillStyle = "rgba(190,220,235,0.18)";
        for (let x = 80; x < w; x += 300) ctx.fillRect(x, h * 0.12, 200, h * 0.4);
        break;
      }
      case "neon":
        for (let i = 0; i < 280; i++) {
          ctx.fillStyle = r() < 0.4 ? `${pick()}55` : "rgba(255,255,255,0.05)";
          ctx.fillRect(r() * w, r() * h, 10 + r() * 18, 10 + r() * 14);
        }
        for (let i = 0; i < 7; i++) {
          ctx.shadowColor = pick();
          ctx.shadowBlur = 24;
          ctx.strokeStyle = ctx.shadowColor;
          ctx.lineWidth = 6;
          ctx.beginPath();
          const y = 40 + r() * (h - 80);
          ctx.moveTo(r() * w * 0.4, y);
          ctx.lineTo(w * 0.4 + r() * w * 0.6, y + (r() - 0.5) * 40);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      case "tile":
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 2;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      case "glass":
        for (let x = 0; x < w; x += 100) {
          const g = ctx.createLinearGradient(x, 0, x + 100, h);
          g.addColorStop(0, "rgba(255,255,255,0.22)");
          g.addColorStop(1, "rgba(0,0,0,0.25)");
          ctx.fillStyle = g;
          ctx.fillRect(x + 3, 6, 94, h - 12);
        }
        break;
      case "bars":
        ctx.fillStyle = "#101114";
        ctx.fillRect(0, 0, w, h);
        for (let x = 20; x < w; x += 46) {
          ctx.fillStyle = "#6c7076";
          ctx.fillRect(x, 0, 8, h);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(x, 0, 2, h);
        }
        ctx.fillStyle = "#6c7076";
        ctx.fillRect(0, 60, w, 10);
        ctx.fillRect(0, h - 70, w, 10);
        break;
      case "hedge":
        for (let i = 0; i < 1500; i++) {
          ctx.fillStyle = `rgba(${30 + r() * 50},${80 + r() * 80},${30 + r() * 40},0.7)`;
          ctx.beginPath();
          ctx.arc(r() * w, r() * h, 6 + r() * 14, 0, 7);
          ctx.fill();
        }
        break;
      default:
        break;
    }
    paintGradients(ctx, w, h); // soft top light, grime toward the bottom, edge highlights
    // blobs of spray paint, then the tags
    if (["brick", "concrete", "stucco", "neon"].includes(wall.kind)) {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = pick();
        ctx.globalAlpha = 0.18 + r() * 0.25;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 20 + r() * 60, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const tags = wall.tags ?? [];
    tags.forEach((t, i) => {
      const cjk = /[^\x00-\x7f]/.test(t);
      tag(ctx, t, ((i + 0.5) / tags.length) * w + (r() - 0.5) * 90, 60 + r() * (h - 130), pick(), 54 + r() * 40, (r() - 0.5) * 0.3, cjk ? CJK : IMPACT);
    });
    // a big sign along the middle, like a shop or park sign
    if (wall.sign) {
      const cjk = /[^\x00-\x7f]/.test(wall.sign);
      const size = wall.kind === "storefront" ? 120 : 100;
      if (wall.kind === "storefront") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(w * 0.18, h * 0.04, w * 0.64, size + 28);
      }
      tag(ctx, wall.sign, w / 2, wall.kind === "storefront" ? size / 2 + 20 : h * 0.3, wall.accent[0] ?? CREAM, size, 0, cjk ? CJK : IMPACT);
    }
    // stickers
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = pick();
      ctx.fillRect(r() * w, r() * (h - 30), 18 + r() * 26, 12 + r() * 16);
    }
  });
}

// ---- small prop builders ------------------------------------------------------
const CONCRETE = "#8c8a82";
const METAL = "#c3c6c8";
const WOOD = "#8a6a3e";

function Rail({ len = 3.2 }) {
  return (
    <group>
      {[-len / 2 + 0.2, len / 2 - 0.2].map((x) => (
        <group key={x}>
          <Box pos={[x, 0.04, 0]} size={[0.4, 0.08, 0.4]} color="#3a3d41" />
          <Box pos={[x, 0.3, 0]} size={[0.07, 0.5, 0.07]} color={METAL} />
        </group>
      ))}
      <Cyl pos={[0, 0.58, 0]} r={0.05} h={len} color={METAL} seg={8} rot={[0, 0, Math.PI / 2]} />
    </group>
  );
}

function Stairs({ n = 5 }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} pos={[0, 0.11 + i * 0.22, -i * 0.5]} size={[2.2, 0.22 * (i + 1), 0.5]} color={CONCRETE} />
      ))}
      <Box pos={[1.25, 0.55 + (n * 0.22) / 2, -(n * 0.5) / 2 + 0.25]} size={[0.06, 0.06, n * 0.54]} color={METAL}
        rot={[Math.atan((n * 0.22) / (n * 0.5)), 0, 0]} />
    </group>
  );
}

function Ledge({ color = CONCRETE, len = 3.4 }) {
  return (
    <group>
      <Box pos={[0, 0.25, 0]} size={[len, 0.5, 0.7]} color={color} />
      <Box pos={[0, 0.51, 0.34]} size={[len, 0.03, 0.05]} color={METAL} cast={false} />
    </group>
  );
}

// A quarter-pipe profile: flat at x = 0, rising to height R at x = R.
function quarterPipe(R, width) {
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

function QP({ R = 1.8, width = 2.6, color = WOOD }) {
  const geom = useMemo(() => quarterPipe(R, width), [R, width]);
  const outlines = useContext(OutlineCtx);
  return (
    // rotated so the ramp rises away from the board centre
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={geom} castShadow receiveShadow>
        <meshLambertMaterial color={snap(color)} />
      </mesh>
      {outlines && <mesh geometry={geom} material={HULL} scale={[1.04, 1.04, 1.05]} />}
      <Cyl pos={[R, R, 0]} r={0.05} h={width + 0.1} color={METAL} seg={8} rot={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Halfpipe({ R = 1.8, width = 3, color = WOOD }) {
  return (
    <group>
      <group position={[0, 0, -0.8]}>
        <QP R={R} width={width} color={color} />
      </group>
      <group position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]}>
        <QP R={R} width={width} color={color} />
      </group>
      <Box pos={[0, 0.03, 0]} size={[width, 0.06, 1.7]} color="#6a5a3a" />
    </group>
  );
}

function Bowl({ r = 3 }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 1, 28, 1, true]} />
        <meshLambertMaterial color={CONCRETE} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r - 0.1, 28]} />
        <Lam color="#5a5d61" />
      </mesh>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.1, 6, 28]} />
        <Lam color={METAL} />
      </mesh>
    </group>
  );
}

function Funbox() {
  return (
    <group>
      <Box pos={[0, 0.3, 0]} size={[2.4, 0.6, 1.6]} color={CONCRETE} />
      <Box pos={[0, 0.62, 0]} size={[2.4, 0.06, 1.6]} color="#b9b7ae" cast={false} />
      <Box pos={[-1.7, 0.2, 0]} size={[1.2, 0.08, 1.6]} color={WOOD} rot={[0, 0, 0.5]} />
      <Box pos={[1.7, 0.2, 0]} size={[1.2, 0.08, 1.6]} color={WOOD} rot={[0, 0, -0.5]} />
    </group>
  );
}

function Pyramid() {
  return (
    <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.8, 1.9, 0.8, 4]} />
      <Lam color={CONCRETE} />
    </mesh>
  );
}

function Hubba() {
  return (
    <group>
      <Box pos={[0, 0.8, 0]} size={[3.4, 0.45, 0.6]} color={CONCRETE} rot={[0, 0, -0.32]} />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} pos={[-1.3 + i * 0.7, 0.16 + (3 - i) * 0.2, 1.0]} size={[0.7, 0.32 + (3 - i) * 0.4, 1.0]} color="#7d7b74" />
      ))}
    </group>
  );
}

function Boxes() {
  const cols = ["#d6402b", "#e8dcc0", "#3E7CB1", "#F2B632", "#5f9a6a"];
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-1 + i * 1, 0, 0]}>
          {[0, 1, 2].slice(0, 3 - (i % 2)).map((k) => (
            <Box key={k} pos={[0, 0.25 + k * 0.5, 0]} size={[0.9, 0.5, 0.6]} color={cols[(i + k) % 5]} rot={[0, (i + k) * 0.15, 0]} />
          ))}
        </group>
      ))}
    </group>
  );
}

function Crate() {
  return (
    <group>
      <Box pos={[0, 0.45, 0]} size={[0.9, 0.9, 0.9]} color={WOOD} rot={[0, 0.2, 0]} />
      <Box pos={[0.05, 1.3, 0]} size={[0.75, 0.75, 0.75]} color="#7a5c34" rot={[0, -0.3, 0]} />
    </group>
  );
}

function Trash() {
  return (
    <group>
      <Cyl pos={[0, 0.55, 0]} r={0.4} rTop={0.46} h={1.1} color="#585b5e" seg={12} />
      <Cyl pos={[0, 1.14, 0]} r={0.5} h={0.1} color="#44474a" seg={12} />
    </group>
  );
}

function Cone() {
  return (
    <group>
      <Box pos={[0, 0.04, 0]} size={[0.6, 0.08, 0.6]} color="#e8631f" />
      <Cyl pos={[0, 0.45, 0]} r={0.26} rTop={0.05} h={0.75} color="#f26a1f" seg={10} />
      <Cyl pos={[0, 0.5, 0]} r={0.19} rTop={0.14} h={0.1} color="#ececec" seg={10} />
    </group>
  );
}

function Hydrant() {
  return (
    <group>
      <Cyl pos={[0, 0.5, 0]} r={0.22} h={1} color="#c23b2a" seg={10} />
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Lam color="#c23b2a" />
      </mesh>
    </group>
  );
}

function Bench() {
  return (
    <group>
      <Box pos={[0, 0.45, 0]} size={[2, 0.1, 0.55]} color={WOOD} />
      <Box pos={[0, 0.8, -0.25]} size={[2, 0.4, 0.08]} color={WOOD} />
      {[-0.85, 0.85].map((x) => (
        <Box key={x} pos={[x, 0.22, 0]} size={[0.1, 0.44, 0.5]} color="#3a3d41" />
      ))}
    </group>
  );
}

function Palm() {
  const leaves = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2);
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <Cyl key={i} pos={[i * 0.12, 0.9 + i * 1.6, 0]} r={0.2 - i * 0.03} rTop={0.17 - i * 0.03} h={1.7} color="#8a6a46" seg={7} rot={[0, 0, -0.07]} />
      ))}
      <group position={[0.36, 5.1, 0]}>
        {leaves.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.7, -0.1, Math.sin(a) * 0.7]} rotation={[Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]} castShadow>
            <coneGeometry args={[0.3, 2.2, 5]} />
            <Lam color="#4a8a3e" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Pine() {
  return (
    <group>
      <Cyl pos={[0, 0.4, 0]} r={0.2} h={0.8} color="#5a3f28" seg={6} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.4 + i * 0.9, 0]} castShadow>
          <coneGeometry args={[1.3 - i * 0.3, 1.5, 7]} />
          <Lam color={i === 2 ? "#d7e4ec" : "#2f5a3a"} />
        </mesh>
      ))}
    </group>
  );
}

function Tree() {
  return (
    <group>
      <Cyl pos={[0, 1, 0]} r={0.22} h={2} color="#6a4a2e" seg={7} />
      <mesh position={[0, 2.8, 0]} castShadow>
        <icosahedronGeometry args={[1.35, 1]} />
        <Lam color="#4f8a4a" flatShading />
      </mesh>
      <mesh position={[0.6, 2.3, 0.4]} castShadow>
        <icosahedronGeometry args={[0.9, 1]} />
        <Lam color="#5a9a52" flatShading />
      </mesh>
    </group>
  );
}

function Acacia() {
  return (
    <group>
      <Cyl pos={[0.1, 1.5, 0]} r={0.14} rTop={0.1} h={3} color="#6a4a2e" seg={6} rot={[0, 0, -0.08]} />
      <mesh position={[0.25, 3.2, 0]} scale={[2.4, 0.45, 2.4]} castShadow>
        <sphereGeometry args={[1, 9, 6]} />
        <Lam color="#7a8a3a" flatShading />
      </mesh>
    </group>
  );
}

function Cactus() {
  return (
    <group>
      <Cyl pos={[0, 0.9, 0]} r={0.22} h={1.8} color="#4a8a50" seg={8} />
      <Cyl pos={[-0.45, 1.1, 0]} r={0.12} h={0.9} color="#4a8a50" seg={7} rot={[0, 0, 0]} />
      <Box pos={[-0.25, 0.8, 0]} size={[0.4, 0.14, 0.14]} color="#4a8a50" />
      <Cyl pos={[0.45, 1.3, 0]} r={0.12} h={0.9} color="#4a8a50" seg={7} />
      <Box pos={[0.25, 1.0, 0]} size={[0.4, 0.14, 0.14]} color="#4a8a50" />
    </group>
  );
}

function Pillar() {
  return (
    <group>
      {[-1.2, 0, 1.2].map((x) => (
        <group key={x}>
          <Box pos={[x, 2, 0]} size={[0.6, 4, 0.6]} color="#d9d5c8" />
          <Box pos={[x, 4.1, 0]} size={[0.8, 0.2, 0.8]} color="#c7c3b6" />
        </group>
      ))}
      <Box pos={[0, 4.4, 0]} size={[3.8, 0.4, 0.9]} color="#d9d5c8" />
    </group>
  );
}

function Church() {
  return (
    <group>
      <Box pos={[0, 3, 0]} size={[6, 6, 2.4]} color="#d8c7a4" />
      <Box pos={[-3.6, 4.5, 0]} size={[2, 9, 2.2]} color="#cdb98f" />
      <mesh position={[-3.6, 10.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.5, 2.6, 4]} />
        <Lam color="#8a4a3a" />
      </mesh>
      <Box pos={[0, 1.6, 1.22]} size={[1.6, 3.2, 0.1]} color="#4a3220" cast={false} />
      <mesh position={[0, 3.2, 1.23]}>
        <circleGeometry args={[0.8, 14, 0, Math.PI]} />
        <Lam color="#4a3220" />
      </mesh>
      <mesh position={[0, 4.8, 1.23]}>
        <circleGeometry args={[0.7, 16]} />
        <meshBasicMaterial color={snap("#e6c860")} />
      </mesh>
      <Box pos={[0, 6.7, 0]} size={[0.15, 1.2, 0.15]} color="#3a2a1a" />
      <Box pos={[0, 6.9, 0]} size={[0.7, 0.15, 0.15]} color="#3a2a1a" />
    </group>
  );
}

function Fountain() {
  return (
    <group>
      <Cyl pos={[0, 0.25, 0]} r={1.7} h={0.5} color="#a9a69b" seg={16} />
      <Cyl pos={[0, 0.46, 0]} r={1.5} h={0.04} color="#5aa9d6" seg={16} />
      <Cyl pos={[0, 0.9, 0]} r={0.18} h={1.2} color="#bdbab0" seg={8} />
      <Cyl pos={[0, 1.55, 0]} r={0.55} rTop={0.1} h={0.25} color="#a9a69b" seg={10} />
    </group>
  );
}

function Bleachers() {
  const crowd = useMemo(() => {
    const r = rngFor(77);
    const cols = ["#D6402B", "#F2B632", "#3E7CB1", "#E8DCC0", "#5f9a6a", "#e06fb0", "#222"];
    const out = [];
    for (let row = 0; row < 5; row++)
      for (let i = 0; i < 11; i++)
        if (r() > 0.18) out.push({ x: -3.6 + i * 0.72 + (r() - 0.5) * 0.2, row, c: cols[Math.floor(r() * cols.length)] });
    return out;
  }, []);
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} pos={[0, 0.25 + i * 0.5, -i * 1.0]} size={[8.4, 0.5 * (1 + i * 0.0), 1.0]} color="#55585c" />
      ))}
      {crowd.map((p, i) => (
        <group key={i} position={[p.x, 0.5 + p.row * 0.5, -p.row * 1.0]}>
          <Box pos={[0, 0.3, 0]} size={[0.34, 0.5, 0.3]} color={p.c} />
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.15, 6, 5]} />
            <Lam color="#d6a47c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Tower() {
  return (
    <group>
      <Cyl pos={[0, 4.5, 0]} r={0.16} h={9} color="#33363a" seg={6} />
      <group position={[0, 9.2, 0]} rotation={[0.35, 0, 0]}>
        <Box pos={[0, 0, 0]} size={[2.4, 1.5, 0.2]} color="#222" />
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2, 3].map((c) => (
            <mesh key={`${row}${c}`} position={[-0.9 + c * 0.6, -0.45 + row * 0.45, 0.12]}>
              <planeGeometry args={[0.4, 0.3]} />
              <meshBasicMaterial color={snap("#fff6d8")} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

function Lanterns() {
  const pts = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      return [-3 + t * 6, 4.4 - Math.sin(t * Math.PI) * 0.9, 0];
    }),
    []
  );
  return (
    <group>
      {[-3, 3].map((x) => (
        <Cyl key={x} pos={[x, 2.2, 0]} r={0.08} h={4.4} color="#3a3d41" seg={6} />
      ))}
      {pts.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <sphereGeometry args={[0.28, 8, 6]} />
            <meshBasicMaterial color={i % 2 ? "#ff3a22" : "#ff9a2a"} />
          </mesh>
          <Box pos={[0, -0.34, 0]} size={[0.05, 0.25, 0.05]} color="#f2b632" cast={false} />
        </group>
      ))}
    </group>
  );
}

function neonTexture(text, color, w = 256, h = 128) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = "#0a0a10";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${text.length > 3 ? 52 : 100}px ${/[^\x00-\x7f]/.test(text) ? CJK : IMPACT}`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);
    ctx.fillText(text, w / 2, h / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

function Neon({ text = "?", color = "#ff5fd2" }) {
  const tex = useMemo(() => neonTexture(text, color), [text, color]);
  return (
    <group>
      {[-1.1, 1.1].map((x) => (
        <Cyl key={x} pos={[x, 1.2, 0]} r={0.06} h={2.4} color="#2a2c30" seg={6} />
      ))}
      <mesh position={[0, 2.6, 0]}>
        <planeGeometry args={[3, 1.5]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
}

function QMark() {
  return <Neon text="?" color="#F2B632" />;
}

function Stall() {
  return (
    <group>
      {[-1.1, 1.1].map((x) => (
        <Cyl key={x} pos={[x, 1.2, -0.5]} r={0.06} h={2.4} color="#3a3d41" seg={6} />
      ))}
      <Box pos={[0, 2.35, 0.1]} size={[2.8, 0.1, 1.5]} color="#c23b2a" rot={[0.25, 0, 0]} />
      <Box pos={[0, 0.5, 0.2]} size={[2.4, 0.08, 0.8]} color={WOOD} />
      <Box pos={[0, 0.24, 0.2]} size={[2.3, 0.48, 0.7]} color="#6a4a2e" />
      <mesh position={[0, 1.9, 0.5]}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshBasicMaterial color={snap("#ffb84a")} />
      </mesh>
    </group>
  );
}

function Ribbon() {
  const geom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.5, 0.2, 0), new THREE.Vector3(-2, 2.2, 0.6), new THREE.Vector3(-0.3, 1.1, -0.4),
      new THREE.Vector3(1.6, 3.0, 0.5), new THREE.Vector3(3.5, 1.2, 0),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.2, 7, false);
  }, []);
  return (
    <mesh geometry={geom} castShadow>
      <Lam color="#e0312a" />
    </mesh>
  );
}

function River() {
  return (
    <group>
      <Box pos={[0, -0.05, 0]} size={[9, 0.1, 3]} color="#3c8fa8" cast={false} />
      <Box pos={[0, 0.12, 1.7]} size={[9, 0.25, 0.4]} color="#8a8a80" />
      <Box pos={[0, 0.12, -1.7]} size={[9, 0.25, 0.4]} color="#8a8a80" />
    </group>
  );
}

function Car({ color = "#b8271f" }) {
  return (
    <group>
      <Box pos={[0, 0.55, 0]} size={[3, 0.6, 1.4]} color={color} />
      <Box pos={[-0.2, 1.05, 0]} size={[1.6, 0.5, 1.25]} color="#9fb4c2" />
      {[-1, 1].flatMap((x) =>
        [-0.7, 0.7].map((z) => (
          <Cyl key={`${x}${z}`} pos={[x * 1.0, 0.28, z]} r={0.28} h={0.22} color="#1b1b1d" seg={10} rot={[Math.PI / 2, 0, 0]} />
        ))
      )}
    </group>
  );
}

function BarsProp() {
  return (
    <group>
      <Box pos={[0, 0.1, 0]} size={[5, 0.2, 0.4]} color="#3a3d41" />
      <Box pos={[0, 4.1, 0]} size={[5, 0.2, 0.4]} color="#3a3d41" />
      {Array.from({ length: 11 }, (_, i) => (
        <Cyl key={i} pos={[-2.4 + i * 0.48, 2.1, 0]} r={0.07} h={4} color="#8a8d92" seg={6} />
      ))}
    </group>
  );
}

function PoliceTape() {
  const tex = useMemo(
    () =>
      canvasTexture(512, 32, (ctx, w, h) => {
        ctx.fillStyle = "#f2c200";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#111";
        ctx.font = `bold 22px ${IMPACT}`;
        ctx.textBaseline = "middle";
        ctx.fillText("POLICE LINE  DO NOT CROSS  POLICE LINE  DO NOT CROSS", 6, h / 2 + 1);
      }),
    []
  );
  return (
    <group>
      {[-2.4, 2.4].map((x) => (
        <Cyl key={x} pos={[x, 0.8, 0]} r={0.05} h={1.6} color="#3a3d41" seg={6} />
      ))}
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0.04]}>
        <planeGeometry args={[4.8, 0.3]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Siren() {
  const spin = useRef();
  useFrame((s) => {
    if (spin.current) spin.current.rotation.y = s.clock.elapsedTime * 5;
  });
  return (
    <group>
      <Cyl pos={[0, 0.9, 0]} r={0.07} h={1.8} color="#3a3d41" seg={6} />
      <Box pos={[0, 1.95, 0]} size={[0.5, 0.16, 0.5]} color="#222" />
      <group ref={spin} position={[0, 2.2, 0]}>
        <mesh position={[0.16, 0, 0]}>
          <boxGeometry args={[0.24, 0.3, 0.3]} />
          <meshBasicMaterial color={snap("#ff2a2a")} />
        </mesh>
        <mesh position={[-0.16, 0, 0]}>
          <boxGeometry args={[0.24, 0.3, 0.3]} />
          <meshBasicMaterial color={snap("#2a62ff")} />
        </mesh>
      </group>
    </group>
  );
}

function Podium() {
  return (
    <group>
      <Box pos={[0, 0.5, 0]} size={[1.2, 1, 0.8]} color="#2a2540" />
      <Box pos={[0, 1.05, -0.1]} size={[1.2, 0.1, 0.7]} color="#4a3f78" rot={[0.25, 0, 0]} />
      <Cyl pos={[0, 1.2, 0.1]} r={0.2} h={0.12} color="#d6402b" seg={10} />
      <mesh position={[0, 0.55, 0.41]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color={snap("#59d6ff")} />
      </mesh>
    </group>
  );
}

function Spot() {
  return (
    <group>
      <Cyl pos={[0, 1.6, 0]} r={0.07} h={3.2} color="#2a2c30" seg={6} />
      <group position={[0, 3.3, 0]} rotation={[0.9, 0, 0]}>
        <Cyl pos={[0, 0, 0]} r={0.3} rTop={0.2} h={0.6} color="#222" seg={10} />
        <mesh position={[0, 3.2, 0]}>
          <coneGeometry args={[1.6, 5.6, 14, 1, true]} />
          <meshBasicMaterial color={snap("#cfd8ff")} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function LampPost({ warm = "#ffe7b0" }) {
  return (
    <group>
      <Cyl pos={[0, 3.8, 0]} r={0.14} h={7.6} color="#33363a" seg={8} />
      <Cyl pos={[0, 0.15, 0]} r={0.3} h={0.3} color="#2a2c2f" seg={8} />
      <Box pos={[0, 7.6, 0.9]} size={[0.12, 0.12, 1.9]} color="#33363a" />
      <mesh position={[0, 7.4, 1.7]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshBasicMaterial color={warm} />
      </mesh>
    </group>
  );
}

function Marble() {
  return <Ledge color="#e8e6df" len={3.8} />;
}

const BUILDERS = {
  rail: Rail, stairs: Stairs, ledge: Ledge, qp: QP, halfpipe: Halfpipe, bowl: Bowl, funbox: Funbox,
  pyramid: Pyramid, hubba: Hubba, boxes: Boxes, crate: Crate, trash: Trash, cone: Cone, hydrant: Hydrant,
  bench: Bench, palm: Palm, pine: Pine, tree: Tree, acacia: Acacia, cactus: Cactus, pillar: Pillar,
  church: Church, fountain: Fountain, bleachers: Bleachers, tower: Tower, lanterns: Lanterns, neon: Neon,
  qmark: QMark, stall: Stall, ribbon: Ribbon, river: River, car: Car, bars: BarsProp, tape: PoliceTape,
  siren: Siren, podium: Podium, spot: Spot, lamp: LampPost, marble: Marble,
  megaramp: () => <Halfpipe R={3.4} width={5.4} />,
};

// "kind@slot" or "neon:TEXT@slot" -> where it stands and how to build it.
function parseProp(spec) {
  const at = spec.lastIndexOf("@");
  const head = spec.slice(0, at);
  const [kind, text] = head.split(":");
  return { kind, text, slot: spec.slice(at + 1) };
}

function neonColor(text) {
  const cols = ["#ff5fd2", "#59d6ff", "#F2B632", "#ff4a3a"];
  let h = 0;
  for (const ch of text ?? "") h += ch.charCodeAt(0);
  return snap(cols[h % cols.length]);
}

// Low obstacles are repeated on the front side of the board too (mirrored through
// the centre), so the location is on screen wherever the camera is following.
const MIRRORED = new Set([
  "rail", "stairs", "ledge", "qp", "halfpipe", "bowl", "funbox", "pyramid", "hubba", "boxes", "crate",
  "cone", "hydrant", "bench", "cactus", "fountain", "river", "car", "podium", "tape", "siren", "trash",
  "marble", "stall", "megaramp",
]);

function Prop({ spec, mirror = false, index = 0 }) {
  const { kind, text, slot } = parseProp(spec);
  const [sx, sz] = SLOTS[slot] ?? [0, -14];
  const [x, z] = mirror ? [-sx, -sz] : [sx, sz];
  const Build = BUILDERS[kind];
  if (!Build) return null;
  return (
    <group position={[x, GROUND_Y, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
      <PopGroup index={index}>{kind === "neon" ? <Build text={text} color={neonColor(text)} /> : <Build />}</PopGroup>
    </group>
  );
}

// ---- the location flag: a pole beside the skater's tile with the place name -----------
function flagTexture(name, sub) {
  return canvasTexture(512, 208, (ctx, w, h) => {
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PAL.terracotta;
    ctx.fillRect(0, 0, w, 16);
    ctx.fillRect(0, h - 16, w, 16);
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = PAL.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // wrap the name onto at most two lines
    ctx.font = `bold 66px "Arial Narrow", Impact, "Arial Black", sans-serif`;
    const words = name.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > w - 60) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    const top = sub ? 82 : 104;
    lines.slice(0, 2).forEach((l, i, all) => ctx.fillText(l, w / 2, top + (i - (all.length - 1) / 2) * 64));
    if (sub) {
      ctx.font = `bold 32px "Trebuchet MS", sans-serif`;
      ctx.fillStyle = PAL.brick;
      ctx.fillText(sub, w / 2, h - 44);
    }
  });
}

const RIGHT = new THREE.Vector3(1, 0, -1).normalize(); // screen-right along the ground

function LocationFlag({ index, theme }) {
  const tex = useMemo(() => flagTexture(theme.name, theme.sub), [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  const cloth = useRef();
  // beside the skater's tile, not on top of an owner's flag at its centre
  const rect = spaceRect(index);
  const [x, z] = outerEdgePoint(index, -0.32 * (rect.row === 0 || rect.row === 10 ? rect.w : rect.d));
  useFrame((s) => {
    if (cloth.current) cloth.current.rotation.y = Math.PI / 4 + Math.sin(s.clock.elapsedTime * 2.2) * 0.07;
  });
  const H = 3.7;
  return (
    <group position={[x, TILE_H, z]}>
      <PopGroup index={5}>
        <Cyl pos={[0, H / 2, 0]} r={0.09} h={H} color={PAL.ink} seg={8} t={0.03} />
        <mesh position={[0, H + 0.08, 0]} castShadow>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshLambertMaterial color={snap(PAL.tan)} />
        </mesh>
        {/* the banner hangs from the pole, reaching out to screen-right */}
        <group position={[RIGHT.x * 0.07, H - 0.78, RIGHT.z * 0.07]}>
          <group ref={cloth} position={[RIGHT.x * 1.55, 0, RIGHT.z * 1.55]} rotation={[0, Math.PI / 4, 0]}>
            <mesh castShadow>
              <planeGeometry args={[3.1, 1.26]} />
              <meshLambertMaterial map={tex} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </PopGroup>
    </group>
  );
}

// ---- the floating chunk the whole street spot sits on -------------------------------
// A thick slab whose top carries the location's ground, over a darker underside
// block, both outlined: the diorama floats in the sky like a chunk of city.
const BASE_LO = -WALL_OFF - 0.7;
const BASE_HI = SIZE / 2 + 8;
function FloatingBase({ ground }) {
  const outlines = useContext(OutlineCtx);
  const size = BASE_HI - BASE_LO;
  const c = (BASE_HI + BASE_LO) / 2;
  const thick = 1.1;
  const mats = useMemo(() => {
    const side = lam(PAL.slab);
    // +x, -x, top (the ground texture), bottom, +z, -z
    return [side, side, new THREE.MeshLambertMaterial({ map: ground }), side, side, side];
  }, [ground]);
  useEffect(() => () => mats[2].dispose(), [mats]);
  return (
    <>
      <group position={[c, GROUND_Y - thick / 2, c]}>
        <mesh material={mats} receiveShadow castShadow>
          <boxGeometry args={[size, thick, size]} />
        </mesh>
        {outlines && (
          <mesh material={HULL} scale={[(size + 0.26) / size, (thick + 0.26) / thick, (size + 0.26) / size]}>
            <boxGeometry args={[size, thick, size]} />
          </mesh>
        )}
      </group>
      <Box pos={[c, GROUND_Y - thick - 0.55, c]} size={[size - 5, 1.1, size - 5]} color={PAL.under} t={0.12} />
    </>
  );
}

// ---- the scene --------------------------------------------------------------
// `index` is the board space this setting is for (it seeds the textures).
export function LocationScene({ theme: target, index: targetIndex }) {
  // What is built right now. When the target changes, the old items sink into the
  // ground first; once they are gone the new setting is built and pops out.
  const [live, setLive] = useState({ theme: target, index: targetIndex });
  const tr = useRef({ mode: "idle", t0: 0 });
  useEffect(() => {
    if (target === live.theme) return undefined;
    tr.current = { mode: "out", t0: nowS() };
    const wait = (OUT_S + STAGGER * 12 + 0.05) * 1000;
    const id = setTimeout(() => {
      setLive({ theme: target, index: targetIndex });
      tr.current = { mode: "in", t0: nowS() };
    }, wait);
    return () => clearTimeout(id);
  }, [target, targetIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const theme = live.theme;
  const index = live.index;
  const ground = useMemo(() => groundTexture(theme.ground), [theme]);
  const walls = useMemo(() => [wallTexture(theme.wall, index * 2 + 11), wallTexture(theme.wall, index * 2 + 12)], [theme, index]);
  useEffect(
    () => () => {
      ground.dispose();
      walls.forEach((t) => t.dispose());
    },
    [ground, walls]
  );
  const L = SIZE + 14;
  const y = GROUND_Y + WALL_H / 2;
  const capColor = theme.wall.kind === "hedge" ? "#5d7f52" : PAL.street;
  return (
    <PopCtx.Provider value={tr}>
      <BounceGroup>
        <FloatingBase ground={ground} />
      </BounceGroup>
      {/* wall on the far -x side, facing +x (rises out of the ground) */}
      <group position={[0, GROUND_Y, 0]}>
        <PopGroup index={1}>
          <group position={[0, -GROUND_Y, 0]}>
      <group position={[-WALL_OFF, 0, 0]}>
        <Box pos={[0, y, 0]} size={[0.5, WALL_H, L]} color={PAL.under} cast={false} />
        <mesh position={[0.26, y, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[L, WALL_H]} />
          <meshLambertMaterial map={walls[0]} />
        </mesh>
        <Box pos={[0, GROUND_Y + WALL_H + 0.12, 0]} size={[0.8, 0.25, L + 0.3]} color={capColor} cast={false} />
      </group>
          </group>
        </PopGroup>
      </group>
      {/* wall on the far -z side, facing +z */}
      <group position={[0, GROUND_Y, 0]}>
        <PopGroup index={2}>
          <group position={[0, -GROUND_Y, 0]}>
      <group position={[0, 0, -WALL_OFF]}>
        <Box pos={[0, y, 0]} size={[L, WALL_H, 0.5]} color={PAL.under} cast={false} />
        <mesh position={[0, y, 0.26]} receiveShadow>
          <planeGeometry args={[L, WALL_H]} />
          <meshLambertMaterial map={walls[1]} />
        </mesh>
        <Box pos={[0, GROUND_Y + WALL_H + 0.12, 0]} size={[L + 0.3, 0.25, 0.8]} color={capColor} cast={false} />
      </group>
          </group>
        </PopGroup>
      </group>
      {theme.props.map((spec, i) => (
        <Prop key={spec} spec={spec} index={3 + i} />
      ))}
      {theme.props
        .filter((spec) => MIRRORED.has(parseProp(spec).kind) && !theme.trick)
        .map((spec, i) => (
          <Prop key={`m${spec}`} spec={spec} mirror index={3 + theme.props.length + i} />
        ))}
      {theme.lamp && !theme.props.some((p) => p.startsWith("lamp@")) && (
        <group position={[-14.4, GROUND_Y, -14.4]} rotation={[0, Math.PI / 4, 0]}>
          <PopGroup index={3}>
            <LampPost />
          </PopGroup>
        </group>
      )}
      {theme.trick && <TrickLoop />}
      <LocationFlag index={index} theme={theme} />
    </PopCtx.Provider>
  );
}

// ---- sky and light, easing between moods -----------------------------------------
// A flat pastel sky and the brief's light: a hemisphere (#dfe8f2 over #7a7064)
// plus one warm key light (#fff0d8) with soft shadows, each nudged toward the
// current location's mood. Street lamps are glowing bulbs only: no extra real lights.
const tmp = new THREE.Color();
export function Atmosphere({ theme }) {
  const mood = MOODS[theme.mood] ?? MOODS.home;
  const hemi = useRef();
  const key = useRef();
  const { scene } = useThree();
  const sky = SKY_BY_MOOD[theme.mood] ?? SKY_BY_MOOD.home;
  const hemiColor = useMemo(() => new THREE.Color("#dfe8f2").lerp(new THREE.Color(mood.hemi[0]), 0.35), [mood]);
  const keyColor = useMemo(() => new THREE.Color("#fff0d8").lerp(new THREE.Color(mood.key[0]), 0.45), [mood]);
  useEffect(() => {
    scene.background = new THREE.Color(sky);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3);
    scene.background.lerp(tmp.set(sky), k);
    if (hemi.current) hemi.current.color.lerp(hemiColor, k);
    // cel-shaded: less flat fill, a stronger key, so the light bands are clear
    if (hemi.current) hemi.current.intensity += ((look.toon ? 0.95 : 2.5) - hemi.current.intensity) * k;
    if (key.current) {
      key.current.color.lerp(keyColor, k);
      key.current.intensity += ((2.7 + mood.key[1] * 0.18) * (look.toon ? 1.45 : 1) - key.current.intensity) * k;
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
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}
