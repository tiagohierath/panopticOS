import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const stage = document.querySelector('#stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f04b2a');
const camera = new THREE.PerspectiveCamera(30, 2480 / 3508, 0.1, 100);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const [svg, hdr] = await Promise.all([
  new SVGLoader().loadAsync('./panoptics-eye-center.svg'),
  new HDRLoader().loadAsync('./assets/studio_small_03_1k.hdr'),
]);
const pmrem = new THREE.PMREMGenerator(renderer);
hdr.mapping = THREE.EquirectangularReflectionMapping;
const studio = new THREE.Scene();
studio.background = hdr;
studio.backgroundRotation.set(0.12, 1.9, -0.25);
function softbox(width, height, x, y, z, brightness) {
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(brightness), side: THREE.DoubleSide }),
  );
  panel.position.set(x, y, z);
  panel.lookAt(0, 0, 0);
  studio.add(panel);
}
softbox(5, 7, -3.8, 2.5, 5, 3);
softbox(1, 8, 4, 1, 4, 5);
softbox(7, 1.2, 0, -3, 4, 2.5);
softbox(2.6, 6, 0.7, 1, 6, 1.6);
const environment = pmrem.fromScene(studio, 0.015);
scene.environment = environment.texture;
scene.environmentIntensity = 1.15;
scene.environmentRotation.set(0, 0, 0);
hdr.dispose();
pmrem.dispose();

// Fine machining marks vary the reflections without changing the SVG outline.
function makeSurfaceMaps() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(size, size);
  let seed = 7127;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < size; y++) {
    const streak = (random() - 0.5) * 30;
    for (let x = 0; x < size; x++) {
      const broad = 13 * Math.sin(x / 109 + Math.sin(y / 142)) + 10 * Math.cos(y / 78 + x / 240);
      const value = 175 + broad + streak + (random() - 0.5) * 22;
      const index = (y * size + x) * 4;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const machining = makeSurfaceMaps();
const face = new THREE.MeshStandardMaterial({
  color: 0xb3b8bd, metalness: 1, roughness: 0.38,
  roughnessMap: machining, bumpMap: machining, bumpScale: 0.006,
});
const edge = new THREE.MeshStandardMaterial({ color: 0xe2e5e8, metalness: 1, roughness: 0.13 });
const insetFace = new THREE.MeshStandardMaterial({
  color: 0xf0f1f2, metalness: 1, roughness: 0.27,
  roughnessMap: machining, bumpMap: machining, bumpScale: 0.003,
});

// Both outlines come directly from the source SVG. Its white star is an inset.
const outerPath = svg.paths.find(path => path.userData.style.fill === '#000');
const starPath = svg.paths.find(path => path.userData.node.classList.contains('cls-1'));
if (!outerPath || !starPath) throw new Error('The source SVG must contain the outer eye and its center star.');
const outerShape = SVGLoader.createShapes(outerPath)[0];
const starShape = SVGLoader.createShapes(starPath)[0];
outerShape.holes.push(starPath.subPaths[0]);

function extrude(shape, depth, bevelSize, bevelThickness, bevelOffset = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 40,
    bevelEnabled: true, bevelSize, bevelThickness, bevelSegments: 4, bevelOffset,
  });
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 882.8, uv.getY(i) / 573.84);
  geometry.translate(-441.4, -286.92, -18);
  return geometry;
}

const logo = new THREE.Group();
logo.name = 'Panoptics Eye Center';
logo.rotation.set(-0.16, 0.22, -0.12);
const svgSpace = new THREE.Group();
svgSpace.scale.set(0.005, -0.005, 0.005);
logo.add(svgSpace);

const body = new THREE.Mesh(extrude(outerShape, 36, 9, 8), [face, edge]);
body.name = 'Original outer SVG path with star recess';
const star = new THREE.Mesh(extrude(starShape, 14, 3, 3, -4), [insetFace, edge]);
star.name = 'Original center star SVG path';
star.position.z = 3;
for (const mesh of [body, star]) {
  mesh.castShadow = mesh.receiveShadow = true;
  svgSpace.add(mesh);
}
scene.add(logo);

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-3, 5, 7);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 20 });
key.shadow.bias = -0.00015;
key.shadow.normalBias = 0.015;
key.shadow.radius = 4;
scene.add(key);

const shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
shadow.position.z = -0.3;
shadow.receiveShadow = true;
scene.add(shadow);

function render() { renderer.render(scene, camera); }
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}
new ResizeObserver(resize).observe(stage);
resize();

// The still composition is ready for Photoshop. Drag to choose another angle.
let drag;
renderer.domElement.addEventListener('pointerdown', event => {
  drag = { x: event.clientX, y: event.clientY, rx: logo.rotation.x, ry: logo.rotation.y };
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', event => {
  if (!drag) return;
  logo.rotation.y = THREE.MathUtils.clamp(drag.ry + (event.clientX - drag.x) * 0.004, -0.65, 0.65);
  logo.rotation.x = THREE.MathUtils.clamp(drag.rx + (event.clientY - drag.y) * 0.004, -0.65, 0.65);
  render();
});
renderer.domElement.addEventListener('pointerup', () => { drag = undefined; });
renderer.domElement.addEventListener('pointercancel', () => { drag = undefined; });

function exportPNG() {
  const ratio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(2480, 3508, false);
  camera.aspect = 2480 / 3508;
  camera.updateProjectionMatrix();
  render();
  const png = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(ratio);
  resize();
  return png;
}
window.poster = { scene, camera, renderer, logo, body, star, render, exportPNG };
window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() !== 's' || event.ctrlKey || event.metaKey || event.altKey) return;
  const link = document.createElement('a');
  link.download = 'panoptics-chrome-orange-a4.png';
  link.href = exportPNG();
  link.click();
});
document.documentElement.dataset.renderState = 'ready';
