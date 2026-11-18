/* eslint-disable react/no-unknown-property, react/prop-types */
// Three.js (React Three Fiber) board: an isometric, gritty 90s VHS skate-video
// street spot. It plays the same game (src/game/rules.js) as the CSS board,
// so only the rendering differs. Open it with  http://localhost:5173/?3d
import { useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "../Board3D.css";
import boardSpaces from "../game/BoardSpaces";
import { PLAYER_NAMES, createGame, gameReducer, ownerOf, skateTargets } from "../game/rules";
import { locationImage } from "../game/locationImages";
import { locationLines } from "../game/locationInfo";
import { Camcorder, Die, Tape } from "./Models3D";
import { Flag, Skater } from "./Skater3D";
import { SIZE, TILE_H, headingFor, spaceRect, tileHeight, track } from "./layout3d";
import { CenterMat, CenterProps, Slab, concreteTexture } from "./Skate3DEnv";
import { Atmosphere, LocationScene } from "./Scenery3D";
import { LOCATION_THEMES } from "../game/locationThemes";
import { HULL, OutlineCtx, PAL, PLAYER_PAL, setLook, snap } from "./paint";
import { ToonPass } from "./toon";

const STEP_MS = 220;
const MAX_WALK = 12;
const DICE_MS = 900;

// Concrete tiles with painted colour-group stripes (all snapped to the palette).
const GROUP_COLORS = {
  usa: "#b5532f",
  canada: "#3E7CB1",
  spain: "#d98aa6",
  china: "#F2B632",
  germany: "#D6402B",
  mexico: "#c9b93f",
  africa: "#5f9a6a",
  brand: "#2b2a28",
  other: "#4d5b8a",
};
const CONCRETE = PAL.street; // light street, so the ground reads against the darker walls
const TYPE_TINTS = { chance: "#a8946a", trivia: "#8a86a8", tax: "#a87a74", corner: "#a39b84" };
const PLAYER_COLORS = PLAYER_PAL; // slate blue and terracotta
const BUILDS = ["baggy", "lanky"];
const INK = "#1a1a18";
const IMPACT = "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif";

// Labels face outward like a real board, so the bottom row (nearest the
// starting camera) reads the right way up.
function labelRotation(index) {
  const { row, col } = track(index);
  if (row === 0) return Math.PI;
  if (col === 10) return -Math.PI / 2;
  if (row === 10) return 0;
  return Math.PI / 2;
}

// A space's name (and price) drawn onto a canvas texture, laid flat on the
// tile. A plain 2D canvas means nothing has to be downloaded (no font files).
function Label({ text, price, big, w, d, rotation, ink = INK }) {
  const sideways = Math.abs(Math.sin(rotation)) > 0.5;
  const [pw, ph] = sideways ? [d, w] : [w, d];
  const texture = useMemo(() => {
    const px = 128; // canvas pixels per world unit
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pw * px);
    canvas.height = Math.round(ph * px);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (big) {
      // Chance: a big "?" with the name underneath.
      ctx.font = `${canvas.height * 0.62}px ${IMPACT}`;
      ctx.fillText(big, canvas.width / 2, canvas.height * 0.42);
      ctx.font = `${canvas.height * 0.14}px ${IMPACT}`;
      ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height * 0.86);
    } else {
      ctx.font = `34px ${IMPACT}`;
      const lines = [];
      let line = "";
      for (const word of text.toUpperCase().split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > canvas.width * 0.95) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      if (price) lines.push(`$${price}`);
      const lineH = 38;
      const top = canvas.height / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, top + i * lineH));
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, price, big, pw, ph, ink]);
  return (
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[pw, ph]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function Space({ index, selected, onSelect }) {
  const outlines = useContext(OutlineCtx);
  const space = boardSpaces[index];
  const { x, z, w, d } = spaceRect(index);
  const h = tileHeight(index);
  const tint = snap(TYPE_TINTS[space.type] ?? CONCRETE);
  const band = space.group ? snap(GROUP_COLORS[space.group]) : null;
  const showBand = band && space.type === "property";
  const rot = labelRotation(index);
  const { row, col } = track(index);
  const concrete = useMemo(() => concreteTexture(), []);
  const lift = useRef();
  const [hovered, setHovered] = useState(false);
  // Hovered and selected tiles rise a little, eased.
  useFrame((_, dt) => {
    if (!lift.current) return;
    const goal = selected ? 0.16 : hovered ? 0.1 : 0;
    lift.current.position.y += (goal - lift.current.position.y) * Math.min(1, dt * 12);
  });
  // The colour-group stripe is painted on the edge facing the board centre.
  const stripe = 0.3;
  let bandPos;
  let bandDims = [w * 0.96, 0.03, stripe];
  if (row === 0) bandPos = [0, d / 2 - stripe / 2 - 0.02];
  else if (row === 10) bandPos = [0, -d / 2 + stripe / 2 + 0.02];
  else if (col === 0) {
    bandPos = [w / 2 - stripe / 2 - 0.02, 0];
    bandDims = [stripe, 0.03, d * 0.96];
  } else {
    bandPos = [-w / 2 + stripe / 2 + 0.02, 0];
    bandDims = [stripe, 0.03, d * 0.96];
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
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.96, h, d * 0.96]} />
          <meshLambertMaterial
            color={tint}
            map={concrete}
            emissive={glow}
            emissiveIntensity={selected ? 0.4 : hovered ? 0.3 : 0}
          />
        </mesh>
        {outlines && (
          <mesh material={HULL} position={[0, h / 2, 0]} scale={[(w * 0.96 + 0.07) / (w * 0.96), (h + 0.07) / h, (d * 0.96 + 0.07) / (d * 0.96)]}>
            <boxGeometry args={[w * 0.96, h, d * 0.96]} />
          </mesh>
        )}
        {showBand && (
          <mesh position={[bandPos[0], h + 0.012, bandPos[1]]} receiveShadow>
            <boxGeometry args={bandDims} />
            <meshLambertMaterial color={band} />
          </mesh>
        )}
        <group position={[0, h - 0.07, 0]}>
          <Label
            text={space.name}
            price={space.price}
            big={space.type === "chance" ? "?" : null}
            w={w * 0.9}
            d={d * 0.9}
            rotation={rot}
          />
        </group>
      </group>
    </group>
  );
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// A piece: a skater who hops onto each space and turns to face the way the ring runs.
function Piece({ index, space, active, offset, colors }) {
  const group = useRef();
  const body = useRef();
  const target = useMemo(() => {
    const r = spaceRect(space);
    return new THREE.Vector3(r.x + offset, tileHeight(space), r.z + offset);
  }, [space, offset]);
  const heading = headingFor(space);
  const hop = useRef(0);
  useEffect(() => {
    hop.current = 1;
  }, [space]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = Math.min(1, dt * 14);
    g.position.x += (target.x - g.position.x) * k;
    g.position.z += (target.z - g.position.z) * k;
    hop.current = Math.max(0, hop.current - dt * 4.5);
    baseY.current += (target.y - baseY.current) * k;
    g.position.y = baseY.current + Math.sin(hop.current * Math.PI) * 0.5;
    if (body.current) body.current.rotation.y += wrapAngle(heading - body.current.rotation.y) * Math.min(1, dt * 10);
  });
  const baseY = useRef(target.y);

  return (
    <group ref={group} position={[target.x, target.y, target.z]}>
      <group ref={body} rotation={[0, heading, 0]}>
        <Skater build={BUILDS[index]} shirt={colors[index]} />
      </group>
      {active && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.58, 24]} />
          <meshBasicMaterial color="#F2B632" />
        </mesh>
      )}
    </group>
  );
}

// True isometric camera: orthographic, azimuth 45deg, elevation atan(1/sqrt 2),
// looking at the board. Only the azimuth can be changed.
// Gestures: one finger orbits (azimuth), two fingers drag to move around the
// board and pinch to zoom. (Mouse: left-drag orbits, right-drag pans, wheel
// zooms.) A real drag stops the auto-follow; the recenter button or the next
// roll hands control back.
const POLAR = Math.acos(1 / Math.sqrt(3)); // 90deg - atan(1/sqrt 2)
const PAN_LIMIT = SIZE * 0.7;
function Follow({ point, following, onUserMove }) {
  const controls = useRef();
  const down = useRef(false); // a finger/mouse is on the view
  const goal = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();
  // Zoom is "pixels per world unit"; `base` fits the board in the window.
  const base = Math.min(size.width / 36, size.height / 22);
  const lastBase = useRef(null);
  useEffect(() => {
    camera.zoom = lastBase.current ? (camera.zoom * base) / lastBase.current : base * 1.45;
    lastBase.current = base;
    camera.updateProjectionMatrix();
  }, [base, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (following) {
      // Lean from the piece toward the board middle so the board stays in view.
      goal.set(point.x * 0.55, 0.8, point.z * 0.55);
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
      minZoom={base * 0.7}
      maxZoom={base * 2.6}
      minPolarAngle={POLAR}
      maxPolarAngle={POLAR}
    />
  );
}

// Where an owned space's camcorder/tape sits: on the stripe at the space's
// inner edge, lying parallel to that edge. The flag goes on the outer edge.
function modelPlacement(index) {
  const { x, z, w, d, row, col } = spaceRect(index);
  const inset = 0.16;
  const y = TILE_H + 0.03;
  if (row === 0)
    return { pos: [x, y, z + d / 2 - inset], rotY: 0, flag: [x, TILE_H, z - d / 2 + 0.14] };
  if (row === 10)
    return { pos: [x, y, z - d / 2 + inset], rotY: Math.PI, flag: [x, TILE_H, z + d / 2 - 0.14] };
  if (col === 0)
    return { pos: [x + w / 2 - inset, y, z], rotY: -Math.PI / 2, flag: [x - w / 2 + 0.14, TILE_H, z] };
  return { pos: [x - w / 2 + inset, y, z], rotY: Math.PI / 2, flag: [x + w / 2 - 0.14, TILE_H, z] };
}

function Scene({ game, shown, focus, turn, rolling, following, onUserMove, selectedSpace, onSelect, sceneSpace, outlines, toon }) {
  const theme = LOCATION_THEMES[sceneSpace];
  const colors = PLAYER_COLORS;
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
    <OutlineCtx.Provider value={outlines}>
      <ToonPass on={toon} />
      {/* sky, light and surroundings change with the location the skater is at */}
      <Atmosphere theme={theme} />
      <Slab />
      <LocationScene theme={theme} index={sceneSpace} />
      <CenterMat />
      <CenterProps />

      {boardSpaces.map((_, i) => (
        <Space key={i} index={i} selected={selectedSpace === i} onSelect={onSelect} />
      ))}
      {boardSpaces.map((sp, i) => {
        const owner = ownerOf(game, i);
        if (sp.type !== "property" || owner < 0) return null;
        const { pos, rotY, flag } = modelPlacement(i);
        const color = colors[owner];
        return (
          <group key={`own${i}`}>
            <group position={pos} rotation={[0, rotY, 0]}>
              {game.tapes.includes(i) ? <Tape color={color} /> : <Camcorder color={color} />}
            </group>
            <group position={flag}>
              {/* mustard is reserved for owned-spot flags; the owner's colour is the tag under it */}
              <Flag color={PAL.mustard} accent={color} />
            </group>
          </group>
        );
      })}
      {game.dice && (rolling || game.phase !== "roll") && (
        <group position={[dicePos.x, 2.5, dicePos.z]}>
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
          colors={colors}
        />
      ))}
      <Follow point={point} following={following} onUserMove={onUserMove} />
    </OutlineCtx.Provider>
  );
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const rollTwo = () => [rollDie(), rollDie()];

// Distance and direction of the isometric camera: (1,1,1) * 34.64, looking at the board.
const ISO_POS = [34.64, 34.64, 34.64];

export default function Board3D() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame);
  const { players, turn, phase, message, dice } = game;
  const [shown, setShown] = useState(() => players.map((p) => p.space));
  const [following, setFollowing] = useState(true);
  const [holding, setHolding] = useState(false);
  // Look options: dark outlines, a blur "squint test", and the old VHS scanline overlay.
  const [outlines, setOutlines] = useState(true);
  const [squint, setSquint] = useState(false);
  const [vhs, setVhs] = useState(false);
  // Look: painted, or cel-shaded (toon bands + bolder ink). ?style=toon opens it directly.
  const [toon, setToon] = useState(() => new URLSearchParams(window.location.search).get("style") === "toon");
  setLook(toon); // read by the scene while it renders
  const colors = PLAYER_COLORS;
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
  // The landing card appears once the skater has stopped.
  useEffect(() => {
    if (wasBusy.current && !busy) setLanded({ player: mover.current, space: shown[mover.current] });
    wasBusy.current = busy;
  }, [busy, shown]);

  // The setting changes while the skater is on the move: as soon as they start
  // travelling towards a new space its place begins to pop in, so it is ready
  // (or nearly) by the time they arrive.
  const [sceneSpace, setSceneSpace] = useState(0);
  const [cut, setCut] = useState(0);
  const sceneRef = useRef(0);
  useEffect(() => {
    if (holding || movingIdx < 0) return;
    const destination = players[movingIdx].space;
    if (LOCATION_THEMES[destination] !== LOCATION_THEMES[sceneRef.current]) {
      sceneRef.current = destination;
      setSceneSpace(destination);
      setCut((c) => c + 1);
    }
  }, [holding, movingIdx, players]);
  const theme = LOCATION_THEMES[sceneSpace];
  // Clicking a tile opens its property card; otherwise the card shows where the last piece landed.
  const [inspect, setInspect] = useState(null);
  const cardSpace = inspect ?? (landed && !busy ? landed.space : null);
  const cardOwner = cardSpace != null ? ownerOf(game, cardSpace) : -1;
  const current = players[turn];
  const space = boardSpaces[current.space];
  const targets = phase === "skate_pick" ? skateTargets(game, turn) : [];

  return (
    <div className={`three-root painted${squint ? " squint" : ""}`}>
      <Canvas
        shadows
        flat
        orthographic
        dpr={[1, 2]}
        camera={{ position: ISO_POS, zoom: 50, near: 1, far: 300 }}
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
          sceneSpace={sceneSpace}
          outlines={outlines}
          toon={toon}
        />
      </Canvas>

      {/* the new location is named in a lower-third caption (the scene itself pops in) */}
      <div key={`cap${cut}`} className="vhs-caption" aria-live="polite">
        <strong>{theme.name}</strong>
        <span>{theme.sub}</span>
      </div>

      {/* optional VHS overlay: scanlines, vignette and the camcorder read-outs */}
      {vhs && (
        <div className="vhs" aria-hidden="true">
          <span className="vhs-tl">● REC</span>
          <span className="vhs-tr">PLAY ▶</span>
          <span className="vhs-bl">SEP 12 1994</span>
          <span className="vhs-br">TAPE 94 SP</span>
        </div>
      )}
      <div className="art-controls">
        <select value={toon ? "toon" : "painted"} onChange={(e) => setToon(e.target.value === "toon")} aria-label="Look">
          <option value="painted">Painted</option>
          <option value="toon">Cel-shaded</option>
        </select>
        <label>
          <input type="checkbox" checked={outlines} onChange={(e) => setOutlines(e.target.checked)} /> Outlines
        </label>
        <label>
          <input type="checkbox" checked={squint} onChange={(e) => setSquint(e.target.checked)} /> Squint test
        </label>
        <label>
          <input type="checkbox" checked={vhs} onChange={(e) => setVhs(e.target.checked)} /> VHS overlay
        </label>
      </div>
      {theme.trick && (
        <>
          {/* the filmed-trick loop's camera flash and "NEW SPOT" stamp (6 s, in step with the 3D loop) */}
          <div className="dio-flash" aria-hidden="true" />
          <div className="dio-stamp" aria-hidden="true">NEW SPOT</div>
        </>
      )}

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
              cardOwner >= 0 ? colors[cardOwner] : inspect == null ? colors[landed.player] : "#8C8A82",
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
              <span className="dot" style={{ background: colors[i] }} />
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
