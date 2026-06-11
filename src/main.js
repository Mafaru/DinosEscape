import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { startIntro } from "./intro.js";
import { showMainMenu } from "./menu.js";

// =======================
// SCENA BASE
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// =======================
// COSTANTI DI GIOCO
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

let isJumping = false;
let canJump = true;
let jumpVelocity = 0;

const gravity = 0.018;
const jumpStrength = 0.32;
const jumpCooldown = 500;
const groundY = 0.05;

// =======================
// LUCI E CIELO
// =======================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xbfd7ff, 0.7);
moonLight.position.set(-25, 35, -80);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 150;
moonLight.shadow.camera.left = -40;
moonLight.shadow.camera.right = 40;
moonLight.shadow.camera.top = 40;
moonLight.shadow.camera.bottom = -40;
scene.add(moonLight);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
moon.position.set(-25, 35, -80);
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
// TEXTURE E MATERIALI
// =======================

const textureLoader = new THREE.TextureLoader();

const groundTexture = textureLoader.load("/textures/pavement.jpg");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(8, 40);

const grassTexture = textureLoader.load("/textures/grass.png");
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
// ARRAY OGGETTI
// =======================

const worldObjects = [];
const groundPieces = [];
const movingObjects = [];

// =======================
// UTILITY
// =======================

const loader = new GLTFLoader();

function enableShadows(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function loadStaticModel(path, x, y, z, scale = 1, rotationY = 0) {
  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      enableShadows(model);

      scene.add(model);
      worldObjects.push(model);
    },
    undefined,
    (error) => {
      console.error(`Errore caricamento modello ${path}:`, error);
    }
  );
}

function checkCollision(a, b, distance = 1.2) {
  return a.position.distanceTo(b.position) < distance;
}

// =======================
// PAVIMENTO
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
// SCENARIO
// =======================

function addStreetLight(x, z) {
  const light = new THREE.PointLight(0xffaa55, 2.2, 12);
  light.position.set(x, 3.2, z);

  scene.add(light);
  worldObjects.push(light);
}

// LAMPIONI
for (let z = -10; z > -120; z -= 15) {
  loadStaticModel("/models/lamp post.glb", -6.2, 0, z, 0.2, 0);
  addStreetLight(-6.2, z);

  loadStaticModel("/models/lamp post.glb", 6.2, 0, z, 0.2, Math.PI);
  addStreetLight(6.2, z);
}

// ALBERI
const treeModels = [
  "/models/Tree1.glb",
  "/models/Tree2.glb",
  "/models/Tree3.glb",
];

let treeIndex = 0;

for (let z = -10; z > -210; z -= 10) {
  const treeModel = treeModels[treeIndex];

  loadStaticModel(treeModel, -9.5, 0, z, 0.7, 0);
  loadStaticModel(treeModel, 9.5, 0, z, 0.7, 0);

  treeIndex = (treeIndex + 1) % treeModels.length;
}

// PANCHINE
for (let z = -25; z > -120; z -= 35) {
  loadStaticModel("/models/Bench.glb", -6.8, 0, z, 0.5, Math.PI / 2);
  loadStaticModel("/models/Bench.glb", 6.8, 0, z - 15, 0.5, -Math.PI / 2);
}

// CESTINI
for (let z = -20; z > -120; z -= 30) {
  loadStaticModel("/models/Trash Can.glb", -6.5, 0, z, 1.0, 0);
  loadStaticModel("/models/Trash Can.glb", 6.5, 0, z - 10, 1.0, 0);
}

// EDIFICI
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

// =======================
// INPUT
// =======================

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (event.key === "ArrowLeft" || key === "a") {
    currentLane = Math.max(0, currentLane - 1);
    targetX = lanes[currentLane];
  }

  if (event.key === "ArrowRight" || key === "d") {
    currentLane = Math.min(2, currentLane + 1);
    targetX = lanes[currentLane];
  }

  if (key === "r" && isGameOver) {
    window.location.reload();
  }

  if (
    (event.key === " " || key === "w" || event.key === "ArrowUp") &&
    !isJumping &&
    canJump &&
    !isGameOver
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
// OSTACOLI E BONUS
// =======================

const obstacleModels = [
  "/models/Concrete Barrier.glb",
  "/models/Traffic Cone.glb",
];

let obstacleSpawnTimer = 0;
let boneSpawnTimer = 0;

function spawnObstacle() {
  const laneX = lanes[Math.floor(Math.random() * lanes.length)];
  const modelPath = obstacleModels[Math.floor(Math.random() * obstacleModels.length)];

  loader.load(modelPath, (gltf) => {
    const obstacle = gltf.scene;

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
  });
}

function spawnConeWall() {
  lanes.forEach((laneX) => {
    loader.load("/models/Traffic Cone.glb", (gltf) => {
      const cone = gltf.scene;

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
    });
  });
}



function spawnBone() {
  const laneX = lanes[Math.floor(Math.random() * lanes.length)];

  loader.load("/models/Bone.glb", (gltf) => {
    const bone = gltf.scene;

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

      if (obj.type === "obstacle") {
        lives--;
      }

      if (obj.type === "jumpObstacle" && !isJumping) {
        lives--;
      }

      if (obj.type === "jumpObstacle" && isJumping) {
        continue;
      }

      if (obj.type === "bone") {
        lives = Math.min(lives + 1, 3);
        score += 100;
      }

      scene.remove(obj.mesh);
      movingObjects.splice(i, 1);

      if (lives <= 0) {
        isGameOver = true;
        hud.innerHTML = `GAME OVER<br>Score: ${Math.floor(score)}<br>Premi R per ricominciare`;
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
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =======================
// LOOP PRINCIPALE
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

    if (obstacleSpawnTimer > obstacleSpawnLimit) {
      if (currentLevel >= 2 && Math.random() < 0.25) {
        spawnConeWall();
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

  renderer.render(scene, camera);
}

startIntro(() => {
  showMainMenu({
    onStart: () => {
      gameState = "playing";
    },
    onTutorial: () => {
      alert("Controls:\nA / ← = move left\nD / → = move right\nW / ↑ / Space = jump\nAvoid obstacles and collect bones.");
    },
    onStatistics: () => {
      const bestScore = localStorage.getItem("dinosEscapeBestScore") || 0;
      alert(`Best score: ${bestScore}`);
    },
  });
});

animate();