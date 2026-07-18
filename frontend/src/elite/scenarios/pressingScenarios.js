/**
 * Pressing Elite scenarios.
 *
 * Each scenario:
 *   id, title
 *   opponents: [{ id, pos }]           — 3..5 opposition player-models cycling the ball
 *   passSequence: [[fromIdx, toIdx]]   — order of passes (indices into opponents)
 *   pressers:   [{ id, pos }]          — 4 pressing teammates (always 4)
 *   targetPassIndex: number            — which pass in the sequence is the press window
 *   targetPresserIndex: number         — which presser is highlighted at the window
 *   passDurationMs: number             — speed of each pass; lower = harder
 *   pressToleranceMs: number           — total window width around the optimal moment
 */

export const PRESSING_SCENARIOS = [
  {
    id: 'round_1',
    title: 'Build-up Trap',
    opponents: [
      { id: 'cb1', pos: [-6, 0, 14] },
      { id: 'cb2', pos: [6, 0, 14] },
      { id: 'gk',  pos: [0, 0, 22] },
    ],
    passSequence: [
      [0, 2], [2, 1], [1, 0], [0, 2], [2, 1],
    ],
    pressers: [
      { id: 'p1', pos: [-8, 0, 4] },
      { id: 'p2', pos: [8, 0, 4] },
      { id: 'p3', pos: [-3, 0, 0] },
      { id: 'p4', pos: [3, 0, 0] },
    ],
    targetPassIndex: 2,
    targetPresserIndex: 0,
    passDurationMs: 1100,
    pressToleranceMs: 1200,
  },
  {
    id: 'round_2',
    title: 'Side Switch',
    opponents: [
      { id: 'lb', pos: [-14, 0, 6] },
      { id: 'cb', pos: [0, 0, 14] },
      { id: 'rb', pos: [14, 0, 6] },
      { id: 'cm', pos: [0, 0, 4] },
    ],
    passSequence: [
      [0, 1], [1, 2], [2, 3], [3, 0], [0, 1],
    ],
    pressers: [
      { id: 'p1', pos: [-10, 0, -2] },
      { id: 'p2', pos: [10, 0, -2] },
      { id: 'p3', pos: [-2, 0, 0] },
      { id: 'p4', pos: [2, 0, 0] },
    ],
    targetPassIndex: 1,
    targetPresserIndex: 1,
    passDurationMs: 1000,
    pressToleranceMs: 1100,
  },
  {
    id: 'round_3',
    title: 'Pivot Bait',
    opponents: [
      { id: 'lb', pos: [-12, 0, 8] },
      { id: 'pivot', pos: [0, 0, 10] },
      { id: 'rb', pos: [12, 0, 8] },
      { id: 'lcm', pos: [-4, 0, 2] },
      { id: 'rcm', pos: [4, 0, 2] },
    ],
    passSequence: [
      [0, 1], [1, 4], [4, 2], [2, 1], [1, 3], [3, 0],
    ],
    pressers: [
      { id: 'p1', pos: [-8, 0, -2] },
      { id: 'p2', pos: [8, 0, -2] },
      { id: 'p3', pos: [-1, 0, 0] },
      { id: 'p4', pos: [3, 0, 0] },
    ],
    targetPassIndex: 2,
    targetPresserIndex: 1,
    passDurationMs: 950,
    pressToleranceMs: 1000,
  },
  {
    id: 'round_4',
    title: 'Triangle Rotation',
    opponents: [
      { id: 'cb1', pos: [-7, 0, 14] },
      { id: 'cb2', pos: [7, 0, 14] },
      { id: 'pivot', pos: [0, 0, 6] },
      { id: 'gk', pos: [0, 0, 22] },
    ],
    passSequence: [
      [3, 0], [0, 2], [2, 1], [1, 3], [3, 0], [0, 2],
    ],
    pressers: [
      { id: 'p1', pos: [-8, 0, -2] },
      { id: 'p2', pos: [8, 0, -2] },
      { id: 'p3', pos: [-2, 0, 1] },
      { id: 'p4', pos: [2, 0, 1] },
    ],
    targetPassIndex: 3,
    targetPresserIndex: 3,
    passDurationMs: 900,
    pressToleranceMs: 950,
  },
  {
    id: 'round_5',
    title: 'Forced Switch',
    opponents: [
      { id: 'lb', pos: [-13, 0, 4] },
      { id: 'lcb', pos: [-5, 0, 12] },
      { id: 'rcb', pos: [5, 0, 12] },
      { id: 'rb', pos: [13, 0, 4] },
      { id: 'pivot', pos: [0, 0, 6] },
    ],
    passSequence: [
      [0, 1], [1, 4], [4, 2], [2, 3], [3, 2], [2, 4],
    ],
    pressers: [
      { id: 'p1', pos: [-10, 0, -2] },
      { id: 'p2', pos: [10, 0, -2] },
      { id: 'p3', pos: [-2, 0, 0] },
      { id: 'p4', pos: [2, 0, 0] },
    ],
    targetPassIndex: 3,
    targetPresserIndex: 1,
    passDurationMs: 850,
    pressToleranceMs: 900,
  },
  {
    id: 'round_6',
    title: 'Quick Rotation',
    opponents: [
      { id: 'cb1', pos: [-6, 0, 14] },
      { id: 'cb2', pos: [6, 0, 14] },
      { id: 'pivot', pos: [0, 0, 6] },
      { id: 'gk', pos: [0, 0, 22] },
    ],
    passSequence: [
      [3, 0], [0, 2], [2, 1], [1, 2], [2, 0], [0, 3],
    ],
    pressers: [
      { id: 'p1', pos: [-8, 0, 0] },
      { id: 'p2', pos: [8, 0, 0] },
      { id: 'p3', pos: [-2, 0, 1] },
      { id: 'p4', pos: [2, 0, 1] },
    ],
    targetPassIndex: 4,
    targetPresserIndex: 0,
    passDurationMs: 800,
    pressToleranceMs: 850,
  },
  {
    id: 'round_7',
    title: 'Press the Half-Space',
    opponents: [
      { id: 'lb', pos: [-12, 0, 6] },
      { id: 'lcb', pos: [-5, 0, 14] },
      { id: 'rcb', pos: [5, 0, 14] },
      { id: 'rb', pos: [12, 0, 6] },
      { id: 'pivot', pos: [0, 0, 4] },
    ],
    passSequence: [
      [1, 4], [4, 3], [3, 4], [4, 0], [0, 1], [1, 2],
    ],
    pressers: [
      { id: 'p1', pos: [-9, 0, 0] },
      { id: 'p2', pos: [9, 0, 0] },
      { id: 'p3', pos: [-2, 0, 0] },
      { id: 'p4', pos: [2, 0, 0] },
    ],
    targetPassIndex: 5,
    targetPresserIndex: 2,
    passDurationMs: 760,
    pressToleranceMs: 820,
  },
  {
    id: 'round_8',
    title: 'Final Trigger',
    opponents: [
      { id: 'lb', pos: [-13, 0, 4] },
      { id: 'lcb', pos: [-6, 0, 14] },
      { id: 'cb', pos: [0, 0, 16] },
      { id: 'rcb', pos: [6, 0, 14] },
      { id: 'rb', pos: [13, 0, 4] },
    ],
    passSequence: [
      [2, 1], [1, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 3],
    ],
    pressers: [
      { id: 'p1', pos: [-9, 0, -1] },
      { id: 'p2', pos: [9, 0, -1] },
      { id: 'p3', pos: [-3, 0, 0] },
      { id: 'p4', pos: [3, 0, 0] },
    ],
    targetPassIndex: 4,
    targetPresserIndex: 1,
    passDurationMs: 700,
    pressToleranceMs: 780,
  },
];

export default PRESSING_SCENARIOS;