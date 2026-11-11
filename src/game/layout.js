// Where each board space sits inside the square board, as fractions (0-1)
// of its width/height. Mirrors the CSS grid in App.css: 11 tracks per side,
// the two corner tracks being 1.4fr and the nine middle tracks 1fr.
const CORNER = 1.4;
const TOTAL = CORNER * 2 + 9;

const trackCenter = (k) => {
  if (k === 0) return CORNER / 2 / TOTAL;
  if (k === 10) return (CORNER + 9 + CORNER / 2) / TOTAL;
  return (CORNER + (k - 1) + 0.5) / TOTAL;
};

// Space 0 is the top-left corner; the path runs right along the top, down the
// right side, left along the bottom and up the left side.
function cellTrack(index) {
  if (index <= 10) return { col: index, row: 0 };
  if (index <= 20) return { col: 10, row: index - 10 };
  if (index <= 30) return { col: 10 - (index - 20), row: 10 };
  return { col: 0, row: 10 - (index - 30) };
}

export function cellCenter(index) {
  const { col, row } = cellTrack(index);
  return { x: trackCenter(col), y: trackCenter(row) };
}

// Just inside the top edge of a space (over its coloured band), centred.
export function cellTopEdge(index) {
  const { col, row } = cellTrack(index);
  const rowSize = row === 0 || row === 10 ? CORNER : 1;
  return { x: trackCenter(col), y: trackCenter(row) - rowSize / 2 / TOTAL + 0.03 };
}
