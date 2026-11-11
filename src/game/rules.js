// Pure game rules for Skate Monopoly. No React in here: the UI just
// dispatches actions to `gameReducer` and renders the resulting state.
import boardSpaces from "./BoardSpaces.jsx";
import chanceCards from "./ChanceCards.js";

export const PLAYER_NAMES = ["Player One", "Player Two"];
export const STARTING_MONEY = 1500;
export const SALARY = 200; // collected for passing or landing on SK8
export const JAIL_SPACE = 10;
export const JAIL_FEE = 50;
export const MAX_JAIL_ATTEMPTS = 3; // failed doubles before you must pay the fee
export const MAX_DOUBLES = 3; // third double in a row sends you to jail
export const RENT_RATE = 0.1; // rent = 10% of the property's price
export const TAX_RATE = 0.1; // "Pay 10% or $X": the lower amount is charged

// Every hired filmer starts as a CAMERA (like one house). Landing on your own
// spot again lets you film a second trick, which turns the camera into a film
// TAPE (like a hotel): a much bigger clip fee. One camera / one tape per spot.
export const TAPE_RENT_MULTIPLIER = 5; // tape clip fee = camera clip fee x 5
export const UPGRADE_COST_RATE = 0.5; // second trick costs 50% of the spot's price

export const rentFor = (space) => Math.round(space.price * RENT_RATE);
export const upgradeCostFor = (space) =>
  Math.round(space.price * UPGRADE_COST_RATE);
// Clip fee for a spot right now: camera level, or tape level if upgraded.
export const rentAt = (state, index) =>
  rentFor(boardSpaces[index]) *
  (state.tapes.includes(index) ? TAPE_RENT_MULTIPLIER : 1);

const SPACE_COUNT = boardSpaces.length;
const JAIL_CARD_INDEX = chanceCards.cards.findIndex(
  (c) => c.action === "grant_jail_immunity"
);

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// `order` (optional) is the Chance deck as card indexes, top card first.
// It exists so tests can use a fixed deck; normally the deck is shuffled.
export function createGame(order) {
  return {
    players: PLAYER_NAMES.map(() => ({
      space: 0,
      money: STARTING_MONEY,
      properties: [], // indexes into boardSpaces
      inJail: false,
      jailAttempts: 0,
      jailCards: 0, // Get Out of Jail Free cards being held
      bankrupt: false,
    })),
    turn: 0,
    // "roll" -> waiting for a roll | "buy" -> deciding on a property |
    // "card" -> a Chance card has been drawn and is waiting to be played | "gameover"
    phase: "roll",
    dice: null, // [a, b] from the most recent roll
    rollCount: 0, // increments every roll so the UI can replay the tumble
    roller: null, // index of the player who made the most recent roll
    doublesCount: 0,
    pendingDouble: false, // did the roll that led to "buy" / "card" come up doubles?
    deck: order ?? shuffle(chanceCards.cards.map((_, i) => i)), // draw from the front
    card: null, // index of the Chance card waiting to be played
    tapes: [], // spaces upgraded from a camera to a film tape
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
  let s = patchPlayer(state, i, {
    bankrupt: true,
    money: 0,
    properties: [],
    jailCards: 0,
  });
  // their spots go back to the bank, tapes and all
  s = { ...s, tapes: s.tapes.filter((idx) => !state.players[i].properties.includes(idx)) };
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

// Take the top Chance card. The player reads it, then plays it with CARD_OK.
// Cards go to the bottom of the deck, except the jail card, which is kept.
function drawChance(state) {
  const [index, ...rest] = state.deck;
  const card = chanceCards.cards[index];
  const deck = card.action === "grant_jail_immunity" ? rest : [...rest, index];
  const s = { ...state, deck, card: index, phase: "card" };
  return say(s, `Chance! "${card.text}"`);
}

// Move the current player to space `to` and resolve it.
// opts.backwards: moved backwards, so SK8 salary is never paid.
// opts.rentMultiplier: multiplies the clip fee if the other player owns it.
// opts.diceTimes + opts.dice: instead pay dice total x diceTimes.
function landOn(state, from, to, rolledDouble, opts = {}) {
  const i = state.turn;
  const passedStart = !opts.backwards && to < from; // wrapped past (or onto) SK8
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
        if (s.tapes.includes(to)) {
          s = say(s, "Your film tape is already here.");
        } else {
          const cost = upgradeCostFor(space);
          if (s.players[i].money >= cost) {
            return say(
              { ...s, phase: "upgrade", pendingDouble: rolledDouble },
              `Your camera is here. Film a second trick for $${cost} to turn it into a tape?`
            );
          }
          s = say(s, `Your camera is here. A second trick costs $${cost}, which you can't afford.`);
        }
      } else {
        let rent;
        if (opts.diceTimes) {
          const total = opts.dice[0] + opts.dice[1];
          rent = total * opts.diceTimes;
          s = say(s, `Rolled ${total}: paid $${rent} to ${PLAYER_NAMES[owner]}'s filmer.`);
        } else {
          rent = rentAt(s, to) * (opts.rentMultiplier ?? 1);
          const label = opts.rentMultiplier > 1 ? "double clip fee" : "clip fee";
          s = say(s, `Paid $${rent} ${label} to ${PLAYER_NAMES[owner]}'s filmer.`);
        }
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
      return drawChance({ ...s, pendingDouble: rolledDouble });
    case "corner":
      if (space.corner === "go-to-jail") s = sendToJail(s, i);
      break;
    default:
      break;
  }
  return endTurn(s, rolledDouble);
}

function moveAndResolve(state, total, rolledDouble) {
  const from = state.players[state.turn].space;
  return landOn(state, from, (from + total) % SPACE_COUNT, rolledDouble);
}

// First space (counting forward from `from`) whose name is in `targets`.
function nearestForward(from, targets) {
  for (let step = 1; step <= SPACE_COUNT; step++) {
    const index = (from + step) % SPACE_COUNT;
    if (targets.includes(boardSpaces[index].name)) return index;
  }
  return from;
}

// Play the Chance card the current player drew.
function playChanceCard(state, dice) {
  const card = chanceCards.cards[state.card];
  const i = state.turn;
  const from = state.players[i].space;
  const double = state.pendingDouble;
  const name = PLAYER_NAMES[i];
  let s = { ...state, card: null, phase: "roll", message: "" };

  switch (card.action) {
    case "move_to_space": {
      const to = boardSpaces.findIndex((sp) => sp.name === card.destination);
      return landOn(s, from, to, double);
    }
    case "move_to_nearest_railroad": // nearest skateboard brand: double clip fee
    case "move_to_nearest_utility": { // nearest shop: dice total x 10
      const to = nearestForward(from, card.targets);
      const opts = card.rent_multiplier_dice
        ? { diceTimes: card.rent_multiplier_dice, dice }
        : { rentMultiplier: card.rent_multiplier ?? 1 };
      return landOn(s, from, to, double, opts);
    }
    case "move_relative": {
      const to = (from + card.spaces + SPACE_COUNT) % SPACE_COUNT;
      return landOn(s, from, to, double, { backwards: card.spaces < 0 });
    }
    case "go_to_jail":
      return endTurn(sendToJail(s, i), false);
    case "collect_money":
      s = patchPlayer(s, i, { money: s.players[i].money + card.amount });
      return endTurn(say(s, `${name} collected $${card.amount}.`), double);
    case "pay_money":
      s = say(s, `${name} paid $${card.amount} to the bank.`);
      return endTurn(pay(s, i, null, card.amount), double);
    case "pay_per_property": {
      // every camera is "one house" ($25), every tape is "one hotel" ($100)
      const owned = s.players[i].properties;
      const tapes = owned.filter((idx) => s.tapes.includes(idx)).length;
      const cameras = owned.length - tapes;
      const cost = cameras * card.cost_per_camera + tapes * card.cost_per_tape;
      s = say(
        s,
        owned.length === 0
          ? `${name} has no spots, so there's nothing to reupload.`
          : `${name} paid $${cost} to reupload ${cameras} camera${cameras === 1 ? "" : "s"} and ${tapes} tape${tapes === 1 ? "" : "s"}.`
      );
      return endTurn(pay(s, i, null, cost), double);
    }
    case "pay_each_player": {
      for (let j = 0; j < s.players.length; j++) {
        if (j === i || s.players[j].bankrupt) continue;
        s = say(s, `${name} paid $${card.amount_per_player} to ${PLAYER_NAMES[j]}.`);
        s = pay(s, i, j, card.amount_per_player);
        if (s.players[i].bankrupt) break;
      }
      return endTurn(s, double);
    }
    case "grant_jail_immunity":
      s = patchPlayer(s, i, { jailCards: s.players[i].jailCards + 1 });
      return endTurn(say(s, `${name} keeps a Get Out of Jail Free card.`), double);
    default:
      return endTurn(s, double);
  }
}

// ---------- reducer ----------
// Actions: { type: "ROLL", dice: [a, b] } | "BUY" | "UPGRADE" | "SKIP" | "PAY_JAIL" |
//          "USE_JAIL_CARD" | { type: "CARD_OK", dice: [a, b] } | "RESET"

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

    case "UPGRADE": {
      if (state.phase !== "upgrade") return state;
      const index = state.players[i].space;
      const space = boardSpaces[index];
      const cost = upgradeCostFor(space);
      if (state.players[i].money < cost) return state;
      let s = patchPlayer(state, i, { money: state.players[i].money - cost });
      s = {
        ...s,
        tapes: [...s.tapes, index],
        message: `${name} filmed a second trick at ${space.name} for $${cost}: the camera is now a film tape! Clip fee is now $${rentAt({ ...s, tapes: [...s.tapes, index] }, index)}.`,
      };
      return endTurn(s, state.pendingDouble);
    }

    case "SKIP": {
      if (state.phase !== "buy" && state.phase !== "upgrade") return state;
      const where = boardSpaces[state.players[i].space].name;
      const text =
        state.phase === "buy"
          ? `${name} didn't hire a filmer at ${where}.`
          : `${name} didn't film a second trick at ${where}.`;
      return endTurn({ ...state, message: text }, state.pendingDouble);
    }

    case "CARD_OK":
      if (state.phase !== "card") return state;
      return playChanceCard(state, action.dice ?? [1, 1]);

    case "PAY_JAIL": {
      const p = state.players[i];
      if (state.phase !== "roll" || !p.inJail || p.money < JAIL_FEE) return state;
      let s = pay(state, i, null, JAIL_FEE);
      s = patchPlayer(s, i, { inJail: false, jailAttempts: 0 });
      return { ...s, message: `${name} paid $${JAIL_FEE} and left jail. Skate to move.` };
    }

    case "USE_JAIL_CARD": {
      const p = state.players[i];
      if (state.phase !== "roll" || !p.inJail || p.jailCards < 1) return state;
      const s = patchPlayer(state, i, {
        inJail: false,
        jailAttempts: 0,
        jailCards: p.jailCards - 1,
      });
      return {
        ...s,
        deck: [...s.deck, JAIL_CARD_INDEX], // the used card goes back in the deck
        message: `${name} used a Get Out of Jail Free card. Skate to move.`,
      };
    }

    case "RESET":
      return createGame();

    default:
      return state;
  }
}
