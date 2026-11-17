/**
 * Renders Mia's dragon from the real GLB into transparent PNG portraits.
 * Used headlessly by tools/render-dragon.mjs, never by the app.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const SIZE = 720;
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(SIZE, SIZE, false);
renderer.setPixelRatio(1);
renderer.setClearAlpha(0);
/* Neutral holds the green of the scales instead of bleaching them toward white
   the way ACES does once the highlights clip. */
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

/* A neutral studio environment, so the roughness map resolves, kept low so it
   fills the shadows rather than lighting the whole model. */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const key = new THREE.DirectionalLight(0xfff6e8, 1.15);
key.position.set(2.4, 4.2, 3.2);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffd9a0, 0.35);
rim.position.set(-3.2, 2.0, -2.6);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xdfe7f5, 0x6d7480, 0.32));

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

const gltf = await new GLTFLoader().loadAsync("/assets/dragon/dragon.glb");
const model = gltf.scene;
model.traverse((o) => {
  if (o.isMesh) {
    o.material.envMapIntensity = 0.85;
    o.frustumCulled = false;
  }
});
scene.add(model);

const box = new THREE.Box3().setFromObject(model);
const size = new THREE.Vector3();
const centre = new THREE.Vector3();
box.getSize(size);
box.getCenter(centre);
const height = size.y;

/* Put the feet on the ground line and centre it left to right. */
model.position.set(-centre.x, -box.min.y, -centre.z);

/* A soft contact shadow. Without it the model floats and reads as translucent,
   because nothing ties it to the surface. */
const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = shadowCanvas.height = 256;
const sctx = shadowCanvas.getContext("2d");
const grad = sctx.createRadialGradient(128, 128, 8, 128, 128, 126);
grad.addColorStop(0, "rgba(0,0,0,0.55)");
grad.addColorStop(0.45, "rgba(0,0,0,0.28)");
grad.addColorStop(1, "rgba(0,0,0,0)");
sctx.fillStyle = grad;
sctx.fillRect(0, 0, 256, 256);
const shadowTex = new THREE.CanvasTexture(shadowCanvas);
shadowTex.colorSpace = THREE.SRGBColorSpace;

const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.85
  })
);
shadow.rotation.x = -Math.PI / 2;
shadow.scale.set(size.x * 1.5, size.z * 1.5, 1);
shadow.position.y = 0.004;
scene.add(shadow);

/**
 * fill: how much of the frame height the dragon takes (0.45 baby -> 0.92 adult)
 * yaw: camera angle in degrees, 0 is straight on
 */
window.renderStage = async (opts = {}) => {
  const fill = opts.fill ?? 0.8;
  const yaw = ((opts.yaw ?? 18) * Math.PI) / 180;
  const pitch = ((opts.pitch ?? 6) * Math.PI) / 180;

  const visible = height / Math.max(0.05, fill);
  const dist = visible / 2 / Math.tan((camera.fov * Math.PI) / 360);
  const target = new THREE.Vector3(0, height * 0.5, 0);

  camera.position.set(
    target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * Math.cos(pitch) * dist
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  return { height, dist, fill };
};

window.__ready = true;
