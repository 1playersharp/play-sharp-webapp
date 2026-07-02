import * as THREE from 'three';

export interface SceneHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  pitchGroup: THREE.Group;
  goals: { north: THREE.Group; south: THREE.Group };
  resize: () => void;
  dispose: () => void;
}

export interface PitchOptions {
  container: HTMLElement;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov?: number;
}

export const PITCH = {
  length: 60,
  width: 40,
  goalWidth: 6,
  goalHeight: 2.5,
  centerCircleRadius: 7,
  penaltyAreaLength: 14,
  penaltyAreaWidth: 24,
  goalAreaLength: 5,
  goalAreaWidth: 14,
  penaltySpotDistance: 9,
} as const;

export function createPitchScene(opts: PitchOptions): SceneHandles {
  const { container } = opts;
  const w = Math.max(1, container.clientWidth);
  const h = Math.max(1, container.clientHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1729');
  scene.fog = new THREE.Fog('#0a1729', 90, 220);

  const camera = new THREE.PerspectiveCamera(opts.fov ?? 48, w / h, 0.1, 500);
  const camPos = opts.cameraPosition ?? [0, 28, 38];
  const camTarget = opts.cameraTarget ?? [0, 0, 0];
  camera.position.set(camPos[0], camPos[1], camPos[2]);
  camera.lookAt(camTarget[0], camTarget[1], camTarget[2]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xa8c8ff, 0x0a1729, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(25, 45, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0xb6d4ff, 0.45);
  rim.position.set(-25, 25, -15);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(0, 30, -30);
  scene.add(fill);

  const pitchGroup = createPitchGroup();
  scene.add(pitchGroup);

  const northGoal = createGoalMesh();
  northGoal.position.set(0, 0, -PITCH.length / 2);
  northGoal.rotation.y = Math.PI;
  scene.add(northGoal);

  const southGoal = createGoalMesh();
  southGoal.position.set(0, 0, PITCH.length / 2);
  scene.add(southGoal);

  scene.add(createStadium());

  const resize = () => {
    const W = Math.max(1, container.clientWidth);
    const H = Math.max(1, container.clientHeight);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  };

  const dispose = () => {
    scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      const m = obj.material;
      if (m) {
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose && mm.dispose());
        else m.dispose && m.dispose();
      }
    });
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  return { scene, camera, renderer, pitchGroup, goals: { north: northGoal, south: southGoal }, resize, dispose };
}

function createPitchGroup(): THREE.Group {
  const g = new THREE.Group();

  const grassMat = new THREE.ShaderMaterial({
    uniforms: {
      stripeWidth: { value: 4.5 },
      colorA: { value: new THREE.Color('#2e8c3e') },
      colorB: { value: new THREE.Color('#256f33') },
      pitchLen: { value: PITCH.length },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float stripeWidth;
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform float pitchLen;
      varying vec2 vUv;
      void main() {
        float z = vUv.y * pitchLen;
        float band = floor(z / stripeWidth);
        float stripe = mod(band, 2.0);
        vec3 c = mix(colorA, colorB, stripe);
        // subtle radial vignette
        float r = distance(vUv, vec2(0.5));
        c *= mix(1.05, 0.78, smoothstep(0.0, 0.95, r));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });

  const surface = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.width, PITCH.length, 1, 1), grassMat);
  surface.rotation.x = -Math.PI / 2;
  surface.receiveShadow = true;
  g.add(surface);

  const lines = createLineMarkings();
  lines.position.y = 0.015;
  g.add(lines);

  return g;
}

function createLineMarkings(): THREE.Group {
  const g = new THREE.Group();
  const lineThickness = 0.18;
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const addRect = (x: number, z: number, w: number, l: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0, z);
    g.add(m);
  };

  const halfW = PITCH.width / 2;
  const halfL = PITCH.length / 2;

  addRect(0, -halfL, PITCH.width, lineThickness);
  addRect(0, halfL, PITCH.width, lineThickness);
  addRect(-halfW, 0, lineThickness, PITCH.length);
  addRect(halfW, 0, lineThickness, PITCH.length);
  addRect(0, 0, PITCH.width, lineThickness);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(PITCH.centerCircleRadius - lineThickness / 2, PITCH.centerCircleRadius + lineThickness / 2, 64),
    lineMat
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);

  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), lineMat);
  spot.rotation.x = -Math.PI / 2;
  g.add(spot);

  for (const side of [-1, 1] as const) {
    const baseZ = side * halfL;
    const innerZ = baseZ - side * PITCH.penaltyAreaLength;

    addRect(-PITCH.penaltyAreaWidth / 2, baseZ - (side * PITCH.penaltyAreaLength) / 2, lineThickness, PITCH.penaltyAreaLength);
    addRect(PITCH.penaltyAreaWidth / 2, baseZ - (side * PITCH.penaltyAreaLength) / 2, lineThickness, PITCH.penaltyAreaLength);
    addRect(0, innerZ, PITCH.penaltyAreaWidth, lineThickness);

    addRect(-PITCH.goalAreaWidth / 2, baseZ - (side * PITCH.goalAreaLength) / 2, lineThickness, PITCH.goalAreaLength);
    addRect(PITCH.goalAreaWidth / 2, baseZ - (side * PITCH.goalAreaLength) / 2, lineThickness, PITCH.goalAreaLength);
    addRect(0, baseZ - side * PITCH.goalAreaLength, PITCH.goalAreaWidth, lineThickness);

    const ps = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), lineMat);
    ps.rotation.x = -Math.PI / 2;
    ps.position.set(0, 0, baseZ - side * PITCH.penaltySpotDistance);
    g.add(ps);

    const arcInnerR = 7;
    const arcOuterR = 7 + lineThickness;
    const arcSpot = new THREE.Vector3(0, 0, baseZ - side * PITCH.penaltySpotDistance);
    const angleStart = side === 1 ? Math.PI + 0.85 : -0.85;
    const angleLen = side === 1 ? Math.PI - 1.7 : 1.7;
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(arcInnerR, arcOuterR, 32, 1, angleStart, angleLen),
      lineMat
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.copy(arcSpot);
    g.add(arc);
  }

  return g;
}

function createGoalMesh(): THREE.Group {
  const g = new THREE.Group();
  const postR = 0.08;
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.45 });

  const left = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, PITCH.goalHeight, 12), matWhite);
  left.position.set(-PITCH.goalWidth / 2, PITCH.goalHeight / 2, 0);
  left.castShadow = true;
  g.add(left);

  const right = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, PITCH.goalHeight, 12), matWhite);
  right.position.set(PITCH.goalWidth / 2, PITCH.goalHeight / 2, 0);
  right.castShadow = true;
  g.add(right);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, PITCH.goalWidth, 12), matWhite);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, PITCH.goalHeight, 0);
  bar.castShadow = true;
  g.add(bar);

  const netDepth = 1.8;
  const netMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.16, side: THREE.DoubleSide });

  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.goalWidth, PITCH.goalHeight), netMat);
  backNet.position.set(0, PITCH.goalHeight / 2, -netDepth);
  g.add(backNet);

  const topNet = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.goalWidth, netDepth), netMat);
  topNet.rotation.x = -Math.PI / 2;
  topNet.position.set(0, PITCH.goalHeight, -netDepth / 2);
  g.add(topNet);

  const sideLeft = new THREE.Mesh(new THREE.PlaneGeometry(netDepth, PITCH.goalHeight), netMat);
  sideLeft.position.set(-PITCH.goalWidth / 2, PITCH.goalHeight / 2, -netDepth / 2);
  sideLeft.rotation.y = Math.PI / 2;
  g.add(sideLeft);

  const sideRight = sideLeft.clone();
  sideRight.position.x = PITCH.goalWidth / 2;
  g.add(sideRight);

  return g;
}

function createStadium(): THREE.Group {
  const g = new THREE.Group();

  const standMat = new THREE.MeshBasicMaterial({ color: 0x0a1a2a });
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(85, 95, 18, 64, 1, true),
    standMat
  );
  ring.material.side = THREE.BackSide;
  ring.position.y = 6;
  g.add(ring);

  const standTopMat = new THREE.MeshBasicMaterial({ color: 0x07111e });
  const standTop = new THREE.Mesh(new THREE.RingGeometry(70, 95, 64), standTopMat);
  standTop.rotation.x = -Math.PI / 2;
  standTop.position.y = 15;
  g.add(standTop);

  const crowdMat = new THREE.MeshBasicMaterial({ color: 0x1a3050 });
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const r = 76;
    const block = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 4), crowdMat);
    block.position.set(Math.cos(angle) * r, 4, Math.sin(angle) * r);
    block.lookAt(0, 4, 0);
    g.add(block);
  }

  return g;
}

export function createPlayerMesh(jerseyColor: string | number, opts: { numberLabel?: string } = {}): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: jerseyColor as any, roughness: 0.7, metalness: 0.05 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a988, roughness: 0.55 });
  const sockMat = new THREE.MeshStandardMaterial({ color: jerseyColor as any, roughness: 0.6 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.7, 4, 10), bodyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);

  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.32, 12), shortsMat);
  shorts.position.y = 0.65;
  shorts.castShadow = true;
  g.add(shorts);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8), skinMat);
  neck.position.y = 1.5;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), skinMat);
  head.position.y = 1.78;
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 }));
  hair.position.y = 1.79;
  g.add(hair);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.55, 4, 6), bodyMat);
  armL.position.set(-0.42, 1.05, 0);
  armL.castShadow = true;
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.55, 8), skinMat);
  legL.position.set(-0.15, 0.32, 0);
  legL.castShadow = true;
  g.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.15;
  g.add(legR);

  const sockL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.16, 8), sockMat);
  sockL.position.set(-0.15, 0.13, 0);
  g.add(sockL);

  const sockR = sockL.clone();
  sockR.position.x = 0.15;
  g.add(sockR);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.32), bootMat);
  bootL.position.set(-0.15, 0.045, 0.06);
  g.add(bootL);

  const bootR = bootL.clone();
  bootR.position.x = 0.15;
  g.add(bootR);

  if (opts.numberLabel) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 64, 64);
    ctx.font = 'bold 38px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(opts.numberLabel, 32, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(0.55, 0.55, 1);
    sprite.position.set(0, 1.08, 0.35);
    g.add(sprite);
  }

  g.userData.head = head;
  g.userData.legs = [legL, legR];
  g.userData.arms = [armL, armR];

  return g;
}

let ballTextureCache: THREE.CanvasTexture | null = null;
function getBallTexture(): THREE.CanvasTexture {
  if (ballTextureCache) return ballTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#101010';
  const cols = 8;
  const rows = 4;
  const cellW = 512 / cols;
  const cellH = 256 / rows;
  for (let yy = 0; yy < rows; yy++) {
    for (let xx = 0; xx < cols; xx++) {
      if ((xx + yy) % 2 === 0) continue;
      const cx = xx * cellW + cellW / 2;
      const cy = yy * cellH + cellH / 2;
      const r = Math.min(cellW, cellH) * 0.36;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ballTextureCache = new THREE.CanvasTexture(canvas);
  ballTextureCache.anisotropy = 8;
  return ballTextureCache;
}

export function createBallMesh(): THREE.Mesh {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 28, 22),
    new THREE.MeshStandardMaterial({ map: getBallTexture(), roughness: 0.45 })
  );
  ball.castShadow = true;
  return ball;
}

export function quadBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number, out?: THREE.Vector3): THREE.Vector3 {
  const u = 1 - t;
  const v = out ?? new THREE.Vector3();
  v.x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  v.y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  v.z = u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z;
  return v;
}

export function makeArcControl(start: THREE.Vector3, end: THREE.Vector3, peakHeight: number): THREE.Vector3 {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y += peakHeight;
  return mid;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function animatePlayerStep(player: THREE.Group, moving: boolean, dt: number) {
  const legs = player.userData.legs as THREE.Mesh[] | undefined;
  const arms = player.userData.arms as THREE.Mesh[] | undefined;
  const t = (player.userData.gait ?? 0) + dt * (moving ? 9 : 3);
  player.userData.gait = t;
  const swing = Math.sin(t) * (moving ? 0.35 : 0.08);
  if (legs && legs.length === 2) {
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
  }
  if (arms && arms.length === 2) {
    arms[0].rotation.x = -swing * 0.7;
    arms[1].rotation.x = swing * 0.7;
  }
  if (moving) {
    player.position.y = Math.abs(Math.sin(t * 2)) * 0.04;
  } else {
    player.position.y *= 0.85;
  }
}