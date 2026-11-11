# Skate Monopoly Rules

Two skaters travel around the world to famous skate spots. At each spot you can pay a **filmer** to capture a trick you land there. Your filmer then earns **clip fees** whenever the other skater lands on that spot. The last skater who isn't bankrupt wins.

> Working terms: "hire a filmer" and "clip fee" are placeholders until we pick a better name.

## Setup

- 2 players: Player One (blue) and Player Two (red).
- Each player starts on SK8 with **$1500**.
- Player One goes first.

## Taking a turn

1. Roll two dice and move your piece clockwise by the total.
2. Resolve the space you land on (see below).
3. If you rolled **doubles**, roll again after resolving your space.
4. Otherwise the turn passes to the other player.

### Doubles

- Doubles give you an extra roll.
- **Three doubles in a row** sends you straight to jail.
- Rolling doubles to leave jail moves you but does **not** give an extra roll.

## Passing SK8

Collect **$200** each time you pass or land on SK8. You do not collect it if you are sent to jail.

## Spaces

| Space | What happens |
| --- | --- |
| **Spot** (no filmer yet) | You may **hire a filmer** for the spot's price, or skip. If you can't afford it, nothing happens. |
| **Spot** (the other player's filmer is there) | Pay them a **clip fee**. |
| **Spot** (your own camera is there) | You may **film a second trick** to upgrade the camera to a film tape (see [Upgrading](#upgrading-camera-to-film-tape)), or skip. |
| **Spot** (your own film tape is there) | Nothing happens. |
| **New Setup** (tax) | Pay the bank the **lower** of 10% of your money or $200. |
| **Chance** | Draw the top Chance card, then play it (see [Chance cards](#chance-cards)). |
| **Skate Trivia** | Card space. Trivia cards are not implemented yet, so nothing happens. |
| **Jail** (just visiting) | Nothing happens. |
| **Free Parking** | Nothing happens. |
| **Go to Jail** | You are sent to Jail. |

A spot with a filmer shows a 3D piece in the owner's colour: a camcorder, or a film tape once upgraded. The space also shows the current clip fee (📹 camera, 📼 tape).

### Clip fee

- A **camera** (the first level, like one house) charges **10% of the spot's price**, rounded to the nearest dollar. For example, a $50 spot charges $5 and X-Games ($400) charges $40.
- A **film tape** (the upgrade, like a hotel) charges **5x** the camera clip fee. For example, that $50 spot charges $25 and X-Games charges $200.

### Upgrading: camera to film tape

When you land on a spot where you already own the camera, you may **film a second trick** there. It costs **50% of the spot's price** and turns the camera into a film tape, which raises the clip fee. Each spot has one camera and, after the upgrade, one tape (no more levels). If you can't afford it, or you skip, the camera stays. Landing on your own tape does nothing.

If a player goes bankrupt, their spots go back to the bank and any tapes are lost with them.

## Chance cards

The 16 Chance cards are shuffled at the start of the game. When you land on a Chance space you draw the top card, read it, then play it. Used cards go to the bottom of the deck, so the deck cycles in the same order. The full list with what each card does is in `src/game/ChanceCards.js`.

How the card types work:

- **Move to a space** (X-Games, SK8, Hirshgarten Skatepark Germany, Gulliver SkatePark Spain, Element Skateboards): you always travel *forward*. If that takes you past SK8 (or onto it), collect $200. X-Games is the exception in practice, since it's ahead of every Chance space. Then you resolve the space you land on, so you can hire a filmer there or pay a clip fee.
- **Nearest skateboard brand** (Element, Plan B, Girl or Zero): move forward to the closest one. If nobody has a filmer there you may hire one. If the other player does, you pay **double** the clip fee (camera or tape).
- **Nearest shop** (Supreme or Tampa Skateshop): move forward to the closest one. If nobody has a filmer there you may hire one. If the other player does, you roll the dice and pay them **10x the total**.
- **Go back 3 spaces:** move backwards 3 and resolve that space. You never collect SK8 salary for going backwards.
- **Go directly to Jail:** no salary, and your turn ends.
- **Get Out of Jail Free:** you keep this card (it leaves the deck while you hold it). While you're in jail you can use it to leave for free, without the $50 fee or rolling doubles. Once used, it goes back into the deck.
- **Money cards:** Bank dividend (+$50), Building loan matures (+$150), Speeding fine (-$15).
- **You lost footage:** pay to reupload every tape: **$25 for each camera** (like a house) and **$100 for each film tape** (like a hotel) that you own. Owning no spots costs nothing.
- **Chairman of the Board:** pay $50 to each other player.

If you roll doubles onto a Chance space you still roll again after playing the card, unless the card sent you to jail.

## Jail

When you start a turn in jail you can:

- **Skate for doubles** (roll the dice). Doubles get you out and you move that many spaces, with no extra roll.
- **Pay $50** before rolling to leave immediately, then roll as normal.
- **Use a Get Out of Jail Free card** (if you hold one) to leave for free.

If you fail to roll doubles 3 times, you automatically pay $50 on the third attempt and move by that roll.

## Bankruptcy and winning

- If you owe more than you have, you pay everything you have to whoever you owe, and you are **bankrupt** and out of the game.
- A bankrupt player's filmers leave, and those spots can be hired again.
- The last player who is not bankrupt **wins**.

## Not yet implemented

- Skate Trivia cards
- Selling or trading a held Get Out of Jail Free card
- Clip-fee bonuses for filming a whole country or brand group
- Selling or trading filmers
- Free Parking payouts
