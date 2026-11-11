// Pure game rules for Skate Monopoly. No React in here: the UI just
// dispatches actions to `gameReducer` and renders the resulting state.
import boardSpaces from "./BoardSpaces.jsx";

export const PLAYER_NAMES = ["Player One", "Player Two"];
export const STARTING_MONEY = 1500;
export const SALARY = 200; // collected for passing or landing on SK8
export const JAIL_SPACE = 10;
export const JAIL_FEE = 50;
export const MAX_JAIL_ATTEMPTS = 3; // failed doubles before you must pay the fee
export const MAX_DOUBLES = 3; // third double in a row sends you to jail
export const RENT_RATE = 0.1; // rent = 10% of the property's price
export const TAX_RATE = 0.1; // "Pay 10% or $X": the lower amount is charged

export const rentFor = (space) => Math.round(space.price * RENT_RATE);

export function createGame() {
  return {
    players: PLAYER_NAMES.map(() => ({
      space: 0,
      money: STARTING_MONEY,
      properties: [], // indexes into boardSpaces
      inJail: false,
      jailAttempts: 0,
      bankrupt: false,
    })),
    turn: 0,
    // "roll" -> waiting for a roll | "buy" -> deciding on a property | "gameover"
    phase: "roll",
    dice: null, // [a, b] from the most recent roll
    rollCount: 0, // increments every roll so the UI can replay the tumble
    roller: null, // index of the player who made the most recent roll
    doublesCount: 0,
    pendingDouble: false, // did the roll that led to "buy" come up doubles?
    winner: null,
    message: "Hit Skate to start the game!",
  };
}

export const ownerOf = (state, spaceIndex) =>
  state.players.findIndex((p) => p.properties.includes(spaceIndex));

// ---------- helpers (all return new state objects) ----------

const patchPlayer = (state, i, patch) => ({
  ...state,
  players: state.players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
});

const say = (state, text) => ({
  ...state,
  message: state.message ? `${state.message} ${text}` : text,
});

function bankrupt(state, i) {
  let s = patchPlayer(state, i, { bankrupt: true, money: 0, properties: [] });
  s = say(s, `${PLAYER_NAMES[i]} is bankrupt!`);
  const alive = s.players
    .map((p, idx) => (p.bankrupt ? -1 : idx))
    .filter((idx) => idx >= 0);
  if (alive.length === 1) {
    s = {
      ...s,
      phase: "gameover",
      winner: alive[0],
      message: `${s.message} 🏆 ${PLAYER_NAMES[alive[0]]} wins!`,
    };
  }
  return s;
}

// `to` is a player index, or null to pay the bank. A player who can't cover
// the full amount hands over everything they have and goes bankrupt.
function pay(state, from, to, amount) {
  const money = state.players[from].money;
  const paid = Math.min(money, amount);
  let s = patchPlayer(state, from, { money: money - paid });
  if (to !== null) {
    s = patchPlayer(s, to, { money: s.players[to].money + paid });
  }
  return paid < amount ? bankrupt(s, from) : s;
}

function sendToJail(state, i) {
  const s = patchPlayer(state, i, {
    space: JAIL_SPACE,
    inJail: true,
    jailAttempts: 0,
  });
  return say(s, `${PLAYER_NAMES[i]} goes to jail!`);
}

// Pass the turn on, unless the player rolled doubles and may roll again.
function endTurn(state, rolledDouble) {
  if (state.phase === "gameover") return state;
  const cur = state.players[state.turn];
  if (rolledDouble && !cur.bankrupt && !cur.inJail) {
    return say({ ...state, phase: "roll" }, "Doubles! Skate again.");
  }
  let next = state.turn;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].bankrupt);
  return { ...state, turn: next, phase: "roll", doublesCount: 0 };
}

function moveAndResolve(state, total, rolledDouble) {
  const i = state.turn;
  const from = state.players[i].space;
  const to = (from + total) % boardSpaces.length;
  const passedStart = to < from; // wrapped around the board (or landed on SK8)
  let s = patchPlayer(state, i, { space: to });
  const space = boardSpaces[to];
  const name = PLAYER_NAMES[i];

  s = say(s, `${name} moved to ${space.name}.`);
  if (passedStart) {
    s = patchPlayer(s, i, { money: s.players[i].money + SALARY });
    s = say(s, `Collected $${SALARY} for passing SK8.`);
  }

  switch (space.type) {
    case "property": {
      const owner = ownerOf(s, to);
      if (owner === -1) {
        if (s.players[i].money >= space.price) {
          return say(
            { ...s, phase: "buy", pendingDouble: rolledDouble },
            `Hire a filmer here for $${space.price}?`
          );
        }
        s = say(s, `Can't afford a filmer ($${space.price}).`);
      } else if (owner === i) {
        s = say(s, "Your filmer is already here.");
      } else {
        const rent = rentFor(space);
        s = say(s, `Paid $${rent} clip fee to ${PLAYER_NAMES[owner]}'s filmer.`);
        s = pay(s, i, owner, rent);
      }
      break;
    }
    case "tax": {
      const amount = Math.min(space.tax, Math.round(s.players[i].money * TAX_RATE));
      s = say(s, `Paid $${amount} to the bank.`);
      s = pay(s, i, null, amount);
      break;
    }
    case "trivia":
      s = say(s, "Draw a Skate Trivia card! (cards coming soon)");
      break;
    case "chance":
      s = say(s, "Draw a Chance card! (cards coming soon)");
      break;
    case "corner":
      if (space.corner === "go-to-jail") s = sendToJail(s, i);
      break;
    default:
      break;
  }
  return endTurn(s, rolledDouble);
}

// ---------- reducer ----------
// Actions: { type: "ROLL", dice: [a, b] } | "BUY" | "SKIP" | "PAY_JAIL" | "RESET"

export function gameReducer(state, action) {
  const i = state.turn;
  const name = PLAYER_NAMES[i];

  switch (action.type) {
    case "ROLL": {
      if (state.phase !== "roll") return state;
      const [a, b] = action.dice;
      const total = a + b;
      const isDouble = a === b;
      let s = {
        ...state,
        dice: [a, b],
        rollCount: state.rollCount + 1,
        roller: i,
        message: `${name} rolled ${a} + ${b}.`,
      };

      if (s.players[i].inJail) {
        if (isDouble) {
          s = patchPlayer(s, i, { inJail: false, jailAttempts: 0 });
          s = say(s, "Doubles! Out of jail.");
          return moveAndResolve(s, total, false); // no extra roll for leaving jail
        }
        const attempts = s.players[i].jailAttempts + 1;
        if (attempts >= MAX_JAIL_ATTEMPTS) {
          s = say(s, `Third failed attempt: paid the $${JAIL_FEE} fee.`);
          s = pay(s, i, null, JAIL_FEE);
          if (s.players[i].bankrupt) return endTurn(s, false);
          s = patchPlayer(s, i, { inJail: false, jailAttempts: 0 });
          return moveAndResolve(s, total, false);
        }
        s = patchPlayer(s, i, { jailAttempts: attempts });
        s = say(s, `Still in jail (attempt ${attempts}/${MAX_JAIL_ATTEMPTS}).`);
        return endTurn(s, false);
      }

      const doublesCount = isDouble ? s.doublesCount + 1 : 0;
      s = { ...s, doublesCount };
      if (doublesCount >= MAX_DOUBLES) {
        s = say(s, "Three doubles in a row!");
        return endTurn(sendToJail(s, i), false);
      }
      return moveAndResolve(s, total, isDouble);
    }

    case "BUY": {
      if (state.phase !== "buy") return state;
      const index = state.players[i].space;
      const price = boardSpaces[index].price;
      let s = patchPlayer(state, i, {
        money: state.players[i].money - price,
        properties: [...state.players[i].properties, index],
      });
      s = { ...s, message: `${name} hired a filmer at ${boardSpaces[index].name} for $${price}.` };
      return endTurn(s, state.pendingDouble);
    }

    case "SKIP": {
      if (state.phase !== "buy") return state;
      const s = { ...state, message: `${name} didn't hire a filmer at ${boardSpaces[state.players[i].space].name}.` };
      return endTurn(s, state.pendingDouble);
    }

    case "PAY_JAIL": {
      const p = state.players[i];
      if (state.phase !== "roll" || !p.inJail || p.money < JAIL_FEE) return state;
      let s = pay(state, i, null, JAIL_FEE);
      s = patchPlayer(s, i, { inJail: false, jailAttempts: 0 });
      return { ...s, message: `${name} paid $${JAIL_FEE} and left jail. Skate to move.` };
    }

    case "RESET":
      return createGame();

    default:
      return state;
  }
}
