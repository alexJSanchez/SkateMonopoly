// The Chance deck. Each card has:
//   text        - what the player reads
//   description - what the card actually does in the game (for us, not shown)
//   type/action - how the rules code should handle it, plus its numbers
//
// Destinations and targets match the `name` of a space in BoardSpaces.jsx.
// rules.js draws and plays these (see playChanceCard); `action` picks the code path.

const chanceCards = {
  deck_name: "Chance",
  card_count: 16,
  cards: [
    {
      text: "Advance to X-Games",
      description:
        "Move the player straight to X-Games, the last space on the board. Passing SK8 on the way pays $200 (the player always travels forward). The player then resolves the space: hire a filmer if it's free, pay a clip fee if the other player owns it.",
      type: "movement",
      action: "move_to_space",
      destination: "X-Games",
    },
    {
      text: "Advance to SK8 (Collect $200)",
      description:
        "Move the player to SK8 (space 0) and give them $200.",
      type: "movement",
      action: "move_to_space",
      destination: "SK8",
      payout: 200,
    },
    {
      text: "Advance to Hirshgarten Skatepark Germany. If you pass SK8, collect $200.",
      description:
        "Move forward to Hirshgarten Skatepark Germany. If the move wraps past SK8, the player gets $200. Then resolve the space as normal (hire a filmer or pay a clip fee).",
      type: "movement",
      action: "move_to_space",
      destination: "Hirshgarten Skatepark Germany",
      conditional_payout: 200,
    },
    {
      text: "Advance to Gulliver SkatePark Spain. If you pass SK8, collect $200.",
      description:
        "Move forward to Gulliver SkatePark Spain. If the move wraps past SK8, the player gets $200. Then resolve the space as normal.",
      type: "movement",
      action: "move_to_space",
      destination: "Gulliver SkatePark Spain",
      conditional_payout: 200,
    },
    {
      text: "Advance to the nearest Skateboards Brand (Element, Plan B, Girl, or Zero). If unowned, you may buy it from the Bank. If owned, pay owner twice the rental to which they are otherwise entitled.",
      description:
        "Move forward to the closest of Element, Plan B, Girl or Zero Skateboards (passing SK8 pays $200). If nobody has a filmer there, the player may hire one for the normal price. If the other player does, the player pays DOUBLE the normal clip fee.",
      type: "movement_nearest",
      action: "move_to_nearest_railroad",
      targets: [
        "Element Skateboards",
        "Plan B Skateboards",
        "Girl Skateboards",
        "Zero Skateboards",
      ],
      rent_multiplier: 2,
    },
    {
      // Two copies of this card are in the deck, like the real game.
      text: "Advance to the nearest Skateboards Brand (Element, Plan B, Girl, or Zero). If unowned, you may buy it from the Bank. If owned, pay owner twice the rental to which they are otherwise entitled.",
      description:
        "Same as the card above: move forward to the nearest skateboard brand, hire a filmer if it's free, or pay double the clip fee if the other player owns it.",
      type: "movement_nearest",
      action: "move_to_nearest_railroad",
      targets: [
        "Element Skateboards",
        "Plan B Skateboards",
        "Girl Skateboards",
        "Zero Skateboards",
      ],
      rent_multiplier: 2,
    },
    {
      text: "Advance to the nearest Shop/Brand (Supreme or Tampa Skateshop). If unowned, you may buy it from the Bank. If owned, throw dice and pay owner a total ten times the amount thrown.",
      description:
        "Move forward to the closest of Supreme or Tampa Skateshop (passing SK8 pays $200). If it's free, the player may hire a filmer. If the other player owns it, the player rolls the dice and pays them 10x the total shown.",
      type: "movement_nearest",
      action: "move_to_nearest_utility",
      targets: ["Supreme", "Tampa Skateshop"],
      rent_multiplier_dice: 10,
    },
    {
      text: "Bank dividend. Collect $50.",
      description: "The player receives $50 from the bank.",
      type: "financial_gain",
      action: "collect_money",
      amount: 50,
    },
    {
      text: "Get Out of Jail Free. This card may be retained until needed or sold.",
      description:
        "The player keeps this card (it leaves the deck while they hold it). While in jail they can use it to leave for free, without the $50 fee or rolling doubles; the card then goes back into the deck.",
      type: "keep_card",
      action: "grant_jail_immunity",
    },
    {
      text: "Go Back 3 Spaces.",
      description:
        "Move the player 3 spaces backwards (no SK8 salary, since it's backwards), then resolve the space they land on.",
      type: "movement",
      action: "move_relative",
      spaces: -3,
    },
    {
      text: "Go directly to Jail. Do not pass SK8, do not collect $200.",
      description:
        "Send the player to Jail (space 10) with no salary. Their turn ends and they start in jail next turn.",
      type: "movement_penalty",
      action: "go_to_jail",
    },
    {
      text: "You lost footage! Pay to reupload every tape: $25 for each camera, $100 for each film tape.",
      description:
        "The player pays the bank $25 for every camera they own (like a house) and $100 for every film tape (like a hotel). Owning no spots costs nothing.",
      type: "financial_penalty",
      action: "pay_per_property",
      cost_per_camera: 25,
      cost_per_tape: 100,
    },
    {
      text: "Speeding fine $15.",
      description: "The player pays $15 to the bank.",
      type: "financial_penalty",
      action: "pay_money",
      amount: 15,
    },
    {
      text: "Take a trip to Element Skateboards. If you pass SK8, collect $200.",
      description:
        "Move forward to Element Skateboards (space 5). If the move wraps past SK8, the player gets $200. Then resolve the space as normal.",
      type: "movement",
      action: "move_to_space",
      destination: "Element Skateboards",
      conditional_payout: 200,
    },
    {
      text: "You have been elected Chairman of the Board. Pay each player $50.",
      description:
        "The player pays $50 to every other player still in the game (just the one opponent in a two-player game).",
      type: "financial_penalty",
      action: "pay_each_player",
      amount_per_player: 50,
    },
    {
      text: "Building loan matures. Collect $150.",
      description: "The player receives $150 from the bank.",
      type: "financial_gain",
      action: "collect_money",
      amount: 150,
    },
  ],
};

export default chanceCards;
