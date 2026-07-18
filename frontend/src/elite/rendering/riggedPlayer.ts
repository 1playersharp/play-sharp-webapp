import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * riggedPlayer.ts — GLB-backed player for the Elite 3D games. (v2 — fluidity pass)
 *
 * Drop-in companion to createPlayerMesh() in PitchRenderer.ts. Same shape:
 * factory functions returning THREE.Group, parts hung off userData, animation
 * driven from the game's own RAF loop. NO react-three-fiber.
 *
 *   await ensurePlayerModel();                      // once, before the scene builds
 *   const p = createRiggedPlayer();
 *   startLocomotion(p, { idle: 'Idle', move: 'Jogging' });
 *   scene.add(p);
 *   // ...in the RAF loop:
 *   setLocomotionSpeed(p, currentSpeed);            // m/s, from your movement code
 *   setBodyYaw(p, -0.8);                            // targets — damped internally
 *   setHeadYaw(p,  0.8);
 *   updateRiggedPlayer(p, dt);
 *
 * WHAT CHANGED vs v1 and why:
 *
 * 1. ADDITIVE yaw layering. v1 overwrote the chest/head rotation with the
 *    static bind pose + offset every frame, which erased ALL of the clip's
 *    spine/head animation — the legs jogged while the torso sat frozen.
 *    Now the mixer writes the animated pose and the yaw/lean offsets are
 *    ADDED on top. The mixer rewrites the pose next frame, so nothing
 *    accumulates.
 *
 * 2. DAMPED targets. setBodyYaw/setHeadYaw/setLean/setLocomotionSpeed now set
 *    TARGETS; updateRiggedPlayer eases toward them. Head eases faster than
 *    chest (eyes lead, torso follows) — that ordering is what makes a scan
 *    read as human.
 *
 * 3. SPEED-BLENDED locomotion. Idle and jog play simultaneously, weighted by
 *    speed, instead of a hard clip swap at a threshold. Stride rate is set on
 *    the MOVE ACTION only (setEffectiveTimeScale), never on the global mixer,
 *    so one-shot clips (pass, strike) are unaffected.
 *
 * 4. Root motion: clips MUST be exported from Mixamo with "In Place" checked.
 *    A clip that translates the hips fights the game's own translation and
 *    slides no matter what the timeScale does. The dev log flags suspicious
 *    root motion at load.
 */

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export const PLAYER_MODEL_URL = '/models/players/outfield.glb';

/**
 * Draco decoder. The GLB is Draco-compressed; without this the load fails and
 * you get *nothing on screen with no error*.
 *
 * Self-hosted by default — copy the decoder in once:
 *   cp -r node_modules/three/examples/jsm/libs/draco/ public/draco/
 */
export const DRACO_DECODER_PATH = '/draco/';

/** Match the ~2.02m procedural players from createPlayerMesh(). Measured at load. */
const TARGET_HEIGHT = 2.02;

/**
 * MODEL_YAW_OFFSET — verified empirically over two rounds of feedback.
 * Mixamo forward is +Z; callers expect yaw=0 to face world -Z. See v1 notes.
 * The dev self-check in createRiggedPlayer catches regressions on rig swaps.
 */
const MODEL_YAW_OFFSET = Math.PI;

/** Easing rates (per-second). Higher = snappier. */
const RATE_CHEST = 8;      // torso opens deliberately
const RATE_HEAD = 14;      // eyes move faster than torsos
const RATE_LEAN = 8;
const RATE_LOCO_WEIGHT = 10; // idle<->move blend
const RATE_STRIDE = 6;       // stride-rate (timeScale) changes

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RiggedPlayerOptions {
  /** Optional one-shot clip to start on. For movement, call startLocomotion instead. */
  action?: string;
  position?: [number, number, number];
  /** Rotation about Y, radians. Applied on top of MODEL_YAW_OFFSET. */
  yaw?: number;
  castShadow?: boolean;
}

export interface LocomotionOptions {
  /** Clip names baked into the GLB. */
  idle?: string;
  move?: string;
  /** m/s at which the raw move clip looks natural at timeScale 1. ~3.5 for Mixamo Jogging on the 2m player. */
  referenceSpeed?: number;
  /** Speed (m/s) at which the blend reaches full move weight. */
  blendSpeed?: number;
}

interface PlayerBones {
  hips: THREE.Bone | null;
  chest: THREE.Bone | null;
  neck: THREE.Bone | null;
  head: THREE.Bone | null;
}

interface LocomotionState {
  idle: THREE.AnimationAction | null;
  move: THREE.AnimationAction | null;
  referenceSpeed: number;
  blendSpeed: number;
  weight: number;        // current move weight (0 = idle, 1 = move)
  weightTarget: number;
  stride: number;        // current move timeScale
  strideTarget: number;
}

interface RiggedUserData {
  rigged: true;
  mixer: THREE.AnimationMixer;
  /** Mixer root (the cloned model). Needed for uncacheRoot on removal. */
  model: THREE.Group;
  actions: Record<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null; // current one-shot override, if any
  bones: PlayerBones;
  loco: LocomotionState | null;
  // Body Shape channels: target set by callers, current damped in update.
  bodyYaw: number; bodyYawTarget: number;
  headYaw: number; headYawTarget: number;
  lean: number;    leanTarget: number;
  /** Geometry/materials are SHARED with the cache — never dispose per-instance. */
  shared: true;
}

interface LoadedModel {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  scale: number;
  measuredHeight: number;
}

/* ------------------------------------------------------------------ */
/* Bone resolution                                                     */
/* ------------------------------------------------------------------ */

/**
 * Mixamo prefixes everything (mixamorig:Spine2). Meshy/Tripo/Rigify all differ.
 * Match loosely, and prefer the UPPER spine so the twist reads at the shoulders
 * rather than folding at the waist.
 */
const BONE_ALIASES: Record<keyof PlayerBones, string[]> = {
  hips: ['hips', 'pelvis', 'root'],
  chest: ['spine2', 'upperchest', 'chest', 'spine1', 'spine'],
  neck: ['neck'],
  head: ['head'],
};

function resolveBones(root: THREE.Object3D): PlayerBones {
  const bones: THREE.Bone[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
  });

  const pick = (keys: string[]): THREE.Bone | null => {
    for (const k of keys) {
      const hit = bones.find((b) => b.name.toLowerCase().includes(k));
      if (hit) return hit;
    }
    return null;
  };

  return {
    hips: pick(BONE_ALIASES.hips),
    chest: pick(BONE_ALIASES.chest),
    neck: pick(BONE_ALIASES.neck),
    head: pick(BONE_ALIASES.head),
  };
}

/* ------------------------------------------------------------------ */
/* Load + cache                                                        */
/* ------------------------------------------------------------------ */

let cache: Promise<LoadedModel> | null = null;
let dracoLoader: DRACOLoader | null = null;

export function preloadPlayerModel(url: string = PLAYER_MODEL_URL): Promise<LoadedModel> {
  if (cache) return cache;

  cache = new Promise<LoadedModel>((resolve, reject) => {
    const loader = new GLTFLoader();

    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene as THREE.Group;

        // Tripo bakes metallicFactor=1 with no override -> chrome-dark under
        // the scene's ACES tone mapping. Fix once on the shared materials.
        // NOTE: no kit tinting — base texture bakes skin AND kit into one map.
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial;
            if (std && 'metalness' in std) {
              std.metalness = 0;
              std.roughness = 0.8;
              std.needsUpdate = true;
            }
          }
        });

        // Measure so we match the procedural players rather than guessing.
        const box = new THREE.Box3().setFromObject(scene);
        const measuredHeight = box.max.y - box.min.y;
        const scale = measuredHeight > 0 ? TARGET_HEIGHT / measuredHeight : 1;

        if (import.meta.env?.DEV) {
          const bones = resolveBones(scene);
          // Flag clips that translate the hips: they fight game translation
          // and read as foot-sliding. Re-download from Mixamo with "In Place".
          const rootMotion = gltf.animations
            .filter((clip) =>
              clip.tracks.some(
                (t) =>
                  t.name.toLowerCase().includes('hips.position') &&
                  trackTravel(t as THREE.VectorKeyframeTrack) > 0.15
              )
            )
            .map((c) => c.name);
          // eslint-disable-next-line no-console
          console.info(
            `[riggedPlayer] ${url}\n` +
              `  height ${measuredHeight.toFixed(3)} -> scale ${scale.toFixed(4)} (target ${TARGET_HEIGHT})\n` +
              `  feet y ${box.min.y.toFixed(3)} (should be ~0)\n` +
              `  clips: ${gltf.animations.map((a) => a.name).join(', ') || '(none)'}\n` +
              `  chest=${bones.chest?.name ?? 'MISSING'}  head=${bones.head?.name ?? 'MISSING'}` +
              (rootMotion.length
                ? `\n  WARNING: root motion detected in [${rootMotion.join(', ')}] — ` +
                  `re-export from Mixamo with "In Place" or feet will slide.`
                : '')
          );
          if (!bones.chest || !bones.head) {
            // eslint-disable-next-line no-console
            console.error('[riggedPlayer] chest/head not resolved — Body Shape torso/head split will not work.');
          }
        }

        resolve({ scene, clips: gltf.animations, scale, measuredHeight });
      },
      undefined,
      (err) => {
        cache = null;
        reject(err);
      }
    );
  });

  return cache;
}

/** Rough XZ travel of a position track — used to sniff root motion in dev. */
function trackTravel(track: THREE.VectorKeyframeTrack): number {
  const v = track.values;
  if (v.length < 6) return 0;
  const n = v.length;
  const dx = v[n - 3] - v[0];
  const dz = v[n - 1] - v[2];
  return Math.hypot(dx, dz);
}

/**
 * Clears the cached GLB.
 *
 * IMPORTANT: createPitchScene()'s dispose() traverses the whole scene and
 * disposes every geometry/material it finds. Cloned skinned meshes SHARE those
 * with the cache, so after a game unmounts the cached source is gutted. Call
 * this alongside handles.dispose() so the next game reloads clean.
 */
export function disposePlayerCache(): void {
  cache = null;
  loaded = null;
  dracoLoader?.dispose();
  dracoLoader = null;
}

let loaded: LoadedModel | null = null;

/** Resolve + stash synchronously usable state. Await this before createRiggedPlayer. */
export async function ensurePlayerModel(url: string = PLAYER_MODEL_URL): Promise<LoadedModel> {
  loaded = await preloadPlayerModel(url);
  return loaded;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/**
 * Mirrors createPlayerMesh() from PitchRenderer.ts — synchronous, returns a
 * Group ready to scene.add(). Requires ensurePlayerModel() to have resolved.
 */
export function createRiggedPlayer(opts: RiggedPlayerOptions = {}): THREE.Group {
  if (!loaded) {
    throw new Error(
      '[riggedPlayer] createRiggedPlayer() called before the model loaded. ' +
        'await ensurePlayerModel() first.'
    );
  }

  // SkeletonUtils.clone deep-clones the bone hierarchy. A plain .clone() shares
  // the skeleton and every instance collapses into the same pose.
  const model = cloneSkinned(loaded.scene) as THREE.Group;

  const group = new THREE.Group();
  group.add(model);
  group.scale.setScalar(loaded.scale);

  const castShadow = opts.castShadow ?? true;
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
    }
  });

  if (opts.position) group.position.set(...opts.position);
  group.rotation.y = MODEL_YAW_OFFSET + (opts.yaw ?? 0);

  const mixer = new THREE.AnimationMixer(model);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of loaded.clips) {
    actions[clip.name] = mixer.clipAction(clip, model);
  }

  const bones = resolveBones(model);

  const data: RiggedUserData = {
    rigged: true,
    mixer,
    model,
    actions,
    current: null,
    bones,
    loco: null,
    bodyYaw: 0, bodyYawTarget: 0,
    headYaw: 0, headYawTarget: 0,
    lean: 0,    leanTarget: 0,
    shared: true,
  };
  group.userData = { ...group.userData, ...data };

  // Mirror createPlayerMesh's userData convention so game code can reach parts.
  group.userData.head = bones.head;

  // One-shot start clip only if explicitly asked. Movement should go through
  // startLocomotion() so it gets speed blending.
  if (opts.action) playAction(group, opts.action);

  // Dev-only self-check: getFacing() reads the chest bone's world -Z and
  // assumes that's the character's forward. If it disagrees with the group's
  // forward, MODEL_YAW_OFFSET or the rig's axis convention is wrong. Fail loud
  // so a future rig swap can't silently break Body Shape / Scanning.
  if (import.meta.env?.DEV) {
    mixer.update(0); // apply bind pose before sampling
    const groupFwd = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));
    const chestFwd = new THREE.Vector3();
    const src = bones.chest ?? group;
    src.getWorldQuaternion(_qDev);
    chestFwd.set(0, 0, -1).applyQuaternion(_qDev);
    chestFwd.y = 0; chestFwd.normalize();
    groupFwd.y = 0; groupFwd.normalize();
    const dot = groupFwd.dot(chestFwd);
    if (dot < 0.5) {
      // eslint-disable-next-line no-console
      console.error(
        `[riggedPlayer] facing self-check FAILED — group forward ${groupFwd.toArray().map((v) => v.toFixed(2))} ` +
          `vs getFacing() ${chestFwd.toArray().map((v) => v.toFixed(2))} (dot=${dot.toFixed(2)}). ` +
          `Adjust MODEL_YAW_OFFSET (try 0, ±π/2, or π) or check that chest bone forward is local -Z.`
      );
    }
  }

  return group;
}

// Scratch quaternion reused by the dev self-check above.
const _qDev = new THREE.Quaternion();

/* ------------------------------------------------------------------ */
/* Locomotion (idle <-> move speed blend)                              */
/* ------------------------------------------------------------------ */

/**
 * Set up the idle/move blend. Both actions play permanently; their WEIGHTS
 * track the player's speed, so standing -> jogging is a continuous ramp
 * instead of a crossfade pop at some threshold.
 */
export function startLocomotion(player: THREE.Group, opts: LocomotionOptions = {}): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;

  const idleName = opts.idle ?? 'Idle';
  const moveName = opts.move ?? 'Jogging';
  const idle = resolveAction(d, idleName);
  const move = resolveAction(d, moveName);

  idle?.reset().setEffectiveWeight(1).play();
  move?.reset().setEffectiveWeight(0).play();

  d.loco = {
    idle,
    move,
    referenceSpeed: opts.referenceSpeed ?? 3.5,
    blendSpeed: opts.blendSpeed ?? 1.2,
    weight: 0,
    weightTarget: 0,
    stride: 1,
    strideTarget: 1,
  };
}

/**
 * Call from the RAF loop with the character's real translation speed (m/s).
 * Sets TARGETS; updateRiggedPlayer damps toward them.
 *
 * - Blend weight ramps idle->move over [0, blendSpeed] m/s.
 * - Stride rate = speed / referenceSpeed, set on the MOVE ACTION only,
 *   clamped to [0.5, 2.2] so slow drift doesn't look like slow motion
 *   (the idle blend covers near-zero speeds).
 *
 * Backpedals: negative timeScale on a forward jog reads broken (arms swing
 * wrong). Speeds <= 0 blend to idle instead. Grab Mixamo's "Jog Backward"
 * clip and add a third blend channel when backpedal matters.
 */
export function setLocomotionSpeed(player: THREE.Group, speed: number): void {
  const d = player.userData as RiggedUserData;
  const loco = d?.loco;
  if (!d?.rigged || !loco) return;

  const s = Math.max(0, speed);
  loco.weightTarget = Math.min(1, s / loco.blendSpeed);
  loco.strideTarget = clamp(s / loco.referenceSpeed, 0.5, 2.2);
}

function resolveAction(d: RiggedUserData, name: string): THREE.AnimationAction | null {
  const action = d.actions[name];
  if (action) return action;
  const available = Object.keys(d.actions);
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[riggedPlayer] no clip "${name}". Available: ${available.join(', ') || '(none)'}.`
    );
  }
  return available.length ? d.actions[available[0]] : null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ------------------------------------------------------------------ */
/* One-shot actions                                                    */
/* ------------------------------------------------------------------ */

/**
 * Crossfade to a one-shot clip (pass, strike, header...), fading the
 * locomotion pair down. Call resumeLocomotion() when it finishes.
 */
export function playAction(player: THREE.Group, name?: string, fade = 0.2): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged || !name) return;

  const next = resolveAction(d, name);
  if (!next || d.current === next) return;

  d.loco?.idle?.fadeOut(fade);
  d.loco?.move?.fadeOut(fade);
  d.current?.fadeOut(fade);
  next.reset().fadeIn(fade).play();
  d.current = next;
}

/** Fade the one-shot out and hand control back to the idle/move blend. */
export function resumeLocomotion(player: THREE.Group, fade = 0.2): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;
  d.current?.fadeOut(fade);
  d.current = null;
  d.loco?.idle?.reset().fadeIn(fade).play();
  d.loco?.move?.reset().fadeIn(fade).play();
  // Weights re-assert from the damped blend on the next update.
}

/* ------------------------------------------------------------------ */
/* Per-frame update                                                    */
/* ------------------------------------------------------------------ */

/**
 * Call once per frame from the game's RAF loop — the counterpart to
 * animatePlayerStep() for procedural players.
 *
 * Order matters, and it's the OPPOSITE of v1: the mixer writes the full
 * animated pose (spine sway, head bob, all of it), THEN the Body Shape
 * offsets are ADDED on top. The mixer rewrites the pose next frame, so the
 * additions never accumulate — and the clip's life is preserved instead of
 * being stomped by a static rest pose.
 */
export function updateRiggedPlayer(player: THREE.Group, dt: number): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;

  // --- Damp Body Shape channels toward their targets ---------------
  d.bodyYaw += (d.bodyYawTarget - d.bodyYaw) * ease(RATE_CHEST, dt);
  d.headYaw += (d.headYawTarget - d.headYaw) * ease(RATE_HEAD, dt);
  d.lean    += (d.leanTarget    - d.lean)    * ease(RATE_LEAN, dt);

  // --- Damp locomotion blend + stride rate -------------------------
  const loco = d.loco;
  if (loco && !d.current) {
    loco.weight += (loco.weightTarget - loco.weight) * ease(RATE_LOCO_WEIGHT, dt);
    loco.stride += (loco.strideTarget - loco.stride) * ease(RATE_STRIDE, dt);
    loco.move?.setEffectiveWeight(loco.weight);
    loco.idle?.setEffectiveWeight(1 - loco.weight);
    loco.move?.setEffectiveTimeScale(loco.stride); // move action ONLY — never mixer.timeScale
  }

  // --- Animate, then layer additively ------------------------------
  d.mixer.update(dt);

  const { chest, head } = d.bones;
  if (chest) {
    chest.rotation.y += d.bodyYaw; // on top of the animated pose
    chest.rotation.x += d.lean;
  }
  if (head) {
    // Head yaw is RELATIVE to the torso, so the eyes can stay on the ball
    // while the body opens away from it. That is the whole Body Shape lesson.
    head.rotation.y += d.headYaw;
  }
}

/** Frame-rate-independent easing factor for exponential damping. */
function ease(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/* ------------------------------------------------------------------ */
/* Body Shape controls (set TARGETS — damped in updateRiggedPlayer)    */
/* ------------------------------------------------------------------ */

/** Torso twist relative to the root, radians. + opens to the player's right. */
export function setBodyYaw(player: THREE.Group, radians: number, immediate = false): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;
  d.bodyYawTarget = radians;
  if (immediate) d.bodyYaw = radians;
}

/** Head turn relative to the torso, radians. */
export function setHeadYaw(player: THREE.Group, radians: number, immediate = false): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;
  d.headYawTarget = radians;
  if (immediate) d.headYaw = radians;
}

/** Small forward lean, radians. */
export function setLean(player: THREE.Group, radians: number, immediate = false): void {
  const d = player.userData as RiggedUserData;
  if (!d?.rigged) return;
  d.leanTarget = radians;
  if (immediate) d.lean = radians;
}

const _q = new THREE.Quaternion();

/** World-space direction the TORSO faces, flattened to XZ. Scoring input. */
export function getFacing(player: THREE.Group, out?: THREE.Vector3): THREE.Vector3 {
  const d = player.userData as RiggedUserData;
  const src = d?.bones?.chest ?? player;
  src.getWorldQuaternion(_q);
  const v = (out ?? new THREE.Vector3()).set(0, 0, -1).applyQuaternion(_q);
  v.y = 0;
  return v.normalize();
}

/** World-space direction the HEAD/eyes point, flattened to XZ. Scoring input. */
export function getGaze(player: THREE.Group, out?: THREE.Vector3): THREE.Vector3 {
  const d = player.userData as RiggedUserData;
  const src = d?.bones?.head ?? player;
  src.getWorldQuaternion(_q);
  const v = (out ?? new THREE.Vector3()).set(0, 0, -1).applyQuaternion(_q);
  v.y = 0;
  return v.normalize();
}

/** Angle in radians between the torso's facing and a world point. 0 = square on. */
export function facingErrorTo(player: THREE.Group, target: THREE.Vector3): number {
  const facing = getFacing(player);
  const to = target.clone().sub(player.position);
  to.y = 0;
  to.normalize();
  return facing.angleTo(to);
}

/** Angle in radians between the gaze and a world point. Use for "did they scan?". */
export function gazeErrorTo(player: THREE.Group, target: THREE.Vector3): number {
  const gaze = getGaze(player);
  const to = target.clone().sub(player.position);
  to.y = 0;
  to.normalize();
  return gaze.angleTo(to);
}

/* ------------------------------------------------------------------ */
/* Teardown                                                            */
/* ------------------------------------------------------------------ */

/**
 * Remove a player from the scene. Does NOT dispose geometry/materials — those
 * are shared with the cache and with every other instance.
 *
 * v1 bug: uncacheRoot(player) matched nothing because the mixer's root is the
 * cloned MODEL, not the wrapper group. Uncache the real root.
 */
export function removeRiggedPlayer(player: THREE.Group): void {
  const d = player.userData as RiggedUserData;
  d?.mixer?.stopAllAction();
  if (d?.mixer && d?.model) d.mixer.uncacheRoot(d.model);
  player.parent?.remove(player);
}
