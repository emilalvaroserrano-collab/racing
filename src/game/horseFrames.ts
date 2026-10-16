// Packed _a sprite rects (12 gallop/idle poses per horse, 3 cols x 4 rows).
// The sheet has no gutters and poses touch, so rects were measured once from
// horse_1_a and reused for all horses (identical layout). Format: [x, y, w, h].
const A: Array<[number, number, number, number]> = [
  [8, 4, 232, 184],
  [264, 4, 284, 188],
  [568, 4, 288, 188],
  [12, 200, 288, 192],
  [324, 200, 284, 200],
  [632, 200, 280, 204],
  [12, 408, 284, 204],
  [320, 408, 280, 208],
  [628, 408, 276, 204],
  [12, 620, 272, 200],
  [308, 620, 276, 200],
  [604, 620, 280, 200],
];

export const HORSE_A_FRAMES: Record<number, Array<[number, number, number, number]>> = {
  1: A,
  2: A,
  3: A,
  4: A,
  5: A,
  6: A,
  7: A,
  8: A,
};

/** Frame used for bet-panel thumbs (extended gallop). */
export const THUMB_FRAME = 4;
