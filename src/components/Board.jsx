import { useState } from "react";
import boardSpaces from "../game/BoardSpaces.jsx";

const STARTING_MONEY = 1500;
const PLAYER_NAMES = ["Player One", "Player Two"];
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TYPE_ICONS = { chance: "❓", trivia: "🧠", tax: "💸" };

const initialPlayers = () =>
  PLAYER_NAMES.map(() => ({ space: 0, money: STARTING_MONEY, properties: [] }));

function spaceDetail(space) {
  switch (space.type) {
    case "property":
      return `Price $${space.price}`;
    case "trivia":
      return "Pick Up Card";
    case "tax":
      return `Pay 10% or $${space.tax}`;
    default:
      return null;
  }
}

function describeLanding(space) {
  switch (space.type) {
    case "property":
      return `${space.name} is for sale for $${space.price}.`;
    case "trivia":
      return "Draw a Skate Trivia card!";
    case "chance":
      return "Draw a Chance card!";
    case "tax":
      return `Pay 10% or $${space.tax}.`;
    default:
      return null;
  }
}

export default function Board() {
  const [players, setPlayers] = useState(initialPlayers);
  // Index into players: 0 = player one, 1 = player two
  const [turn, setTurn] = useState(0);
  // { player, roll, space } for the most recent move
  const [lastMove, setLastMove] = useState(null);

  const movePiece = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const to = (players[turn].space + roll) % boardSpaces.length;
    setLastMove({ player: turn, roll, space: to });
    setPlayers((prev) =>
      prev.map((p, i) => (i === turn ? { ...p, space: to } : p))
    );
    setTurn((t) => (t + 1) % players.length);
  };

  const landed = lastMove ? boardSpaces[lastMove.space] : null;

  return (
    <div className="game">
      <h1 className="game-title">🛹 Skate Monopoly</h1>
      {/* The first 40 children must be the spaces: App.css positions them with nth-child */}
      <div className="board">
        {boardSpaces.map((space, i) => {
          const classes = [
            "space",
            space.type === "corner" ? `corner ${space.corner}` : space.type,
            space.group ? `group-${space.group}` : "",
            players[turn].space === i ? "active" : "",
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
                {spaceDetail(space) && <p>{spaceDetail(space)}</p>}
              </div>
            </div>
          );
        })}

        <div className="center-panel">
          <h2 className={`turn-banner p${turn}`}>{PLAYER_NAMES[turn]}&apos;s turn</h2>

          <div className="roll-area">
            <span className="dice-face" aria-hidden="true">
              {lastMove ? DICE_FACES[lastMove.roll - 1] : "🎲"}
            </span>
            <button className="roll-button" onClick={movePiece}>
              Roll dice
            </button>
          </div>

          <p className="event-log" aria-live="polite">
            {lastMove ? (
              <>
                <strong>{PLAYER_NAMES[lastMove.player]}</strong> rolled a{" "}
                {lastMove.roll} and landed on <strong>{landed.name}</strong>.{" "}
                {describeLanding(landed)}
              </>
            ) : (
              "Roll the dice to start the game!"
            )}
          </p>

          <div className="status-cards">
            {players.map((p, i) => (
              <div
                key={i}
                className={`status-card${i === turn ? " current" : ""}`}
              >
                <h2>
                  <span className={`badge p${i}`} /> {PLAYER_NAMES[i]}
                </h2>
                <p>📍 {boardSpaces[p.space].name}</p>
                <p>💵 ${p.money}</p>
                <p>
                  🏠{" "}
                  {p.properties.length
                    ? p.properties.join(", ")
                    : "No properties yet"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {players.map((p, i) => (
          <div
            key={i}
            className={`piece p${i} position-${p.space}`}
            role="img"
            aria-label={`${PLAYER_NAMES[i]} piece on ${boardSpaces[p.space].name}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
