/**
 * Striker Elite scenarios.
 *
 * Coordinates: north goal is at z = -30. All action happens in the north box.
 *
 * Each scenario:
 *   id, title, instruction
 *   serviceType:   'throughBall' | 'cutback' | 'cross' | 'layoff'
 *   passer:        { pos }
 *   strikerStart:  [x, 0, z]                     — where the striker starts / receives
 *   strikerReceive:[x, 0, z]                     — where the ball arrives to the striker
 *   keeper:        { pos: [x, 0, z] }            — GK position (drives which goal corner is open)
 *   defenders:     [{ pos }]                     — optional last-defender pressure
 *   offerChip:     bool                          — include the chip target (keeper off line)
 *   timingWindowMs:number                        — best moment to shoot after reception
 */

export const STRIKER_SCENARIOS = [
  {
    id: 'through_ball_1v1',
    title: 'Through Ball — 1v1',
    instruction: 'Split the defence, take one touch, then finish where the keeper is not.',
    serviceType: 'throughBall',
    passer: { pos: [0, 0, -8] },
    strikerStart: [-3, 0, -14],
    strikerReceive: [-1, 0, -22],
    keeper: { pos: [-0.6, 0.9, -27] },
    defenders: [{ pos: [2, 0, -20] }],
    offerChip: true,
    timingWindowMs: 900,
  },
  {
    id: 'cutback_penalty_spot',
    title: 'Cutback to the Spot',
    instruction: 'Winger cuts it back — first-time finish. The keeper is committing to the near post.',
    serviceType: 'cutback',
    passer: { pos: [10, 0, -28] },
    strikerStart: [-1, 0, -20],
    strikerReceive: [0, 0, -22],
    keeper: { pos: [2.5, 0.9, -30] },
    defenders: [{ pos: [-3, 0, -25] }],
    offerChip: false,
    timingWindowMs: 700,
  },
  {
    id: 'floated_cross',
    title: 'Floated Cross',
    instruction: 'Meet the ball at the far post. Keeper is stranded on the near.',
    serviceType: 'cross',
    passer: { pos: [-14, 0, -22] },
    strikerStart: [4, 0, -22],
    strikerReceive: [3, 0, -25],
    keeper: { pos: [-2.4, 0.9, -30] },
    defenders: [{ pos: [-1, 0, -26] }],
    offerChip: false,
    timingWindowMs: 800,
  },
  {
    id: 'layoff_edge',
    title: 'Lay-off at the Edge',
    instruction: 'Teammate rolls it back — power a placed finish across the keeper.',
    serviceType: 'layoff',
    passer: { pos: [-2, 0, -18] },
    strikerStart: [1, 0, -17],
    strikerReceive: [1, 0, -18],
    keeper: { pos: [-1.2, 0.9, -30] },
    defenders: [],
    offerChip: false,
    timingWindowMs: 900,
  },
  {
    id: 'through_wide_angle',
    title: 'Through — Wide Angle',
    instruction: 'You break in from the right. Keeper narrows the angle — pick the far corner.',
    serviceType: 'throughBall',
    passer: { pos: [-4, 0, -6] },
    strikerStart: [6, 0, -18] ,
    strikerReceive: [4, 0, -24],
    keeper: { pos: [1.4, 0.9, -30] },
    defenders: [{ pos: [-1, 0, -25] }],
    offerChip: false,
    timingWindowMs: 850,
  },
];

export default STRIKER_SCENARIOS;