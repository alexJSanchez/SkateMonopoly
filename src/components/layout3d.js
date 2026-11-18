// Geometry of the 3D board, in world units (board centred on the origin).
import boardSpaces from "../game/BoardSpaces";

export const SIZE = 22; // world units across the ring of tiles
export const CORNER = 1.4;
export const TRACKS = [CORNER, ...Array(9).fill(1), CORNER];
export const TOTAL = TRACKS.reduce((a, b) => a + b, 0);
export const UNIT = SIZE / TOTAL;
export const STARTS = TRACKS.map((_, k) => TRACKS.slice(0, k).reduce((a, b) => a + b, 0));

export const TILE_H = 0.16; // property tiles
export const CORNER_H = 0.3; // corner tiles stand a little taller
export const tileHeight = (index) => (boardSpaces[index].type === "corner" ? CORNER_H : TILE_H);

// Same path as layout.js: top row left to right, down the right, back along the bottom, up the left.
export function track(index) {
  if (index <= 10) return { col: index, row: 0 };
  if (index <= 20) return { col: 10, row: index - 10 };
  if (index <= 30) return { col: 10 - (index - 20), row: 10 };
  return { col: 0, row: 10 - (index - 30) };
}

// Position and size of a space in world units.
export function spaceRect(index) {
  const { col, row } = track(index);
  return {
    x: (STARTS[col] + TRACKS[col] / 2) * UNIT - SIZE / 2,
    z: (STARTS[row] + TRACKS[row] / 2) * UNIT - SIZE / 2,
    w: TRACKS[col] * UNIT,
    d: TRACKS[row] * UNIT,
    row,
    col,
  };
}

// The y-rotation that makes a model facing +x travel the way the ring runs
// from this space: +x along the top, +z down the right, -x along the bottom, -z up the left.
export function headingFor(index) {
  const side = Math.floor((index % 40) / 10);
  return [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
}
