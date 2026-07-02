import * as THREE from 'three';

/**
 * Shared Three.js visual helpers reused across Elite game modules.
 *
 * Consistent colour language across the Elite suite:
 *   orange  – YOU / user-controlled marker
 *   blue    – pass path / pass-choice marker
 *   lime    – dribble / "good outcome" cue
 *   amber   – "even better option" (never red for the player)
 *   yellow  – critical / attention cue
 */

export const ELITE_COLORS = {
  you: 0xff6a00,
  youRing: 0xffa733,
  pass: 0x38bdf8,
  dribble: 0xa3e635,
  amber: 0xf59e0b,
  yellow: 0xfacc15,
  success: 0x2ead3c,
  away: 0x1c3aa6,
  home: 0xdc2626,
  neutralHome: 0xffffff,
};

export const AMBER_HEX = '#f59e0b';
export const SUCCESS_HEX = '#2ead3c';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function hexToCss(num) {
  return '#' + num.toString(16).padStart(6, '0');
}

/**
 * Small floating tag ("YOU", "CM", "1") that always faces the camera.
 */
export function createLabelSprite(text, { bg = 'rgba(8,14,10,0.88)', fg = '#ffffff', accent = '#facc15', fontSize = 40 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 14);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 14);
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || '', canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.7, 0.85, 1);
  sprite.position.set(0, 2.7, 0);
  sprite.renderOrder = 999;
  return sprite;
}

/**
 * Pulsing ground ring, used to mark YOU and click targets.
 */
export function createHighlightRing(color, { innerR = 0.72, outerR = 1.0 } = {}) {
  const geo = new THREE.RingGeometry(innerR, outerR, 32);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 1;
  return ring;
}

/**
 * Flat directional arrow on the pitch. Direction/length can be updated
 * per-frame via arrow.setDirection() / arrow.setLength().
 */
export function createGroundArrow(start, end, color) {
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const length = Math.max(0.5, dir.length());
  dir.normalize();
  const origin = new THREE.Vector3(start.x, 0.08, start.z);
  const headLength = Math.min(1.3, length * 0.3);
  const headWidth = headLength * 0.65;
  const arrow = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
  arrow.line.material.transparent = true;
  arrow.line.material.opacity = 0.9;
  arrow.cone.material.transparent = true;
  arrow.cone.material.opacity = 0.95;
  arrow.renderOrder = 998;
  return arrow;
}

/**
 * Clickable on-pitch marker: glowing ring + oversized invisible hit-pad + small key tag.
 * Attach `userData.onClick` for the raycast handler; use `updateMarkerColor(marker, color)`
 * to retint post-creation.
 */
export function createClickMarker({ key, color, onClick, tag = true, radius = 0.85 }) {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.3, radius, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 0.2, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.001 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.05;
  group.add(pad);

  if (tag && key) {
    const label = createLabelSprite(String(key), { bg: 'rgba(0,0,0,0.72)', accent: hexToCss(color) });
    label.scale.set(1.1, 0.55, 1);
    label.position.set(0, 1.6, 0);
    group.add(label);
  }

  group.userData.onClick = onClick;
  group.userData.ring = ring;
  group.renderOrder = 996;
  return group;
}

/**
 * Standard raycast handler for canvas click/tap events. Returns the first
 * intersected object's ancestor group that carries userData.onClick, or null.
 */
export function pickClickTarget(event, container, camera, targets) {
  const rect = container.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  const mouse = new THREE.Vector2(
    ((point.clientX - rect.left) / rect.width) * 2 - 1,
    -((point.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return null;
  let node = hits[0].object;
  while (node) {
    if (node.userData && node.userData.onClick) return node;
    node = node.parent;
  }
  return null;
}

/**
 * Retint a click marker (ring + pad).
 */
export function updateMarkerColor(marker, color) {
  marker.traverse((o) => {
    if (o.isMesh && o.material && o.material.color) o.material.color.setHex(color);
  });
}

/**
 * Simple facing/vision cone test — mesh's forward is local -Z. Returns true if
 * `target` (Vector3) lies within `halfAngleRad` of the mesh's forward vector.
 */
export function isInFacingCone(mesh, target, halfAngleRad = Math.PI / 4) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(mesh.quaternion);
  const toTarget = new THREE.Vector3(target.x - mesh.position.x, 0, target.z - mesh.position.z);
  if (toTarget.lengthSq() < 0.0001) return true;
  toTarget.normalize();
  const dot = forward.dot(toTarget);
  return dot >= Math.cos(halfAngleRad);
}
