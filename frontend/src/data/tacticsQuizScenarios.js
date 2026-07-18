// Tactics Quiz scenarios — weighted, topic-tagged banks.
//
// Each position has a bank of 8 questions. TacticsQuiz.jsx samples 4 of them
// per attempt (shuffled, no repeats) so retakes see different mixes.
//
// Every question carries a `topic` tag used to build per-topic breakdowns
// and drive game recommendations on the results screen (see topicGameMap.js).
//
// Every choice carries a `weight` (0..3) and a coach-voice `reason`:
//   3 = best read, 2 = good, 1 = weak, 0 = poor.
// Exactly one option per question has weight 3.
//
// Older scenarios kept their pitch animation coordinates verbatim — the new
// ones omit `actors` / `ball`, so ScenarioPitch renders an empty pitch. Do
// not remove coordinates when editing existing scenarios.
//
// The goalkeeper bucket is a "coming soon" stub (no scenarios yet).

export const POSITION_ORDER = [
    'defender',
    'midfielder',
    'winger',
    'striker',
    'goalkeeper',
];

// Canonical topic slugs (per-position). Kept as constants so the game map
// stays typo-safe.
export const TOPICS = {
    // Defender
    ONE_V_ONE_DEF:    'one_v_one_def',
    READING_PLAY:     'reading_play',
    MARKING:          'marking',
    OVERLAPPING_RUNS: 'overlapping_runs',
    DEFENDING_CROSS:  'defending_cross',
    // Midfielder
    PROGRESSIVE_PASSING:     'progressive_passing',
    POSITIONING:             'positioning',
    BODY_SHAPE:              'body_shape',
    RECEIVING_BETWEEN_LINES: 'receiving_between_lines',
    // Striker / attacker
    DRIBBLING_1V1:      'dribbling_1v1',
    CROSSING:           'crossing',
    ATTACKING_MOVEMENT: 'attacking_movement',
    FINISHING:          'finishing',
    ONE_V_ONE_ATT:      'one_v_one_att',
};

// Human labels for the per-topic breakdown on the results screen.
export const TOPIC_LABELS = {
    one_v_one_def:           '1v1 defending',
    reading_play:            'Reading the play',
    marking:                 'Marking',
    overlapping_runs:        'Overlapping runs',
    defending_cross:         'Defending the cross',
    progressive_passing:     'Progressive passing',
    positioning:             'Positioning',
    body_shape:              'Body shape',
    receiving_between_lines: 'Receiving between the lines',
    dribbling_1v1:           'Dribbling 1v1',
    crossing:                'Crossing',
    attacking_movement:      'Attacking movement',
    finishing:               'Finishing',
    one_v_one_att:           '1v1 attacking',
};

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
                topic: TOPICS.READING_PLAY,
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
                    { text: 'Sprint in and try to win the ball immediately', weight: 1, reason: "Diving in on a 2v1 gets you beaten with one pass — brave, but the situation asks for patience." },
                    { text: 'Delay, jockey side-on, and show the carrier away from the supporting runner until cover arrives', weight: 3, reason: 'Delaying and cutting the pass to the support man is exactly what a last defender should do in a 2v1.' },
                    { text: 'Stand off both attackers and do nothing until they reach the box', weight: 0, reason: 'Standing off invites them into the shooting zone with a free run — you have to influence the play.' },
                ],
            },
            {
                title: '1v1 Defending — When to Press',
                topic: TOPICS.ONE_V_ONE_DEF,
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
                    { text: "Press immediately and try to win it while they're still under control", weight: 1, reason: 'Rushing in without cover is how good wingers get in behind you — you need to buy time first.' },
                    { text: 'Show them onto their weaker foot, slow the approach, and only fully engage once support arrives or they enter a danger zone', weight: 3, reason: "Jockey, show a side, and pick your moment — that's disciplined 1v1 defending." },
                    { text: 'Turn and jog back to the edge of the box, ignoring them until then', weight: 0, reason: 'Backing off completely gives them a free run at the box — you have to influence the ball.' },
                ],
            },
            {
                title: 'Covering a Beaten Teammate',
                topic: TOPICS.MARKING,
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
                    { text: 'Sprint to close the ball carrier down directly, leaving your own marker completely free', weight: 1, reason: 'Charging the ball leaves your runner wide open — one pass and they walk in.' },
                    { text: 'Shift across into a covering position between the ball and your goal — stay compact rather than fully committing', weight: 3, reason: "Slide goal-side, stay compact, screen the danger — that's the covering defender's job." },
                    { text: 'Stay wide on your original marker and hope your teammate recovers in time', weight: 0, reason: 'Ignoring the biggest threat is ball-watching in reverse — you have to react to the danger.' },
                ],
            },
            {
                title: 'Defending the Cross',
                topic: TOPICS.DEFENDING_CROSS,
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
                    { text: 'Stand still on the goal line to be ready to block a shot', weight: 1, reason: "Standing on the line gives the attacker a free header — you have to be first to the ball." },
                    { text: 'Stay goal-side and ball-side of your runner, judging near-post or far-post, ready to attack the ball', weight: 3, reason: 'Goal-side of your man, eyes on the ball, timing your jump — that wins the header.' },
                    { text: 'Watch the ball flight in the air and worry about your man once it lands', weight: 0, reason: "Ball-watching in the box is how strikers score — you have to track the runner first." },
                ],
            },
            // ---------- NEW (4) ----------
            {
                title: 'Isolated in the Channel',
                topic: TOPICS.ONE_V_ONE_DEF,
                caption:
                    "A quick winger is running at you full speed in the wide channel. Your fullback partner is out of position and it's a clean 1v1.",
                actors: [
                    { role: 'attack', label: '7',  x1: 680, y1: 380, x2: 700, y2: 200 },
                    { role: 'defend', you: true, label: 'YOU', x1: 630, y1: 340, x2: 680, y2: 260 },
                ],
                ball: { x1: 665, y1: 365, x2: 705, y2: 170 },
                question:
                    'They knock the ball past you into the space down the line. What do you do first?',
                choices: [
                    { text: 'Drop your weight, get side-on and match their stride down the line before trying to nick the ball', weight: 3, reason: "Match their speed first — you can't tackle what you can't get to. Then pick your moment." },
                    { text: 'Lunge in with your leading leg to reach the ball before they do', weight: 1, reason: "A dive-in against a fast winger usually ends with you on the floor and them in behind." },
                    { text: 'Sprint straight for goal to cover and give up the wide space', weight: 1, reason: 'Bailing on the duel invites the cross — first try to stay with them.' },
                    { text: 'Shout at the ref for a foul and slow down', weight: 0, reason: "Never stop competing on a live ball — refs won't save you." },
                ],
            },
            {
                title: 'Reading the Overload Building',
                topic: TOPICS.READING_PLAY,
                caption:
                    'Their midfielder is about to receive with time. You see their winger drifting inside and their fullback bombing forward outside.',
                actors: [
                    { role: 'attack', label: '8',  x1: 550, y1: 350, x2: 550, y2: 350 },
                    { role: 'attack', label: '11', x1: 680, y1: 280, x2: 560, y2: 200 },
                    { role: 'attack', label: '2',  x1: 680, y1: 420, x2: 685, y2: 250 },
                    { role: 'defend', you: true, label: 'YOU', x1: 430, y1: 250, x2: 430, y2: 250 },
                ],
                ball: { x1: 350, y1: 430, x2: 545, y2: 348 },
                question:
                    "The ball hasn't been played yet. What's the first thing you should do?",
                choices: [
                    { text: 'Point and communicate early — pass one runner to a teammate and lock onto the biggest threat before the pass arrives', weight: 3, reason: "Great defenders read what's coming and organise before the pass. Talking is defending." },
                    { text: 'Stand still and wait for the ball to be played before deciding who to mark', weight: 1, reason: "Waiting means you're always a step behind — pictures are drawn early." },
                    { text: 'Follow your winger inside and leave the flank completely open', weight: 1, reason: 'Getting dragged in without cover is how overloads score — shape matters.' },
                    { text: 'Sprint to press the midfielder now, ignoring the runners', weight: 0, reason: 'Diving in without support is exactly what their combination is set up to punish.' },
                ],
            },
            {
                title: 'Marking on a Set Piece',
                topic: TOPICS.MARKING,
                caption:
                    'Corner about to be swung in. You are man-marking their biggest aerial threat inside the six-yard box.',
                actors: [
                    { role: 'attack', label: '7', x1: 760, y1: 40, x2: 760, y2: 40 },
                    { role: 'attack', label: '9', x1: 430, y1: 115, x2: 400, y2: 78 },
                    { role: 'defend', you: true, label: 'YOU', x1: 445, y1: 100, x2: 420, y2: 82 },
                ],
                ball: { x1: 760, y1: 40, x2: 400, y2: 72 },
                question:
                    'The taker is stepping up. Where should your body and eyes be?',
                choices: [
                    { text: 'Side-on so you can see both the ball and your runner, one arm feeling contact, staying goal-side', weight: 3, reason: 'See ball, see man, feel contact — that split view is the whole art of set-piece marking.' },
                    { text: 'Eyes locked on the ball only, standing directly behind your man', weight: 1, reason: 'Watching the ball only lets them lose you with one step — you need both pictures.' },
                    { text: 'Grab the shirt and hope the ref misses it', weight: 0, reason: "Shirt pulls get punished with penalties at the levels you're heading to." },
                    { text: 'Stand two yards in front of them and let them attack the ball', weight: 0, reason: 'Being on the wrong side of your runner in the six-yard box concedes goals — stay goal-side.' },
                ],
            },
            {
                title: 'Handling the Overlapping Run',
                topic: TOPICS.OVERLAPPING_RUNS,
                caption:
                    "You're marking the winger 1v1. Their fullback is charging forward on an overlap outside you, screaming for the ball.",
                actors: [
                    { role: 'attack', label: '7', x1: 640, y1: 340, x2: 630, y2: 330 },
                    { role: 'attack', label: '2', x1: 680, y1: 420, x2: 695, y2: 280 },
                    { role: 'defend', you: true, label: 'YOU', x1: 605, y1: 315, x2: 620, y2: 305 },
                ],
                ball: { x1: 640, y1: 340, x2: 630, y2: 330 },
                question:
                    'What do you do to defend the overlap without leaving your winger free?',
                choices: [
                    { text: 'Take a step wider to force the winger inside, and shout for your midfielder to pick up the overlapping fullback', weight: 3, reason: "Cut the outside pass and get help — overlaps get defended in twos, and communication is the key." },
                    { text: 'Leave the winger and sprint out to the overlapping fullback yourself', weight: 1, reason: 'Chasing the runner leaves the winger free in the pocket — usually the more dangerous option.' },
                    { text: 'Stay exactly where you are and hope no one plays the pass', weight: 1, reason: 'Hoping is not defending — you have to influence one of the two attackers.' },
                    { text: 'Foul the winger to stop the whole move', weight: 0, reason: 'A cheap yellow so early gives them a free-kick in a great spot and puts you on the edge for the rest of the game.' },
                ],
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
                topic: TOPICS.POSITIONING,
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
                    { text: "Stand directly next to a teammate so you're always close to the ball", weight: 1, reason: 'Two players in the same zone is one player wasted — you have to spread the picture.' },
                    { text: "Find the pocket of space between the opposition's midfield and defensive lines", weight: 3, reason: 'The pocket between lines is the hardest place to defend and the easiest to turn from — occupy it.' },
                    { text: 'Drop all the way back to stand next to your own defenders', weight: 1, reason: "Dropping too deep means your defenders have someone marking them for free — get higher." },
                ],
            },
            {
                title: 'Dictating Tempo',
                topic: TOPICS.PROGRESSIVE_PASSING,
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
                    { text: "As soon as any forward lane opens, regardless of your teammates' positions", weight: 1, reason: 'Playing forward without runners just gives the ball back — pass the picture, not just the ball.' },
                    { text: "Once the opposition's shape has been shifted or stretched and a clear penetrative pass becomes available", weight: 3, reason: 'Probe patiently, then punish — hit the forward pass on the moment their shape breaks.' },
                    { text: 'Never — keep the ball moving slowly no matter what happens ahead of you', weight: 0, reason: 'Possession for its own sake wins nothing — at some point you have to hurt them.' },
                ],
            },
            {
                title: 'Body Shape on the Half-Turn',
                topic: TOPICS.BODY_SHAPE,
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
                    { text: 'Square on, facing the passer directly', weight: 1, reason: "Square on means an extra touch to turn — that's the touch a defender steals." },
                    { text: 'Angled on the half-turn, body open to the field, so you can see and play forward in one touch', weight: 3, reason: 'Half-turn body shape lets you receive AND play forward in one movement — that saves you a whole action.' },
                    { text: 'With your back fully to goal, facing directly away from play', weight: 0, reason: "Back to play kills every forward option before the ball arrives." },
                ],
            },
            {
                title: 'Scanning Before Receiving',
                topic: TOPICS.RECEIVING_BETWEEN_LINES,
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
                    { text: 'Watch the ball travel and decide what to do only once it arrives at your feet', weight: 1, reason: 'Deciding at the ball is deciding too late — the picture has already changed.' },
                    { text: "Scan over both shoulders to check opponents' positions and passing options before it arrives", weight: 3, reason: 'Head on a swivel before you receive — the best midfielders already know their next pass before the ball touches them.' },
                    { text: 'Focus only on the teammate who is about to pass to you', weight: 1, reason: 'Watching the passer only tells you where the ball is coming from — not where it needs to go.' },
                ],
            },
            // ---------- NEW (4) ----------
            {
                title: 'Choosing the Progressive Pass',
                topic: TOPICS.PROGRESSIVE_PASSING,
                caption:
                    "You've dropped between the centre-backs and received on the half-turn. You see a safe sideways ball, a firm pass to feet between the lines, and a risky through ball.",
                actors: [
                    { role: 'attack', you: true, label: '6',  x1: 400, y1: 400, x2: 400, y2: 385 },
                    { role: 'attack', label: '10', x1: 400, y1: 200, x2: 400, y2: 200 },
                    { role: 'attack', label: '4',  x1: 180, y1: 390, x2: 180, y2: 390 },
                    { role: 'defend', label: '',   x1: 320, y1: 310, x2: 320, y2: 310 },
                    { role: 'defend', label: '',   x1: 480, y1: 310, x2: 480, y2: 310 },
                ],
                ball: { x1: 400, y1: 390, x2: 400, y2: 215 },
                question:
                    'The opposition midfield has stepped up. What do you play?',
                choices: [
                    { text: 'Drive the ball firmly into the feet of your 10 between the lines and set them up to attack the back four', weight: 3, reason: 'Breaking a line with one pass is worth more than five sideways ones — hit the feet between the lines.' },
                    { text: 'Play the safe sideways pass every time', weight: 1, reason: 'Endless sideways passing lets them reset — you have to be brave when the line is broken.' },
                    { text: 'Whip a 40-yard through ball first time hoping the striker runs it down', weight: 1, reason: 'Hopeful long balls give the ball away and stretch your own team out — pick the winnable option.' },
                    { text: 'Dwell on the ball until the press arrives and you get tackled', weight: 0, reason: "Holding the ball too long is a turnover in a place you can't afford to lose it." },
                ],
            },
            {
                title: 'Finding the Pocket',
                topic: TOPICS.POSITIONING,
                caption:
                    'Ball is on your right centre-back. Their striker is pressing him, their central midfielder is starting to slide across.',
                actors: [
                    { role: 'attack', label: '5', x1: 250, y1: 440, x2: 250, y2: 440 },
                    { role: 'defend', label: '9', x1: 290, y1: 380, x2: 250, y2: 420 },
                    { role: 'defend', label: '8', x1: 400, y1: 320, x2: 340, y2: 330 },
                    { role: 'attack', you: true, label: '6', x1: 400, y1: 350, x2: 340, y2: 380 },
                ],
                ball: { x1: 250, y1: 440, x2: 340, y2: 385 },
                question:
                    'Where should you move to help your centre-back beat the press?',
                choices: [
                    { text: 'Shift into the passing lane just behind their pressing striker and offer a bounce pass', weight: 3, reason: 'Showing up behind the first line of press is the classic way to escape it — offer the outlet.' },
                    { text: 'Stand still in the middle circle so you stay balanced', weight: 1, reason: 'Standing still against a press is a gift — you have to move to be an option.' },
                    { text: 'Run all the way up next to the striker', weight: 1, reason: "Vacating midfield entirely means the centre-back has no short option — get the pocket right, not the striker's space." },
                    { text: 'Turn your back and jog away from the ball', weight: 0, reason: 'Making yourself unavailable is the opposite of what midfielders exist to do.' },
                ],
            },
            {
                title: 'Body Shape Facing the Press',
                topic: TOPICS.BODY_SHAPE,
                caption:
                    "The ball is coming into you sideways with a presser sprinting at you from your left. Support is on your right.",
                actors: [
                    { role: 'attack', you: true, label: '8', x1: 400, y1: 350, x2: 415, y2: 345 },
                    { role: 'defend', label: '', x1: 280, y1: 370, x2: 380, y2: 355 },
                    { role: 'attack', label: '7', x1: 560, y1: 380, x2: 560, y2: 380 },
                ],
                ball: { x1: 200, y1: 350, x2: 395, y2: 350 },
                question:
                    'How should your body be angled the moment before you receive?',
                choices: [
                    { text: "Open your hips toward the support side, using your body to shield the press, first touch away from pressure", weight: 3, reason: 'Open hips, shield the presser, touch away from him — three things in one movement. Elite habit.' },
                    { text: 'Face directly toward the presser, ready to fight for the ball', weight: 1, reason: "Facing the press makes you predictable — they know you can't turn." },
                    { text: 'Stand facing your own goal so the ball is easier to control', weight: 1, reason: 'Back to play kills all your forward options in one bad habit.' },
                    { text: 'Stop moving and let the ball come to you flat-footed', weight: 0, reason: 'Static receiving is what defenders pray for — you have to be shaped and moving.' },
                ],
            },
            {
                title: 'Receiving Between the Lines',
                topic: TOPICS.RECEIVING_BETWEEN_LINES,
                caption:
                    "You're between their midfield and defence, back tight from behind. Ball is arriving into your feet.",
                actors: [
                    { role: 'attack', you: true, label: '8', x1: 400, y1: 290, x2: 388, y2: 285 },
                    { role: 'defend', label: '', x1: 400, y1: 250, x2: 400, y2: 270 },
                    { role: 'attack', label: '4', x1: 250, y1: 430, x2: 250, y2: 430 },
                ],
                ball: { x1: 250, y1: 430, x2: 388, y2: 290 },
                question:
                    'You checked over both shoulders three seconds ago. What is the best first touch?',
                choices: [
                    { text: 'Cushion the ball across your body away from the defender, into the space you already saw, ready to release', weight: 3, reason: "You scanned early, so trust the picture — touch into the space you already know is there." },
                    { text: 'Take a heavy first touch straight ahead into where the defender is', weight: 1, reason: 'Big touch into pressure is a tackle waiting to happen.' },
                    { text: 'Try to backheel the ball first time without looking', weight: 1, reason: 'Backheels look cool but in tight areas they lose the ball more than they solve it.' },
                    { text: 'Let the ball run through your legs and hope a teammate collects', weight: 0, reason: "Giving up on your own touch is how you get subbed off." },
                ],
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
                topic: TOPICS.ATTACKING_MOVEMENT,
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
                    { text: "Always check back to feet so you're involved in every phase of play", weight: 1, reason: 'Only ever going short lets a high line sit comfortably — you have to threaten in behind.' },
                    { text: 'Time a run in behind the high line, staying onside until the pass is played', weight: 3, reason: "A high line is an invitation — time the run and you're gone." },
                    { text: 'Stand still on the touchline and wait for the ball to find you', weight: 0, reason: "Static wingers are dead wingers — you have to move to get the ball." },
                ],
            },
            {
                title: '1v1 — Attacking the Full-Back',
                topic: TOPICS.ONE_V_ONE_ATT,
                caption:
                    "You've received the ball wide with the full-back set up side-on in front of you.",
                actors: [
                    { role: 'attack', you: true, label: '7', x1: 650, y1: 350, x2: 555, y2: 225 },
                    { role: 'defend', label: '3', x1: 600, y1: 300, x2: 615, y2: 310 },
                ],
                ball: { x1: 650, y1: 350, x2: 555, y2: 225 },
                question: 'How do you approach the 1v1?',
                choices: [
                    { text: 'Attack the space the full-back is showing you, using a change of pace to get past', weight: 3, reason: 'Their body shape shows you the door — a change of pace and you go through it.' },
                    { text: 'Always cut back the way you came, no matter how the full-back is set up', weight: 1, reason: 'Cutting back the same way every time makes you predictable — they set for it.' },
                    { text: 'Wait for a teammate to overlap before doing anything at all', weight: 1, reason: "Wingers who never take defenders on don't scare anyone — sometimes you have to go alone." },
                ],
            },
            {
                title: 'Finishing — Cut Inside or Go to the Byline',
                topic: TOPICS.FINISHING,
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
                    { text: 'Always go to the byline and cross, regardless of your foot or the angle', weight: 1, reason: 'Byline crosses on your weak side are low-percentage — sometimes the shot is the better option.' },
                    { text: 'Cut inside onto your stronger foot to shoot or combine, since you have the space and the angle', weight: 3, reason: 'Room + strong foot + shooting angle = take the higher-value action.' },
                    { text: 'Stop and pass backward immediately', weight: 0, reason: 'Killing a 1v1 you already won gives the defender a second life for free.' },
                ],
            },
            {
                title: 'The Crossing Decision',
                topic: TOPICS.CROSSING,
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
                    { text: 'Wait until you reach the byline no matter what, even if defenders have recovered', weight: 1, reason: 'Rigid plans in a fluid moment — you have to read the picture in front of you.' },
                    { text: 'Read the recovery runs as you go — an early cross if defenders are getting goal-side, or drive on if space remains', weight: 3, reason: 'Cross on the picture, not the plan. Great wide players deliver when the defence is worst set.' },
                    { text: 'Cross without looking up, aiming vaguely into the box', weight: 0, reason: 'Blind crosses give the ball back — always know who you are crossing to.' },
                ],
            },
            // ---------- NEW (4) ----------
            {
                title: 'Staying Wide vs Coming Inside',
                topic: TOPICS.ATTACKING_MOVEMENT,
                caption:
                    'Your central midfielder has the ball with time. Their full-back is tight on you outside; the half-space inside them is open.',
                actors: [
                    { role: 'attack', label: '8', x1: 400, y1: 400, x2: 400, y2: 400 },
                    { role: 'attack', you: true, label: '11', x1: 690, y1: 310, x2: 570, y2: 230 },
                    { role: 'defend', label: '2', x1: 650, y1: 290, x2: 650, y2: 290 },
                ],
                ball: { x1: 400, y1: 400, x2: 570, y2: 230 },
                question:
                    'What movement gives your midfielder the best pass?',
                choices: [
                    { text: 'Stay wide to pin the full-back, then dart inside into the half-space the moment your teammate lifts their head', weight: 3, reason: 'Wide-then-in movement drags the fullback and opens the pocket. Timing the switch is the skill.' },
                    { text: 'Sprint inside straight away and abandon the wide channel', weight: 1, reason: 'Leaving the touchline empty makes the pitch small for your team.' },
                    { text: 'Stand still on the touchline and wait for the pass', weight: 1, reason: "Static wingers never get the ball in dangerous spots." },
                    { text: 'Drop all the way back next to your fullback', weight: 0, reason: 'You are not a fullback — running away from goal is not what you are on the pitch for.' },
                ],
            },
            {
                title: 'Beating the Full-Back Twice',
                topic: TOPICS.ONE_V_ONE_ATT,
                caption:
                    "You knocked the ball past the full-back but they recovered and got back in front of you. You have the ball again, 1v1, but they're now well set.",
                actors: [
                    { role: 'attack', you: true, label: '7', x1: 640, y1: 350, x2: 555, y2: 220 },
                    { role: 'defend', label: '3', x1: 600, y1: 290, x2: 615, y2: 320 },
                ],
                ball: { x1: 640, y1: 350, x2: 555, y2: 220 },
                question:
                    "What's the best move to beat them cleanly this time?",
                choices: [
                    { text: 'Sell a feint one way with your shoulders and shift the ball the opposite way with a sharp change of pace', weight: 3, reason: 'A body feint plus a real acceleration is how top wingers beat set defenders — commit the trick, then go.' },
                    { text: 'Kick the ball as hard as you can past them and race for it', weight: 1, reason: 'Blind long touches let the defender or keeper mop it up — you can win the ball back with skill.' },
                    { text: 'Turn around and pass it backward every time', weight: 1, reason: 'Never taking them on is a habit — sometimes the team needs you to go alone.' },
                    { text: 'Foul the defender out of frustration', weight: 0, reason: "Losing your head loses your team a chance — stay in the moment." },
                ],
            },
            {
                title: 'The Cutback Cross',
                topic: TOPICS.CROSSING,
                caption:
                    "You've driven to the byline. The keeper is at the near post, the striker is at the front post marked tight, and a midfielder is arriving late at the edge of the box.",
                actors: [
                    { role: 'attack', you: true, label: '7', x1: 700, y1: 200, x2: 700, y2: 105 },
                    { role: 'attack', label: '9', x1: 440, y1: 110, x2: 440, y2: 110 },
                    { role: 'defend', label: '', x1: 430, y1: 105, x2: 430, y2: 105 },
                    { role: 'attack', label: '8', x1: 400, y1: 270, x2: 400, y2: 180 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 55, x2: 400, y2: 55 },
                ],
                ball: { x1: 700, y1: 105, x2: 400, y2: 175 },
                question:
                    'What kind of cross is on?',
                choices: [
                    { text: 'A firm, low cutback pulled back into the edge of the box for the arriving midfielder to strike', weight: 3, reason: 'Cutbacks to arriving runners are one of the highest-percentage assists in the game — pick the free man.' },
                    { text: 'A high floaty ball to the near post where two players are already tangled', weight: 1, reason: 'Crowded near posts clear easily — that is a low-percentage cross.' },
                    { text: 'A hopeful long ball to the far side of the pitch', weight: 1, reason: 'Long crossfield balls from the byline give up all the pressure you just built.' },
                    { text: 'Try to walk the ball into the net by dribbling through three defenders', weight: 0, reason: 'When you have a free teammate arriving, pass — greed kills chances.' },
                ],
            },
            {
                title: 'Cutting Inside to Finish',
                topic: TOPICS.FINISHING,
                caption:
                    "You've cut inside from the flank onto your strong foot at the top of the D. The keeper is set, one defender is closing.",
                actors: [
                    { role: 'attack', you: true, label: '11', x1: 560, y1: 250, x2: 430, y2: 170 },
                    { role: 'defend', label: '', x1: 480, y1: 200, x2: 445, y2: 185 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 55, x2: 395, y2: 65 },
                ],
                ball: { x1: 560, y1: 250, x2: 315, y2: 50 },
                question:
                    "What's the highest-percentage finish?",
                choices: [
                    { text: 'A curled, placed shot into the far corner using the defender as a screen from the keeper', weight: 3, reason: "That's exactly the shot great inside-forwards live for — placement past the keeper's reach." },
                    { text: 'Blast the ball as hard as possible straight down the middle', weight: 1, reason: 'Power without placement finds the keeper more often than not from that angle.' },
                    { text: 'Take three more touches to line it up better', weight: 1, reason: 'Extra touches let defenders and the keeper reset — shoot on the picture you have.' },
                    { text: 'Pass sideways and give up the shot completely', weight: 0, reason: 'You made the run for a reason — take the chance.' },
                ],
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
                topic: TOPICS.FINISHING,
                caption:
                    "You're clean through on goal, one-on-one with the keeper, slightly right of center.",
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 430, y1: 300, x2: 400, y2: 150 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 60, x2: 398, y2: 72 },
                ],
                ball: { x1: 430, y1: 300, x2: 400, y2: 150 },
                question: "What's the highest-percentage finish here?",
                choices: [
                    { text: 'Blast the ball as hard as possible, straight at the keeper', weight: 1, reason: 'Straight at the keeper is the easiest save in football — power is worthless without direction.' },
                    { text: "Pick a placed finish into the corner or through the keeper's gap, favouring accuracy over pure power", weight: 3, reason: 'Placement beats power in 1v1s — pick a corner and finish with your instep.' },
                    { text: 'Take an extra unnecessary touch before shooting', weight: 0, reason: "Extra touches let the keeper close the angle — you were already through." },
                ],
            },
            {
                title: 'First Touch Under Pressure',
                topic: TOPICS.ATTACKING_MOVEMENT,
                caption:
                    'You receive the ball with your back to goal and a defender tight on you from behind.',
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 400, y1: 290, x2: 368, y2: 272 },
                    { role: 'defend', label: '', x1: 400, y1: 325, x2: 398, y2: 295 },
                ],
                ball: { x1: 250, y1: 420, x2: 368, y2: 272 },
                question: 'What should your first touch achieve?',
                choices: [
                    { text: "Take a big touch straight into the defender's path", weight: 0, reason: 'Big touch into the defender is a giveaway — that ball is not coming back.' },
                    { text: 'Cushion or angle the touch away from the pressure, into space where you can turn or lay it off', weight: 3, reason: 'First touch away from pressure is a striker superpower — always into space.' },
                    { text: 'Try to control the ball perfectly still under your feet', weight: 1, reason: 'A dead touch under pressure is a stolen ball — move it as you receive.' },
                ],
            },
            {
                title: 'Making Runs — Timing the Move',
                topic: TOPICS.ATTACKING_MOVEMENT,
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
                    { text: "Run early and often, regardless of the defensive line or the passer's timing", weight: 1, reason: 'Early runs get flagged offside — you have to hold and time it off the pass.' },
                    { text: 'Time the run to start just as the pass is played, staying level with the line until that moment', weight: 3, reason: "Timing off the pass, not the pause — that's how you stay onside and win the race." },
                    { text: 'Stand still and wait to see if the ball happens to arrive near you', weight: 0, reason: "Standing still in behind means you never get in behind." },
                ],
            },
            {
                title: 'Hold-Up Play — Turn or Lay Off',
                topic: TOPICS.DRIBBLING_1V1,
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
                    { text: 'Always try to turn and take the defender on, regardless of support', weight: 1, reason: 'Turning into pressure without support is how forwards lose the ball in the middle third.' },
                    { text: 'Read the pressure and support — lay the ball off if tightly marked, or turn only if real space opens up', weight: 3, reason: 'Shield first, decide second — great strikers read pressure before they choose.' },
                    { text: 'Hold the ball indefinitely without playing it to anyone', weight: 0, reason: "Killing every move by holding forever kills your team's rhythm." },
                ],
            },
            // ---------- NEW (4) ----------
            {
                title: 'Facing Up in the Box',
                topic: TOPICS.DRIBBLING_1V1,
                caption:
                    "You receive the ball on the edge of the box with a defender's shoulder to your back. You spin, they turn, and now it's 1v1 with them backing off.",
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 430, y1: 185, x2: 410, y2: 130 },
                    { role: 'defend', label: '', x1: 420, y1: 165, x2: 410, y2: 145 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 55, x2: 400, y2: 55 },
                ],
                ball: { x1: 430, y1: 185, x2: 410, y2: 130 },
                question:
                    "What's the best move?",
                choices: [
                    { text: 'A sharp stepover to shift them onto their weak side, then push into the shot or the finish', weight: 3, reason: 'A single decisive move at speed inside the box wins the shooting angle. Commit to it.' },
                    { text: 'Twelve quick stepovers to try and dazzle them', weight: 1, reason: "Dribbling for the sake of it lets recovery arrive — one move, then act." },
                    { text: 'Kick the ball hard past them and hope you get there first', weight: 1, reason: "Losing the touch inside the box gives up a chance you had won." },
                    { text: 'Turn around and pass back to your midfielder', weight: 0, reason: "In the box, on the shoulder of a set defender, the striker's job is to make something happen." },
                ],
            },
            {
                title: 'Drifting Wide to Cross',
                topic: TOPICS.CROSSING,
                caption:
                    "The winger passed to you as you drifted into the right channel. Your two central strikers are attacking the box, and the far-post runner is arriving late.",
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 640, y1: 185, x2: 650, y2: 175 },
                    { role: 'attack', label: '10', x1: 430, y1: 140, x2: 380, y2: 85 },
                    { role: 'attack', label: '7',  x1: 380, y1: 270, x2: 460, y2: 105 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 50, x2: 400, y2: 50 },
                ],
                ball: { x1: 650, y1: 180, x2: 395, y2: 80 },
                question:
                    "What's the right delivery?",
                choices: [
                    { text: 'A firm, low ball across the six-yard box for the front-post attacker to slide in', weight: 3, reason: 'Low, hard, across the six is one of the highest-scoring balls in football — pick the striker.' },
                    { text: 'A floaty high ball into the middle of the box with no target picked', weight: 1, reason: 'High and hopeful gets cleared by any centre-back with a chest — pick a body.' },
                    { text: 'Try to dribble past three defenders to score it yourself', weight: 1, reason: 'Ignoring free teammates for a solo run is why strikers get subbed.' },
                    { text: 'Kick it out of play accidentally', weight: 0, reason: "Standard cross technique matters — hitting the ball out is a wasted possession." },
                ],
            },
            {
                title: 'Blindside Run',
                topic: TOPICS.ATTACKING_MOVEMENT,
                caption:
                    "Your 10 is about to receive between the lines. Their centre-back is watching the ball, not you.",
                actors: [
                    { role: 'attack', label: '10', x1: 400, y1: 270, x2: 400, y2: 270 },
                    { role: 'defend', label: '', x1: 380, y1: 170, x2: 380, y2: 170 },
                    { role: 'attack', you: true, label: '9', x1: 460, y1: 220, x2: 380, y2: 95 },
                ],
                ball: { x1: 300, y1: 430, x2: 400, y2: 270 },
                question:
                    'What movement do you make?',
                choices: [
                    { text: "Drift into the centre-back's blindside and time the run in behind the moment your 10 lifts their head", weight: 3, reason: 'Blindside runs off the ball-watching centre-back are the striker classic — arrive when they can no longer react.' },
                    { text: 'Stand right in front of them where they can see you clearly', weight: 1, reason: 'Being watched is being marked — always find the spot they can not see.' },
                    { text: 'Drop back into midfield to help defensively', weight: 1, reason: 'Not the moment — your team needs a threat in behind now.' },
                    { text: 'Argue with the ref about an earlier decision', weight: 0, reason: "Complaining while the game plays on is how strikers miss the chance of the match." },
                ],
            },
            {
                title: 'Finishing on the Volley',
                topic: TOPICS.FINISHING,
                caption:
                    "A cross is dropping to you inside the six-yard box, waist height. The keeper is set on their line.",
                actors: [
                    { role: 'attack', you: true, label: '9', x1: 430, y1: 90, x2: 415, y2: 75 },
                    { role: 'defend', label: 'GK', x1: 400, y1: 50, x2: 400, y2: 50 },
                ],
                ball: { x1: 700, y1: 180, x2: 415, y2: 75 },
                question:
                    'How do you finish it?',
                choices: [
                    { text: "Get over the ball, keep the laces down, and side-foot or volley firm and low across the keeper", weight: 3, reason: 'Over the ball, laces down, low and firm across goal — clean strikers finish volleys that way.' },
                    { text: 'Lean back and try to smash the ball on the volley as hard as possible', weight: 1, reason: 'Leaning back sends it over the bar — technique first, power second.' },
                    { text: 'Try to head it into your own path and shoot on the second touch', weight: 1, reason: 'Extra touches in the six-yard box get blocked or crowded out.' },
                    { text: 'Let the ball bounce and then decide what to do', weight: 0, reason: "In the six-yard box, hesitation is a defender's best friend — take the finish on." },
                ],
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

// Number of scenarios shown in a single attempt (sampled from the position bank).
export const SCENARIOS_PER_ATTEMPT = 4;

// Sample N scenarios from a position's bank, shuffled, no repeats.
export function sampleScenarios(positionKey, n = SCENARIOS_PER_ATTEMPT) {
    const bank = POSITIONS[positionKey]?.scenarios ?? [];
    if (bank.length <= n) return [...bank];
    const idx = bank.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map((i) => bank[i]);
}

// Highest weight any choice can score.
export const MAX_WEIGHT = 3;