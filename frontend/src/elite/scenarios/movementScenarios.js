/**
 * Movement Elite scenarios — click-only rondo flow.
 *
 * Round structure (fixed template):
 *   1. moveIn      — YOU click one of step1Zones and auto-run there
 *   2. receive1    — passer plays it into you (auto)
 *   3. passBack    — passer relocates to a RANDOM entry from passerRelocations,
 *                    decoy teammates also stand up. YOU click a receiver.
 *                    Correct receiver = the passer at their new spot (wall pass).
 *   4. passing1    — ball arcs to the chosen receiver (auto). Passer then plays
 *                    it into space for your breakout run.
 *   5. moveOut     — YOU click one of step3Zones. The "correct" step3 zone is
 *                    dictated by which relocation was picked (each relocation
 *                    pairs to a breakoutCorrectId).
 *   6. receive2    — ball arrives at your feet, round ends.
 *
 * Each pass-back relocation carries a paired breakoutCorrectId so the "right"
 * breakout space actually changes with the randomised relocation, keeping the
 * decision real rather than memorised.
 */

export const MOVEMENT_SCENARIOS = [
  {
    id: 'wall_pass_left',
    title: 'Wall Pass — Left Channel',
    instruction: 'Show for the ball. Return it. Then explode into the space the passer opens up.',
    passer: { pos: [-14, 0, 10], label: 'CM' },
    playerStart: [4, 0, 4],
    step1Zones: [
      { id: 'A', pos: [-2, 0, 4], size: 2.2, correct: true },
      { id: 'B', pos: [10, 0, 4], size: 2.2, correct: false },
      { id: 'C', pos: [-6, 0, 12], size: 2.2, correct: false },
    ],
    passerRelocations: [
      { id: 'drift-wide', pos: [-16, 0, 4], breakoutCorrectId: 'A' },
      { id: 'drop-deep', pos: [-12, 0, 16], breakoutCorrectId: 'B' },
      { id: 'push-up',   pos: [-8, 0, -2], breakoutCorrectId: 'C' },
    ],
    decoys: [
      { id: 't2', label: 'RW', pos: [12, 0, -4] },
      { id: 't3', label: 'ST', pos: [0, 0, -12] },
    ],
    step3Zones: [
      { id: 'A', pos: [-10, 0, -6], size: 2.2 },   // opens if passer went wide
      { id: 'B', pos: [-2, 0, -8], size: 2.2 },    // opens if passer dropped
      { id: 'C', pos: [4, 0, -10], size: 2.2 },    // opens if passer pushed up
    ],
    opposition: [
      { label: 'CB', pos: [-4, 0, -2] },   // covers central zone B/C at step 3
      { label: 'RB', pos: [10, 0, 0] },    // presses zone B at step 1
      { label: 'CM', pos: [-4, 0, 10] },   // shadow on wrong zone C at step 1
    ],
  },
  {
    id: 'central_combo',
    title: 'Central Combination',
    instruction: 'Drop into the pocket, wall pass, then attack the line.',
    passer: { pos: [0, 0, 14], label: 'AM' },
    playerStart: [-4, 0, 4],
    step1Zones: [
      { id: 'A', pos: [-2, 0, 2], size: 2.2, correct: true },
      { id: 'B', pos: [8, 0, 6], size: 2.2, correct: false },
      { id: 'C', pos: [-10, 0, 8], size: 2.2, correct: false },
    ],
    passerRelocations: [
      { id: 'shift-right', pos: [6, 0, 10], breakoutCorrectId: 'C' },
      { id: 'stay-central', pos: [-2, 0, 12], breakoutCorrectId: 'A' },
      { id: 'shift-left',  pos: [-8, 0, 10], breakoutCorrectId: 'B' },
    ],
    decoys: [
      { id: 't2', label: 'LW', pos: [-14, 0, 0] },
      { id: 't3', label: 'RW', pos: [14, 0, 0] },
    ],
    step3Zones: [
      { id: 'A', pos: [-2, 0, -8], size: 2.2 },
      { id: 'B', pos: [-10, 0, -6], size: 2.2 },
      { id: 'C', pos: [8, 0, -6], size: 2.2 },
    ],
    opposition: [
      { label: 'CB', pos: [0, 0, -2] },     // central defender squeezing pocket
      { label: 'CM', pos: [-4, 0, 8] },     // deep midfielder covering back
      { label: 'RB', pos: [10, 0, 2] },     // wide press on zone B step 1
      { label: 'CM', pos: [-10, 0, 4] },    // shadow on zone C step 1
    ],
  },
  {
    id: 'right_flank_switch',
    title: 'Right Flank Switch',
    instruction: 'Receive tight, bounce it back, then burst into the switch.',
    passer: { pos: [12, 0, 10], label: 'RW' },
    playerStart: [2, 0, 4],
    step1Zones: [
      { id: 'A', pos: [6, 0, 4], size: 2.2, correct: true },
      { id: 'B', pos: [-6, 0, 4], size: 2.2, correct: false },
      { id: 'C', pos: [8, 0, 14], size: 2.2, correct: false },
    ],
    passerRelocations: [
      { id: 'wide-run', pos: [16, 0, 2], breakoutCorrectId: 'A' },
      { id: 'inside-drift', pos: [8, 0, 6], breakoutCorrectId: 'B' },
      { id: 'deep-recycle', pos: [10, 0, 14], breakoutCorrectId: 'C' },
    ],
    decoys: [
      { id: 't2', label: 'CM', pos: [-4, 0, 12] },
      { id: 't3', label: 'ST', pos: [2, 0, -10] },
    ],
    step3Zones: [
      { id: 'A', pos: [12, 0, -4], size: 2.2 },
      { id: 'B', pos: [-2, 0, -4], size: 2.2 },
      { id: 'C', pos: [4, 0, -8], size: 2.2 },
    ],
    opposition: [
      { label: 'LB', pos: [-4, 0, 4] },     // presses zone B step 1
      { label: 'CM', pos: [6, 0, 12] },     // shadow on deep zone C step 1
      { label: 'CB', pos: [4, 0, -6] },     // central cover for breakout
    ],
  },
  {
    id: 'press_escape',
    title: 'Press Escape',
    instruction: 'Under pressure — first pass safe, second pass sharp.',
    passer: { pos: [-6, 0, 18], label: 'CB' },
    playerStart: [0, 0, 10],
    step1Zones: [
      { id: 'A', pos: [-2, 0, 6], size: 2.2, correct: true },
      { id: 'B', pos: [10, 0, 8], size: 2.2, correct: false },
      { id: 'C', pos: [-12, 0, 8], size: 2.2, correct: false },
    ],
    passerRelocations: [
      { id: 'split-lines', pos: [0, 0, 6], breakoutCorrectId: 'A' },
      { id: 'wide-support', pos: [-14, 0, 12], breakoutCorrectId: 'C' },
      { id: 'push-forward', pos: [-4, 0, -2], breakoutCorrectId: 'B' },
    ],
    decoys: [
      { id: 't2', label: 'LB', pos: [-16, 0, 4] },
      { id: 't3', label: 'RM', pos: [12, 0, 2] },
    ],
    step3Zones: [
      { id: 'A', pos: [-6, 0, -4], size: 2.2 },
      { id: 'B', pos: [4, 0, -8], size: 2.2 },
      { id: 'C', pos: [-14, 0, -2], size: 2.2 },
    ],
    opposition: [
      { label: 'ST', pos: [4, 0, 12] },     // first presser
      { label: 'AM', pos: [-2, 0, 14] },    // second presser on the CB
      { label: 'CM', pos: [8, 0, 6] },      // covers zone B step 1
      { label: 'CM', pos: [-10, 0, 4] },    // covers zone C step 1
      { label: 'CB', pos: [0, 0, -6] },     // last line
    ],
  },
  {
    id: 'final_third',
    title: 'Final Third',
    instruction: 'Tight zone, tight window. Read the space, return, and finish the pattern.',
    passer: { pos: [0, 0, 4], label: 'CM' },
    playerStart: [4, 0, -2],
    step1Zones: [
      { id: 'A', pos: [2, 0, -4], size: 2.0, correct: true },
      { id: 'B', pos: [-6, 0, -4], size: 2.0, correct: false },
      { id: 'C', pos: [10, 0, 0], size: 2.0, correct: false },
    ],
    passerRelocations: [
      { id: 'run-in-behind', pos: [-4, 0, -10], breakoutCorrectId: 'B' },
      { id: 'stay-outside-box', pos: [-2, 0, 2], breakoutCorrectId: 'A' },
      { id: 'wide-cross-position', pos: [12, 0, -6], breakoutCorrectId: 'C' },
    ],
    decoys: [
      { id: 't2', label: 'ST', pos: [-2, 0, -14] },
      { id: 't3', label: 'RW', pos: [14, 0, -6] },
    ],
    step3Zones: [
      { id: 'A', pos: [4, 0, -12], size: 2.0 },
      { id: 'B', pos: [-8, 0, -14], size: 2.0 },
      { id: 'C', pos: [8, 0, -14], size: 2.0 },
    ],
    opposition: [
      { label: 'CB', pos: [-2, 0, -8] },    // holding the line
      { label: 'CB', pos: [4, 0, -8] },     // holding the line
      { label: 'FB', pos: [-8, 0, -10] },   // covers zone B step 3
      { label: 'FB', pos: [10, 0, -10] },   // covers zone C step 3
      { label: 'CM', pos: [-4, 0, 2] },     // press on step 1 wrong zone B
    ],
  },
];

export default MOVEMENT_SCENARIOS;