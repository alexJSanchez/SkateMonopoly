import React, { useState } from "react";
import BoardSpaces from "../game/BoardSpaces.jsx";

export default function Board() {
  // Set the current positions for both players
  const [playerOneCurrentPosition, setPlayerOneCurrentPosition] = useState(0);
  const [playerTwoCurrentPosition, setPlayerTwoCurrentPosition] = useState(0);
  // Sets the each players hand
  const [playerOneHand, setPlayerOneHand] = useState({
    space: playerOneCurrentPosition,
    money: 0,
    properties: [],
  });
  const [playerTwoHand, setPlayerTwoHand] = useState({
    space: playerTwoCurrentPosition,
    money: 0,
    properties: [],
  });
  // 1 for player one, 2 for player two
  const [currentPlayer, setCurrentPlayer] = useState(1);

  // Total spaces on the board
  const totalSpaces = 40;

  // Function to move the piece when the button is clicked
  const movePiece = () => {
    // Generate a random number between 1 and 6
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    console.log(diceRoll);

    if (currentPlayer === 1) {
      setPlayerOneCurrentPosition((prevPosition) => {
        const newPosition = (prevPosition + diceRoll) % totalSpaces;
        setPlayerOneHand({ ...playerOneHand, space: newPosition });
        return newPosition >= 40 ? newPosition - 40 : newPosition; // Reset to 0 if it reaches 39
      });
      setCurrentPlayer(2); // Switch to player two
    } else {
      setPlayerTwoCurrentPosition((prevPosition) => {
        const newPosition = (prevPosition + diceRoll) % totalSpaces;
        setPlayerTwoHand({ ...playerTwoHand, space: newPosition });
        return newPosition >= 40 ? newPosition - 40 : newPosition; // Reset to 0 if it reaches 39
      });
      setCurrentPlayer(1); // Switch to player one
    }

    console.log(`Player ${currentPlayer} rolled a ${diceRoll}`); // Optional: Log the dice roll
  };

  return (
    <div>
      <div className="board">
        {/* <!-- Top Row --> */}
        <div className="space corner go">SK8</div>
        <div className="space property">
          <div className="property-name">
            <p>Venice Beach USA</p>
            <p>price $50</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skate Trivia</p>
            <p>Pick Up Card</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Burnside</p>
            <p>Price $50</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>New Setup</p>
            <p>Pay 10% or $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Element Skateboards</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Shaw Millenium Canada</p>
            <p>Price $100</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Chance Card</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Big O Canada</p>
            <p>Price $100</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Downtown Plaza Canada</p>
            <p>Price $120</p>
          </div>
        </div>
        <div className="space corner jail">Jail</div>
        {/* <!-- Right Column --> */}
        <div className="space property">
          <div className="property-name">
            <p>Gulliver SkatePark Spain</p>
            <p>Price $140</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Supreme</p>
            <p>Price $150</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Macba Spain</p>
            <p>Price $140</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skatepark Church Spain</p>
            <p>Price $160</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Plan B Skateboards</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Guangzhou China</p>
            <p>Price $180</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skate Trivia</p>
            <p>Pick Up Card</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Lai Chi China</p>
            <p>Price $180</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Red Ribbon China</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space corner free-parking">Free Parking</div>
        {/* <!-- Bottom Row (reversed) --> */}
        <div className="space property">
          <div className="property-name">
            <p>North Brigade Germany</p>
            <p>Price $220</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Chance</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skatehalle Germany</p>
            <p>Price $220</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Hirshgarten Skatepark Germany</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Girl Skateboards</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Nike Tempo Mexico</p>
            <p>Price $250</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>La Duna Mexico</p>
            <p>Price $250</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Tampa Skateshop</p>
            <p>Price $120</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>La Mexicana Mexico</p>
            <p>Price $280</p>
          </div>
        </div>
        <div className="space corner go-to-jail">Go to Jail</div>
        {/* <!-- Left Column (reversed) --> */}
        <div className="space property">
          <div className="property-name">
            <p>USU Skatepark Africa</p>
            <p>Price $300</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Shangalla Skatepark Africa</p>
            <p>Price $300</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skatepark Trivia</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Kgali Skatepark Africa</p>
            <p>Price $320</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Zero Skateboards</p>
            <p>Price $200</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Chance</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Street Leauge</p>
            <p>Price $350</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>Skate Shoes</p>
            <p>Price $75</p>
          </div>
        </div>
        <div className="space property">
          <div className="property-name">
            <p>x-Games</p>
            <p>Price $400</p>
          </div>
        </div>
        {/* Game Piece */}
        <h2 className="player-turn">Your turn player{currentPlayer}</h2>
        {/* Game Pieces */}
        <div
          id="playerOne"
          className={`game-piece position-${playerOneCurrentPosition}`}
        >
          🏃‍♂️
        </div>
        <div
          id="playerTwo"
          className={`game-piece-2 position-${playerTwoCurrentPosition}`}
        >
          🏃‍♂️
        </div>

        {/* Player Buttons to Move */}
        {currentPlayer === 1 ? (
          <div className="player-one-action">
            <button onClick={movePiece}>Move</button>
          </div>
        ) : (
          <div className="player-two-action">
            <button onClick={movePiece}>Move</button>
          </div>
        )}

        {/*player one cards*/}
        <div className="playerOne-status">
          <h2>Player One Status</h2>
          <p>{BoardSpaces[playerOneCurrentPosition].name}</p>
          <p>{playerOneHand.money}</p>
          <p>{playerOneHand.properties}</p>
        </div>
        {/*player two cards*/}
        <div className="playerTwo-status">
          <h2>Player Two Status</h2>
          <p>{BoardSpaces[playerTwoCurrentPosition].name}</p>
          <p>{playerTwoHand.money}</p>
          <p>{playerTwoHand.properties}</p>
        </div>
      </div>
    </div>
  );
}
