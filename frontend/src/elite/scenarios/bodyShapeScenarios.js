/**
 * Body Shape Elite scenarios.
 *
 * Each scenario:
 *   id, title, instruction
 *   passer:      { pos }                       — z is in [8, 16]; the passer
 *                                                sits behind the aim point
 *                                                (z ≈ 2) so the wide shot has
 *                                                depth from passer → receiver.
 *   playerStart: [x, 0, z]
 *   receivePoint:[x, 0, z]                     — where the ball will arrive
 *   defenders:   [{ pos }]                     — orientation + first-touch scoring
 *   passerCycle: { scanMinMs, scanMaxMs, readyMinMs, readyMaxMs }
 *   passAt:      ms                             — auto-pass timeout if user
 *                                                 never calls for the ball
 *
 * The dynamic wide → tight camera cut lives in the game component. Passers
 * are kept in z ∈ [8, 16] so the wide shot always has both actors on-frame
 * with real footballing depth between them.
 */

export const BODY_SHAPE_SCENARIOS = [
  {
    id: 'half_turn',
    title: 'Half-Turn Receive',
    instruction: 'Wait for the passer to lift his head. Open your body across the pitch as the ball arrives.',
    passer: { pos: [-14, 0, 8] },
    playerStart: [-2, 0, 2],
    receivePoint: [0, 0, 2],
    defenders: [{ pos: [4, 0, 4] }],
    passerCycle: { scanMinMs: 800, scanMaxMs: 1200, readyMinMs: 900, readyMaxMs: 1300 },
    passAt: 3200,
  },
  {
    id: 'back_to_goal',
    title: 'Back to Goal',
    instruction: 'Defender is tight. Turn your shoulder — take your first touch away from the pressure.',
    passer: { pos: [0, 0, 14] },
    playerStart: [0, 0, 0],
    receivePoint: [0, 0, 0],
    defenders: [{ pos: [1, 0, -3] }],
    passerCycle: { scanMinMs: 700, scanMaxMs: 1100, readyMinMs: 900, readyMaxMs: 1200 },
    passAt: 2800,
  },
  {
    id: 'wide_receive',
    title: 'Receive Wide',
    instruction: 'Full-back at your back. Open up down the line and touch into space.',
    passer: { pos: [-14, 0, 10] },
    playerStart: [10, 0, 2],
    receivePoint: [12, 0, 2],
    defenders: [{ pos: [15, 0, 4] }],
    passerCycle: { scanMinMs: 800, scanMaxMs: 1100, readyMinMs: 800, readyMaxMs: 1200 },
    passAt: 3000,
  },
  {
    id: 'drop_between_lines',
    title: 'Between the Lines',
    instruction: 'Drop into the pocket. Read the passer, then open your body toward the free side.',
    passer: { pos: [0, 0, 16] },
    playerStart: [-4, 0, 6],
    receivePoint: [-4, 0, 4],
    defenders: [{ pos: [-6, 0, 0] }, { pos: [0, 0, 6] }],
    passerCycle: { scanMinMs: 700, scanMaxMs: 1000, readyMinMs: 800, readyMaxMs: 1100 },
    passAt: 3100,
  },
  {
    id: 'switch_receive',
    title: 'Receive on the Switch',
    instruction: 'Long ball incoming — set your body so the first touch drives you forward, not sideways.',
    passer: { pos: [-16, 0, 10] },
    playerStart: [12, 0, 6],
    receivePoint: [14, 0, 4],
    defenders: [{ pos: [12, 0, -1] }],
    passerCycle: { scanMinMs: 900, scanMaxMs: 1300, readyMinMs: 900, readyMaxMs: 1400 },
    passAt: 3400,
  },
  {
    id: 'half_space_pocket',
    title: 'Half-Space Pocket',
    instruction: 'Drop into the half-space. Full-back to your back — open shoulder so your first touch cuts inside.',
    passer: { pos: [-14, 0, 12] },
    playerStart: [-6, 0, 4],
    receivePoint: [-4, 0, 2],
    defenders: [{ pos: [-3, 0, -2] }, { pos: [-10, 0, 4] }],
    passerCycle: { scanMinMs: 800, scanMaxMs: 1100, readyMinMs: 900, readyMaxMs: 1200 },
    passAt: 3000,
  },
  {
    id: 'centre_forward_hold',
    title: 'Hold the Line',
    instruction: 'Centre-back is climbing on you. Feel him — arch your body across and set the first touch away from goal.',
    passer: { pos: [0, 0, 12] },
    playerStart: [0, 0, -2],
    receivePoint: [0, 0, -2],
    defenders: [{ pos: [1, 0, -5] }],
    passerCycle: { scanMinMs: 700, scanMaxMs: 1000, readyMinMs: 800, readyMaxMs: 1100 },
    passAt: 2600,
  },
  {
    id: 'ten_receive',
    title: '10 Between the Lines',
    instruction: 'Two midfielders behind you. Show side-on and half-turn — first touch has to be into the open half.',
    passer: { pos: [-2, 0, 14] },
    playerStart: [2, 0, 4],
    receivePoint: [2, 0, 2],
    defenders: [{ pos: [-2, 0, -2] }, { pos: [6, 0, -2] }],
    passerCycle: { scanMinMs: 750, scanMaxMs: 1050, readyMinMs: 850, readyMaxMs: 1150 },
    passAt: 2900,
  },
  {
    id: 'throw_in_receive',
    title: 'Throw-In Receive',
    instruction: 'Wide throw coming in. Full-back is tight — hip him and take your touch down the line.',
    passer: { pos: [16, 0, 10] },
    playerStart: [13, 0, 4],
    receivePoint: [14, 0, 3],
    defenders: [{ pos: [11, 0, 3] }],
    passerCycle: { scanMinMs: 800, scanMaxMs: 1100, readyMinMs: 800, readyMaxMs: 1100 },
    passAt: 2800,
  },
];

export default BODY_SHAPE_SCENARIOS;
