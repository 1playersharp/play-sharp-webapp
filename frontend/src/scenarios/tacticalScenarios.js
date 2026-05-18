export const SCENARIOS = [
  {
    id: "press_trigger_fullback",
    phase: "defensive",
    title: "4-3-3 High Press Structure",
    context:
      "Opposition build-up in a 4-2-3-1. Ball is at left CB with fullback free.",
    animation: {
      duration: 2500,
      focusZones: ["left_half_space", "fullback_lane"]
    },
    question: "What is the primary pressing trigger?",
    options: [
      {
        key: "A",
        label: "Ball goes to fullback",
        quality: 95,
        explanation:
          "Fullback reception is the trigger because it forces play wide and isolates the ball carrier."
      },
      {
        key: "B",
        label: "CB in possession centrally",
        quality: 70,
        explanation: "Too early — triggers are not yet activated centrally."
      },
      {
        key: "C",
        label: "GK short pass",
        quality: 80,
        explanation: "Secondary trigger but less stable than fullback cue."
      }
    ],
    coachingPoints: [
      "Trigger-based pressing",
      "Locking central lanes",
      "Forcing wide traps"
    ]
  },

  {
    id: "attacking_transition_wide",
    phase: "attacking",
    title: "Wide Overload Transition",
    context:
      "2v1 created on the left flank after turnover. Fullback is out of position.",
    animation: {
      duration: 2400,
      focusZones: ["wide_channel"]
    },
    question: "What is the best action?",
    options: [
      {
        key: "A",
        label: "Play into overlapping runner",
        quality: 95,
        explanation: "Maximises 2v1 advantage and breaks defensive structure."
      },
      {
        key: "B",
        label: "Dribble inside",
        quality: 60,
        explanation: "Removes width advantage and compresses space."
      },
      {
        key: "C",
        label: "Recycle possession",
        quality: 40,
        explanation: "Kills transition moment."
      }
    ],
    coachingPoints: ["Exploit overloads", "Width vs central risk"]
  },

  {
    id: "defensive_rest_shape",
    phase: "defensive",
    title: "Rest Defence (2-3 Structure)",
    context:
      "Your team is attacking. Opponent preparing counter with 3 forwards.",
    animation: {
      duration: 2500,
      focusZones: ["rest_defence_zone"]
    },
    question: "What is the priority?",
    options: [
      {
        key: "A",
        label: "Maintain rest defence structure",
        quality: 95,
        explanation:
          "Ensures counter-attack protection with balanced spacing behind the ball."
      },
      {
        key: "B",
        label: "Push fullbacks high",
        quality: 50,
        explanation: "Increases vulnerability in transition."
      },
      {
        key: "C",
        label: "Commit extra attackers",
        quality: 65,
        explanation: "Risk vs reward not controlled."
      }
    ],
    coachingPoints: ["Rest defence", "transition control"]
  }
];