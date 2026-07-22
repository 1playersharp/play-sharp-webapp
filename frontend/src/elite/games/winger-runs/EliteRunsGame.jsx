import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";

import { createPitchScene, createPlayerMesh } from "../../rendering/PitchRenderer";
import GameStageLayout from "@/components/games/GameStageLayout";

/**
 * EliteRunsGame — Lose Your Marker (Elite tier)
 *
 * Freeze-frame decision drill. The play builds live, freezes on the trigger,
 * three run-paths appear as in-scene arrows with letter + run-type badge
 * pills. Tap once to highlight, tap again to confirm; the chosen run plays
 * out and a coach note lands.
 *
 * Integration notes:
 *  - Uses createPitchScene + createPlayerMesh from PitchRenderer.ts so
 *    players + pitch match every other Elite game (~2.02m scale, same
 *    materials, same lighting rig). The factory's north goal is hidden and
 *    the reference's own goal marker is kept at z=GOAL_Z so all scenario
 *    coordinates and gameplay timings hold exactly as authored.
 *  - Docked instruction strip goes into GameStageLayout's `panel` slot;
 *    the pitch mount, feedback overlay and confirm bar all live inside the
 *    `canvas` slot so mobile landscape gets the sidebar layout automatically
 *    and the strip never overlaps the pitch in motion.
 *  - ResizeObserver on the mount refits the WebGL canvas + camera on
 *    container size changes (rotation etc.) without unmounting.
 */

/* ─── Config ─────────────────────────────────────────────────── */
const GOAL_Z = -24;                       // attacking this goal
const COL = {
  bg: "#0a1f10", mate: 0x1e6fd6, mateTrim: 0x8fb8ea, opp: 0xdc1e28,
  oppTrim: 0xff9a9a, you: 0xff7a1f, halo: 0xff7a1f, passer: 0x2ead3c,
  accent: "#2ead3c", red: "#dc1e28", mono: "'JetBrains Mono', monospace",
};
const OPT_HEX = { A: 0xdc1e28, B: 0xffffff, C: 0x3aa3ff };
const OPT_CSS = { A: "#dc1e28", B: "#ffffff", C: "#3aa3ff" };

/* ─── Scenarios ──────────────────────────────────────────────── */
// Coords are [x, z] on the pitch; attacking toward -z. Winger works the RIGHT
// wing (x > 0) except the blind-side scenario. Each option: a run path
// (waypoints), where the pass gets played, defender reaction, pts weight and
// the coach's reason. Weights reflect "better decision", never right/wrong.
const SCENARIOS = [
  {
    id: "out_to_in", title: "The Video Run — Out-To-In",
    brief: "FB is tight to the touchline side. The CM's head is up looking for the diagonal. Where's your run?",
    runType: "Out-to-in",
    setup: { winger: [14, -2], defender: [12.6, -4.5], defTag: "LB", cm: [-4, 6], extras: [{ kit: "opp", pos: [3, -10], label: "CB" }, { kit: "mate", pos: [-3, -9], label: "ST" }, { kit: "opp", pos: [7, 0], label: "CM" }] },
    watch: [{ actor: "winger", to: [14.5, -1] }, { actor: "cm", to: [-2, 5] }],
    freezeAt: 2.6,
    options: [
      { key: "A", short: "Out-to-in, bend inside", tag: "OUT-TO-IN", pts: 100, outcome: "in_behind",
        reason: "The FB's body is set touchline-side — bending inside his blind shoulder onto the diagonal attacks the gap between him and the CB. That's the run from the clip: show, then GO.",
        path: [[15, -1], [12, -6], [7, -14], [4, -20]], passTo: [5.5, -16], defReact: [[12.6, -6], [11, -10]] },
      { key: "B", short: "Come short to feet", tag: "COME SHORT", pts: 40, outcome: "contested",
        reason: "Coming short with a defender this tight invites contact with your back to goal. It's safe, but the space you should want is BEHIND him.",
        path: [[13, 0], [10.5, 2]], passTo: [10.5, 2], defReact: [[11.5, 0.5]] },
      { key: "C", short: "Hug the touchline, go outside", tag: "GO OUTSIDE", pts: 55, outcome: "contested",
        reason: "Going outside runs straight into where the FB is strongest. Usable — but the inside channel was open and leads to goal.",
        path: [[15.5, -4], [16.5, -12], [16, -18]], passTo: [16.5, -13], defReact: [[14, -7], [15, -13]] },
    ],
  },
  {
    id: "in_to_out", title: "FB Tucked Inside — Push Wide",
    brief: "The full back has tucked in to cover the CB. Look what he left behind him.",
    runType: "In-to-out",
    setup: { winger: [11, -3], defender: [7.5, -6], defTag: "LB", cm: [-6, 4], extras: [{ kit: "opp", pos: [1, -11], label: "CB" }, { kit: "mate", pos: [-2, -7], label: "ST" }, { kit: "opp", pos: [4, -3], label: "CM" }] },
    watch: [{ actor: "defender", to: [6.5, -6.5] }, { actor: "cm", to: [-4, 3] }],
    freezeAt: 2.6,
    options: [
      { key: "A", short: "Dart in behind centrally", tag: "IN BEHIND", pts: 45, outcome: "contested",
        reason: "Central is crowded — the FB tucked in EXACTLY to protect there. You'd be running into two bodies.",
        path: [[10, -6], [7, -13], [5, -18]], passTo: [6, -14], defReact: [[6.5, -9], [6, -14]] },
      { key: "B", short: "In-to-out, attack the touchline space", tag: "IN-TO-OUT", pts: 100, outcome: "in_behind",
        reason: "He tucked in — the wide channel behind him is empty. Start your run inside to hold him there, then break OUT into the space he abandoned.",
        path: [[9.5, -4], [12, -9], [16, -15], [16.5, -20]], passTo: [15.5, -14], defReact: [[7, -8], [10, -12]] },
      { key: "C", short: "Stay wide, feet, take him on", tag: "TO FEET", pts: 60, outcome: "contested",
        reason: "Receiving to feet wide is fine and you might beat him — but the run in behind arrives at the same place without needing to win a duel.",
        path: [[13.5, -2]], passTo: [13.5, -2], defReact: [[10.5, -4]] },
    ],
  },
  {
    id: "double_move", title: "Touch-Tight Marker — The Double Move",
    brief: "This defender is glued to you and biting on everything. Use that against him.",
    runType: "Double movement",
    setup: { winger: [12, -4], defender: [11.2, -5.3], defTag: "LB", cm: [-3, 5], extras: [{ kit: "opp", pos: [4, -12], label: "CB" }, { kit: "mate", pos: [-3, -8], label: "ST" }, { kit: "opp", pos: [6, -1], label: "CM" }] },
    watch: [{ actor: "winger", to: [12.3, -3.4] }, { actor: "cm", to: [-1.5, 4.5] }],
    freezeAt: 2.4,
    options: [
      { key: "A", short: "Spin straight in behind", tag: "SPIN EARLY", pts: 55, outcome: "contested",
        reason: "Going first is honest — but touch-tight means he's close enough to run WITH you. He needed to be moved first.",
        path: [[12, -8], [10, -15], [8, -20]], passTo: [10, -14], defReact: [[11, -8], [10, -14]] },
      { key: "B", short: "Show short… then spin (double move)", tag: "DOUBLE MOVE", pts: 100, outcome: "in_behind",
        reason: "Sell the check to feet — a tight, biting defender follows. The instant his weight shifts forward, spin off his shoulder. The sell IS the separation.",
        path: [[11.5, -2], [11, 0.5], [13, -6], [11, -14], [9, -19]], passTo: [11, -13], defReact: [[10.8, -3], [10.5, -0.5], [10.8, -7]] },
      { key: "C", short: "Drift wide for the switch", tag: "DRIFT WIDE", pts: 40, outcome: "contested",
        reason: "Drifting away releases the pressure — his pressure. It also releases yours. This defender is beatable in behind; make him pay.",
        path: [[15, -3], [17, -5]], passTo: [17, -5], defReact: [[13.5, -4]] },
    ],
  },
  {
    id: "blind_side", title: "Ball-Watcher — Arrive Blind Side",
    brief: "Cross is coming from the right. Your marker at the far post is watching the ball, not you.",
    runType: "Blind-side / back post",
    setup: { winger: [-12, -10], defender: [-9.5, -12], defTag: "RB", cm: [13, -12], extras: [{ kit: "mate", pos: [3, -13], label: "ST" }, { kit: "opp", pos: [1, -14], label: "CB" }, { kit: "opp", pos: [-3, -9], label: "CM" }] },
    watch: [{ actor: "cm", to: [14, -14] }, { actor: "defender", to: [-8.5, -13] }],
    freezeAt: 2.6,
    options: [
      { key: "A", short: "Attack the near post", tag: "NEAR POST", pts: 45, outcome: "contested",
        reason: "Near post is brave but it drags you across your marker's eyeline — he picks you up the moment you cross it. The gift here is that he CAN'T see you where you are.",
        path: [[-6, -14], [0, -17], [3, -19]], passTo: [2, -18], defReact: [[-7, -14], [-2, -17]] },
      { key: "B", short: "Hold the edge for the cutback", tag: "CUTBACK", pts: 60, outcome: "contested",
        reason: "The cutback zone is a real option — but it needs the crosser to see it. The free header at the back stick is the higher-value arrival.",
        path: [[-9, -8], [-5, -9]], passTo: [-5, -9], defReact: [[-8.5, -12]] },
      { key: "C", short: "Delay… then attack the back post blind side", tag: "BACK POST", pts: 100, outcome: "in_behind",
        reason: "He's ball-watching — stay out of his vision, delay half a beat so you arrive MOVING while he's flat-footed, and attack the back post. Arrive, don't wait.",
        path: [[-13, -12], [-11, -16], [-6, -20], [-3, -21.5]], passTo: [-4.5, -20], defReact: [[-9, -13.5], [-8, -16]] },
    ],
  },
  {
    id: "underlap", title: "Your FB Overlaps — Underlap",
    brief: "Your own full back is bombing outside you. The defender shifts wide to track him. What did he just open?",
    runType: "Underlap",
    setup: { winger: [13, -6], defender: [11, -8], defTag: "LB", cm: [9, 2], extras: [{ kit: "mate", pos: [16, 0], runsTo: [17.5, -12], label: "FB" }, { kit: "opp", pos: [4, -12], label: "CB" }, { kit: "mate", pos: [0, -8], label: "ST" }, { kit: "opp", pos: [7, -2], label: "CM" }] },
    watch: [{ actor: "defender", to: [13, -9] }, { actor: "cm", to: [10, 1] }],
    freezeAt: 2.8,
    options: [
      { key: "A", short: "Underlap — inside channel", tag: "UNDERLAP", pts: 100, outcome: "in_behind",
        reason: "Your FB's overlap dragged the defender wide — the inside channel just opened like a door. The underlap runs through it into the half-space, facing goal.",
        path: [[11.5, -8], [9, -13], [7, -18], [6, -21]], passTo: [8, -14], defReact: [[13.5, -10], [13, -14]] },
      { key: "B", short: "Stay wide, let the FB come inside", tag: "STAY WIDE", pts: 30, outcome: "crowded",
        reason: "Two of you in the same wide lane kills the overlap — you'd occupy each other's space AND the defender's job gets easier.",
        path: [[15, -6]], passTo: [15, -6], defReact: [[12.5, -8]] },
      { key: "C", short: "Check to the ball for a give-and-go", tag: "GIVE & GO", pts: 60, outcome: "contested",
        reason: "The give-and-go keeps the move alive and it's tidy — but the underlap arrives in behind IMMEDIATELY, no extra pass needed.",
        path: [[11, -3], [10, -1]], passTo: [10, -1], defReact: [[11.5, -5]] },
    ],
  },
];

const V = (x, z) => new THREE.Vector3(x, 0, z);

/* halo ring that sits under a player (the video's highlight) */
function buildHalo(hex, r = 0.85) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r - 0.14, r, 36),
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  return ring;
}

/* badge sprite (billboard) at the end of a run — letter + run type pill.
   Drawn to a dynamic-width canvas; sprite scale preserves the aspect ratio. */
function makeBadgeSprite(letter, cssColor, tag) {
  const H = 96, PAD = 18, LETTER_W = 84;
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = "900 40px 'JetBrains Mono', monospace";
  const tagW = Math.ceil(measure.measureText(tag).width);
  const W = LETTER_W + tagW + PAD * 2 + 10;

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  // pill background
  x.beginPath(); x.roundRect(2, 2, W - 4, H - 4, 22);
  x.fillStyle = "rgba(0,0,0,0.92)"; x.fill();
  x.lineWidth = 5; x.strokeStyle = cssColor; x.stroke();
  // letter block
  x.beginPath(); x.roundRect(6, 6, LETTER_W, H - 12, 18);
  x.fillStyle = cssColor; x.fill();
  x.font = "900 52px 'JetBrains Mono', monospace";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = cssColor === "#ffffff" ? "#000" : "#fff";
  x.fillText(letter, 6 + LETTER_W / 2, H / 2 + 3);
  // run type
  x.font = "900 40px 'JetBrains Mono', monospace";
  x.textAlign = "left";
  x.fillStyle = "#ffffff";
  x.fillText(tag, LETTER_W + PAD + 4, H / 2 + 3);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.95 }));
  const height = 1.5;                                   // world units
  sprite.scale.set(height * (W / H), height, 1);
  sprite.userData.base = sprite.scale.clone();
  return sprite;
}

/* small name tag floating above a player's head (YOU / LB / CM / ST…) */
function makeTagSprite(text, cssColor) {
  const H = 64, PAD = 16;
  const m = document.createElement("canvas").getContext("2d");
  m.font = "900 34px 'JetBrains Mono', monospace";
  const W = Math.ceil(m.measureText(text).width) + PAD * 2;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.beginPath(); x.roundRect(2, 2, W - 4, H - 4, 14);
  x.fillStyle = "rgba(0,0,0,0.88)"; x.fill();
  x.lineWidth = 4; x.strokeStyle = cssColor; x.stroke();
  x.font = "900 34px 'JetBrains Mono', monospace";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = cssColor; x.fillText(text, W / 2, H / 2 + 2);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.95 }));
  const h = 0.62; s.scale.set(h * (W / H), h, 1);
  s.position.y = 2.5;
  return s;
}

/* run-path arrow: visible tube + arrowhead + letter badge, plus a FAT
   invisible hit tube so the WHOLE line is a comfortable mobile tap target */
function buildRunArrow(path, hex, cssColor, key, tag) {
  const g = new THREE.Group();
  const pts = path.map(([x, z]) => new THREE.Vector3(x, 0.1, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const visMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9 });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.14, 6, false), visMat));
  const hit = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, 1.25, 6, false),
    new THREE.MeshBasicMaterial({ visible: false }));
  g.add(hit);
  const end = pts[pts.length - 1], prev = pts[pts.length - 2] ?? pts[0];
  const dir = end.clone().sub(prev).normalize();
  const headMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.95 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 10), headMat);
  head.position.copy(end).addScaledVector(dir, 0.5); head.position.y = 0.1;
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.add(head);
  const badge = makeBadgeSprite(key, cssColor, tag);
  badge.position.copy(end).addScaledVector(dir, 1.6); badge.position.y = 1.5;
  g.add(badge);
  g.traverse(o => { o.userData.optKey = key; });
  g.userData.optKey = key;
  g.userData.end = head.position.clone();
  g.userData.mats = [visMat, headMat, badge.material];
  g.userData.badge = badge;
  return g;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function EliteRunsGame({ onComplete }) {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const S = useRef(null);
  const [phase, setPhase] = useState("intro"); // intro | watch | frozen | playout | feedback | done
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [selected, setSelected] = useState(null);   // first tap = highlight
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [finalScore, setFinalScore] = useState(0);
  const frozenAtRef = useRef(0);
  const pickRef = useRef(null);
  const setSelectedRef = useRef(null);
  const sc = SCENARIOS[idx];

  const pick = useCallback((opt) => {
    if (phase !== "frozen") return;
    const ms = Date.now() - frozenAtRef.current;
    setPicked({ ...opt, ms });
    setSelected(null);
    setPhase("playout");
  }, [phase]);
  pickRef.current = pick;
  setSelectedRef.current = setSelected;

  /* ── scene lifecycle: ONE build per scenario. Phase changes flow through
     st.phase (synced below) so React never tears the scene down mid-scenario
     — that teardown was destroying the freshly created run arrows. ── */
  const inScenario = !["intro", "done"].includes(phase);
  useEffect(() => {
    if (!inScenario) return;
    const mount = mountRef.current; if (!mount) return;

    // Use the shared Elite scene factory so pitch/lighting/camera match
    // every sibling Elite game. Camera is repositioned per-frame in the RAF
    // loop; the initial values only need to be valid.
    const handles = createPitchScene({
      container: mount,
      fov: 46,
      cameraPosition: [0, 12, 5],
      cameraTarget: [0, 0.5, GOAL_Z / 2],
    });
    const { scene, camera, renderer } = handles;

    // Hide the factory's north goal — the reference's own goal marker at
    // z=GOAL_Z is authoritative for gameplay coordinates.
    handles.goals.north.visible = false;

    // Retro-broadcast background tint the reference expects for camera fog.
    scene.background = new THREE.Color(COL.bg);
    scene.fog = new THREE.Fog(COL.bg, 45, 95);

    // reference goal marker (kept verbatim)
    const goal = new THREE.Mesh(new THREE.BoxGeometry(7.3, 2.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    goal.position.set(0, 1.2, GOAL_Z - 0.4); scene.add(goal);

    // actors — createPlayerMesh matches the ~2.02m scale + materials of the
    // other Elite games. Kit colours match the reference role tokens.
    const winger = createPlayerMesh(COL.you, { numberLabel: '11' });
    const defender = createPlayerMesh(COL.opp, { numberLabel: '2' });
    const cm = createPlayerMesh(COL.mate, { numberLabel: '8' });
    scene.add(winger, defender, cm);
    const extras = (sc.setup.extras ?? []).map(e => {
      const p = createPlayerMesh(e.kit === "mate" ? COL.mate : COL.opp, { numberLabel: e.label || '' });
      p.position.copy(V(...e.pos)); scene.add(p);
      if (e.label) p.add(makeTagSprite(e.label, e.kit === "mate" ? "#7db3ff" : "#ff5a5a"));
      return { mesh: p, def: e };
    });
    const halo = buildHalo(COL.halo); winger.add(halo);           // the video's halo
    const passerRing = buildHalo(COL.passer, 1.0); cm.add(passerRing);
    // identifiers above heads
    winger.add(makeTagSprite("YOU", "#ff7a1f"));
    defender.add(makeTagSprite(sc.setup.defTag ?? "DEF", "#ff5a5a"));
    cm.add(makeTagSprite("CM", "#7db3ff"));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    ball.castShadow = true; scene.add(ball);

    renderer.domElement.style.touchAction = "none";

    const st = S.current = {
      built: sc.id, alive: true, phase, t: 0, scIdx: idx, selectedKey: null,
      winger, defender, cm, extras, ball, halo, passerRing,
      pos: {
        winger: V(...sc.setup.winger), defender: V(...sc.setup.defender), cm: V(...sc.setup.cm),
      },
      watchFrom: { winger: V(...sc.setup.winger), defender: V(...sc.setup.defender), cm: V(...sc.setup.cm) },
      arrows: null, playT: 0, playoutOpt: null, ballFly: null, outcomeShown: false,
      renderer, scene, camera, mount, handles,
    };

    /* ── tap-to-pick: raycast against arrows (fat hit tube OR badge) ── */
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const el = renderer.domElement;
    let downAt = null;
    const onDown = e => { downAt = [e.clientX, e.clientY]; };
    const onUp = e => {
      const wasDown = downAt; downAt = null;
      if (!wasDown || Math.hypot(e.clientX - wasDown[0], e.clientY - wasDown[1]) > 12) return; // a drag, not a tap
      if (st.phase !== "frozen" || !st.arrows) return;
      const r = el.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, st.camera);
      const hits = ray.intersectObjects(st.arrows, true);
      const key = hits.find(h => h.object.userData.optKey)?.object.userData.optKey;
      if (!key) return;
      const opt = SCENARIOS[st.scIdx].options.find(o => o.key === key);
      if (st.selectedKey === key) { pickRef.current?.(opt); return; }   // second tap → confirm
      st.selectedKey = key;                                             // first tap → highlight
      st.arrows.forEach(a => {
        const sel = a.userData.optKey === key;
        a.userData.mats.forEach(m => { m.opacity = sel ? 1 : 0.22; });
        const b = a.userData.badge;
        b.scale.copy(b.userData.base).multiplyScalar(sel ? 1.35 : 0.8);
      });
      setSelectedRef.current?.(opt);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

    // Container resize → refit renderer + camera (rAF-throttled so a burst
    // of resize events on a rotation don't stall the render loop).
    let resizePending = false;
    const scheduleResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => { resizePending = false; handles.resize(); });
    };
    const ro = new ResizeObserver(scheduleResize);
    ro.observe(mount);
    window.addEventListener('resize', scheduleResize);

    const clock = new THREE.Clock();
    let raf;
    const moveAlong = (vec, path, t01) => {
      const n = path.length - 1; if (n < 1) { vec.set(path[0][0], 0, path[0][1]); return; }
      const f = Math.min(t01, 0.999) * n, i = Math.floor(f), p = f - i;
      vec.set(
        path[i][0] + (path[i + 1][0] - path[i][0]) * p, 0,
        path[i][1] + (path[i + 1][1] - path[i][1]) * p);
    };

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const now = performance.now();

      if (st.phase === "watch") {
        st.t += dt;
        // gentle scripted drift + passer ring pulse building to the trigger
        const p = Math.min(st.t / sc.freezeAt, 1);
        sc.watch.forEach(w => {
          const from = st.watchFrom[w.actor]; if (!from) return;
          st.pos[w.actor].lerpVectors(from, V(...w.to), p);
        });
        st.passerRing.material.opacity = 0.35 + 0.55 * Math.abs(Math.sin(now / 220)) * p;
        if (st.t >= sc.freezeAt && !st.arrows) {
          // FREEZE: draw the three run arrows in-scene
          st.arrows = sc.options.map(o => {
            const a = buildRunArrow(
              [[st.pos.winger.x, st.pos.winger.z], ...o.path],
              OPT_HEX[o.key], OPT_CSS[o.key], o.key, o.tag);
            st.scene.add(a); return a;
          });
          // De-overlap the badges: when two run-ends land close together,
          // stagger the later badge upward tier by tier, and drop a leader
          // line from any raised badge down to its arrowhead so the pairing
          // stays obvious. Keeps every label readable on a phone.
          st.arrows.forEach((a, i) => {
            const b = a.userData.badge;
            for (let j = 0; j < i; j++) {
              const o = st.arrows[j].userData.badge;
              while (Math.hypot(b.position.x - o.position.x, b.position.z - o.position.z) < 6.5 &&
                     Math.abs(b.position.y - o.position.y) < 1.6) {
                b.position.y += 1.7;
              }
            }
            if (b.position.y > 2.2) {
              const end = a.userData.end;
              const leader = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(end.x, 0.15, end.z),
                  new THREE.Vector3(b.position.x, b.position.y - 0.8, b.position.z),
                ]),
                new THREE.LineBasicMaterial({ color: a.userData.mats[0].color, transparent: true, opacity: 0.7 }));
              a.add(leader);
              a.userData.mats.push(leader.material);   // dims with the rest on selection
            }
          });
          frozenAtRef.current = Date.now();
          setPhase("frozen");
        }
      }

      if (st.phase === "playout" && st.playoutOpt) {
        st.playT += dt / 3.2;                                   // ~3.2s playout
        const o = st.playoutOpt;
        moveAlong(st.pos.winger, [[sc.setup.winger[0], sc.setup.winger[1]], ...o.path]
          .map((v, i, arr) => i === 0 ? [st.wingerStart.x, st.wingerStart.z] : v), Math.min(st.playT, 1));
        if (o.defReact?.length)
          moveAlong(st.pos.defender, [[st.defStart.x, st.defStart.z], ...o.defReact], Math.min(st.playT * 0.95, 1));
        if (st.playT > 0.35 && !st.ballFly)
          st.ballFly = { from: st.pos.cm.clone(), to: V(...o.passTo), t: 0 };
        if (st.ballFly) {
          st.ballFly.t = Math.min(st.ballFly.t + dt / 1.4, 1);
          const bp = st.ballFly.from.clone().lerp(st.ballFly.to, st.ballFly.t);
          st.ball.position.set(bp.x, 0.24 + Math.sin(st.ballFly.t * Math.PI) * 2.2, bp.z);
        }
        if (st.playT >= 1 && !st.outcomeShown) {
          st.outcomeShown = true;
          setPhase("feedback");                                  // feedback effect fires below
        }
      }

      // write transforms
      st.winger.position.copy(st.pos.winger);
      st.defender.position.copy(st.pos.defender);
      st.defender.lookAt(st.pos.winger.x, 0, st.pos.winger.z);
      st.cm.position.copy(st.pos.cm);
      st.cm.lookAt(st.pos.winger.x, 0, st.pos.winger.z);
      st.winger.lookAt(0, 0, GOAL_Z);
      st.extras.forEach(e => {
        if (e.def.runsTo && st.phase === "playout")
          e.mesh.position.lerp(V(...e.def.runsTo), 0.02);
      });
      if (!st.ballFly) st.ball.position.set(st.pos.cm.x + 0.5, 0.24, st.pos.cm.z + 0.4);
      st.halo.material.opacity = 0.6 + 0.35 * Math.abs(Math.sin(now / 300));

      // broadcast camera: high, behind the attack, biased toward the winger
      const camT = new THREE.Vector3(st.pos.winger.x * 0.55, 12, st.pos.winger.z + 17);
      st.camera.position.lerp(camT, 0.06);
      st.camera.lookAt(st.pos.winger.x * 0.6, 0.5, (st.pos.winger.z + GOAL_Z) / 2);

      st.renderer.render(st.scene, st.camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      st.alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', scheduleResize);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      // dispose returns all scene resources including the canvas (via the
      // factory's dispose contract used by every other Elite game).
      handles.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, inScenario]); // rebuild ONLY on scenario change or enter/exit — never on phase

  /* keep sim's phase in sync + kick off playout with the picked option */
  useEffect(() => {
    const st = S.current; if (!st?.alive) return;
    st.phase = phase;
    if (phase === "playout" && picked) {
      st.playoutOpt = picked; st.playT = 0; st.ballFly = null; st.outcomeShown = false;
      st.wingerStart = st.pos.winger.clone(); st.defStart = st.pos.defender.clone();
      st.arrows?.forEach(a => { a.visible = false; });           // clear unchosen arrows
      const keep = st.arrows?.[SCENARIOS[idx].options.findIndex(o => o.key === picked.key)];
      if (keep) keep.visible = true;
    }
    if (phase === "feedback" && picked) {
      const best = sc.options.reduce((a, b) => (a.pts > b.pts ? a : b));
      const speedPts = Math.round((1 - Math.min(1, (Math.max(800, Math.min(4000, picked.ms)) - 800) / 3200)) * 10);
      const pts = Math.max(0, Math.min(100, Math.round(picked.pts * 0.9) + speedPts));
      const entry = {
        id: sc.id, title: sc.title, runType: sc.runType,
        picked: picked.key, pts, reason: picked.reason,
        best: picked.key === best.key ? null : best,
      };
      setResults(r => (r.some(x => x.id === entry.id) ? r : [...r, entry]));
      setFeedback(entry);
    }
  }, [phase, picked, idx, sc]);

  const next = () => {
    if (idx + 1 < SCENARIOS.length) {
      S.current = null;                                          // rebuild scene for next scenario
      setIdx(i => i + 1); setPicked(null); setFeedback(null); setPhase("watch");
    } else {
      const finished = results;
      const score = finished.length
        ? Math.round(finished.reduce((a, r) => a + r.pts, 0) / finished.length)
        : 0;
      setFinalScore(score);
      setPhase("done");
      onComplete?.({ score, runs: finished });
    }
  };

  const goBackToHub = () => navigate('/iq-training');

  const strip = { fontFamily: COL.mono, background: "rgba(0,0,0,0.85)", borderLeft: `3px solid ${COL.accent}`, padding: "10px 16px" };

  const panel = (
    <div style={strip}>
      <p style={{ fontSize: 9, letterSpacing: "0.22em", color: COL.accent, margin: "0 0 3px", textTransform: "uppercase" }}>
        {sc.title} · {phase === "watch" ? "Watch the picture…" : phase === "frozen" ? "FROZEN — tap a run on the pitch" : phase === "playout" ? "Your run…" : "Coach's verdict"}
      </p>
      <p style={{ fontSize: 11, color: "#ffffffb0", margin: 0, lineHeight: 1.5 }}>{sc.brief}</p>
    </div>
  );

  const canvasSlot = (
    <>
      <div ref={mountRef} style={{ width: "100%", height: "60vh", minHeight: 320, maxHeight: 620 }} />
      {phase === "feedback" && feedback && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)", padding: 16 }}>
          <div style={{ maxWidth: 470, width: "100%", borderLeft: `3px solid ${feedback.pts >= 60 ? COL.accent : COL.red}`, background: "#071a0e", padding: "20px 24px", maxHeight: "90%", overflowY: "auto" }}>
            <p style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: feedback.pts >= 60 ? COL.accent : COL.red, margin: "0 0 8px" }}>
              {feedback.pts >= 80 ? "Elite movement" : feedback.pts >= 60 ? "Good run" : "Coach's note"} · {feedback.pts}/100 · {feedback.runType}
            </p>
            <p style={{ fontSize: 13, color: "#ffffffd9", lineHeight: 1.65, margin: "0 0 12px" }}>{feedback.reason}</p>
            {feedback.best && (
              <div style={{ borderTop: "1px solid #ffffff10", paddingTop: 12 }}>
                <p style={{ fontSize: 9, color: "#ffffff55", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Better run here · {feedback.best.key} — {feedback.best.short}
                </p>
                <p style={{ fontSize: 11, color: "#ffffff80", margin: 0, lineHeight: 1.6 }}>{feedback.best.reason}</p>
              </div>
            )}
            <button onClick={next} style={{ marginTop: 14, fontFamily: COL.mono, fontWeight: 900, fontSize: 12, letterSpacing: "0.1em", padding: "10px 26px", background: COL.accent, color: "#04120a", border: "none", cursor: "pointer" }}>
              {idx + 1 < SCENARIOS.length ? "NEXT RUN" : "FINISH"}
            </button>
          </div>
        </div>
      )}
      {/* docked confirm bar — informational only; the pitch is the input */}
      <div style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", background: "#04120a" }}>
        {phase === "frozen" && (selected ? (
          <p style={{ fontFamily: COL.mono, fontSize: 11, margin: 0, color: "#fff", textAlign: "center" }}>
            <span style={{ color: OPT_CSS[selected.key], fontWeight: 900 }}>{selected.key}</span>
            {" — "}{selected.short}
            <span style={{ color: COL.accent, fontWeight: 900, letterSpacing: "0.08em" }}> · TAP AGAIN TO CONFIRM</span>
          </p>
        ) : (
          <p style={{ fontFamily: COL.mono, fontSize: 10, margin: 0, color: "#ffffff70", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Tap a line or badge · tap twice to run it
          </p>
        ))}
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: COL.mono, background: "#04120a", border: "1px solid #ffffff14", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #ffffff10" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.22em", color: COL.accent, textTransform: "uppercase" }}>Lose Your Marker</span>
        <span style={{ fontSize: 10, color: "#ffffff55" }}>RUN {Math.min(idx + 1, SCENARIOS.length)} / {SCENARIOS.length}</span>
      </div>

      {phase === "intro" && (
        <div style={{ padding: "34px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: "0 0 10px" }}>Runs That Beat Defenders</p>
          <p style={{ fontSize: 12, color: "#ffffff99", lineHeight: 1.7, maxWidth: 470, margin: "0 auto" }}>
            Watch the picture build — you're the winger with the <b style={{ color: "#ff7a1f" }}>halo</b>.
            When the passer's ring pulses, the play <b>freezes</b> and three runs appear on the pitch.
            Pick the one that loses your marker. You're scored on the quality of the
            decision for THIS picture — then you'll watch your run play out.
          </p>
          <button onClick={() => setPhase("watch")} style={{ marginTop: 16, fontFamily: COL.mono, fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", padding: "12px 34px", background: COL.accent, color: "#04120a", border: "none", cursor: "pointer" }}>START</button>
        </div>
      )}

      {inScenario && (
        <div style={{ padding: "10px 12px" }}>
          <GameStageLayout canvas={canvasSlot} panel={panel} panelSide="above" panelWidth={240} />
        </div>
      )}

      {phase === "done" && (
        <div style={{ padding: "34px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.25em", color: COL.accent, textTransform: "uppercase", margin: "0 0 12px" }}>
            Session complete
          </p>
          <p style={{ fontSize: 44, fontWeight: 900, color: "#fff", margin: "0 0 6px", lineHeight: 1 }}>
            {finalScore}<span style={{ color: "#ffffff55", fontSize: 22 }}> / 100</span>
          </p>
          <p style={{ fontSize: 12, color: "#ffffff99", margin: "0 0 20px" }}>
            {SCENARIOS.length} runs · Lose Your Marker
          </p>
          <button
            onClick={goBackToHub}
            style={{ fontFamily: COL.mono, fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", padding: "12px 34px", background: COL.accent, color: "#04120a", border: "none", cursor: "pointer" }}
          >
            BACK TO HUB
          </button>
        </div>
      )}
    </div>
  );
}
