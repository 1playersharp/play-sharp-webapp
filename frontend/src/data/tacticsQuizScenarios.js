// Tactics Quiz scenarios — ported verbatim from the reference prototype at
// reference/playsharp-tactics-quiz.html. Each position has 4 scenarios; every
// scenario has: title, caption, actors (with x1/y1 start and x2/y2 end for
// the SVG pitch animation), an optional ball, the question, 3 choices, the
// correct index, and an explanation. Do not paraphrase or drop coordinates.
//
// The goalkeeper bucket is a "coming soon" stub (no scenarios yet) so GK
// profiles still see a card in the position picker.

export const POSITION_ORDER = [
    'defender',
    'midfielder',
    'winger',
    'striker',
    'goalkeeper',
];

export const POSITIONS = {
    defender: {
        label: 'Defender',
        squad: 'N° 2–5',
        desc:
            'Duels, cover and reading crosses — know when to engage and when to hold your shape.',
        comingSoon: false,
        scenarios: [
            {
                title: '2v1 Overload',
                caption:
                    'Two attackers break forward against you, the last defender. One carries the ball, the other supports wide, ready for the pass.',
                actors: [
                    { role: 'attack', label: '9',  x1: 470, y1: 430, x2: 395, y2: 235 },
                    { role: 'attack', label: '11', x1: 630, y1: 410, x2: 545, y2: 255 },
                    { role: 'defend', you: true, label: 'YOU', x1: 400, y1: 250, x2: 450, y2: 300 },
                ],
                ball: { x1: 450, y1: 410, x2: 390, y2: 250 },
                question:
                    "The ball carrier is 25 yards out and cover is arriving. What's the right call?",
                choices: [
                    'Sprint in and try to win the ball immediately',
                    'Delay, jockey side-on, and show the carrier away from the supporting runner until cover arrives',
                    'Stand off both attackers and do nothing until they reach the box',
                ],
                correct: 1,
                explanation:
                    '<b>Delay and shape the play.</b> With cover on its way, diving in risks being beaten instantly, and doing nothing concedes the shot or pass angle. Jockeying and cutting the passing lane buys your teammate time to recover.',
            },
            {
                title: '1v1 Defending — When to Press',
                caption:
                    "An isolated winger receives the ball 30 yards from goal. You're the only defender back — no support yet.",
                actors: [
                    { role: 'attack', label: '7', x1: 650, y1: 380, x2: 435, y2: 255 },
                    { role: 'defend', you: true, label: 'YOU', x1: 430, y1: 300, x2: 400, y2: 265 },
                ],
                ball: { x1: 650, y1: 380, x2: 435, y2: 255 },
                question:
                    'The attacker is facing you, ball at their feet, no cover behind you. When do you engage?',
                choices: [
                    "Press immediately and try to win it while they're still under control",
                    'Show them onto their weaker foot, slow the approach, and only fully engage once support arrives or they enter a danger zone',
                    'Turn and jog back to the edge of the box, ignoring them until then',
                ],
                correct: 1,
                explanation:
                    "<b>Jockey, don't rush.</b> Without cover, diving in invites being turned or beaten outright. Showing a side and controlling the distance — then pressing as they near a shooting or crossing zone — is the disciplined 1v1 approach.",
            },
            {
                title: 'Covering a Beaten Teammate',
                caption:
                    'Your fellow defender has just been beaten on the near side. The ball carrier is driving inside toward goal.',
                actors: [
                    { role: 'defend', label: '2',  x1: 250, y1: 300, x2: 235, y2: 335 },
                    { role: 'attack', label: '10', x1: 255, y1: 335, x2: 385, y2: 230 },
                    { role: 'defend', you: true, label: 'YOU', x1: 480, y1: 255, x2: 420, y2: 265 },
                ],
                ball: { x1: 255, y1: 335, x2: 385, y2: 230 },
                question:
                    "As the covering defender, what's your priority right now?",
                choices: [
                    'Sprint to close the ball carrier down directly, leaving your own marker completely free',
                    'Shift across into a covering position between the ball and your goal — stay compact rather than fully committing',
                    'Stay wide on your original marker and hope your teammate recovers in time',
                ],
                correct: 1,
                explanation:
                    '<b>Screen the danger, stay compact.</b> A covering defender shifts goal-side and ball-side to protect the most dangerous space, without ball-watching or abandoning shape — giving the beaten teammate a chance to recover.',
            },
            {
                title: 'Defending the Cross',
                caption:
                    "The opposition winger is about to whip in a cross. You're one of two center-backs in the box, tracking a runner.",
                actors: [
                    { role: 'attack', label: '11', x1: 690, y1: 250, x2: 705, y2: 120 },
                    { role: 'attack', label: '9',  x1: 430, y1: 340, x2: 380, y2: 205 },
                    { role: 'defend', you: true, label: 'YOU', x1: 400, y1: 270, x2: 380, y2: 220 },
                ],
                ball: { x1: 705, y1: 120, x2: 385, y2: 95 },
                question:
                    'As the cross is about to be delivered, where should you position yourself?',
                choices: [
                    'Stand still on the goal line to be ready to block a shot',
                    'Stay goal-side and ball-side of your runner, judging near-post or far-post, ready to attack the ball',
                    'Watch the ball flight in the air and worry about your man once it lands',
                ],
                correct: 1,
                explanation:
                    '<b>Track the runner, attack the ball.</b> Good box defending means staying goal-side of your man while reading whether the danger is near or far post — then getting across to attack the cross rather than reacting late.',
            },
        ],
    },
    midfielder: {
        label: 'Midfielder',
        squad: 'N° 6–8',
        desc:
            'Positioning, tempo, body shape and scanning — the picture you build before the ball arrives.',
        comingSoon: false,
        scenarios: [
            {
                title: 'Positioning Between the Lines',
                caption:
                    "Your team is building play from the back. You're a central midfielder with the opposition's midfield and defensive lines ahead of you.",
                actors: [
                    { role: 'attack', you: true, label: '8', x1: 400, y1: 430, x2: 400, y2: 300 },
                    { role: 'defend', label: '', x1: 300, y1: 250, x2: 300, y2: 250 },
                    { role: 'defend', label: '', x1: 500, y1: 250, x2: 500, y2: 250 },
                    { role: 'defend', label: '', x1: 330, y1: 150, x2: 330, y2: 150 },
                    { role: 'defend', label: '', x1: 470, y1: 150, x2: 470, y2: 150 },
                ],
                ball: { x1: 230, y1: 430, x2: 400, y2: 310 },
                question:
                    'Where should you position yourself to be most useful right now?',
                choices: [
                    "Stand directly next to a teammate so you're always close to the ball",
                    "Find the pocket of space between the opposition's midfield and defensive lines",
                    'Drop all the way back to stand next to your own defenders',
                ],
                correct: 1,
                explanation:
                    '<b>Occupy the gap.</b> Midfielders create value in the pockets between opposition lines — hard to mark, and available to receive on the half-turn and play forward.',
            },
            {
                title: 'Dictating Tempo',
                caption:
                    "Your team is comfortably in possession, moving the ball side to side. The opposition shape hasn't been broken yet.",
                actors: [
                    { role: 'attack', you: true, label: '6', x1: 380, y1: 410, x2: 420, y2: 380 },
                    { role: 'attack', label: '4', x1: 230, y1: 420, x2: 230, y2: 420 },
                    { role: 'attack', label: '7', x1: 600, y1: 260, x2: 600, y2: 180 },
                ],
                ball: { x1: 380, y1: 390, x2: 600, y2: 190 },
                question:
                    'When is the right moment to speed up with a forward, penetrative pass?',
                choices: [
                    "As soon as any forward lane opens, regardless of your teammates' positions",
                    "Once the opposition's shape has been shifted or stretched and a clear penetrative pass becomes available",
                    'Never — keep the ball moving slowly no matter what happens ahead of you',
                ],
                correct: 1,
                explanation:
                    '<b>Probe, then punish.</b> Controlling tempo means patiently shifting the opponent until their shape is disrupted, then injecting speed with an incisive pass — not rushing blindly or stalling forever.',
            },
            {
                title: 'Body Shape on the Half-Turn',
                caption:
                    'A teammate is about to pass to you with an opponent closing in from behind.',
                actors: [
                    { role: 'attack', you: true, label: '8', x1: 400, y1: 350, x2: 400, y2: 335 },
                    { role: 'attack', label: '5', x1: 230, y1: 420, x2: 230, y2: 420 },
                    { role: 'defend', label: '', x1: 400, y1: 420, x2: 400, y2: 370 },
                ],
                ball: { x1: 230, y1: 420, x2: 400, y2: 340 },
                question:
                    'How should you position your body as the ball arrives?',
                choices: [
                    'Square on, facing the passer directly',
                    'Angled on the half-turn, body open to the field, so you can see and play forward in one touch',
                    'With your back fully to goal, facing directly away from play',
                ],
                correct: 1,
                explanation:
                    '<b>Open your body to the game.</b> Receiving on the half-turn lets you see the whole pitch and play forward quickly, instead of needing extra touches just to turn under pressure.',
            },
            {
                title: 'Scanning Before Receiving',
                caption:
                    "You're about to receive a pass in a crowded midfield area, with opponents nearby on both sides.",
                actors: [
                    { role: 'attack', you: true, label: '6', x1: 400, y1: 350, x2: 400, y2: 335 },
                    { role: 'attack', label: '4', x1: 230, y1: 420, x2: 230, y2: 420 },
                    { role: 'defend', label: '', x1: 470, y1: 380, x2: 470, y2: 380 },
                    { role: 'defend', label: '', x1: 330, y1: 300, x2: 330, y2: 300 },
                ],
                ball: { x1: 230, y1: 420, x2: 400, y2: 340 },
                question:
                    'What should you be doing in the seconds before the ball arrives?',
                choices: [
                    'Watch the ball travel and decide what to do only once it arrives at your feet',
                    "Scan over both shoulders to check opponents' positions and passing options before it arrives",
                    'Focus only on the teammate who is about to pass to you',
                ],
                correct: 1,
                explanation:
                    '<b>Build the picture early.</b> Scanning before the ball arrives lets you know where the pressure and options are, so your first touch can be quick and secure rather than a guess.',
            },
        ],
    },
    winger: {
        label: 'Winger',
        squad: 'N° 7 / 11',
        desc:
            'Runs, 1v1s and the final decision — shoot, cut back, or put it on a plate.',
        comingSoon: false,
        scenarios: [
            {
                title: 'Making Runs — In Behind or to Feet',
                caption:
                    "Your team is building an attack and the opposition's back line is playing unusually high.",
                actors: [
                    { role: 'attack', you: true, label: '11', x1: 650, y1: 390, x2: 520, y2: 180 },
                    { role: 'defend', label: '', x1: 500, y1: 260, x2: 500, y2: 260 },
                    { role: 'defend', label: '', x1: 650, y1: 260, x2: 650, y2: 260 },
                ],
                ball: { x1: 400, y1: 430, x2: 520, y2: 190 },
                question: "What's the smart movement here?",
                choices: [
                    "Always check back to feet so you're involved in every phase of play",
                    'Time a run in behind the high line, staying onside until the pass is played',
                    'Stand still on the touchline and wait for the ball to find you',
                ],
                correct: 1,
                explanation:
                    '<b>Attack the space behind.</b> A high defensive line is an invitation — a timed run in behind stretches the game and creates a real chance. Only checking to feet lets the defense sit comfortably.',
            },
            {
                title: '1v1 — Attacking the Full-Back',
                caption:
                    "You've received the ball wide with the full-back set up side-on in front of you.",
                actors: [
                    { role: 'attack', you: true, label: '7', x1: 650, y1: 350, x2: 555, y2: 225 },
                    { role: 'defend', label: '3', x1: 600, y1: 300, x2: 615, y2: 310 },
                ],
                ball: { x1: 650, y1: 350, x2: 555, y2: 225 },
                question: 'How do you approach the 1v1?',
                choices: [
                    'Attack the space the full-back is showing you, using a change of pace to get past',
                    'Always cut back the way you came, no matter how the full-back is set up',
                    'Wait for a teammate to overlap before doing anything at all',
                ],
                correct: 0,
                explanation:
                    "<b>Read the invitation, then explode.</b> A full-back's body shape usually shows you a side on purpose — reading it and accelerating away with a change of pace is the core skill of beating a defender 1v1.",
            },
            {
                title: 'Finishing — Cut Inside or Go to the Byline',
                caption:
                    "You've beaten your marker and you're level with the edge of the box, on your stronger foot's side.",
                actors: [
                    { role: 'attack', you: true, label: '11', x1: 620, y1: 260, x2: 470, y2: 190 },
                    { role: 'defend', label: '', x1: 560, y1: 230, x2: 520, y2: 220 },
                ],
                ball: { x1: 620, y1: 260, x2: 470, y2: 190 },
                question:
                    "With space and the angle onto your stronger foot, what's the best decision?",
                choices: [
                    'Always go to the byline and cross, regardless of your foot or the angle',
                    'Cut inside onto your stronger foot to shoot or combine, since you have the space and the angle',
                    'Stop and pass backward immediately',
                ],
                correct: 1,
                explanation:
                    '<b>Take the higher-value option.</b> When a winger has room and the angle onto their favoured foot, cutting inside to shoot or combine usually beats a low-percentage cross from the byline.',
            },
            {
                title: 'The Crossing Decision',
                caption:
                    "You're sprinting down the wing. One teammate makes a near-post run, another arrives late at the back post, and a defender is scrambling to recover.",
                actors: [
                    { role: 'attack', you: true, label: '7',  x1: 700, y1: 340, x2: 700, y2: 200 },
                    { role: 'attack', label: '9',  x1: 430, y1: 300, x2: 370, y2: 205 },
                    { role: 'attack', label: '10', x1: 420, y1: 380, x2: 470, y2: 215 },
                    { role: 'defend', label: '',   x1: 600, y1: 260, x2: 565, y2: 225 },
                ],
                ball: { x1: 700, y1: 200, x2: 400, y2: 180 },
                question: 'As you run, when should you deliver the cross?',
                choices: [
                    'Wait until you reach the byline no matter what, even if defenders have recovered',
                    'Read the recovery runs as you go — an early cross if defenders are getting goal-side, or drive on if space remains',
                    'Cross without looking up, aiming vaguely into the box',
                ],
                correct: 1,
                explanation:
                    '<b>Cross on the picture, not the plan.</b> Good wide players read defensive recovery in real time — sometimes an early ball beats the defense back, other times driving to the byline opens a better angle.',
            },
        ],
    },
    striker: {
        label: 'Striker',
        squad: 'N° 9',
        desc:
            'First touch, finishing and the timing of every run — the details that separate goals from near misses.',
        comingSoon: false,
        scenarios: [
            {
                title: 'Finishing — Placement vs Power',
                caption:
                    "You're clean through on goal, one-on-one with the keeper, slightly right of center.",
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 430, y1: 300, x2: 400, y2: 150 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 60, x2: 398, y2: 72 },
                ],
                ball: { x1: 430, y1: 300, x2: 400, y2: 150 },
                question: "What's the highest-percentage finish here?",
                choices: [
                    'Blast the ball as hard as possible, straight at the keeper',
                    "Pick a placed finish into the corner or through the keeper's gap, favouring accuracy over pure power",
                    'Take an extra unnecessary touch before shooting',
                ],
                correct: 1,
                explanation:
                    '<b>Placement beats power.</b> In one-on-ones, a well-placed shot into a corner or gap beats keepers far more reliably than blasting it — and extra touches only let defenders or the keeper recover.',
            },
            {
                title: 'First Touch Under Pressure',
                caption:
                    'You receive the ball with your back to goal and a defender tight on you from behind.',
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 400, y1: 290, x2: 368, y2: 272 },
                    { role: 'defend', label: '', x1: 400, y1: 325, x2: 398, y2: 295 },
                ],
                ball: { x1: 250, y1: 420, x2: 368, y2: 272 },
                question: 'What should your first touch achieve?',
                choices: [
                    "Take a big touch straight into the defender's path",
                    'Cushion or angle the touch away from the pressure, into space where you can turn or lay it off',
                    'Try to control the ball perfectly still under your feet',
                ],
                correct: 1,
                explanation:
                    '<b>Move the ball, not just control it.</b> A good first touch under pressure creates separation from the defender — a heavy or static touch just invites the tackle.',
            },
            {
                title: 'Making Runs — Timing the Move',
                caption:
                    'A teammate is about to thread a through ball, and the last defender is holding a flat line.',
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 430, y1: 260, x2: 390, y2: 150 },
                    { role: 'defend', label: '4', x1: 400, y1: 230, x2: 400, y2: 230 },
                ],
                ball: { x1: 250, y1: 420, x2: 390, y2: 150 },
                question:
                    'When should you start your run to beat the offside line?',
                choices: [
                    "Run early and often, regardless of the defensive line or the passer's timing",
                    'Time the run to start just as the pass is played, staying level with the line until that moment',
                    'Stand still and wait to see if the ball happens to arrive near you',
                ],
                correct: 1,
                explanation:
                    '<b>Time it off the pass, not the pause.</b> Starting the sprint the moment the ball is played — not before — beats the offside trap and gets you clean in behind.',
            },
            {
                title: 'Hold-Up Play — Turn or Lay Off',
                caption:
                    'You receive the ball with your back to goal, tightly marked, while your teammates are still getting forward.',
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 400, y1: 255, x2: 400, y2: 248 },
                    { role: 'defend', label: '', x1: 400, y1: 295, x2: 400, y2: 270 },
                    { role: 'attack', label: '8', x1: 300, y1: 380, x2: 340, y2: 325 },
                ],
                ball: { x1: 250, y1: 420, x2: 400, y2: 252 },
                question: "What's the right decision here?",
                choices: [
                    'Always try to turn and take the defender on, regardless of support',
                    'Read the pressure and support — lay the ball off if tightly marked, or turn only if real space opens up',
                    'Hold the ball indefinitely without playing it to anyone',
                ],
                correct: 1,
                explanation:
                    "<b>Shield first, decide second.</b> Good hold-up play reads the pressure: lay it off to a supporting runner when marked tightly, and only turn to attack when there's genuine space to do so.",
            },
        ],
    },
    goalkeeper: {
        label: 'Goalkeeper',
        squad: 'N° 1',
        desc:
            'Distribution, command of the area, sweeping and shot-stopping — coming soon.',
        comingSoon: true,
        scenarios: [],
    },
};

/** Map a profile position (long-form) to a Tactics Quiz bucket, or null. */
export const PROFILE_POSITION_TO_BUCKET = {
    GK:  'goalkeeper',
    RB:  'defender',  LB:  'defender',
    RCB: 'defender',  LCB: 'defender',
    CDM: 'midfielder',
    CM:  'midfielder',
    CAM: 'midfielder',
    RW:  'winger',    LW:  'winger',
    ST:  'striker',
};
