/**
 * cube3d.js
 * ─────────
 * Fully functional WebGL 3D Rubik's Cube simulator using Three.js.
 * Handles interactive orbital camera controls, smooth layer rotations with easing,
 * raycast sticker painting in 3D, and automatic move playback with speed control.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Configuration
const CUBIE_GAP = 0.95; // slightly smaller than 1 to create gaps between cubies
const FACE_NAMES = ["U", "D", "F", "B", "L", "R"];

// Color scheme mapping: class to Hex
const COLOR_HEX = {
  W: 0xEEEEEE, // White
  Y: 0xFFD500, // Yellow
  B: 0x1C4B8C, // Blue
  G: 0x009B48, // Green
  O: 0xFF5800, // Orange
  R: 0xC41E3A, // Red
  X: 0x18181C  // Dark gray/black for interior faces
};

const HEX_TO_CODE = Object.fromEntries(
  Object.entries(COLOR_HEX).map(([k, v]) => [v, k])
);

// BGR references (backend colors match)
const COLOR_CODE_MAP = {
  0xEEEEEE: "W",
  0xFFD500: "Y",
  0x1C4B8C: "B",
  0x009B48: "G",
  0xFF5800: "O",
  0xC41E3A: "R",
  0x18181C: "X"
};

// Local normals for the 6 faces of a cubie box
const LOCAL_NORMALS = [
  new THREE.Vector3(1, 0, 0),  // index 0: R
  new THREE.Vector3(-1, 0, 0), // index 1: L
  new THREE.Vector3(0, 1, 0),  // index 2: U
  new THREE.Vector3(0, -1, 0), // index 3: D
  new THREE.Vector3(0, 0, 1),  // index 4: F
  new THREE.Vector3(0, 0, -1)  // index 5: B
];

// World face axes target vectors
const WORLD_AXES = {
  "R": new THREE.Vector3(1, 0, 0),
  "L": new THREE.Vector3(-1, 0, 0),
  "U": new THREE.Vector3(0, 1, 0),
  "D": new THREE.Vector3(0, -1, 0),
  "F": new THREE.Vector3(0, 0, 1),
  "B": new THREE.Vector3(0, 0, -1)
};

// Global variables
let scene, camera, renderer, controls;
let cubies = [];
let isRotating = false;

// Expose state update callback to synchronize with frontend state
let onCubeStateChange = null;

/** Initialize the 3D scene, lighting, camera, and controls. */
export function initCube3D(containerId, onStateChangeCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  onCubeStateChange = onStateChangeCallback;
  
  // Clear any existing children
  container.innerHTML = "";

  const width = container.clientWidth || 320;
  const height = container.clientHeight || 320;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e12); // match page dark theme

  // Camera setup
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(5.5, 4.5, 7.5);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 4;
  controls.maxDistance = 15;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight1.position.set(5, 8, 5);
  dirLight1.castShadow = true;
  dirLight1.shadow.mapSize.width = 1024;
  dirLight1.shadow.mapSize.height = 1024;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
  dirLight2.position.set(-5, -3, -5);
  scene.add(dirLight2);

  // Build the physical Rubik's Cube
  buildCube();

  // Raycaster click-to-paint listener
  renderer.domElement.addEventListener('click', handleStickerClick);

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

/** Construct 27 independent cubie meshes. */
function buildCube() {
  // Clear any old cubies
  cubies.forEach(c => scene.remove(c));
  cubies = [];

  // Generate meshes
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = createCubieMesh(x, y, z);
        scene.add(cubie);
        cubies.push(cubie);
      }
    }
  }
}

/** Create a single cubie mesh with appropriate sticker colors. */
function createCubieMesh(x, y, z) {

  // Define material index faces: 0=R, 1=L, 2=U, 3=D, 4=F, 5=B
  // Only paint outer stickers; inner faces get solid dark gray
  const materials = [];
  
  const colors = [
    x === 1 ? COLOR_HEX.B : COLOR_HEX.X,  // R
    x === -1 ? COLOR_HEX.G : COLOR_HEX.X, // L
    y === 1 ? COLOR_HEX.W : COLOR_HEX.X,  // U
    y === -1 ? COLOR_HEX.Y : COLOR_HEX.X, // D
    z === 1 ? COLOR_HEX.R : COLOR_HEX.X,  // F
    z === -1 ? COLOR_HEX.O : COLOR_HEX.X  // B
  ];

  for (let i = 0; i < 6; i++) {
    materials.push(new THREE.MeshStandardMaterial({
      color: colors[i],
      roughness: 0.12,
      metalness: 0.05,
      flatShading: true
    }));
  }

  const geom = new THREE.BoxGeometry(CUBIE_GAP, CUBIE_GAP, CUBIE_GAP);
  const mesh = new THREE.Mesh(geom, materials);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Custom metadata to identify sticker properties
  mesh.userData = { initialX: x, initialY: y, initialZ: z };
  return mesh;
}

/** Smoothly animate layer rotation. */
export function animateMove(move, speedMs = 300) {
  return new Promise((resolve) => {
    if (isRotating) { resolve(); return; }
    isRotating = true;

    // Parse move notation (e.g., R, U', F2)
    const base = move[0];
    const prime = move.includes("'");
    const double = move.includes("2");

    let angle = Math.PI / 2;
    if (prime) angle = -angle;
    if (double) angle = Math.PI;

    // Determine target axis and layer threshold selection
    let axis = new THREE.Vector3();
    let checkFn = () => false;

    switch (base) {
      case "R":
        axis.set(-1, 0, 0); // Rotate counter-clockwise from right perspective
        checkFn = (p) => p.x > 0.5;
        break;
      case "L":
        axis.set(1, 0, 0);
        checkFn = (p) => p.x < -0.5;
        break;
      case "U":
        axis.set(0, -1, 0);
        checkFn = (p) => p.y > 0.5;
        break;
      case "D":
        axis.set(0, 1, 0);
        checkFn = (p) => p.y < -0.5;
        break;
      case "F":
        axis.set(0, 0, -1);
        checkFn = (p) => p.z > 0.5;
        break;
      case "B":
        axis.set(0, 0, 1);
        checkFn = (p) => p.z < -0.5;
        break;
      default:
        isRotating = false;
        resolve();
        return;
    }

    // Select the 9 cubies to rotate
    const targetGroup = new THREE.Group();
    scene.add(targetGroup);

    const rotatingCubies = [];
    cubies.forEach(c => {
      // Use round coordinates to prevent floating point drift issues
      const pos = new THREE.Vector3(
        Math.round(c.position.x),
        Math.round(c.position.y),
        Math.round(c.position.z)
      );
      if (checkFn(pos)) {
        rotatingCubies.push(c);
        targetGroup.add(c);
      }
    });

    // Animate rotation with easing
    const start = performance.now();
    
    function updateRotation() {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / speedMs);
      
      // Easing function: easeInOutQuad
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Reset rotation matrix and apply current ease angle
      targetGroup.rotation.set(0, 0, 0);
      if (axis.x !== 0) targetGroup.rotation.x = axis.x * angle * ease;
      if (axis.y !== 0) targetGroup.rotation.y = axis.y * angle * ease;
      if (axis.z !== 0) targetGroup.rotation.z = axis.z * angle * ease;

      if (progress < 1) {
        requestAnimationFrame(updateRotation);
      } else {
        // Finalize meshes position/quaternion in world space
        targetGroup.updateMatrixWorld();
        
        rotatingCubies.forEach(c => {
          c.applyMatrix4(targetGroup.matrixWorld);
          scene.add(c); // return back to standard scene hierarchy
        });
        
        scene.remove(targetGroup);
        isRotating = false;
        
        // Notify frontend coordinate updates
        if (onCubeStateChange) {
          onCubeStateChange(exportCubeState());
        }
        resolve();
      }
    }
    
    requestAnimationFrame(updateRotation);
  });
}

/** Click on a sticker to paint it. */
function handleStickerClick(event) {
  if (isRotating) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(cubies);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const faceIndex = hit.face.materialIndex;
    const cubie = hit.object;

    // Check if it's an outer face sticker (ignore interior black meshes)
    const colorCode = HEX_TO_CODE[cubie.material[faceIndex].color.getHex()];
    if (colorCode === "X") return; // clicked interior facelet

    // Get active swatch color from parent window state
    const activeColor = window.__getActiveSwatchColor ? window.__getActiveSwatchColor() : "W";
    
    // Update mesh color standard material
    cubie.material[faceIndex].color.setHex(COLOR_HEX[activeColor]);

    // Fire state update callback to sync with Flask state
    if (onCubeStateChange) {
      onCubeStateChange(exportCubeState());
    }
  }
}

/** Helper to query sticker colors in world coordinates. */
export function exportCubeState() {
  const state = {
    U: Array(9).fill("X"),
    D: Array(9).fill("X"),
    F: Array(9).fill("X"),
    B: Array(9).fill("X"),
    L: Array(9).fill("X"),
    R: Array(9).fill("X")
  };

  // Build temporary map of world positions
  cubies.forEach(c => {
    const wx = Math.round(c.position.x);
    const wy = Math.round(c.position.y);
    const wz = Math.round(c.position.z);

    // Look at 6 facelet materials
    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const localNormal = LOCAL_NORMALS[faceIdx];
      // Find where the local normal points in world space
      const worldNormal = localNormal.clone().applyQuaternion(c.quaternion);

      // Match world normal direction to the closest target face
      let bestFace = null;
      let maxDot = -Infinity;
      
      for (const [face, targetVec] of Object.entries(WORLD_AXES)) {
        const dot = worldNormal.dot(targetVec);
        if (dot > maxDot) {
          maxDot = dot;
          bestFace = face;
        }
      }

      // If the worldNormal is aligned to a target face (>0.85 dot product)
      if (maxDot > 0.85) {
        const hex = c.material[faceIdx].color.getHex();
        const code = COLOR_CODE_MAP[hex] || "W";
        
        // Find grid index for the cubie position on this face
        const idx = getStickerGridIndex(bestFace, wx, wy, wz);
        if (idx !== -1) {
          state[bestFace][idx] = code;
        }
      }
    }
  });

  return state;
}

/** Translate x, y, z cubie position to row-major sticker index. */
function getStickerGridIndex(face, x, y, z) {
  // Row-major order mapping index: 0 to 8
  switch (face) {
    case "U": // y = 1, Top face
      // Row 0: z=-1 (x=-1, 0, 1), Row 1: z=0, Row 2: z=1
      return (z + 1) * 3 + (x + 1);
    case "D": // y = -1, Bottom face
      // Row 0: z=1 (x=-1, 0, 1), Row 1: z=0, Row 2: z=-1
      return (1 - z) * 3 + (x + 1);
    case "F": // z = 1, Front face
      // Row 0: y=1 (x=-1, 0, 1), Row 1: y=0, Row 2: y=-1
      return (1 - y) * 3 + (x + 1);
    case "B": // z = -1, Back face
      // Row 0: y=1 (x=1, 0, -1), Row 1: y=0, Row 2: y=-1
      return (1 - y) * 3 + (1 - x);
    case "L": // x = -1, Left face
      // Row 0: y=1 (z=-1, 0, 1), Row 1: y=0, Row 2: y=-1
      return (1 - y) * 3 + (z + 1);
    case "R": // x = 1, Right face
      // Row 0: y=1 (z=1, 0, -1), Row 1: y=0, Row 2: y=-1
      return (1 - y) * 3 + (1 - z);
    default:
      return -1;
  }
}

/** Sync input 6-face state dictionary to update 3D model materials. */
export function importCubeState(state) {
  if (isRotating) return;

  cubies.forEach(c => {
    const wx = Math.round(c.position.x);
    const wy = Math.round(c.position.y);
    const wz = Math.round(c.position.z);

    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const localNormal = LOCAL_NORMALS[faceIdx];
      const worldNormal = localNormal.clone().applyQuaternion(c.quaternion);

      let bestFace = null;
      let maxDot = -Infinity;
      
      for (const [face, targetVec] of Object.entries(WORLD_AXES)) {
        const dot = worldNormal.dot(targetVec);
        if (dot > maxDot) {
          maxDot = dot;
          bestFace = face;
        }
      }

      if (maxDot > 0.85) {
        // Find index on the target face
        const idx = getStickerGridIndex(bestFace, wx, wy, wz);
        if (idx !== -1 && state[bestFace] && state[bestFace][idx]) {
          const colorCode = state[bestFace][idx];
          c.material[faceIdx].color.setHex(COLOR_HEX[colorCode]);
        }
      }
    }
  });
}

/** Full reset to solved state colors. */
export function resetCube3D() {
  buildCube();
}
