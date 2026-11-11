import { useEffect, useReducer, useRef, useState } from "react";
import boardSpaces from "../game/BoardSpaces.jsx";
import {
  PLAYER_NAMES,
  JAIL_FEE,
  MAX_JAIL_ATTEMPTS,
  createGame,
  gameReducer,
  ownerOf,
  rentFor,
} from "../game/rules.js";
import { cellCenter } from "../game/layout.js";

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
const MAX_WALK = 12; // longer jumps (e.g. Go to Jail) teleport instead of walking
const FOLLOW_ZOOM = 1.35;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const COS_TILT = Math.cos((55 * Math.PI) / 180); // matches rotateX(55deg) in App.css
const SIN_45 = Math.SQRT1_2; // sin and cos of the 45deg board rotation
const SHARED_SPACE_OFFSET = 14; // px apart when both pieces share a space

// A little VX1000-style camcorder, tinted with the owner's colour.
function Camcorder() {
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true">
      <rect x="2" y="17" width="14" height="14" rx="2" fill="#222" />
      <circle cx="6" cy="24" r="7" fill="#333" stroke="#fff" strokeWidth="1.5" />
      <circle cx="6" cy="24" r="3" fill="#8ab4ff" />
      <rect x="14" y="12" width="36" height="24" rx="4" fill="currentColor" stroke="#111" strokeWidth="2" />
      <rect x="34" y="5" width="16" height="8" rx="2" fill="#222" />
      <rect x="22" y="35" width="22" height="6" rx="2" fill="#222" />
      <circle cx="45" cy="20" r="2.5" fill="#ff3b30" />
    </svg>
  );
}

function spaceDetail(space) {
  switch (space.type) {
    case "property":
      return `Filmer $${space.price} · Clip fee $${rentFor(space)}`;
    case "trivia":
      return "Pick Up Card";
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
  const focus = holding ? roller : movingIdx >= 0 ? movingIdx : turn;
  const focusPoint = cellCenter(shown[focus]);
  const camera = autoFollow ? focusPoint : pan;

  const act = (action) => {
    setAutoFollow(true); // new action: look at the result
    if (action.type === "ROLL") {
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
      setPan(focusPoint);
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
    const u = dx / zoom;
    const v = dy / (zoom * COS_TILT);
    const a = (u + v) * SIN_45;
    const b = (v - u) * SIN_45;
    const size = boardRef.current.offsetWidth;
    setPan((p) => ({
      x: Math.min(1, Math.max(0, p.x - a / size)),
      y: Math.min(1, Math.max(0, p.y - b / size)),
    }));
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };
  const onWheel = (e) => {
    setZoom((z) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * 0.0015)))
    );
  };


  return (
    <div
      className={`game${dragging ? " dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
    >
      <aside className="sidebar">
        <div className="status-cards">
          {players.map((p, i) => (
            <div
              key={i}
              className={`status-card${
                i === turn && phase !== "gameover" ? " current" : ""
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
                          <li key={s}>{boardSpaces[s].name}</li>
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
        <div
          ref={boardRef}
          className={`board iso-board${walkingIdx >= 0 ? " walking" : ""}`}
          style={{
            "--zoom": zoom,
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
                    <p>Filmer: {PLAYER_NAMES[owner]}</p>
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

          {/* A camcorder stands on every owned space, in the owner's colour */}
          {boardSpaces.map((space, i) => {
            const owner = ownerOf(game, i);
            if (owner < 0) return null;
            const { x, y } = cellCenter(i);
            return (
              <div
                key={`cam-${i}`}
                className="piece-anchor camera-anchor"
                style={{ left: `${x * 100}%`, top: `${(y - 0.012) * 100}%` }}
                role="img"
                aria-label={`${space.name}: filmer hired by ${PLAYER_NAMES[owner]}`}
              >
                <div className={`camera-body p${owner}`}>
                  <Camcorder />
                </div>
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
                (phase !== "gameover" && i === turn));
            // The dice hover above the head of whoever rolled, until they land.
            const showDice = busy && i === roller && dice;
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
                    <p className="bubble-text">
                      {currentSpace.name} · ${currentSpace.price}
                    </p>
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
                    {(showDice || bubble) && (
                      <div className="head-stack">
                        {showDice && (
                          <div className="head-dice" aria-hidden="true">
                            <Die value={dice[0]} rollKey={`a${game.rollCount}`} />
                            <Die value={dice[1]} rollKey={`b${game.rollCount}`} />
                          </div>
                        )}
                        {bubble}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
