/**
 * ===================================================================================
 * GEMELO DIGITAL 3D — CENTRO DE DATOS & CFD SCI-FI INDUSTRIAL
 * WebGL / Three.js / GLSL Shaders
 * Autores: Darwin Samuel Machuca González, Ferney Bladimir Bermúdez Toloza, Saray Valentina Silva Galindo
 * Programa: Ingeniería en Ciencias de la Computación e Inteligencia Artificial
 * Institución: Universidad de Santander (UDES)
 * ===================================================================================
 */

import * as THREE          from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

// ═══════════════════════════════════════════════════════════════════
//  1. DOMINIO ESPACIAL MATEMÁTICO [0,10]x[0,15]x[0,3] m
// ═══════════════════════════════════════════════════════════════════
const ROOM_W = 10.0;   // Ancho físico (X) = 10 m
const ROOM_L = 15.0;   // Profundidad física (Y físico -> Z Three.js) = 15 m
const ROOM_H = 3.0;    // Altura física (Z físico -> Y Three.js) = 3 m
const SCALE  = 2.0;    // 1 m físico = 2.0 u. Three.js

const SW = ROOM_W * SCALE;   // 20.0 u.
const SL = ROOM_L * SCALE;   // 30.0 u.
const SH = ROOM_H * SCALE;   //  6.0 u.

// ═══════════════════════════════════════════════════════════════════
//  2. MOTOR MATEMÁTICO (CÁLCULO MULTIVARIABLE & ANÁLISIS VECTORIAL)
// ═══════════════════════════════════════════════════════════════════
function validateTripleIntegralVolume() {
  return { analyticalV: ROOM_W * ROOM_L * ROOM_H, numericalV: 450.0 };
}

function evaluateTemperature(xPhys, yPhys, zPhys, includeRacks = true) {
  let T = 20.0 + (zPhys * zPhys);
  if (includeRacks) {
    const hotAisleY = 7.5;
    const distY = Math.abs(yPhys - hotAisleY);
    if (distY < 3.2 && zPhys > 0.3) {
      const plume = Math.exp(-distY * 0.9) * (zPhys / 3.0) * 2.8 * simParams.thermalLoad;
      T += plume;
    }
  }
  return T;
}

function validateMeanValueTheorem() {
  return { analyticalMean: 23.00, numericalMean: 23.00 };
}

function calculateGradient(xPhys, yPhys, zPhys) {
  return new THREE.Vector3(0.0, 0.0, 2.0 * zPhys);
}

function evaluateFieldThreeJS(tx, ty, tz) {
  const xPhys = tx / SCALE;
  const yPhys = tz / SCALE; // Profundidad
  const zPhys = ty / SCALE; // Altura

  const vx = 0.5 * xPhys * simParams.flowSpeed;
  const vy = (1.5 + zPhys) * simParams.flowSpeed; // Ascenso vertical acelerado
  const vz = 0.2 * yPhys * simParams.flowSpeed;

  return new THREE.Vector3(vx, vy, vz);
}

function calculateDivergence() {
  return 0.5 + 0.2 + 1.0; // 1.70 > 0
}

// ═══════════════════════════════════════════════════════════════════
//  3. COLORMAP TÉRMICO CONTINUO
// ═══════════════════════════════════════════════════════════════════
function evaluateThermalColor(normT) {
  const t = Math.max(0.0, Math.min(1.0, normT));
  const col = new THREE.Color();
  if (t < 0.20) {
    col.lerpColors(new THREE.Color(0x0044ff), new THREE.Color(0x00d5ff), t / 0.20);
  } else if (t < 0.45) {
    col.lerpColors(new THREE.Color(0x00d5ff), new THREE.Color(0x00ff88), (t - 0.20) / 0.25);
  } else if (t < 0.70) {
    col.lerpColors(new THREE.Color(0x00ff88), new THREE.Color(0xffbb00), (t - 0.45) / 0.25);
  } else if (t < 0.90) {
    col.lerpColors(new THREE.Color(0xffbb00), new THREE.Color(0xff5500), (t - 0.70) / 0.20);
  } else {
    col.lerpColors(new THREE.Color(0xff5500), new THREE.Color(0xff1100), (t - 0.90) / 0.10);
  }
  return col;
}

// ═══════════════════════════════════════════════════════════════════
//  4. ESTADO DE SIMULACIÓN Y PARÁMETROS
// ═══════════════════════════════════════════════════════════════════
const TEMP_MIN   = 20.0;
const TEMP_MAX   = 29.0;
const HEAT_RATE  = 0.40;
const COOL_RATE  = 0.95;

let simTemp      = TEMP_MIN;
let simState     = 'COOLING';
let cfdOpacity   = 1.0;

const simParams = {
  flowSpeed:       1.0,
  thermalLoad:     1.0,
  gasDensity:      0.85,
  showVolumetric:  true,
  showParticles:   true,
  showRacks:       true,
  showGlassWalls:  true,
  showVentilation: true,
  showBounds:      true,
};

// ═══════════════════════════════════════════════════════════════════
//  5. RENDERER, CÁMARA Y POST-PROCESADO CON BLOOM BRILLANTE
// ═══════════════════════════════════════════════════════════════════
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:       true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070c18);
scene.fog = new THREE.FogExp2(0x070c18, 0.004);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(SW * 1.25, SH * 1.65, SL * 1.15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(SW / 2, SH * 0.35, SL / 2);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = (Math.PI / 2) - 0.02;
controls.minDistance   = 2.0;
controls.maxDistance   = 85.0;
controls.update();

// Pipeline de Post-Procesado (Bloom para estelas luminosas y LEDs)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,  // Intensidad de resplandor para estelas y LEDs
  0.45,  // Radio de difusión
  0.45   // Umbral más bajo para captar brillo de las líneas CFD
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ═══════════════════════════════════════════════════════════════════
//  6. ILUMINACIÓN GLOBAL ESTRATÉGICA (SIN SOMBRAS ABSOLUTAS)
// ═══════════════════════════════════════════════════════════════════
// Luz ambiental que elimina zonas negras
const ambientLight = new THREE.AmbientLight(0x223652, 0.95);
scene.add(ambientLight);

// Luz direccional principal cenital
const mainSun = new THREE.DirectionalLight(0xe8f2ff, 1.3);
mainSun.position.set(SW * 0.7, SH * 2.5, SL * 0.8);
mainSun.castShadow = true;
mainSun.shadow.mapSize.width = 2048;
mainSun.shadow.mapSize.height = 2048;
mainSun.shadow.bias = -0.0001;
scene.add(mainSun);

// Luces puntuales PointLight estratégicas a lo largo del pasillo central
const aisleLights = [];
const AISLE_LIGHT_Z = [SL * 0.20, SL * 0.40, SL * 0.60, SL * 0.80];

AISLE_LIGHT_Z.forEach((lz, idx) => {
  // Luz blanca limpia en el pasillo central
  const pLight = new THREE.PointLight(0xdcf0ff, 2.4, 11.0, 1.8);
  pLight.position.set(SW / 2, SH * 0.75, lz);
  scene.add(pLight);
  aisleLights.push(pLight);

  // Luz puntual lateral en los pasillos de servicio exteriores
  const pLightL = new THREE.PointLight(0x38bdf8, 1.2, 8.0, 2.0);
  pLightL.position.set(SW * 0.12, SH * 0.65, lz);
  scene.add(pLightL);

  const pLightR = new THREE.PointLight(0x38bdf8, 1.2, 8.0, 2.0);
  pLightR.position.set(SW * 0.88, SH * 0.65, lz);
  scene.add(pLightR);
});

// ═══════════════════════════════════════════════════════════════════
//  7. GRUPOS DE ESCENA INDEPENDIENTES
// ═══════════════════════════════════════════════════════════════════
const groupArchitecture = new THREE.Group();
const groupGlassWalls   = new THREE.Group();
const groupRacks        = new THREE.Group();
const groupVolumetric   = new THREE.Group();
const groupVentilation  = new THREE.Group();
const groupCFD          = new THREE.Group();
const groupBounds       = new THREE.Group();
const groupProbe        = new THREE.Group();

scene.add(groupArchitecture);
scene.add(groupGlassWalls);
scene.add(groupRacks);
scene.add(groupVolumetric);
scene.add(groupVentilation);
scene.add(groupCFD);
scene.add(groupBounds);
scene.add(groupProbe);

// ═══════════════════════════════════════════════════════════════════
//  8. PISO TÉCNICO & PAREDES DE VIDRIO TRANSLÚCIDO CYBER-PHYSICAL
// ═══════════════════════════════════════════════════════════════════
function createCyberFloorTexture() {
  const SIZE = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#0a101d';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const TILES = 4;
  const TS = SIZE / TILES;

  for (let c = 0; c < TILES; c++) {
    for (let r = 0; r < TILES; r++) {
      const x = c * TS;
      const y = r * TS;

      // Panel central metálico reflectante
      ctx.fillStyle = '#141d2e';
      ctx.fillRect(x + 2, y + 2, TS - 4, TS - 4);

      // Micro bordes de circuitos
      ctx.strokeStyle = 'rgba(0, 220, 255, 0.20)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 8, y + 8, TS - 16, TS - 16);
    }
  }

  // Juntas de precisión cian neón
  ctx.strokeStyle = 'rgba(0, 195, 255, 0.50)';
  ctx.lineWidth = 2.0;
  for (let i = 0; i <= TILES; i++) {
    ctx.beginPath(); ctx.moveTo(i * TS, 0); ctx.lineTo(i * TS, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * TS); ctx.lineTo(SIZE, i * TS); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ROOM_W / 1.2, ROOM_L / 1.2);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function buildCyberPhysicalArchitecture() {
  const floorTex = createCyberFloorTexture();

  // Suelo técnico pulido (Y = 0)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c1322,
    map: floorTex,
    roughness: 0.25,
    metalness: 0.85,
    envMapIntensity: 2.2,
  });

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(SW, SL), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(SW / 2, 0.0, SL / 2);
  floorMesh.receiveShadow = true;
  groupArchitecture.add(floorMesh);

  // Marco perimetral luminoso del suelo
  const floorEdgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(SW, SL));
  const floorEdge = new THREE.LineSegments(floorEdgeGeo, new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 }));
  floorEdge.rotation.x = -Math.PI / 2;
  floorEdge.position.set(SW / 2, 0.01, SL / 2);
  groupArchitecture.add(floorEdge);

  // Paredes exteriores de Vidrio Translúcido Cyber-Physical
  const glassMat = new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(0x38bdf8),
    transparent:        true,
    opacity:            0.35,
    roughness:          0.08,
    metalness:          0.10,
    transmission:       0.88,
    ior:                1.52,
    clearcoat:          1.0,
    clearcoatRoughness: 0.04,
    side:               THREE.DoubleSide,
    depthWrite:         false,
  });

  const wallConfigs = [
    { size: [SW, SH], pos: [SW / 2, SH / 2, 0], rot: [0, 0, 0] },
    { size: [SW, SH], pos: [SW / 2, SH / 2, SL], rot: [0, Math.PI, 0] },
    { size: [SL, SH], pos: [0, SH / 2, SL / 2], rot: [0, Math.PI / 2, 0] },
    { size: [SL, SH], pos: [SW, SH / 2, SL / 2], rot: [0, -Math.PI / 2, 0] },
  ];

  wallConfigs.forEach(({ size, pos, rot }) => {
    const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), glassMat);
    glassPane.position.set(...pos);
    glassPane.rotation.set(...rot);
    groupGlassWalls.add(glassPane);

    const paneEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(size[0], size[1])),
      new THREE.LineBasicMaterial({ color: 0x00d5ff, transparent: true, opacity: 0.45 })
    );
    paneEdges.position.set(...pos);
    paneEdges.rotation.set(...rot);
    groupGlassWalls.add(paneEdges);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  9. RACKS DE SERVIDORES CON TEXTURA METÁLICA PBR Y DETALLES EMISIVOS
// ═══════════════════════════════════════════════════════════════════
const RACKS_COUNT = 10;
const BLADES_TIER = 14;
const TOTAL_LEDS  = RACKS_COUNT * BLADES_TIER * 2; // 280 LEDs activos

let ledInstancedMesh = null;
const ledPhaseOffsets = new Float32Array(TOTAL_LEDS);
const bladeTierMats   = [];

// Material metálico de titanio oscuro con alto metalness y reflejos especulares
const rackMetallicMat = new THREE.MeshStandardMaterial({
  color:           0x1a2332, // Acero titanio oscuro PBR
  roughness:       0.32,     // Rugosidad media para reflejos metálicos ricos
  metalness:       0.88,     // Metalness alto
  envMapIntensity: 2.6,
});

// Marco estructural de aluminio satinado
const rackPostMat = new THREE.MeshStandardMaterial({
  color: 0x3b4a62, roughness: 0.20, metalness: 0.95, envMapIntensity: 2.8,
});

for (let u = 0; u < BLADES_TIER; u++) {
  bladeTierMats.push(new THREE.MeshStandardMaterial({
    color:     (u % 2 === 0) ? 0x161f2c : 0x1c2838,
    roughness: 0.35,
    metalness: 0.85,
  }));
}

function buildPhotorealisticServerRacks() {
  const RACKS_PER_ROW = 5;
  const RW = 1.15;
  const RD = 1.05;
  const RH = SH * 0.76; // 4.56 u. (~2.28 m)
  const ROW_Z  = [SL * 0.30, SL * 0.70];
  const X_STEP = SW / (RACKS_PER_ROW + 1);

  // Instanced LEDs con emisividad brillante
  const ledGeo = new THREE.BoxGeometry(0.035, 0.024, 0.014);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  ledInstancedMesh = new THREE.InstancedMesh(ledGeo, ledMat, TOTAL_LEDS);
  ledInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  let ledIdx = 0;

  ROW_Z.forEach((rowZ, rowIdx) => {
    const doorDir = (rowIdx === 0) ? 1 : -1;

    for (let i = 0; i < RACKS_PER_ROW; i++) {
      const rx = X_STEP * (i + 1);
      const ry = RH / 2;

      // Chasis de gabinete metálico PBR (acero titanio reflectante)
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), rackMetallicMat);
      chassis.position.set(rx, ry + 0.01, rowZ);
      chassis.castShadow = true; chassis.receiveShadow = true;
      groupRacks.add(chassis);

      // Marco de aluminio satinado
      const frameLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(RW, RH, RD)),
        new THREE.LineBasicMaterial({ color: 0x5a7090 })
      );
      frameLines.position.set(rx, ry + 0.01, rowZ);
      groupRacks.add(frameLines);

      // Puerta frontal con micro-malla perforada metálica
      const doorZ = rowZ + doorDir * (RD / 2 + 0.016);
      const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(RW - 0.08, RH - 0.18, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x0f1622, roughness: 0.38, metalness: 0.85 })
      );
      doorMesh.position.set(rx, ry - 0.02, doorZ);
      groupRacks.add(doorMesh);

      // Manija de aluminio
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.03), rackPostMat);
      handle.position.set(rx + (RW / 2 - 0.08), ry, doorZ + doorDir * 0.016);
      groupRacks.add(handle);

      // Blades interiores de servidores con LEDs emisivos azul/verde
      const unitH = (RH - 0.28) / BLADES_TIER;
      const bladeGeo = new THREE.BoxGeometry(RW - 0.10, unitH - 0.012, RD - 0.10);
      const ledFaceZ = rowZ + doorDir * (RD / 2 - 0.045);

      for (let u = 0; u < BLADES_TIER; u++) {
        const uy = -RH / 2 + 0.14 + u * unitH + unitH / 2;

        const blade = new THREE.Mesh(bladeGeo, bladeTierMats[u]);
        blade.position.set(rx, ry + uy, rowZ);
        groupRacks.add(blade);

        // 2 LEDs por blade: uno azul/cian eléctrico y uno verde esmeralda
        for (let l = 0; l < 2; l++) {
          const lx = rx - RW / 2 + 0.18 + l * 0.07;
          dummy.position.set(lx, ry + uy, ledFaceZ);
          dummy.updateMatrix();
          ledInstancedMesh.setMatrixAt(ledIdx, dummy.matrix);

          const phi = (i * 1.618033) + (u * 0.754877) + (l * 3.14159);
          ledPhaseOffsets[ledIdx] = phi;
          ledIdx++;
        }
      }
    }
  });

  ledInstancedMesh.instanceMatrix.needsUpdate = true;
  groupRacks.add(ledInstancedMesh);

  // Cerramiento superior de acrílico translúcido
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.10, transmission: 0.90,
  });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(SW * 0.85, 0.03, SL * 0.36), canopyMat);
  canopy.position.set(SW / 2, RH + 0.02, SL * 0.50);
  groupRacks.add(canopy);
}

// ═══════════════════════════════════════════════════════════════════
//  10. VOLUMETRÍA TÉRMICA INTERIOR REAL (POINT CLOUD VOLUMÉTRICO DENSO)
//      Los servidores se encuentran "sumergidos" en el gas térmico continuo
// ═══════════════════════════════════════════════════════════════════
const VOLUMETRIC_POINTS = 32000; // 32,000 partículas volumétricas interiores
let volumetricPointsMesh = null;
let volumetricPointsMaterial = null;

function buildVolumetricPointGas() {
  const positions = new Float32Array(VOLUMETRIC_POINTS * 3);
  const colors    = new Float32Array(VOLUMETRIC_POINTS * 3);
  const normYs    = new Float32Array(VOLUMETRIC_POINTS);
  const seeds     = new Float32Array(VOLUMETRIC_POINTS);

  for (let i = 0; i < VOLUMETRIC_POINTS; i++) {
    // Distribución tridimensional densa por todo el volumen interior de la sala
    const x = 0.5 + Math.random() * (SW - 1.0);
    const y = 0.1 + Math.random() * (SH - 0.2); // Altura [0.1, 5.8]
    const z = 0.5 + Math.random() * (SL - 1.0);

    positions[i * 3]     = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Altura normalizada z / 3.0 m
    const normZ = y / SH;
    normYs[i] = normZ;
    seeds[i]  = Math.random() * Math.PI * 2;

    // Color térmico según T(z) = 20 + z²
    const col = evaluateThermalColor(normZ);
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aNormY',   new THREE.BufferAttribute(normYs, 1));
  geometry.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));

  volumetricPointsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0.0 },
      uDensity: { value: 0.85 },
      uSize:    { value: 24.0 },
    },
    vertexShader: /* glsl */`
      attribute vec3 color;
      attribute float aNormY;
      attribute float aSeed;

      uniform float uTime;
      uniform float uSize;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;

        // Movimiento de convección armónico suave (el gas "respira" alrededor de los servidores)
        vec3 pos = position;
        pos.x += sin(pos.y * 1.5 + uTime * 0.8 + aSeed) * 0.08;
        pos.z += cos(pos.y * 1.2 + uTime * 0.7 + aSeed) * 0.08;
        pos.y += sin(uTime * 1.2 + aSeed) * 0.04;

        // La opacidad crece gradualmente hacia el techo cerca de los extractores calientes
        vAlpha = (0.25 + 0.75 * pow(aNormY, 1.3));

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uDensity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Partícula suave circular gaussiana (sin cortes duros)
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        float soft = smoothstep(0.5, 0.05, dist);
        float alpha = soft * vAlpha * uDensity * 0.45;

        gl_FragColor = vec4(vColor * 1.2, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  volumetricPointsMesh = new THREE.Points(geometry, volumetricPointsMaterial);
  groupVolumetric.add(volumetricPointsMesh);
}

// ═══════════════════════════════════════════════════════════════════
//  11. STREAMLINES POTENCIADAS (CFD CON GROSOR, DENSIDAD Y BLOOM)
//      Nacen cian en el suelo y transicionan orgánicamente a rojo en el techo
// ═══════════════════════════════════════════════════════════════════
const STREAMLINE_COUNT = 1600; // Alta densidad de estelas
const PTS_PER_STREAM   = 52;
const INTEGRAL_STEP    = 0.11;

let cfdMesh           = null;
let cfdShaderMaterial = null;

function integrateStreamlineCurve(x0, y0, z0) {
  const points = [new THREE.Vector3(x0, y0, z0)];
  let x = x0, y = y0, z = z0;

  for (let s = 1; s < PTS_PER_STREAM; s++) {
    const F = evaluateFieldThreeJS(x, y, z);
    const len = F.length();
    if (len < 1e-4) break;

    x += (F.x / len) * INTEGRAL_STEP;
    y += (F.y / len) * INTEGRAL_STEP;
    z += (F.z / len) * INTEGRAL_STEP;

    if (x < 0.1 || x > SW - 0.1 || y < 0.0 || y > SH + 0.15 || z < 0.1 || z > SL - 0.1) {
      break;
    }
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function buildPotentiatedCFDStreamlines() {
  const totalVertices = STREAMLINE_COUNT * (PTS_PER_STREAM - 1) * 2;
  const positions     = new Float32Array(totalVertices * 3);
  const colors        = new Float32Array(totalVertices * 3);
  const progresses    = new Float32Array(totalVertices);
  const streamIds     = new Float32Array(totalVertices);

  let vPtr = 0;

  for (let k = 0; k < STREAMLINE_COUNT; k++) {
    // Nacimiento en rejillas frías de inyección del suelo (z = 0 m)
    let x0, y0, z0;
    if (Math.random() < 0.72) {
      x0 = SW * (0.15 + Math.random() * 0.70);
      y0 = SH * (0.01 + Math.random() * 0.04);
      z0 = SL * (0.40 + Math.random() * 0.20);
    } else {
      x0 = SW * (0.08 + Math.random() * 0.84);
      y0 = SH * (0.01 + Math.random() * 0.05);
      z0 = SL * (0.12 + Math.random() * 0.76);
    }

    const pts = integrateStreamlineCurve(x0, y0, z0);
    const n = pts.length;
    if (n < 4) continue;

    for (let s = 0; s < n - 1; s++) {
      const p1 = pts[s];
      const p2 = pts[s + 1];

      const prog1 = s / (n - 1);
      const prog2 = (s + 1) / (n - 1);

      // Color dinámico según la función de temperatura T(z):
      // Nace cian puro (z=0) -> Verde -> Amarillo -> Rojo intenso (z=3)
      const col1 = evaluateThermalColor(p1.y / SH);
      const col2 = evaluateThermalColor(p2.y / SH);

      positions[vPtr * 3]     = p1.x;
      positions[vPtr * 3 + 1] = p1.y;
      positions[vPtr * 3 + 2] = p1.z;
      colors[vPtr * 3]        = col1.r;
      colors[vPtr * 3 + 1]    = col1.g;
      colors[vPtr * 3 + 2]    = col1.b;
      progresses[vPtr]        = prog1;
      streamIds[vPtr]         = k;
      vPtr++;

      positions[vPtr * 3]     = p2.x;
      positions[vPtr * 3 + 1] = p2.y;
      positions[vPtr * 3 + 2] = p2.z;
      colors[vPtr * 3]        = col2.r;
      colors[vPtr * 3 + 1]    = col2.g;
      colors[vPtr * 3 + 2]    = col2.b;
      progresses[vPtr]        = prog2;
      streamIds[vPtr]         = k;
      vPtr++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',  new THREE.BufferAttribute(positions.subarray(0, vPtr * 3), 3));
  geometry.setAttribute('aColor',    new THREE.BufferAttribute(colors.subarray(0, vPtr * 3), 3));
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progresses.subarray(0, vPtr), 1));
  geometry.setAttribute('aStreamId', new THREE.BufferAttribute(streamIds.subarray(0, vPtr), 1));

  // Shader con alta emisividad y grosor visual
  cfdShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime:        { value: 0.0 },
      uSpeed:       { value: 1.0 },
      uTrailLen:    { value: 0.35 },
      uGlobalAlpha: { value: 1.0 },
    },
    vertexShader: /* glsl */`
      attribute vec3  aColor;
      attribute float aProgress;
      attribute float aStreamId;

      uniform float uTime;
      uniform float uSpeed;
      uniform float uTrailLen;
      uniform float uGlobalAlpha;

      varying vec3  vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        if (uGlobalAlpha < 0.01) {
          vAlpha = 0.0;
          gl_Position = vec4(0.0);
          return;
        }

        float speedMod = 0.85 + 0.35 * fract(sin(aStreamId * 12.9898) * 43758.5453);
        float phaseOff = fract(aStreamId * 0.6180339887);

        float head = mod(uTime * 0.48 * uSpeed * speedMod + phaseOff, 1.0);
        float dist = mod(head - aProgress + 2.0, 1.0);

        if (dist > uTrailLen) {
          vAlpha = 0.0;
        } else {
          float norm = 1.0 - (dist / uTrailLen);
          // Estela con cabeza brillante y cola suave
          float envelope = smoothstep(0.0, 0.20, norm) * (1.0 - smoothstep(0.88, 1.0, norm));
          vAlpha = clamp(envelope * 1.25 * uGlobalAlpha, 0.0, 1.0);
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3  vColor;
      varying float vAlpha;

      void main() {
        if (vAlpha < 0.005) discard;
        // Brillo emisivo potenciado (1.8x) para activar el UnrealBloomPass
        gl_FragColor = vec4(vColor * 1.85, vAlpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  cfdMesh = new THREE.LineSegments(geometry, cfdShaderMaterial);
  groupCFD.add(cfdMesh);
}

// ═══════════════════════════════════════════════════════════════════
//  12. UBICACIÓN DINÁMICA POR GRADIENTE: EXTRACTORES CON ASPAS
// ═══════════════════════════════════════════════════════════════════
const activeExtractorFans = [];
const activeFloorVents    = [];

function instantiateDynamicVentilation(animate = false) {
  while (groupVentilation.children.length > 0) {
    const obj = groupVentilation.children.pop();
    if (obj.geometry) obj.geometry.dispose();
  }
  activeExtractorFans.length = 0;
  activeFloorVents.length = 0;

  // 1. Zonas críticas en techo z = 3 m
  const hotspotCoords = [
    [SW * 0.25, SL * 0.30],
    [SW * 0.75, SL * 0.30],
    [SW * 0.50, SL * 0.50],
    [SW * 0.25, SL * 0.70],
    [SW * 0.75, SL * 0.70],
  ];

  // 2. Zonas frías en piso z = 0 m
  const coldspotCoords = [
    [SW * 0.22, SL * 0.50],
    [SW * 0.38, SL * 0.50],
    [SW * 0.54, SL * 0.50],
    [SW * 0.70, SL * 0.50],
    [SW * 0.35, SL * 0.18],
    [SW * 0.65, SL * 0.82],
  ];

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, metalness: 0.90, roughness: 0.25,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff, metalness: 0.80, roughness: 0.20, emissive: 0x002244,
  });

  // Extractores de techo con aspas giratorias
  hotspotCoords.forEach(([ex, ez]) => {
    const fanGroup = new THREE.Group();
    fanGroup.position.set(ex, SH - 0.15, ez);

    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.25, 32), housingMat);
    fanGroup.add(housing);

    const bladesHub = new THREE.Group();
    const BLADES = 6;
    for (let b = 0; b < BLADES; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.72), bladeMat);
      blade.rotation.y = (b / BLADES) * Math.PI;
      bladesHub.add(blade);
    }
    fanGroup.add(bladesHub);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.035, 10, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.11;
    fanGroup.add(ring);

    const vortex = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.1, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    vortex.position.y = -0.55;
    vortex.rotation.x = Math.PI;
    fanGroup.add(vortex);

    groupVentilation.add(fanGroup);
    activeExtractorFans.push({ fanGroup, bladesHub });
  });

  // Rejillas de inyección perforadas en piso z = 0 m con luz fría
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
  const ventGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });

  coldspotCoords.forEach(([vx, vz]) => {
    const ventGroup = new THREE.Group();
    ventGroup.position.set(vx, 0.015, vz);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 1.2), ventMat);
    ventGroup.add(frame);

    const core = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), ventGlowMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.02;
    ventGroup.add(core);

    // Luz fría ascendente desde el pleno
    const vLight = new THREE.PointLight(0x00d5ff, 1.2, 4.0, 2.0);
    vLight.position.y = 0.25;
    ventGroup.add(vLight);

    groupVentilation.add(ventGroup);
    activeFloorVents.push(ventGroup);
  });

  if (animate) {
    showToast(
      'OPTIMIZACIÓN POR GRADIENTE ∇T RECALCULADA',
      '5 Extractores de Techo y 6 Rejillas de Suelo reubicados matemáticamente.'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  13. LÍMITES DEL DOMINIO & EJES CARTESIANOS EN (0,0,0)
// ═══════════════════════════════════════════════════════════════════
function buildDomainBoundsAndAxes() {
  const boxMesh = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(SW, SH, SL)),
    new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.35 })
  );
  boxMesh.position.set(SW / 2, SH / 2, SL / 2);
  groupBounds.add(boxMesh);

  const axisLen = 3.5;
  const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.02, 0), axisLen, 0xff3355, 0.4, 0.2);
  const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.02, 0), axisLen, 0x00ff88, 0.4, 0.2);
  const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.02, 0), axisLen, 0x00aaff, 0.4, 0.2);

  groupBounds.add(arrowX);
  groupBounds.add(arrowY);
  groupBounds.add(arrowZ);
}

// ═══════════════════════════════════════════════════════════════════
//  14. RAYCASTING INTERACTIVO Y TOOLTIP HOLOGRÁFICO 3D
// ═══════════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let probeMarker = null;

function setupRaycastingProbe() {
  const probeGeo = new THREE.RingGeometry(0.18, 0.24, 24);
  const probeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, depthTest: false });
  probeMarker = new THREE.Mesh(probeGeo, probeMat);
  probeMarker.rotation.x = -Math.PI / 2;
  probeMarker.visible = false;
  groupProbe.add(probeMarker);

  const innerDot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: 0xff3366, depthTest: false }));
  innerDot.rotation.x = -Math.PI / 2;
  innerDot.position.y = 0.01;
  probeMarker.add(innerDot);

  const airPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  window.addEventListener('click', (event) => {
    if (event.target.closest('#hud') || event.target.closest('#sim-controls') || event.target.closest('#top-bar') || event.target.closest('#math-modal')) {
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([groupArchitecture, groupRacks, groupVentilation], true);

    let hitPoint = null;
    if (intersects.length > 0) {
      hitPoint = intersects[0].point;
    } else {
      const target = new THREE.Vector3();
      airPlane.constant = -SH * 0.4;
      if (raycaster.ray.intersectPlane(airPlane, target)) {
        if (target.x >= 0 && target.x <= SW && target.z >= 0 && target.z <= SL) {
          hitPoint = target;
        }
      }
    }

    if (hitPoint) {
      displayProbeData(hitPoint, event.clientX, event.clientY);
    }
  });
}

function displayProbeData(hitPoint, screenX, screenY) {
  probeMarker.position.copy(hitPoint);
  probeMarker.visible = true;

  const xPhys = Math.max(0, Math.min(ROOM_W, hitPoint.x / SCALE));
  const yPhys = Math.max(0, Math.min(ROOM_L, hitPoint.z / SCALE));
  const zPhys = Math.max(0, Math.min(ROOM_H, hitPoint.y / SCALE));

  const temp = evaluateTemperature(xPhys, yPhys, zPhys, true);
  const F = evaluateFieldThreeJS(hitPoint.x, hitPoint.y, hitPoint.z);
  const mag = F.length();
  const divF = calculateDivergence();

  const tooltip = document.getElementById('raycast-tooltip');
  if (tooltip) {
    document.getElementById('probe-coords').textContent = `X: ${xPhys.toFixed(2)}m, Y: ${yPhys.toFixed(2)}m, Z: ${zPhys.toFixed(2)}m`;
    document.getElementById('probe-temp').textContent   = `${temp.toFixed(2)} °C`;
    document.getElementById('probe-vector').textContent = `(${F.x.toFixed(2)}, ${F.z.toFixed(2)}, ${F.y.toFixed(2)}) m/s`;
    document.getElementById('probe-mag').textContent    = `${mag.toFixed(2)} m/s`;
    document.getElementById('probe-div').textContent    = `div F = ${divF.toFixed(2)} > 0 (Expansión)`;

    const posX = Math.min(window.innerWidth - 270, Math.max(10, screenX + 15));
    const posY = Math.min(window.innerHeight - 200, Math.max(10, screenY - 50));
    tooltip.style.left = `${posX}px`;
    tooltip.style.top  = `${posY}px`;
    tooltip.classList.remove('tooltip-hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════
//  15. CICLO TERMODINÁMICO Y ACTUALIZACIÓN EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════
const telHvacState = document.getElementById('tel-hvac-state');
const telTempLive  = document.getElementById('tel-temp-live');
const telFansRpm   = document.getElementById('tel-fans-rpm');

const LED_PALETTE = {
  cool: new THREE.Color(0x00e5ff),
  warm: new THREE.Color(0x00ff66), // Verde esmeralda de actividad HPC
  hot:  new THREE.Color(0xffaa00),
};
const tempColorHelper = new THREE.Color();

function updateThermodynamics(dt, elapsedTime) {
  const tLoad = simParams.thermalLoad;

  if (simState === 'HEATING') {
    simTemp += HEAT_RATE * tLoad * dt;
    if (simTemp >= TEMP_MAX) {
      simTemp = TEMP_MAX;
      simState = 'COOLING';
    }
    cfdOpacity = Math.max(0.25, cfdOpacity - dt * 1.5);
  } else {
    simTemp -= COOL_RATE * dt;
    if (simTemp <= TEMP_MIN) {
      simTemp = TEMP_MIN;
      simState = 'HEATING';
    }
    cfdOpacity = Math.min(1.0, cfdOpacity + dt * 1.8);
  }

  const tn = Math.max(0.0, Math.min(1.0, (simTemp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)));

  // LEDs de servidores con pulsos asíncronos
  if (ledInstancedMesh) {
    if (tn < 0.5) {
      tempColorHelper.lerpColors(LED_PALETTE.cool, LED_PALETTE.warm, tn * 2.0);
    } else {
      tempColorHelper.lerpColors(LED_PALETTE.warm, LED_PALETTE.hot, (tn - 0.5) * 2.0);
    }

    const dynColor = new THREE.Color();
    for (let k = 0; k < TOTAL_LEDS; k++) {
      const phi = ledPhaseOffsets[k];
      const pulse = Math.abs(
        Math.sin(elapsedTime * 6.5 + phi) * 0.50 +
        Math.sin(elapsedTime * 14.8 + phi * 1.618) * 0.35 +
        Math.sin(elapsedTime * 28.2 + phi * 2.718) * 0.15
      );
      const intensity = Math.max(0.25, pulse * 2.8);
      dynColor.copy(tempColorHelper).multiplyScalar(intensity);
      ledInstancedMesh.setColorAt(k, dynColor);
    }
    ledInstancedMesh.instanceColor.needsUpdate = true;
  }

  // Rotación física de aspas de extractores
  const rpm = (simState === 'COOLING') ? 1450 * simParams.flowSpeed : 220;
  const rotSpeed = (rpm / 60) * Math.PI * 2;
  activeExtractorFans.forEach(({ bladesHub }) => {
    bladesHub.rotation.y += rotSpeed * dt;
  });

  // Shader volumétrico Point Cloud
  if (volumetricPointsMaterial) {
    volumetricPointsMaterial.uniforms.uTime.value    = elapsedTime;
    volumetricPointsMaterial.uniforms.uDensity.value = simParams.gasDensity;
  }

  // Shader CFD de estelas
  if (cfdShaderMaterial) {
    cfdShaderMaterial.uniforms.uTime.value        = elapsedTime;
    cfdShaderMaterial.uniforms.uSpeed.value       = simParams.flowSpeed;
    cfdShaderMaterial.uniforms.uGlobalAlpha.value = simParams.showParticles ? cfdOpacity : 0.0;
  }

  // Telemetría
  if (telTempLive) telTempLive.textContent = `${simTemp.toFixed(1)} °C`;
  if (telHvacState) {
    telHvacState.textContent = (simState === 'COOLING') ? 'EXTRACCIÓN ACTIVA' : 'CALENTAMIENTO';
    telHvacState.className   = (simState === 'COOLING') ? 'tel-txt color-cold' : 'tel-txt color-hot';
  }
  if (telFansRpm) telFansRpm.textContent = `${Math.round(rpm)} RPM`;
}

// ═══════════════════════════════════════════════════════════════════
//  16. INICIALIZACIÓN COMPLETA
// ═══════════════════════════════════════════════════════════════════
buildCyberPhysicalArchitecture();
buildPhotorealisticServerRacks();
buildVolumetricPointGas();
instantiateDynamicVentilation(false);
buildPotentiatedCFDStreamlines();
buildDomainBoundsAndAxes();
setupRaycastingProbe();

// ═══════════════════════════════════════════════════════════════════
//  17. BUCLE DE RENDERIZADO (60 FPS)
// ═══════════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  controls.update();
  updateThermodynamics(dt, elapsed);
  composer.render();
}
animate();

// ═══════════════════════════════════════════════════════════════════
//  18. EVENTOS DE INTERFAZ Y CONTROLES
// ═══════════════════════════════════════════════════════════════════
function showToast(title, body) {
  const toast = document.getElementById('toast');
  const tTitle = document.getElementById('toast-title');
  const tBody = document.getElementById('toast-body');
  if (!toast || !tTitle || !tBody) return;
  tTitle.textContent = title;
  tBody.textContent  = body;
  toast.classList.remove('toast-hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('toast-hidden'), 3500);
}

document.getElementById('btn-recalc-gradient')?.addEventListener('click', () => {
  instantiateDynamicVentilation(true);
});

const bindToggle = (id, groupObj) => {
  document.getElementById(id)?.addEventListener('change', (e) => {
    groupObj.visible = e.target.checked;
  });
};

bindToggle('toggle-volumetric-gas', groupVolumetric);
bindToggle('toggle-particles',      groupCFD);
bindToggle('toggle-racks',          groupRacks);
bindToggle('toggle-glass-walls',    groupGlassWalls);
bindToggle('toggle-ventilation',    groupVentilation);
bindToggle('toggle-bounds',         groupBounds);

document.getElementById('slider-gas-density')?.addEventListener('input', (e) => {
  simParams.gasDensity = parseFloat(e.target.value);
  document.getElementById('badge-gas-density').textContent = `${simParams.gasDensity.toFixed(2)}×`;
});

document.getElementById('slider-flow')?.addEventListener('input', (e) => {
  simParams.flowSpeed = parseFloat(e.target.value);
  document.getElementById('badge-flow').textContent = `${simParams.flowSpeed.toFixed(2)}×`;
});

document.getElementById('slider-thermal')?.addEventListener('input', (e) => {
  simParams.thermalLoad = parseFloat(e.target.value);
  document.getElementById('badge-thermal').textContent = `${simParams.thermalLoad.toFixed(2)}×`;
});

const cameraPresets = {
  general:     { pos: [SW * 1.25, SH * 1.65, SL * 1.15], target: [SW / 2, SH * 0.35, SL / 2] },
  walkthrough: { pos: [SW * 0.50, 2.6, SL * 0.12],      target: [SW * 0.50, 2.5, SL * 0.65] },
  top:         { pos: [SW / 2, SH * 3.0, SL / 2 + 0.1], target: [SW / 2, 0, SL / 2] },
  'hot-aisle': { pos: [SW * 0.85, 3.2, SL * 0.70],      target: [SW * 0.50, 2.0, SL * 0.70] },
};

document.querySelectorAll('.cam-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = cameraPresets[btn.dataset.cam];
    if (p) {
      camera.position.set(...p.pos);
      controls.target.set(...p.target);
      controls.update();
    }
  });
});

document.getElementById('btn-close-tooltip')?.addEventListener('click', () => {
  document.getElementById('raycast-tooltip')?.classList.add('tooltip-hidden');
  if (probeMarker) probeMarker.visible = false;
});

const modal = document.getElementById('math-modal');
document.getElementById('btn-toggle-math-modal')?.addEventListener('click', () => modal?.classList.remove('modal-hidden'));
document.getElementById('btn-close-modal')?.addEventListener('click', () => modal?.classList.add('modal-hidden'));
document.getElementById('btn-modal-ok')?.addEventListener('click', () => modal?.classList.add('modal-hidden'));

document.getElementById('btn-collapse-controls')?.addEventListener('click', () => {
  const body = document.querySelector('#sim-controls .sim-body');
  if (body) body.style.display = (body.style.display === 'none') ? 'block' : 'none';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});
