import { useState, useEffect, useRef, useCallback } from "react";
/* ─── 3D Scene ─────────────────────────────────────────────────── */
function DecisionGame3DScene({ players, pressurePoints, passingLanes, cameraConfig }) {
  const { cameraMode, showOverlays } = useEliteScene();

  return (
      <Canvas
          shadows
          camera={cameraConfig || { position: [0, 45, 65], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={["#1import { z } from 'zod';\n" +
        "\n" +
        "/**\n" +
        " * PlaySharp — Player data model.\n" +
        " *\n" +
        " * Design decisions baked in here (from the product discussion):\n" +
        " *  - The PLAYER is the atomic unit. Coach/team pages are just aggregations\n" +
        " *    over many players — they never own or mutate a player's plan.\n" +
        " *  - OBJECTIVES are the connective tissue. gameScores AND matchMetrics both\n" +
        " *    carry an `objectiveId`, which is what makes the \"trained in-app vs proven\n" +
        " *    on the pitch\" transfer loop queryable.\n" +
        " *  - Coach input is ADDITIVE and non-destructive: suggestions land alongside\n" +
        " *    the player's plan and can be accepted in, never overwritten over.\n" +
        " *  - Foundation (under-13) gets an AUTO-generated, position-driven plan.\n" +
        " *    Elite (13+) can self-author. Only the plan's *source* changes — the\n" +
        " *    `plan` field is identical either way, so there's no schema fork by age.\n" +
        " */\n" +
        "\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/* Enums / vocab                                                       */\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "\n" +
        "export const POSITIONS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'] as const;\n" +
        "export const PositionSchema = z.enum(POSITIONS);\n" +
        "export type Position = z.infer<typeof PositionSchema>;\n" +
        "\n" +
        "// Game tier is a *rendering* distinction (Foundation = React canvas,\n" +
        "// Elite = Three.js). It is deliberately SEPARATE from age — see\n" +
        "// resolvePlanSource() below. Keep them decoupled so a talented 12yo can be\n" +
        "// on Elite games while still on an auto plan.\n" +
        "export const GameTierSchema = z.enum(['foundation', 'elite']);\n" +
        "export type GameTier = z.infer<typeof GameTierSchema>;\n" +
        "\n" +
        "// Who authored the plan. Under-13 => 'auto', 13+ => 'self'.\n" +
        "export const PlanSourceSchema = z.enum(['auto', 'self']);\n" +
        "export type PlanSource = z.infer<typeof PlanSourceSchema>;\n" +
        "\n" +
        "export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;\n" +
        "export const DaySchema = z.enum(DAYS);\n" +
        "export type Day = z.infer<typeof DaySchema>;\n" +
        "\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/* Objective catalogue (fixed, per-position — NOT free text)           */\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/**\n" +
        " * Fixed catalogue chosen over freeform text so games and match metrics can\n" +
        " * reliably link back to an objective. A `note` field on the player's plan\n" +
        " * item covers the \"custom flavour\" case without breaking the linkage.\n" +
        " *\n" +
        " * `gameIds` are the PlaySharp games that train each objective — adjust these\n" +
        " * to your actual game registry keys.\n" +
        " */\n" +
        "export const OBJECTIVE_CATALOGUE = [\n" +
        "  // Goalkeeper\n" +
        "  { id: 'gk_shot_stopping',   label: 'Shot stopping & positioning', positions: ['GK'],             gameIds: ['reaction'] },\n" +
        "  { id: 'gk_distribution',    label: 'Distribution',                positions: ['GK'],             gameIds: ['pass_move'] },\n" +
        "  { id: 'gk_command_area',    label: 'Command of the area',         positions: ['GK'],             gameIds: ['scanning'] },\n" +
        "\n" +
        "  // Defending (centre-back / full-back)\n" +
        "  { id: 'def_interceptions',  label: 'Interceptions & reading play', positions: ['CB', 'FB', 'DM'], gameIds: ['pressing', 'decision'] },\n" +
        "  { id: 'def_tackling',       label: 'When to tackle',               positions: ['CB', 'FB', 'DM'], gameIds: ['pressing', 'decision'] },\n" +
        "  { id: 'def_heading',        label: 'Defensive heading',            positions: ['CB'],             gameIds: ['reaction'] },\n" +
        "  { id: 'def_marking',        label: 'Marking & body shape',         positions: ['CB', 'FB'],       gameIds: ['scanning', 'pressing'] },\n" +
        "  { id: 'def_1v1',            label: '1v1 defending',                positions: ['FB', 'CB'],       gameIds: ['decision'] },\n" +
        "  { id: 'def_overlap',        label: 'Overlapping runs',             positions: ['FB', 'W'],        gameIds: ['pass_move'] },\n" +
        "\n" +
        " // Midfield \n" +
        "  { id: 'mid_scanning',       label: 'Scanning before receiving',    positions: ['DM', 'CM', 'AM'], gameIds: ['scanning'] }, \n" +
        "  { id: 'mid_progression',    label: 'Progressive passing',          positions: ['DM', 'CM', 'AM'], gameIds: ['pass_move', 'decision'] },\n" +
        "  { id: 'mid_tempo',          label: 'Tempo control',                positions: ['CM', 'DM'],       gameIds: ['tactical_quiz', 'decision'] },\n" +
        "  { id: 'mid_receiving',      label: 'Receiving between the lines',  positions: ['AM', 'CM'],       gameIds: ['body_shape', 'scanning'] },\n" +
        "  { id: 'mid_press_resistance', label: 'Press resistance — receive & retain under pressure', positions: ['DM', 'CM', 'AM'], gameIds: ['body_shape', 'decision'] },\n" +
        "  { id: 'mid_positioning',    label: 'Positional intelligence — finding & occupying space',   positions: ['DM', 'CM', 'AM'], gameIds: ['scanning', 'pass_move', 'positioning'] },\n" +
        "  { id: 'mid_body_shape',     label: 'Body shape on the ball',       positions: ['DM', 'CM', 'AM'], gameIds: ['body_shape'] },\n" +
        "\n" +
        "  // Attacking (winger / striker)\n" +
        "  { id: 'att_dribbling_1v1',  label: '1v1 dribbling',                positions: ['W', 'AM'],        gameIds: ['reaction', 'decision'] },\n" +
        "  { id: 'att_crossing',       label: 'Crossing',                     positions: ['W', 'FB'],        gameIds: ['pass_move', 'crossing'] },\n" +
        "  { id: 'att_movement',       label: 'Movement off the ball',        positions: ['ST', 'AM', 'W'],  gameIds: ['scanning', 'striker'] },\n" +
        "  { id: 'att_finishing',      label: 'Finishing',                    positions: ['ST'],             gameIds: ['striker', 'reaction'] },\n" +
        "  { id: 'att_first_touch',    label: 'First touch & hold-up',        positions: ['ST', 'AM'],       gameIds: ['body_shape'] },\n" +
        "  { id: 'att_timing_runs',    label: 'Timing of runs',               positions: ['ST', 'W'],        gameIds: ['decision', 'striker'] },\n" +
        "] as const;\n" +
        "\n" +
        "export const OBJECTIVE_IDS = OBJECTIVE_CATALOGUE.map((o) => o.id) as [string, ...string[]];\n" +
        "export const ObjectiveIdSchema = z.enum(OBJECTIVE_IDS);\n" +
        "export type ObjectiveId = z.infer<typeof ObjectiveIdSchema>;\n" +
        "\n" +
        "/** Objectives available to a given position, in catalogue order. */\n" +
        "export function objectivesForPosition(position: Position) {\n" +
        "  return OBJECTIVE_CATALOGUE.filter((o) => (o.positions as readonly string[]).includes(position));\n" +
        "}\n" +
        "\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/* Sub-schemas                                                         */\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "\n" +
        "export const ProfileSchema = z.object({\n" +
        "  firstname: z.string(),\n" +
        "  lastname: z.string().optional(),\n" +
        "  age: z.number().int().min(5).max(40),\n" +
        "  gender: z.enum(['male', 'female', 'other', 'unspecified']).default('unspecified'),\n" +
        "  club: z.string().optional(),\n" +
        "});\n" +
        "export type Profile = z.infer<typeof ProfileSchema>;\n" +
        "\n" +
        "/** One entry in the weekly plan. References an objective + the game(s) for it. */\n" +
        "export const PlanItemSchema = z.object({\n" +
        "  id: z.string(),\n" +
        "  day: DaySchema,\n" +
        "  objectiveId: ObjectiveIdSchema,\n" +
        "  gameIds: z.array(z.string()),\n" +
        "  note: z.string().optional(), // custom flavour on top of the fixed objective\n" +
        "  done: z.boolean().default(false),\n" +
        "});\n" +
        "export type PlanItem = z.infer<typeof PlanItemSchema>;\n" +
        "\n" +
        "export const PlanSchema = z.object({\n" +
        "  source: PlanSourceSchema,          // 'auto' (Foundation) | 'self' (Elite)\n" +
        "  weekStartISO: z.string(),          // ISO date of the Monday this plan covers\n" +
        "  items: z.array(PlanItemSchema),\n" +
        "});\n" +
        "export type Plan = z.infer<typeof PlanSchema>;\n" +
        "\n" +
        "/** In-app result. Tagged with objectiveId so it lines up with match metrics. */\n" +
        "export const GameScoreSchema = z.object({\n" +
        "  id: z.string(),\n" +
        "  gameId: z.string(),\n" +
        "  objectiveId: ObjectiveIdSchema,\n" +
        "  score: z.number().min(0).max(100),\n" +
        "  reactionTimeMs: z.number().nullable().optional(),\n" +
        "  playedAtISO: z.string(),\n" +
        "});\n" +
        "export type GameScore = z.infer<typeof GameScoreSchema>;\n" +
        "\n" +
        "/** Real-match metric from Veo/Playmaker. Same objectiveId => transfer loop. */\n" +
        "export const MatchMetricSchema = z.object({\n" +
        "  id: z.string(),\n" +
        "  objectiveId: ObjectiveIdSchema,\n" +
        "  source: z.enum(['veo', 'playmaker', 'manual']).default('veo'),\n" +
        "  matchRef: z.string().optional(),   // opaque id/link to the match footage\n" +
        "  value: z.number(),                 // e.g. interceptions per game\n" +
        "  unit: z.string(),                  // e.g. 'per_game', 'percent', 'count'\n" +
        "  recordedAtISO: z.string(),\n" +
        "});\n" +
        "export type MatchMetric = z.infer<typeof MatchMetricSchema>;\n" +
        "\n" +
        "/**\n" +
        " * Coach observation/suggestion. ADDITIVE — never mutates the plan.\n" +
        " * `status: 'suggested'` can be accepted by the player, which spawns a PlanItem;\n" +
        " * the coach input itself stays as a record.\n" +
        " */\n" +
        "export const CoachInputSchema = z.object({\n" +
        "  id: z.string(),\n" +
        "  coachAccountId: z.string(),\n" +
        "  objectiveId: ObjectiveIdSchema.optional(), // optional: general note vs objective-specific\n" +
        "  kind: z.enum(['observation', 'suggestion']),\n" +
        "  text: z.string(),\n" +
        "  // For suggestions only: a proposed plan item the player can accept in.\n" +
        "  proposedGameIds: z.array(z.string()).optional(),\n" +
        "  status: z.enum(['open', 'accepted', 'dismissed']).default('open'),\n" +
        "  createdAtISO: z.string(),\n" +
        "});\n" +
        "export type CoachInput = z.infer<typeof CoachInputSchema>;\n" +
        "\n" +
        "/** Derived trend log — the delta per objective over time (auto-computed). */\n" +
        "export const ImprovementSchema = z.object({\n" +
        "  objectiveId: ObjectiveIdSchema,\n" +
        "  inAppDelta: z.number(),            // change in game score over window\n" +
        "  onPitchDelta: z.number().nullable(), // change in match metric (null if no Veo yet)\n" +
        "  windowStartISO: z.string(),\n" +
        "  windowEndISO: z.string(),\n" +
        "});\n" +
        "export type Improvement = z.infer<typeof ImprovementSchema>;\n" +
        "\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/* Player                                                              */\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "\n" +
        "export const PlayerSchema = z.object({\n" +
        "  id: z.string(),\n" +
        "\n" +
        "  // Ownership & the coach/team hook (the \"15-minute decision\" we flagged).\n" +
        "  ownerAccountId: z.string(),        // the player, or their parent account\n" +
        "  teamId: z.string().nullable().default(null), // optional — coach/team OBSERVES only\n" +
        "\n" +
        "  profile: ProfileSchema,\n" +
        "  position: PositionSchema,\n" +
        "  tier: GameTierSchema,              // rendering tier — decoupled from age\n" +
        "\n" +
        "  objectives: z.array(ObjectiveIdSchema), // active objectives for this player\n" +
        "  plan: PlanSchema.nullable().default(null),\n" +
        "\n" +
        "  gameScores: z.array(GameScoreSchema).default([]),\n" +
        "  matchMetrics: z.array(MatchMetricSchema).default([]),\n" +
        "  improvements: z.array(ImprovementSchema).default([]),\n" +
        "\n" +
        "  coachInputs: z.array(CoachInputSchema).default([]), // additive, non-destructive\n" +
        "});\n" +
        "export type Player = z.infer<typeof PlayerSchema>;\n" +
        "\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "/* Helpers: age gating + auto plan generation                          */\n" +
        "/* ------------------------------------------------------------------ */\n" +
        "\n" +
        "/**\n" +
        " * Under-13 => auto plan, 13+ => self-authored. This governs plan AUTHORING\n" +
        " * only; it is intentionally independent of game `tier`.\n" +
        " */\n" +
        "export function resolvePlanSource(age: number): PlanSource {\n" +
        "  return age < 13 ? 'auto' : 'self';\n" +
        "}\n" +
        "\n" +
        "/**\n" +
        " * Position-driven default plan for Foundation (and the starting scaffold a\n" +
        " * self-authoring Elite player can then edit). Spreads that position's\n" +
        " * objectives across a few days so the kid just shows up and plays.\n" +
        " */\n" +
        "export function generateAutoPlan(\n" +
        "  position: Position,\n" +
        "  weekStartISO: string,\n" +
        "  opts: { sessionsPerWeek?: number } = {},\n" +
        "): Plan {\n" +
        "  const sessions = opts.sessionsPerWeek ?? 3;\n" +
        "  const objectives = objectivesForPosition(position);\n" +
        "  const planDays: Day[] = ['mon', 'wed', 'fri', 'tue', 'thu', 'sat', 'sun'];\n" +
        "\n" +
        "  const items: PlanItem[] = Array.from({ length: sessions }).map((_, i) => {\n" +
        "    const obj = objectives[i % objectives.length];\n" +
        "    return {\n" +
        "      id: `${weekStartISO}-${i}`,\n" +
        "      day: planDays[i % planDays.length],\n" +
        "      objectiveId: obj.id,\n" +
        "      gameIds: [...obj.gameIds],\n" +
        "      done: false,\n" +
        "    };\n" +
        "  });\n" +
        "\n" +
        "  return { source: 'auto', weekStartISO, items };\n" +
        "}\n" +
        "\n" +
        "/** Convenience: build a fresh player with sensible defaults from a profile. */\n" +
        "export function createPlayer(input: {\n" +
        "  id: string;\n" +
        "  ownerAccountId: string;\n" +
        "  profile: Profile;\n" +
        "  position: Position;\n" +
        "  tier?: GameTier;\n" +
        "  weekStartISO: string;\n" +
        "}): Player {\n" +
        "  const planSource = resolvePlanSource(input.profile.age);\n" +
        "  const objectives = objectivesForPosition(input.position).map((o) => o.id);\n" +
        "\n" +
        "  return PlayerSchema.parse({\n" +
        "    id: input.id,\n" +
        "    ownerAccountId: input.ownerAccountId,\n" +
        "    teamId: null,\n" +
        "    profile: input.profile,\n" +
        "    position: input.position,\n" +
        "    tier: input.tier ?? (input.profile.age < 13 ? 'foundation' : 'elite'),\n" +
        "    objectives,\n" +
        "    // Foundation gets a ready-made plan; Elite starts null and self-authors\n" +
        "    // (or accepts the auto plan as a starting scaffold).\n" +
        "    plan: planSource === 'auto'\n" +
        "      ? generateAutoPlan(input.position, input.weekStartISO)\n" +
        "      : null,\n" +
        "    gameScores: [],\n" +
        "    matchMetrics: [],\n" +
        "    improvements: [],\n" +
        "    coachInputs: [],\n" +
        "  });\n" +
        "}e1e1e"]} />

        <EnvironmentSetup />

        <Pitch3D />
        <Ball position={[0, 0.22, 0]} />

        {players.map(p => (
            <PlayerModel
                key={p.id}
                id={p.id}
                position={[p.pos[0], p.pos[1], p.pos[2]]}
                isScanning={p.isScanning}
                isReceivingBall={p.isReceivingBall}
                isUnderPressure={p.isUnderPressure}
                orientation={p.role === 'attacker' ? 0.2 : 0}
            />
        ))}

        <TacticalOverlaySystem
            showPressure={showOverlays}
            showPassingLanes={showOverlays}
            pressurePoints={pressurePoints}
            passingLanes={passingLanes}
        />

        <BroadcastCameraSystem
            mode={cameraMode}
            focus={[0, 0, 0]}
            smooth={true}
        />
      </Canvas>
  );
}

/* ─── Option Button ────────────────────────────────────────────── */
function OptionButton({ option, onPick, disabled }) {
  const colors = { A: '#2ead3c', B: '#ff9500', C: '#3aa3ff', D: '#dc1e28' };
  const col = colors[option.key] || '#ffffff';

  return (
      <button
          onClick={() => !disabled && onPick(option)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            border: `2px solid ${col}`,
            background: 'rgba(0,0,0,0.88)',
            borderRadius: 0,
            overflow: 'hidden',
            padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            opacity: disabled ? 0.5 : 1,
            transition: 'transform 0.1s, box-shadow 0.1s',
            width: '100%',
          }}
          onMouseEnter={e => {
            if (!disabled) e.currentTarget.style.boxShadow = `0 0 12px 2px ${col}55`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none';
          }}
      >
      <span style={{
        background: col,
        color: option.key === 'B' ? '#000' : '#fff',
        fontWeight: 900,
        fontSize: 18,
        padding: '8px 14px',
        minWidth: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {option.key}
      </span>
        <span style={{
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          padding: '8px 14px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'left',
          lineHeight: 1.3,
        }}>
        {option.label}
          {option.recommended && (
              <span style={{ display: 'block', fontSize: 9, color: col, letterSpacing: '0.15em', marginTop: 2 }}>
            ★ COACH RECOMMENDED
          </span>
          )}
      </span>
      </button>
  );
}

/* ─── Feedback Panel ───────────────────────────────────────────── */
function FeedbackPanel({ picked, scenario, onNext, isLast }) {
  const recommended = scenario.options.find(o => o.recommended);
  const isCorrect   = picked.key === recommended?.key;
  const borderCol   = isCorrect ? '#2ead3c' : '#dc1e28';

  return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 20,
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: '#080e0a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: `4px solid ${borderCol}`,
          padding: '28px 30px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {/* Verdict */}
          <p style={{
            fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: borderCol, margin: '0 0 12px',
          }}>
            {isCorrect ? '✓ Coach\'s call' : '✗ Coach\'s note'}
          </p>

          {/* Your pick */}
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Your call · {picked.key} — {picked.label}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', margin: '0 0 18px', lineHeight: 1.7 }}>
            {picked.reason}
          </p>

          {/* Coach recommendation (if different) */}
          {!isCorrect && recommended && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  Preferred · {recommended.key} — {recommended.label}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.65 }}>
                  {recommended.reason}
                </p>
              </div>
          )}

          {/* Next button */}
          <button
              onClick={onNext}
              style={{
                marginTop: isCorrect ? 20 : 0,
                width: '100%',
                padding: '12px 0',
                background: 'transparent',
                border: `1px solid ${borderCol}`,
                color: borderCol,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${borderCol}18`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {isLast ? 'Finish Session ›' : 'Next Scenario ›'}
          </button>
        </div>
      </div>
  );
}

/* ─── Main Export ──────────────────────────────────────────────── */
export default function DecisionGame3D() {
  const navigate  = useNavigate();
  const [idx,     setIdx]     = useState(0);
  const [picked,  setPicked]  = useState(null);   // chosen option object
  const [results, setResults] = useState([]);

  const scenario = SCENARIOS_3D[idx];
  const isLast   = idx === SCENARIOS_3D.length - 1;

  /* Filter passingLanes to show all during deciding,
     highlight only chosen lane during feedback          */
  const visibleLanes = picked
      ? scenario.passingLanes.filter((_, i) =>
          i === scenario.options.find(o => o.key === picked.key)?.laneIndex
      )
      : scenario.passingLanes;

  const handlePick = useCallback((option) => {
    if (picked) return;
    setPicked(option);
    setResults(prev => [...prev, {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      picked: option.key,
      matchesRecommended: !!option.recommended,
    }]);
  }, [picked, scenario]);

  const handleNext = useCallback(() => {
    setPicked(null);
    if (isLast) {
      const score = Math.round(
          (results.filter(r => r.matchesRecommended).length / SCENARIOS_3D.length) * 100
      );
      navigate('/demo', { state: { score, results } });
    } else {
      setIdx(i => i + 1);
    }
  }, [isLast, navigate, results]);

  return (
      <EliteSceneWrapper
          title={`Decision Game — ${scenario.title}`}
          subtitle={scenario.subtitle}
          onBack={() => navigate('/demo')}
          showControls={true}
      >
        {/* 3D viewport */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <DecisionGame3DScene
              key={scenario.id}          /* remounts Canvas when scenario changes */
              players={scenario.players}
              pressurePoints={scenario.pressurePoints}
              passingLanes={visibleLanes}
              cameraConfig={scenario.camera}
          />

          {/* HUD — top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 18px',
            background: 'rgba(0,0,0,0.65)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            fontFamily: "'JetBrains Mono', monospace",
            pointerEvents: 'none',
            zIndex: 10,
          }}>
          <span style={{ fontSize: 10, letterSpacing: '0.22em', color: '#dc1e28', textTransform: 'uppercase' }}>
            Decision Drill
          </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
            SCENARIO {idx + 1} / {SCENARIOS_3D.length} — {scenario.title.toUpperCase()}
          </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {SCENARIOS_3D.map((_, i) => (
                  <span key={i} style={{
                    width: 22, height: 3,
                    background: i < idx
                        ? '#2ead3c'
                        : i === idx
                            ? '#dc1e28'
                            : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s',
                  }} />
              ))}
            </div>
          </div>

          {/* Question + options — bottom panel */}
          {!picked && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.82)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                padding: '14px 18px',
                fontFamily: "'JetBrains Mono', monospace",
                zIndex: 10,
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  margin: '0 0 12px',
                }}>
              <span style={{ color: '#dc1e28', marginRight: 8, fontSize: 9, letterSpacing: '0.2em' }}>
                DECIDE ›
              </span>
                  {scenario.question}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scenario.options.map(opt => (
                      <div key={opt.key} style={{ flex: '1 1 200px', minWidth: 160 }}>
                        <OptionButton option={opt} onPick={handlePick} disabled={false} />
                      </div>
                  ))}
                </div>
              </div>
          )}

          {/* Feedback overlay */}
          {picked && (
              <FeedbackPanel
                  picked={picked}
                  scenario={scenario}
                  onNext={handleNext}
                  isLast={isLast}
              />
          )}
        </div>
      </EliteSceneWrapper>
  );
import { useGameStore } from "../../../shared/state/gameStore";

/**
 * FOUNDATION MODE: Refactored Pass & Move
 * Keeps original Canvas logic but integrated into the dual-tier store.
 */
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  pitch:"#1e5c2f", pitchLight:"#225e32", pitchDark:"#1a5229",
  line:"rgba(255,255,255,0.55)",
  bg:"#040810", border:"rgba(255,255,255,0.09)",
  accent:"#c8f020", accentBlue:"#3cb4f0", accentRed:"#f03c3c", accentAmber:"#f0a020",
  you:"#ff8c00",
  text:"#e8eef4", muted:"rgba(232,238,244,0.44)",
};

// Per-decision slot colours (pass arrows + target rings)
const DEC_COLS = ["#3cb4f0", "#c8f020", "#f0a020"];

// ─────────────────────────────────────────────────────────────────────────────
// MATH / EASING
// ─────────────────────────────────────────────────────────────────────────────
const ease = {
  outCubic:  t => 1 - Math.pow(1-t, 3),
  inOutQuad: t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2,
};
const lerp  = (a,b,t) => a + (b-a)*t;
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const dist2 = (ax,ay,bx,by) => Math.sqrt((ax-bx)**2 + (ay-by)**2);

// ─────────────────────────────────────────────────────────────────────────────
// PERSPECTIVE PROJECTION
// ─────────────────────────────────────────────────────────────────────────────
const CAM = { horizon: 0.26 };
function project(nx, ny, W, H) {
  const py = CAM.horizon + ny * (1 - CAM.horizon);
  const px = lerp(W*0.5, W*nx, (py - CAM.horizon) / (1 - CAM.horizon));
  return { x: px, y: py*H, s: py };
}

// ─────────────────────────────────────────────────────────────────────────────
// KITS
// ─────────────────────────────────────────────────────────────────────────────
const KITS = {
  att: { primary:"#1a5cbf", secondary:"#0a3a8a", shorts:"#0a0f1a", sock:"#1a5cbf", outline:"#0a3060", skin:"#c8855a" },
  def: { primary:"#bf1a1a", secondary:"#8a0a0a", shorts:"#1a0a0a", sock:"#bf1a1a", outline:"#600a0a", skin:"#d4a070" },
  gk:  { primary:"#f0a020", secondary:"#c07010", shorts:"#1a1008", sock:"#f0a020", outline:"#806010", skin:"#c8855a" },
  you: { primary:"#c8f020", secondary:"#8ab010", shorts:"#141a04", sock:"#c8f020", outline:"#608000", skin:"#c8855a" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS
// decisions[i].targetNx/Ny  = pass destination (arrow endpoint + ring on that player)
// moveOptions[i].moveToNx/Ny = space YOU can move into (shown after pass)
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id:1, category:"ATTACKING", title:"Third-Man Run",
    context:"65' — 0-0 — Central midfielder receives under press. Striker drops short pulling CB. Winger accelerates blindside behind the line.",
    coachingConcept:"Third-man combinations manipulate defensive structure. The striker is the decoy — pulling the CB creates the channel. Release must be instant; window is 0.8–1.2 seconds.",
    bestDecisionIdx:1, bestMoveIdx:0,
    bestDecisionReason:"Bounce to striker then instant vertical release exploits the gap created by the CB stepping. Holding destroys the timing window.",
    scanRequirement:"Check shoulder — identify winger's run and CB position before receiving",
    overlays:["passingLanes","scanCone","pressureZone","thirdManArrow"],
    players:[
      { id:"you", kit:"you", role:"CM",  nx:0.50, ny:0.52, hasBall:true,  isUser:true },
      { id:"st",  kit:"att", role:"ST",  nx:0.50, ny:0.38 },
      { id:"lw",  kit:"att", role:"LW",  nx:0.20, ny:0.35 },
      { id:"ram", kit:"att", role:"RAM", nx:0.72, ny:0.48 },
      { id:"lb",  kit:"att", role:"LB",  nx:0.18, ny:0.55 },
      { id:"dmc", kit:"def", role:"DM",  nx:0.50, ny:0.45, isOpp:true },
      { id:"cb1", kit:"def", role:"CB",  nx:0.44, ny:0.32, isOpp:true },
      { id:"cb2", kit:"def", role:"CB",  nx:0.56, ny:0.32, isOpp:true },
      { id:"rb",  kit:"def", role:"RB",  nx:0.26, ny:0.36, isOpp:true },
      { id:"gk",  kit:"gk",  role:"GK",  nx:0.50, ny:0.18, isOpp:true },
    ],
    // pass decisions: targetNx/Ny point toward the nearest teammate/zone
    decisions:[
      { label:"Square — recycle right",    key:"square", risk:"LOW",  rating:"C",  targetNx:0.72, targetNy:0.48, targetPlayerId:"ram" },
      { label:"Bounce + vertical release", key:"third",  risk:"HIGH", rating:"A+", targetNx:0.50, targetNy:0.38, targetPlayerId:"st"  },
      { label:"Hold — wait for run",       key:"hold",   risk:"MED",  rating:"D",  targetNx:0.50, targetNy:0.52, targetPlayerId:null  },
    ],
    // movement spaces shown after pass — placed in clear open areas
    moveOptions:[
      { key:"support", label:"Support run",        moveToNx:0.42, moveToNy:0.41, rating:"A+" },
      { key:"wide",    label:"Break wide left",    moveToNx:0.28, moveToNy:0.50, rating:"B"  },
      { key:"stay",    label:"Hold position",      moveToNx:0.60, moveToNy:0.58, rating:"C"  },
    ],
    animations:{
      third:[
        { id:"st",  toNx:0.50, toNy:0.44, delay:0,    dur:0.55 },
        { id:"lw",  toNx:0.22, toNy:0.26, delay:0.32, dur:0.85 },
        { id:"cb1", toNx:0.44, toNy:0.38, delay:0.10, dur:0.50 },
      ],
      square:[
        { id:"ram", toNx:0.68, toNy:0.48, delay:0,    dur:0.40 },
        { id:"dmc", toNx:0.58, toNy:0.44, delay:0.10, dur:0.40 },
        { id:"lw",  toNx:0.22, toNy:0.33, delay:0,    dur:0.50 },
      ],
      hold:[
        { id:"lw",  toNx:0.20, toNy:0.29, delay:0,    dur:0.90 },
        { id:"cb2", toNx:0.50, toNy:0.28, delay:0.20, dur:0.60 },
        { id:"rb",  toNx:0.22, toNy:0.30, delay:0.30, dur:0.50 },
        { id:"dmc", toNx:0.50, toNy:0.48, delay:0.10, dur:0.40 },
      ],
    },
  },

  {
    id:2, category:"ATTACKING", title:"Blindside Box Entry",
    context:"78' — 0-1 — Winger near right byline. Striker drives near-post pulling two defenders. AM arrives at penalty spot completely untracked.",
    coachingConcept:"Defenders ball-watching at near post. Late runner exploits the blindside. Low cutback to penalty spot is highest xG (0.38 vs 0.08 for cross).",
    bestDecisionIdx:0, bestMoveIdx:0,
    bestDecisionReason:"Low cutback catches defensive shape at its most disorganised. Defenders oriented near-post. Late runner arrives unmarked.",
    scanRequirement:"Check shoulder — identify the late runner before reaching the byline",
    overlays:["xGZones","cutbackLane","defensiveOrientation","blindsideIndicator"],
    players:[
      { id:"you", kit:"you", role:"RW", nx:0.88, ny:0.60, hasBall:true, isUser:true },
      { id:"st",  kit:"att", role:"ST", nx:0.72, ny:0.44 },
      { id:"am",  kit:"att", role:"AM", nx:0.60, ny:0.58 },
      { id:"lb2", kit:"att", role:"LW", nx:0.30, ny:0.55 },
      { id:"cm2", kit:"att", role:"CM", nx:0.52, ny:0.65 },
      { id:"cb1", kit:"def", role:"CB", nx:0.68, ny:0.38, isOpp:true },
      { id:"cb2", kit:"def", role:"CB", nx:0.76, ny:0.35, isOpp:true },
      { id:"rb2", kit:"def", role:"RB", nx:0.84, ny:0.42, isOpp:true },
      { id:"lbd", kit:"def", role:"LB", nx:0.50, ny:0.38, isOpp:true },
      { id:"gk",  kit:"gk",  role:"GK", nx:0.72, ny:0.22, isOpp:true },
    ],
    decisions:[
      { label:"Low cutback — penalty spot", key:"cutback", risk:"HIGH", rating:"A+", targetNx:0.60, targetNy:0.52, targetPlayerId:"am"  },
      { label:"Cross to near post",         key:"cross",   risk:"MED",  rating:"C",  targetNx:0.72, targetNy:0.40, targetPlayerId:"st"  },
      { label:"Drive inside for shot",      key:"drive",   risk:"LOW",  rating:"B-", targetNx:0.76, targetNy:0.56, targetPlayerId:null  },
    ],
    moveOptions:[
      { key:"second", label:"Second-ball",      moveToNx:0.70, moveToNy:0.62, rating:"A+" },
      { key:"post",   label:"Attack far post",  moveToNx:0.56, moveToNy:0.50, rating:"B"  },
      { key:"stay",   label:"Stay byline",      moveToNx:0.82, moveToNy:0.70, rating:"C"  },
    ],
    animations:{
      cutback:[
        { id:"am",  toNx:0.68, toNy:0.52, delay:0,    dur:0.70 },
        { id:"cb1", toNx:0.72, toNy:0.40, delay:0.10, dur:0.50 },
        { id:"cb2", toNx:0.80, toNy:0.38, delay:0.10, dur:0.50 },
        { id:"gk",  toNx:0.74, toNy:0.26, delay:0.20, dur:0.40 },
      ],
      cross:[
        { id:"st",  toNx:0.72, toNy:0.36, delay:0,    dur:0.50 },
        { id:"cb1", toNx:0.70, toNy:0.34, delay:0.05, dur:0.40 },
        { id:"gk",  toNx:0.72, toNy:0.24, delay:0.10, dur:0.40 },
      ],
      drive:[
        { id:"rb2", toNx:0.78, toNy:0.46, delay:0.05, dur:0.50 },
        { id:"cb1", toNx:0.72, toNy:0.40, delay:0.10, dur:0.40 },
      ],
    },
  },

  {
    id:3, category:"DEFENDING", title:"Defending the Cutback",
    context:"52' — 1-1 — Opposition winger at byline. Three attackers flood the box — near-post, central, far-post. Prioritise intelligently.",
    coachingConcept:"Cutback to penalty spot averages 0.32 xG — most dangerous delivery from byline. Resist near-post fixation. Maintain penalty-spot coverage.",
    bestDecisionIdx:1, bestMoveIdx:0,
    bestDecisionReason:"Holding the penalty spot blocks the highest-probability threat. Near-post covered by GK. Rushing near-post catastrophically exposes the spot.",
    scanRequirement:"Scan all three runners — identify highest xG threat before committing",
    overlays:["dangerZones","cutbackLane","xGZones","compactnessIndicator"],
    players:[
      { id:"you",   kit:"you", role:"CB",  nx:0.50, ny:0.36, hasBall:false, isUser:true },
      { id:"cb2d",  kit:"att", role:"CB2", nx:0.62, ny:0.36 },
      { id:"rbdef", kit:"att", role:"RB",  nx:0.76, ny:0.42 },
      { id:"lbdef", kit:"att", role:"LB",  nx:0.30, ny:0.42 },
      { id:"gkd",   kit:"gk",  role:"GK",  nx:0.50, ny:0.20 },
      { id:"owin",  kit:"def", role:"RW",  nx:0.88, ny:0.58, hasBall:true, isOpp:true },
      { id:"ost",   kit:"def", role:"ST",  nx:0.66, ny:0.42, isOpp:true },
      { id:"oam",   kit:"def", role:"AM",  nx:0.50, ny:0.50, isOpp:true },
      { id:"olw",   kit:"def", role:"LW",  nx:0.32, ny:0.44, isOpp:true },
    ],
    decisions:[
      { label:"Attack near-post",       key:"nearpost", risk:"HIGH", rating:"D",  targetNx:0.74, targetNy:0.36, targetPlayerId:"owin" },
      { label:"Hold penalty spot",      key:"block",    risk:"LOW",  rating:"A+", targetNx:0.52, targetNy:0.42, targetPlayerId:"oam"  },
      { label:"Track far-post runner",  key:"farpost",  risk:"MED",  rating:"C",  targetNx:0.32, targetNy:0.44, targetPlayerId:"olw"  },
    ],
    moveOptions:[
      { key:"compact", label:"Block cutback lane",  moveToNx:0.50, moveToNy:0.44, rating:"A+" },
      { key:"cover",   label:"Cover CB2 channel",   moveToNx:0.66, moveToNy:0.46, rating:"B"  },
      { key:"engage",  label:"Engage attacker",     moveToNx:0.36, moveToNy:0.48, rating:"C"  },
    ],
    animations:{
      block:[
        { id:"you",   toNx:0.52, toNy:0.40, delay:0,    dur:0.50 },
        { id:"cb2d",  toNx:0.64, toNy:0.38, delay:0,    dur:0.50 },
        { id:"rbdef", toNx:0.78, toNy:0.46, delay:0.10, dur:0.40 },
        { id:"oam",   toNx:0.52, toNy:0.46, delay:0.20, dur:0.50 },
        { id:"gkd",   toNx:0.54, toNy:0.22, delay:0.10, dur:0.40 },
      ],
      nearpost:[
        { id:"you",   toNx:0.72, toNy:0.38, delay:0,    dur:0.50 },
        { id:"oam",   toNx:0.52, toNy:0.46, delay:0.20, dur:0.40 },
        { id:"ost",   toNx:0.64, toNy:0.38, delay:0.10, dur:0.40 },
      ],
      farpost:[
        { id:"you",   toNx:0.38, toNy:0.38, delay:0,    dur:0.55 },
        { id:"oam",   toNx:0.52, toNy:0.46, delay:0.20, dur:0.40 },
        { id:"ost",   toNx:0.62, toNy:0.38, delay:0.10, dur:0.40 },
      ],
    },
  },

  {
    id:4, category:"DEFENDING", title:"High Press Trigger",
    context:"38' — 1-0 — Opponent CB receives facing own goal, first touch poor. Team compact 35m from goal. Press trigger conditions met.",
    coachingConcept:"Press triggers: poor touch, back to goal, no progressive pass. Coordinated press covers lanes simultaneously. Timing window: 0.6–1.0 seconds.",
    bestDecisionIdx:0, bestMoveIdx:0,
    bestDecisionReason:"Immediate coordinated press isolates the CB. Press angles cut lateral escape. One triggers, one screens DM lane, one covers GK.",
    scanRequirement:"Identify poor touch and back-to-goal body shape before pressing",
    overlays:["pressingArrows","coverShadow","passingLanes"],
    players:[
      { id:"you",  kit:"you", role:"CF",  nx:0.48, ny:0.40, isUser:true },
      { id:"ss",   kit:"att", role:"SS",  nx:0.56, ny:0.42 },
      { id:"lwa",  kit:"att", role:"LW",  nx:0.30, ny:0.38 },
      { id:"cma",  kit:"att", role:"CM",  nx:0.50, ny:0.52 },
      { id:"cma2", kit:"att", role:"CM2", nx:0.60, ny:0.52 },
      { id:"ocb",  kit:"def", role:"CB",  nx:0.50, ny:0.30, hasBall:true, isOpp:true },
      { id:"ocb2", kit:"def", role:"CB2", nx:0.60, ny:0.28, isOpp:true },
      { id:"odm",  kit:"def", role:"DM",  nx:0.50, ny:0.40, isOpp:true },
      { id:"ogk",  kit:"gk",  role:"GK",  nx:0.50, ny:0.16, isOpp:true },
      { id:"orb",  kit:"def", role:"RB",  nx:0.72, ny:0.30, isOpp:true },
    ],
    decisions:[
      { label:"Coordinated press now",     key:"press", risk:"HIGH", rating:"A+", targetNx:0.50, targetNy:0.30, targetPlayerId:"ocb"  },
      { label:"Hold — wait for ball",      key:"hold",  risk:"LOW",  rating:"C",  targetNx:0.48, targetNy:0.52, targetPlayerId:null   },
      { label:"Half-press — close softly", key:"half",  risk:"MED",  rating:"B-", targetNx:0.50, targetNy:0.34, targetPlayerId:"ocb"  },
    ],
    moveOptions:[
      { key:"press2",  label:"Win ball",         moveToNx:0.38, moveToNy:0.32, rating:"A+" },
      { key:"screen",  label:"Screen DM lane",   moveToNx:0.62, moveToNy:0.34, rating:"B"  },
      { key:"recover", label:"Hold shape",       moveToNx:0.34, moveToNy:0.46, rating:"C"  },
    ],
    animations:{
      press:[
        { id:"you",  toNx:0.50, toNy:0.32, delay:0,    dur:0.55 },
        { id:"ss",   toNx:0.56, toNy:0.36, delay:0.05, dur:0.50 },
        { id:"lwa",  toNx:0.34, toNy:0.32, delay:0.10, dur:0.50 },
        { id:"cma",  toNx:0.50, toNy:0.44, delay:0.10, dur:0.50 },
        { id:"ocb",  toNx:0.50, toNy:0.26, delay:0.15, dur:0.40 },
        { id:"odm",  toNx:0.50, toNy:0.36, delay:0.20, dur:0.45 },
      ],
      hold:[
        { id:"odm",  toNx:0.52, toNy:0.38, delay:0.30, dur:0.50 },
        { id:"ocb",  toNx:0.50, toNy:0.34, delay:0.20, dur:0.60 },
        { id:"you",  toNx:0.48, toNy:0.42, delay:0,    dur:0.30 },
      ],
      half:[
        { id:"you",  toNx:0.50, toNy:0.34, delay:0,    dur:0.60 },
        { id:"odm",  toNx:0.52, toNy:0.38, delay:0.20, dur:0.45 },
        { id:"ocb",  toNx:0.46, toNy:0.28, delay:0.10, dur:0.50 },
        { id:"ss",   toNx:0.54, toNy:0.40, delay:0.05, dur:0.45 },
      ],
    },
  },

  {
    id:5, category:"TRANSITION", title:"Counter Attack 3v2",
    context:"89' — 1-2 — Ball recovered centrally after corner. Three attackers vs two recovering defenders. Central lane protected. Window: 4–6 seconds.",
    coachingConcept:"3v2 requires patience — draw the defensive commitment before releasing. Carrier commits the deeper defender. Wide options must time runs to stay onside.",
    bestDecisionIdx:2, bestMoveIdx:1,
    bestDecisionReason:"Wide right pass — deeper defender steps centrally. Wide pass bypasses both for a 1v0 chance.",
    scanRequirement:"Read defender body shape — who is stepping, who holds the line",
    overlays:["transitionSpeed","offsideLine","overloadHighlight"],
    players:[
      { id:"you",   kit:"you", role:"CM", nx:0.46, ny:0.60, hasBall:true, isUser:true },
      { id:"lw2",   kit:"att", role:"LW", nx:0.28, ny:0.50 },
      { id:"rw2",   kit:"att", role:"RW", nx:0.66, ny:0.50 },
      { id:"odef1", kit:"def", role:"CB", nx:0.44, ny:0.42, isOpp:true },
      { id:"odef2", kit:"def", role:"RB", nx:0.60, ny:0.44, isOpp:true },
      { id:"ogk2",  kit:"gk",  role:"GK", nx:0.50, ny:0.18, isOpp:true },
      { id:"odm2",  kit:"def", role:"DM", nx:0.52, ny:0.56, isOpp:true },
    ],
    decisions:[
      { label:"Shoot early",      key:"shoot", risk:"MED",  rating:"C",  targetNx:0.50, targetNy:0.38, targetPlayerId:null    },
      { label:"Drive centrally",  key:"drive", risk:"MED",  rating:"B-", targetNx:0.48, targetNy:0.46, targetPlayerId:null    },
      { label:"Pass wide right",  key:"wide",  risk:"HIGH", rating:"A+", targetNx:0.66, targetNy:0.50, targetPlayerId:"rw2"  },
    ],
    moveOptions:[
      { key:"overlap", label:"Overlap right",   moveToNx:0.66, moveToNy:0.58, rating:"B"  },
      { key:"support", label:"Support central", moveToNx:0.38, moveToNy:0.54, rating:"A+" },
      { key:"hold",    label:"Hold midfield",   moveToNx:0.30, moveToNy:0.64, rating:"C"  },
    ],
    animations:{
      wide:[
        { id:"rw2",   toNx:0.70, toNy:0.40, delay:0,    dur:0.70 },
        { id:"odef1", toNx:0.44, toNy:0.36, delay:0.10, dur:0.60 },
        { id:"odef2", toNx:0.62, toNy:0.40, delay:0.15, dur:0.55 },
        { id:"lw2",   toNx:0.28, toNy:0.42, delay:0,    dur:0.60 },
      ],
      drive:[
        { id:"odef1", toNx:0.46, toNy:0.38, delay:0.10, dur:0.50 },
        { id:"odef2", toNx:0.56, toNy:0.40, delay:0.10, dur:0.50 },
        { id:"rw2",   toNx:0.66, toNy:0.42, delay:0,    dur:0.50 },
        { id:"lw2",   toNx:0.28, toNy:0.44, delay:0,    dur:0.45 },
      ],
      shoot:[
        { id:"odef1", toNx:0.46, toNy:0.38, delay:0,    dur:0.40 },
        { id:"odef2", toNx:0.52, toNy:0.38, delay:0.05, dur:0.40 },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
function createAnimState(sc) {
  const players = {};
  sc.players.forEach(p => {
    players[p.id] = {
      ...p, cx:p.nx, cy:p.ny, nx:p.nx, ny:p.ny,
      tx:p.nx, ty:p.ny, progress:1, elapsed:0, delay:0, duration:0.5,
      legPhase: Math.random()*6.28, moving:false, facingRight:true,
    };
  });
  return {
    players, globalT:0,
    ball:{ active:false, fromX:0,fromY:0, toX:0,toY:0, progress:0, trail:[] },
    phase:"idle", animDone:false,
  };
}

function triggerAnims(as, list) {
  list.forEach(a => {
    const p = as.players[a.id]; if(!p) return;
    p.tx=a.toNx; p.ty=a.toNy; p.duration=a.dur; p.delay=a.delay;
    p.elapsed=0; p.progress=0; p.moving=true;
    p.facingRight = (a.toNx >= p.cx);
  });
  as.phase="animating"; as.animDone=false;
}

function tickAnim(as, dt) {
  as.globalT += dt;
  let anyMoving = false;
  Object.values(as.players).forEach(p => {
    if(p.progress >= 1) {
      const ph = as.globalT*1.1 + p.legPhase;
      p.cx += Math.sin(ph)*0.0016*dt*8;
      p.cy += Math.cos(ph*0.8)*0.0010*dt*6;
      p.legPhase += dt*0.55; return;
    }
    p.elapsed += dt;
    const raw = clamp((p.elapsed - p.delay)/p.duration, 0, 1);
    if(raw <= 0) return;
    const et = ease.outCubic(raw);
    p.cx = lerp(p.nx, p.tx, et);
    p.cy = lerp(p.ny, p.ty, et);
    p.legPhase += dt*4.8;
    if(raw >= 1) { p.nx=p.tx; p.ny=p.ty; p.cx=p.tx; p.cy=p.ty; p.progress=1; p.moving=false; }
    anyMoving = true;
  });
  if(as.ball.active) {
    as.ball.progress = Math.min(as.ball.progress + dt*2.0, 1);
    if(as.ball.progress >= 1) as.ball.active = false;
  }
  if(as.phase==="animating" && !anyMoving && !as.ball.active) {
    as.phase="done"; as.animDone=true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR UTIL
// ─────────────────────────────────────────────────────────────────────────────
function lc(hex, amt) {
  const n = parseInt(hex.replace("#",""), 16);
  return `rgb(${clamp(((n>>16)&0xff)+amt,0,255)},${clamp(((n>>8)&0xff)+amt,0,255)},${clamp((n&0xff)+amt,0,255)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW PITCH
// ─────────────────────────────────────────────────────────────────────────────
function drawPitch(ctx, W, H) {
  for(let i=0;i<10;i++){
    ctx.fillStyle = i%2===0 ? T.pitchLight : T.pitchDark;
    ctx.fillRect(0, i*(H/10), W, H/10);
  }
  const vig = ctx.createRadialGradient(W/2,H*0.5,H*0.04,W/2,H*0.5,W*0.75);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.42)");
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

  ctx.strokeStyle=T.line;
  const pl=(x1,y1,x2,y2,a=1,lw=1.3)=>{
    const A=project(x1,y1,W,H),B=project(x2,y2,W,H);
    ctx.save();ctx.globalAlpha=a;ctx.lineWidth=lw;
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.restore();
  };
  const pr=(x1,y1,x2,y2,a=1)=>{pl(x1,y1,x2,y1,a);pl(x2,y1,x2,y2,a);pl(x2,y2,x1,y2,a);pl(x1,y2,x1,y1,a);};
  const parc=(cx,cy,r,s,e,a=1)=>{
    const C=project(cx,cy,W,H),R=project(cx+r,cy,W,H);
    ctx.save();ctx.globalAlpha=a;ctx.beginPath();ctx.arc(C.x,C.y,Math.abs(R.x-C.x),s,e);ctx.stroke();ctx.restore();
  };
  pr(0.04,0.05,0.96,0.95);
  pl(0.04,0.50,0.96,0.50);
  parc(0.50,0.50,0.10,0,Math.PI*2);
  const cs=project(0.50,0.50,W,H);
  ctx.beginPath();ctx.arc(cs.x,cs.y,3,0,Math.PI*2);ctx.fillStyle=T.line;ctx.fill();
  pr(0.18,0.05,0.82,0.18);pr(0.18,0.82,0.82,0.95);
  pr(0.34,0.05,0.66,0.12);pr(0.34,0.88,0.66,0.95);
  pr(0.42,0.03,0.58,0.05,0.65);pr(0.42,0.95,0.58,0.97,0.65);
  [[0.50,0.13],[0.50,0.87]].forEach(([nx,ny])=>{
    const pt=project(nx,ny,W,H);
    ctx.beginPath();ctx.arc(pt.x,pt.y,2.5,0,Math.PI*2);
    ctx.fillStyle=T.line;ctx.save();ctx.globalAlpha=0.6;ctx.fill();ctx.restore();
  });
  parc(0.50,0.13,0.10,0.52,2.62,0.55);parc(0.50,0.87,0.10,Math.PI+0.52,Math.PI+2.62,0.55);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW PLAYER — with YOU orange ring, coloured target rings, always-visible role label
// ─────────────────────────────────────────────────────────────────────────────
function drawPlayer(ctx, px, py, s, kit, isUser, legPhase, moving, facingRight, hasBall, ringColor, animT) {
  ctx.save();
  const K = KITS[kit] ?? KITS.att;
  const BH=18*s, BW=12*s, HR=6.5*s, LEG=11*s, FOOT=4.5*s;
  const flip = facingRight ? 1 : -1;
  const swing = moving
    ? Math.sin(legPhase*Math.PI*2)*0.42
    : Math.sin(legPhase*Math.PI*2)*0.05;

  // shadow
  ctx.save(); ctx.globalAlpha=0.20;
  ctx.fillStyle="#000";
  ctx.beginPath();ctx.ellipse(px+4*s,py+21*s,11*s,3.5*s,0,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // legs
  const legY0 = py+BH*0.5;
  for(const side of [-1,1]){
    const ls=side*swing;
    ctx.save();ctx.translate(px+side*BW*0.30,legY0);ctx.rotate(ls);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,LEG*0.6);
    ctx.strokeStyle=K.sock;ctx.lineWidth=5*s;ctx.lineCap="round";ctx.stroke();
    ctx.beginPath();ctx.ellipse(ls*FOOT*0.85,LEG*0.6,FOOT,FOOT*0.38,-side*flip*0.2,0,Math.PI*2);
    ctx.fillStyle="#111";ctx.fill();ctx.restore();
  }

  // body
  const bg=ctx.createLinearGradient(px-BW/2,py-BH/2,px+BW/2,py+BH/2);
  bg.addColorStop(0,lc(K.primary,24));bg.addColorStop(0.5,K.primary);bg.addColorStop(1,lc(K.primary,-12));
  ctx.beginPath();ctx.roundRect(px-BW/2,py-BH/2,BW,BH,[4*s,4*s,1,1]);
  ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle=K.outline;ctx.lineWidth=0.9;ctx.stroke();
  // stripe
  ctx.beginPath();ctx.roundRect(px-2.2*s,py-BH/2,4.4*s,BH,[2*s,2*s,0,0]);
  ctx.fillStyle=K.secondary;ctx.save();ctx.globalAlpha=0.50;ctx.fill();ctx.restore();
  // collar
  ctx.beginPath();ctx.arc(px,py-BH/2+3*s,3.5*s,Math.PI,0);
  ctx.strokeStyle=K.outline;ctx.lineWidth=1;ctx.stroke();
  // shorts
  ctx.beginPath();ctx.rect(px-BW/2-0.5,py+BH/2-2,BW+1,6.5*s);
  ctx.fillStyle=K.shorts;ctx.fill();

  // arms
  const armSwing=moving?-swing*0.45:0;
  for(const side of [-1,1]){
    ctx.save();ctx.translate(px+side*BW/2,py-BH*0.12);
    ctx.rotate(side*(0.30-armSwing*side*flip));
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*flip*3*s,9*s);
    ctx.strokeStyle=K.primary;ctx.lineWidth=4*s;ctx.lineCap="round";ctx.stroke();
    ctx.restore();
  }

  // neck + head
  ctx.beginPath();ctx.rect(px-2.5*s,py-BH/2-4*s,5*s,5*s);ctx.fillStyle=K.skin;ctx.fill();
  const hg=ctx.createRadialGradient(px-1.5*s,py-BH/2-HR-2*s,0.5,px,py-BH/2-HR,HR);
  hg.addColorStop(0,lc(K.skin,16));hg.addColorStop(1,K.skin);
  ctx.beginPath();ctx.arc(px,py-BH/2-HR,HR,0,Math.PI*2);
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle=lc(K.skin,-18);ctx.lineWidth=0.6;ctx.stroke();
  ctx.beginPath();ctx.arc(px,py-BH/2-HR,HR,Math.PI+0.1,-0.1);
  ctx.fillStyle=lc(K.skin,-40);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.58)";
  ctx.beginPath();ctx.arc(px-2*s,py-BH/2-HR+1.2*s,1*s,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(px+2*s,py-BH/2-HR+1.2*s,1*s,0,Math.PI*2);ctx.fill();

  // ball
  if(hasBall){
    const bx=px+(HR+6)*s*flip, by=py-BH*0.08;
    ctx.save();
    ctx.beginPath();ctx.ellipse(bx+1.5,by+5*s,4.5*s,1.8*s,0,0,Math.PI*2);
    ctx.fillStyle="rgba(0,0,0,0.18)";ctx.globalAlpha=0.45;ctx.fill();ctx.globalAlpha=1;
    const bg2=ctx.createRadialGradient(bx-2*s,by-2*s,0.5,bx,by,4.5*s);
    bg2.addColorStop(0,"#fff");bg2.addColorStop(0.65,"#eee");bg2.addColorStop(1,"#aaa");
    ctx.beginPath();ctx.arc(bx,by,4.5*s,0,Math.PI*2);ctx.fillStyle=bg2;ctx.fill();
    ctx.strokeStyle="#333";ctx.lineWidth=0.6;ctx.stroke();
    ctx.strokeStyle="rgba(40,40,40,0.45)";ctx.lineWidth=0.5;
    for(let a=0;a<3;a++){ctx.beginPath();ctx.arc(bx,by,4.5*s,a*2.1,a*2.1+1.7);ctx.stroke();}
    ctx.restore();
  }

  // ── YOU ring (orange, pulsing) ──
  if(isUser){
    const pulse = 0.65 + Math.sin(animT*3.5)*0.35;
    ctx.save();
    ctx.globalAlpha=pulse*0.90;
    ctx.beginPath();ctx.arc(px,py,BW*1.35,0,Math.PI*2);
    ctx.strokeStyle=T.you;ctx.lineWidth=3.2;ctx.stroke();
    ctx.globalAlpha=0.13;ctx.fillStyle=T.you;ctx.fill();
    ctx.restore();
  }

  // ── Pass-target / move-target coloured ring ──
  if(ringColor && !isUser){
    const pulse2 = 0.55 + Math.sin(animT*4.2+1.2)*0.45;
    ctx.save();
    ctx.globalAlpha=pulse2*0.88;
    ctx.beginPath();ctx.arc(px,py,BW*1.30,0,Math.PI*2);
    ctx.strokeStyle=ringColor;ctx.lineWidth=2.8;ctx.stroke();
    ctx.globalAlpha=0.11;ctx.fillStyle=ringColor;ctx.fill();
    ctx.restore();
  }

  // ── "YOU" label above ring (orange pill) ──
  if(isUser){
    ctx.save();
    ctx.font=`bold 9px 'IBM Plex Mono',monospace`;
    const tw=ctx.measureText("YOU").width, pw=tw+10, ph=14;
    const lx=px-pw/2, ly=py-BH/2-HR-ph-8*s;
    ctx.fillStyle="rgba(3,6,14,0.94)";
    ctx.beginPath();ctx.roundRect(lx,ly,pw,ph,3);ctx.fill();
    ctx.strokeStyle=T.you;ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle=T.you;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("YOU",px,ly+ph/2);
    ctx.restore();
  }

  // ── Role label pill (always visible) ──
  ctx.save();
  ctx.font=`bold ${isUser?9:8}px 'IBM Plex Mono',monospace`;
  const role = arguments[12]; // passed as 13th arg
  const tw2=ctx.measureText(role).width, pw2=tw2+8, ph2=12;
  const labelY = py+BH/2+LEG*0.62+6*s;
  ctx.fillStyle="rgba(3,6,14,0.92)";
  ctx.beginPath();ctx.roundRect(px-pw2/2,labelY,pw2,ph2,3);ctx.fill();
  const labelBorder = isUser ? T.you : ringColor ? ringColor : "rgba(255,255,255,0.28)";
  ctx.strokeStyle=labelBorder;ctx.lineWidth=0.85;ctx.stroke();
  ctx.fillStyle = isUser ? T.you : ringColor ? ringColor : "rgba(255,255,255,0.75)";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(role,px,labelY+ph2/2);
  ctx.restore();

  ctx.restore();
}

// Wrapper that pulls role from player data
function drawPlayerFromData(ctx, p, W, H, ringColor, animT) {
  const pt = project(p.cx, p.cy, W, H);
  const s  = lerp(0.62, 1.18, p.cy);
  // call drawPlayer with role as 13th argument (hack since ctx doesn't support named params)
  drawPlayerWithRole(ctx, pt.x, pt.y, s, p.kit, !!p.isUser, p.legPhase, p.moving,
    p.facingRight !== false, p.hasBall, ringColor, animT, p.role);
}

function drawPlayerWithRole(ctx, px, py, s, kit, isUser, legPhase, moving, facingRight, hasBall, ringColor, animT, role) {
  ctx.save();
  const K = KITS[kit] ?? KITS.att;
  const BH=18*s, BW=12*s, HR=6.5*s, LEG=11*s, FOOT=4.5*s;
  const flip = facingRight ? 1 : -1;
  const swing = moving
    ? Math.sin(legPhase*Math.PI*2)*0.42
    : Math.sin(legPhase*Math.PI*2)*0.05;

  // shadow
  ctx.save();ctx.globalAlpha=0.20;ctx.fillStyle="#000";
  ctx.beginPath();ctx.ellipse(px+4*s,py+21*s,11*s,3.5*s,0,0,Math.PI*2);ctx.fill();ctx.restore();

  // legs
  const legY0=py+BH*0.5;
  for(const side of [-1,1]){
    const ls=side*swing;
    ctx.save();ctx.translate(px+side*BW*0.30,legY0);ctx.rotate(ls);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,LEG*0.6);
    ctx.strokeStyle=K.sock;ctx.lineWidth=5*s;ctx.lineCap="round";ctx.stroke();
    ctx.beginPath();ctx.ellipse(ls*FOOT*0.85,LEG*0.6,FOOT,FOOT*0.38,-side*flip*0.2,0,Math.PI*2);
    ctx.fillStyle="#111";ctx.fill();ctx.restore();
  }

  // body gradient
  const bg=ctx.createLinearGradient(px-BW/2,py-BH/2,px+BW/2,py+BH/2);
  bg.addColorStop(0,lc(K.primary,24));bg.addColorStop(0.5,K.primary);bg.addColorStop(1,lc(K.primary,-12));
  ctx.beginPath();ctx.roundRect(px-BW/2,py-BH/2,BW,BH,[4*s,4*s,1,1]);
  ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle=K.outline;ctx.lineWidth=0.9;ctx.stroke();
  ctx.beginPath();ctx.roundRect(px-2.2*s,py-BH/2,4.4*s,BH,[2*s,2*s,0,0]);
  ctx.fillStyle=K.secondary;ctx.save();ctx.globalAlpha=0.50;ctx.fill();ctx.restore();
  ctx.beginPath();ctx.arc(px,py-BH/2+3*s,3.5*s,Math.PI,0);
  ctx.strokeStyle=K.outline;ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.rect(px-BW/2-0.5,py+BH/2-2,BW+1,6.5*s);
  ctx.fillStyle=K.shorts;ctx.fill();

  // arms
  const armSwing=moving?-swing*0.45:0;
  for(const side of [-1,1]){
    ctx.save();ctx.translate(px+side*BW/2,py-BH*0.12);
    ctx.rotate(side*(0.30-armSwing*side*flip));
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*flip*3*s,9*s);
    ctx.strokeStyle=K.primary;ctx.lineWidth=4*s;ctx.lineCap="round";ctx.stroke();
    ctx.restore();
  }

  // head
  ctx.beginPath();ctx.rect(px-2.5*s,py-BH/2-4*s,5*s,5*s);ctx.fillStyle=K.skin;ctx.fill();
  const hg=ctx.createRadialGradient(px-1.5*s,py-BH/2-HR-2*s,0.5,px,py-BH/2-HR,HR);
  hg.addColorStop(0,lc(K.skin,16));hg.addColorStop(1,K.skin);
  ctx.beginPath();ctx.arc(px,py-BH/2-HR,HR,0,Math.PI*2);
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle=lc(K.skin,-18);ctx.lineWidth=0.6;ctx.stroke();
  ctx.beginPath();ctx.arc(px,py-BH/2-HR,HR,Math.PI+0.1,-0.1);ctx.fillStyle=lc(K.skin,-40);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.58)";
  ctx.beginPath();ctx.arc(px-2*s,py-BH/2-HR+1.2*s,1*s,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(px+2*s,py-BH/2-HR+1.2*s,1*s,0,Math.PI*2);ctx.fill();

  // ball
  if(hasBall){
    const bx=px+(HR+6)*s*flip,by=py-BH*0.08;
    ctx.save();
    ctx.beginPath();ctx.ellipse(bx+1.5,by+5*s,4.5*s,1.8*s,0,0,Math.PI*2);
    ctx.fillStyle="rgba(0,0,0,0.18)";ctx.globalAlpha=0.45;ctx.fill();ctx.globalAlpha=1;
    const bg2=ctx.createRadialGradient(bx-2*s,by-2*s,0.5,bx,by,4.5*s);
    bg2.addColorStop(0,"#fff");bg2.addColorStop(0.65,"#eee");bg2.addColorStop(1,"#aaa");
    ctx.beginPath();ctx.arc(bx,by,4.5*s,0,Math.PI*2);ctx.fillStyle=bg2;ctx.fill();
    ctx.strokeStyle="#333";ctx.lineWidth=0.6;ctx.stroke();
    ctx.strokeStyle="rgba(40,40,40,0.45)";ctx.lineWidth=0.5;
    for(let a=0;a<3;a++){ctx.beginPath();ctx.arc(bx,by,4.5*s,a*2.1,a*2.1+1.7);ctx.stroke();}
    ctx.restore();
  }

  // ── YOU orange ring ──
  if(isUser){
    const pulse=0.65+Math.sin(animT*3.5)*0.35;
    ctx.save();
    ctx.globalAlpha=pulse*0.90;
    ctx.beginPath();ctx.arc(px,py,BW*1.35,0,Math.PI*2);
    ctx.strokeStyle=T.you;ctx.lineWidth=3.2;ctx.stroke();
    ctx.globalAlpha=0.13;ctx.fillStyle=T.you;ctx.fill();
    ctx.restore();

    // "YOU" badge
    ctx.save();
    ctx.font=`bold 9px 'IBM Plex Mono',monospace`;
    const yw=ctx.measureText("YOU").width,ypw=yw+10,yph=14;
    const ylx=px-ypw/2, yly=py-BH/2-HR-yph-8*s;
    ctx.fillStyle="rgba(3,6,14,0.94)";
    ctx.beginPath();ctx.roundRect(ylx,yly,ypw,yph,3);ctx.fill();
    ctx.strokeStyle=T.you;ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle=T.you;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("YOU",px,yly+yph/2);
    ctx.restore();
  }

  // ── Coloured target ring (pass/move target, not YOU) ──
  if(ringColor && !isUser){
    const pulse2=0.55+Math.sin(animT*4.2+1.2)*0.45;
    ctx.save();
    ctx.globalAlpha=pulse2*0.90;
    ctx.beginPath();ctx.arc(px,py,BW*1.30,0,Math.PI*2);
    ctx.strokeStyle=ringColor;ctx.lineWidth=2.8;ctx.stroke();
    ctx.globalAlpha=0.12;ctx.fillStyle=ringColor;ctx.fill();
    ctx.restore();
  }

  // ── Role label (always visible, coloured border if ring) ──
  ctx.save();
  ctx.font=`bold ${isUser?9:8}px 'IBM Plex Mono',monospace`;
  const tw=ctx.measureText(role).width, pw=tw+8, ph=12;
  const labelY=py+BH/2+LEG*0.62+6*s;
  ctx.fillStyle="rgba(3,6,14,0.92)";
  ctx.beginPath();ctx.roundRect(px-pw/2,labelY,pw,ph,3);ctx.fill();
  ctx.strokeStyle = isUser ? T.you : ringColor ? ringColor : "rgba(255,255,255,0.28)";
  ctx.lineWidth=0.85;ctx.stroke();
  ctx.fillStyle = isUser ? T.you : ringColor ? ringColor : "rgba(255,255,255,0.74)";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(role,px,labelY+ph/2);
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW TRAVELLING BALL
// ─────────────────────────────────────────────────────────────────────────────
function drawBall(ctx, W, H, ball) {
  if(!ball.active) return;
  const t=ease.inOutQuad(ball.progress);
  const gx=lerp(ball.fromX,ball.toX,t), gy=lerp(ball.fromY,ball.toY,t);
  const arc=Math.sin(t*Math.PI)*-0.055;
  const bpt=project(gx,gy+arc,W,H), gpt=project(gx,gy,W,H);

  ball.trail.forEach((tr,i)=>{
    const tp=project(tr.x,tr.y,W,H);
    ctx.beginPath();ctx.arc(tp.x,tp.y,2.0,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${((i+1)/ball.trail.length)*0.30})`;ctx.fill();
  });
  if(ball.progress>0.02&&ball.progress<0.96){
    ball.trail.push({x:gx,y:gy+arc});if(ball.trail.length>10)ball.trail.shift();
  }
  ctx.save();ctx.globalAlpha=0.15*(1-Math.sin(t*Math.PI)*0.55);
  ctx.beginPath();ctx.ellipse(gpt.x+2,gpt.y+3,5,2,0,0,Math.PI*2);ctx.fillStyle="#000";ctx.fill();ctx.restore();
  const spin=ball.progress*Math.PI*10;
  ctx.save();ctx.translate(bpt.x,bpt.y);ctx.rotate(spin);
  const bg=ctx.createRadialGradient(-2,-2,0.5,0,0,5.5);
  bg.addColorStop(0,"#fff");bg.addColorStop(1,"#bbb");
  ctx.beginPath();ctx.arc(0,0,5.5,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle="#333";ctx.lineWidth=0.65;ctx.stroke();
  ctx.strokeStyle="rgba(50,50,50,0.42)";ctx.lineWidth=0.55;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,5.5,i*2.1,i*2.1+1.7);ctx.stroke();}
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW PASS ARROWS — shaft + arrowhead + "PASS A/B/C" label on arrow
// ─────────────────────────────────────────────────────────────────────────────
function drawPassArrows(ctx, W, H, sc, as, hovered, animT) {
  const you=as.players["you"]; if(!you) return;
  const fromPt=project(you.cx,you.cy,W,H);
  const letters=["A","B","C"];

  sc.decisions.forEach((dec,i)=>{
    const col=DEC_COLS[i];
    const letter=letters[i];
    const isHov=hovered===i;
    const toPt=project(dec.targetNx,dec.targetNy,W,H);
    const dx=toPt.x-fromPt.x, dy=toPt.y-fromPt.y;
    const d=Math.sqrt(dx*dx+dy*dy); if(d<1) return;
    const ux=dx/d, uy=dy/d;
    const sx=fromPt.x+ux*30, sy=fromPt.y+uy*30;
    const ex=toPt.x-ux*20,   ey=toPt.y-uy*20;
    const dashOff=-(animT*22)%16;
    const alpha=isHov?1.0:0.78;

    // hover glow
    if(isHov){
      ctx.save();ctx.globalAlpha=0.16;ctx.strokeStyle=col;ctx.lineWidth=20;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();ctx.restore();
    }

    // shaft
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=col;
    ctx.lineWidth=isHov?3.4:2.6;ctx.lineCap="round";
    ctx.setLineDash([10,5]);ctx.lineDashOffset=dashOff;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.setLineDash([]);ctx.lineDashOffset=0;

    // arrowhead
    const angle=Math.atan2(ey-sy,ex-sx);
    ctx.translate(ex,ey);ctx.rotate(angle);
    ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-14,-5.5);ctx.lineTo(-11,0);ctx.lineTo(-14,5.5);ctx.closePath();ctx.fill();
    ctx.restore();

    // origin dot
    ctx.save();ctx.globalAlpha=alpha*0.75;
    ctx.beginPath();ctx.arc(sx,sy,4.5,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.restore();

    // ── "PASS A/B/C" label — pill on the arrow midpoint, offset perpendicularly ──
    // perpendicular offset so label sits beside the shaft not on top of it
    const midX=(sx+ex)/2, midY=(sy+ey)/2;
    const perpX=-uy*22, perpY=ux*22;   // offset to the side
    const lx=midX+perpX, ly=midY+perpY;
    const tag=`PASS ${letter}`;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.font=`bold 9px 'IBM Plex Mono',monospace`;
    const tw=ctx.measureText(tag).width;
    const pw=tw+12, ph=16;
    // pill background
    ctx.fillStyle="rgba(3,6,14,0.95)";
    ctx.beginPath();ctx.roundRect(lx-pw/2,ly-ph/2,pw,ph,4);ctx.fill();
    // pill border in matching colour
    ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.stroke();
    // text
    ctx.fillStyle=col;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(tag,lx,ly);
    ctx.restore();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW MOVE ARROWS — dashed arrow + large space zone + "MOVE A/B/C" badge
// ─────────────────────────────────────────────────────────────────────────────
function drawMoveArrows(ctx, W, H, sc, as, hovered, chosenMoveIdx, animT) {
  const you=as.players["you"]; if(!you) return;
  const fromPt=project(you.cx,you.cy,W,H);
  const letters=["A","B","C"];

  sc.moveOptions.forEach((mo,i)=>{
    const col=DEC_COLS[i];
    const letter=letters[i];
    const isHov=hovered===i;
    const isChosen=chosenMoveIdx===i;
    const toPt=project(mo.moveToNx,mo.moveToNy,W,H);
    const dx=toPt.x-fromPt.x, dy=toPt.y-fromPt.y;
    const d=Math.sqrt(dx*dx+dy*dy); if(d<4) return;
    const ux=dx/d, uy=dy/d;
    const sx=fromPt.x+ux*28, sy=fromPt.y+uy*28;
    const ex=toPt.x-ux*38,   ey=toPt.y-uy*38;
    const alpha=chosenMoveIdx!==null?(isChosen?1.0:0.14):(isHov?1.0:0.72);
    const dashOff=isChosen?0:-(animT*18)%16;
    const zonePulse=isChosen?1.0:(0.6+Math.sin(animT*3.8+i*1.3)*0.4);
    const zr=34;

    // ── Space zone: filled + pulsing outer ring + inner ring ──
    ctx.save();
    ctx.globalAlpha=alpha*(isHov||isChosen?0.26:0.13);
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(toPt.x,toPt.y,zr,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=alpha*zonePulse*(isHov||isChosen?0.90:0.60);
    ctx.strokeStyle=col;ctx.lineWidth=isHov||isChosen?3.0:2.2;
    ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.arc(toPt.x,toPt.y,zr,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha=alpha*(isHov||isChosen?0.45:0.28);
    ctx.strokeStyle=col;ctx.lineWidth=1.0;
    ctx.beginPath();ctx.arc(toPt.x,toPt.y,zr-9,0,Math.PI*2);ctx.stroke();
    ctx.restore();

    // ── "MOVE A" badge above zone ──
    const badgeY=toPt.y-zr-12;
    const mTag=`MOVE ${letter}`;
    ctx.save();
    ctx.globalAlpha=alpha*(isHov||isChosen?1.0:0.85);
    ctx.font=`bold 9.5px 'IBM Plex Mono',monospace`;
    const mtw=ctx.measureText(mTag).width, mpw=mtw+14, mph=18;
    ctx.fillStyle="rgba(3,6,14,0.96)";
    ctx.beginPath();ctx.roundRect(toPt.x-mpw/2,badgeY-mph/2,mpw,mph,4);ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.stroke();
    ctx.fillStyle=col;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(mTag,toPt.x,badgeY);
    ctx.restore();

    // ── Description label below zone ──
    const descY=toPt.y+zr+13;
    ctx.save();
    ctx.globalAlpha=alpha*0.80;
    ctx.font=`bold 7.5px 'IBM Plex Mono',monospace`;
    const dtw=ctx.measureText(mo.label).width, dpw=dtw+10, dph=13;
    ctx.fillStyle="rgba(3,6,14,0.90)";
    ctx.beginPath();ctx.roundRect(toPt.x-dpw/2,descY-dph/2,dpw,dph,3);ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=0.7;ctx.stroke();
    ctx.fillStyle=col;ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(mo.label,toPt.x,descY);
    ctx.restore();

    // ── Arrow shaft from YOU to zone ──
    if(isHov&&chosenMoveIdx===null){
      ctx.save();ctx.globalAlpha=0.14;ctx.strokeStyle=col;ctx.lineWidth=20;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=col;
    ctx.lineWidth=isHov||isChosen?3.4:2.6;ctx.lineCap="round";
    ctx.setLineDash(isChosen?[]:[10,5]);ctx.lineDashOffset=dashOff;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
    ctx.setLineDash([]);ctx.lineDashOffset=0;
    const angle=Math.atan2(ey-sy,ex-sx);
    ctx.translate(ex,ey);ctx.rotate(angle);
    ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-14,-5.5);ctx.lineTo(-11,0);ctx.lineTo(-14,5.5);ctx.closePath();ctx.fill();
    ctx.restore();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW TACTICAL OVERLAYS
// ─────────────────────────────────────────────────────────────────────────────
function drawOverlays(ctx, W, H, sc, as, animT, show) {
  if(!show) return;
  const {players}=as, ovs=sc.overlays??[];

  const zone=(nx,ny,rx,ry,color,a=0.14)=>{
    const c=project(nx,ny,W,H);
    const rpx=Math.abs(project(nx+rx,ny,W,H).x-c.x);
    const rpy=Math.abs(project(nx,ny+ry,W,H).y-c.y);
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle=color;
    ctx.beginPath();ctx.ellipse(c.x,c.y,rpx,rpy,0,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  const pArr=(x1,y1,x2,y2,col,a=0.7,lw=1.8,dashed=true)=>{
    const A=project(x1,y1,W,H),B=project(x2,y2,W,H);
    const ang=Math.atan2(B.y-A.y,B.x-A.x);
    ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=lw;
    if(dashed)ctx.setLineDash([6,5]);
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
    ctx.setLineDash([]);ctx.fillStyle=col;ctx.translate(B.x,B.y);ctx.rotate(ang);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-9,-3.5);ctx.lineTo(-7,0);ctx.lineTo(-9,3.5);ctx.closePath();ctx.fill();
    ctx.restore();
  };

  if(ovs.includes("xGZones")){
    zone(0.50,0.22,0.12,0.06,"#ff2020",0.22);
    zone(0.50,0.28,0.20,0.08,"#ff8020",0.11);
    zone(0.50,0.35,0.28,0.10,"#ffdd20",0.06);
  }
  if(ovs.includes("cutbackLane")){
    const p1=project(0.88,0.58,W,H),p2=project(0.50,0.38,W,H);
    ctx.save();ctx.globalAlpha=0.70;ctx.strokeStyle="rgba(255,50,50,0.65)";
    ctx.lineWidth=2.2;ctx.setLineDash([9,6]);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }
  if(ovs.includes("passingLanes")){
    const you=players["you"];
    if(you) Object.values(players).forEach((p,i)=>{
      if(p.isOpp||p.isUser)return;
      pArr(you.cx,you.cy,p.cx,p.cy,[T.accent,T.accentBlue,T.accentAmber][i%3],0.22,1.2,true);
    });
  }
  if(ovs.includes("thirdManArrow")&&sc.id===1){
    const y=players["you"],s=players["st"],l=players["lw"];
    if(y&&s)pArr(y.cx,y.cy,s.cx,s.cy,T.accentBlue,0.65,2.0);
    if(s&&l)pArr(s.cx,s.cy,l.cx,l.cy,T.accent,0.75,2.2);
  }
  if(ovs.includes("pressureZone")){
    Object.values(players).forEach(p=>{
      if(!p.isOpp)return;
      const pulse=(Math.sin(animT*3.5+p.legPhase)+1)*0.5;
      zone(p.cx,p.cy,0.08+pulse*0.02,0.05+pulse*0.01,"#ff3030",0.08+pulse*0.04);
    });
  }
  if(ovs.includes("scanCone")){
    const you=players["you"];
    if(you){
      const pt=project(you.cx,you.cy,W,H);
      const ang=(-animT*0.75)%(Math.PI*2);
      ctx.save();ctx.globalAlpha=0.10;ctx.fillStyle=T.accent;
      ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.arc(pt.x,pt.y,72,ang-0.85,ang+0.85);ctx.closePath();ctx.fill();
      ctx.globalAlpha=0.20;ctx.strokeStyle=T.accent;ctx.lineWidth=0.8;ctx.stroke();ctx.restore();
    }
  }
  if(ovs.includes("defensiveOrientation")){
    Object.values(players).forEach(p=>{
      if(!p.isOpp)return;
      const pt=project(p.cx,p.cy,W,H),fr=(p.facing??0)*Math.PI/180;
      ctx.save();ctx.globalAlpha=0.10;ctx.fillStyle="#ff4444";
      ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.arc(pt.x,pt.y,36,fr-0.65,fr+0.65);ctx.closePath();ctx.fill();ctx.restore();
    });
  }
  if(ovs.includes("blindsideIndicator")&&sc.id===2){
    const am=players["am"];
    if(am){
      const pt=project(am.cx,am.cy,W,H);
      ctx.save();ctx.globalAlpha=0.65+Math.sin(animT*4)*0.35;
      ctx.strokeStyle=T.accent;ctx.lineWidth=1.8;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.arc(pt.x,pt.y,22,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=0.88;ctx.fillStyle=T.accent;ctx.font="bold 8px 'IBM Plex Mono',monospace";
      ctx.textAlign="center";ctx.fillText("UNTRACKED",pt.x,pt.y-30);ctx.restore();
    }
  }
  if(ovs.includes("pressingArrows")&&sc.id===4){
    const y=players["you"],ss=players["ss"],lw=players["lwa"],ocb=players["ocb"];
    if(y&&ocb)pArr(y.cx,y.cy,ocb.cx,ocb.cy,T.accent,0.72,2.0,false);
    if(ss&&ocb)pArr(ss.cx,ss.cy,ocb.cx+0.04,ocb.cy,T.accentBlue,0.60,1.7,false);
    if(lw&&ocb)pArr(lw.cx,lw.cy,ocb.cx-0.06,ocb.cy,T.accentAmber,0.58,1.7,false);
  }
  if(ovs.includes("coverShadow")&&sc.id===4){
    const cma=players["cma"],odm=players["odm"];
    if(cma&&odm){
      const A=project(cma.cx,cma.cy,W,H),B=project(odm.cx,odm.cy,W,H);
      const ang=Math.atan2(B.y-A.y,B.x-A.x);
      ctx.save();ctx.globalAlpha=0.15;ctx.fillStyle=T.accentAmber;
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.arc(A.x,A.y,52,ang-0.48,ang+0.48);ctx.closePath();ctx.fill();ctx.restore();
    }
  }
  if(ovs.includes("dangerZones")&&sc.id===3){
    zone(0.50,0.32,0.10,0.05,"#ff2020",0.20+Math.sin(animT*2)*0.06);
    zone(0.70,0.35,0.07,0.04,"#ff8020",0.11);zone(0.30,0.35,0.07,0.04,"#ff8020",0.11);
    const pt=project(0.50,0.32,W,H);
    ctx.save();ctx.globalAlpha=0.82;ctx.fillStyle="#ff5555";
    ctx.font="bold 8px 'IBM Plex Mono',monospace";ctx.textAlign="center";
    ctx.fillText("HIGH DANGER ZONE",pt.x,pt.y-24);ctx.restore();
  }
  if(ovs.includes("compactnessIndicator")&&sc.id===3){
    const dp=Object.values(players).filter(p=>!p.isOpp);
    if(dp.length>1){
      const xs=dp.map(p=>project(p.cx,p.cy,W,H).x),ys=dp.map(p=>project(p.cx,p.cy,W,H).y);
      const mx=Math.min(...xs)-10,Mx=Math.max(...xs)+10,my=Math.min(...ys)-10,My=Math.max(...ys)+10;
      ctx.save();ctx.globalAlpha=0.07;ctx.fillStyle=T.accentBlue;ctx.fillRect(mx,my,Mx-mx,My-my);
      ctx.globalAlpha=0.28;ctx.strokeStyle=T.accentBlue;ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.strokeRect(mx,my,Mx-mx,My-my);ctx.setLineDash([]);ctx.restore();
    }
  }
  if(ovs.includes("offsideLine")&&sc.id===5){
    const o1=players["odef1"],o2=players["odef2"];
    if(o1&&o2){
      const ly=(o1.cy+o2.cy)/2-0.03;
      const LA=project(0.04,ly,W,H),LB=project(0.96,ly,W,H);
      ctx.save();ctx.globalAlpha=0.52;ctx.strokeStyle=T.accentRed;ctx.lineWidth=1.5;ctx.setLineDash([12,6]);
      ctx.beginPath();ctx.moveTo(LA.x,LA.y);ctx.lineTo(LB.x,LB.y);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=0.8;ctx.fillStyle=T.accentRed;
      ctx.font="bold 8.5px 'IBM Plex Mono',monospace";ctx.textAlign="left";ctx.textBaseline="middle";
      ctx.fillText("OFFSIDE LINE",LA.x+8,LA.y);ctx.restore();
    }
  }
  if(ovs.includes("overloadHighlight")&&sc.id===5){
    const rw2=players["rw2"];
    if(rw2){
      zone(rw2.cx,rw2.cy,0.12,0.07,T.accent,0.11+Math.sin(animT*3)*0.04);
      const pt=project(rw2.cx,rw2.cy,W,H);
      ctx.save();ctx.globalAlpha=0.82;ctx.fillStyle=T.accent;
      ctx.font="bold 8px 'IBM Plex Mono',monospace";ctx.textAlign="center";
      ctx.fillText("OVERLOAD",pt.x,pt.y-38);ctx.restore();
    }
  }
  if(ovs.includes("transitionSpeed")&&sc.id===5){
    ["lw2","rw2","you"].forEach((id,i)=>{
      const p=players[id];if(!p)return;
      pArr(p.cx,p.cy,p.cx,p.cy-0.10,[T.accentBlue,T.accent,T.accentAmber][i],0.65,1.8,false);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HIT TEST: pass arrows
// ─────────────────────────────────────────────────────────────────────────────
function hitPass(mx, my, W, H, sc, as) {
  const you=as.players["you"]; if(!you) return -1;
  const fp=project(you.cx,you.cy,W,H);
  for(let i=0;i<sc.decisions.length;i++){
    const dec=sc.decisions[i];
    const tp=project(dec.targetNx,dec.targetNy,W,H);
    const dx=tp.x-fp.x,dy=tp.y-fp.y,d=Math.sqrt(dx*dx+dy*dy);if(d<1)continue;
    const nx=dx/d,ny=dy/d;
    const t=clamp(((mx-fp.x)*nx+(my-fp.y)*ny)/d,0,1);
    const cx=fp.x+t*dx,cy=fp.y+t*dy;
    if(dist2(mx,my,cx,cy)<18)return i;
    const ex=tp.x-nx*20,ey=tp.y-ny*20;
    if(dist2(mx,my,ex,ey)<22)return i;
  }
  return -1;
}

// HIT TEST: move space circles
function hitMove(mx, my, W, H, sc, as) {
  if(!sc.moveOptions) return -1;
  const you=as.players["you"]; if(!you) return -1;
  const fp=project(you.cx,you.cy,W,H);
  for(let i=0;i<sc.moveOptions.length;i++){
    const mo=sc.moveOptions[i];
    const tp=project(mo.moveToNx,mo.moveToNy,W,H);
    if(dist2(mx,my,tp.x,tp.y)<32)return i;
    const dx=tp.x-fp.x,dy=tp.y-fp.y,d=Math.sqrt(dx*dx+dy*dy);if(d<1)continue;
    const nx=dx/d,ny=dy/d;
    const t=clamp(((mx-fp.x)*nx+(my-fp.y)*ny)/d,0,1);
    const cx=fp.x+t*dx,cy=fp.y+t*dy;
    if(dist2(mx,my,cx,cy)<16)return i;
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// PITCH CANVAS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function PitchCanvas({ scenario, passKey, chosenPassIdx, moveIdx, onPassDecide, onMoveDecide, showOverlays, onPassAnimDone }) {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const stateRef    = useRef(null);
  const hoverRef    = useRef(-1);
  const doneFiredRef= useRef(false);
  const W=760, H=480;

  // Reset state on scenario change
  useEffect(()=>{
    stateRef.current = createAnimState(scenario);
    doneFiredRef.current = false;
  }, [scenario.id]);

  // Trigger pass animations + ball
  useEffect(()=>{
    if(!passKey||!stateRef.current) return;
    const as=stateRef.current;
    const anims = (scenario.animations[passKey]??[]).filter(a=>a.id!=="you");
    // YOU moves slightly in pass direction
    const dec=scenario.decisions.find(d=>d.key===passKey);
    const you=as.players["you"];
    if(you&&dec){
      const tx=clamp(lerp(you.cx,dec.targetNx,0.15),0.04,0.96);
      const ty=clamp(lerp(you.cy,dec.targetNy,0.15),0.05,0.95);
      anims.push({id:"you",toNx:tx,toNy:ty,delay:0,dur:0.35});
      you.facingRight=(dec.targetNx>=you.cx);
      // launch ball
      as.ball={active:true,progress:0,trail:[],fromX:you.cx,fromY:you.cy,toX:dec.targetNx,toY:dec.targetNy};
      you.hasBall=false;
    }
    triggerAnims(as, anims);
    doneFiredRef.current=false;
  },[passKey]);

  // Trigger YOU movement to chosen space
  useEffect(()=>{
    if(moveIdx===null||!stateRef.current||!scenario.moveOptions) return;
    const as=stateRef.current;
    const mo=scenario.moveOptions[moveIdx];
    const you=as.players["you"]; if(!you) return;
    const movAnims=[{id:"you",toNx:mo.moveToNx,toNy:mo.moveToNy,delay:0,dur:0.65}];
    triggerAnims(as, movAnims);
  },[moveIdx]);

  // RAF loop
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    let lastTs=0, animT=0;

    const loop=(ts)=>{
      const dt=Math.min((ts-lastTs)/1000,0.05); lastTs=ts; animT+=dt;
      const as=stateRef.current;
      if(!as){rafRef.current=requestAnimationFrame(loop);return;}
      tickAnim(as,dt);

      // fire animDone after pass animations complete
      if(as.animDone&&!doneFiredRef.current&&passKey&&moveIdx===null){
        doneFiredRef.current=true;
        onPassAnimDone?.();
        as.animDone=false;
      }

      // ── DRAW ──
      drawPitch(ctx,W,H);
      drawOverlays(ctx,W,H,scenario,as,animT,showOverlays);

      // Determine ring colours for pass phase
      const passPhase = !!passKey===false; // true = still in pass phase
      const inPassPhase = !passKey;
      const inMovePhase = passKey && moveIdx===null && chosenPassIdx!==null;

      // compute ring for each player
      const getRing=(p)=>{
        if(p.isUser) return null;
        if(inPassPhase){
          // highlight players who are pass targets
          const decIdx=scenario.decisions.findIndex(d=>d.targetPlayerId===p.id);
          return decIdx>=0 ? DEC_COLS[decIdx] : null;
        }
        return null;
      };

      // sort by cy for depth
      const sorted=Object.values(as.players).sort((a,b)=>a.cy-b.cy);
      sorted.forEach(p=>{
        const ring=getRing(p);
        drawPlayerWithRole(ctx,
          project(p.cx,p.cy,W,H).x,
          project(p.cx,p.cy,W,H).y,
          lerp(0.62,1.18,p.cy),
          p.kit, !!p.isUser, p.legPhase, p.moving,
          p.facingRight!==false,
          p.hasBall && !as.ball.active,
          ring, animT, p.role
        );
      });

      drawBall(ctx,W,H,as.ball);

      // Pass arrows (pass phase only, before decision)
      if(!passKey) drawPassArrows(ctx,W,H,scenario,as,hoverRef.current,animT);

      // Move arrows (move phase)
      if(passKey&&moveIdx===null&&chosenPassIdx!==null&&!as.ball.active){
        drawMoveArrows(ctx,W,H,scenario,as,hoverRef.current,null,animT);
      }
      // Chosen move arrow (keep visible)
      if(moveIdx!==null){
        drawMoveArrows(ctx,W,H,scenario,as,hoverRef.current,moveIdx,animT);
      }

      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[scenario.id,passKey,moveIdx,showOverlays]);

  const toCanvas=e=>{
    const r=canvasRef.current.getBoundingClientRect();
    return[(e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height)];
  };

  const handleMove=useCallback(e=>{
    if(!stateRef.current) return;
    const [mx,my]=toCanvas(e);
    const as=stateRef.current;
    if(!passKey){
      hoverRef.current=hitPass(mx,my,W,H,scenario,as);
    } else if(moveIdx===null&&chosenPassIdx!==null){
      hoverRef.current=hitMove(mx,my,W,H,scenario,as);
    }
    canvasRef.current.style.cursor=hoverRef.current>=0?"pointer":"default";
  },[passKey,moveIdx,chosenPassIdx,scenario]);

  const handleClick=useCallback(e=>{
    if(!stateRef.current) return;
    const [mx,my]=toCanvas(e);
    const as=stateRef.current;
    if(!passKey){
      const hit=hitPass(mx,my,W,H,scenario,as);
      if(hit>=0) onPassDecide(scenario.decisions[hit].key,hit);
    } else if(moveIdx===null&&chosenPassIdx!==null){
      const hit=hitMove(mx,my,W,H,scenario,as);
      if(hit>=0) onMoveDecide(hit);
    }
  },[passKey,moveIdx,chosenPassIdx,scenario,onPassDecide,onMoveDecide]);

  return(
    <canvas ref={canvasRef} width={W} height={H}
      style={{width:"100%",height:"auto",display:"block",cursor:"default"}}
      onMouseMove={handleMove} onClick={handleClick}
      onMouseLeave={()=>{hoverRef.current=-1;}}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK PANEL
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackPanel({ scenario, passDecIdx, moveDecIdx, onNext }) {
  const pd=scenario.decisions[passDecIdx];
  const md=moveDecIdx!==null?scenario.moveOptions?.[moveDecIdx]:null;
  const isOpt=pd.key===scenario.decisions[scenario.bestDecisionIdx].key;
  const rc=pd.rating==="A+"?"#47ff8a":pd.rating.startsWith("B")?"#c8f020":pd.rating==="C"?T.accentAmber:T.accentRed;

  return(
    <div style={{
      position:"absolute",bottom:0,left:0,right:0,
      background:"linear-gradient(0deg,rgba(4,8,16,0.97) 60%,rgba(4,8,16,0))",
      padding:"20px 24px 16px",
      animation:"fbSlide .38s cubic-bezier(.22,.68,0,1.2) both",
    }}>
      <style>{`@keyframes fbSlide{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:10}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:30,fontWeight:700,color:rc,lineHeight:1,minWidth:48}}>
          {pd.rating}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:rc,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>
            Pass: {isOpt?"✓ Optimal":"Suboptimal"}
            {md&&<span style={{marginLeft:12,color:md.rating==="A+"?"#47ff8a":T.accentAmber}}>
              | Move: {md.rating}
            </span>}
          </div>
          <div style={{fontSize:10.5,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.55}}>
            {isOpt?scenario.bestDecisionReason:`Better: "${scenario.decisions[scenario.bestDecisionIdx].label}". ${scenario.bestDecisionReason.substring(0,130)}…`}
          </div>
        </div>
      </div>
      <div style={{background:"rgba(200,240,32,0.04)",border:"1px solid rgba(200,240,32,0.16)",borderRadius:3,padding:"9px 13px",marginBottom:12}}>
        <div style={{fontSize:8.5,fontFamily:"'IBM Plex Mono',monospace",color:T.accent,letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:5}}>COACHING CONCEPT</div>
        <div style={{fontSize:10.5,color:"rgba(232,238,244,0.80)",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.6}}>{scenario.coachingConcept}</div>
      </div>
      <button onClick={onNext} style={{
        background:T.accent,color:"#040810",border:"none",
        fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
        letterSpacing:"0.1em",textTransform:"uppercase",padding:"9px 26px",borderRadius:2,cursor:"pointer",
      }}>Next Scenario →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION RESULTS
// ─────────────────────────────────────────────────────────────────────────────
function SessionResults({ decisions, onRestart }) {
  const rs=r=>r==="A+"?5:r.startsWith("A")?4:r.startsWith("B+")?3:r.startsWith("B")?2:r==="C"?1:0;
  const tot=decisions.reduce((s,d)=>s+rs(d.passRating),0);
  const max=SCENARIOS.length*5;
  const pct=Math.round((tot/max)*100);
  const grade=pct>=90?"Elite Analyst":pct>=75?"Advanced":pct>=55?"Developing":"Beginner";
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",gap:22}}>
      <div style={{fontSize:9,letterSpacing:"0.18em",color:T.muted,fontFamily:"'IBM Plex Mono',monospace",textTransform:"uppercase"}}>Session Complete</div>
      <div style={{fontSize:50,fontWeight:700,color:T.accent,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"-0.03em",lineHeight:1}}>{grade}</div>
      <div style={{fontSize:12,color:T.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{tot}/{max} pts · {pct}%</div>
      <div style={{width:"100%",maxWidth:460,border:`1px solid ${T.border}`,borderRadius:4,overflow:"hidden"}}>
        {SCENARIOS.map((sc,i)=>{
          const d=decisions[i];if(!d)return null;
          const rc=d.passRating==="A+"?"#47ff8a":d.passRating.startsWith("B")?"#c8f020":d.passRating==="C"?T.accentAmber:T.accentRed;
          return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderBottom:i<SCENARIOS.length-1?`1px solid ${T.border}`:"none"}}>
              <div>
                <div style={{fontSize:9,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.08em",textTransform:"uppercase"}}>{sc.category}</div>
                <div style={{fontSize:13,color:T.text}}>{sc.title}</div>
              </div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,fontWeight:700,color:rc}}>{d.passRating}</div>
            </div>
          );
        })}
      </div>
      <button onClick={onRestart} style={{
        background:"transparent",border:`1px solid ${T.accent}`,color:T.accent,
        fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
        letterSpacing:"0.1em",textTransform:"uppercase",padding:"10px 30px",borderRadius:2,cursor:"pointer",
      }}
        onMouseEnter={e=>{e.target.style.background=T.accent;e.target.style.color="#040810";}}
        onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=T.accent;}}
      >Restart Session</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.tiq-root{font-family:'Barlow',sans-serif;background:#040810;width:100%;min-height:640px;display:flex;flex-direction:column;color:#e8eef4;user-select:none;}
.tiq-header{display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid rgba(255,255,255,0.09);background:rgba(6,12,24,0.98);}
.tiq-brand{display:flex;align-items:center;gap:10px;}
.tiq-brand-mark{width:28px;height:28px;background:#c8f020;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}
.tiq-brand-name{font-family:'Bebas Neue',sans-serif;letter-spacing:.15em;font-size:17px;color:#c8f020;}
.tiq-brand-sub{font-size:9px;color:rgba(232,238,244,0.44);letter-spacing:.14em;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;}
.tiq-nav{display:flex;gap:6px;align-items:center;}
.tiq-pill{font-family:'IBM Plex Mono',monospace;font-size:9px;padding:4px 10px;border-radius:2px;border:1px solid rgba(255,255,255,0.09);color:rgba(232,238,244,0.44);letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,0.03);cursor:pointer;transition:border-color .15s,color .15s;}
.tiq-pill:hover,.tiq-pill.active{border-color:#c8f020;color:#c8f020;background:rgba(200,240,32,0.07);}
.tiq-progress-bar{height:2px;background:rgba(255,255,255,0.06);display:flex;}
.tiq-seg{flex:1;height:100%;margin-right:1px;transition:background .4s;}
.tiq-meta{display:flex;justify-content:space-between;align-items:center;padding:8px 20px;border-bottom:1px solid rgba(255,255,255,0.09);background:rgba(6,12,24,0.95);gap:16px;}
.tiq-cat{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:3px 10px;border-radius:2px;border:1px solid;}
.tiq-ttl{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:.12em;}
.tiq-timer{font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:700;min-width:36px;text-align:right;}
.tiq-ctx{padding:7px 20px;border-bottom:1px solid rgba(255,255,255,0.09);background:rgba(6,12,22,0.9);font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:rgba(232,238,244,0.44);line-height:1.5;letter-spacing:.02em;}
.tiq-phase-bar{display:flex;align-items:center;gap:9px;padding:7px 20px;border-bottom:1px solid rgba(255,255,255,0.09);background:rgba(6,12,22,0.88);font-family:'IBM Plex Mono',monospace;font-size:9px;color:rgba(232,238,244,0.50);letter-spacing:.08em;text-transform:uppercase;}
.tiq-phase-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;transition:background .3s;}
.tiq-pitch{flex:1;position:relative;background:#0a1208;overflow:hidden;}
.tiq-scan{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(4,8,16,0.88);border:1px solid rgba(200,240,32,0.35);border-radius:3px;padding:5px 14px;font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#c8f020;letter-spacing:.08em;text-transform:uppercase;pointer-events:none;white-space:nowrap;}
.tiq-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(4,8,16,0.88);border:1px solid rgba(255,255,255,0.09);border-radius:3px;padding:5px 14px;font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:rgba(232,238,244,0.44);letter-spacing:.08em;pointer-events:none;white-space:nowrap;}
.tiq-bottom{border-top:1px solid rgba(255,255,255,0.09);background:rgba(6,12,24,0.98);padding:10px 20px;display:flex;gap:10px;align-items:center;}
.tiq-card{flex:1;border:1px solid rgba(255,255,255,0.09);border-radius:3px;padding:9px 12px;cursor:pointer;transition:border-color .15s,background .15s,transform .1s;background:rgba(255,255,255,0.02);display:flex;align-items:center;gap:9px;}
.tiq-card:hover{background:rgba(255,255,255,0.06);transform:translateY(-1px);}
.tiq-card-text{font-size:11px;color:#e8eef4;line-height:1.3;}
.tiq-risk{font-family:'IBM Plex Mono',monospace;font-size:8px;padding:2px 6px;border-radius:2px;white-space:nowrap;margin-left:auto;flex-shrink:0;}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function TacticalIQ({ onComplete }) {
  const [scIdx,       setScIdx]      = useState(0);
  const [passKey,     setPassKey]    = useState(null);
  const [passDecIdx,  setPassDecIdx] = useState(null);
  const [passAnimDone,setPassAnimDone]=useState(false);
  const [moveDecIdx,  setMoveDecIdx] = useState(null);
  const [moveDone,    setMoveDone]   = useState(false);
  const [decisions,   setDecisions]  = useState([]);
  const [screen,      setScreen]     = useState("game");
  const [timeLeft,    setTimeLeft]   = useState(10);
  const [showOverlays,setShowOverlays]=useState(true);

  const sc=SCENARIOS[scIdx];

  useEffect(()=>{
    if(document.getElementById("tiq-css"))return;
    const tag=document.createElement("style");tag.id="tiq-css";tag.textContent=CSS;
    document.head.appendChild(tag);
  },[]);

  useEffect(()=>{
    if(screen!=="game"||passKey)return;
    setTimeLeft(10);
    const id=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(id);return 0;}return t-1;}),1000);
    return()=>clearInterval(id);
  },[scIdx,passKey,screen]);

  useEffect(()=>{
    if(timeLeft!==0||passKey||screen!=="game")return;
    handlePassDecide(sc.decisions[sc.bestDecisionIdx].key,sc.bestDecisionIdx);
  },[timeLeft]);// eslint-disable-line

  const handlePassDecide=useCallback((key,idx)=>{
    if(passKey)return;
    setPassKey(key);setPassDecIdx(idx);setPassAnimDone(false);
  },[passKey]);

  const handlePassAnimDone=useCallback(()=>setPassAnimDone(true),[]);

  const handleMoveDecide=useCallback((idx)=>{
    if(moveDecIdx!==null)return;
    setMoveDecIdx(idx);
    setTimeout(()=>setMoveDone(true),950);
  },[moveDecIdx]);

  const handleNext=useCallback(()=>{
    const pd=sc.decisions[passDecIdx??0];
    const md=moveDecIdx!==null?sc.moveOptions?.[moveDecIdx]:null;
    const nd=[...decisions,{passRating:pd.rating,moveRating:md?.rating??null}];
    setDecisions(nd);
    const next=scIdx+1;
    if(next<SCENARIOS.length){
      setScIdx(next);setPassKey(null);setPassDecIdx(null);setPassAnimDone(false);
      setMoveDecIdx(null);setMoveDone(false);setTimeLeft(10);
    } else {
      setScreen("result");onComplete?.({decisions:nd});
    }
  },[sc,passDecIdx,moveDecIdx,decisions,scIdx,onComplete]);

  const handleRestart=()=>{
    setScIdx(0);setPassKey(null);setPassDecIdx(null);setPassAnimDone(false);
    setMoveDecIdx(null);setMoveDone(false);setDecisions([]);setScreen("game");setTimeLeft(10);
  };

  const catCol=sc.category==="ATTACKING"?T.accentBlue:sc.category==="DEFENDING"?T.accentRed:T.accentAmber;
  const timerCol=timeLeft>6?"#47ff8a":timeLeft>3?T.accentAmber:T.accentRed;
  const showFeedback=passKey&&moveDone;
  const gamePhase=!passKey?"pass":!passAnimDone?"animating":moveDecIdx===null?"move":"moveAnim";

  if(screen==="result") return(
    <div className="tiq-root" style={{maxWidth:860}}>
      <div className="tiq-header">
        <div className="tiq-brand">
          <div className="tiq-brand-mark"><svg viewBox="0 0 14 14" fill="none"><polygon points="7,1 13,4 13,10 7,13 1,10 1,4" stroke="#040810" strokeWidth="1.5"/><polygon points="7,4 10,5.5 10,8.5 7,10 4,8.5 4,5.5" fill="#040810"/></svg></div>
          <div><div className="tiq-brand-name">TacticalIQ</div><div className="tiq-brand-sub">Elite Decision Training</div></div>
        </div>
      </div>
      <SessionResults decisions={decisions} onRestart={handleRestart}/>
    </div>
  );

  return(
    <div className="tiq-root" style={{maxWidth:860}}>
      <div className="tiq-header">
        <div className="tiq-brand">
          <div className="tiq-brand-mark"><svg viewBox="0 0 14 14" fill="none"><polygon points="7,1 13,4 13,10 7,13 1,10 1,4" stroke="#040810" strokeWidth="1.5"/><polygon points="7,4 10,5.5 10,8.5 7,10 4,8.5 4,5.5" fill="#040810"/></svg></div>
          <div><div className="tiq-brand-name">TacticalIQ</div><div className="tiq-brand-sub">Elite Decision Training</div></div>
        </div>
        <div className="tiq-nav">
          <div className={`tiq-pill ${showOverlays?"active":""}`} onClick={()=>setShowOverlays(v=>!v)}>
            {showOverlays?"Overlays ON":"Overlays OFF"}
          </div>
          <div className="tiq-pill" style={{cursor:"default"}}>{scIdx+1} / {SCENARIOS.length}</div>
        </div>
      </div>

      <div className="tiq-progress-bar">
        {SCENARIOS.map((_,i)=>(
          <div key={i} className="tiq-seg"
            style={{background:i<scIdx?T.accent:i===scIdx?"rgba(200,240,32,0.38)":"rgba(255,255,255,0.06)"}}/>
        ))}
      </div>

      <div className="tiq-meta">
        <div className="tiq-cat" style={{color:catCol,borderColor:catCol,background:`${catCol}12`}}>{sc.category}</div>
        <div className="tiq-ttl">{sc.title}</div>
        {!passKey&&<div className="tiq-timer" style={{color:timerCol}}>{timeLeft}s</div>}
      </div>

      <div className="tiq-ctx">{sc.context}</div>

      <div className="tiq-phase-bar">
        <div className="tiq-phase-dot" style={{
          background:gamePhase==="pass"?T.you:gamePhase==="move"?T.accentBlue:"rgba(255,255,255,0.28)"
        }}/>
        {gamePhase==="pass"&&"PHASE 1 — Click a PASS arrow (A, B or C) to make your pass decision"}
        {gamePhase==="animating"&&"Executing movement — watch how the play develops…"}
        {gamePhase==="move"&&"PHASE 2 — Click a MOVE zone (A, B or C) to choose where YOU run after passing"}
        {(gamePhase==="moveAnim"||showFeedback)&&"Movement complete — coaching feedback below"}
      </div>

      <div className="tiq-pitch">
        <PitchCanvas
          scenario={sc}
          passKey={passKey}
          chosenPassIdx={passDecIdx}
          moveIdx={moveDecIdx}
          onPassDecide={handlePassDecide}
          onMoveDecide={handleMoveDecide}
          showOverlays={showOverlays}
          onPassAnimDone={handlePassAnimDone}
        />

        {gamePhase==="pass"&&<div className="tiq-scan">⊙ {sc.scanRequirement}</div>}
        {gamePhase==="pass"&&<div className="tiq-hint">⬆ Click a coloured PASS arrow on the pitch — A, B or C</div>}
        {gamePhase==="move"&&<div className="tiq-hint">⬆ Click a MOVE zone on the pitch — choose where to run after passing</div>}

        {showFeedback&&passDecIdx!==null&&(
          <FeedbackPanel scenario={sc} passDecIdx={passDecIdx} moveDecIdx={moveDecIdx} onNext={handleNext}/>
        )}

        {(gamePhase==="animating"||gamePhase==="moveAnim")&&!showFeedback&&(
          <div style={{position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",background:"rgba(4,8,16,0.88)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:3,padding:"5px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:T.muted,letterSpacing:"0.08em",pointerEvents:"none",animation:"pulse 1.2s ease-in-out infinite"}}>
            Analysing movement…
          </div>
        )}
      </div>

      {/* Pass phase decision cards */}
      {gamePhase==="pass"&&(
        <div className="tiq-bottom">
          {sc.decisions.map((dec,i)=>{
            const col=DEC_COLS[i];
            const letter=["A","B","C"][i];
            const rc=dec.risk==="HIGH"?"rgba(240,60,60,0.16)":dec.risk==="MED"?"rgba(240,160,32,0.16)":"rgba(60,180,240,0.16)";
            const rtc=dec.risk==="HIGH"?T.accentRed:dec.risk==="MED"?T.accentAmber:T.accentBlue;
            return(
              <div key={i} className="tiq-card"
                style={{borderColor:col+"66",borderWidth:1.5}}
                onClick={()=>handlePassDecide(dec.key,i)}>
                {/* Coloured PASS A/B/C badge */}
                <div style={{
                  background:col,color:"#040810",
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                  letterSpacing:"0.08em",padding:"3px 7px",borderRadius:3,flexShrink:0,
                  whiteSpace:"nowrap",
                }}>PASS {letter}</div>
                <div className="tiq-card-text">{dec.label}</div>
                <div className="tiq-risk" style={{background:rc,color:rtc,border:`1px solid ${rtc}44`}}>{dec.risk}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move phase cards */}
      {gamePhase==="move"&&sc.moveOptions&&(
        <div className="tiq-bottom">
          {sc.moveOptions.map((mo,i)=>{
            const col=DEC_COLS[i];
            const letter=["A","B","C"][i];
            return(
              <div key={i} className="tiq-card"
                style={{borderColor:col+"66",borderWidth:1.5}}
                onClick={()=>handleMoveDecide(i)}>
                {/* Coloured MOVE A/B/C badge */}
                <div style={{
                  background:"transparent",color:col,
                  border:`1.5px solid ${col}`,
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,
                  letterSpacing:"0.08em",padding:"3px 7px",borderRadius:3,flexShrink:0,
                  whiteSpace:"nowrap",
                }}>MOVE {letter}</div>
                <div className="tiq-card-text">{mo.label}</div>
                <div style={{
                  fontFamily:"'IBM Plex Mono',monospace",fontSize:8,padding:"2px 6px",
                  borderRadius:2,whiteSpace:"nowrap",marginLeft:"auto",flexShrink:0,
                  background:`${col}18`,color:col,border:`1px solid ${col}44`,
                }}>{mo.rating}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
