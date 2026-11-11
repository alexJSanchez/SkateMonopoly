/* eslint-disable react/prop-types */
import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import boardSpaces from "../game/BoardSpaces.jsx";
import {
  PLAYER_NAMES,
  JAIL_FEE,
  MAX_JAIL_ATTEMPTS,
  createGame,
  gameReducer,
  ownerOf,
  rentFor,
  rentAt,
  upgradeCostFor,
  skateTargets,
} from "../game/rules.js";
import { cellCenter, cellTopEdge } from "../game/layout.js";
import { locationImage } from "../game/locationImages.js";

// Which of the 9 cells in a 3x3 grid hold a pip for each face value.
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
// Cube rotation that brings each value's face to the top (towards the camera).
const FACE_UP = {
  1: "",
  2: "rotateX(-90deg)",
  3: "rotateY(-90deg)",
  4: "rotateY(90deg)",
  5: "rotateX(90deg)",
  6: "rotateY(180deg)",
};

// A real 3D cube die. `rollKey` replays the tumble; it lands with the rolled
// `value` facing the camera (only a slight tilt so it still reads as a cube).
function Die({ value, rollKey }) {
  return (
    <div className="die">
      <div className="die-tumble" key={rollKey}>
        <div
          className="die-cube"
          style={{ transform: `rotateX(-8deg) rotateY(10deg) ${FACE_UP[value]}` }}
        >
          {[1, 2, 3, 4, 5, 6].map((face) => (
            <div key={face} className={`die-face f${face}`}>
              {Array.from({ length: 9 }, (_, cell) => (
                <span
                  key={cell}
                  className={PIPS[face].includes(cell) ? "pip" : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const TYPE_ICONS = { chance: "❓", trivia: "🧠", tax: "💸" };
const rollDie = () => Math.floor(Math.random() * 6) + 1;

const DICE_MS = 1300; // dice tumble above the head, then a beat before moving
const STEP_MS = 220; // time a piece spends on each space (matches the CSS glide + hop)
const FADE_MS = 350; // the card fades out when Next is pressed
const PAN_MS = 800; // camera glide to the next player, before their bubble appears
const MAX_WALK = 12; // longer jumps (e.g. Go to Jail) teleport instead of walking
const FOLLOW_ZOOM = 1.35;
const FOLLOW_BIAS = 0.45; // how far the camera leans from the piece towards the board's middle
const PAN_LIMIT = { min: -0.6, max: 1.6 }; // board fractions; 0..1 is the board itself
// While a piece is travelling the camera pulls back by this factor, so you can
// see the board it is crossing as well as the piece itself, then zooms back in.
const TRAVEL_ZOOM_FACTOR = 0.62;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const COS_TILT = Math.cos((55 * Math.PI) / 180); // matches rotateX(55deg) in App.css
const SIN_45 = Math.SQRT1_2; // sin and cos of the 45deg board rotation
const SHARED_SPACE_OFFSET = 14; // px apart when both pieces share a space

// ---------- 3D camcorder game piece ----------
// Built from CSS 3D boxes and stacked discs, modelled on a Sony VX1000: grey
// body, long lens with a wide fisheye hood, handle with a mic on top, and the
// viewfinder at the back. Units are `--u` (see App.css); x runs along the
// camera (lens at x=0), y across it, z up. The owner's colour is the base
// plate and the stripe on the side.
const u = (n) => `calc(var(--u) * ${n})`;

// A box whose footprint starts at (x, y) and sits at height z.
// `south` is drawn on the side face the viewer sees (the camera's flank).
function Box({ x, y, z, w, d, h, color, top, south }) {
  return (
    <div
      className="box"
      style={{
        left: u(x),
        top: u(y),
        width: u(w),
        height: u(d),
        transform: `translateZ(${u(z)})`,
        "--c": color,
        "--ct": top ?? color,
        "--w": u(w),
        "--d": u(d),
        "--h": u(h),
      }}
    >
      <i className="f-top" />
      <i className="f-n" />
      <i className="f-w" />
      <i className="f-e" />
      <i className="f-s">{south}</i>
    </div>
  );
}

// A round disc facing along x, centred at (x, yc, zc). Stacked, they make a cylinder.
function Disc({ x, yc, zc, r, color }) {
  return (
    <i
      className="disc"
      style={{
        left: u(x - r),
        top: u(yc - r),
        width: u(2 * r),
        height: u(2 * r),
        background: color,
        transform: `translateZ(${u(zc)}) rotateY(90deg)`,
      }}
    />
  );
}

const range = (n) => Array.from({ length: n }, (_, i) => i);

function Camcorder3D() {
  const grey = "#9a9d9b";
  const dark = "#25272a";
  return (
    <div className="cam3d-model">
      {/* base plate in the owner's colour */}
      <Box x={-1.2} y={-1} z={0} w={24.4} d={9} h={1} color="var(--owner)" />
      {/* body, with the tape door and the owner's stripe on the side */}
      <Box
        x={6}
        y={0}
        z={1}
        w={12}
        d={7}
        h={7}
        color={grey}
        top="#b9bcba"
        south={
          <>
            <span className="cam-tape" />
            <span className="cam-stripe" />
          </>
        }
      />
      {/* lens barrel and fisheye hood */}
      {range(6).map((k) => (
        <Disc key={`b${k}`} x={1.6 + k * 0.75} yc={3.5} zc={4.5} r={2.4} color={k % 2 ? "#3b3e42" : dark} />
      ))}
      <Disc x={5.6} yc={3.5} zc={4.5} r={2.7} color="#c3c6c8" />
      {range(4).map((k) => (
        <Disc key={`h${k}`} x={k * 0.55} yc={3.5} zc={4.5} r={3.7} color="#101112" />
      ))}
      {/* the front glass of the lens (faces the viewer once the model is turned) */}
      <Disc
        x={-0.15}
        yc={3.5}
        zc={4.5}
        r={3.1}
        color="radial-gradient(circle at 38% 38%, #86abea, #1b2c4d 55%, #05070d)"
      />
      {/* handle with posts, and the mic on top */}
      <Box x={4.5} y={2.8} z={8} w={1.4} d={1.4} h={0.9} color={grey} />
      <Box x={13} y={2.8} z={8} w={1.4} d={1.4} h={0.9} color={grey} />
      <Box x={3.5} y={2.8} z={8.9} w={11} d={1.4} h={0.9} color={grey} top="#b9bcba" />
      <Box x={0.6} y={2.4} z={9.2} w={5} d={2.2} h={2.2} color={dark} top="#3b3e42" />
      {/* viewfinder and eyecup at the back */}
      <Box x={16.5} y={0.5} z={5.4} w={5.5} d={3} h={2.8} color="#1f2122" top="#33363a" />
      <Box x={21.8} y={0.2} z={5.1} w={1.2} d={3.6} h={3.4} color="#111" />
    </div>
  );
}

// The upgraded piece: a film tape (a cassette standing on its base plate),
// with the owner's colour on the label and the plate.
function Tape3D() {
  return (
    <div className="cam3d-model">
      <Box x={-0.5} y={-1.2} z={0} w={15} d={6.4} h={1} color="var(--owner)" />
      <Box
        x={1}
        y={0.5}
        z={1}
        w={12.5}
        d={3.6}
        h={9}
        color="#1d1f21"
        top="#3a3d41"
        south={
          <>
            <span className="tape-label" />
            <span className="tape-window">
              <span className="tape-reel" />
              <span className="tape-reel" />
            </span>
            <span className="tape-foot" />
          </>
        }
      />
    </div>
  );
}

// The lines of info shown on a location card: price, who has a camera or
// tape there, the current clip fee, and what an upgrade would cost.
function locationLines(game, index) {
  const space = boardSpaces[index];
  switch (space.type) {
    case "property": {
      const owner = ownerOf(game, index);
      if (owner < 0) {
        return [
          `Hire a filmer: $${space.price}`,
          `Camera clip fee: $${rentFor(space)}`,
        ];
      }
      const isTape = game.tapes.includes(index);
      const lines = [
        `${isTape ? "📼 Film tape" : "📹 Camera"} · ${PLAYER_NAMES[owner]}`,
        `Clip fee: $${rentAt(game, index)}`,
      ];
      lines.push(
        isTape
          ? "Fully filmed (no upgrade left)"
          : `Second trick: $${upgradeCostFor(space)} → tape`
      );
      return lines;
    }
    case "tax":
      return [`Pay 10% or $${space.tax}`, "(the lower amount)"];
    case "trivia":
      return ["Game of SKATE", "Win a rival's camera spot"];
    case "chance":
      return ["Chance", "Draw a card"];
    default:
      if (space.corner === "go") return ["Collect $200 for passing"];
      if (space.corner === "jail") return ["Just visiting, or in jail"];
      if (space.corner === "go-to-jail") return ["Go directly to jail"];
      return ["Take a breather"];
  }
}

const SPACE_ICONS = { chance: "❓", trivia: "🧠", tax: "💸", corner: "🏁" };

// The card shown over a player's head when they land: the spot's photo
// (cropped to fit) with its name and info underneath.
function LocationCard({ game, index, leaving }) {
  const space = boardSpaces[index];
  const image = locationImage(index);
  const owner = ownerOf(game, index);
  return (
    <div className={`loc-card${leaving ? " leaving" : ""}`}>
      {image ? (
        <img className="loc-img" src={image} alt="" draggable="false" />
      ) : (
        <div className={`loc-img loc-placeholder ${space.group ? `group-${space.group}` : ""}`}>
          {SPACE_ICONS[space.type] ?? "📷"}
        </div>
      )}
      <div className="loc-info">
        <strong className="loc-name">{space.name}</strong>
        {locationLines(game, index).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      {owner >= 0 && <i className={`loc-owner p${owner}`} />}
    </div>
  );
}

function spaceDetail(space) {
  switch (space.type) {
    case "property":
      return `Filmer $${space.price} · Clip fee $${rentFor(space)}`;
    case "trivia":
      return "Game of SKATE";
    case "tax":
      return `Pay 10% or $${space.tax}`;
    default:
      return null;
  }
}

export default function Board() {
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame);
  const { players, turn, phase, dice, message, winner } = game;
  const roller = game.roller ?? turn;
  const current = players[turn];
  const currentSpace = boardSpaces[current.space];

  // `shown` is where each piece is drawn. It walks towards the real position
  // in `players` one space at a time so moves can be seen (and followed).
  const [shown, setShown] = useState(() => players.map((p) => p.space));
  // Camera: it follows the active player until you drag the view; the
  // recenter button (or the next action) hands control back to the follow.
  const [autoFollow, setAutoFollow] = useState(true);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 }); // board fractions
  const [zoom, setZoom] = useState(FOLLOW_ZOOM);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const boardRef = useRef(null);

  // `holding` is the short pause while the dice tumble, before anyone moves.
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef(null);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const movingIdx = shown.findIndex((s, i) => s !== players[i].space);
  const walkingIdx = holding ? -1 : movingIdx;
  const busy = holding || movingIdx >= 0;

  // The turn is handed over when the player presses Next: the player who just
  // went keeps their location card with a Next button; pressing it fades the
  // card out, the camera glides to the next player, and only then does their
  // bubble appear. `uiTurn` is the player the screen is currently about; it
  // lags `turn` until Next is pressed.
  const [uiTurn, setUiTurn] = useState(turn);
  const [bubbleFor, setBubbleFor] = useState(turn);
  const [leaving, setLeaving] = useState(false); // the card is fading out
  const handingOff = uiTurn !== turn;
  const handoffTimer = useRef(null);
  useEffect(() => () => clearTimeout(handoffTimer.current), []);
  const nextPlayer = () => {
    setLeaving(true);
    clearTimeout(handoffTimer.current);
    handoffTimer.current = setTimeout(() => {
      setUiTurn(turn);
      setLeaving(false);
    }, FADE_MS);
  };
  // A bankrupt player has no piece to hold a Next button, so skip ahead.
  useEffect(() => {
    if (handingOff && !busy && players[uiTurn].bankrupt) setUiTurn(turn);
  }, [handingOff, busy, players, uiTurn, turn]);
  useEffect(() => {
    if (handingOff || bubbleFor === turn) return undefined;
    const timer = setTimeout(() => setBubbleFor(turn), PAN_MS);
    return () => clearTimeout(timer);
  }, [handingOff, bubbleFor, turn]);

  useEffect(() => {
    if (holding || movingIdx < 0) return undefined;
    const target = players[movingIdx].space;
    const n = boardSpaces.length;
    const distance = (target - shown[movingIdx] + n) % n;
    const timer = setTimeout(() => {
      setShown((prev) =>
        prev.map((s, i) =>
          i !== movingIdx ? s : distance <= MAX_WALK ? (s + 1) % n : target
        )
      );
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, players, movingIdx, holding]);

  // The camera follows whoever is rolling/moving, otherwise whoever's turn it is.
  const focus = holding ? roller : movingIdx >= 0 ? movingIdx : uiTurn;
  const focusPoint = cellCenter(shown[focus]);
  // The camera looks a little towards the middle of the board, not dead on the
  // piece, so that more of the board is in view around the character.
  const followPoint = {
    x: focusPoint.x + (0.5 - focusPoint.x) * FOLLOW_BIAS,
    y: focusPoint.y + (0.5 - focusPoint.y) * FOLLOW_BIAS,
  };
  const camera = autoFollow ? followPoint : pan;
  // Follow the piece, but pull back while it's travelling so the board it crosses stays in view.
  const viewZoom = autoFollow && movingIdx >= 0 ? zoom * TRAVEL_ZOOM_FACTOR : zoom;

  const act = (action) => {
    setAutoFollow(true); // new action: look at the result
    if (action.type === "RESET") {
      setUiTurn(0);
      setBubbleFor(0);
    }
    if (action.type === "ROLL" || action.type === "SKATE_THROW") {
      setHolding(true);
      clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => setHolding(false), DICE_MS);
    }
    dispatch(action);
  };
  const roll = () => act({ type: "ROLL", dice: [rollDie(), rollDie()] });

  const recenter = () => {
    setAutoFollow(true);
    setZoom(FOLLOW_ZOOM);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest("button, details")) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (autoFollow) {
      setPan(followPoint);
      setAutoFollow(false);
    }
    setDragging(true);
  };
  const onPointerMove = (e) => {
    const last = dragRef.current;
    if (!last || !boardRef.current) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    // Undo the isometric projection: screen pixels -> board-plane pixels.
    const u = dx / viewZoom;
    const v = dy / (viewZoom * COS_TILT);
    const a = (u + v) * SIN_45;
    const b = (v - u) * SIN_45;
    const size = boardRef.current.offsetWidth;
    setPan((p) => ({
      // you can pan well past the board's edges before hitting the limit
      x: Math.min(PAN_LIMIT.max, Math.max(PAN_LIMIT.min, p.x - a / size)),
      y: Math.min(PAN_LIMIT.max, Math.max(PAN_LIMIT.min, p.y - b / size)),
    }));
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };
  // The HUD layer holds a stack (dice, card, bubble) for each player who has one.
  // Every frame, each stack is placed above its player's head on screen, then
  // clamped so all of it stays inside the window whatever the camera zoom is.
  const [hudEl, setHudEl] = useState(null);
  // Collapse the card / bubble down to a small tab so the board underneath can be read.
  const [panelsHidden, setPanelsHidden] = useState(false);
  useEffect(() => {
    if (!hudEl) return undefined;
    const MARGIN = 8;
    const GAP = 10; // between the head and the stack
    let frame;
    const tick = () => {
      const layer = hudEl.getBoundingClientRect();
      for (const stack of hudEl.children) {
        const anchor = boardRef.current?.querySelector(
          `[data-piece="${stack.dataset.player}"]`
        );
        const body = anchor?.querySelector(".piece-body");
        if (!anchor || !body) continue;
        const ground = anchor.getBoundingClientRect(); // a point: where the feet are
        const bodyHeight = body.getBoundingClientRect().height;
        const w = stack.offsetWidth;
        const h = stack.offsetHeight;
        const headX = ground.left - layer.left;
        const feetY = ground.top - layer.top;
        if (stack.classList.contains("collapsed")) {
          // Collapsed: just the eye, parked right beside the player.
          const bodyBox = body.getBoundingClientRect();
          stack.style.left = `${Math.min(
            headX + bodyBox.width / 2 + 6,
            layer.width - w - MARGIN
          )}px`;
          stack.style.top = `${Math.min(
            Math.max(feetY - bodyHeight / 2 - h / 2, MARGIN),
            layer.height - h - MARGIN
          )}px`;
          continue;
        }
        const left = Math.min(Math.max(headX - w / 2, MARGIN), layer.width - w - MARGIN);
        // Above the head if it fits there, otherwise below the feet, otherwise
        // wherever there is more room (kept inside the window either way).
        const roomAbove = feetY - bodyHeight - GAP - MARGIN;
        const roomBelow = layer.height - feetY - GAP - MARGIN;
        let top;
        let flipped = false;
        if (roomAbove >= h) {
          top = feetY - bodyHeight - GAP - h;
        } else if (roomBelow >= h) {
          top = feetY + GAP;
          flipped = true;
        } else if (roomAbove >= roomBelow) {
          top = Math.max(MARGIN, feetY - bodyHeight - GAP - h);
        } else {
          top = Math.min(layer.height - h - MARGIN, feetY + GAP);
          flipped = true;
        }
        stack.style.left = `${left}px`;
        stack.style.top = `${top}px`;
        // off its head (flipped or slid sideways): the bubble's tail would point the wrong way
        stack.classList.toggle("clamped", flipped || Math.abs(left + w / 2 - headX) > 4);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hudEl]);

  // Scroll / trackpad pinch zooms the camera only. The listener is native and
  // non-passive so it can stop the browser from also zooming the whole page.
  const gameRef = useRef(null);
  useEffect(() => {
    const el = gameRef.current;
    const onWheel = (e) => {
      if (e.target.closest(".skate-list")) return; // let that list scroll
      e.preventDefault();
      const rate = e.ctrlKey ? 0.01 : 0.0015; // pinch gestures send small deltas
      setZoom((z) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * rate)))
      );
    };
    const stop = (e) => e.preventDefault(); // Safari's pinch gesture
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", stop);
    el.addEventListener("gesturechange", stop);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", stop);
      el.removeEventListener("gesturechange", stop);
    };
  }, []);

  // If the page itself is zoomed (browser zoom, or a pinch the browser handles),
  // keep the player info the same size on screen and pinned to the visible
  // top-left corner by counter-scaling it.
  const [infoView, setInfoView] = useState({ scale: 1, x: 0, y: 0 });
  useEffect(() => {
    const baseDpr = window.devicePixelRatio || 1;
    const vv = window.visualViewport;
    const update = () => {
      const pinch = vv ? vv.scale : 1;
      const pageZoom = (window.devicePixelRatio || 1) / baseDpr;
      setInfoView({
        scale: 1 / (pinch * pageZoom),
        x: vv ? vv.offsetLeft : 0,
        y: vv ? vv.offsetTop : 0,
      });
    };
    update();
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, []);


  return (
    <div
      className={`game${dragging ? " dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      ref={gameRef}
    >
      <aside
        className="sidebar"
        style={{
          transform: `translate(${infoView.x}px, ${infoView.y}px) scale(${infoView.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="status-cards">
          {players.map((p, i) => (
            <div
              key={i}
              className={`status-card${
                i === uiTurn && phase !== "gameover" ? " current" : ""
              }${p.bankrupt ? " bankrupt" : ""}`}
            >
              <h2>
                <span className={`player-icon p${i}`}>🛹</span> {PLAYER_NAMES[i]}
              </h2>
              {p.bankrupt ? (
                <p>💀 Bankrupt</p>
              ) : (
                <>
                  <p>📍 {boardSpaces[p.space].name}</p>
                  <p>💵 ${p.money}</p>
                  {p.jailCards > 0 && <p>🎟️ Get Out of Jail Free ×{p.jailCards}</p>}
                  {p.inJail && (
                    <p>
                      🔒 In jail (attempt {p.jailAttempts}/{MAX_JAIL_ATTEMPTS})
                    </p>
                  )}
                  <details className="spots-owned">
                    <summary>📹 Spots owned: {p.properties.length}</summary>
                    {p.properties.length > 0 && (
                      <ul>
                        {p.properties.map((s) => (
                          <li key={s}>
                            {game.tapes.includes(s) ? "📼" : "📹"} {boardSpaces[s].name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="iso-viewport">
        <button className="camera-toggle" onClick={recenter}>
          🎯 Recenter on player
        </button>

        {/* The first 40 children must be the spaces: App.css positions them with nth-child */}
        <div className="iso-zoomer" style={{ "--zoom": viewZoom }}>
        <div
          ref={boardRef}
          className={`board iso-board${walkingIdx >= 0 ? " walking" : ""}`}
          style={{
            "--tx": `${(0.5 - camera.x) * 100}%`,
            "--ty": `${(0.5 - camera.y) * 100}%`,
          }}
        >
          {boardSpaces.map((space, i) => {
            const owner = ownerOf(game, i);
            const classes = [
              "space",
              space.type === "corner" ? `corner ${space.corner}` : space.type,
              space.group ? `group-${space.group}` : "",
              owner >= 0 ? `owned-p${owner}` : "",
              phase !== "gameover" && shown[focus] === i ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={i} className={classes}>
                <div className="property-name">
                  {TYPE_ICONS[space.type] && (
                    <span className="icon">{TYPE_ICONS[space.type]}</span>
                  )}
                  <p>{space.name}</p>
                  {owner >= 0 ? (
                    <p>
                      {game.tapes.includes(i) ? "📼" : "📹"} ${rentAt(game, i)}
                    </p>
                  ) : (
                    spaceDetail(space) && <p>{spaceDetail(space)}</p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="board-center">
            <p className="center-message" aria-live="polite">
              {holding
                ? "Rolling…"
                : phase === "gameover"
                  ? `🏆 ${PLAYER_NAMES[winner]} wins!`
                  : message}
            </p>
            <div className="center-title">
              🛹 SKATE
              <br />
              MONOPOLY
            </div>
          </div>

          {/* A 3D camcorder piece stands on every owned space, in the owner's colour */}
          {boardSpaces.map((space, i) => {
            const owner = ownerOf(game, i);
            if (owner < 0) return null;
            const { x, y } = cellTopEdge(i);
            const isTape = game.tapes.includes(i);
            return (
              <div
                key={`cam-${i}`}
                className={`cam3d p${owner} ${isTape ? "is-tape" : "is-camera"}`}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                role="img"
                aria-label={`${space.name}: ${isTape ? "film tape" : "camera"} owned by ${PLAYER_NAMES[owner]}`}
              >
                {isTape ? <Tape3D key="tape" /> : <Camcorder3D key="camera" />}
              </div>
            );
          })}

          {players.map((p, i) => {
            if (p.bankrupt) return null;
            const { x, y } = cellCenter(shown[i]);
            const sharing = shown.some((s, j) => j !== i && s === shown[i]);
            const offset = sharing ? (i === 0 ? -1 : 1) * SHARED_SPACE_OFFSET : 0;
            const showBubble =
              !busy &&
              ((phase === "gameover" && i === winner) ||
                (phase !== "gameover" &&
                  i === turn &&
                  !handingOff &&
                  bubbleFor === turn));
            // The dice hover above the head of whoever rolled, until they land.
            const showDice = busy && i === roller && dice;
            // In a Game of SKATE the opponent's dice tumble over their own head.
            const rivalDice =
              busy && game.rival && game.rival.player === i ? game.rival.dice : null;
            // Once they've landed, whoever just moved shows a card for their space.
            // Once their moves are done, the player who just went gets a Next button.
            const showNext =
              handingOff &&
              !busy &&
              !leaving &&
              i === uiTurn &&
              phase !== "gameover";
            // The card stays while they decide, and until they press Next.
            const showCard =
              !busy &&
              game.roller === i &&
              phase !== "gameover" &&
              (i === turn || handingOff);
            const bubble = showBubble && (
              <div className="speech-bubble">
                {phase === "roll" && (
                  <>
                    <button className="roll-button" onClick={roll}>
                      {current.inJail ? "Skate for doubles" : "Skate 🛹"}
                    </button>
                    {current.inJail && current.jailCards > 0 && (
                      <button
                        className="secondary-button"
                        onClick={() => act({ type: "USE_JAIL_CARD" })}
                      >
                        Use Get Out of Jail Free 🎟️
                      </button>
                    )}
                    {current.inJail && (
                      <button
                        className="secondary-button"
                        disabled={current.money < JAIL_FEE}
                        onClick={() => act({ type: "PAY_JAIL" })}
                      >
                        Pay ${JAIL_FEE} to leave jail
                      </button>
                    )}
                  </>
                )}
                {phase === "card" && (
                  <button
                    className="roll-button"
                    onClick={() =>
                      act({ type: "CARD_OK", dice: [rollDie(), rollDie()] })
                    }
                  >
                    Play card 🎴
                  </button>
                )}
                {phase === "buy" && (
                  <>
                    <button
                      className="roll-button"
                      onClick={() => act({ type: "BUY" })}
                    >
                      Hire filmer 📹
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => act({ type: "SKIP" })}
                    >
                      Skip
                    </button>
                  </>
                )}
                {phase === "skate_pick" && (
                  <>
                    <p className="bubble-text">Game of SKATE! Pick a camera to win:</p>
                    <div className="skate-list">
                      {skateTargets(game, turn).map((idx) => (
                        <button
                          key={idx}
                          className="secondary-button"
                          onClick={() => act({ type: "SKATE_PICK", space: idx })}
                        >
                          📹 {boardSpaces[idx].name} · ${rentAt(game, idx)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {phase === "skate" && game.skate && (
                  <>
                    <p className="bubble-text">
                      SKATE for {boardSpaces[game.skate.target].name}
                    </p>
                    <p className="bubble-text skate-score">
                      {PLAYER_NAMES[game.skate.challenger]} {game.skate.wins[0]} –{" "}
                      {game.skate.wins[1]} {PLAYER_NAMES[game.skate.defender]}
                    </p>
                    <button
                      className="roll-button"
                      onClick={() =>
                        act({
                          type: "SKATE_THROW",
                          dice: [
                            [rollDie(), rollDie()],
                            [rollDie(), rollDie()],
                          ],
                        })
                      }
                    >
                      Throw down 🎲
                    </button>
                  </>
                )}
                {phase === "upgrade" && (
                  <>
                    <p className="bubble-text">
                      Film a 2nd trick here? Camera → Tape
                    </p>
                    <button
                      className="roll-button"
                      onClick={() => act({ type: "UPGRADE" })}
                    >
                      Film it 📼 (${upgradeCostFor(currentSpace)})
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => act({ type: "SKIP" })}
                    >
                      Skip
                    </button>
                  </>
                )}
                {phase === "gameover" && (
                  <button
                    className="roll-button"
                    onClick={() => act({ type: "RESET" })}
                  >
                    Play again
                  </button>
                )}
              </div>
            );
            return (
              <div
                key={i}
                className="piece-anchor"
                data-piece={i}
                style={{
                  left: `calc(${x * 100}% + ${offset}px)`,
                  top: `${y * 100}%`,
                }}
                role="img"
                aria-label={`${PLAYER_NAMES[i]} piece on ${boardSpaces[shown[i]].name}`}
              >
                <div className={`piece-hop${walkingIdx === i ? " walking" : ""}`}>
                  <div className={`piece-body p${i}`}>
                    <span className="piece-emoji">🛹</span>
                    <span className="piece-num">{i + 1}</span>
                    {/* The dice, card and bubble are drawn in a screen-space layer
                        (see hud-layer) that follows this head, so they keep a
                        constant size and never get cropped by the viewport. */}
                    {(showDice || rivalDice || bubble || showCard || showNext) &&
                      hudEl &&
                      createPortal(
                      <div
                        className={`head-stack hud-stack${
                          panelsHidden && (showCard || bubble || showNext) ? " collapsed" : ""
                        }`}
                        data-player={i}
                      >
                        {showDice && (
                          <div className="head-dice" aria-hidden="true">
                            <Die value={dice[0]} rollKey={`a${game.rollCount}`} />
                            <Die value={dice[1]} rollKey={`b${game.rollCount}`} />
                          </div>
                        )}
                        {rivalDice && (
                          <div className="head-dice" aria-hidden="true">
                            <Die value={rivalDice[0]} rollKey={`ra${game.rollCount}`} />
                            <Die value={rivalDice[1]} rollKey={`rb${game.rollCount}`} />
                          </div>
                        )}
                        {(showCard || bubble || showNext) && (
                          <button
                            className="stack-toggle"
                            onClick={() => setPanelsHidden((h) => !h)}
                            aria-expanded={!panelsHidden}
                            aria-label={panelsHidden ? "Show the card" : "Hide the card"}
                            title={panelsHidden ? "Show" : "Hide"}
                          >
                            <span className={`eye${panelsHidden ? " closed" : ""}`}>👁️</span>
                          </button>
                        )}
                        {!panelsHidden && (
                          <>
                            {showCard && (
                              <LocationCard
                                key={`${game.rollCount}-${p.space}`}
                                game={game}
                                index={p.space}
                                leaving={leaving && i === uiTurn}
                              />
                            )}
                            {bubble}
                            {showNext && (
                              <div className="speech-bubble">
                                <button className="roll-button" onClick={nextPlayer}>
                                  Next player ▶
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>,
                      hudEl
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
      {/* Screen-space layer for each player's dice, location card and bubble */}
      <div className="hud-layer" ref={setHudEl} />
    </div>
  );
}
