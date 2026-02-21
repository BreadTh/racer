const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const BASE_W = 640, BASE_H = 360, BASE_FOV = 300;
canvas.width = BASE_W;
canvas.height = BASE_H;

// Offscreen canvas for 3D map rendering (dynamically resized)
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');
let resScale = 0.03;
let W = Math.round(BASE_W * resScale), H = Math.round(BASE_H * resScale);
offCanvas.width = W;
offCanvas.height = H;


// ---- DRIFT MARKS ----
const driftMarks = []; // {x, y, h, angle}
const MAX_DRIFT_MARKS = 600;
let lastMarkDist = 0;
const MARK_INTERVAL = 8; // world units between marks

let hudIndicatorAlpha = 0; // drift indicator fade
let hudGoingAlpha = 0;     // going-direction arrow fade
let hudFacingAlpha = 0;    // facing-direction arrow fade
const INDICATOR_MIN_SPEED = 50; // speed threshold for going/facing arrows

// ---- MINIMAP ----
const MMAP_TEX = 512; // offscreen texture size
const MMAP_SCALE = MMAP_TEX / MAP_SIZE; // tiles to minimap pixels
const MMAP_SIZE = 132; // display size on screen
const mmapCanvas = document.createElement('canvas');
mmapCanvas.width = MMAP_TEX;
mmapCanvas.height = MMAP_TEX;
const mmapCtx = mmapCanvas.getContext('2d');
const mmapImg = mmapCtx.createImageData(MMAP_TEX, MMAP_TEX);
const mmapData = mmapImg.data;
// Pre-render map to offscreen canvas
for (let py = 0; py < MMAP_TEX; py++) {
  for (let px = 0; px < MMAP_TEX; px++) {
    const ti0 = Math.floor(px / MMAP_SCALE);
    const tj0 = Math.floor(py / MMAP_SCALE);
    const ti1 = Math.min(Math.floor((px + 1) / MMAP_SCALE), MAP_SIZE - 1);
    const tj1 = Math.min(Math.floor((py + 1) / MMAP_SCALE), MAP_SIZE - 1);
    let maxH = 0;
    for (let ti = ti0; ti <= ti1; ti++)
      for (let tj = tj0; tj <= tj1; tj++)
        if (map[ti][tj] > maxH) maxH = map[ti][tj];
    const idx = (py * MMAP_TEX + px) * 4;
    if (maxH <= 0) {
      mmapData[idx] = 15; mmapData[idx+1] = 25; mmapData[idx+2] = 20; mmapData[idx+3] = 255;
    } else if (maxH <= 1.1) {
      mmapData[idx] = 50; mmapData[idx+1] = 140; mmapData[idx+2] = 90; mmapData[idx+3] = 255;
    } else if (maxH <= 3) {
      mmapData[idx] = 90; mmapData[idx+1] = 90; mmapData[idx+2] = 140; mmapData[idx+3] = 255;
    } else if (maxH <= 6) {
      mmapData[idx] = 150; mmapData[idx+1] = 120; mmapData[idx+2] = 90; mmapData[idx+3] = 255;
    } else {
      mmapData[idx] = 170; mmapData[idx+1] = 100; mmapData[idx+2] = 100; mmapData[idx+3] = 255;
    }
  }
}
mmapCtx.putImageData(mmapImg, 0, 0);
const mmapDataOriginal = new Uint8ClampedArray(mmapData);

// ---- PLAYER ----
const player = {
  x: 0, y: 0, z: 1,
  vx: 0, vy: 0, vz: 0,
  angle: 0, onGround: true, turnRate: 0,
  safeX: 0, safeY: 0, safeZ: 1, safeAngle: 0,
};
// Pick a random valid spawn tile
(function() {
  let ti, tj, h;
  do {
    ti = Math.floor(Math.random() * MAP_SIZE);
    tj = Math.floor(Math.random() * MAP_SIZE);
    h = map[ti][tj];
  } while (h <= 0 || h > 1.5); // road-height tiles only
  player.x = (ti + 0.5) * TILE_SIZE;
  player.y = (tj + 0.5) * TILE_SIZE;
  player.z = h;
  player.angle = Math.random() * Math.PI * 2;
  player.safeX = player.x;
  player.safeY = player.y;
  player.safeZ = h;
  player.safeAngle = player.angle;
})();

// ---- INPUT ----
const keys = {};
const keysJustPressed = {};
window.addEventListener('keydown', e => { if (!keys[e.code]) keysJustPressed[e.code] = true; keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; e.preventDefault(); });

// ---- ENEMIES ----
const enemies = [];
const enemyTiles = new Set(); // "ti,tj" keys for O(1) occupied check
const ENEMY_SPAWN_INTERVAL = 0.02;
let enemySpawnTimer = 0; // 0 = spawn immediately on first frame

// ---- LASERS ----
const lasers = [];
const LASER_FORWARD_SPEED = 1500;
const LASER_SHOT_DELAY = 0.1;
let laserShotTimer = 0;
let laserHeat = 0;        // 0 to 1
const HEAT_PER_SHOT = 0.012;
const HEAT_COOL_RATE = 0.0075; // per second
let laserOverheated = false;

// ---- TILE DECAY ----
let tileDecayTimer = 0;
let tilesDestroyed = 0;
let tileSpikeTimer = 0;
let tilesSpawned = 0;
const mmapPings = []; // {ti, tj, time, color}

let mmapDirty = false;
function updateMinimapTile(ti, tj) {
  const px0 = Math.floor(ti * MMAP_SCALE);
  const py0 = Math.floor(tj * MMAP_SCALE);
  const px1 = Math.min(Math.floor((ti + 1) * MMAP_SCALE), MMAP_TEX - 1);
  const py1 = Math.min(Math.floor((tj + 1) * MMAP_SCALE), MMAP_TEX - 1);
  for (let py = py0; py <= py1; py++) {
    for (let px = px0; px <= px1; px++) {
      const ti0 = Math.floor(px / MMAP_SCALE);
      const tj0 = Math.floor(py / MMAP_SCALE);
      const ti1b = Math.min(Math.floor((px + 1) / MMAP_SCALE), MAP_SIZE - 1);
      const tj1b = Math.min(Math.floor((py + 1) / MMAP_SCALE), MAP_SIZE - 1);
      let maxH = 0, hasSpike = false;
      for (let i = ti0; i <= ti1b; i++)
        for (let j = tj0; j <= tj1b; j++) {
          if (map[i][j] > maxH) maxH = map[i][j];
          if (mapColor[i][j] === 4 && map[i][j] > 0) hasSpike = true;
        }
      const idx = (py * MMAP_TEX + px) * 4;
      if (maxH <= 0) {
        mmapData[idx] = 15; mmapData[idx+1] = 25; mmapData[idx+2] = 20;
      } else if (hasSpike) {
        mmapData[idx] = 180; mmapData[idx+1] = 50; mmapData[idx+2] = 40;
      } else if (maxH <= 1.1) {
        mmapData[idx] = 50; mmapData[idx+1] = 140; mmapData[idx+2] = 90;
      } else if (maxH <= 3) {
        mmapData[idx] = 90; mmapData[idx+1] = 90; mmapData[idx+2] = 140;
      } else if (maxH <= 6) {
        mmapData[idx] = 150; mmapData[idx+1] = 120; mmapData[idx+2] = 90;
      } else {
        mmapData[idx] = 170; mmapData[idx+1] = 100; mmapData[idx+2] = 100;
      }
    }
  }
  mmapDirty = true;
}
function flushMinimap() {
  if (mmapDirty) {
    mmapCtx.putImageData(mmapImg, 0, 0);
    mmapDirty = false;
  }
}

function killEnemyOnTile(ti, tj) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].ti === ti && enemies[i].tj === tj) {
      enemyTiles.delete(ti + ',' + tj);
      enemies.splice(i, 1);
    }
  }
}

function destroyRandomTile() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const ti = Math.floor(Math.random() * MAP_SIZE);
    const tj = Math.floor(Math.random() * MAP_SIZE);
    if (map[ti][tj] <= 0) continue;
    map[ti][tj] = 0;
    tilesDestroyed++;
    killEnemyOnTile(ti, tj);
    updateMinimapTile(ti, tj);
    if (showDebug) mmapPings.push({ ti, tj, time: performance.now(), color: '100,180,255' });
    return;
  }
}

function spikeRandomTile() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const ti = Math.floor(Math.random() * MAP_SIZE);
    const tj = Math.floor(Math.random() * MAP_SIZE);
    if (map[ti][tj] <= 0) continue;
    map[ti][tj] = 10 + Math.random() * 5;
    mapColor[ti][tj] = 4;
    tilesSpawned++;
    killEnemyOnTile(ti, tj);
    updateMinimapTile(ti, tj);
    if (showDebug) mmapPings.push({ ti, tj, time: performance.now(), color: '255,80,80' });
    return;
  }
}

// ---- GAME STATE ----
let gameOver = false;
let gameOverTime = 0;
let restartConfirmTimer = 0; // seconds remaining on "press R again" prompt
let showDebug = false;
let paused = false;
const MAX_HEALTH = 50;
let playerHealth = MAX_HEALTH;
let hurtFlash = 0;
let healFlash = 0;
let hpBarShake = 0;
let heatBarShake = 0;
let shakeX = 0, shakeY = 0, shakeIntensity = 0;

// ---- MISSIONS ----
const ITEM_NAMES = [
  'Plasma Core', 'Cryo Cell', 'Data Cube', 'Med Kit', 'Fuel Rod',
  'Nav Chip', 'Ion Battery', 'Shield Gen', 'Warp Coil', 'Ore Sample',
  'Grav Lens', 'Photon Pack', 'Flux Cap', 'Bio Gel', 'Relay Node',
  'Nano Paste', 'Sonic Amp', 'Thorium Bar', 'EMP Charge', 'Star Map',
];
const missions = []; // {state:'pickup'|'deliver', pickupX, pickupY, dropoffX, dropoffY, name, weight, dist, timer, timerMax}
const cargo = []; // items picked up: {name, weight, dropoffX, dropoffY, dist, timer, timerMax}
const MAX_MISSIONS = 50;
let score = 0;
let scoreDrainAcc = 0;
const scorePopups = []; // {amount, age, duration}
const worldParticles = []; // {x, y, z, vx, vy, vz, age, life, r, g, b}

function findValidFloorTile() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const ti = Math.floor(Math.random() * MAP_SIZE);
    const tj = Math.floor(Math.random() * MAP_SIZE);
    const h = map[ti][tj];
    if (h > 0 && h <= 1.5) return { x: (ti + 0.5) * TILE_SIZE, y: (tj + 0.5) * TILE_SIZE };
  }
  return null;
}

function findSpreadTile() {
  // Try many candidates, pick the one furthest from all existing mission pickups + cargo dropoffs
  let best = null;
  let bestMinDist = -1;
  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = findValidFloorTile();
    if (!candidate) continue;
    let minDist = Infinity;
    for (const m of missions) {
      const dx = candidate.x - m.pickupX;
      const dy = candidate.y - m.pickupY;
      minDist = Math.min(minDist, dx * dx + dy * dy);
    }
    for (const c of cargo) {
      const dx = candidate.x - c.dropoffX;
      const dy = candidate.y - c.dropoffY;
      minDist = Math.min(minDist, dx * dx + dy * dy);
    }
    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      best = candidate;
    }
  }
  return best;
}

function spawnMission() {
  const pickup = findSpreadTile();
  if (!pickup) return;
  const dropoff = findValidFloorTile();
  if (!dropoff) return;
  const dx = dropoff.x - pickup.x;
  const dy = dropoff.y - pickup.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const weight = 1 + Math.floor(Math.random() * 10);
  const timerMax = 150 + dist / 16; // more time for further deliveries
  missions.push({
    state: 'pickup',
    pickupX: pickup.x, pickupY: pickup.y,
    dropoffX: dropoff.x, dropoffY: dropoff.y,
    name: ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)],
    weight,
    dist: Math.round(dist),
    timer: timerMax,
    timerMax,
  });
}

function totalCargoWeight() {
  let w = 0;
  for (const c of cargo) w += c.weight;
  return w;
}

// Initial mission spawning — first one near the player
(function() {
  const minR = 200, maxR = 600;
  let pickup = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const r = minR + Math.random() * (maxR - minR);
    const ti = Math.floor((player.x + Math.cos(angle) * r) / TILE_SIZE);
    const tj = Math.floor((player.y + Math.sin(angle) * r) / TILE_SIZE);
    if (ti < 0 || ti >= MAP_SIZE || tj < 0 || tj >= MAP_SIZE) continue;
    const h = map[ti][tj];
    if (h > 0 && h <= 1.5) { pickup = { x: (ti + 0.5) * TILE_SIZE, y: (tj + 0.5) * TILE_SIZE }; break; }
  }
  if (pickup) {
    const dropoff = findValidFloorTile();
    if (dropoff) {
      const dx = dropoff.x - pickup.x;
      const dy = dropoff.y - pickup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const weight = 1 + Math.floor(Math.random() * 10);
      const timerMax = 150 + dist / 16;
      missions.push({
        state: 'pickup',
        pickupX: pickup.x, pickupY: pickup.y,
        dropoffX: dropoff.x, dropoffY: dropoff.y,
        name: ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)],
        weight, dist: Math.round(dist), timer: timerMax, timerMax,
      });
    }
  }
})();
for (let i = missions.length; i < MAX_MISSIONS; i++) spawnMission();

function addShake(amount) {
  shakeIntensity = Math.min(shakeIntensity + amount, 15);
}

function damagePlayer(amount, noShake) {
  playerHealth = Math.max(0, playerHealth - amount);
  hurtFlash = Math.min(1, amount / 10);
  hpBarShake = 1;
  if (!noShake) addShake(amount);
  if (playerHealth <= 0) {
    gameOver = true;
    gameOverTime = performance.now();
  }
}

function healPlayer(amount) {
  playerHealth = Math.min(MAX_HEALTH, playerHealth + amount);
  healFlash = 1;
}

function getTileHeight(wx, wy) {
  const ti = Math.floor(wx / TILE_SIZE);
  const tj = Math.floor(wy / TILE_SIZE);
  if (ti < 0 || ti >= MAP_SIZE || tj < 0 || tj >= MAP_SIZE) return 0;
  return map[ti][tj];
}

// Base tile colors [r, g, b] for checker=true / checker=false
const TILE_COLORS = [
  // h <= 1.1 (road/floor) — slightly deeper green contrast
  [[50, 175, 115], [35, 148, 85]],
  // h <= 3 (low walls) — cooler blue-purple
  [[110, 110, 175], [92, 95, 145]],
  // h <= 6 (mid walls) — warmer sandstone
  [[175, 148, 105], [148, 125, 88]],
  // h > 6 (tall walls) — reddish rock
  [[185, 110, 105], [160, 92, 88]],
];
const SIDE_COLORS = [
  [[30, 145, 65], [25, 132, 72]],
  [[58, 58, 95], [72, 50, 105]],
  [[108, 95, 58], [92, 78, 45]],
  [[125, 58, 58], [108, 45, 45]],
];

function getTileColorIdx(h) {
  if (h <= 1.1) return 0;
  if (h <= 3) return 1;
  if (h <= 6) return 2;
  return 3;
}

// Directional light shading: compare tile height to neighbors (light from NW)
function getTileShading(h, ti, tj) {
  const hW = (ti > 0) ? map[ti-1][tj] : h;
  const hN = (tj > 0) ? map[ti][tj-1] : h;
  const hE = (ti < MAP_SIZE-1) ? map[ti+1][tj] : h;
  const hS = (tj < MAP_SIZE-1) ? map[ti][tj+1] : h;
  // Gradient: positive = tile is a ridge/peak facing light, negative = in shadow
  const dx = (hW - hE) * 0.5;
  const dy = (hN - hS) * 0.5;
  // Light direction: from northwest (negative x, negative y)
  return (dx + dy) * 12;
}

function getTileColor(h, checker, ti, tj, dist2) {
  if (h <= 0) return null;
  const idx = mapColor[ti][tj];
  const shade = getTileShading(h, ti, tj);
  if (idx === 4) {
    // Spike red
    const base = checker ? [190, 60, 50] : [170, 45, 40];
    const hash = ((ti * 73856093) ^ (tj * 19349663)) & 0xFFFF;
    const vary = (hash / 0xFFFF - 0.5) * 16;
    let r = base[0] + vary + shade, g = base[1] + vary * 0.4 + shade * 0.5, b = base[2] + vary * 0.3 + shade * 0.3;
    if (dist2 !== undefined) {
      const fog = Math.pow(Math.min(dist2 / (DRAW_DIST * DRAW_DIST), 1), 2);
      r = r + (20 - r) * fog * 0.6; g = g + (30 - g) * fog * 0.6; b = b + (35 - b) * fog * 0.6;
    }
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
  const base = TILE_COLORS[idx][checker ? 0 : 1];
  // Subtle per-tile variation using tile coords as hash
  const hash = ((ti * 73856093) ^ (tj * 19349663)) & 0xFFFF;
  const vary = (hash / 0xFFFF - 0.5) * 16;
  let r = base[0] + vary + shade;
  let g = base[1] + vary * 0.7 + shade * 0.8;
  let b = base[2] + vary * 0.5 + shade * 0.6;
  // Distance fog: blend toward fog color
  if (dist2 !== undefined) {
    const maxDist2 = DRAW_DIST * DRAW_DIST;
    const fogT = Math.min(dist2 / maxDist2, 1);
    const fog = fogT * fogT; // quadratic falloff
    r = r + (20 - r) * fog * 0.6;
    g = g + (30 - g) * fog * 0.6;
    b = b + (35 - b) * fog * 0.6;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
// dirLight: directional lighting boost for side faces
// W(-x)=+15, S(-y)=+8, N(+y)=-5, E(+x)=-12  (light from NW)
function getSideColor(h, checker, ti, tj, dist2, dirLight) {
  dirLight = dirLight || 0;
  const idx = mapColor[ti][tj];
  if (idx === 4) {
    const base = checker ? [140, 35, 30] : [120, 25, 25];
    const hash = ((ti * 73856093) ^ (tj * 19349663)) & 0xFFFF;
    const vary = (hash / 0xFFFF - 0.5) * 12;
    let r = base[0] + vary + dirLight, g = base[1] + vary * 0.4 + dirLight * 0.5, b = base[2] + vary * 0.3 + dirLight * 0.3;
    if (dist2 !== undefined) {
      const fog = Math.pow(Math.min(dist2 / (DRAW_DIST * DRAW_DIST), 1), 2);
      r = r + (15 - r) * fog * 0.6; g = g + (22 - g) * fog * 0.6; b = b + (28 - b) * fog * 0.6;
    }
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
  const base = SIDE_COLORS[idx][checker ? 0 : 1];
  const hash = ((ti * 73856093) ^ (tj * 19349663)) & 0xFFFF;
  const vary = (hash / 0xFFFF - 0.5) * 12;
  let r = base[0] + vary + dirLight;
  let g = base[1] + vary * 0.7 + dirLight * 0.8;
  let b = base[2] + vary * 0.5 + dirLight * 0.6;
  if (dist2 !== undefined) {
    const maxDist2 = DRAW_DIST * DRAW_DIST;
    const fogT = Math.min(dist2 / maxDist2, 1);
    const fog = fogT * fogT;
    r = r + (15 - r) * fog * 0.6;
    g = g + (22 - g) * fog * 0.6;
    b = b + (28 - b) * fog * 0.6;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ---- PHYSICS ----
const ACCEL = 120;
const BRAKE = 400;
const FRICTION = 0.998;
const MAX_SPEED = 4000;
const TURN_SPEED = 2.5;
const TURN_ACCEL = 6;
const GRAVITY = -0.7;
const JUMP_FORCE = 0.35;
const JUMP_SUSTAIN = 0.4;
const AIR_STEER = 1.0;
const GRIP_ANGLE = Math.PI / 3;    // 60° base grip window at standstill
const DRIFT_MIN_SPEED = 200;        // minimum speed before drifting/narrowing kicks in
const GRIP_TIGHTENING = 0.005;      // how much speed narrows grip window
const GRIP_STRENGTH = 4;            // how fast velocity rotates toward facing (rad/s)
const MAX_STEP = 0.6;

const CAM_DIST = 60;
const CAM_HEIGHT = 25;
let FOV = Math.round(BASE_FOV * resScale);
let HORIZON = H * 0.35;
const NEAR_CLIP = 5;
const BASE_DRAW_DIST = 280;
let DRAW_DIST = 40;
let perfCycle = 0; // cycles 0,1,2: 0=drawdist, 1=res, 2=drawdist
let lastFaceCount = 0;

// Sky gradient (recreated on resolution change)
// Pre-generated star field (normalized 0-1 positions + brightness)
const stars = [];
(function() {
  let seed = 12345;
  function rng() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }
  for (let i = 0; i < 80; i++) {
    stars.push({ u: rng(), v: rng() * 0.7, b: 0.3 + rng() * 0.7, twinkleRate: 1 + rng() * 4 });
  }
})();

// Pre-generated cloud definitions: [baseAngle, y-band, speed, blobCount, width-mult, height-mult]
const cloudDefs = [];
(function() {
  let cs = 54321;
  function crng() { cs = (cs * 16807 + 0) % 2147483647; return cs / 2147483647; }
  for (let ci = 0; ci < 32; ci++) {
    cloudDefs.push([
      crng() * Math.PI * 2,
      0.50 + crng() * 0.28,
      0.002 + crng() * 0.013,
      3 + Math.floor(crng() * 6),
      0.5 + crng() * 1.4,
      0.5 + crng() * 0.9,
    ]);
  }
})();

function makeSkyGrad() {
  const g = offCtx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#080818');
  g.addColorStop(0.3, '#111133');
  g.addColorStop(0.7, '#1a2244');
  g.addColorStop(0.9, '#2a3355');
  g.addColorStop(1, '#445577');
  return g;
}
function makeVoidGrad() {
  const g = offCtx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, '#1a2a2a');
  g.addColorStop(0.3, '#0f1a1a');
  g.addColorStop(1, '#050808');
  return g;
}
function makeHorizonGlow() {
  const glowH = Math.max(2, Math.round(HORIZON * 0.15));
  const g = offCtx.createLinearGradient(0, HORIZON - glowH, 0, HORIZON + glowH * 0.5);
  g.addColorStop(0, 'rgba(80, 100, 130, 0)');
  g.addColorStop(0.5, 'rgba(80, 110, 140, 0.25)');
  g.addColorStop(1, 'rgba(40, 60, 70, 0)');
  return g;
}
let skyGrad = makeSkyGrad();
let voidGrad = makeVoidGrad();
let horizonGlowGrad = makeHorizonGlow();

function applyResScale(s) {
  resScale = Math.max(0.03, Math.min(1.0, s));
  W = Math.round(BASE_W * resScale);
  H = Math.round(BASE_H * resScale);
  FOV = Math.round(BASE_FOV * resScale);
  HORIZON = H * 0.35;
  offCanvas.width = W;
  offCanvas.height = H;
  skyGrad = makeSkyGrad();
  voidGrad = makeVoidGrad();
  horizonGlowGrad = makeHorizonGlow();
}

const pageStartTime = performance.now();
let lastResetTime = performance.now();
let lastTime = performance.now();
let fps = 0, frameCount = 0, fpsTime = 0;

let shipTilt = 0; // visual roll for turning, -1 to 1

function doRestart() {
  gameOver = false;
  paused = false;
  restartConfirmTimer = 0;
  playerHealth = MAX_HEALTH;
  // Restore terrain and minimap
  for (let i = 0; i < MAP_SIZE; i++) {
    map[i].set(mapOriginal[i]);
    mapColor[i].set(mapColorOriginal[i]);
  }
  mmapData.set(mmapDataOriginal);
  mmapCtx.putImageData(mmapImg, 0, 0);
  tilesDestroyed = 0;
  tilesSpawned = 0;
  enemies.length = 0;
  enemyTiles.clear();
  lasers.length = 0;
  laserShotTimer = 0;
  laserHeat = 0;
  laserOverheated = false;
  enemySpawnTimer = 0;
  score = 0;
  scoreDrainAcc = 0;
  scorePopups.length = 0;
  worldParticles.length = 0;
  cargo.length = 0;
  missions.length = 0;
  for (let mi = 0; mi < MAX_MISSIONS; mi++) spawnMission();
  applyResScale(0.03);
  DRAW_DIST = 40;
  gameTime = 0;
  lastResetTime = performance.now();
  respawn();
}

function update(dt) {
  // Restart confirm (works in both gameplay and game-over)
  if (keysJustPressed['KeyR']) {
    if (restartConfirmTimer > 0) {
      doRestart();
    } else {
      restartConfirmTimer = 5;
    }
  }
  if (restartConfirmTimer > 0) restartConfirmTimer -= dt;
  if (keysJustPressed['KeyQ']) showDebug = !showDebug;
  if (keysJustPressed['KeyP'] && !gameOver) paused = !paused;
  // Clear per-frame edge-triggered keys
  for (const k in keysJustPressed) delete keysJustPressed[k];

  if (paused || gameOver) return;
  const TAU = Math.PI * 2;

  // Steering
  let turnInput = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) turnInput -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) turnInput += 1;

  if (player.onGround) {
    if (turnInput !== 0) {
      player.turnRate += turnInput * TURN_ACCEL * dt;
      player.turnRate = Math.max(-TURN_SPEED, Math.min(TURN_SPEED, player.turnRate));
    } else {
      player.turnRate *= 0.85;
      if (Math.abs(player.turnRate) < 0.01) player.turnRate = 0;
    }
    player.angle += player.turnRate * dt;
  } else {
    // Air strafe: apply force perpendicular to facing direction
    if (turnInput !== 0) {
      const strafeAngle = player.angle + Math.PI * 0.5;
      player.vx += Math.cos(strafeAngle) * ACCEL * turnInput * dt;
      player.vy += Math.sin(strafeAngle) * ACCEL * turnInput * dt;
    }
    player.turnRate *= 0.85;
    if (Math.abs(player.turnRate) < 0.01) player.turnRate = 0;
  }
  // Smooth visual tilt toward turn direction
  const tiltTarget = turnInput * 0.12;
  shipTilt += (tiltTarget - shipTilt) * Math.min(8 * dt, 1);
  player.angle = ((player.angle % TAU) + TAU) % TAU;

  // Current movement info
  const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);

  // Grip: convert velocity toward facing direction (or reverse when going backward)
  if (speed > 1) {
    const moveAngle = Math.atan2(player.vy, player.vx);
    const faceDot = player.vx * Math.cos(player.angle) + player.vy * Math.sin(player.angle);
    const reversing = faceDot < 0;
    // When reversing, grip toward the reverse of facing
    const targetAngle = reversing ? player.angle + Math.PI : player.angle;
    let aDiff = targetAngle - moveAngle;
    while (aDiff > Math.PI) aDiff -= TAU;
    while (aDiff < -Math.PI) aDiff += TAU;

    if (player.onGround) {
      const driftSpeed = Math.max(speed - DRIFT_MIN_SPEED, 0);
      const gripWindow = GRIP_ANGLE / (1 + driftSpeed * GRIP_TIGHTENING);
      if (Math.abs(aDiff) < gripWindow || speed < DRIFT_MIN_SPEED) {
        const convert = Math.min(GRIP_STRENGTH * dt, 1);
        const newMoveAngle = moveAngle + aDiff * convert;
        player.vx = Math.cos(newMoveAngle) * speed;
        player.vy = Math.sin(newMoveAngle) * speed;
      } else {
        // Skidding — add weak force in facing direction (% of current speed)
        const driftForce = speed * 0.30;
        player.vx += Math.cos(player.angle) * driftForce * dt;
        player.vy += Math.sin(player.angle) * driftForce * dt;
        if (frameCount % 2 === 0) addShake(0.3);
        // Drop drift marks
        lastMarkDist += speed * dt;
        if (lastMarkDist >= MARK_INTERVAL) {
          lastMarkDist = 0;
          const groundH = getTileHeight(player.x, player.y);
          if (groundH > 0) {
            driftMarks.push({ x: player.x, y: player.y, h: groundH, angle: moveAngle });
            if (driftMarks.length > MAX_DRIFT_MARKS) driftMarks.shift();
          }
        }
      }
    } else {
      // Air: always convert, but weak
      const convert = Math.min(GRIP_STRENGTH * 0.15 * dt, 1);
      const newMoveAngle = moveAngle + aDiff * convert;
      player.vx = Math.cos(newMoveAngle) * speed;
      player.vy = Math.sin(newMoveAngle) * speed;
    }
  }

  // Weight factor: each unit of weight slows things down
  const cargoW = totalCargoWeight();
  const weightFactor = 1 / (1 + cargoW * 0.004);

  // Acceleration (thrust in facing direction)
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.vx += Math.cos(player.angle) * ACCEL * weightFactor * dt;
    player.vy += Math.sin(player.angle) * ACCEL * weightFactor * dt;
  }

  // Braking / Reverse (thrust backward along facing direction, mirrors acceleration)
  if (keys['ArrowDown'] || keys['KeyS']) {
    const faceDot = player.vx * Math.cos(player.angle) + player.vy * Math.sin(player.angle);
    if (faceDot > 10) {
      // Moving forward — brake by pushing backward along facing
      player.vx -= Math.cos(player.angle) * ACCEL * 3 * weightFactor * dt;
      player.vy -= Math.sin(player.angle) * ACCEL * 3 * weightFactor * dt;
    } else {
      // Stopped or moving backward — weak reverse thrust
      player.vx -= Math.cos(player.angle) * ACCEL * 0.25 * weightFactor * dt;
      player.vy -= Math.sin(player.angle) * ACCEL * 0.25 * weightFactor * dt;
    }
  }

  // Friction (frame-rate independent)
  const f = Math.pow(FRICTION, dt * 60);
  player.vx *= f;
  player.vy *= f;

  // Clamp max speed (half when going backwards)
  const newSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  const faceDotClamp = player.vx * Math.cos(player.angle) + player.vy * Math.sin(player.angle);
  const speedLimit = faceDotClamp < 0 ? MAX_SPEED * 0.5 : MAX_SPEED;
  if (newSpeed > speedLimit) {
    player.vx = (player.vx / newSpeed) * speedLimit;
    player.vy = (player.vy / newSpeed) * speedLimit;
  }

  // Fade HUD indicators (separate thresholds)
  const showDrift = player.onGround && newSpeed > DRIFT_MIN_SPEED;
  if (showDrift) hudIndicatorAlpha = Math.min(hudIndicatorAlpha + dt * 5, 1);
  else hudIndicatorAlpha = Math.max(hudIndicatorAlpha - dt * 5, 0);

  const showArrows = player.onGround && newSpeed > INDICATOR_MIN_SPEED;
  if (showArrows) {
    hudGoingAlpha = Math.min(hudGoingAlpha + dt * 5, 1);
    hudFacingAlpha = Math.min(hudFacingAlpha + dt * 5, 1);
  } else {
    hudGoingAlpha = Math.max(hudGoingAlpha - dt * 5, 0);
    hudFacingAlpha = Math.max(hudFacingAlpha - dt * 5, 0);
  }

  // Movement with wall collision
  const oldX = player.x;
  const oldY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const newH = getTileHeight(player.x, player.y);
  if (newH > 0 && newH > player.z + MAX_STEP) {
    const hX = getTileHeight(player.x, oldY);
    const hY = getTileHeight(oldX, player.y);
    const blockX = hX > 0 && hX > player.z + MAX_STEP;
    const blockY = hY > 0 && hY > player.z + MAX_STEP;

    // Reflect and scale by impact angle: glancing = keep ~100%, direct = keep 5%
    const preSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    let impact;
    if (blockX && blockY) {
      impact = 1;
      player.vx = -player.vx; player.vy = -player.vy;
      player.x = oldX; player.y = oldY;
    } else if (blockX) {
      impact = preSpeed > 0 ? Math.abs(player.vx) / preSpeed : 1;
      player.vx = -player.vx;
      player.x = oldX;
    } else if (blockY) {
      impact = preSpeed > 0 ? Math.abs(player.vy) / preSpeed : 1;
      player.vy = -player.vy;
      player.y = oldY;
    } else {
      impact = 1;
      player.vx = -player.vx; player.vy = -player.vy;
      player.x = oldX; player.y = oldY;
    }
    const retention = 1.0 - impact * 0.75; // 1.0 at glancing, 0.25 at direct
    player.vx *= retention;
    player.vy *= retention;

    // Hard crash = take damage (high speed + direct impact)
    if (preSpeed > 400 && impact > 0.6) {
      damagePlayer(10);
    }

  }

  // Jump
  if (keys['Space'] && player.onGround) {
    player.vz = JUMP_FORCE;
    player.onGround = false;
  }
  if (keys['Space'] && !player.onGround && player.vz > 0) {
    player.vz += JUMP_SUSTAIN * dt;
  }

  if (!player.onGround) player.vz += GRAVITY * dt;
  player.z += player.vz;

  const groundH = getTileHeight(player.x, player.y);
  if (groundH > 0 && (player.z <= groundH || (player.onGround && player.z - groundH <= MAX_STEP))) {
    // Landing shake based on fall speed
    if (!player.onGround && player.vz < -0.1) {
      addShake(Math.min(8, Math.abs(player.vz) * 8));
    }
    player.z = groundH;
    player.vz = 0;
    player.onGround = true;
    // Track last safe position for respawn (snap to tile center)
    player.safeX = (Math.floor(player.x / TILE_SIZE) + 0.5) * TILE_SIZE;
    player.safeY = (Math.floor(player.y / TILE_SIZE) + 0.5) * TILE_SIZE;
    player.safeZ = groundH;
    player.safeAngle = player.angle;
  } else {
    player.onGround = false;
    if (player.z <= -20) {
      damagePlayer(10);
      if (!gameOver) respawn();
    }
  }

  // Tile decay
  tileDecayTimer += dt;
  while (tileDecayTimer >= 5) {
    tileDecayTimer -= 5;
    destroyRandomTile();
  }
  tileSpikeTimer += dt;
  while (tileSpikeTimer >= 5) {
    tileSpikeTimer -= 5;
    spikeRandomTile();
  }

  // Score decay
  scoreDrainAcc += dt;
  while (scoreDrainAcc >= 1) {
    scoreDrainAcc -= 1;
    if (score > 0) score--;
  }

  // Score popups
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].age += dt;
    if (scorePopups[i].age >= scorePopups[i].duration) scorePopups.splice(i, 1);
  }

  // World particles
  for (let i = worldParticles.length - 1; i >= 0; i--) {
    const p = worldParticles[i];
    p.age += dt;
    if (p.age >= p.life) { worldParticles.splice(i, 1); continue; }
    if (p.age < 0) continue; // delayed
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= 10 * dt; // gravity
  }

  // Mission timers (only for carried cargo)
  for (let i = cargo.length - 1; i >= 0; i--) {
    cargo[i].timer -= dt;
    if (cargo[i].timer <= 0) {
      score = Math.max(0, score - cargo[i].dist);
      cargo.splice(i, 1); // failed delivery
    }
  }

  // Pickup collision
  for (let i = missions.length - 1; i >= 0; i--) {
    const m = missions[i];
    if (m.state !== 'pickup') continue;
    const dx = player.x - m.pickupX;
    const dy = player.y - m.pickupY;
    if (dx * dx + dy * dy < 1600) { // ~40 unit radius
      cargo.push({
        name: m.name, weight: m.weight,
        dropoffX: m.dropoffX, dropoffY: m.dropoffY,
        dist: m.dist, timer: m.timer, timerMax: m.timerMax,
      });
      // Celebration burst
      const pz = map[Math.floor(m.pickupX / TILE_SIZE)]?.[Math.floor(m.pickupY / TILE_SIZE)] || player.z;
      for (let p = 0; p < 20; p++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 5 + Math.random() * 10;
        const up = 3 + Math.random() * 5;
        worldParticles.push({
          x: m.pickupX, y: m.pickupY, z: pz + 0.3,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: up,
          age: 0, life: 0.5 + Math.random() * 0.5,
          r: 200 + Math.random() * 55 | 0,
          g: 50 + Math.random() * 200 | 0,
          b: 255,
        });
      }
      missions.splice(i, 1);
    }
  }

  // Dropoff collision
  for (let i = cargo.length - 1; i >= 0; i--) {
    const c = cargo[i];
    const dx = player.x - c.dropoffX;
    const dy = player.y - c.dropoffY;
    if (dx * dx + dy * dy < 400) {
      const points = Math.max(0, Math.round(c.dist * c.timer * c.weight / 1000));
      if (points > 0) scorePopups.push({amount: points, age: 0, duration: 0.8, xOff: (Math.random() - 0.5) * 80});
      score += points;
      healPlayer(5);
      // Delivery celebration - rings of particles that fountain up in waves
      const dz = map[Math.floor(c.dropoffX / TILE_SIZE)]?.[Math.floor(c.dropoffY / TILE_SIZE)] || player.z;
      for (let ring = 0; ring < 3; ring++) {
        const count = 12 + ring * 6;
        for (let p = 0; p < count; p++) {
          const a = (p / count) * Math.PI * 2 + ring * 0.3;
          const spd = 4 + ring * 5;
          const up = 5 + ring * 3 + Math.random() * 2;
          const delay = ring * 0.1;
          worldParticles.push({
            x: c.dropoffX, y: c.dropoffY, z: dz + 0.3,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, vz: up,
            age: -delay, life: 0.8 + ring * 0.2,
            r: 255, g: 200 + Math.random() * 55 | 0, b: 50 + Math.random() * 50 | 0,
          });
        }
      }
      cargo.splice(i, 1);
    }
  }

  // Replenish missions to MAX_MISSIONS
  while (missions.length + cargo.length < MAX_MISSIONS) {
    spawnMission();
  }


  // Cull enemies far from player
  const cullDist2 = ((DRAW_DIST + 80) * TILE_SIZE) ** 2;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const dx = enemies[i].x - player.x;
    const dy = enemies[i].y - player.y;
    if (dx * dx + dy * dy > cullDist2) {
      enemyTiles.delete(enemies[i].ti + ',' + enemies[i].tj);
      enemies.splice(i, 1);
    }
  }

  // Enemy spawning
  enemySpawnTimer -= dt;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = ENEMY_SPAWN_INTERVAL;
  }

  // Laser overheat + firing
  laserShotTimer = Math.max(0, laserShotTimer - dt);
  const speedCool = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / MAX_SPEED;
  const coolRate = HEAT_COOL_RATE + HEAT_COOL_RATE * speedCool * 4;
  if (laserOverheated) {
    laserHeat = Math.max(0, laserHeat - coolRate * 6 * dt);
    if (laserHeat <= 0) laserOverheated = false;
  } else {
    laserHeat = Math.max(0, laserHeat - coolRate * dt);
    if ((keys['ShiftLeft'] || keys['ShiftRight']) && laserShotTimer <= 0) {
      lasers.push({
        x: player.x + Math.cos(player.angle) * 15,
        y: player.y + Math.sin(player.angle) * 15,
        z: player.z,
        vx: player.vx + Math.cos(player.angle) * LASER_FORWARD_SPEED,
        vy: player.vy + Math.sin(player.angle) * LASER_FORWARD_SPEED,
      });
      laserShotTimer = LASER_SHOT_DELAY;
      addShake(1.5);
      laserHeat = Math.min(1, laserHeat + HEAT_PER_SHOT);
      if (laserHeat >= 1) {
        laserOverheated = true;
        heatBarShake = 1;
        damagePlayer(1, true);
      }
    }
  }

  // Update lasers
  const HOMING_RADIUS = 200;
  const HOMING_RADIUS2 = HOMING_RADIUS * HOMING_RADIUS;
  const HOMING_TURN = 1; // radians/sec steering
  const LASER_LIFT_SPEED = 8; // how fast laser rises to avoid ground
  const LASER_HUG_HEIGHT = 0.3; // desired hover above ground
  const LASER_Z_SPEED = 4; // vertical homing/settle speed
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    const speed = Math.sqrt(l.vx * l.vx + l.vy * l.vy);
    const curAngle = Math.atan2(l.vy, l.vx);

    // Homing: steer toward nearest enemy within radius
    let nearDist2 = HOMING_RADIUS2;
    let nearEnemy = null;
    for (let j = 0; j < enemies.length; j++) {
      const dx = enemies[j].x - l.x;
      const dy = enemies[j].y - l.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearDist2) { nearDist2 = d2; nearEnemy = enemies[j]; }
    }
    if (nearEnemy) {
      const targetAngle = Math.atan2(nearEnemy.y - l.y, nearEnemy.x - l.x);
      let diff = targetAngle - curAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.sign(diff) * Math.min(Math.abs(diff), HOMING_TURN * dt);
      const newAngle = curAngle + steer;
      l.vx = Math.cos(newAngle) * speed;
      l.vy = Math.sin(newAngle) * speed;
    }

    // Vertical targeting: steer toward enemy z, or hug ground
    const groundH = getTileHeight(l.x, l.y);
    if (nearEnemy) {
      const targetZ = nearEnemy.z + 0.3;
      const zDiff = targetZ - l.z;
      l.z += Math.sign(zDiff) * Math.min(Math.abs(zDiff), LASER_Z_SPEED * dt);
    } else if (groundH > 0) {
      const hugTarget = groundH + LASER_HUG_HEIGHT;
      const zDiff = hugTarget - l.z;
      l.z += Math.sign(zDiff) * Math.min(Math.abs(zDiff), LASER_Z_SPEED * dt);
    }
    // Over void with no target: maintain current altitude

    // Wall avoidance: look ahead, decide whether to go up or steer sideways
    // Skip when homing on a nearby enemy — seeking takes priority
    const lookDist = speed * 0.05;
    const aheadX = l.x + Math.cos(curAngle) * lookDist;
    const aheadY = l.y + Math.sin(curAngle) * lookDist;
    const aheadH = getTileHeight(aheadX, aheadY);
    if (!nearEnemy && aheadH > l.z - 0.3) {
      // Check left and right to see if either side is clear
      const sideAngleL = curAngle - Math.PI * 0.5;
      const sideAngleR = curAngle + Math.PI * 0.5;
      const sideCheckDist = lookDist * 0.7;
      const leftH = getTileHeight(l.x + Math.cos(sideAngleL) * sideCheckDist, l.y + Math.sin(sideAngleL) * sideCheckDist);
      const rightH = getTileHeight(l.x + Math.cos(sideAngleR) * sideCheckDist, l.y + Math.sin(sideAngleR) * sideCheckDist);
      const clearLeft = leftH <= l.z + 0.3;
      const clearRight = rightH <= l.z + 0.3;
      const wallHeight = aheadH - l.z;

      if ((clearLeft || clearRight) && wallHeight > 2) {
        // Wall is tall — steer sideways instead of climbing
        const steerDir = clearLeft && clearRight
          ? (leftH <= rightH ? -1 : 1)
          : (clearLeft ? -1 : 1);
        const avoidAngle = curAngle + steerDir * HOMING_TURN * 2 * dt;
        l.vx = Math.cos(avoidAngle) * speed;
        l.vy = Math.sin(avoidAngle) * speed;
      } else {
        // Wall is short or no clear side — go over
        l.z += LASER_LIFT_SPEED * dt;
      }
    }

    l.x += l.vx * dt;
    l.y += l.vy * dt;
    let removed = false;

    // Wall collision (laser stays at its fired height)
    const lh = getTileHeight(l.x, l.y);
    if (lh > 0 && lh > l.z + MAX_STEP) { removed = true; }

    // Out of draw distance from player
    if (!removed) {
      const ldx = l.x - player.x;
      const ldy = l.y - player.y;
      if (ldx * ldx + ldy * ldy > (DRAW_DIST * TILE_SIZE * 1.5) ** 2) removed = true;
    }

    // Off map
    if (!removed) {
      if (l.x < 0 || l.x >= MAP_SIZE * TILE_SIZE || l.y < 0 || l.y >= MAP_SIZE * TILE_SIZE) removed = true;
    }

    // Enemy collision
    if (!removed) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dx = l.x - e.x;
        const dy = l.y - e.y;
        if (dx * dx + dy * dy < 156 && Math.abs(l.z - e.z) < 1) {
          enemyTiles.delete(e.ti + ',' + e.tj);
          enemies.splice(j, 1);
          score += 10;
          scorePopups.push({amount: 10, age: 0, duration: 0.8, xOff: (Math.random() - 0.5) * 80});
          removed = true;
          break;
        }
      }
    }

    if (removed) lasers.splice(i, 1);
  }

  // Player-enemy collision
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    if (dx * dx + dy * dy < 144 && Math.abs(player.z - e.z) < 1) {
      enemyTiles.delete(e.ti + ',' + e.tj);
      enemies.splice(i, 1);
      damagePlayer(10);
      if (gameOver) break;
    }
  }
}

function respawn() {
  player.x = player.safeX;
  player.y = player.safeY;
  player.z = player.safeZ;
  player.angle = player.safeAngle;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.onGround = true;
  player.turnRate = 0;
}

function spawnEnemy() {
  const playerTI = Math.floor(player.x / TILE_SIZE);
  const playerTJ = Math.floor(player.y / TILE_SIZE);
  // Try ahead of player first (60 attempts), then anywhere (40 attempts)
  for (let attempt = 0; attempt < 100; attempt++) {
    let angle;
    if (attempt < 60) {
      // Bias toward player's facing direction (+-45 degrees)
      angle = player.angle + (Math.random() - 0.5) * Math.PI * 0.5;
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    const dist = DRAW_DIST + 5 + Math.random() * 60;
    const ti = playerTI + Math.round(Math.cos(angle) * dist);
    const tj = playerTJ + Math.round(Math.sin(angle) * dist);
    if (ti < 0 || ti >= MAP_SIZE || tj < 0 || tj >= MAP_SIZE) continue;
    const h = map[ti][tj];
    if (h > 0) {
      const key = ti + ',' + tj;
      if (enemyTiles.has(key)) continue;
      if (enemies.length >= 700) {
        const old = enemies.shift();
        enemyTiles.delete(old.ti + ',' + old.tj);
      }
      enemyTiles.add(key);
      enemies.push({
        x: (ti + 0.5) * TILE_SIZE,
        y: (tj + 0.5) * TILE_SIZE,
        z: h, ti, tj,
        spawnTime: performance.now()
      });
      return;
    }
  }
}

// ---- RENDER ----
function projectPoint(wx, wy, wz, camX, camY, camZ, cosA, sinA) {
  const dx = wx - camX;
  const dy = wy - camY;
  const rawDepth = dx * cosA + dy * sinA;
  const depth = Math.max(rawDepth, 1);
  const lateral = -dx * sinA + dy * cosA;
  return {
    x: W / 2 + (lateral / depth) * FOV,
    y: HORIZON + ((camZ - wz * HS) / depth) * FOV,
    depth,
    rawDepth
  };
}

function drawFace(rc, pts, color) {
  rc.fillStyle = color;
  rc.beginPath();
  // Expand quad slightly to prevent subpixel seams between tiles
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) * 0.25;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) * 0.25;
  rc.moveTo(pts[0].x + Math.sign(pts[0].x - cx) * 0.4, pts[0].y + Math.sign(pts[0].y - cy) * 0.4);
  rc.lineTo(pts[1].x + Math.sign(pts[1].x - cx) * 0.4, pts[1].y + Math.sign(pts[1].y - cy) * 0.4);
  rc.lineTo(pts[2].x + Math.sign(pts[2].x - cx) * 0.4, pts[2].y + Math.sign(pts[2].y - cy) * 0.4);
  rc.lineTo(pts[3].x + Math.sign(pts[3].x - cx) * 0.4, pts[3].y + Math.sign(pts[3].y - cy) * 0.4);
  rc.fill();
}

let flameFrame = 0;
let flameSeed = 0;
function drawFlame() {
  const accel = keys['ArrowUp'] || keys['KeyW'];
  if (!accel) return;

  const cx = W / 2;
  const cy = HORIZON + (CAM_HEIGHT / CAM_DIST) * FOV;
  const S = resScale;
  const c = offCtx;

  c.save();
  c.translate(cx, cy);
  c.rotate(shipTilt);
  c.translate(-cx, -cy);

  flameFrame++;
  flameSeed = (flameSeed * 1664525 + 1013904223) & 0xffffffff;
  const frame = flameFrame % 4;
  // Pseudo-random helper seeded per frame
  let rSeed = flameSeed;
  function rng() { rSeed = (rSeed * 1103515245 + 12345) & 0x7fffffff; return (rSeed % 1000) / 1000; }

  const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  const intensity = Math.min(speed / 800, 1); // flames grow with speed

  // Exhaust positions
  const flames = [
    { x: cx - 5*S, w: 4*S },
    { x: cx + 1*S, w: 4*S },
  ];
  const wingFlames = [
    { x: cx - 21*S, w: 4*S },
    { x: cx + 17*S, w: 4*S },
  ];

  // Main thruster flames — multi-layered with flickering tongues
  for (const fl of flames) {
    const baseY = cy + 9*S;
    const baseLen = (8 + 6 * intensity) * S;
    const spread = 1.8;
    const outerBase = baseY - 4*S;
    const midX = fl.x + fl.w * 0.5;

    // Layer 1: dark red outer glow (widest)
    const glowLen = baseLen * (1.1 + rng() * 0.3);
    c.fillStyle = `rgba(180, 40, 10, ${0.4 + rng() * 0.2})`;
    c.beginPath();
    c.moveTo(fl.x - 1*S, outerBase);
    c.lineTo(fl.x - 3*S*spread, outerBase + glowLen * 0.7);
    c.lineTo(midX + (rng() - 0.5) * 2*S, outerBase + glowLen);
    c.lineTo(fl.x + fl.w + 3*S*spread, outerBase + glowLen * 0.7);
    c.lineTo(fl.x + fl.w + 1*S, outerBase);
    c.closePath();
    c.fill();

    // Layer 2: orange/yellow main flame with jagged edges
    const len2 = baseLen * (0.9 + rng() * 0.2);
    c.fillStyle = ['#f82','#fa3','#f92','#fb4'][frame];
    c.beginPath();
    c.moveTo(fl.x, outerBase);
    // Left jagged edge — 3 random wiggles
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const jx = fl.x - spread * S * (1 + rng() * 0.8) * t;
      const jy = outerBase + len2 * t + (rng() - 0.5) * 2*S;
      c.lineTo(jx, jy);
    }
    // Tip with random offset
    c.lineTo(midX + (rng() - 0.5) * 3*S, outerBase + len2);
    // Right jagged edge
    for (let i = 3; i >= 1; i--) {
      const t = i / 4;
      const jx = fl.x + fl.w + spread * S * (1 + rng() * 0.8) * t;
      const jy = outerBase + len2 * t + (rng() - 0.5) * 2*S;
      c.lineTo(jx, jy);
    }
    c.lineTo(fl.x + fl.w, outerBase);
    c.closePath();
    c.fill();

    // Layer 3: bright yellow inner flame
    const len3 = len2 * (0.55 + rng() * 0.15);
    c.fillStyle = ['#fe8','#ffa','#fd6','#ffb'][frame];
    c.beginPath();
    c.moveTo(fl.x + 0.5*S, outerBase + 1*S);
    c.lineTo(fl.x - 0.5*S*spread, outerBase + len3 * 0.6);
    c.lineTo(midX + (rng() - 0.5) * 1.5*S, outerBase + len3);
    c.lineTo(fl.x + fl.w + 0.5*S*spread, outerBase + len3 * 0.6);
    c.lineTo(fl.x + fl.w - 0.5*S, outerBase + 1*S);
    c.closePath();
    c.fill();

    // Layer 4: white-blue hot core
    c.fillStyle = ['#adf','#fff','#8cf','#dff'][frame];
    const coreLen = len3 * (0.45 + rng() * 0.15);
    c.beginPath();
    c.moveTo(fl.x + 1*S, baseY);
    c.lineTo(midX + (rng() - 0.5) * S, baseY + coreLen);
    c.lineTo(fl.x + fl.w - 1*S, baseY);
    c.closePath();
    c.fill();

    // Sparks — small bright dots that fly out randomly
    if (intensity > 0.3) {
      const nSparks = 1 + Math.floor(rng() * 3 * intensity);
      for (let i = 0; i < nSparks; i++) {
        const sx = midX + (rng() - 0.5) * fl.w * spread * 2;
        const sy = outerBase + len2 * (0.3 + rng() * 0.8);
        const sr = (0.5 + rng() * 0.8) * S;
        c.fillStyle = rng() > 0.5 ? '#ff8' : '#fda';
        c.fillRect(sx, sy, sr, sr);
      }
    }
  }

  // Wing flames — layered blue with flickering
  for (const fl of wingFlames) {
    const baseY = cy + 2*S;
    const baseLen = (4 + 4 * intensity) * S;
    const spread = 1.3;
    const midX = fl.x + fl.w * 0.5;

    // Outer blue glow
    const len1 = baseLen * (1.0 + rng() * 0.3);
    c.fillStyle = `rgba(40, 80, 220, ${0.4 + rng() * 0.2})`;
    c.beginPath();
    c.moveTo(fl.x - 0.5*S, baseY);
    c.lineTo(fl.x - 1*S*spread, baseY + len1 * 0.6);
    c.lineTo(midX + (rng() - 0.5) * S, baseY + len1);
    c.lineTo(fl.x + fl.w + 1*S*spread, baseY + len1 * 0.6);
    c.lineTo(fl.x + fl.w + 0.5*S, baseY);
    c.closePath();
    c.fill();

    // Main blue flame with slight jag
    const len2 = baseLen * (0.8 + rng() * 0.2);
    c.fillStyle = ['#48f','#6af','#39f','#5bf'][frame];
    c.beginPath();
    c.moveTo(fl.x, baseY);
    c.lineTo(fl.x - 0.5*S*spread, baseY + len2 * 0.5);
    c.lineTo(midX + (rng() - 0.5) * 1.5*S, baseY + len2);
    c.lineTo(fl.x + fl.w + 0.5*S*spread, baseY + len2 * 0.5);
    c.lineTo(fl.x + fl.w, baseY);
    c.closePath();
    c.fill();

    // Bright core
    const coreLen = len2 * 0.4;
    c.fillStyle = ['#8df','#bff','#aef','#cff'][frame];
    c.beginPath();
    c.moveTo(fl.x + 1*S, baseY);
    c.lineTo(midX, baseY + coreLen);
    c.lineTo(fl.x + fl.w - 1*S, baseY);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawCarBody() {
  const cx = W / 2;
  const cy = HORIZON + (CAM_HEIGHT / CAM_DIST) * FOV;
  const S = resScale;
  const c = offCtx;

  c.save();
  c.translate(cx, cy);
  c.rotate(shipTilt);
  c.translate(-cx, -cy);

  // Top surface of fuselage
  c.fillStyle = '#8899bb';
  c.beginPath();
  c.moveTo(cx, cy - 14*S);
  c.lineTo(cx - 4*S, cy - 10*S);
  c.lineTo(cx - 10*S, cy - 2*S);
  c.lineTo(cx + 10*S, cy - 2*S);
  c.lineTo(cx + 4*S, cy - 10*S);
  c.closePath();
  c.fill();

  // Rear face of fuselage
  c.fillStyle = '#667799';
  c.beginPath();
  c.moveTo(cx - 10*S, cy - 2*S);
  c.lineTo(cx - 10*S, cy + 10*S);
  c.lineTo(cx + 10*S, cy + 10*S);
  c.lineTo(cx + 10*S, cy - 2*S);
  c.closePath();
  c.fill();

  // Cockpit canopy
  c.fillStyle = '#aaccee';
  c.beginPath();
  c.moveTo(cx, cy - 12*S);
  c.lineTo(cx - 3*S, cy - 8*S);
  c.lineTo(cx - 3*S, cy - 3*S);
  c.lineTo(cx + 3*S, cy - 3*S);
  c.lineTo(cx + 3*S, cy - 8*S);
  c.closePath();
  c.fill();

  // Left wing - top surface
  c.fillStyle = '#7788aa';
  c.beginPath();
  c.moveTo(cx - 10*S, cy - 6*S);
  c.lineTo(cx - 22*S, cy - 2*S);
  c.lineTo(cx - 20*S, cy + 0*S);
  c.lineTo(cx - 10*S, cy - 2*S);
  c.closePath();
  c.fill();
  // Left wing rear face
  c.fillStyle = '#556688';
  c.beginPath();
  c.moveTo(cx - 22*S, cy - 2*S);
  c.lineTo(cx - 22*S, cy + 2*S);
  c.lineTo(cx - 10*S, cy + 2*S);
  c.lineTo(cx - 10*S, cy - 2*S);
  c.lineTo(cx - 20*S, cy + 0*S);
  c.closePath();
  c.fill();

  // Right wing - top surface
  c.fillStyle = '#7788aa';
  c.beginPath();
  c.moveTo(cx + 10*S, cy - 6*S);
  c.lineTo(cx + 22*S, cy - 2*S);
  c.lineTo(cx + 20*S, cy + 0*S);
  c.lineTo(cx + 10*S, cy - 2*S);
  c.closePath();
  c.fill();
  // Right wing rear face
  c.fillStyle = '#556688';
  c.beginPath();
  c.moveTo(cx + 22*S, cy - 2*S);
  c.lineTo(cx + 22*S, cy + 2*S);
  c.lineTo(cx + 10*S, cy + 2*S);
  c.lineTo(cx + 10*S, cy - 2*S);
  c.lineTo(cx + 20*S, cy + 0*S);
  c.closePath();
  c.fill();

  // Engine glow
  c.fillStyle = '#4af';
  c.fillRect(cx - 5*S, cy + 4*S, 4*S, 5*S);
  c.fillRect(cx + 1*S, cy + 4*S, 4*S, 5*S);
  c.fillStyle = 'rgba(68,170,255,0.3)';
  c.fillRect(cx - 6*S, cy + 8*S, 12*S, 3*S);

  // Wheels
  c.fillStyle = '#111';
  c.fillRect(cx - 22*S, cy + 1*S, 4*S, 6*S);
  c.fillRect(cx + 18*S, cy + 1*S, 4*S, 6*S);
  c.fillRect(cx - 18*S, cy - 4*S, 3*S, 4*S);
  c.fillRect(cx + 15*S, cy - 4*S, 3*S, 4*S);
  c.fillStyle = '#444';
  c.fillRect(cx - 21*S, cy + 3*S, 2*S, 2*S);
  c.fillRect(cx + 19*S, cy + 3*S, 2*S, 2*S);

  c.restore();
}

function drawIndicators() {
  // Draws on main canvas at full res
  const carX = BASE_W / 2;
  const carY = BASE_H * 0.35 + (CAM_HEIGHT / CAM_DIST) * BASE_FOV;
  const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  // Foreshorten Y to project onto ground plane in perspective
  const ySquash = 0.35;
  // Dead zone radius around ship — lines start outside this
  const dead = 29;

  // Helper: get start point clipped to dead ellipse around (carX, carY)
  function clipStart(dx, dy) {
    // Scale dy back by ySquash to get uniform distance
    const dist = Math.sqrt(dx * dx + (dy / ySquash) * (dy / ySquash));
    if (dist < 0.1) return null;
    const t = dead / dist;
    if (t >= 1) return null; // endpoint inside dead zone
    return { x: carX + dx * t, y: carY + dy * t };
  }

  // Going direction arrow
  if (hudGoingAlpha > 0.01) {
    const moveAngle = Math.atan2(player.vy, player.vx);
    let relAngle = moveAngle - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    const arrowLen = 75;
    const a = hudGoingAlpha;
    const dx = Math.sin(relAngle) * arrowLen;
    const dy = -Math.cos(relAngle) * arrowLen * ySquash;
    const start = clipStart(dx, dy);
    if (start) {
      const ax = carX + dx;
      const ay = carY + dy;
      ctx.strokeStyle = `rgba(255, 255, 0, ${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      const headLen = 10;
      const headAngle = 0.4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - Math.sin(relAngle - headAngle) * headLen,
        ay + Math.cos(relAngle - headAngle) * headLen * ySquash
      );
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - Math.sin(relAngle + headAngle) * headLen,
        ay + Math.cos(relAngle + headAngle) * headLen * ySquash
      );
      ctx.stroke();
    }
  }

  // Grip window edges (drift indicator)
  if (hudIndicatorAlpha > 0.01) {
    const moveAngle = Math.atan2(player.vy, player.vx);
    let relAngle = moveAngle - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    const driftSpeed = Math.max(speed - DRIFT_MIN_SPEED, 0);
    const gripWindow = GRIP_ANGLE / (1 + driftSpeed * GRIP_TIGHTENING);
    const gripLen = 63;
    ctx.strokeStyle = `rgba(0, 255, 100, ${hudIndicatorAlpha * 0.6})`;
    ctx.lineWidth = 1.5;
    for (const sign of [-1, 1]) {
      const ang = relAngle + sign * gripWindow;
      const dx = Math.sin(ang) * gripLen;
      const dy = -Math.cos(ang) * gripLen * ySquash;
      const start = clipStart(dx, dy);
      if (start) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(carX + dx, carY + dy);
        ctx.stroke();
      }
    }
  }

  // Facing arrow (straight up = forward into screen, foreshortened)
  if (hudFacingAlpha > 0.01) {
    const fwdY = 75 * ySquash;
    const start = clipStart(0, -fwdY);
    if (start) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${hudFacingAlpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(carX, carY - fwdY);
      ctx.stroke();
      const headY = 10 * ySquash;
      ctx.beginPath();
      ctx.moveTo(carX, carY - fwdY);
      ctx.lineTo(carX - 7, carY - fwdY + headY);
      ctx.moveTo(carX, carY - fwdY);
      ctx.lineTo(carX + 7, carY - fwdY + headY);
      ctx.stroke();
    }
  }

  // Helper: draw a mission arrow indicator toward a world position
  // r,g,b are base color; alpha is modulated by distance
  function drawMissionArrow(wx, wy, r, g, b, minAlpha) {
    const adx = wx - player.x;
    const ady = wy - player.y;
    const dist = Math.sqrt(adx * adx + ady * ady);

    const closeAlpha = Math.min(1, Math.max(0, (dist - 200) / 150));
    const farAlpha = Math.min(1, 800 / Math.max(dist, 1));
    const alpha = Math.max(minAlpha || 0, closeAlpha * farAlpha);
    if (alpha < 0.01) return;

    const worldAngle = Math.atan2(ady, adx);
    let relAngle = worldAngle - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    const arrowLen = 65;
    const dx = Math.sin(relAngle) * arrowLen;
    const dy = -Math.cos(relAngle) * arrowLen * ySquash;
    const start = clipStart(dx, dy);
    if (!start) return;
    const ax = carX + dx;
    const ay = carY + dy;
    const col = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    const headLen = 8;
    const headAngle = 0.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - Math.sin(relAngle - headAngle) * headLen,
      ay + Math.cos(relAngle - headAngle) * headLen * ySquash
    );
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - Math.sin(relAngle + headAngle) * headLen,
      ay + Math.cos(relAngle + headAngle) * headLen * ySquash
    );
    ctx.stroke();
  }

  // Nearest pickup arrow (gold)
  let nearestPickup = null;
  let nearestDist2 = Infinity;
  for (const m of missions) {
    if (m.state !== 'pickup') continue;
    const dx2 = m.pickupX - player.x;
    const dy2 = m.pickupY - player.y;
    const d2 = dx2 * dx2 + dy2 * dy2;
    if (d2 < nearestDist2) { nearestDist2 = d2; nearestPickup = m; }
  }
  if (nearestPickup) {
    drawMissionArrow(nearestPickup.pickupX, nearestPickup.pickupY, 255, 200, 0);
  }

  // Dropoff arrows (blue, nearest 5)
  if (cargo.length <= 5) {
    for (const c of cargo) {
      drawMissionArrow(c.dropoffX, c.dropoffY, 200, 50, 255, 0.6);
    }
  } else {
    const sorted = cargo.slice().sort((a, b) => {
      const da = (a.dropoffX - player.x) ** 2 + (a.dropoffY - player.y) ** 2;
      const db = (b.dropoffX - player.x) ** 2 + (b.dropoffY - player.y) ** 2;
      return da - db;
    });
    for (let i = 0; i < 5; i++) {
      drawMissionArrow(sorted[i].dropoffX, sorted[i].dropoffY, 200, 50, 255, 0.6);
    }
  }
}

function render() {
  // 3D map rendering on offscreen canvas (low res)
  // Below-horizon void: gradient from murky teal to deep black
  offCtx.fillStyle = voidGrad;
  offCtx.fillRect(0, 0, W, H);
  // Void: horizontal bands fading into depth, like distant layers
  if (H > HORIZON + 2) {
    const voidH = H - HORIZON;
    const bands = 5;
    for (let bi = 0; bi < bands; bi++) {
      const t = bi / bands;
      const y = Math.round(HORIZON + t * voidH);
      const h = Math.max(1, Math.round(voidH / bands * 0.4));
      const brightness = Math.round(30 - t * 20);
      const alpha = 0.15 - t * 0.1;
      if (alpha <= 0) continue;
      offCtx.fillStyle = `rgba(${brightness}, ${brightness + 15}, ${brightness + 12}, ${alpha.toFixed(2)})`;
      offCtx.fillRect(0, y, W, h);
    }
  }
  // Sky above horizon
  offCtx.fillStyle = skyGrad;
  offCtx.fillRect(0, 0, W, HORIZON);
  // Stars (only draw when resolution is high enough to see them)
  if (W > 40) {
    const t = performance.now() * 0.001;
    const angleOffset = player.angle * FOV / W; // match ground projection rate
    for (const s of stars) {
      const sx = (((s.u - angleOffset) % 1 + 1) % 1) * W;
      const sy = s.v * HORIZON;
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleRate);
      const alpha = s.b * twinkle;
      const bright = Math.round(180 + alpha * 75);
      offCtx.fillStyle = `rgba(${bright},${bright},${Math.min(255, bright + 30)},${alpha.toFixed(2)})`;
      offCtx.fillRect(sx, sy, 1, 1);
    }
  }
  // Moon (fixed world-angle, only drawn when in camera FOV)
  if (W > 40) {
    const moonWorldAngle = 2.2; // fixed direction in the sky
    let relAngle = moonWorldAngle - player.angle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;
    const moonX = W / 2 + relAngle * FOV;
    if (moonX > -W * 0.1 && moonX < W * 1.1) {
      const moonY = HORIZON * 0.2;
      const moonR = BASE_W * 0.02 * resScale;
      offCtx.fillStyle = '#dde4f0';
      offCtx.beginPath();
      offCtx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.fillStyle = '#1a2244';
      offCtx.beginPath();
      offCtx.arc(moonX + moonR * 0.4, moonY - moonR * 0.15, moonR * 0.85, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.fillStyle = 'rgba(180, 200, 230, 0.08)';
      offCtx.beginPath();
      offCtx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
      offCtx.fill();
    }
  }
  // Clouds (varied shapes/speeds, near horizon — fixed world-angles like moon)
  if (W > 60) {
    const t = performance.now() * 0.00005;
    // cloudDefs generated once at top of file
    offCtx.fillStyle = 'rgba(150, 170, 200, 0.06)';
    offCtx.beginPath();
    for (const [baseAngle, yBand, spd, blobs, wMul, hMul] of cloudDefs) {
      const worldAngle = baseAngle + t * spd;
      let rel = worldAngle - player.angle;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const cx = W / 2 + rel * FOV;
      if (cx < -W * 0.3 || cx > W * 1.3) continue;
      const cy = HORIZON * yBand;
      const cloudW = BASE_W * 0.05 * wMul * resScale;
      const blobR = cloudW * 0.25 * hMul;
      for (let bi = 0; bi < blobs; bi++) {
        const bt = blobs > 1 ? bi / (blobs - 1) - 0.5 : 0;
        const bx = cx + bt * blobR * blobs * 0.6;
        const by = cy - (1 - 4 * bt * bt) * blobR * 0.6;
        const br = blobR * (0.6 + (1 - 4 * bt * bt) * 0.5);
        offCtx.moveTo(bx + br, by);
        offCtx.arc(bx, by, br, 0, Math.PI * 2);
      }
    }
    offCtx.fill();
  }
  // Horizon glow
  const glowH = Math.max(2, Math.round(HORIZON * 0.15));
  offCtx.fillStyle = horizonGlowGrad;
  offCtx.fillRect(0, HORIZON - glowH, W, glowH * 1.5);

  const camX = player.x - Math.cos(player.angle) * CAM_DIST;
  const camY = player.y - Math.sin(player.angle) * CAM_DIST;
  const camZ = player.z * HS + CAM_HEIGHT;
  const cosA = Math.cos(player.angle);
  const sinA = Math.sin(player.angle);

  const faces = [];
  const camTileI = Math.floor(camX / TILE_SIZE);
  const camTileJ = Math.floor(camY / TILE_SIZE);

  for (let di = -DRAW_DIST; di <= DRAW_DIST; di++) {
    for (let dj = -DRAW_DIST; dj <= DRAW_DIST; dj++) {
      // Circular draw distance (skip square corners)
      if (di*di + dj*dj > DRAW_DIST * DRAW_DIST) continue;

      const ti = camTileI + di;
      const tj = camTileJ + dj;
      if (ti < 0 || ti >= MAP_SIZE || tj < 0 || tj >= MAP_SIZE) continue;

      const h = map[ti][tj];
      if (h <= 0) continue;

      // Frustum culling: skip tiles behind camera or far off to the side
      const fwd = di * cosA + dj * sinA;
      if (fwd < -1) continue;
      const lat = Math.abs(-di * sinA + dj * cosA);
      if (lat > fwd * 1.2 + 8) continue;

      const x0 = ti * TILE_SIZE;
      const x1 = (ti + 1) * TILE_SIZE;
      const y0 = tj * TILE_SIZE;
      const y1 = (tj + 1) * TILE_SIZE;

      // Top face — only if camera is above this tile
      if (h * HS < camZ) {
        const tc = [
          projectPoint(x0, y0, h, camX, camY, camZ, cosA, sinA),
          projectPoint(x1, y0, h, camX, camY, camZ, cosA, sinA),
          projectPoint(x1, y1, h, camX, camY, camZ, cosA, sinA),
          projectPoint(x0, y1, h, camX, camY, camZ, cosA, sinA),
        ];
        const checker = (ti + tj) % 2 === 0;
        const dist2 = di*di + dj*dj;
        const color = getTileColor(h, checker, ti, tj, dist2);
        if (color) {
          const avgD = (tc[0].depth + tc[1].depth + tc[2].depth + tc[3].depth) / 4;
          // Check which edges border the void or have height drops (only for nearby tiles)
          let edges;
          if (dist2 < DRAW_DIST * DRAW_DIST) {
            edges = [];
            const nS = (tj > 0) ? map[ti][tj-1] : 0;
            const nN = (tj < MAP_SIZE-1) ? map[ti][tj+1] : 0;
            const nW = (ti > 0) ? map[ti-1][tj] : 0;
            const nE = (ti < MAP_SIZE-1) ? map[ti+1][tj] : 0;
            const dropThresh = 0.3;
            if (nS <= 0 || h - nS > dropThresh) edges.push([tc[0], tc[1]]);
            if (nN <= 0 || h - nN > dropThresh) edges.push([tc[2], tc[3]]);
            if (nW <= 0 || h - nW > dropThresh) edges.push([tc[3], tc[0]]);
            if (nE <= 0 || h - nE > dropThresh) edges.push([tc[1], tc[2]]);
            if (edges.length === 0) edges = null;
          } else {
            edges = null;
          }
          faces.push({ pts: tc, color, depth: avgD, h, isTop: true, ti, tj, edges });
        }
      }

      // Side faces
      if (h > 0.3) {
        const checker = (ti + tj) % 2 === 0;
        const sideDist2 = di*di + dj*dj;
        // Inlined side face checks (avoids array/object allocation per tile)
        // South (ny=-1), North (ny=+1), West (nx=-1), East (nx=+1)
        const midX = (x0 + x1) * 0.5;
        const midY = (y0 + y1) * 0.5;
        const camDx = camX - midX;
        const camDy = camY - midY;
        // South face (y0 side, normal ny=-1): visible if camY < midY
        if (camDy < 0) {
          const nh = (tj > 0) ? map[ti][tj-1] : 0;
          if (nh < h) {
            const baseH = nh > 0 ? nh : -1000;
            const sc = [
              projectPoint(x0, y0, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y0, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y0, baseH, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y0, baseH, camX, camY, camZ, cosA, sinA),
            ];
            if (!sc.every(c => c.rawDepth < 1)) {
              const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) * 0.25;
              faces.push({ pts: sc, color: getSideColor(h, checker, ti, tj, sideDist2, 8), depth: avgD, h, isTop: false, ti, tj });
            }
          }
        }
        // North face (y1 side, normal ny=+1): visible if camY > midY
        if (camDy > 0) {
          const nh = (tj < MAP_SIZE-1) ? map[ti][tj+1] : 0;
          if (nh < h) {
            const baseH = nh > 0 ? nh : -1000;
            const sc = [
              projectPoint(x1, y1, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y1, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y1, baseH, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y1, baseH, camX, camY, camZ, cosA, sinA),
            ];
            if (!sc.every(c => c.rawDepth < 1)) {
              const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) * 0.25;
              faces.push({ pts: sc, color: getSideColor(h, checker, ti, tj, sideDist2, -5), depth: avgD, h, isTop: false, ti, tj });
            }
          }
        }
        // West face (x0 side, normal nx=-1): visible if camX < midX
        if (camDx < 0) {
          const nh = (ti > 0) ? map[ti-1][tj] : 0;
          if (nh < h) {
            const baseH = nh > 0 ? nh : -1000;
            const sc = [
              projectPoint(x0, y1, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y0, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y0, baseH, camX, camY, camZ, cosA, sinA),
              projectPoint(x0, y1, baseH, camX, camY, camZ, cosA, sinA),
            ];
            if (!sc.every(c => c.rawDepth < 1)) {
              const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) * 0.25;
              faces.push({ pts: sc, color: getSideColor(h, checker, ti, tj, sideDist2, 15), depth: avgD, h, isTop: false, ti, tj });
            }
          }
        }
        // East face (x1 side, normal nx=+1): visible if camX > midX
        if (camDx > 0) {
          const nh = (ti < MAP_SIZE-1) ? map[ti+1][tj] : 0;
          if (nh < h) {
            const baseH = nh > 0 ? nh : -1000;
            const sc = [
              projectPoint(x1, y0, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y1, h, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y1, baseH, camX, camY, camZ, cosA, sinA),
              projectPoint(x1, y0, baseH, camX, camY, camZ, cosA, sinA),
            ];
            if (!sc.every(c => c.rawDepth < 1)) {
              const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) * 0.25;
              faces.push({ pts: sc, color: getSideColor(h, checker, ti, tj, sideDist2, -12), depth: avgD, h, isTop: false, ti, tj });
            }
          }
        }
      }
    }
  }

  // Add mission pickup diamonds to scene (golden spinning cube on point)
  const missionTime = performance.now() / 1000;
  for (const m of missions) {
    if (m.state !== 'pickup') continue;
    const mti = Math.floor(m.pickupX / TILE_SIZE);
    const mtj = Math.floor(m.pickupY / TILE_SIZE);
    const mdi = mti - camTileI;
    const mdj = mtj - camTileJ;
    if (mdi * mdi + mdj * mdj > DRAW_DIST * DRAW_DIST) continue;
    const mfwd = mdi * cosA + mdj * sinA;
    if (mfwd < -1) continue;

    const groundH = getTileHeight(m.pickupX, m.pickupY);
    const baseZ = Math.max(groundH, 0.5);
    const bobZ = baseZ + 2.5 + Math.sin(missionTime * 2) * 0.3;
    const rot = missionTime * 2; // spin
    const halfSize = 20;
    const mx = m.pickupX, my = m.pickupY;

    // Diamond = rotated square (4 points: N, E, S, W)
    const cosR = Math.cos(rot) * halfSize;
    const sinR = Math.sin(rot) * halfSize;
    const topZ = bobZ + 2.0;
    const midZ = bobZ;
    const botZ = bobZ - 2.0;

    const pts = [
      { x: mx + cosR, y: my + sinR }, // "east"
      { x: mx - sinR, y: my + cosR }, // "north"
      { x: mx - cosR, y: my - sinR }, // "west"
      { x: mx + sinR, y: my - cosR }, // "south"
    ];

    // Top 4 triangular faces (diamond top half)
    for (let fi = 0; fi < 4; fi++) {
      const a = pts[fi];
      const b = pts[(fi + 1) % 4];
      // Triangle: top point, a-mid, b-mid
      const tp = projectPoint(mx, my, topZ, camX, camY, camZ, cosA, sinA);
      const ap = projectPoint(a.x, a.y, midZ, camX, camY, camZ, cosA, sinA);
      const bp = projectPoint(b.x, b.y, midZ, camX, camY, camZ, cosA, sinA);
      if (tp.rawDepth < 1 && ap.rawDepth < 1 && bp.rawDepth < 1) continue;
      const avgD = (tp.depth + ap.depth + bp.depth) / 3;
      const shade = 180 + fi * 20;
      faces.push({ pts: [tp, ap, bp, bp], color: `rgb(${shade}, ${Math.round(shade * 0.75)}, 0)`, depth: avgD, h: topZ, isTop: true, ti: -(1000 + fi), tj: 0 });
    }
    // Bottom 4 triangular faces (diamond bottom half)
    for (let fi = 0; fi < 4; fi++) {
      const a = pts[fi];
      const b = pts[(fi + 1) % 4];
      const bp2 = projectPoint(mx, my, botZ, camX, camY, camZ, cosA, sinA);
      const ap = projectPoint(a.x, a.y, midZ, camX, camY, camZ, cosA, sinA);
      const bpp = projectPoint(b.x, b.y, midZ, camX, camY, camZ, cosA, sinA);
      if (bp2.rawDepth < 1 && ap.rawDepth < 1 && bpp.rawDepth < 1) continue;
      const avgD = (bp2.depth + ap.depth + bpp.depth) / 3;
      const shade = 140 + fi * 15;
      faces.push({ pts: [bp2, ap, bpp, bpp], color: `rgb(${shade}, ${Math.round(shade * 0.65)}, 0)`, depth: avgD, h: midZ, isTop: false, ti: -(1000 + fi + 4), tj: 0 });
    }
  }

  // Add cargo dropoff flashing tiles to scene
  for (const c of cargo) {
    const dti = Math.floor(c.dropoffX / TILE_SIZE);
    const dtj = Math.floor(c.dropoffY / TILE_SIZE);
    const ddi = dti - camTileI;
    const ddj = dtj - camTileJ;
    if (ddi * ddi + ddj * ddj > DRAW_DIST * DRAW_DIST) continue;
    const dfwd = ddi * cosA + ddj * sinA;
    if (dfwd < -1) continue;
    const dlat = Math.abs(-ddi * sinA + ddj * cosA);
    if (dlat > dfwd * 1.2 + 8) continue;

    const dh = getTileHeight(c.dropoffX, c.dropoffY);
    if (dh <= 0) continue;
    const flashAlpha = 0.5 + Math.sin(missionTime * 6) * 0.3;
    const dx0 = dti * TILE_SIZE;
    const dx1 = (dti + 1) * TILE_SIZE;
    const dy0 = dtj * TILE_SIZE;
    const dy1 = (dtj + 1) * TILE_SIZE;
    const dmx = (dx0 + dx1) * 0.5;
    const dmy = (dy0 + dy1) * 0.5;
    const dUniq = -(2000 + cargo.indexOf(c));

    // Base tile
    const dtc = [
      projectPoint(dx0, dy0, dh + 0.02, camX, camY, camZ, cosA, sinA),
      projectPoint(dx1, dy0, dh + 0.02, camX, camY, camZ, cosA, sinA),
      projectPoint(dx1, dy1, dh + 0.02, camX, camY, camZ, cosA, sinA),
      projectPoint(dx0, dy1, dh + 0.02, camX, camY, camZ, cosA, sinA),
    ];
    const davgD = (dtc[0].depth + dtc[1].depth + dtc[2].depth + dtc[3].depth) / 4;
    faces.push({ pts: dtc, color: `rgba(200, 50, 255, ${flashAlpha})`, depth: davgD, h: dh + 0.02, isTop: true, ti: dUniq, tj: 0 });

    // Glow quad (larger, semi-transparent, slightly above)
    const glowPad = TILE_SIZE * 0.6;
    const glowAlpha = 0.15 + Math.sin(missionTime * 4) * 0.1;
    const gtc = [
      projectPoint(dx0 - glowPad, dy0 - glowPad, dh + 0.04, camX, camY, camZ, cosA, sinA),
      projectPoint(dx1 + glowPad, dy0 - glowPad, dh + 0.04, camX, camY, camZ, cosA, sinA),
      projectPoint(dx1 + glowPad, dy1 + glowPad, dh + 0.04, camX, camY, camZ, cosA, sinA),
      projectPoint(dx0 - glowPad, dy1 + glowPad, dh + 0.04, camX, camY, camZ, cosA, sinA),
    ];
    faces.push({ pts: gtc, color: `rgba(220, 100, 255, ${glowAlpha})`, depth: davgD - 0.01, h: dh + 0.04, isTop: true, ti: dUniq - 100, tj: 0 });

    // Vertical beams (4 corners, pulsing height)
    const beamH = 3 + Math.sin(missionTime * 3) * 1.5;
    const beamW = 1.5;
    const beamAlpha = 0.35 + Math.sin(missionTime * 5) * 0.15;
    const beamColor = `rgba(200, 80, 255, ${beamAlpha})`;
    const beamCorners = [
      { x: dx0, y: dy0 }, { x: dx1, y: dy0 },
      { x: dx1, y: dy1 }, { x: dx0, y: dy1 },
    ];
    for (let bi = 0; bi < 4; bi++) {
      const bx = beamCorners[bi].x;
      const by = beamCorners[bi].y;
      const btc = [
        projectPoint(bx - beamW, by - beamW, dh, camX, camY, camZ, cosA, sinA),
        projectPoint(bx + beamW, by + beamW, dh, camX, camY, camZ, cosA, sinA),
        projectPoint(bx + beamW, by + beamW, dh + beamH, camX, camY, camZ, cosA, sinA),
        projectPoint(bx - beamW, by - beamW, dh + beamH, camX, camY, camZ, cosA, sinA),
      ];
      const bavgD = (btc[0].depth + btc[1].depth + btc[2].depth + btc[3].depth) / 4;
      faces.push({ pts: btc, color: beamColor, depth: bavgD, h: dh + beamH, isTop: false, ti: dUniq - 200 - bi, tj: 0 });
    }
  }

  // Add enemy faces to scene
  const now = performance.now();
  for (let ei = 0; ei < enemies.length; ei++) {
    const enemy = enemies[ei];
    const eti = Math.floor(enemy.x / TILE_SIZE);
    const etj = Math.floor(enemy.y / TILE_SIZE);
    const edi = eti - camTileI;
    const edj = etj - camTileJ;
    if (edi * edi + edj * edj > DRAW_DIST * DRAW_DIST) continue;
    const efwd = edi * cosA + edj * sinA;
    if (efwd < -1) continue;
    const elat = Math.abs(-edi * sinA + edj * cosA);
    if (elat > efwd * 1.2 + 8) continue;

    const et = (now - enemy.spawnTime) / 1000;
    const pulse = Math.sin(et * 3) * 0.5 + 0.5;
    const halfSize = 3 + pulse * 3;
    const blockTop = enemy.z + 0.5 + pulse * 0.5;
    const blockBase = enemy.z + 0.05;

    const er = Math.round(200 + pulse * 55);
    const eg = Math.round(40 + pulse * 60);
    const eb = Math.round(40 + pulse * 20);
    const eTopColor = `rgb(${er},${eg},${eb})`;
    const eSideColor = `rgb(${Math.round(er * 0.7)},${Math.round(eg * 0.7)},${Math.round(eb * 0.7)})`;

    const ex = enemy.x, ey = enemy.y;
    const ex0 = ex - halfSize, ex1 = ex + halfSize;
    const ey0 = ey - halfSize, ey1 = ey + halfSize;
    const fakeTI = -(ei + 2);

    // Top face
    if (blockTop * HS < camZ) {
      const tc = [
        projectPoint(ex0, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey1, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey1, blockTop, camX, camY, camZ, cosA, sinA),
      ];
      const avgD = (tc[0].depth + tc[1].depth + tc[2].depth + tc[3].depth) / 4;
      faces.push({ pts: tc, color: eTopColor, depth: avgD, h: blockTop, isTop: true, ti: fakeTI, tj: 0 });
    }

    // Side faces (only camera-facing)
    const eCamDx = camX - ex;
    const eCamDy = camY - ey;
    if (eCamDy < 0) {
      const sc = [
        projectPoint(ex0, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey0, blockBase, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey0, blockBase, camX, camY, camZ, cosA, sinA),
      ];
      if (!sc.every(c => c.rawDepth < 1)) {
        const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) / 4;
        faces.push({ pts: sc, color: eSideColor, depth: avgD, h: blockTop, isTop: false, ti: fakeTI, tj: 0 });
      }
    }
    if (eCamDy > 0) {
      const sc = [
        projectPoint(ex1, ey1, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey1, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey1, blockBase, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey1, blockBase, camX, camY, camZ, cosA, sinA),
      ];
      if (!sc.every(c => c.rawDepth < 1)) {
        const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) / 4;
        faces.push({ pts: sc, color: eSideColor, depth: avgD, h: blockTop, isTop: false, ti: fakeTI, tj: 0 });
      }
    }
    if (eCamDx < 0) {
      const sc = [
        projectPoint(ex0, ey1, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey0, blockBase, camX, camY, camZ, cosA, sinA),
        projectPoint(ex0, ey1, blockBase, camX, camY, camZ, cosA, sinA),
      ];
      if (!sc.every(c => c.rawDepth < 1)) {
        const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) / 4;
        faces.push({ pts: sc, color: eSideColor, depth: avgD, h: blockTop, isTop: false, ti: fakeTI, tj: 0 });
      }
    }
    if (eCamDx > 0) {
      const sc = [
        projectPoint(ex1, ey0, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey1, blockTop, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey1, blockBase, camX, camY, camZ, cosA, sinA),
        projectPoint(ex1, ey0, blockBase, camX, camY, camZ, cosA, sinA),
      ];
      if (!sc.every(c => c.rawDepth < 1)) {
        const avgD = (sc[0].depth + sc[1].depth + sc[2].depth + sc[3].depth) / 4;
        faces.push({ pts: sc, color: eSideColor, depth: avgD, h: blockTop, isTop: false, ti: fakeTI, tj: 0 });
      }
    }
  }

  // Sort: far to near; same-tile faces: sides before tops; same-depth: lower before higher
  lastFaceCount = faces.length;
  faces.sort((a, b) => {
    // Same tile: always draw sides before tops
    if (a.ti === b.ti && a.tj === b.tj && a.isTop !== b.isTop) {
      return a.isTop ? 1 : -1;
    }
    // Different tiles or same face type: sort by depth, then height
    const dd = b.depth - a.depth;
    if (Math.abs(dd) > 1) return dd;
    return a.h - b.h;
  });

  const occlusionFaces = [];
  offCtx.strokeStyle = 'rgba(5, 15, 12, 0.5)';
  offCtx.lineWidth = 1.5;
  for (const face of faces) {
    drawFace(offCtx, face.pts, face.color);
    if (face.edges) {
      offCtx.beginPath();
      for (const e of face.edges) {
        offCtx.moveTo(e[0].x, e[0].y);
        offCtx.lineTo(e[1].x, e[1].y);
      }
      offCtx.stroke();
    }
    if (face.depth < CAM_DIST * 0.85 && face.h > player.z + 1) {
      occlusionFaces.push(face);
    }
  }
  // Drift marks
  offCtx.fillStyle = 'rgba(20, 20, 20, 0.6)';
  for (const m of driftMarks) {
    const markLen = 6;
    const markW = 2;
    const dx = Math.cos(m.angle);
    const dy = Math.sin(m.angle);
    const nx = -dy;
    const ny = dx;
    const corners = [
      projectPoint(m.x - dx*markLen + nx*markW, m.y - dy*markLen + ny*markW, m.h + 0.01, camX, camY, camZ, cosA, sinA),
      projectPoint(m.x + dx*markLen + nx*markW, m.y + dy*markLen + ny*markW, m.h + 0.01, camX, camY, camZ, cosA, sinA),
      projectPoint(m.x + dx*markLen - nx*markW, m.y + dy*markLen - ny*markW, m.h + 0.01, camX, camY, camZ, cosA, sinA),
      projectPoint(m.x - dx*markLen - nx*markW, m.y - dy*markLen - ny*markW, m.h + 0.01, camX, camY, camZ, cosA, sinA),
    ];
    if (corners.every(c => c.rawDepth > 1)) {
      offCtx.beginPath();
      offCtx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 4; i++) offCtx.lineTo(corners[i].x, corners[i].y);
      offCtx.closePath();
      offCtx.fill();
    }
  }

  // Laser balls
  for (const l of lasers) {
    const lp = projectPoint(l.x, l.y, l.z + 0.15, camX, camY, camZ, cosA, sinA);
    if (lp.rawDepth < 2) continue;
    const radius = Math.max(1, FOV * 3 / lp.depth);
    const lPulse = Math.sin(now * 0.01) * 0.5 + 0.5;
    offCtx.fillStyle = lPulse > 0.5 ? '#0ff' : '#0df';
    offCtx.beginPath();
    offCtx.arc(lp.x, lp.y, radius, 0, Math.PI * 2);
    offCtx.fill();
    // Glow
    offCtx.fillStyle = `rgba(0, 255, 255, 0.3)`;
    offCtx.beginPath();
    offCtx.arc(lp.x, lp.y, radius * 2, 0, Math.PI * 2);
    offCtx.fill();
  }

  // World particles
  for (const p of worldParticles) {
    if (p.age < 0) continue;
    const pp = projectPoint(p.x, p.y, p.z, camX, camY, camZ, cosA, sinA);
    if (pp.rawDepth < 2) continue;
    const t = p.age / p.life;
    const alpha = 1 - t;
    const radius = Math.max(1, FOV * 2 / pp.depth);
    offCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(2)})`;
    offCtx.beginPath();
    offCtx.arc(pp.x, pp.y, radius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Car body on offscreen (part of 3D scene, can be occluded)
  drawCarBody();
  // Thruster flame on top (exhaust comes toward camera, downward on screen)
  drawFlame();
  // Re-draw occlusion faces on offscreen (walls that cover the car)
  for (const face of occlusionFaces) {
    drawFace(offCtx, face.pts, face.color);
  }

  // Update screen shake
  if (shakeIntensity > 0.1) {
    shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
    shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
    shakeIntensity *= 0.85;
  } else {
    shakeX = 0; shakeY = 0; shakeIntensity = 0;
  }

  // Blit offscreen 3D to main canvas (stretched, pixelated)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, shakeX, shakeY, BASE_W, BASE_H);

  // Indicators on main canvas (full res, crisp)
  drawIndicators();

  // Minimap (full map, static, translucent)
  flushMinimap();
  const mmapX = 2, mmapY = 2;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#111';
  ctx.fillRect(mmapX - 1, mmapY - 1, MMAP_SIZE + 2, MMAP_SIZE + 2);
  ctx.drawImage(mmapCanvas, 0, 0, MMAP_TEX, MMAP_TEX, mmapX, mmapY, MMAP_SIZE, MMAP_SIZE);
  ctx.globalAlpha = 1;
  // Minimap pings
  const pingNow = performance.now();
  for (let i = mmapPings.length - 1; i >= 0; i--) {
    const p = mmapPings[i];
    const age = (pingNow - p.time) / 1000;
    if (age > 2) { mmapPings.splice(i, 1); continue; }
    const t = age / 2;
    const alpha = 0.4 * (1 - t);
    const radius = 2 + t * 6;
    const px = mmapX + (p.ti / MAP_SIZE) * MMAP_SIZE;
    const py = mmapY + (p.tj / MAP_SIZE) * MMAP_SIZE;
    ctx.strokeStyle = `rgba(${p.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Player dot + direction
  const dotX = mmapX + (player.x / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
  const dotY = mmapY + (player.y / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
  const pulse = Math.sin(performance.now() * 0.005);
  const dotR = 1 + pulse * 0.3;
  const rb = Math.round(240 + pulse * 15);
  ctx.fillStyle = `rgb(${rb}, ${Math.round(50 + pulse * 10)}, ${Math.round(50 + pulse * 10)})`;
  ctx.fillRect(dotX - dotR, dotY - dotR, dotR * 2, dotR * 2);
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dotX, dotY);
  ctx.lineTo(dotX + Math.cos(player.angle) * 4, dotY + Math.sin(player.angle) * 4);
  ctx.stroke();

  // Mission markers on minimap
  // Pickups (gold diamonds)
  ctx.fillStyle = '#fc0';
  for (const m of missions) {
    if (m.state !== 'pickup') continue;
    const mx = mmapX + (m.pickupX / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
    const my = mmapY + (m.pickupY / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
    ctx.beginPath();
    ctx.moveTo(mx, my - 2);
    ctx.lineTo(mx + 1.5, my);
    ctx.lineTo(mx, my + 2);
    ctx.lineTo(mx - 1.5, my);
    ctx.closePath();
    ctx.fill();
  }
  // Dropoffs (purple)
  ctx.fillStyle = '#c3f';
  for (const c of cargo) {
    const cx2 = mmapX + (c.dropoffX / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
    const cy2 = mmapY + (c.dropoffY / TILE_SIZE / MAP_SIZE) * MMAP_SIZE;
    ctx.fillRect(cx2 - 1.5, cy2 - 1.5, 3, 3);
  }

  // Controls hint (fades out after 60s)
  if (gameTime < 62) {
    const hintAlpha = gameTime < 58 ? 0.5 : 0.5 * Math.max(0, 1 - (gameTime - 58) / 4);
    if (hintAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${hintAlpha.toFixed(2)})`;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WASD + Space | Shift: shoot', BASE_W / 2, 18);
    }
  }

  // Debug HUD (toggle with Q)
  if (showDebug) {
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    const displaySpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    ctx.fillText(`FPS: ${fps} (${W}x${H} d${DRAW_DIST})`, BASE_W - 5, 14);
    ctx.fillText(`Speed: ${displaySpeed.toFixed(0)}`, BASE_W - 5, 28);
    ctx.fillText(`Height: ${player.z.toFixed(1)}`, BASE_W - 5, 42);
    ctx.fillText(player.onGround ? 'GROUND' : 'AIR', BASE_W - 5, 56);
    ctx.fillText(`Tile: ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`, BASE_W - 5, 70);
    ctx.fillText(`Angle: ${(player.angle * 180 / Math.PI).toFixed(1)}°`, BASE_W - 5, 84);
    ctx.fillText(`Enemies: ${enemies.length}`, BASE_W - 5, 98);
    ctx.fillText(`Decayed: ${tilesDestroyed} Spiked: ${tilesSpawned}`, BASE_W - 5, 112);
    ctx.fillText(`Faces: ${lastFaceCount}`, BASE_W - 5, 126);
    const realT = ((performance.now() - pageStartTime) / 1000);
    const resetT = ((performance.now() - lastResetTime) / 1000);
    const fmt = s => `${Math.floor(s/60)}:${(s%60).toFixed(1).padStart(4,'0')}`;
    ctx.fillText(`Real: ${fmt(realT)}  Game: ${fmt(gameTime)}  Reset: ${fmt(resetT)}`, BASE_W - 5, 140);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Q: debug', BASE_W - 5, 14);
    ctx.textAlign = 'left';
  }

  // HUD bars (lower left)
  if (!gameOver) {
    const barX = 22, barW = 80, barH = 8, barGap = 14;
    const t = performance.now() * 0.001;

    // Decay shake timers
    hpBarShake *= 0.88;
    if (hpBarShake < 0.01) hpBarShake = 0;
    heatBarShake *= 0.88;
    if (heatBarShake < 0.01) heatBarShake = 0;

    // Health bar
    const hpPct = playerHealth / MAX_HEALTH;
    const hpCrit = 1 - hpPct; // 0=full, 1=empty
    const hpPulse = hpCrit > 0.4 ? Math.sin(t * (4 + hpCrit * 8)) * hpCrit * 0.3 : 0;
    const hpGrow = hpCrit > 0.4 ? (Math.sin(t * (4 + hpCrit * 8)) * 0.5 + 0.5) * hpCrit * 2 : 0;
    const hpShakeX = hpBarShake * (Math.sin(t * 60) * 3);
    const hpShakeY = hpBarShake * (Math.cos(t * 73) * 2);
    const hpY = BASE_H - 18 - barGap;
    const hpIconX = barX + hpShakeX;
    const hpIconY = hpY + hpShakeY;
    const hpBarX = barX + hpShakeX - hpGrow;
    const hpBarY = hpY + hpShakeY - hpGrow * 0.5;
    const hpW = barW + hpGrow * 2;
    const hpH = barH + hpGrow;
    // Green cross icon
    ctx.fillStyle = '#4f4';
    ctx.fillRect(hpIconX - 16, hpIconY - 1, 10, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(hpIconX - 14, hpIconY + 3, 6, 2);
    ctx.fillRect(hpIconX - 12, hpIconY + 1, 2, 6);
    // Bar background
    ctx.fillStyle = `rgba(0, 255, 0, ${0.15 + hpPulse})`;
    ctx.fillRect(hpBarX, hpBarY, hpW, hpH);
    // Bar fill
    const hpR = Math.round(255 * (1 - hpPct));
    const hpG = Math.round(255 * hpPct);
    const hpBright = 1 + hpPulse;
    ctx.fillStyle = `rgb(${Math.min(255, Math.round(hpR * hpBright))},${Math.min(255, Math.round(hpG * hpBright))},50)`;
    ctx.fillRect(hpBarX, hpBarY, hpW * hpPct, hpH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpW, hpH);

    // Laser cooldown bar
    const heatCrit = laserHeat; // 0=cool, 1=max
    const heatPulse = heatCrit > 0.5 ? Math.sin(t * (4 + heatCrit * 10)) * heatCrit * 0.3 : 0;
    const heatGrow = heatCrit > 0.5 ? (Math.sin(t * (4 + heatCrit * 10)) * 0.5 + 0.5) * heatCrit * 2 : 0;
    const htShakeX = heatBarShake * (Math.sin(t * 55) * 3);
    const htShakeY = heatBarShake * (Math.cos(t * 67) * 2);
    const cdY = hpY + barGap;
    const cdIconX = barX + htShakeX;
    const cdIconY = cdY + htShakeY;
    const cdBarX = barX + htShakeX - heatGrow;
    const cdBarY = cdY + htShakeY - heatGrow * 0.5;
    const cdW = barW + heatGrow * 2;
    const cdH = barH + heatGrow;
    // Blue lightning icon
    ctx.fillStyle = '#4df';
    ctx.beginPath();
    ctx.moveTo(cdIconX - 13, cdIconY);
    ctx.lineTo(cdIconX - 9, cdIconY);
    ctx.lineTo(cdIconX - 11, cdIconY + 4);
    ctx.lineTo(cdIconX - 8, cdIconY + 4);
    ctx.lineTo(cdIconX - 14, cdIconY + 9);
    ctx.lineTo(cdIconX - 11, cdIconY + 5);
    ctx.lineTo(cdIconX - 14, cdIconY + 5);
    ctx.closePath();
    ctx.fill();
    // Bar background
    ctx.fillStyle = `rgba(0, 255, 255, ${0.15 + heatPulse})`;
    ctx.fillRect(cdBarX, cdBarY, cdW, cdH);
    // Bar fill (heat level, changes color as it fills)
    const heatR = Math.round(laserHeat * 255);
    const heatG = Math.round((1 - laserHeat) * 255);
    const htBright = 1 + heatPulse;
    ctx.fillStyle = laserOverheated
      ? `rgb(255, ${Math.round(Math.sin(t * 10) * 40 + 40)}, 0)`
      : `rgb(${Math.min(255, Math.round(heatR * htBright))}, ${Math.min(255, Math.round(heatG * htBright))}, ${Math.round((1 - laserHeat) * 255)})`;
    ctx.fillRect(cdBarX, cdBarY, cdW * laserHeat, cdH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(cdBarX, cdBarY, cdW, cdH);

    // Score display (bottom center)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SCORE: ${score}`, BASE_W / 2, BASE_H - 10);
    ctx.textAlign = 'left';

    // Score popups - breathe upward
    for (const pop of scorePopups) {
      const t01 = pop.age / pop.duration;
      // Scale font size by score magnitude: log10 maps 100->2, 1000->3, 1000000->6
      const mag = Math.log10(Math.max(1, pop.amount)); // 1->0, 10->1, 100->2, 1M->6
      const baseSize = mag <= 1 ? 8 : 8 + (mag - 1) * 13; // 8px for <=10, ~21px for 100, ~73px for 1M
      // Punch in hard then shrink: peaks at t=0.1
      const punch = t01 < 0.1 ? t01 / 0.1 : 1 - (t01 - 0.1) / 0.9;
      const size = baseSize * (0.6 + 0.6 * punch);
      // Fade: fully opaque for first half, then fade out
      const alpha = t01 < 0.4 ? 1 : 1 - (t01 - 0.4) / 0.6;
      // Rise scales with size
      const rise = t01 * (20 + baseSize * 0.8);
      const y = BASE_H - 28 - rise;
      const x = BASE_W / 2 + pop.xOff;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(size)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff0';
      ctx.fillText(`+${pop.amount}`, x, y);
      ctx.restore();
    }

    // Cargo list (lower right)
    if (cargo.length > 0) {
      ctx.font = '10px monospace';
      const listX = BASE_W - 5;
      let listY = BASE_H - 14 - (cargo.length - 1) * 14;
      for (const c of cargo) {
        const timerColor = c.timer < 10 ? '#f44' : c.timer < 20 ? '#fa0' : '#c3f';
        ctx.textAlign = 'right';
        ctx.fillStyle = timerColor;
        const curDist = Math.round(Math.sqrt((player.x - c.dropoffX) ** 2 + (player.y - c.dropoffY) ** 2));
        ctx.fillText(`${c.name} (${c.weight}kg) ${curDist}/${c.dist} ${c.timer.toFixed(0)}s`, listX, listY);
        listY += 14;
      }
      ctx.textAlign = 'left';
    }
  }

  // Hurt/heal screen flashes
  if (hurtFlash > 0.01) {
    ctx.fillStyle = `rgba(255, 0, 0, ${hurtFlash * 0.35})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    hurtFlash *= 0.92;
    if (hurtFlash < 0.01) hurtFlash = 0;
  }
  if (healFlash > 0.01) {
    ctx.fillStyle = `rgba(100, 255, 120, ${healFlash * 0.08})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    healFlash *= 0.95;
    if (healFlash < 0.01) healFlash = 0;
  }

  // Pause overlay
  if (paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', BASE_W / 2, BASE_H / 2);
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Press P to resume', BASE_W / 2, BASE_H / 2 + 28);
    ctx.textAlign = 'left';
  }

  // Restart confirm notification
  if (restartConfirmTimer > 0 && !gameOver) {
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const rText = `Press R again to restart (${Math.ceil(restartConfirmTimer)}s)`;
    const rW = ctx.measureText(rText).width + 20;
    ctx.fillRect(BASE_W / 2 - rW / 2, 28, rW, 22);
    ctx.fillStyle = '#fc0';
    ctx.fillText(rText, BASE_W / 2, 44);
    ctx.textAlign = 'left';
  }

  // Game over overlay
  if (gameOver) {
    const goElapsed = (performance.now() - gameOverTime) / 1000;

    // Force resolution down over time until fully pixelated
    const targetRes = Math.max(0.03, 1.0 - goElapsed * 0.15);
    if (resScale > targetRes) applyResScale(Math.max(0.03, resScale - 0.02));
    DRAW_DIST = Math.max(40, Math.round(BASE_DRAW_DIST * (resScale / 1.0)));

    const dimAlpha = Math.min(goElapsed * 0.12, 0.65);
    ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    ctx.fillStyle = '#f44';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', BASE_W / 2, BASE_H / 2 - 10);

    ctx.fillStyle = '#fc0';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`SCORE: ${score}`, BASE_W / 2, BASE_H / 2 + 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText(restartConfirmTimer > 0 ? `Press R again to restart (${Math.ceil(restartConfirmTimer)}s)` : 'Press R to restart', BASE_W / 2, BASE_H / 2 + 45);
    ctx.textAlign = 'left';
  }
}

let perfInterval = 0.02; // starts fast, slows down
const PERF_INTERVAL_FAST = 0.02;
const PERF_INTERVAL_SLOW = 0.25;
let gameTime = 0;

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!paused && !gameOver) gameTime += dt;
  frameCount++;
  fpsTime += dt;
  // Fast for first 3 seconds, then ease to slow
  perfInterval = gameTime < 8 ? PERF_INTERVAL_FAST : PERF_INTERVAL_SLOW;
  if (fpsTime >= perfInterval) {
    fps = Math.round(frameCount / fpsTime);
    frameCount = 0; fpsTime = 0;
    if (!gameOver) {
      if (fps < 50) {
        if (perfCycle === 0) { DRAW_DIST = Math.max(40, DRAW_DIST - 1); }
        else { if (resScale > 0.03) applyResScale(resScale - 0.01); }
        perfCycle = (perfCycle + 1) % 3;
      } else if (fps >= 59) {
        if (perfCycle === 0) { DRAW_DIST = Math.min(BASE_DRAW_DIST, DRAW_DIST + 1); }
        else { if (resScale < 1.0) applyResScale(resScale + 0.01); }
        perfCycle = (perfCycle + 1) % 3;
      }
    }
  }
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
