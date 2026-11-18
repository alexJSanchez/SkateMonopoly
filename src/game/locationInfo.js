import boardSpaces from "./BoardSpaces.jsx";
import { PLAYER_NAMES, ownerOf, rentFor, rentAt, upgradeCostFor } from "./rules.js";

// The lines of info shown on a location card: price, who has a camera or
// tape there, the current clip fee, and what an upgrade would cost.
export function locationLines(game, index) {
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
