// src/trex-lab.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050812);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.target.set(0, 1, 0);

// Luce ambientale forte
const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

// Luce principale frontale
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
scene.add(keyLight);

// Luce laterale
const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
fillLight.position.set(-5, 4, 3);
scene.add(fillLight);

// Luce posteriore
const rimLight = new THREE.DirectionalLight(0xffffff, 1);
rimLight.position.set(0, 5, -8);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const loader = new GLTFLoader();

let trex = null;
const trexBones = {};
const trexRestPositions = {};
const trexRestQuaternions = {};

loader.load("/models/T-Rex.glb", (gltf) => {
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
const TAIL_CENTER_Z = 0.10;

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

function rotateBoneAxes(name, rotations) {
  const bone = trexBones[name];
  const rest = trexRestQuaternions[name];
  if (!bone || !rest) return;

  bone.quaternion.copy(rest);

  for (const { axis, angle } of rotations) {
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    bone.quaternion.multiply(q);
  }
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

  rotateBoneAxes("Tail1", [
    { axis: LOCAL_X, angle: TAIL_RUN_BASE_PITCH + tailWave * 0.035 },
    { axis: LOCAL_Z, angle: TAIL_CENTER_Z },
  ]);
  rotateBone("Tail2", LOCAL_X, 0.14 + Math.sin(t + 0.5) * 0.05);
  rotateBone("Tail3", LOCAL_X, 0.18 + Math.sin(t + 1.0) * 0.05);
  rotateBone("Tail4", LOCAL_X, 0.10 + Math.sin(t + 1.5) * 0.04);
  rotateBone("Tail5", LOCAL_X, 0.08 + Math.sin(t + 2.0) * 0.035);

  rotateBone("Neck", LOCAL_X, 0.06 + Math.sin(t * 2 - 0.4) * 0.025);
  rotateBone("Head", LOCAL_X, 0.14 + Math.sin(t * 2 - 0.6) * 0.035);
}

function animate() {
  requestAnimationFrame(animate);

  animateTrex();

  controls.update();

  renderer.render(scene, camera);
}

animate();
