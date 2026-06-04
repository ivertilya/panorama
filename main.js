import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(90, innerWidth / innerHeight, 0.05, 8000);
camera.position.set(0, 0, 0.01);

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

// ─── Controls ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan  = false;
controls.enableZoom = false;
controls.rotateSpeed = 0.5;
controls.target.set(0, 0, -1);
controls.update();

// ─── State ────────────────────────────────────────────────────────────────────
let cfg = {
  projection : 'perspective',   // 'perspective' | 'equirect'
  fog        : true,
  horizon    : true,
  density    : 40,              // grid step in world units
  extent     : 1200,            // half-size of grid
  colorA     : new THREE.Color(0x00e5ff),  // near colour
  colorB     : new THREE.Color(0x0a0a12),  // far colour (fog)
};

// ─── Shader material ──────────────────────────────────────────────────────────
const lineMat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`
    uniform float uExtent;
    uniform bool  uFog;
    uniform vec3  uColorA;
    uniform vec3  uColorB;
    uniform bool  uEquirect;

    varying vec4 vColor;

    void main(){
      vec3 pos = position;

      // equirectangular warp: bend lines onto a sphere surface
      if(uEquirect){
        float r   = length(pos.xz);
        float phi = atan(pos.z, pos.x);           // azimuth
        float theta = atan(pos.y, max(r, 0.001)); // elevation
        float R = uExtent * 0.8;
        pos = vec3(
          R * cos(theta) * cos(phi),
          R * sin(theta),
          R * cos(theta) * sin(phi)
        );
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

      // aerial perspective: distance-based alpha + colour blend
      float dist  = length(position) / uExtent;
      float alpha = uFog ? clamp(1.0 - dist * 0.92, 0.03, 1.0) : 0.72;
      vec3  col   = uFog ? mix(uColorA, uColorB, smoothstep(0.0, 1.0, dist)) : uColorA;

      vColor = vec4(col, alpha);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec4 vColor;
    void main(){
      gl_FragColor = vColor;
    }
  `,
  uniforms: {
    uExtent  : { value: cfg.extent },
    uFog     : { value: cfg.fog },
    uColorA  : { value: cfg.colorA },
    uColorB  : { value: cfg.colorB },
    uEquirect: { value: false },
  },
  transparent: true,
  depthWrite : false,
  blending   : THREE.AdditiveBlending,
});

// horizon material
const horizonMat = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`
    void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    void main(){ gl_FragColor = vec4(1.0, 0.35, 0.0, 1.0); }
  `,
  depthWrite: false,
});

// ─── Geometry helpers ─────────────────────────────────────────────────────────
let linesMesh   = null;
let horizonMesh = null;

function buildGrid() {
  const { density, extent } = cfg;
  const positions = [];

  const add = (ax, ay, az, bx, by, bz) => {
    positions.push(ax, ay, az, bx, by, bz);
  };

  const steps = Math.ceil(extent / density);

  // XZ plane (floor/ceiling) — horizontal grid planes at each Y step
  for (let yi = -steps; yi <= steps; yi++) {
    const y = yi * density;
    // lines along X
    for (let zi = -steps; zi <= steps; zi++) {
      const z = zi * density;
      add(-extent, y, z, extent, y, z);
    }
    // lines along Z
    for (let xi = -steps; xi <= steps; xi++) {
      const x = xi * density;
      add(x, y, -extent, x, y, extent);
    }
  }

  // Vertical lines (Y direction)
  for (let xi = -steps; xi <= steps; xi++) {
    for (let zi = -steps; zi <= steps; zi++) {
      add(xi * density, -extent, zi * density, xi * density, extent, zi * density);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  if (linesMesh) {
    linesMesh.geometry.dispose();
    linesMesh.geometry = geo;
  } else {
    linesMesh = new THREE.LineSegments(geo, lineMat);
    linesMesh.frustumCulled = false;
    scene.add(linesMesh);
  }

  // horizon line
  const hpos = new Float32Array([-extent, 0, 0,  extent, 0, 0]);
  const hgeo = new THREE.BufferGeometry();
  hgeo.setAttribute('position', new THREE.BufferAttribute(hpos, 3));

  if (horizonMesh) {
    horizonMesh.geometry.dispose();
    horizonMesh.geometry = hgeo;
  } else {
    horizonMesh = new THREE.LineSegments(hgeo, horizonMat);
    horizonMesh.frustumCulled = false;
    scene.add(horizonMesh);
  }

  horizonMesh.visible = cfg.horizon;
  lineMat.uniforms.uExtent.value = extent;
}

buildGrid();

// ─── Sync uniforms ────────────────────────────────────────────────────────────
function syncUniforms() {
  lineMat.uniforms.uFog.value      = cfg.fog;
  lineMat.uniforms.uEquirect.value = (cfg.projection === 'equirect');
  lineMat.uniforms.uColorA.value   = cfg.colorA;
  lineMat.uniforms.uColorB.value   = cfg.colorB;
  if (horizonMesh) horizonMesh.visible = cfg.horizon;
}

// ─── UI wiring ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

$('fog').addEventListener('change', e => {
  cfg.fog = e.target.checked;
  syncUniforms();
});

$('horizon').addEventListener('change', e => {
  cfg.horizon = e.target.checked;
  syncUniforms();
});

$('projection').addEventListener('change', e => {
  cfg.projection = e.target.value;
  syncUniforms();
});

$('density').addEventListener('input', e => {
  cfg.density = parseInt(e.target.value, 10);
  $('density-val').textContent = cfg.density;
  buildGrid();
});

$('colorA').addEventListener('input', e => {
  cfg.colorA.set(e.target.value);
  syncUniforms();
});

$('colorB').addEventListener('input', e => {
  cfg.colorB.set(e.target.value);
  syncUniforms();
});

// ─── Animation ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // keep grid centred on camera (integer-snapped to avoid crawling)
  if (linesMesh) {
    const snap = cfg.density;
    linesMesh.position.set(
      Math.round(camera.position.x / snap) * snap,
      Math.round(camera.position.y / snap) * snap,
      Math.round(camera.position.z / snap) * snap,
    );
    if (horizonMesh) horizonMesh.position.copy(linesMesh.position);
  }

  renderer.render(scene, camera);
}
animate();

// ─── Resize ───────────────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
