// PlaySharp DNA — attribute catalogue, question bank and archetype library.
// Deliberately hand-tuned so every option contributes to 2 attributes and
// every archetype has clearly-different "signature" attributes for pick-up.

export const ATTRIBUTES = [
    { key: 'leadership',       label: 'Leadership'       },
    { key: 'creativity',       label: 'Creativity'       },
    { key: 'vision',           label: 'Vision'           },
    { key: 'decisionMaking',   label: 'Decision Making'  },
    { key: 'composure',        label: 'Composure'        },
    { key: 'competitiveness',  label: 'Competitiveness'  },
    { key: 'communication',    label: 'Communication'    },
    { key: 'teamwork',         label: 'Teamwork'         },
    { key: 'confidence',       label: 'Confidence'       },
    { key: 'adaptability',     label: 'Adaptability'     },
    { key: 'resilience',       label: 'Resilience'       },
    { key: 'gameIntelligence', label: 'Game Intelligence' },
];

export const ATTRIBUTE_KEYS = ATTRIBUTES.map((a) => a.key);

// Options award +1 to each listed attribute. The scoring engine converts
// the raw hit count into a 0–100 attribute score.
export const QUESTIONS = [
    {
        id: 'q1',
        prompt: 'Your team is losing late in a match. What feels most natural?',
        options: [
            { id: 'a', label: 'Demand the ball and inspire teammates',      awards: ['leadership', 'confidence'] },
            { id: 'b', label: 'Look for a defence-splitting pass',          awards: ['creativity', 'vision'] },
            { id: 'c', label: 'Stay patient and wait for the right moment', awards: ['composure', 'decisionMaking'] },
            { id: 'd', label: 'Push into dangerous areas looking to score', awards: ['competitiveness', 'confidence'] },
        ],
    },
    {
        id: 'q2',
        prompt: 'You receive the ball under pressure. What is your instinct?',
        options: [
            { id: 'a', label: 'Turn and attack the space behind',    awards: ['confidence', 'adaptability'] },
            { id: 'b', label: 'Play a quick, safe pass',             awards: ['decisionMaking', 'teamwork'] },
            { id: 'c', label: 'Shield the ball and win a foul',      awards: ['composure', 'resilience'] },
            { id: 'd', label: 'Scan first, then decide',             awards: ['vision', 'gameIntelligence'] },
        ],
    },
    {
        id: 'q3',
        prompt: 'A teammate makes a costly mistake. How do you respond?',
        options: [
            { id: 'a', label: 'Encourage them — reset their head',   awards: ['communication', 'teamwork'] },
            { id: 'b', label: 'Give them clear tactical advice',     awards: ['leadership', 'communication'] },
            { id: 'c', label: 'Stay focused, park it, move on',      awards: ['composure', 'resilience'] },
            { id: 'd', label: 'Take on more responsibility yourself', awards: ['leadership', 'confidence'] },
        ],
    },
    {
        id: 'q4',
        prompt: 'Before receiving the ball, what best describes you?',
        options: [
            { id: 'a', label: 'I already know my next action',        awards: ['gameIntelligence', 'decisionMaking'] },
            { id: 'b', label: 'I improvise depending on what unfolds', awards: ['creativity', 'adaptability'] },
            { id: 'c', label: 'I create space with a movement first',  awards: ['vision', 'gameIntelligence'] },
            { id: 'd', label: 'I communicate with a teammate',         awards: ['communication', 'leadership'] },
        ],
    },
    {
        id: 'q5',
        prompt: 'What gives you the biggest satisfaction?',
        options: [
            { id: 'a', label: 'Scoring a decisive goal',              awards: ['competitiveness', 'confidence'] },
            { id: 'b', label: 'Setting up a teammate to score',       awards: ['creativity', 'teamwork'] },
            { id: 'c', label: 'Winning a crucial tackle or duel',     awards: ['resilience', 'competitiveness'] },
            { id: 'd', label: 'Helping the team play better together', awards: ['leadership', 'teamwork'] },
        ],
    },
    {
        id: 'q6',
        prompt: 'Coach shouts a tactical instruction mid-game. You…',
        options: [
            { id: 'a', label: 'Execute it exactly',                    awards: ['teamwork', 'composure'] },
            { id: 'b', label: 'Adapt it to what I\'m seeing on the pitch', awards: ['adaptability', 'gameIntelligence'] },
            { id: 'c', label: 'Rally the group to execute together',   awards: ['leadership', 'communication'] },
            { id: 'd', label: 'Take initiative to exploit it further', awards: ['creativity', 'confidence'] },
        ],
    },
    {
        id: 'q7',
        prompt: 'You\'ve had a poor first half. At half-time you…',
        options: [
            { id: 'a', label: 'Rebuild focus and set myself targets',  awards: ['composure', 'resilience'] },
            { id: 'b', label: 'Volunteer to change role if it helps',  awards: ['adaptability', 'teamwork'] },
            { id: 'c', label: 'Speak up in the huddle',                awards: ['leadership', 'communication'] },
            { id: 'd', label: 'Study the opponent for a weakness',     awards: ['gameIntelligence', 'vision'] },
        ],
    },
    {
        id: 'q8',
        prompt: 'Final third, two options: safe pass or through-ball?',
        options: [
            { id: 'a', label: 'Play the through-ball',                 awards: ['creativity', 'confidence'] },
            { id: 'b', label: 'Play the safer pass',                   awards: ['decisionMaking', 'composure'] },
            { id: 'c', label: 'Delay a beat and scan again',           awards: ['vision', 'gameIntelligence'] },
            { id: 'd', label: 'Drive at goal myself',                  awards: ['competitiveness', 'confidence'] },
        ],
    },
];

export const ARCHETYPES = [
    {
        id: 'leader',
        name: 'Leader',
        icon: '🦁',
        tagline: 'Inspires teammates. Communicates constantly.',
        description:
            "You galvanise the group. Whether you're organising the back line or driving the tempo through the middle, your presence lifts everyone else's performance.",
        strengths: ['Leadership', 'Communication', 'Confidence'],
        weaknesses: [
            "Can over-invest in teammates' mistakes",
            'May take on too much responsibility',
        ],
        training: [
            'Decision-under-pressure drills',
            'Captain / vocal challenges',
            'Communication under fatigue',
        ],
        positions: ['CB', 'DM', 'CM'],
        signatureAttrs: ['leadership', 'communication', 'confidence'],
        accent: '#aa8119',
    },
    {
        id: 'creator',
        name: 'Creator',
        icon: '🎨',
        tagline: 'Sees opportunities others miss.',
        description:
            "You play the game one thought ahead. Where others see a wall, you see a lane — your best moments come when the picture is unclear.",
        strengths: ['Vision', 'Creativity', 'Adaptability'],
        weaknesses: ['May force low-percentage passes', 'Can drift out of defensive shape'],
        training: ['Between-the-lines scanning', 'Half-turn body shape', 'Decision under time pressure'],
        positions: ['AM', 'CM', 'W'],
        signatureAttrs: ['creativity', 'vision', 'adaptability'],
        accent: '#a72f6b',
    },
    {
        id: 'finisher',
        name: 'Finisher',
        icon: '🎯',
        tagline: 'Clinical. Decisive. Thrives in the box.',
        description:
            'Your instinct is the top corner. You compress the pitch into one moment and back yourself to convert it.',
        strengths: ['Competitiveness', 'Confidence', 'Decision Making'],
        weaknesses: ['Can go quiet outside the box', 'May shoot from low-percentage areas'],
        training: ['Finishing under fatigue', 'Blindside movement', 'Keeper reads'],
        positions: ['ST', 'W'],
        signatureAttrs: ['competitiveness', 'confidence', 'decisionMaking'],
        accent: '#DC1E28',
    },
    {
        id: 'playmaker',
        name: 'Playmaker',
        icon: '🎼',
        tagline: 'Controls tempo. Links the team.',
        description:
            "You're the metronome. You slow the game down when it needs to breathe and accelerate it when there's a gap. Everything flows through your feet.",
        strengths: ['Vision', 'Communication', 'Game Intelligence'],
        weaknesses: ['Can be pressed off the ball', 'Sometimes over-elaborates'],
        training: ['Press resistance', 'Progressive passing', 'Body shape on the ball'],
        positions: ['CM', 'DM', 'AM'],
        signatureAttrs: ['vision', 'communication', 'gameIntelligence'],
        accent: '#034781',
    },
    {
        id: 'strategist',
        name: 'Strategist',
        icon: '🧠',
        tagline: 'Reads the game two moves ahead.',
        description:
            'You solve the pitch. Positioning, timing, and pattern recognition are your edge — you rarely need to run further than the situation demands.',
        strengths: ['Game Intelligence', 'Decision Making', 'Composure'],
        weaknesses: ['May under-express creativity', 'Can look passive when the game is chaotic'],
        training: ['Tactical quiz depth', 'Scanning frequency', 'Pattern recognition'],
        positions: ['CB', 'DM', 'CM'],
        signatureAttrs: ['gameIntelligence', 'decisionMaking', 'composure'],
        accent: '#8b5cf6',
    },
    {
        id: 'visionary',
        name: 'Visionary',
        icon: '👁',
        tagline: 'Sees the pass before it opens.',
        description:
            "Your scanning is elite. Before the ball reaches you, you've already inventoried options, threats, and the next two moves.",
        strengths: ['Vision', 'Game Intelligence', 'Creativity'],
        weaknesses: ['Can be exposed if forced to carry alone', 'Physical duels may not be your strength'],
        training: ['Scan-before-receive drills', 'Third-man combinations', 'Between-lines receiving'],
        positions: ['AM', 'CM'],
        signatureAttrs: ['vision', 'gameIntelligence', 'creativity'],
        accent: '#23883C',
    },
    {
        id: 'accelerator',
        name: 'Accelerator',
        icon: '⚡',
        tagline: 'Fast thinker. Transitions quickly.',
        description:
            "You live in transition. The moment possession changes, you're already moving — and thinking. Your first action is almost always the right one.",
        strengths: ['Adaptability', 'Decision Making', 'Confidence'],
        weaknesses: ['Can lose focus in slow phases', 'May force pace when patience is needed'],
        training: ['Reaction sprints', 'Transition scenarios', 'First-touch direction'],
        positions: ['W', 'FB', 'AM'],
        signatureAttrs: ['adaptability', 'decisionMaking', 'confidence'],
        accent: '#ab5212',
    },
    {
        id: 'guardian',
        name: 'Guardian',
        icon: '🛡',
        tagline: 'Reliable. Disciplined. Protective.',
        description:
            "You're the anchor. Teammates play more freely because you cover the space behind them. Your value shows up in the clean sheets, not the highlights.",
        strengths: ['Resilience', 'Composure', 'Teamwork'],
        weaknesses: ['Can be reluctant to step out', 'May defer creative moments'],
        training: ['1v1 defending', 'Reading interceptions', 'Coordinated pressing'],
        positions: ['CB', 'DM', 'FB'],
        signatureAttrs: ['resilience', 'composure', 'teamwork'],
        accent: '#23883C',
    },
    {
        id: 'competitor',
        name: 'Competitor',
        icon: '🔥',
        tagline: 'Relentless. Thrives under pressure.',
        description:
            "You compete on every ball. Down 3-0 with five minutes left? You're still sprinting. Your standard raises the room.",
        strengths: ['Competitiveness', 'Resilience', 'Confidence'],
        weaknesses: ['Can drift into fouls when pressed', 'May over-engage when composure is needed'],
        training: ['Duel repetition', 'Pressing triggers', 'Recovery runs'],
        positions: ['ST', 'FB', 'DM'],
        signatureAttrs: ['competitiveness', 'resilience', 'confidence'],
        accent: '#9E0F17',
    },
    {
        id: 'gamechanger',
        name: 'Game Changer',
        icon: '🌪',
        tagline: 'Creates decisive moments.',
        description:
            "You bend games. When it's stuck, you make it move — a run, a shot, a moment of daring. You want the ball at 89 minutes.",
        strengths: ['Creativity', 'Confidence', 'Competitiveness'],
        weaknesses: ['Can go quiet when the game is compact', 'May force early shots'],
        training: ['Late-game decision drills', 'High-pressure finishing', '1v1 dribbling'],
        positions: ['W', 'AM', 'ST'],
        signatureAttrs: ['creativity', 'confidence', 'competitiveness'],
        accent: '#a72f6b',
    },
    {
        id: 'maestro',
        name: 'Maestro',
        icon: '🎭',
        tagline: 'Technically gifted. Elegant. Composed.',
        description:
            'Everything you do looks two touches easier than it should be. Composure on the ball, cleanest technique, quiet control of chaos.',
        strengths: ['Creativity', 'Composure', 'Game Intelligence'],
        weaknesses: ['May coast when duels are physical', 'Sometimes waits for the perfect ball'],
        training: ['First-touch away from pressure', 'Tempo drills', 'Body shape variety'],
        positions: ['AM', 'CM'],
        signatureAttrs: ['creativity', 'composure', 'gameIntelligence'],
        accent: '#8b5cf6',
    },
    {
        id: 'complete',
        name: 'Complete Footballer',
        icon: '💎',
        tagline: 'Balanced profile. No major weaknesses.',
        description:
            'You bring a strong baseline to every phase of the game — attacking, defending, transitioning, communicating. Coaches love you because you can be plugged in anywhere.',
        strengths: ['Balanced across all attributes'],
        weaknesses: ['No single elite specialism to lean on'],
        training: [
            'Position-agnostic decision drills',
            'Multi-role rotations',
            'Tactical quizzes across phases',
        ],
        positions: ['Any'],
        signatureAttrs: [], // resolved via balance metric in scoring.js
        accent: '#aa8119',
    },
];

export const getArchetype = (id) => ARCHETYPES.find((a) => a.id === id) || null;
