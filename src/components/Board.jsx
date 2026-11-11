import { useReducer } from "react";
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

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TYPE_ICONS = { chance: "❓", trivia: "🧠", tax: "💸" };
const rollDie = () => Math.floor(Math.random() * 6) + 1;

function spaceDetail(space) {
  switch (space.type) {
    case "property":
      return `Price $${space.price} · Rent $${rentFor(space)}`;
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
  const current = players[turn];
  const currentSpace = boardSpaces[current.space];

  const roll = () => dispatch({ type: "ROLL", dice: [rollDie(), rollDie()] });

  return (
    <div className="game">
      <h1 className="game-title">🛹 Skate Monopoly</h1>
      {/* The first 40 children must be the spaces: App.css positions them with nth-child */}
      <div className="board">
        {boardSpaces.map((space, i) => {
          const owner = ownerOf(game, i);
          const classes = [
            "space",
            space.type === "corner" ? `corner ${space.corner}` : space.type,
            space.group ? `group-${space.group}` : "",
            owner >= 0 ? `owned-p${owner}` : "",
            phase !== "gameover" && current.space === i ? "active" : "",
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
                  <p>Owned by {PLAYER_NAMES[owner]}</p>
                ) : (
                  spaceDetail(space) && <p>{spaceDetail(space)}</p>
                )}
              </div>
            </div>
          );
        })}

        <div className="center-panel">
          {phase === "gameover" ? (
            <h2 className={`turn-banner p${winner}`}>
              🏆 {PLAYER_NAMES[winner]} wins!
            </h2>
          ) : (
            <h2 className={`turn-banner p${turn}`}>
              {PLAYER_NAMES[turn]}&apos;s turn
            </h2>
          )}

          <div className="roll-area">
            <span className="dice-face" aria-hidden="true">
              {dice ? `${DICE_FACES[dice[0] - 1]} ${DICE_FACES[dice[1] - 1]}` : "🎲"}
            </span>

            {phase === "roll" && (
              <div className="actions">
                <button className="roll-button" onClick={roll}>
                  {current.inJail ? "Roll for doubles" : "Roll dice"}
                </button>
                {current.inJail && (
                  <button
                    className="secondary-button"
                    disabled={current.money < JAIL_FEE}
                    onClick={() => dispatch({ type: "PAY_JAIL" })}
                  >
                    Pay ${JAIL_FEE} to leave jail
                  </button>
                )}
              </div>
            )}

            {phase === "buy" && (
              <div className="actions">
                <button
                  className="roll-button"
                  onClick={() => dispatch({ type: "BUY" })}
                >
                  Buy {currentSpace.name} (${currentSpace.price})
                </button>
                <button
                  className="secondary-button"
                  onClick={() => dispatch({ type: "SKIP" })}
                >
                  Skip
                </button>
              </div>
            )}

            {phase === "gameover" && (
              <button
                className="roll-button"
                onClick={() => dispatch({ type: "RESET" })}
              >
                Play again
              </button>
            )}
          </div>

          <p className="event-log" aria-live="polite">
            {message}
          </p>

          <div className="status-cards">
            {players.map((p, i) => (
              <div
                key={i}
                className={`status-card${
                  i === turn && phase !== "gameover" ? " current" : ""
                }${p.bankrupt ? " bankrupt" : ""}`}
              >
                <h2>
                  <span className={`badge p${i}`} /> {PLAYER_NAMES[i]}
                </h2>
                {p.bankrupt ? (
                  <p>💀 Bankrupt</p>
                ) : (
                  <>
                    <p>📍 {boardSpaces[p.space].name}</p>
                    <p>💵 ${p.money}</p>
                    {p.inJail && (
                      <p>
                        🔒 In jail (attempt {p.jailAttempts}/{MAX_JAIL_ATTEMPTS})
                      </p>
                    )}
                    <p>
                      🏠{" "}
                      {p.properties.length
                        ? p.properties.map((s) => boardSpaces[s].name).join(", ")
                        : "No properties yet"}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {players.map(
          (p, i) =>
            !p.bankrupt && (
              <div
                key={i}
                className={`piece p${i} position-${p.space}`}
                role="img"
                aria-label={`${PLAYER_NAMES[i]} piece on ${boardSpaces[p.space].name}`}
              >
                {i + 1}
              </div>
            )
        )}
      </div>
    </div>
  );
}
