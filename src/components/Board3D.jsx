/* eslint-disable react/no-unknown-property, react/prop-types */
// Three.js (React Three Fiber) prototype of the board. It plays the same game
// (src/game/rules.js) as the CSS board, so only the rendering differs.
// Open it with  http://localhost:5173/?3d
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "../Board3D.css";
import boardSpaces from "../game/BoardSpaces";
import { PLAYER_NAMES, createGame, gameReducer, ownerOf, skateTargets } from "../game/rules";
import { locationImage } from "../game/locationImages";
import { locationLines } from "../game/locationInfo";
import { Camcorder, Die, Tape } from "./Models3D";

const SIZE = 22; // world units across the board
const CORNER = 1.4;
const TRACKS = [CORNER, ...Array(9).fill(1), CORNER];
const TOTAL = TRACKS.reduce((a, b) => a + b, 0);
const UNIT = SIZE / TOTAL;
const STARTS = TRACKS.map((_, k) => TRACKS.slice(0, k).reduce((a, b) => a + b, 0));

const STEP_MS = 220;
const MAX_WALK = 12;
const DICE_MS = 900;

const GROUP_COLORS = {
  usa: "#8b4513",
  canada: "#87ceeb",
  spain: "#ff9fc0",
  china: "#ffa500",
  germany: "#e53e3e",
  mexico: "#f6e05e",
  africa: "#38a169",
  brand: "#222222",
  other: "#00008b",
};
const TYPE_COLORS = { chance: "#ffd9b3", trivia: "#d9d2ff", tax: "#f4c2c2", corner: "#fff7e0" };
const PLAYER_COLORS = ["#2b6cb0", "#c53030"];

// Same path as layout.js: top row left to right, down the right, back along the bottom, up the left.
function track(index) {
  if (index <= 10) return { col: index, row: 0 };
  if (index <= 20) return { col: 10, row: index - 10 };
  if (index <= 30) return { col: 10 - (index - 20), row: 10 };
  return { col: 0, row: 10 - (index - 30) };
}

// Position and size of a space in world units (board centred on the origin).
function spaceRect(index) {
  const { col, row } = track(index);
  const w = TRACKS[col] * UNIT;
  const d = TRACKS[row] * UNIT;
  return {
    x: (STARTS[col] + TRACKS[col] / 2) * UNIT - SIZE / 2,
    z: (STARTS[row] + TRACKS[row] / 2) * UNIT - SIZE / 2,
    w,
    d,
    row,
    col,
  };
}

// Which way is "toward the board centre" for a space, so its label faces inward.
function labelRotation(index) {
  const { row, col } = track(index);
  // Labels read from outside the board, like a real Monopoly board, so the
  // bottom row (nearest the starting camera) is the right way up.
  if (row === 0) return Math.PI;
  if (col === 10) return -Math.PI / 2;
  if (row === 10) return 0;
  return Math.PI / 2;
}

// A space's name (and price) drawn onto a canvas texture, laid flat on the tile.
// A plain 2D canvas means nothing has to be downloaded (no font files).
// The label is rotated to face the board centre, so on the side rows its
// width/height swap.
function Label({ text, price, w, d, rotation }) {
  const sideways = Math.abs(Math.sin(rotation)) > 0.5;
  const [pw, ph] = sideways ? [d, w] : [w, d];
  const texture = useMemo(() => {
    const px = 128; // canvas pixels per world unit
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pw * px);
    canvas.height = Math.round(ph * px);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 30px system-ui, sans-serif";
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > canvas.width * 0.95) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    if (price) lines.push(`$${price}`);
    const lineH = 34;
    const top = canvas.height / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, top + i * lineH));
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, price, pw, ph]);
  return (
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[pw, ph]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function Space({ index }) {
  const space = boardSpaces[index];
  const { x, z, w, d } = spaceRect(index);
  const base = TYPE_COLORS[space.type] ?? "#f4f1e8";
  const band = space.group ? GROUP_COLORS[space.group] : null;
  const rot = labelRotation(index);
  const { row, col } = track(index);
  // The coloured band sits on the outer edge of the space.
  const bandSize = 0.32;
  let bandPos = [0, 0.08, 0];
  let bandDims = [w, 0.04, bandSize];
  if (row === 0) bandPos = [0, 0.08, d / 2 - bandSize / 2];
  else if (row === 10) bandPos = [0, 0.08, -d / 2 + bandSize / 2];
  else if (col === 0) {
    bandPos = [w / 2 - bandSize / 2, 0.08, 0];
    bandDims = [bandSize, 0.04, d];
  } else {
    bandPos = [-w / 2 + bandSize / 2, 0.08, 0];
    bandDims = [bandSize, 0.04, d];
  }
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[w * 0.97, 0.12, d * 0.97]} />
        <meshStandardMaterial color={base} />
      </mesh>
      {band && space.type === "property" && (
        <mesh position={bandPos}>
          <boxGeometry args={bandDims} />
          <meshStandardMaterial color={band} />
        </mesh>
      )}
      <Label text={space.name} price={space.price} w={w * 0.9} d={d * 0.9} rotation={rot} />
    </group>
  );
}

// A piece: a skater-ish pawn that hops each time it lands on a space.
function Piece({ index, space, active, offset }) {
  const group = useRef();
  const target = useMemo(() => {
    const r = spaceRect(space);
    return new THREE.Vector3(r.x + offset, 0, r.z + offset);
  }, [space, offset]);
  const hop = useRef(0);
  useEffect(() => {
    hop.current = 1;
  }, [space]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.x += (target.x - g.position.x) * Math.min(1, dt * 14);
    g.position.z += (target.z - g.position.z) * Math.min(1, dt * 14);
    hop.current = Math.max(0, hop.current - dt * 4.5);
    g.position.y = Math.sin(hop.current * Math.PI) * 0.5;
  });

  const color = PLAYER_COLORS[index];
  return (
    <group ref={group} position={[target.x, 0, target.z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.7, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {active && (
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.5, 32]} />
          <meshBasicMaterial color="#ffd166" />
        </mesh>
      )}
    </group>
  );
}

// Eases the orbit target to whichever piece the camera should follow.
function Follow({ point }) {
  const controls = useRef();
  const goal = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    // Lean from the piece toward the board middle so the board stays in view.
    goal.set(point.x * 0.55, 0, point.z * 0.55);
    c.target.lerp(goal, Math.min(1, dt * 3));
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={10}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

// Where an owned space's camcorder/tape sits: on the coloured band at the
// space's inner edge, lying parallel to that edge.
function modelPlacement(index) {
  const { x, z, w, d, row, col } = spaceRect(index);
  const inset = 0.16;
  if (row === 0) return { pos: [x, 0.1, z + d / 2 - inset], rotY: 0 };
  if (row === 10) return { pos: [x, 0.1, z - d / 2 + inset], rotY: Math.PI };
  if (col === 0) return { pos: [x + w / 2 - inset, 0.1, z], rotY: -Math.PI / 2 };
  return { pos: [x - w / 2 + inset, 0.1, z], rotY: Math.PI / 2 };
}

function Scene({ game, shown, focus, turn, rolling }) {
  const point = useMemo(() => {
    const r = spaceRect(shown[focus]);
    return { x: r.x, z: r.z };
  }, [shown, focus]);
  const sharing = shown[0] === shown[1];
  const roller = game.roller ?? turn;
  const dicePos = useMemo(() => {
    const r = spaceRect(shown[roller]);
    return { x: r.x, z: r.z };
  }, [shown, roller]);
  return (
    <>
      <color attach="background" args={["#cfe8ff"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 18, 8]} intensity={1.1} castShadow />
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[SIZE + 1, 0.2, SIZE + 1]} />
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>
      {boardSpaces.map((_, i) => (
        <Space key={i} index={i} />
      ))}
      {boardSpaces.map((sp, i) => {
        const owner = ownerOf(game, i);
        if (sp.type !== "property" || owner < 0) return null;
        const { pos, rotY } = modelPlacement(i);
        const color = PLAYER_COLORS[owner];
        return (
          <group key={`own${i}`} position={pos} rotation={[0, rotY, 0]}>
            {game.tapes.includes(i) ? <Tape color={color} /> : <Camcorder color={color} />}
          </group>
        );
      })}
      {game.dice && (rolling || game.phase !== "roll") && (
        <group position={[dicePos.x, 2.3, dicePos.z]}>
          <Die value={game.dice[0]} rolling={rolling} position={[-0.35, 0, 0]} seed={0} />
          <Die value={game.dice[1]} rolling={rolling} position={[0.35, 0, 0]} seed={1} />
        </group>
      )}
      {shown.map((s, i) => (
        <Piece
          key={i}
          index={i}
          space={s}
          active={turn === i}
          offset={sharing ? (i === 0 ? -0.3 : 0.3) : 0}
        />
      ))}
      <Follow point={point} />
    </>
  );
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const rollTwo = () => [rollDie(), rollDie()];

export default function Board3D() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame);
  const { players, turn, phase, message, dice } = game;
  const [shown, setShown] = useState(() => players.map((p) => p.space));
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef(null);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const movingIdx = shown.findIndex((s, i) => s !== players[i].space);
  const busy = holding || movingIdx >= 0;

  // Walk the piece to its real square one space at a time.
  useEffect(() => {
    if (holding || movingIdx < 0) return undefined;
    const target = players[movingIdx].space;
    const n = boardSpaces.length;
    const distance = (target - shown[movingIdx] + n) % n;
    const timer = setTimeout(() => {
      setShown((prev) =>
        prev.map((s, i) => (i !== movingIdx ? s : distance <= MAX_WALK ? (s + 1) % n : target))
      );
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, players, movingIdx, holding]);

  const act = (action) => {
    if (busy) return;
    if (action.type === "ROLL" || action.type === "SKATE_THROW") {
      setLanded(null);
      setHolding(true);
      clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => setHolding(false), DICE_MS);
    }
    dispatch(action);
  };

  const focus = movingIdx >= 0 ? movingIdx : turn;

  // The location card: once a piece stops, show its space until the next roll.
  const [landed, setLanded] = useState(null);
  const mover = useRef(0);
  const wasBusy = useRef(false);
  if (movingIdx >= 0) mover.current = movingIdx;
  useEffect(() => {
    if (wasBusy.current && !busy) setLanded({ player: mover.current, space: shown[mover.current] });
    wasBusy.current = busy;
  }, [busy, shown]);
  const current = players[turn];
  const space = boardSpaces[current.space];
  const targets = phase === "skate_pick" ? skateTargets(game, turn) : [];

  return (
    <div className="three-root">
      <Canvas shadows camera={{ position: [0, 28, 26], fov: 45 }}>
        <Scene game={game} shown={shown} focus={focus} turn={turn} rolling={holding} />
      </Canvas>

      {landed && !busy && (
        <div className="three-card" style={{ borderColor: PLAYER_COLORS[landed.player] }}>
          {locationImage(landed.space) && (
            <img src={locationImage(landed.space)} alt="" draggable="false" />
          )}
          <div className="three-card-info">
            <strong>{boardSpaces[landed.space].name}</strong>
            {locationLines(game, landed.space).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
      )}

      <div className="three-hud">
        <div className="three-players">
          {players.map((p, i) => (
            <div key={i} className={`three-player${turn === i ? " active" : ""}`}>
              <span className="dot" style={{ background: PLAYER_COLORS[i] }} />
              <strong>{PLAYER_NAMES[i]}</strong> ${p.money} · {p.properties.length} spots
            </div>
          ))}
        </div>

        <div className="three-panel">
          <div className="three-msg">{message}</div>
          {dice && <div className="three-dice">🎲 {dice[0]} + {dice[1]}</div>}
          <div className="three-actions">
            {phase === "roll" && (
              <>
                <button disabled={busy} onClick={() => act({ type: "ROLL", dice: rollTwo() })}>
                  Skate 🛹
                </button>
                {current.inJail && current.jailCards > 0 && (
                  <button disabled={busy} onClick={() => act({ type: "USE_JAIL_CARD" })}>
                    Use Get Out of Jail card
                  </button>
                )}
                {current.inJail && (
                  <button disabled={busy} onClick={() => act({ type: "PAY_JAIL" })}>
                    Pay $50
                  </button>
                )}
              </>
            )}
            {phase === "buy" && (
              <>
                <button disabled={busy} onClick={() => act({ type: "BUY" })}>
                  Hire filmer (${space.price})
                </button>
                <button disabled={busy} onClick={() => act({ type: "SKIP" })}>
                  Skip
                </button>
              </>
            )}
            {phase === "upgrade" && (
              <>
                <button disabled={busy} onClick={() => act({ type: "UPGRADE" })}>
                  Film a second trick
                </button>
                <button disabled={busy} onClick={() => act({ type: "SKIP" })}>
                  Skip
                </button>
              </>
            )}
            {phase === "card" && (
              <button disabled={busy} onClick={() => act({ type: "CARD_OK", dice: rollTwo() })}>
                OK
              </button>
            )}
            {phase === "skate_pick" &&
              targets.map((idx) => (
                <button key={idx} disabled={busy} onClick={() => act({ type: "SKATE_PICK", space: idx })}>
                  Challenge for {boardSpaces[idx].name}
                </button>
              ))}
            {phase === "skate" && (
              <button disabled={busy} onClick={() => act({ type: "SKATE_THROW", dice: [rollTwo(), rollTwo()] })}>
                Throw
              </button>
            )}
            {phase === "gameover" && <button onClick={() => dispatch({ type: "RESET" })}>Play again</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
