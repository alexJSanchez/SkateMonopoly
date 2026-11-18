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

// Muted tabletop palette: warm paper tiles, softened colour groups.
const GROUP_COLORS = {
  usa: "#a0694a",
  canada: "#8fbcd4",
  spain: "#e3a1b5",
  china: "#e2a65a",
  germany: "#c9605a",
  mexico: "#e3cb6e",
  africa: "#6fa780",
  brand: "#4a4a4a",
  other: "#4d5b8a",
};
const TILE_COLOR = "#f6efe0";
const TYPE_COLORS = { chance: "#f0cfa6", trivia: "#cfc8ea", tax: "#e4b5b0", corner: "#f1e4c8" };
const PLAYER_COLORS = ["#3f78b5", "#c4504a"];
const INK = "#2b2622";

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
    ctx.fillStyle = INK;
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

const TILE_H = 0.16;

function Space({ index, selected, onSelect }) {
  const space = boardSpaces[index];
  const { x, z, w, d } = spaceRect(index);
  const base = TYPE_COLORS[space.type] ?? TILE_COLOR;
  const lift = useRef();
  const [hovered, setHovered] = useState(false);
  // Hovered and selected tiles rise a little, eased.
  useFrame((_, dt) => {
    if (!lift.current) return;
    const goal = selected ? 0.16 : hovered ? 0.1 : 0;
    lift.current.position.y += (goal - lift.current.position.y) * Math.min(1, dt * 12);
  });
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
  const glow = selected ? "#ffd98a" : hovered ? "#fff0c8" : "#000000";
  return (
    <group position={[x, 0, z]}>
      <group
        ref={lift}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(index);
        }}
      >
        <mesh position={[0, TILE_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.96, TILE_H, d * 0.96]} />
          <meshStandardMaterial
            color={base}
            roughness={0.85}
            emissive={glow}
            emissiveIntensity={selected ? 0.35 : hovered ? 0.3 : 0}
          />
        </mesh>
        {band && space.type === "property" && (
          <mesh position={[bandPos[0], TILE_H + 0.015, bandPos[2]]} receiveShadow>
            <boxGeometry args={bandDims} />
            <meshStandardMaterial color={band} roughness={0.7} />
          </mesh>
        )}
        <group position={[0, TILE_H - 0.07, 0]}>
          <Label text={space.name} price={space.price} w={w * 0.9} d={d * 0.9} rotation={rot} />
        </group>
      </group>
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
    g.position.y = 0.16 + Math.sin(hop.current * Math.PI) * 0.5;
  });

  // Low-poly pawn: a faceted cone body and a faceted head (flat shading).
  const color = PLAYER_COLORS[index];
  return (
    <group ref={group} position={[target.x, 0.16, target.z]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 0.8, 7]} />
        <meshStandardMaterial color={color} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <icosahedronGeometry args={[0.27, 1]} />
        <meshStandardMaterial color={color} flatShading roughness={0.7} />
      </mesh>
      {active && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 7]} />
          <meshBasicMaterial color="#ffd98a" />
        </mesh>
      )}
    </group>
  );
}

// Eases the orbit target to whichever piece the camera should follow.
// Phone-style gestures: one finger orbits the view, two fingers drag to move
// around the board and pinch to zoom. (Mouse: left-drag orbits, right-drag
// pans, wheel zooms.) Touching the view stops the auto-follow; the recenter
// button or the next roll hands control back.
const PAN_LIMIT = SIZE * 0.7;
function Follow({ point, following, onUserMove }) {
  const controls = useRef();
  const down = useRef(false); // a finger/mouse is on the view
  const goal = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (following) {
      // Lean from the piece toward the board middle so the board stays in view.
      goal.set(point.x * 0.55, 0, point.z * 0.55);
      c.target.lerp(goal, Math.min(1, dt * 3));
    } else {
      c.target.x = THREE.MathUtils.clamp(c.target.x, -PAN_LIMIT, PAN_LIMIT);
      c.target.z = THREE.MathUtils.clamp(c.target.z, -PAN_LIMIT, PAN_LIMIT);
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      screenSpacePanning={false}
      enableDamping
      dampingFactor={0.12}
      // Only a real drag stops the follow, so tapping a tile doesn't.
      onStart={() => {
        down.current = true;
      }}
      onEnd={() => {
        down.current = false;
      }}
      onChange={() => {
        if (down.current) onUserMove();
      }}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      minDistance={6}
      maxDistance={42}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2.3}
    />
  );
}

// Where an owned space's camcorder/tape sits: on the coloured band at the
// space's inner edge, lying parallel to that edge.
function modelPlacement(index) {
  const { x, z, w, d, row, col } = spaceRect(index);
  const inset = 0.16;
  const y = TILE_H + 0.03;
  if (row === 0) return { pos: [x, y, z + d / 2 - inset], rotY: 0 };
  if (row === 10) return { pos: [x, y, z - d / 2 + inset], rotY: Math.PI };
  if (col === 0) return { pos: [x + w / 2 - inset, y, z], rotY: -Math.PI / 2 };
  return { pos: [x - w / 2 + inset, y, z], rotY: Math.PI / 2 };
}

// The felt middle of the board with the game's name.
function Centerpiece() {
  const inner = 9 * UNIT;
  const texture = useMemo(() => {
    const px = 64;
    const c = document.createElement("canvas");
    c.width = c.height = Math.round(inner * px);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7a9a80";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(255,245,225,0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, c.width - 28, c.height - 28);
    ctx.fillStyle = "rgba(255,245,225,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "bold 74px system-ui, sans-serif";
    ctx.fillText("SKATE", 0, -42);
    ctx.fillText("MONOPOLY", 0, 42);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [inner]);
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[inner, inner]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

function Scene({ game, shown, focus, turn, rolling, following, onUserMove, selectedSpace, onSelect }) {
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
      <color attach="background" args={["#e9d9bf"]} />
      <fog attach="fog" args={["#e9d9bf", 40, 85]} />
      {/* warm sky/ground fill, a golden key light with soft shadows, a cool rim */}
      <hemisphereLight args={["#fff1da", "#a8825a", 0.75]} />
      <directionalLight
        position={[12, 20, 9]}
        color="#ffe0b2"
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={17}
        shadow-camera-bottom={-17}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />
      <directionalLight position={[-10, 8, -12]} color="#b9cde8" intensity={0.35} />

      {/* wooden tabletop, then the board slab sitting on it */}
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#9c8466" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[SIZE + 1.4, 0.6, SIZE + 1.4]} />
        <meshStandardMaterial color="#efe3cc" roughness={0.8} />
      </mesh>
      <Centerpiece />
      {boardSpaces.map((_, i) => (
        <Space key={i} index={i} selected={selectedSpace === i} onSelect={onSelect} />
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
      <Follow point={point} following={following} onUserMove={onUserMove} />
    </>
  );
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const rollTwo = () => [rollDie(), rollDie()];

export default function Board3D() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame);
  const { players, turn, phase, message, dice } = game;
  const [shown, setShown] = useState(() => players.map((p) => p.space));
  const [following, setFollowing] = useState(true);
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
      setFollowing(true);
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
  // Clicking a tile opens its property card; otherwise the card shows where the last piece landed.
  const [inspect, setInspect] = useState(null);
  const cardSpace = inspect ?? (landed && !busy ? landed.space : null);
  const cardOwner = cardSpace != null ? ownerOf(game, cardSpace) : -1;
  const current = players[turn];
  const space = boardSpaces[current.space];
  const targets = phase === "skate_pick" ? skateTargets(game, turn) : [];

  return (
    <div className="three-root">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 17, 16], fov: 45 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => setInspect(null)}
      >
        <Scene
          selectedSpace={inspect}
          onSelect={(i) => setInspect((cur) => (cur === i ? null : i))}
          game={game}
          shown={shown}
          focus={focus}
          turn={turn}
          rolling={holding}
          following={following}
          onUserMove={() => setFollowing(false)}
        />
      </Canvas>
      {!following && (
        <button className="three-recenter" onClick={() => setFollowing(true)}>
          ◎ Recenter
        </button>
      )}

      {cardSpace != null && (
        <div
          className="three-card"
          style={{
            borderColor:
              cardOwner >= 0 ? PLAYER_COLORS[cardOwner] : inspect == null ? PLAYER_COLORS[landed.player] : "#cdbb99",
          }}
        >
          {inspect != null && (
            <button className="three-card-close" aria-label="Close" onClick={() => setInspect(null)}>
              ✕
            </button>
          )}
          {locationImage(cardSpace) && <img src={locationImage(cardSpace)} alt="" draggable="false" />}
          <div className="three-card-info">
            <strong>{boardSpaces[cardSpace].name}</strong>
            {locationLines(game, cardSpace).map((line) => (
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
