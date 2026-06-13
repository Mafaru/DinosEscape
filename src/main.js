import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { startIntro } from "./intro.js";
import { showMainMenu } from "./menu.js";

// =======================
// BASE SCENE
// =======================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050812);
scene.fog = new THREE.Fog(0x050812, 35, 130);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// =======================
// GAME CONSTANTS
// =======================

const INITIAL_GAME_SPEED = 0.25;
const MAX_GAME_SPEED = 0.65;
const SPEED_STEP = 0.06;
const SCORE_PER_LEVEL = 300;

let gameState = "intro";

let gameSpeed = INITIAL_GAME_SPEED;
let currentLevel = 1;

const WORLD_LENGTH = 200;
const WORLD_END_Z = 25;

const lanes = [-3, 0, 3];
let currentLane = 1;
let targetX = lanes[currentLane];

let lives = 3;
let score = 0;
let isGameOver = false;
let pauseOverlay = null;

let isJumping = false;
let canJump = true;
let jumpVelocity = 0;

const gravity = 0.018;
const jumpStrength = 0.32;
const jumpCooldown = 500;
let lastJumpObstacleScore = -9999;
const groundY = 0.05;

// =======================
// LIGHTS AND SKY
// =======================

const ambientLight = new THREE.AmbientLight(0xaeb8c8, 0.48);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x92a8cf, 0x1a2114, 0.34);
scene.add(hemisphereLight);

const moonLightTarget = new THREE.Object3D();
moonLightTarget.position.set(0, 0, -22);
scene.add(moonLightTarget);

const moonLight = new THREE.DirectionalLight(0xd7e7ff, 0.95);
moonLight.position.set(-22, 28, -72);
moonLight.target = moonLightTarget;
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 125;
moonLight.shadow.camera.left = -32;
moonLight.shadow.camera.right = 32;
moonLight.shadow.camera.top = 36;
moonLight.shadow.camera.bottom = -24;
moonLight.shadow.bias = -0.00022;
moonLight.shadow.normalBias = 0.025;
scene.add(moonLight);

const fillLight = new THREE.DirectionalLight(0xffc88a, 0.22);
fillLight.position.set(18, 8, 16);
scene.add(fillLight);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
moon.position.copy(moonLight.position);
scene.add(moon);

const starsGeometry = new THREE.BufferGeometry();
const starsVertices = [];

for (let i = 0; i < 600; i++) {
  starsVertices.push(
    (Math.random() - 0.5) * 200,
    Math.random() * 80 + 20,
    -Math.random() * 180
  );
}

starsGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starsVertices, 3)
);

const stars = new THREE.Points(
  starsGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 })
);
scene.add(stars);

// =======================
// TEXTURES AND MATERIALS
// =======================

const textureLoader = new THREE.TextureLoader();

const groundTexture = textureLoader.load("/textures/pavement.jpg");
groundTexture.colorSpace = THREE.SRGBColorSpace;
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(8, 40);

const grassTexture = textureLoader.load("/textures/grass.png");
grassTexture.colorSpace = THREE.SRGBColorSpace;
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(20, 40);

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 0.9,
});

const sideMaterial = new THREE.MeshStandardMaterial({
  map: grassTexture,
  roughness: 0.95,
});

// =======================
// OBJECT ARRAYS
// =======================

const worldObjects = [];
const groundPieces = [];
const movingObjects = [];
const streetLightAnchors = [];
const activeStreetLights = [];

const streetLightPoolTexture = createStreetLightPoolTexture();
const streetLightPoolGeometry = new THREE.PlaneGeometry(6.5, 6.5);
const streetLightPoolMaterial = new THREE.MeshBasicMaterial({
  map: streetLightPoolTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  opacity: 0.42,
});
const streetLightBulbGeometry = new THREE.SphereGeometry(0.16, 16, 16);
const streetLightBulbMaterial = new THREE.MeshBasicMaterial({
  color: 0xffddaa,
  fog: false,
});
const STREET_LIGHT_BULB_Y = 3.32;
const STREET_LIGHT_ACTIVE_COUNT = 8;
const STREET_LIGHT_ACTIVE_MIN_Z = -55;
const STREET_LIGHT_ACTIVE_MAX_Z = 25;
const SCENERY_START_Z = -10;
const SCENERY_END_Z = -215;

// =======================
// UTILITY
// =======================

const loader = new GLTFLoader();
const modelCache = new Map();

function createStreetLightPoolTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );

  gradient.addColorStop(0, "rgba(255, 215, 150, 0.62)");
  gradient.addColorStop(0.38, "rgba(255, 175, 90, 0.24)");
  gradient.addColorStop(1, "rgba(255, 150, 70, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function enableShadows(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function loadModel(path) {
  if (!modelCache.has(path)) {
    modelCache.set(
      path,
      new Promise((resolve, reject) => {
        loader.load(
          path,
          (gltf) => resolve(gltf.scene),
          undefined,
          (error) => {
            modelCache.delete(path);
            reject(error);
          }
        );
      })
    );
  }

  return modelCache.get(path);
}

function cloneModel(model) {
  return model.clone(true);
}

function makeLampPostGlow(model) {
  model.updateWorldMatrix(true, true);
  const modelBox = new THREE.Box3().setFromObject(model);
  const modelHeight = modelBox.max.y - modelBox.min.y;

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const meshBox = new THREE.Box3().setFromObject(child);
    const meshSize = meshBox.getSize(new THREE.Vector3());
    const nearLampTop = meshBox.min.y > modelBox.min.y + modelHeight * 0.75;
    const compactBulb =
      Math.max(meshSize.x, meshSize.z) < modelHeight * 0.08 &&
      meshSize.y < modelHeight * 0.08;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    const glowingMaterials = materials.map((material) => {
      const color = material.color ?? new THREE.Color(0x000000);
      const brightness = (color.r + color.g + color.b) / 3;

      if (!nearLampTop || !compactBulb || brightness < 0.85) {
        return material;
      }

      const glowingMaterial = material.clone();
      glowingMaterial.color.set(0xffddaa);
      glowingMaterial.emissive = new THREE.Color(0xffb366);
      glowingMaterial.emissiveIntensity = 1.35;
      glowingMaterial.needsUpdate = true;
      return glowingMaterial;
    });

    child.material = Array.isArray(child.material)
      ? glowingMaterials
      : glowingMaterials[0];
  });
}

function loadStaticModel(path, x, y, z, scale = 1, rotationY = 0) {
  loadModel(path)
    .then((source) => {
      const model = cloneModel(source);

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      if (path.includes("lamp post")) {
        makeLampPostGlow(model);
      }

      enableShadows(model);

      scene.add(model);
      worldObjects.push(model);
    })
    .catch((error) => {
      console.error(`Error loading model ${path}:`, error);
    });
}

function checkCollision(a, b, distance = 1.2) {
  return a.position.distanceTo(b.position) < distance;
}

// =======================
// GROUND
// =======================

function createGroundPiece(z) {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 100),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const leftSide = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 100),
    sideMaterial
  );
  leftSide.rotation.x = -Math.PI / 2;
  leftSide.position.set(-11, -0.02, 0);
  leftSide.receiveShadow = true;
  group.add(leftSide);

  const rightSide = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 100),
    sideMaterial
  );
  rightSide.rotation.x = -Math.PI / 2;
  rightSide.position.set(11, -0.02, 0);
  rightSide.receiveShadow = true;
  group.add(rightSide);

  group.position.z = z;
  scene.add(group);
  groundPieces.push(group);
}

createGroundPiece(-25);
createGroundPiece(-125);

// =======================
// SCENERY
// =======================

function addStreetLight(x, z) {
  const light = new THREE.PointLight(
    0xffb366, // warm color
    3.5, // intensity
    20, // distance
    2 // decay
  );

  light.position.set(x, STREET_LIGHT_BULB_Y, z);
  light.intensity = 4.2;
  light.castShadow = false;
  light.intensity = 0;
  light.visible = false;

  scene.add(light);
  worldObjects.push(light);

  // visible bulb
  const bulb = new THREE.Mesh(
    streetLightBulbGeometry,
    streetLightBulbMaterial
  );

  bulb.position.set(x, STREET_LIGHT_BULB_Y, z);

  const lightPool = new THREE.Mesh(
    streetLightPoolGeometry,
    streetLightPoolMaterial
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(x, 0.015, z);

  scene.add(bulb);
  scene.add(lightPool);
  worldObjects.push(bulb);
  worldObjects.push(lightPool);
  streetLightAnchors.push(bulb);
}

for (let i = 0; i < STREET_LIGHT_ACTIVE_COUNT; i++) {
  const light = new THREE.PointLight(0xffb366, 4.2, 20, 2);
  light.castShadow = false;
  light.visible = false;
  scene.add(light);
  activeStreetLights.push(light);
}

function updateActiveStreetLights() {
  const nearbyAnchors = streetLightAnchors
    .filter(
      (anchor) =>
        anchor.position.z > STREET_LIGHT_ACTIVE_MIN_Z &&
        anchor.position.z < STREET_LIGHT_ACTIVE_MAX_Z
    )
    .sort((a, b) => Math.abs(a.position.z - 4) - Math.abs(b.position.z - 4));

  for (let i = 0; i < activeStreetLights.length; i++) {
    const light = activeStreetLights[i];
    const anchor = nearbyAnchors[i];

    if (!anchor) {
      light.visible = false;
      continue;
    }

    light.visible = true;
    light.position.copy(anchor.position);
  }
}

// STREET LIGHTS
for (let z = SCENERY_START_Z; z > SCENERY_END_Z; z -= 15) {
  loadStaticModel("/models/lamp post.glb", -6.2, 0, z, 0.2, 0);
  addStreetLight(-6.2, z);

  loadStaticModel("/models/lamp post.glb", 6.2, 0, z, 0.2, Math.PI);
  addStreetLight(6.2, z);
}

// TREES
const treeModels = [
  "/models/Tree1.glb",
  "/models/Tree2.glb",
  "/models/Tree3.glb",
];

let treeIndex = 0;

for (let z = SCENERY_START_Z; z > SCENERY_END_Z; z -= 10) {
  const treeModel = treeModels[treeIndex];

  loadStaticModel(treeModel, -9.5, 0, z, 0.7, 0);
  loadStaticModel(treeModel, 9.5, 0, z, 0.7, 0);

  treeIndex = (treeIndex + 1) % treeModels.length;
}

// BENCHES
for (let z = -25; z > SCENERY_END_Z; z -= 35) {
  loadStaticModel("/models/Bench.glb", -6.8, 0, z, 0.5, Math.PI / 2);
  loadStaticModel("/models/Bench.glb", 6.8, 0, z - 15, 0.5, -Math.PI / 2);
}

// TRASH CANS
for (let z = -20; z > SCENERY_END_Z; z -= 30) {
  loadStaticModel("/models/Trash Can.glb", -6.5, 0, z, 1.0, 0);
  loadStaticModel("/models/Trash Can.glb", 6.5, 0, z - 10, 1.0, 0);
}

// BUILDINGS
const buildingModels = [
  "/models/Building-7lMEpT2ICD.glb",
  "/models/Building-bbH2Bg73qM.glb",
  "/models/Building-g15lpKh4li.glb",
  "/models/Building-otRsYa6pan.glb",
];

for (let i = 0; i < 28; i++) {
  const z = -5 - i * 7;

  loadStaticModel(
    buildingModels[i % buildingModels.length],
    -17,
    0,
    z,
    3.0,
    Math.PI / 2
  );

  loadStaticModel(
    buildingModels[(i + 2) % buildingModels.length],
    17,
    0,
    z,
    3.0,
    -Math.PI / 2
  );
}

// =======================
// T-REX
// =======================

let trex = null;
const trexBones = {};
const trexRestPositions = {};
const trexRestQuaternions = {};

loader.load("/models/NewTRex.glb", (gltf) => {
  trex = gltf.scene;
  trex.scale.set(0.15, 0.15, 0.15);
  trex.position.set(0, 0.05, 0);
  trex.rotation.y = Math.PI;

  enableShadows(trex);

  trex.traverse((child) => {
    if (child.isBone) {
      trexBones[child.name] = child;
      trexRestPositions[child.name] = child.position.clone();
      trexRestQuaternions[child.name] = child.quaternion.clone();
      console.log(child.name);
    }
  });

  scene.add(trex);
});

const LOCAL_X = new THREE.Vector3(1, 0, 0);
const LOCAL_Y = new THREE.Vector3(0, 1, 0);
const LOCAL_Z = new THREE.Vector3(0, 0, 1);
const RUN_SPEED = 8.0;
const TAIL_RUN_BASE_PITCH = -0.15;

const LEG_MOTION = {
  R: {
    legSwing: 1,
    upLegSwing: 1,
    kneeBend: 1,
    footBend: 1,
    footLift: 0.013,
    footStride: 0.016,
  },
  L: {
    legSwing: -1,
    upLegSwing: -1,
    kneeBend: 1,
    footBend: 1,
    footLift: 0.013,
    footStride: 0.016,
  },
};

function rotateBone(name, axis, angle) {
  const bone = trexBones[name];
  const rest = trexRestQuaternions[name];
  if (!bone || !rest) return;

  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  bone.quaternion.copy(rest).multiply(q);
}

function moveBoneSagittal(name, deltaY = 0, deltaZ = 0) {
  const bone = trexBones[name];
  const rest = trexRestPositions[name];
  if (!bone || !rest) return;

  bone.position.set(rest.x, rest.y + deltaY, rest.z + deltaZ);
}

function animateLeg(side, phase) {
  const motion = LEG_MOTION[side];

  const swing = Math.sin(phase);
  const lifted = Math.max(0, Math.cos(phase));
  const planted = Math.max(0, -Math.cos(phase));

  const kneeBend = lifted * lifted * (3 - 2 * lifted);

  rotateBone(
    `BackLeg${side}`,
    LOCAL_Y,
    swing * 0.56 * motion.legSwing
  );

  rotateBone(
    `BackUpLeg${side}`,
    LOCAL_Z,
    -swing * 0.08 * motion.upLegSwing
  );

  rotateBone(
    `BackLowLeg${side}`,
    LOCAL_X,
    -kneeBend * 1.5 * motion.kneeBend
  );

  rotateBone(
    `BackFoot${side}`,
    LOCAL_X,
    (kneeBend * 0.72 - planted * 0.22) * motion.footBend
  );

  moveBoneSagittal(
    `BackFoot${side}`,
    kneeBend * motion.footLift,
    swing * motion.footStride
  );
}

function animateTrex() {
  if (!trex) return;

  const t = performance.now() * 0.001 * RUN_SPEED;

  const rightPhase = t;
  const leftPhase = t + Math.PI;

  const bodyWave = Math.sin(t * 2);
  const tailWave = Math.sin(t);

  rotateBone("Body", LOCAL_X, -0.14 + bodyWave * 0.018);
  rotateBone("Torso", LOCAL_X, 0.03 + bodyWave * 0.01);
  rotateBone("Shoulders", LOCAL_X, -0.24 + bodyWave * 0.018);
  rotateBone("Back", LOCAL_X, -0.08 + bodyWave * 0.012);
  rotateBone("Hips", LOCAL_X, bodyWave * 0.025);

  animateLeg("R", rightPhase);
  animateLeg("L", leftPhase);

  rotateBone("Tail1", LOCAL_X, TAIL_RUN_BASE_PITCH + tailWave * 0.035);
  rotateBone("Tail2", LOCAL_X, 0.14 + Math.sin(t + 0.5) * 0.05);
  rotateBone("Tail3", LOCAL_X, 0.18 + Math.sin(t + 1.0) * 0.05);
  rotateBone("Tail4", LOCAL_X, 0.10 + Math.sin(t + 1.5) * 0.04);
  rotateBone("Tail5", LOCAL_X, 0.08 + Math.sin(t + 2.0) * 0.035);

  rotateBone("Neck", LOCAL_X, 0.06 + Math.sin(t * 2 - 0.4) * 0.025);
  rotateBone("Head", LOCAL_X, 0.14 + Math.sin(t * 2 - 0.6) * 0.035);
}


//HUD

const hud = document.createElement("div");
hud.style.position = "fixed";
hud.style.top = "20px";
hud.style.left = "20px";
hud.style.color = "white";
hud.style.fontFamily = "Arial";
hud.style.fontSize = "24px";
hud.style.zIndex = "10";
document.body.appendChild(hud);

function updateHud() {
  let lifeIcons = "";

  for (let i = 0; i < lives; i++) {
    lifeIcons += "🦖 ";
  }

  hud.innerHTML = `
    Score: ${Math.floor(score)}<br>
    Lives: ${lifeIcons}
  `;
}

function updateDifficulty() {
  const newLevel = Math.floor(score / SCORE_PER_LEVEL) + 1;

  if (newLevel > currentLevel) {
    currentLevel = newLevel;
    gameSpeed = Math.min(
      MAX_GAME_SPEED,
      INITIAL_GAME_SPEED + (currentLevel - 1) * SPEED_STEP
    );
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  isGameOver = false;
  gameSpeed = INITIAL_GAME_SPEED;
  currentLevel = 1;

  currentLane = 1;
  targetX = lanes[currentLane];

  isJumping = false;
  canJump = true;
  jumpVelocity = 0;

  obstacleSpawnTimer = 0;
  boneSpawnTimer = 0;

  if (trex) {
    trex.position.set(0, groundY, 0);
  }

  hidePauseScreen();

  for (let i = movingObjects.length - 1; i >= 0; i--) {
    scene.remove(movingObjects[i].mesh);
    movingObjects.splice(i, 1);
  }

  updateHud();
  gameState = "playing";
}

function showPauseScreen() {
  if (pauseOverlay) return;

  pauseOverlay = document.createElement("div");
  pauseOverlay.id = "pause-screen";
  pauseOverlay.style.position = "fixed";
  pauseOverlay.style.inset = "0";
  pauseOverlay.style.background = "rgba(0,0,0,0.62)";
  pauseOverlay.style.zIndex = "9996";
  pauseOverlay.style.display = "flex";
  pauseOverlay.style.flexDirection = "column";
  pauseOverlay.style.alignItems = "center";
  pauseOverlay.style.justifyContent = "center";
  pauseOverlay.style.fontFamily = "Consolas, 'Courier New', monospace";
  pauseOverlay.style.color = "#f0c07a";

  const title = document.createElement("h1");
  title.textContent = "PAUSED";
  title.style.fontSize = "72px";
  title.style.letterSpacing = "6px";
  title.style.margin = "0 0 22px";

  const hint = document.createElement("div");
  hint.textContent = "Press Esc or Resume to continue";
  hint.style.fontSize = "20px";
  hint.style.marginBottom = "32px";
  hint.style.color = "#d8a35d";

  const resume = createPauseButton("RESUME", resumeGame);
  const mainMenu = createPauseButton("MAIN MENU", returnToMainMenu);

  pauseOverlay.appendChild(title);
  pauseOverlay.appendChild(hint);
  pauseOverlay.appendChild(resume);
  pauseOverlay.appendChild(mainMenu);
  document.body.appendChild(pauseOverlay);
}

function createPauseButton(label, onClick) {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.width = "260px";
  button.style.padding = "16px 42px";
  button.style.border = "1px solid #d8a35d";
  button.style.background = "rgba(18, 8, 3, 0.85)";
  button.style.color = "#f0c07a";
  button.style.fontSize = "22px";
  button.style.cursor = "pointer";
  button.style.letterSpacing = "3px";
  button.style.marginTop = "14px";
  button.onclick = onClick;
  return button;
}

function hidePauseScreen() {
  if (!pauseOverlay) return;

  pauseOverlay.remove();
  pauseOverlay = null;
}

function pauseGame() {
  if (gameState !== "playing" || isGameOver) return;

  gameState = "paused";
  showPauseScreen();
}

function resumeGame() {
  if (gameState !== "paused") return;

  hidePauseScreen();
  gameState = "playing";
}

function openMainMenu() {
  gameState = "menu";

  showMainMenu({
    onStart: resetGame,
  });
}

function returnToMainMenu() {
  if (gameState !== "paused") return;

  hidePauseScreen();
  openMainMenu();
}

function togglePause() {
  if (gameState === "playing") {
    pauseGame();
    return;
  }

  if (gameState === "paused") {
    resumeGame();
  }
}


function showDeathScreen() {
  const bestScore = Number(localStorage.getItem("dinosEscapeBestScore") || 0);

  if (score > bestScore) {
    localStorage.setItem("dinosEscapeBestScore", Math.floor(score));
  }

  const overlay = document.createElement("div");
  overlay.id = "death-screen";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.82)";
  overlay.style.zIndex = "9997";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "Consolas, 'Courier New', monospace";
  overlay.style.color = "#f0c07a";

  const title = document.createElement("h1");
  title.textContent = "YOU DIED";
  title.style.fontSize = "76px";
  title.style.letterSpacing = "6px";
  title.style.margin = "0 0 20px";
  title.style.color = "#a84b22";

  const scoreText = document.createElement("div");
  scoreText.textContent = `Score: ${Math.floor(score)}`;
  scoreText.style.fontSize = "28px";
  scoreText.style.marginBottom = "36px";

  const retry = document.createElement("button");
  retry.textContent = "TRY AGAIN";
  retry.style.padding = "16px 42px";
  retry.style.border = "1px solid #d8a35d";
  retry.style.background = "rgba(18, 8, 3, 0.85)";
  retry.style.color = "#f0c07a";
  retry.style.fontSize = "22px";
  retry.style.cursor = "pointer";
  retry.style.letterSpacing = "3px";

  retry.onclick = () => {
    overlay.remove();
    resetGame();
  };

  overlay.appendChild(title);
  overlay.appendChild(scoreText);
  overlay.appendChild(retry);
  document.body.appendChild(overlay);
}
// =======================
// INPUT
// =======================

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (event.key === "Escape" && !isGameOver) {
    togglePause();
    return;
  }

  if (gameState !== "playing") {
    return;
  }

  if (key === "r" && isGameOver) {
    const deathOverlay = document.getElementById("death-screen");
    if (deathOverlay) deathOverlay.remove();

    resetGame();
    return;
  }

  if (isGameOver) {
    return;
  }

  if (event.key === "ArrowLeft" || key === "a") {
    currentLane = Math.max(0, currentLane - 1);
    targetX = lanes[currentLane];
  }

  if (event.key === "ArrowRight" || key === "d") {
    currentLane = Math.min(2, currentLane + 1);
    targetX = lanes[currentLane];
  }

  if (
    (event.key === " " || key === "w" || event.key === "ArrowUp") &&
    !isJumping &&
    canJump
  ) {
    isJumping = true;
    canJump = false;
    jumpVelocity = jumpStrength;

    setTimeout(() => {
      canJump = true;
    }, jumpCooldown);
  }
});

// =======================
// OBSTACLES AND BONUSES
// =======================

const obstacleModels = [
  "/models/Concrete Barrier.glb",
  "/models/Traffic Cone.glb",
];

for (const modelPath of [...obstacleModels, "/models/Bone.glb"]) {
  loadModel(modelPath).catch((error) => {
    console.error(`Error preloading model ${modelPath}:`, error);
  });
}

let obstacleSpawnTimer = 0;
let boneSpawnTimer = 0;

function spawnObstacle() {
  const laneX = lanes[Math.floor(Math.random() * lanes.length)];
  const modelPath = obstacleModels[Math.floor(Math.random() * obstacleModels.length)];

  loadModel(modelPath).then((source) => {
    const obstacle = cloneModel(source);

    obstacle.position.set(laneX, 0, -90);
    obstacle.scale.set(1, 1, 1);
    obstacle.rotation.y = 0;

    enableShadows(obstacle);

    scene.add(obstacle);

    movingObjects.push({
      mesh: obstacle,
      type: "obstacle",
      hit: false,
    });
  }).catch((error) => {
    console.error(`Error loading obstacle ${modelPath}:`, error);
  });
}

const hitSound = new Audio("/audio/hit.mp3");
hitSound.volume = 0.95;

function playHitSound() {
  hitSound.currentTime = 0;
  hitSound.play().catch(() => {});
}

function spawnConeWall() {
  lanes.forEach((laneX) => {
    const modelPath = "/models/Traffic Cone.glb";

    loadModel(modelPath).then((source) => {
      const cone = cloneModel(source);

      cone.position.set(laneX, 0, -90);
      cone.scale.set(1, 1, 1);
      cone.rotation.y = Math.random() * Math.PI * 2;

      enableShadows(cone);

      scene.add(cone);

      movingObjects.push({
        mesh: cone,
        type: "jumpObstacle",
        hit: false,
      });
    }).catch((error) => {
      console.error(`Error loading model ${modelPath}:`, error);
    });
  });
}



function spawnBone() {
  const laneX = lanes[Math.floor(Math.random() * lanes.length)];

  const modelPath = "/models/Bone.glb";

  loadModel(modelPath).then((source) => {
    const bone = cloneModel(source);

    bone.position.set(laneX, 0.9, -90);
    bone.scale.set(5, 5, 5);

    enableShadows(bone);

    const glow = new THREE.PointLight(0xff4444, 2, 5);
    glow.position.set(0, 0.5, 0);

    bone.add(glow);

    scene.add(bone);

    movingObjects.push({
      mesh: bone,
      type: "bone",
      hit: false,
    });
  }).catch((error) => {
    console.error(`Error loading model ${modelPath}:`, error);
  });
}

function updateMovingObjects() {
  for (let i = movingObjects.length - 1; i >= 0; i--) {
    const obj = movingObjects[i];

    obj.mesh.position.z += gameSpeed;

    if (obj.type === "bone") {
      obj.mesh.rotation.y += 0.06;
      obj.mesh.rotation.x += 0.02;
      obj.mesh.position.y = 0.9 + Math.sin(performance.now() * 0.006) * 0.15;
    }

    if (trex && !obj.hit && checkCollision(trex, obj.mesh, 1.3)) {
      obj.hit = true;

      if (obj.type === "jumpObstacle" && isJumping) {
        continue;
      }

      if (obj.type === "bone") {
        lives = Math.min(lives + 1, 3);
        score += 100;
      } else {
        lives--;
        playHitSound();
      }

      scene.remove(obj.mesh);
      movingObjects.splice(i, 1);

      if (lives <= 0) {
        isGameOver = true;
        showDeathScreen();
      }

      continue;
    }

    if (obj.mesh.position.z > 10) {
      scene.remove(obj.mesh);
      movingObjects.splice(i, 1);
    }
  }
}

// =======================
// RESIZE
// =======================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =======================
// MAIN LOOP
// =======================

function animate() {
  requestAnimationFrame(animate);

  if (gameState === "playing" && !isGameOver) {
    score += gameSpeed;
    updateDifficulty();

    for (const piece of groundPieces) {
      piece.position.z += gameSpeed;

      if (piece.position.z > 75) {
        piece.position.z -= 200;
      }
    }

    for (const obj of worldObjects) {
      obj.position.z += gameSpeed;

      if (obj.position.z > WORLD_END_Z) {
        obj.position.z -= WORLD_LENGTH;
      }
    }

    obstacleSpawnTimer++;
    boneSpawnTimer++;

    const obstacleSpawnLimit = Math.max(25, 70 - currentLevel * 5);
    const canSpawnJumpObstacle = score - lastJumpObstacleScore > 350;

    if (obstacleSpawnTimer > obstacleSpawnLimit) {
      if (currentLevel >= 2 && Math.random() < 0.25 && canSpawnJumpObstacle) {
        spawnConeWall();
        lastJumpObstacleScore = score;
      } else {
        spawnObstacle();
      }

      obstacleSpawnTimer = 0;
    }

    if (boneSpawnTimer > 600) {
      spawnBone();
      boneSpawnTimer = 0;
    }

    updateMovingObjects();
    animateTrex();
    updateHud();
  }

  if (trex) {
    trex.position.x += (targetX - trex.position.x) * 0.12;

    if (isJumping) {
      trex.position.y += jumpVelocity;
      jumpVelocity -= gravity;

      if (trex.position.y <= groundY) {
        trex.position.y = groundY;
        isJumping = false;
        jumpVelocity = 0;
      }
    }

    camera.position.x += (trex.position.x - camera.position.x) * 0.08;
    camera.position.y = 3;
    camera.position.z = trex.position.z + 8;

    camera.lookAt(trex.position.x, 1.2, trex.position.z - 4);
  }

  updateActiveStreetLights();
  renderer.render(scene, camera);
}


startIntro(() => {
  openMainMenu();
});

animate();
