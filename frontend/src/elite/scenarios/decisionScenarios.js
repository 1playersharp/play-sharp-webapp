/**
 * Decision Elite scenarios.
 *
 * Coordinate system (pitch centred on origin):
 *   x: -20 (left sideline) → +20 (right sideline)
 *   z: -30 (north goal)    → +30 (south goal)
 *
 * Each scenario:
 *   id, title, prompt
 *   carrier: { id, pos }                                — player with the ball at start
 *   teammates: [{ id, pos, targetPos?, label? }]        — other red shirts
 *   opponents: [{ id, pos, targetPos?, label? }]        — blue shirts that press in toward carrier
 *   options:   [{ key, label, type, targetId?, to?,
 *                 correct, rationale }]
 *
 * Option types:
 *   'pass'    – ball flies to targetId teammate (arc)
 *   'dribble' – ball carrier advances toward `to` along the ground
 *   'hold'    – ball stays with carrier
 *   'shot'    – ball flies to `to` (typically the goal)
 *
 * Wrong choices end the round with a closest-opponent press/tackle.
 */

export const DECISION_SCENARIOS = [
  {
    id: 'press_from_left',
    title: 'Press from the Left',
    prompt: 'A defender closes fast from your left. Two teammates available — choose the safe outlet.',
    carrier: { id: 'me', pos: [0, 0, 5] },
    teammates: [
      { id: 'lw', label: 'LW', pos: [-13, 0, -2] },
      { id: 'rw', label: 'RW', pos: [12, 0, -1], targetPos: [14, 0, -6] },
      { id: 'cm', label: 'CM', pos: [-3, 0, 14] },
    ],
    opponents: [
      { id: 'd1', pos: [-7, 0, 8], targetPos: [-3, 0, 5] },
      { id: 'd2', pos: [4, 0, 11], targetPos: [2, 0, 7] },
    ],
    options: [
      { key: '1', label: 'Pass Left to LW', type: 'pass', targetId: 'lw', correct: false,
        rationale: 'The defender from the left will cut the lane. The pass is read and intercepted.' },
      { key: '2', label: 'Pass Right to RW', type: 'pass', targetId: 'rw', correct: true,
        rationale: 'RW is moving into a clean channel away from the press — switching play opens the field.' },
      { key: '3', label: 'Dribble Forward', type: 'dribble', to: [0, 0, -2], correct: false,
        rationale: 'Two defenders converge — you lose possession before reaching open space.' },
      { key: '4', label: 'Hold', type: 'hold', correct: false,
        rationale: 'You hesitate. The press arrives and you lose the ball.' },
    ],
  },
  {
    id: 'through_ball_runner',
    title: 'Striker Bending Run',
    prompt: 'The striker bends his run into the channel. The line is high — read it.',
    carrier: { id: 'me', pos: [-4, 0, 10] },
    teammates: [
      { id: 'st', label: 'ST', pos: [-2, 0, -4], targetPos: [-4, 0, -14] },
      { id: 'rw', label: 'RW', pos: [13, 0, 4] },
      { id: 'cm', label: 'CM', pos: [-10, 0, 14] },
    ],
    opponents: [
      { id: 'cb1', pos: [-4, 0, -8], targetPos: [-3, 0, -5] },
      { id: 'cb2', pos: [4, 0, -8], targetPos: [3, 0, -5] },
      { id: 'press', pos: [2, 0, 12], targetPos: [0, 0, 9] },
    ],
    options: [
      { key: '1', label: 'Through Ball to ST', type: 'pass', targetId: 'st', correct: true,
        rationale: 'Striker is onside, bursting between the CBs. A vertical pass splits the line.' },
      { key: '2', label: 'Switch Wide to RW', type: 'pass', targetId: 'rw', correct: false,
        rationale: 'A sideways ball lets the back line reset. The chance is gone.' },
      { key: '3', label: 'Back to CM', type: 'pass', targetId: 'cm', correct: false,
        rationale: 'Recycling possession is safe but kills the moment. Defenders re-organise.' },
      { key: '4', label: 'Hold and Wait', type: 'hold', correct: false,
        rationale: 'The press arrives and you lose the ball before the run develops.' },
    ],
  },
  {
    id: 'overlap_2v1',
    title: 'Overlap — 2 vs 1',
    prompt: 'Your full-back overlaps on the right. Their wing-back has committed inside.',
    carrier: { id: 'me', pos: [10, 0, 4] },
    teammates: [
      { id: 'rb', label: 'RB', pos: [15, 0, 8], targetPos: [16, 0, -4] },
      { id: 'st', label: 'ST', pos: [0, 0, -10] },
    ],
    opponents: [
      { id: 'wb', pos: [10, 0, -4], targetPos: [9, 0, 0] },
      { id: 'cb', pos: [2, 0, -10] },
    ],
    options: [
      { key: '1', label: 'Slip Pass to Overlap', type: 'pass', targetId: 'rb', correct: true,
        rationale: 'The full-back arrives in space behind the wing-back — classic 2v1 finish.' },
      { key: '2', label: 'Pass Inside to ST', type: 'pass', targetId: 'st', correct: false,
        rationale: 'The CB reads it and steps across. The striker is outnumbered.' },
      { key: '3', label: 'Dribble Inside', type: 'dribble', to: [4, 0, -2], correct: false,
        rationale: 'You cut inside into traffic. The wing-back recovers and dispossesses you.' },
      { key: '4', label: 'Cross Now', type: 'shot', to: [0, 0, -28], correct: false,
        rationale: 'Crossing from this angle is easy for the keeper to claim.' },
    ],
  },
  {
    id: 'press_escape',
    title: 'High Press Escape',
    prompt: 'Two pressers are on you. Find the free man fast.',
    carrier: { id: 'me', pos: [0, 0, 18] },
    teammates: [
      { id: 'lb', label: 'LB', pos: [-15, 0, 16] },
      { id: 'cm', label: 'CM', pos: [0, 0, 6], targetPos: [0, 0, 4] },
      { id: 'rw', label: 'RW', pos: [16, 0, -6] },
    ],
    opponents: [
      { id: 'p1', pos: [-4, 0, 22], targetPos: [-2, 0, 20] },
      { id: 'p2', pos: [4, 0, 22], targetPos: [2, 0, 20] },
      { id: 'mid', pos: [0, 0, 10] },
    ],
    options: [
      { key: '1', label: 'Long Switch to RW', type: 'pass', targetId: 'rw', correct: true,
        rationale: 'RW is wide open on the far side. The switch beats the press and opens the pitch.' },
      { key: '2', label: 'Short to CM', type: 'pass', targetId: 'cm', correct: false,
        rationale: 'CM is covered by the midfielder behind. The pass is intercepted.' },
      { key: '3', label: 'Short to LB', type: 'pass', targetId: 'lb', correct: false,
        rationale: 'LB is closer to the pressers — they shift across and trap him on the touchline.' },
      { key: '4', label: 'Hold the Ball', type: 'hold', correct: false,
        rationale: 'Both pressers reach you and tackle. Possession lost.' },
    ],
  },
  {
    id: 'wing_byline',
    title: 'Byline Decision',
    prompt: 'You are at the byline. Three runners ahead — pick your delivery.',
    carrier: { id: 'me', pos: [16, 0, -18] },
    teammates: [
      { id: 'near', label: 'NP', pos: [4, 0, -22], targetPos: [4, 0, -24] },
      { id: 'spot', label: 'PS', pos: [0, 0, -18] },
      { id: 'far', label: 'FP', pos: [-5, 0, -22] },
    ],
    opponents: [
      { id: 'fb', pos: [14, 0, -19], targetPos: [16, 0, -22] },
      { id: 'cb1', pos: [3, 0, -22] },
      { id: 'cb2', pos: [-3, 0, -22] },
    ],
    options: [
      { key: '1', label: 'Whip Near Post', type: 'pass', targetId: 'near', correct: true,
        rationale: 'Near-post delivery from this angle is the hardest ball for the keeper to claim.' },
      { key: '2', label: 'Cut Back to Spot', type: 'pass', targetId: 'spot', correct: false,
        rationale: 'CBs are central and the keeper claims a slow cut-back from this angle.' },
      { key: '3', label: 'Float to Far Post', type: 'pass', targetId: 'far', correct: false,
        rationale: 'A long flighted ball gives the keeper time to come and claim.' },
      { key: '4', label: 'Hold and Recycle', type: 'hold', correct: false,
        rationale: 'You delay. The full-back recovers, doubles up, and forces you back.' },
    ],
  },
  {
    id: 'counter_break',
    title: 'Counter Attack',
    prompt: 'You have won the ball at halfway. The pitch is open — choose your move.',
    carrier: { id: 'me', pos: [-4, 0, 2] },
    teammates: [
      { id: 'st', label: 'ST', pos: [4, 0, -10], targetPos: [6, 0, -18] },
      { id: 'am', label: 'AM', pos: [-8, 0, -4] },
    ],
    opponents: [
      { id: 'chase', pos: [-6, 0, 6], targetPos: [-5, 0, 4] },
      { id: 'cb', pos: [-2, 0, -22] },
    ],
    options: [
      { key: '1', label: 'Through Ball to ST', type: 'pass', targetId: 'st', correct: true,
        rationale: 'Striker is breaking into open space — a sharp vertical pass starts the counter.' },
      { key: '2', label: 'Pass to AM', type: 'pass', targetId: 'am', correct: false,
        rationale: 'AM is marked and the chasing midfielder closes the angle.' },
      { key: '3', label: 'Dribble Forward', type: 'dribble', to: [-4, 0, -10], correct: false,
        rationale: 'You hold the ball too long. The chaser catches up and dispossesses you.' },
      { key: '4', label: 'Hold and Wait', type: 'hold', correct: false,
        rationale: 'You waste a 3v2 break. The defence recovers and resets.' },
    ],
  },
];

export default DECISION_SCENARIOS;