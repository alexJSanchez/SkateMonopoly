// group colours the top band of a property (see App.css .group-*)
// type: "corner" | "property" | "trivia" | "chance" | "tax"
const boardSpaces = [
  // ===== Corner: Start (space 0) =====
  { name: "SK8", type: "corner", corner: "go" },

  // ===== Top row: left to right (spaces 1-9) =====
  { name: "Venice Beach USA", type: "property", price: 50, group: "usa" },
  { name: "Skate Trivia", type: "trivia" },
  { name: "Fantasy Factory", type: "property", price: 50, group: "usa" },
  { name: "New Setup", type: "tax", tax: 200 },
  { name: "Element Skateboards", type: "property", price: 200, group: "brand" },
  {
    name: "Shaw Millennium Canada",
    type: "property",
    price: 100,
    group: "canada",
  },
  { name: "Chance", type: "chance" },
  { name: "Big O Canada", type: "property", price: 100, group: "canada" },
  {
    name: "Downtown Plaza Canada",
    type: "property",
    price: 120,
    group: "canada",
  },

  // ===== Corner: Jail / just visiting (space 10) =====
  { name: "Jail", type: "corner", corner: "jail" },

  // ===== Right column: top to bottom (spaces 11-19) =====
  {
    name: "Gulliver SkatePark Spain",
    type: "property",
    price: 140,
    group: "spain",
  },
  { name: "Supreme", type: "property", price: 150, group: "brand" },
  { name: "Macba Spain", type: "property", price: 140, group: "spain" },
  {
    name: "Skatepark Church Spain",
    type: "property",
    price: 160,
    group: "spain",
  },
  { name: "Plan B Skateboards", type: "property", price: 200, group: "brand" },
  { name: "Guangzhou China", type: "property", price: 180, group: "china" },
  { name: "Skate Trivia", type: "trivia" },
  { name: "Lai Chi China", type: "property", price: 180, group: "china" },
  { name: "Red Ribbon China", type: "property", price: 200, group: "china" },

  // ===== Corner: Free Parking (space 20) =====
  { name: "Street Session", type: "corner", corner: "free-parking" },

  // ===== Bottom row: right to left (spaces 21-29) =====
  {
    name: "North Brigade Germany",
    type: "property",
    price: 220,
    group: "germany",
  },
  { name: "Chance", type: "chance" },
  {
    name: "Skatehalle Germany",
    type: "property",
    price: 220,
    group: "germany",
  },
  {
    name: "Hirshgarten Skatepark Germany",
    type: "property",
    price: 200,
    group: "germany",
  },
  { name: "Girl Skateboards", type: "property", price: 200, group: "brand" },
  { name: "Nike Tempo Mexico", type: "property", price: 250, group: "mexico" },
  { name: "La Duna Mexico", type: "property", price: 250, group: "mexico" },
  { name: "Tampa Skateshop", type: "property", price: 120, group: "other" },
  { name: "La Mexicana Mexico", type: "property", price: 280, group: "mexico" },

  // ===== Corner: Go to Jail (space 30) =====
  { name: "Go to Jail", type: "corner", corner: "go-to-jail" },

  // ===== Left column: bottom to top (spaces 31-39) =====
  {
    name: "USU Skatepark Africa",
    type: "property",
    price: 300,
    group: "africa",
  },
  {
    name: "Shangalla Skatepark Africa",
    type: "property",
    price: 300,
    group: "africa",
  },
  { name: "Skate Trivia", type: "trivia" },
  {
    name: "Kgali Skatepark Africa",
    type: "property",
    price: 320,
    group: "africa",
  },
  { name: "Zero Skateboards", type: "property", price: 200, group: "brand" },
  { name: "Chance", type: "chance" },
  { name: "Street League", type: "property", price: 350, group: "other" },
  { name: "Skate Shoes", type: "property", price: 75, group: "other" },
  { name: "X-Games", type: "property", price: 400, group: "other" },
];

export default boardSpaces;
