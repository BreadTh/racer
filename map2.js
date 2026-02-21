// ---- MAP 2 ----
const MAP_SIZE = 2560;
const TILE_SIZE = 12;
const HS = 10;
const map = [];
const mapColor = [];
for (let i = 0; i < MAP_SIZE; i++) {
  map[i] = new Float32Array(MAP_SIZE);
  mapColor[i] = new Uint8Array(MAP_SIZE);
}

function setTile(i, j, h) {
  if (i >= 0 && i < MAP_SIZE && j >= 0 && j < MAP_SIZE) map[i][j] = h;
}
function setRect(x0, y0, x1, y1, h) {
  for (let i = x0; i <= x1; i++)
    for (let j = y0; j <= y1; j++) setTile(i, j, h);
}
function setLine(x0, y0, x1, y1, w, h) {
  const len = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = Math.round(x0 + (x1-x0)*t);
    const cy = Math.round(y0 + (y1-y0)*t);
    for (let di = -w; di <= w; di++)
      for (let dj = -w; dj <= w; dj++) setTile(cx+di, cy+dj, h);
  }
}
function setArc(cx, cy, r, startAngle, endAngle, w, h) {
  const steps = Math.ceil(Math.abs(endAngle - startAngle) * r * 2);
  for (let s = 0; s <= steps; s++) {
    const a = startAngle + (endAngle - startAngle) * s / steps;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    for (let di = -w; di <= w; di++)
      for (let dj = -w; dj <= w; dj++) setTile(x+di, y+dj, h);
  }
}
function setRamp(x0, y0, x1, y1, w, h0, h1) {
  const len = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = Math.round(x0 + (x1-x0)*t);
    const cy = Math.round(y0 + (y1-y0)*t);
    const h = h0 + (h1-h0)*t;
    for (let di = -w; di <= w; di++)
      for (let dj = -w; dj <= w; dj++) setTile(cx+di, cy+dj, h);
  }
}

// Banked arc: outer edge rises, inner edge stays flat
function setBankedArc(cx, cy, r, startAngle, endAngle, w, baseH, bankFactor) {
  const steps = Math.ceil(Math.abs(endAngle - startAngle) * r * 2);
  for (let s = 0; s <= steps; s++) {
    const a = startAngle + (endAngle - startAngle) * s / steps;
    for (let d = -w; d <= w; d++) {
      const x = Math.round(cx + Math.cos(a) * (r + d));
      const y = Math.round(cy + Math.sin(a) * (r + d));
      const bankH = baseH + Math.max(0, d) * bankFactor;
      setTile(x, y, bankH);
    }
  }
}

// Wave road: height oscillates sinusoidally along the path
function setWaveRoad(x0, y0, x1, y1, w, baseH, amplitude, wavelength) {
  const len = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const dist = t * len;
    const cx = Math.round(x0 + (x1-x0)*t);
    const cy = Math.round(y0 + (y1-y0)*t);
    const h = baseH + amplitude * Math.sin(dist * Math.PI * 2 / wavelength);
    for (let di = -w; di <= w; di++)
      for (let dj = -w; dj <= w; dj++) setTile(cx+di, cy+dj, h);
  }
}

function buildTrack() {
  const RW = 12;

  // === NODE 1: Harbor Town (1280, 2050) ===
  // Big flat platform — the start/finish area
  setRect(1130, 1930, 1430, 2170, 1);
  // Start/finish line markers
  setRect(1180, 2040, 1185, 2060, 1.15);
  setRect(1375, 2040, 1380, 2060, 1.15);
  // Wide start zone
  setRect(1180, 2030, 1380, 2070, 1);
  // Grandstands south of start line (stepped)
  setRect(1180, 2080, 1380, 2095, 1.3);
  setRect(1180, 2095, 1380, 2110, 1.6);
  setRect(1180, 2110, 1380, 2130, 2.0);
  // Pit lane north of main road
  setRect(1180, 2010, 1380, 2025, 1);
  // Pit buildings
  setRect(1200, 1985, 1250, 2005, 2);
  setRect(1270, 1985, 1320, 2005, 2);
  setRect(1340, 1985, 1370, 2005, 2.5);
  // Lighthouse on east edge
  setRect(1415, 2130, 1430, 2145, 1);
  setRect(1418, 2133, 1427, 2142, 4);
  setRect(1420, 2135, 1425, 2140, 7);
  // Dock structures on SE
  setRect(1350, 2140, 1410, 2160, 1);
  setRect(1360, 2145, 1380, 2155, 1.5);
  setRect(1390, 2145, 1405, 2155, 1.5);

  // === NODE 2: Volcano Caldera (450, 1850) ===
  // Circular platform with raised rim
  setArc(450, 1850, 100, 0, Math.PI*2, 100, 1);  // fill interior
  setArc(450, 1850, 100, 0, Math.PI*2, 15, 3);    // rim road
  // Crater bowl — center drops down
  setArc(450, 1850, 50, 0, Math.PI*2, 50, 0.5);
  // Smoke stacks around rim
  setRect(445, 1745, 455, 1755, 7);
  setRect(540, 1830, 550, 1840, 6);
  setRect(445, 1945, 455, 1955, 7);
  setRect(355, 1870, 365, 1880, 6);
  // Ramp from rim down into crater
  setRamp(450, 1800, 450, 1830, RW-3, 3, 0.5);
  // Lava channels radiating outward (narrow low strips)
  setLine(450, 1750, 450, 1700, 3, 0.3);
  setLine(550, 1850, 600, 1850, 3, 0.3);
  setLine(450, 1950, 450, 2000, 3, 0.3);

  // === NODE 3: Crystal Mines (300, 1150) ===
  // Cavern floor
  setRect(200, 1050, 400, 1250, 1);
  // Crystal walls surrounding the cavern
  setRect(190, 1040, 200, 1260, 5);
  setRect(400, 1040, 410, 1260, 5);
  setRect(190, 1040, 410, 1050, 5);
  setRect(190, 1250, 410, 1260, 5);
  // Entrance archway on east side
  setRect(400, 1130, 410, 1170, 1);  // clear the opening
  // Crystal pillars inside
  setRect(240, 1080, 255, 1095, 4);
  setRect(330, 1100, 345, 1115, 6);
  setRect(250, 1180, 265, 1195, 5);
  setRect(350, 1200, 365, 1215, 7);
  setRect(220, 1140, 235, 1155, 3);
  setRect(370, 1160, 385, 1175, 5.5);
  // Mining cart track (narrow raised line)
  setLine(210, 1060, 390, 1240, 2, 1.5);

  // === NODE 4: Frozen Lake (450, 450) ===
  // Big flat circle — the frozen lake
  setArc(450, 450, 110, 0, Math.PI*2, 110, 1);
  // Shore rise
  setArc(450, 450, 115, 0, Math.PI*2, 8, 1.3);
  // Ice cracks (thin raised lines)
  setLine(380, 380, 520, 520, 1, 1.2);
  setLine(400, 500, 500, 400, 1, 1.2);
  setLine(350, 450, 550, 450, 1, 1.2);
  // Ice fishing huts
  setRect(410, 400, 425, 415, 2);
  setRect(480, 480, 495, 495, 2);
  setRect(420, 510, 435, 520, 1.8);
  // Warming cabin on north shore
  setRect(430, 330, 470, 360, 2.5);
  setRect(435, 335, 465, 355, 3.5);

  // === NODE 5: Sky Temple (1280, 350) ===
  // Elevated platform
  setRect(1150, 230, 1410, 470, 5);
  // Central temple — stepped pyramid
  setRect(1240, 310, 1320, 390, 7);
  setRect(1255, 325, 1305, 375, 9);
  setRect(1268, 338, 1292, 362, 11);
  // Column ring around temple
  setRect(1200, 280, 1210, 290, 8);
  setRect(1350, 280, 1360, 290, 8);
  setRect(1200, 410, 1210, 420, 8);
  setRect(1350, 410, 1360, 420, 8);
  setRect(1170, 340, 1180, 350, 8);
  setRect(1380, 340, 1390, 350, 8);
  // Approach ramps from all 4 sides
  setRamp(1280, 470, 1280, 500, RW, 5, 2.5); // south (connects to Grand Avenue)
  setRamp(1150, 350, 1100, 380, RW, 5, 1);    // west
  setRamp(1280, 230, 1280, 200, RW, 5, 1);    // north

  // === NODE 6: Cloud Citadel (2050, 500) ===
  // High platform
  setRect(1930, 380, 2170, 620, 8);
  // Central spire — tallest point on the map
  setRect(2030, 480, 2070, 520, 10);
  setRect(2040, 490, 2060, 510, 12);
  setRect(2047, 497, 2053, 503, 14);
  // Floating sub-platforms
  setRect(1940, 400, 1980, 440, 7);
  setRect(2120, 560, 2160, 600, 7);
  setRect(1950, 570, 1990, 610, 9);
  // Bridges to sub-platforms
  setLine(1980, 420, 2000, 450, 5, 8);
  setLine(2120, 580, 2100, 560, 5, 8);
  setLine(1990, 590, 2010, 560, 5, 8);
  // Windmill structures on outer platforms
  setRect(1955, 580, 1965, 590, 10);
  setRect(2135, 570, 2145, 580, 10);

  // === NODE 7: Canyon Outpost (2150, 1400) ===
  // Mesa platform
  setRect(2030, 1280, 2270, 1520, 2);
  // Canyon cutting through the middle (east-west)
  setRect(2060, 1380, 2240, 1420, 0.5);
  // Rope bridge across canyon
  setRect(2140, 1380, 2160, 1420, 2.3);
  // Watchtowers at corners
  setRect(2035, 1285, 2050, 1300, 5);
  setRect(2255, 1285, 2270, 1300, 5);
  setRect(2035, 1505, 2050, 1520, 5);
  setRect(2255, 1505, 2270, 1520, 5);
  // Trading post buildings on east mesa
  setRect(2190, 1300, 2240, 1340, 3);
  setRect(2200, 1310, 2230, 1330, 4);
  setRect(2190, 1460, 2240, 1500, 3);
  setRect(2200, 1470, 2230, 1490, 3.5);

  // === NODE 8: Jungle Ruins (2050, 2100) ===
  // Flat overgrown ground
  setRect(1930, 1980, 2170, 2220, 1);
  // Central pyramid — stepped
  setRect(2010, 2060, 2090, 2140, 3);
  setRect(2025, 2075, 2075, 2125, 5);
  setRect(2038, 2088, 2062, 2112, 7);
  // Moat around pyramid
  setArc(2050, 2100, 65, 0, Math.PI*2, 5, 0.5);
  // Vine pillars scattered around
  setRect(1950, 2000, 1960, 2010, 4);
  setRect(2140, 2020, 2150, 2030, 4);
  setRect(1960, 2180, 1970, 2190, 3.5);
  setRect(2130, 2190, 2140, 2200, 4.5);
  setRect(1945, 2100, 1955, 2110, 3);
  setRect(2145, 2140, 2155, 2150, 4);
  // Crumbling walls
  setRect(1970, 2040, 2000, 2045, 2);
  setRect(2100, 2150, 2130, 2155, 2);
  setRect(1940, 2140, 1945, 2170, 2);

  // === ROAD R1: Harbor -> Volcano "Coastal Cliffs" ===
  // Big banked arc sweeping from harbor west exit to volcano east exit
  // Goes from (1130, 2050) down and around to (550, 1850)
  setLine(1130, 2050, 900, 2150, RW, 1);
  setBankedArc(700, 1950, 250, Math.PI*0.5, Math.PI*1.2, RW, 1, 0.06);
  setLine(550, 1950, 550, 1850, RW, 1);
  // Cliff-side rock pillars along the outer edge
  setRect(850, 2200, 870, 2220, 3);
  setRect(750, 2220, 770, 2240, 4);
  setRect(650, 2200, 670, 2215, 3.5);
  setRect(550, 2150, 570, 2170, 2.5);
  // Guardrail on inner edge (slightly raised)
  setArc(700, 1950, 235, Math.PI*0.5, Math.PI*1.2, 2, 1.4);

  // === ROAD R8: Jungle Ruins -> Harbor "Market Road" ===
  // Wide straight boulevard
  setLine(1930, 2100, 1430, 2050, RW+3, 1);
  // Flanking columns on both sides
  for (let ci = 0; ci < 8; ci++) {
    const t = (ci + 1) / 9;
    const cx = Math.round(1930 + (1430 - 1930) * t);
    const cy = Math.round(2100 + (2050 - 2100) * t);
    setRect(cx - 2, cy - 22, cx + 2, cy - 18, 3);
    setRect(cx - 2, cy + 18, cx + 2, cy + 22, 3);
  }

  // === ROAD R9: Harbor -> Sky Temple "Grand Avenue" ===
  // Central spine road going north, gradual uphill
  setRamp(1280, 1930, 1280, 1200, RW, 1, 2.5);
  setRamp(1280, 1200, 1280, 500, RW, 2.5, 5);
  // Lampposts along Grand Avenue
  for (let lj = 1850; lj >= 600; lj -= 100) {
    setRect(1260, lj, 1264, lj + 4, 3.5);
    setRect(1296, lj, 1300, lj + 4, 3.5);
  }
  // Central plaza halfway (crossroads area)
  setRect(1200, 1180, 1360, 1260, 1.5);
  // Fountain in the center plaza
  setRect(1265, 1205, 1295, 1235, 2.5);
  setArc(1280, 1220, 20, 0, Math.PI*2, 8, 1.5);

  // === ROAD R2: Volcano -> Crystal Mines "Lava Tubes" ===
  // Northward with sinusoidal height waves
  setWaveRoad(450, 1750, 350, 1250, RW, 1.5, 1.2, 80);
  // Lava glow pillars along the path
  setRect(480, 1700, 495, 1715, 4);
  setRect(320, 1600, 335, 1615, 5);
  setRect(470, 1500, 485, 1515, 3.5);
  setRect(310, 1400, 325, 1415, 4.5);
  setRect(380, 1320, 395, 1335, 3);

  // === ROAD R3: Crystal Mines -> Frozen Lake "Mineshaft Ascent" ===
  // Switchback climb heading north
  setLine(300, 1050, 300, 900, RW, 1);
  setArc(380, 900, 80, Math.PI, Math.PI*2, RW, 1);
  setLine(460, 900, 460, 700, RW, 1);
  setArc(380, 700, 80, 0, -Math.PI, RW, 1);
  setLine(300, 700, 350, 560, RW, 1);
  // Crystal wall sections along switchbacks
  setRect(270, 950, 278, 1000, 4);
  setRect(490, 750, 498, 800, 4);
  setRect(270, 650, 278, 700, 4);
  // Retaining walls at hairpin edges
  setRect(280, 890, 285, 910, 3);
  setRect(475, 690, 480, 710, 3);

  // === ROAD R4: Frozen Lake -> Sky Temple "Frost Highway" ===
  // Gentle wide S-curve heading east
  setLine(560, 450, 800, 420, RW+2, 1);
  setBankedArc(900, 520, 100, -Math.PI*0.5, 0, RW+2, 1, 0.03);
  setLine(1000, 420, 1150, 380, RW+2, 1);

  // === ROAD R5: Sky Temple -> Cloud Citadel "Skybridge" ===
  // Narrow elevated bridge at h=8 with slight wave
  setRamp(1410, 350, 1500, 370, RW-3, 5, 8);
  setWaveRoad(1500, 370, 1850, 470, RW-4, 8, 0.3, 50);
  setRamp(1850, 470, 1930, 490, RW-3, 8, 8);
  // Guardrail edges (slightly raised above bridge)
  setLine(1500, 365, 1850, 465, 1, 8.5);
  setLine(1500, 375, 1850, 475, 1, 8.5);
  // Suspension tower pylons
  setRect(1600, 415, 1610, 425, 12);
  setRect(1750, 445, 1760, 455, 12);

  // === ROAD R6: Cloud Citadel -> Canyon Outpost "Thunderpath" ===
  // Steep descent with S-curves
  setRamp(2050, 620, 2100, 800, RW, 8, 5);
  setBankedArc(2000, 900, 100, 0, Math.PI, RW, 4, 0.05);
  setRamp(1900, 900, 2050, 1100, RW, 4, 3);
  setBankedArc(2150, 1100, 100, Math.PI, Math.PI*2, RW, 3, 0.05);
  setRamp(2250, 1100, 2150, 1280, RW, 3, 2);
  // Boulders along the descent
  setRect(2130, 750, 2150, 770, 6);
  setRect(1880, 920, 1900, 940, 5);
  setRect(2270, 1150, 2290, 1170, 4);
  // Warning pillars at each S-curve entry
  setRect(2095, 790, 2105, 800, 6);
  setRect(1895, 1085, 1905, 1095, 4);

  // === ROAD R7: Canyon Outpost -> Jungle Ruins "Overgrown Trail" ===
  // Gentle winding path south
  setLine(2150, 1520, 2200, 1700, RW, 1);
  setLine(2200, 1700, 2100, 1850, RW, 1);
  setLine(2100, 1850, 2050, 1980, RW, 1);
  // Root bumps on the road (small speed bumps)
  setRect(2170, 1600, 2190, 1620, 1.3);
  setRect(2180, 1730, 2200, 1750, 1.3);
  setRect(2120, 1880, 2140, 1900, 1.3);
  // Jungle trees flanking the path
  setRect(2220, 1620, 2240, 1640, 3);
  setRect(2120, 1560, 2140, 1580, 3);
  setRect(2230, 1740, 2250, 1760, 2.5);
  setRect(2070, 1870, 2090, 1890, 3);
  setRect(2140, 1940, 2160, 1960, 2.5);

  // === ROAD R10: Crystal Mines -> Canyon Outpost "Underground Express" ===
  // Long straight tunnel at h=3 with walls
  setRect(400, 1190-RW, 2030, 1190+RW, 3);
  // Tunnel walls on both sides
  setRect(400, 1190-RW-8, 2030, 1190-RW-1, 6);
  setRect(400, 1190+RW+1, 2030, 1190+RW+8, 6);
  // Tunnel entrance arches
  setRect(395, 1190-RW-8, 405, 1190+RW+8, 7);
  setRect(2025, 1190-RW-8, 2035, 1190+RW+8, 7);
  // Support pillars inside tunnel (every 150 tiles)
  for (let ti = 550; ti < 2000; ti += 150) {
    setRect(ti, 1190-RW-2, ti+5, 1190-RW+2, 5);
    setRect(ti, 1190+RW-2, ti+5, 1190+RW+2, 5);
  }
  // Entry ramp from Crystal Mines up to tunnel level
  setRamp(400, 1150, 450, 1190, RW, 1, 3);
  // Exit ramp down to Canyon Outpost level
  setRamp(2030, 1190, 2030, 1280, RW, 3, 2);

  // === SECONDARY ROADS ===

  // R11: Frozen Lake -> Crystal Mines shortcut (ski jump)
  setRamp(400, 560, 350, 650, RW-3, 1, 3);
  // Gap (no tiles from 650 to 700 — you fly!)
  setRamp(350, 700, 300, 800, RW-3, 1.5, 1);
  setLine(300, 800, 300, 1050, RW-3, 1);

  // R12: Volcano -> Jungle Ruins "Ring of Fire" (far south coastal)
  setLine(450, 1950, 500, 2200, RW, 1);
  setLine(500, 2200, 900, 2350, RW, 1);
  setLine(900, 2350, 1400, 2400, RW, 1);
  setLine(1400, 2400, 1800, 2300, RW, 1);
  setLine(1800, 2300, 2050, 2220, RW, 1);
  // Coastal scenery pillars
  setRect(600, 2280, 620, 2300, 3);
  setRect(1100, 2380, 1120, 2400, 2.5);
  setRect(1600, 2360, 1620, 2380, 3);
  setRect(1900, 2280, 1920, 2300, 2);

  // R13: Cloud Citadel -> Jungle Ruins "Cliffside Drop"
  setRamp(2170, 600, 2250, 800, RW, 8, 5);
  setRamp(2250, 800, 2300, 1100, RW, 5, 3);
  setLine(2300, 1100, 2350, 1400, RW, 2);
  setLine(2350, 1400, 2300, 1700, RW, 1);
  setLine(2300, 1700, 2200, 1980, RW, 1);

  // R14: Harbor loop oval (quick laps around the harbor)
  setArc(1280, 2050, 150, 0, Math.PI*2, RW-3, 1);

  // === AMBIENT DETAIL ===

  // Forest area between Frozen Lake and Mineshaft
  setRect(200, 600, 220, 620, 2);
  setRect(350, 620, 370, 640, 2);
  setRect(250, 700, 270, 720, 2.5);
  setRect(150, 550, 170, 570, 2);
  setRect(400, 550, 420, 570, 1.8);
  setRect(500, 650, 520, 670, 2.2);
  setRect(180, 750, 200, 770, 2);

  // Rocky terrain east of Canyon Outpost
  setRect(2300, 1350, 2320, 1370, 3);
  setRect(2350, 1450, 2370, 1470, 2.5);
  setRect(2400, 1300, 2420, 1320, 4);
  setRect(2380, 1500, 2400, 1520, 3);

  // Oasis between Grand Avenue and Lava Tubes
  setRect(700, 1400, 800, 1500, 0.5);
  setArc(750, 1450, 40, 0, Math.PI*2, 15, 0.5);
  // Palm trees around oasis
  setRect(720, 1410, 730, 1420, 3);
  setRect(780, 1470, 790, 1480, 3);
  setRect(700, 1480, 710, 1490, 2.5);
  setRect(790, 1420, 800, 1430, 2.5);

  // Crossroad connecting Oasis to Grand Avenue
  setLine(800, 1450, 1270, 1400, RW-3, 1);
  // Crossroad connecting Oasis to Lava Tubes area
  setLine(700, 1450, 400, 1500, RW-3, 1);

  // Ancient ruins scatter in the center of the map
  setRect(1000, 1500, 1040, 1540, 2);
  setRect(1050, 1550, 1080, 1580, 3);
  setRect(1100, 1600, 1130, 1630, 2.5);
  setRect(950, 1600, 980, 1630, 1.8);

  // Watchtower in the center
  setRect(1100, 1400, 1115, 1415, 1);
  setRect(1103, 1403, 1112, 1412, 5);
  setRect(1105, 1405, 1110, 1410, 8);

  // Road connecting center ruins to Grand Avenue
  setLine(1100, 1520, 1270, 1500, RW-4, 1);

  // Stadium bowl south of harbor (off the coastal road)
  setArc(900, 2350, 100, 0, Math.PI*2, RW, 1);
  setArc(900, 2350, 120, 0, Math.PI*2, 5, 2);
  // Inner field
  setArc(900, 2350, 60, 0, Math.PI*2, 30, 0.5);

  // Bridge from Sky Temple north to a lookout
  setRamp(1280, 230, 1280, 150, RW-3, 5, 8);
  setRect(1250, 100, 1310, 150, 8);
  // Lookout tower
  setRect(1270, 115, 1290, 135, 10);
  setRect(1275, 120, 1285, 130, 12);

  // Drag strip east of Cloud Citadel
  setRect(2100, 300, 2500, 300+RW*2, 1);
  // Start lights
  setRect(2105, 298, 2110, 325, 4);
  // Speed bumps at end
  setRect(2480, 300, 2495, 325, 1.3);

  // Farm area south of Frozen Lake
  setRect(500, 600, 600, 700, 0.7);
  // Furrows
  for (let fi = 505; fi < 600; fi += 12) {
    setRect(fi, 610, fi + 3, 690, 0.9);
  }
  // Barn
  setRect(520, 710, 570, 740, 2);
  setRect(530, 715, 560, 735, 3);
  // Silo
  setRect(580, 720, 595, 735, 4);

  // Mountain range north of Sky Temple
  setRect(1100, 100, 1150, 180, 3);
  setRect(1350, 80, 1420, 160, 4);
  setRect(1450, 120, 1500, 190, 3.5);
  setRect(1050, 140, 1090, 200, 2.5);

  // Marsh area between Volcano and Harbor (SW interior)
  setRect(700, 1800, 900, 1950, 0.5);
  // Marsh trees
  setRect(730, 1830, 745, 1845, 2);
  setRect(820, 1860, 835, 1875, 2);
  setRect(760, 1900, 775, 1915, 1.8);
  setRect(870, 1920, 885, 1935, 2.2);

  // Path through marsh
  setLine(900, 1900, 1130, 2050, RW-4, 1);

  // === MORE EAST SIDE FILL ===

  // Industrial district between Canyon Outpost and Jungle Ruins (east side)
  setRect(2300, 1800, 2400, 1900, 1);
  // Warehouse buildings
  setRect(2310, 1810, 2360, 1850, 2.5);
  setRect(2310, 1860, 2360, 1890, 2);
  setRect(2370, 1820, 2395, 1870, 3);
  // Smokestack
  setRect(2385, 1830, 2392, 1837, 6);
  // Road connecting industrial to Cliffside Drop
  setLine(2350, 1800, 2350, 1700, RW-3, 1);
  // Road to Jungle Ruins
  setLine(2350, 1900, 2200, 1980, RW-3, 1);

  // Harbor extensions — marina on south side
  setRect(1150, 2170, 1250, 2220, 1);
  // Boat docks
  setRect(1160, 2190, 1175, 2215, 1);
  setRect(1190, 2190, 1205, 2215, 1);
  setRect(1220, 2190, 1235, 2215, 1);
  // Boats
  setRect(1162, 2195, 1173, 2210, 1.3);
  setRect(1192, 2195, 1203, 2210, 1.3);
  setRect(1222, 2195, 1233, 2210, 1.3);

  // East highway connecting Cloud Citadel to drag strip to Canyon
  setLine(2170, 500, 2200, 400, RW, 1);
  setLine(2200, 400, 2100, 300, RW, 1);
  // Highway continues south from drag strip end
  setLine(2500, 310, 2500, 800, RW-3, 1);
  setLine(2500, 800, 2400, 1200, RW-3, 1);

  // Suburban houses along east highway
  setRect(2520, 500, 2550, 530, 2);
  setRect(2520, 600, 2550, 630, 1.8);
  setRect(2520, 700, 2550, 730, 2.2);
  // Gardens
  setRect(2500, 530, 2520, 560, 0.7);
  setRect(2500, 630, 2520, 660, 0.7);

  // Large park between Grand Avenue and east side
  setRect(1500, 1400, 1700, 1600, 0.7);
  // Park paths
  setArc(1600, 1500, 80, 0, Math.PI*2, 4, 1);
  // Park trees
  setRect(1520, 1420, 1535, 1435, 2.5);
  setRect(1650, 1440, 1665, 1455, 2.5);
  setRect(1530, 1560, 1545, 1575, 2);
  setRect(1660, 1550, 1675, 1565, 2);
  // Pond in center
  setArc(1600, 1500, 30, 0, Math.PI*2, 15, 0.5);
  // Connect park to Grand Avenue
  setLine(1500, 1500, 1292, 1400, RW-4, 1);
  // Connect park east to Canyon approach
  setLine(1700, 1500, 2030, 1400, RW-4, 1);

  // Aqueduct from Sky Temple area to the Oasis
  setRect(1050, 700, 1055, 1400, 4);
  // Pillars every 100 tiles
  for (let aj = 750; aj <= 1350; aj += 100) {
    setRect(1045, aj, 1060, aj + 5, 4);
  }
  // Ramp from temple plateau down to aqueduct
  setRamp(1100, 380, 1055, 500, 5, 5, 4);
  // Ramp from aqueduct to oasis
  setRamp(1050, 1400, 800, 1450, 5, 4, 1);

  // More scatter: NW castle ruins
  setRect(200, 200, 280, 280, 1);
  // Castle walls
  setRect(200, 200, 210, 280, 3);
  setRect(270, 200, 280, 280, 3);
  setRect(200, 200, 280, 210, 3);
  setRect(200, 270, 280, 280, 3);
  // Keep
  setRect(230, 230, 260, 260, 5);
  setRect(238, 238, 252, 252, 7);
  // Road from castle to Frozen Lake
  setLine(250, 280, 400, 400, RW-3, 1);

  // Amphitheater between Grand Avenue midpoint and park
  setArc(1400, 1300, 50, Math.PI*0.3, Math.PI*1.7, 4, 1.5);
  setArc(1400, 1300, 65, Math.PI*0.3, Math.PI*1.7, 4, 2);
  // Stage
  setRect(1390, 1290, 1410, 1310, 1);
  setRect(1395, 1295, 1405, 1305, 2);
  // Road to amphitheater
  setLine(1360, 1220, 1400, 1280, RW-4, 1);

  // === EXTRA CONNECTIONS ===

  // From Frost Highway midpoint south to tunnel entrance area
  setLine(800, 420, 800, 800, RW-3, 1);
  setLine(800, 800, 600, 1050, RW-3, 1);

  // From Volcano west to Coastal loop (R12)
  setLine(350, 1850, 350, 2000, RW-3, 1);
  setLine(350, 2000, 500, 2200, RW-3, 1);

  // From industrial district to beach/coastal highway
  setLine(2350, 1900, 2400, 2100, RW-3, 1);
  setLine(2400, 2100, 2300, 2300, RW-3, 1);

  // Beach area in far SE
  setRect(2300, 2250, 2500, 2450, 0.5);
  // Sand dunes
  setRect(2350, 2300, 2400, 2340, 0.8);
  setRect(2420, 2350, 2470, 2390, 0.7);
  // Pier
  setRect(2450, 2350, 2550, 2370, 1);
  // Lighthouse at pier end
  setRect(2530, 2355, 2545, 2365, 4);
  setRect(2534, 2357, 2541, 2363, 7);

  // From park south to Harbor loop
  setLine(1600, 1600, 1500, 1800, RW-4, 1);
  setLine(1500, 1800, 1430, 2000, RW-4, 1);

  // From center ruins to Volcano rim
  setLine(950, 1600, 600, 1800, RW-4, 1);

  // From barn/farm area to Frost Highway
  setLine(560, 730, 700, 430, RW-4, 1);

  // Loop road around the Volcano (driving the rim)
  // Already covered by the rim arc — add a spur to connect east side
  setLine(550, 1800, 600, 1700, RW-4, 1);
  setLine(600, 1700, 700, 1600, RW-4, 1);

  // Overpass where Grand Avenue crosses the tunnel (Underground Express)
  // The tunnel is at h=3, Grand Avenue at h=2.5 here — they naturally cross
  // Just make sure tiles overlap properly (tunnel should dominate at junction)
  // The tunnel runs at j=1190, Grand Avenue at i=1280
  // Add a small ramp for Grand Avenue to go over
  setRamp(1280, 1170, 1280, 1185, RW, 2.5, 4);
  setRect(1280-RW, 1185, 1280+RW, 1195, 4);
  setRamp(1280, 1195, 1280, 1210, RW, 4, 2.5);

  // === LANDMARKS ===

  // Giant statue in the center of the map
  setRect(1275, 1395, 1285, 1405, 1);
  setRect(1277, 1397, 1283, 1403, 10);

  // Radio tower array on hill between Frost Highway and Grand Avenue
  setRect(1000, 600, 1030, 630, 1.5);
  setRect(1010, 610, 1020, 620, 8);
  setRect(1005, 605, 1015, 615, 6);

  // Wind turbines along coastal highway (R12)
  setRect(700, 2260, 706, 2266, 1);
  setRect(702, 2262, 704, 2264, 6);
  setRect(1000, 2370, 1006, 2376, 1);
  setRect(1002, 2372, 1004, 2374, 7);
  setRect(1600, 2370, 1606, 2376, 1);
  setRect(1602, 2372, 1604, 2374, 6);

  // Campsite near Frozen Lake
  setRect(550, 380, 570, 400, 1.5);
  setRect(580, 370, 595, 385, 1.3);
  // Campfire ring
  setArc(570, 395, 8, 0, Math.PI*2, 2, 0.8);

  // Standing stones circle between Castle Ruins and Frozen Lake
  (function() {
    const scx = 350, scy = 350, sr = 25;
    for (let si = 0; si < 6; si++) {
      const a = si * Math.PI * 2 / 6;
      const sx = Math.round(scx + Math.cos(a) * sr);
      const sy = Math.round(scy + Math.sin(a) * sr);
      setRect(sx - 2, sy - 2, sx + 2, sy + 2, 3);
    }
  })();

  // Shipwreck on the beach
  setRect(2380, 2280, 2430, 2300, 1.2);
  setRect(2400, 2285, 2410, 2295, 2.5);

  // Billboard near Harbor entrance
  setRect(1100, 1920, 1105, 1925, 1);
  setRect(1098, 1918, 1107, 1923, 4);

  // Toll booth on Grand Avenue
  setRect(1268, 1800, 1292, 1810, 1);
  setRect(1270, 1802, 1280, 1808, 2);
  setRect(1282, 1802, 1290, 1808, 2);

  // Gas station near tunnel midpoint
  setRect(1200, 1155, 1240, 1175, 1);
  setRect(1205, 1158, 1220, 1168, 2);

  // Jump ramp on Market Road
  setRamp(1700, 2070, 1740, 2065, RW, 1, 3);

  // Elevated viewing platform above the Volcano
  setRamp(550, 1750, 550, 1720, RW-5, 3, 6);
  setRect(535, 1700, 565, 1720, 6);

  // Spiral ramp in Cloud Citadel NW sub-platform
  (function() {
    const cx = 1960, cy = 420, r = 30;
    const turns = 1;
    const steps = Math.ceil(turns * Math.PI * 2 * r * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const a = t * turns * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      const h = 7 + t * 2;
      for (let di = -4; di <= 4; di++)
        for (let dj = -4; dj <= 4; dj++) setTile(x+di, y+dj, h);
    }
  })();

  // Parking lot near Harbor
  setRect(1050, 2050, 1130, 2120, 1);
  // Car-sized blocks
  setRect(1060, 2065, 1075, 2080, 1.3);
  setRect(1085, 2065, 1100, 2080, 1.3);
  setRect(1060, 2090, 1075, 2105, 1.3);
  setRect(1085, 2090, 1100, 2105, 1.3);

  // Hedge maze between Harbor and Marsh
  setRect(950, 1960, 955, 2020, 2);
  setRect(990, 1960, 995, 2010, 2);
  setRect(1030, 1970, 1035, 2020, 2);
  setRect(950, 1960, 1035, 1965, 2);
  setRect(950, 2015, 1035, 2020, 2);
  // Openings
  setRect(955, 1985, 990, 1995, 1);
  setRect(995, 1990, 1030, 2000, 1);

  // Road from Hedge Maze to Harbor
  setLine(1035, 1990, 1130, 2000, RW-4, 1);

  // === NE QUADRANT FILL ===

  // Science outpost between Cloud Citadel and Thunderpath
  setRect(1850, 700, 1950, 800, 1);
  // Lab buildings
  setRect(1860, 710, 1910, 750, 2.5);
  setRect(1870, 720, 1900, 740, 3.5);
  // Satellite dish (arc + pillar)
  setArc(1930, 750, 20, 0, Math.PI, 3, 2);
  setRect(1925, 745, 1935, 755, 1);
  setRect(1928, 748, 1932, 752, 3.5);
  // Road to Cloud Citadel
  setRamp(1900, 700, 1950, 620, RW-3, 1, 8);
  // Road south to Thunderpath
  setLine(1900, 800, 1950, 900, RW-3, 1);

  // Floating islands between Sky Temple and Cloud Citadel
  setRect(1550, 300, 1600, 350, 6);
  setRect(1650, 340, 1700, 390, 5.5);
  setRect(1750, 310, 1800, 360, 7);
  // Bridges between floating islands
  setLine(1600, 325, 1650, 365, 4, 6);
  setLine(1700, 365, 1750, 335, 4, 6);
  // Connect first island to Sky Temple
  setRamp(1450, 350, 1550, 325, 4, 5, 6);

  // Valley between Thunderpath S-curves (interior scenic area)
  setRect(1900, 1000, 2050, 1100, 0.7);
  // River through valley
  setLine(1920, 1020, 2030, 1080, 4, 0.3);
  // Bridge over river
  setRect(1960, 1045, 1990, 1065, 1);
  // Trees along valley
  setRect(1910, 1030, 1925, 1045, 2);
  setRect(2020, 1060, 2035, 1075, 2);
  setRect(1950, 1015, 1965, 1030, 2.2);
  setRect(2000, 1080, 2015, 1095, 2);

  // === SW QUADRANT FILL ===

  // Hot springs between Volcano and Coastal road
  setRect(300, 2050, 450, 2150, 0.5);
  // Steam vents (thin pillars)
  setRect(330, 2070, 338, 2078, 3);
  setRect(380, 2100, 388, 2108, 3.5);
  setRect(420, 2070, 428, 2078, 2.5);
  setRect(350, 2130, 358, 2138, 3);
  // Boardwalk through hot springs
  setLine(300, 2100, 450, 2100, 4, 1);

  // Quarry west of Crystal Mines
  setRect(80, 1100, 190, 1200, 0.5);
  setRect(90, 1110, 180, 1190, 0.3);
  // Quarry ramp
  setRamp(80, 1150, 110, 1150, 15, 0.3, 1);
  // Machinery blocks
  setRect(100, 1120, 120, 1140, 1.5);
  setRect(150, 1160, 170, 1180, 2);
  // Road to Crystal Mines
  setLine(190, 1150, 200, 1150, RW-4, 1);

  // === SE QUADRANT FILL ===

  // Bazaar between Jungle Ruins and Market Road
  setRect(1700, 2150, 1850, 2250, 1);
  // Market stalls
  setRect(1710, 2160, 1735, 2180, 1.5);
  setRect(1745, 2160, 1770, 2180, 1.5);
  setRect(1780, 2160, 1805, 2180, 1.5);
  setRect(1710, 2200, 1735, 2220, 1.5);
  setRect(1745, 2200, 1770, 2220, 1.5);
  setRect(1780, 2200, 1805, 2220, 1.5);
  // Central fountain
  setRect(1760, 2185, 1780, 2200, 2.5);
  // Awning poles
  setRect(1710, 2158, 1714, 2162, 3);
  setRect(1745, 2158, 1749, 2162, 3);
  setRect(1780, 2158, 1784, 2162, 3);
  // Road from Bazaar to Harbor
  setLine(1700, 2200, 1430, 2120, RW-4, 1);
  // Road from Bazaar to coastal highway
  setLine(1780, 2250, 1800, 2300, RW-4, 1);

  // === NW QUADRANT FILL ===

  // Mill complex near Frozen Lake
  setRect(600, 350, 650, 400, 1);
  // Windmill
  setRect(620, 365, 630, 375, 1);
  setRect(622, 367, 628, 373, 4);
  setRect(624, 369, 626, 371, 6);
  // Granary
  setRect(605, 380, 640, 395, 2);
  // Road to Frozen Lake
  setLine(600, 400, 520, 450, RW-4, 1);

  // Creek bed winding south from Frozen Lake
  setLine(450, 560, 400, 700, 4, 0.3);
  setLine(400, 700, 350, 900, 4, 0.3);
  // Stone bridge over creek
  setRect(385, 790, 415, 810, 1);

  // Watch post on the Mineshaft road
  setRect(490, 810, 510, 830, 1);
  setRect(493, 813, 507, 827, 3);
  setRect(497, 817, 503, 823, 5);
  // Road from watch post to Mineshaft
  setLine(490, 830, 460, 850, RW-4, 1);

  // === ROAD FEATURES ===

  // Frost Highway (R4) — gentle camber on curves
  // Already done with setBankedArc, add ice formations along edges
  setRect(650, 400, 665, 415, 2);
  setRect(750, 440, 765, 450, 1.8);
  setRect(870, 410, 885, 425, 2.2);
  setRect(980, 395, 995, 410, 1.5);

  // Thunderpath (R6) — warning signs (small blocks)
  setRect(2060, 700, 2068, 708, 5);
  setRect(2000, 850, 2008, 858, 4);
  setRect(2100, 1050, 2108, 1058, 3);
  setRect(2200, 1200, 2208, 1208, 2.5);

  // Overgrown Trail (R7) — tree arches
  setRect(2140, 1650, 2150, 1660, 3);
  setRect(2165, 1650, 2175, 1660, 3);
  // Connecting top (arch)
  setRect(2140, 1655, 2175, 1660, 3.5);

  // Market Road (R8) — lamp posts
  for (let li = 0; li < 6; li++) {
    const t = (li + 1) / 7;
    const lx = Math.round(1930 + (1430 - 1930) * t);
    const ly = Math.round(2100 + (2050 - 2100) * t);
    setRect(lx, ly + 25, lx + 3, ly + 28, 3);
    setRect(lx, ly - 28, lx + 3, ly - 25, 3);
  }

  // Coastal Highway (R12) — beach stalls and rest stops
  setRect(600, 2230, 650, 2260, 1);
  setRect(610, 2235, 640, 2255, 1.5);
  setRect(1100, 2400, 1140, 2420, 1);
  setRect(1105, 2405, 1135, 2415, 1.5);
  // Picnic tables
  setRect(1200, 2415, 1210, 2425, 1.3);
  setRect(1220, 2415, 1230, 2425, 1.3);

  // === ELEVATED FEATURES ===

  // Monorail track from Harbor to Sky Temple (following Grand Avenue)
  // Thin elevated rail at h=5
  setRect(1278, 1930, 1282, 500, 5.5);
  // Support pillars every 120 tiles
  for (let mj = 1800; mj >= 600; mj -= 120) {
    setRect(1273, mj, 1287, mj + 5, 5.5);
  }

  // === ISLAND CHAIN off south coast ===
  setRect(100, 2400, 160, 2450, 1);
  setRect(110, 2410, 150, 2440, 1.5);
  // Lighthouse
  setRect(125, 2420, 135, 2430, 4);
  setRect(128, 2423, 132, 2427, 6);
  // Second island
  setRect(200, 2430, 250, 2470, 1);
  setRect(210, 2440, 240, 2460, 1.3);
  // Causeway
  setRect(160, 2430, 200, 2445, 0.8);

  // === FAR NORTH: Mountain Ridge ===
  setRect(600, 100, 700, 180, 2);
  setRect(620, 110, 680, 170, 3);
  setRect(640, 130, 660, 150, 5);
  // Road from ridge to Frozen Lake
  setLine(650, 180, 500, 350, RW-3, 1);
  // Road from ridge east to Sky Temple lookout
  setLine(700, 140, 1250, 120, RW-3, 1);

  // Radio towers on mountain ridge
  setRect(650, 135, 654, 139, 5);
  setRect(651, 136, 653, 138, 10);

  // === MORE INTERIOR FILL ===

  // Figure-8 track between Grand Avenue and Park
  setArc(1350, 1600, 60, 0, Math.PI*2, RW-4, 1);
  setArc(1450, 1600, 60, 0, Math.PI*2, RW-4, 1);
  // Crossover ramp
  setRamp(1400, 1585, 1400, 1595, 4, 1, 2.5);
  setRect(1396, 1595, 1404, 1605, 2.5);
  setRamp(1400, 1605, 1400, 1615, 4, 2.5, 1);
  // Connect to Grand Avenue
  setLine(1290, 1600, 1350, 1600, RW-4, 1);

  // Mini racetrack south of Market Road
  setArc(1650, 2150, 50, 0, Math.PI*2, 5, 1);
  // Inner grass
  setArc(1650, 2150, 30, 0, Math.PI*2, 15, 0.7);

  // Road from mini track to Bazaar
  setLine(1700, 2150, 1700, 2180, RW-5, 1);

  // Cemetery near Jungle Ruins
  setRect(2100, 2230, 2200, 2280, 1);
  // Gravestones
  for (let gi = 0; gi < 4; gi++) {
    for (let gj = 0; gj < 2; gj++) {
      setRect(2110 + gi * 22, 2240 + gj * 18, 2115 + gi * 22, 2245 + gj * 18, 1.8);
    }
  }
  // Crypt
  setRect(2180, 2240, 2198, 2270, 3);
  // Road to ruins
  setLine(2150, 2230, 2100, 2220, RW-4, 1);

  // Playground near Harbor
  setRect(1050, 1880, 1130, 1930, 1);
  // Slide
  setRamp(1060, 1890, 1060, 1910, 4, 2, 1);
  // Swing set
  setRect(1090, 1895, 1093, 1898, 2.5);
  setRect(1110, 1895, 1113, 1898, 2.5);
  // Sandbox
  setRect(1070, 1915, 1100, 1928, 0.7);

  // Waterfall off the Sky Temple east edge
  setRect(1400, 370, 1410, 380, 5);
  setRect(1400, 380, 1410, 400, 4);
  setRect(1400, 400, 1410, 420, 3);
  setRect(1400, 420, 1410, 440, 2);
  setRect(1400, 440, 1410, 460, 1);
  // Pool at base
  setRect(1390, 460, 1420, 480, 0.5);

  // Fence along Volcano lava channels
  setRect(445, 1700, 455, 1705, 1.5);
  setRect(550, 1845, 555, 1855, 1.5);
  setRect(445, 1995, 455, 2000, 1.5);

  // === DENSE SCATTER — filling blank areas ===

  // Boulders in the NW wilderness
  setRect(150, 400, 168, 418, 2);
  setRect(100, 500, 118, 518, 3);
  setRect(250, 550, 268, 568, 2.5);
  setRect(120, 650, 138, 668, 1.8);
  setRect(300, 300, 318, 318, 2.2);
  setRect(80, 350, 98, 368, 3);

  // Ruins scatter near tunnel midpoint (below the tunnel, ground level)
  setRect(700, 1230, 730, 1260, 2);
  setRect(800, 1250, 825, 1275, 1.5);
  setRect(900, 1230, 920, 1250, 2.5);
  setRect(1050, 1250, 1080, 1275, 1.8);
  setRect(1400, 1250, 1425, 1270, 2);
  setRect(1600, 1240, 1625, 1265, 2.2);
  setRect(1800, 1230, 1820, 1255, 1.5);

  // Dense trees in SW (between Volcano and coast)
  setRect(200, 1900, 218, 1918, 2);
  setRect(250, 1950, 268, 1968, 2.5);
  setRect(150, 1970, 168, 1988, 2);
  setRect(300, 1920, 318, 1938, 1.8);
  setRect(180, 2020, 198, 2038, 2.2);
  setRect(250, 2060, 268, 2078, 2);
  setRect(120, 1850, 138, 1868, 2.3);
  setRect(100, 2100, 118, 2118, 2);

  // Rock formations along Cliffside Drop (R13)
  setRect(2280, 900, 2300, 920, 4);
  setRect(2320, 1000, 2340, 1020, 3.5);
  setRect(2380, 1150, 2400, 1170, 3);
  setRect(2370, 1300, 2390, 1320, 2.5);
  setRect(2330, 1500, 2350, 1520, 4);
  setRect(2280, 1650, 2300, 1670, 3);
  setRect(2250, 1800, 2270, 1820, 3.5);

  // Suburban area south of Cloud Citadel
  setRect(2100, 650, 2140, 690, 2);
  setRect(2160, 680, 2200, 720, 1.8);
  setRect(2100, 720, 2140, 760, 2.2);
  // Gardens
  setRect(2140, 650, 2160, 690, 0.7);
  setRect(2200, 680, 2220, 720, 0.7);
  setRect(2140, 720, 2160, 760, 0.7);
  // Road through suburbs
  setLine(2100, 690, 2050, 620, RW-3, 1);

  // Temple outbuildings around Sky Temple
  setRect(1160, 250, 1190, 280, 6);
  setRect(1370, 250, 1400, 280, 6);
  setRect(1160, 430, 1190, 460, 6);
  setRect(1370, 430, 1400, 460, 6);

  // Decorative pools in Sky Temple courtyard
  setRect(1180, 310, 1220, 340, 5);
  setRect(1185, 315, 1215, 335, 4.5);
  setRect(1340, 370, 1380, 400, 5);
  setRect(1345, 375, 1375, 395, 4.5);

  // Guard towers along the tunnel (Underground Express)
  setRect(600, 1155, 615, 1170, 5);
  setRect(900, 1210, 915, 1225, 5);
  setRect(1200, 1155, 1215, 1170, 5);
  setRect(1500, 1210, 1515, 1225, 5);
  setRect(1800, 1155, 1815, 1170, 5);

  // Canyon Outpost — rope bridge detail
  // Add rope posts at bridge ends
  setRect(2138, 1378, 2145, 1385, 3.5);
  setRect(2155, 1378, 2162, 1385, 3.5);
  setRect(2138, 1415, 2145, 1422, 3.5);
  setRect(2155, 1415, 2162, 1422, 3.5);

  // Jungle Ruins — more vine pillars and broken walls
  setRect(1940, 2050, 1948, 2058, 3);
  setRect(2140, 2070, 2148, 2078, 3.5);
  setRect(1965, 2160, 1973, 2168, 3);
  setRect(2130, 2170, 2138, 2178, 4);
  // Scattered blocks (broken temple pieces)
  setRect(1985, 2030, 2000, 2045, 1.5);
  setRect(2090, 2170, 2105, 2185, 1.8);
  setRect(1960, 2120, 1975, 2135, 1.5);

  // Crystal Mines — more crystal detail
  setRect(280, 1070, 295, 1085, 4.5);
  setRect(310, 1210, 325, 1225, 6);
  setRect(385, 1090, 395, 1105, 5.5);
  setRect(215, 1210, 230, 1225, 3.5);
  // Glowing crystal cluster near center
  setRect(290, 1140, 310, 1160, 3);
  setRect(295, 1145, 305, 1155, 5);
  setRect(298, 1148, 302, 1152, 7);

  // Frozen Lake — more ice features
  setRect(380, 420, 395, 435, 1.5);
  setRect(510, 410, 525, 425, 1.5);
  setRect(420, 490, 435, 505, 1.8);
  // Frozen waterfall on south shore
  setRect(450, 555, 460, 560, 1.3);
  setRect(450, 550, 460, 555, 2);
  setRect(450, 545, 460, 550, 3);

  // Harbor Town — more dock and marina detail
  setRect(1135, 2140, 1155, 2165, 1);
  setRect(1138, 2145, 1152, 2160, 1.5);
  // Harbor crane
  setRect(1380, 2148, 1390, 2158, 5);
  setRect(1378, 2146, 1392, 2150, 5);
  // Fishing nets (low blocks)
  setRect(1330, 2145, 1345, 2155, 1.2);
  setRect(1300, 2150, 1315, 2160, 1.2);

  // Volcano — more dramatic features
  // Lava pool in crater center
  setArc(450, 1850, 25, 0, Math.PI*2, 15, 0.3);
  // Boulder ring around crater rim
  setRect(440, 1770, 460, 1790, 4);
  setRect(520, 1810, 540, 1830, 3.5);
  setRect(500, 1900, 520, 1920, 4);
  setRect(390, 1910, 410, 1930, 3.5);
  setRect(370, 1810, 390, 1830, 4);

  // More roads connecting sparse areas
  // From farm to Mineshaft road
  setLine(570, 730, 480, 850, RW-4, 1);
  // From hot springs to coastal highway
  setLine(400, 2150, 500, 2200, RW-4, 1);
  // From cemetery to beach road
  setLine(2150, 2280, 2100, 2350, RW-4, 1);
  // From suburban area to drag strip
  setLine(2150, 650, 2200, 400, RW-4, 1);

  // Final landmark: Colosseum ring near Canyon Outpost
  setArc(2350, 1600, 80, 0, Math.PI*2, RW-3, 1);
  setArc(2350, 1600, 60, 0, Math.PI*2, 5, 2);
  setArc(2350, 1600, 40, 0, Math.PI*2, 3, 3);
  // Central monument
  setRect(2345, 1595, 2355, 1605, 5);
  // Connect to Canyon Outpost
  setLine(2270, 1500, 2350, 1520, RW-4, 1);
  // Connect to Cliffside Drop
  setLine(2350, 1680, 2300, 1700, RW-4, 1);

  // === MASSIVE EXPANSION: more areas, roads, and detail ===

  // ---- HARBOR DISTRICT EXPANSION ----
  // Sports complex west of Harbor
  setRect(950, 2060, 1050, 2160, 1);
  // Tennis courts
  setRect(960, 2070, 1010, 2100, 1);
  setRect(984, 2070, 986, 2100, 1.2); // net
  // Swimming pool
  setRect(960, 2110, 1010, 2150, 0.3);
  // Pool edges
  setRect(960, 2108, 1010, 2112, 1.2);
  setRect(960, 2148, 1010, 2152, 1.2);
  setRect(958, 2110, 962, 2150, 1.2);
  setRect(1008, 2110, 1012, 2150, 1.2);
  // Diving board
  setRamp(1010, 2128, 1020, 2128, 4, 1, 2);
  // Clubhouse
  setRect(1015, 2110, 1035, 2150, 2);
  setRect(1018, 2118, 1032, 2142, 3);
  // Ice rink
  setRect(960, 2155, 1010, 2200, 0.3);
  setRect(958, 2153, 1012, 2157, 1);
  setRect(958, 2198, 1012, 2202, 1);
  setRect(958, 2155, 962, 2200, 1);
  setRect(1008, 2155, 1012, 2200, 1);

  // Warehouse district east of Harbor
  setRect(1440, 2100, 1520, 2170, 1);
  setRect(1450, 2110, 1490, 2140, 2.5);
  setRect(1455, 2115, 1485, 2135, 3.5);
  setRect(1500, 2120, 1515, 2160, 2);
  // Loading dock
  setRect(1440, 2170, 1520, 2185, 1);
  // Freight bridge
  setRamp(1470, 2100, 1470, 2080, 4, 1, 3);
  setRect(1466, 2070, 1474, 2060, 3);
  setRamp(1470, 2060, 1470, 2040, 4, 3, 1);

  // Parking garage near Harbor (multi-level)
  setRect(1430, 1930, 1500, 2000, 1);
  setRamp(1500, 1965, 1515, 1965, RW-5, 1, 2.5);
  setRect(1430, 1930, 1500, 2000, 2.5);
  setRamp(1430, 1965, 1415, 1965, RW-5, 2.5, 4);
  setRect(1430, 1930, 1500, 2000, 4);
  // Roof walls
  setRect(1430, 1928, 1500, 1932, 4.5);
  setRect(1430, 1998, 1500, 2002, 4.5);
  setRect(1428, 1930, 1432, 2000, 4.5);
  setRect(1498, 1930, 1502, 2000, 4.5);

  // Garden maze east of Harbor
  setRect(1440, 2200, 1550, 2300, 1);
  // Outer walls
  setRect(1440, 2200, 1445, 2300, 2);
  setRect(1545, 2200, 1550, 2300, 2);
  setRect(1440, 2200, 1550, 2205, 2);
  setRect(1440, 2295, 1550, 2300, 2);
  // Internal walls
  setRect(1470, 2210, 1475, 2260, 2);
  setRect(1500, 2230, 1505, 2290, 2);
  setRect(1470, 2260, 1530, 2265, 2);
  setRect(1445, 2240, 1470, 2245, 2);
  setRect(1520, 2210, 1545, 2215, 2);
  // Openings
  setRect(1445, 2220, 1470, 2230, 1);
  setRect(1475, 2270, 1500, 2280, 1);
  setRect(1505, 2250, 1520, 2260, 1);
  // Prize at center
  setRect(1490, 2245, 1500, 2255, 3);

  // ---- VOLCANO DISTRICT EXPANSION ----
  // Sulfur fields east of Volcano
  setRect(550, 1700, 700, 1800, 0.7);
  // Vent holes (very low)
  setRect(580, 1720, 600, 1740, 0.3);
  setRect(640, 1750, 660, 1770, 0.3);
  setRect(600, 1780, 620, 1795, 0.3);
  // Steam geysers (tall thin)
  setRect(588, 1728, 592, 1732, 4);
  setRect(648, 1758, 652, 1762, 5);
  setRect(608, 1785, 612, 1789, 3.5);

  // Obsidian quarry near Volcano
  setRect(300, 1700, 400, 1800, 1);
  setRect(310, 1710, 390, 1790, 0.5);
  setRect(320, 1720, 380, 1780, 0.3);
  // Quarry walls
  setRect(300, 1698, 400, 1702, 2);
  setRect(300, 1798, 400, 1802, 2);
  // Ramp into quarry
  setRamp(350, 1800, 350, 1790, 10, 1, 0.3);
  // Road to quarry
  setLine(350, 1800, 400, 1850, RW-4, 1);

  // Lava bridge — a narrow driveable path across the volcano crater
  setLine(380, 1850, 520, 1850, 4, 3);

  // Volcano temple on north rim
  setRect(420, 1740, 480, 1760, 3);
  setRect(430, 1742, 470, 1758, 4);
  setRect(440, 1745, 460, 1755, 5.5);
  // Temple stairs
  setRamp(450, 1760, 450, 1775, 6, 3, 1);

  // ---- CRYSTAL MINES EXPANSION ----
  // Second cavern chamber to the south
  setRect(250, 1260, 400, 1380, 1);
  // Crystal formations
  setRect(270, 1280, 285, 1295, 5);
  setRect(330, 1300, 345, 1315, 4.5);
  setRect(280, 1340, 295, 1355, 6);
  setRect(370, 1280, 385, 1295, 3.5);
  setRect(350, 1350, 365, 1365, 5.5);
  // Underground river (low strip)
  setLine(260, 1270, 390, 1370, 5, 0.3);
  // Bridge over underground river
  setRect(310, 1310, 340, 1330, 1.5);
  // Connecting passage from main cavern
  setRect(280, 1250, 350, 1265, 1);
  // Mine elevator shaft
  setRect(380, 1330, 395, 1345, 1);
  setRect(383, 1333, 392, 1342, 5);
  // Mine cart station
  setRect(210, 1290, 260, 1320, 1);
  setRect(220, 1295, 250, 1315, 2);

  // Third chamber — treasure vault
  setRect(100, 1280, 200, 1380, 1);
  setRect(100, 1278, 200, 1282, 4);
  setRect(100, 1378, 200, 1382, 4);
  setRect(98, 1280, 102, 1380, 4);
  setRect(198, 1280, 202, 1380, 4);
  // Giant crystal in center
  setRect(140, 1320, 160, 1340, 3);
  setRect(145, 1325, 155, 1335, 6);
  setRect(148, 1328, 152, 1332, 9);
  // Passage from second chamber
  setRect(200, 1320, 250, 1340, 1);

  // ---- FROZEN LAKE EXPANSION ----
  // Ski resort area north of lake
  setRect(350, 280, 550, 350, 1);
  // Lodge building
  setRect(400, 290, 460, 330, 2.5);
  setRect(410, 300, 450, 320, 3.5);
  // Ski lift pylons (heading toward mountain ridge)
  setRect(420, 280, 425, 285, 5);
  setRect(460, 250, 465, 255, 5.5);
  setRect(500, 220, 505, 225, 6);
  setRect(540, 190, 545, 195, 6.5);
  setRect(580, 160, 585, 165, 7);
  // Ski jump ramp
  setRamp(500, 340, 500, 300, 6, 1, 3);
  // Landing zone
  setRect(490, 350, 510, 400, 0.8);

  // Ice rink on the lake surface
  setRect(400, 440, 500, 510, 1);
  // Rink boards
  setRect(398, 438, 502, 442, 1.3);
  setRect(398, 508, 502, 512, 1.3);
  setRect(398, 440, 402, 510, 1.3);
  setRect(498, 440, 502, 510, 1.3);

  // Hot spring hidden behind ice cave
  setRect(550, 500, 610, 560, 0.5);
  // Ice cave entrance
  setRect(540, 500, 550, 560, 2);
  setRect(540, 520, 552, 540, 1);  // opening

  // ---- SKY TEMPLE EXPANSION ----
  // Grand staircase approach from south (along Grand Avenue)
  setRamp(1280, 500, 1280, 480, RW, 2.5, 5);
  // Meditation gardens flanking temple
  setRect(1160, 300, 1220, 400, 5);
  setRect(1165, 305, 1215, 395, 4.5);
  // Garden features (low blocks)
  setRect(1175, 320, 1185, 330, 4.7);
  setRect(1195, 350, 1205, 360, 4.7);
  setRect(1175, 380, 1185, 390, 4.7);
  // Right garden
  setRect(1340, 300, 1400, 400, 5);
  setRect(1345, 305, 1395, 395, 4.5);
  setRect(1355, 320, 1365, 330, 4.7);
  setRect(1375, 350, 1385, 360, 4.7);
  setRect(1355, 380, 1365, 390, 4.7);

  // Bell tower south of temple
  setRect(1280, 420, 1290, 440, 5);
  setRect(1282, 422, 1288, 438, 8);
  setRect(1283, 425, 1287, 435, 10);

  // Sacred grove east of Sky Temple
  setRect(1420, 280, 1500, 360, 5);
  // Trees in grove (elevated pillars on the platform)
  setRect(1430, 290, 1445, 305, 7);
  setRect(1460, 310, 1475, 325, 7);
  setRect(1435, 340, 1450, 355, 7);
  setRect(1480, 290, 1495, 305, 6.5);
  setRect(1475, 340, 1490, 355, 7);

  // Ancient library west of Sky Temple
  setRect(1080, 300, 1150, 380, 5);
  setRect(1085, 305, 1145, 375, 6);
  // Bookshelves (tall thin blocks inside)
  setRect(1090, 310, 1095, 370, 7);
  setRect(1105, 310, 1110, 370, 7);
  setRect(1120, 310, 1125, 370, 7);
  setRect(1135, 310, 1140, 370, 7);

  // ---- CLOUD CITADEL EXPANSION ----
  // Observatory dome
  setArc(2100, 450, 25, 0, Math.PI*2, 15, 8);
  setRect(2090, 440, 2110, 460, 9);
  setRect(2095, 445, 2105, 455, 10);
  setRect(2098, 448, 2102, 452, 12);
  // Telescope pier
  setRect(2125, 445, 2145, 455, 8);
  setRect(2130, 448, 2140, 452, 9);
  setRamp(2145, 450, 2170, 450, 5, 8, 8);

  // Cloud bridges — thin elevated walkways to far platforms
  setRect(1925, 498, 1910, 502, 8);
  setRect(1900, 490, 1920, 510, 7);
  // Far west floating platform
  setRect(1870, 470, 1910, 510, 7);
  setRect(1880, 480, 1900, 500, 8);
  // Beacon tower on far platform
  setRect(1887, 487, 1893, 493, 10);
  setRect(1889, 489, 1891, 491, 14);

  // Sky garden on south side of Cloud Citadel
  setRect(1980, 620, 2120, 680, 8);
  setRect(1985, 625, 2115, 675, 7.5);
  // Topiary blocks
  setRect(2000, 635, 2015, 650, 8.5);
  setRect(2040, 655, 2055, 670, 8.5);
  setRect(2080, 635, 2095, 650, 8.5);
  // Fountain
  setRect(2045, 640, 2055, 650, 9);
  // Ramp down from garden
  setRamp(2050, 680, 2050, 720, RW-3, 8, 1);

  // Cloud Citadel jail/dungeon (low area below main platform)
  setRect(2000, 550, 2100, 620, 6);
  // Cell walls
  setRect(2010, 560, 2015, 610, 7);
  setRect(2030, 560, 2035, 610, 7);
  setRect(2050, 560, 2055, 610, 7);
  setRect(2070, 560, 2075, 610, 7);
  // Corridor
  setRect(2000, 555, 2100, 560, 6);

  // ---- CANYON OUTPOST EXPANSION ----
  // Western approach — stone steps
  setRamp(2030, 1400, 1980, 1400, RW, 2, 1);
  // Training ground
  setRect(2060, 1440, 2140, 1500, 2);
  // Archery targets (small blocks)
  setRect(2070, 1450, 2078, 1458, 2.3);
  setRect(2070, 1470, 2078, 1478, 2.3);
  setRect(2070, 1490, 2078, 1498, 2.3);
  // Combat ring
  setArc(2110, 1470, 20, 0, Math.PI*2, 12, 2);
  setArc(2110, 1470, 22, 0, Math.PI*2, 2, 2.5);

  // Canyon floor features (below the bridge)
  setRect(2080, 1390, 2100, 1410, 0.5);
  // Bones/fossils (small raised blocks)
  setRect(2085, 1395, 2092, 1400, 0.8);
  setRect(2095, 1402, 2100, 1408, 0.8);
  // Underground river in canyon
  setLine(2060, 1400, 2240, 1400, 3, 0.3);

  // East cliff dwellings (carved into canyon wall)
  setRect(2240, 1300, 2265, 1330, 3);
  setRect(2245, 1305, 2260, 1325, 4);
  setRect(2240, 1340, 2265, 1370, 3);
  setRect(2245, 1345, 2260, 1365, 3.5);
  // Ladders between dwellings
  setRect(2250, 1330, 2255, 1340, 3);

  // Outpost marketplace
  setRect(2050, 1290, 2120, 1340, 2);
  // Stalls
  setRect(2055, 1295, 2075, 1310, 2.5);
  setRect(2080, 1295, 2100, 1310, 2.5);
  setRect(2055, 1320, 2075, 1335, 2.5);
  setRect(2080, 1320, 2100, 1335, 2.5);

  // ---- JUNGLE RUINS EXPANSION ----
  // Hidden temple behind main pyramid
  setRect(2050, 2150, 2120, 2210, 1);
  setRect(2060, 2160, 2110, 2200, 2);
  setRect(2070, 2170, 2100, 2190, 3);
  setRect(2078, 2178, 2092, 2182, 1);  // entrance
  // Treasure chamber inside
  setRect(2080, 2178, 2090, 2190, 4);

  // Jungle canopy walk (elevated boardwalk)
  setRect(1940, 2040, 2000, 2045, 3);
  setRect(2000, 2040, 2005, 2080, 3);
  setRect(2005, 2075, 2060, 2080, 3);
  // Support pillars
  setRect(1945, 2038, 1950, 2048, 3);
  setRect(1975, 2038, 1980, 2048, 3);
  setRect(2002, 2055, 2008, 2065, 3);
  setRect(2030, 2073, 2035, 2083, 3);

  // Overgrown arena
  setArc(2000, 2050, 40, 0, Math.PI*2, RW-5, 1);
  setArc(2000, 2050, 50, 0, Math.PI*2, 3, 1.5);
  setArc(2000, 2050, 60, 0, Math.PI*2, 3, 2);
  // Central altar
  setRect(1995, 2045, 2005, 2055, 2.5);

  // Totem poles scattered through jungle
  setRect(1935, 2020, 1942, 2027, 1);
  setRect(1936, 2021, 1941, 2026, 5);
  setRect(2160, 2050, 2167, 2057, 1);
  setRect(2161, 2051, 2166, 2056, 6);
  setRect(1945, 2200, 1952, 2207, 1);
  setRect(1946, 2201, 1951, 2206, 4.5);
  setRect(2155, 2200, 2162, 2207, 1);
  setRect(2156, 2201, 2161, 2206, 5.5);

  // ---- CENTRAL MAP EXPANSION ----
  // Town square at the crossroads (where Grand Ave meets cross roads)
  setRect(1200, 1350, 1360, 1450, 1);
  // Town hall
  setRect(1310, 1360, 1350, 1400, 2.5);
  setRect(1315, 1365, 1345, 1395, 3.5);
  setRect(1325, 1375, 1335, 1385, 5);
  // Market stalls in the square
  setRect(1210, 1360, 1235, 1375, 1.5);
  setRect(1245, 1360, 1270, 1375, 1.5);
  setRect(1210, 1420, 1235, 1435, 1.5);
  setRect(1245, 1420, 1270, 1435, 1.5);
  // Well
  setRect(1270, 1390, 1280, 1400, 2);
  // Flagpole
  setRect(1220, 1395, 1223, 1398, 1);
  setRect(1220, 1395, 1221, 1396, 5);

  // Residential blocks west of Grand Avenue
  setRect(1100, 1300, 1150, 1350, 1);
  setRect(1105, 1305, 1130, 1330, 2);
  setRect(1110, 1310, 1125, 1325, 2.8);
  setRect(1100, 1360, 1150, 1410, 1);
  setRect(1105, 1365, 1130, 1390, 2.2);
  setRect(1100, 1420, 1150, 1470, 1);
  setRect(1105, 1425, 1135, 1455, 2);
  setRect(1108, 1428, 1132, 1452, 2.8);
  // Gardens between houses
  setRect(1130, 1305, 1145, 1330, 0.7);
  setRect(1130, 1365, 1145, 1390, 0.7);
  setRect(1135, 1425, 1148, 1455, 0.7);
  // Road connecting residential to town square
  setLine(1150, 1380, 1200, 1400, RW-4, 1);

  // Residential blocks east of Grand Avenue
  setRect(1400, 1350, 1450, 1400, 1);
  setRect(1405, 1355, 1435, 1385, 2);
  setRect(1410, 1360, 1430, 1380, 2.5);
  setRect(1400, 1410, 1450, 1460, 1);
  setRect(1405, 1415, 1440, 1445, 2);
  setRect(1400, 1470, 1450, 1520, 1);
  setRect(1405, 1475, 1435, 1505, 2.2);
  // Gardens
  setRect(1435, 1355, 1448, 1385, 0.7);
  setRect(1440, 1415, 1448, 1445, 0.7);
  setRect(1435, 1475, 1448, 1505, 0.7);
  // Road connecting east residential to town square
  setLine(1360, 1400, 1400, 1380, RW-4, 1);

  // Hospital near town center
  setRect(1350, 1460, 1420, 1520, 1);
  setRect(1355, 1465, 1415, 1515, 2.5);
  setRect(1360, 1470, 1410, 1510, 3.5);
  // Helipad on roof
  setArc(1385, 1490, 12, 0, Math.PI*2, 6, 3.8);
  // Ambulance bay (driveable approach)
  setRect(1355, 1520, 1415, 1535, 1);
  // Road to hospital
  setLine(1385, 1535, 1400, 1600, RW-4, 1);

  // School north of residential area
  setRect(1100, 1260, 1180, 1300, 1);
  setRect(1105, 1265, 1175, 1295, 2);
  setRect(1110, 1270, 1170, 1290, 2.5);
  // Playground
  setRect(1100, 1240, 1180, 1260, 1);
  // Slide
  setRamp(1110, 1245, 1110, 1255, 4, 2, 1);
  // Swings
  setRect(1140, 1248, 1143, 1251, 2.5);
  setRect(1155, 1248, 1158, 1251, 2.5);
  // Road to school
  setLine(1140, 1260, 1270, 1280, RW-4, 1);

  // Fire station near town center
  setRect(1350, 1300, 1400, 1350, 1);
  setRect(1355, 1305, 1395, 1345, 2);
  setRect(1360, 1310, 1390, 1340, 2.8);
  // Truck bays (open front)
  setRect(1355, 1345, 1370, 1355, 1);
  setRect(1380, 1345, 1395, 1355, 1);
  // Tower
  setRect(1392, 1305, 1398, 1312, 5);

  // Police station
  setRect(1100, 1470, 1160, 1530, 1);
  setRect(1105, 1475, 1155, 1525, 2);
  setRect(1110, 1480, 1150, 1520, 2.8);
  // Radar tower
  setRect(1102, 1472, 1108, 1478, 1);
  setRect(1103, 1473, 1107, 1477, 5);

  // Church near town center
  setRect(1200, 1270, 1250, 1310, 1);
  setRect(1205, 1275, 1245, 1305, 2.5);
  setRect(1210, 1280, 1240, 1300, 3.5);
  // Steeple
  setRect(1220, 1285, 1230, 1295, 5);
  setRect(1223, 1288, 1227, 1292, 7);

  // Road network through town center
  // East-west road at j=1400
  setRect(1100, 1395, 1450, 1405, 1);
  // North-south road through east residential
  setLine(1430, 1350, 1430, 1520, RW-4, 1);

  // ---- COASTAL HIGHWAY (R12) EXPANSION ----
  // Beachside villages along the southern coast
  // Village 1: near Volcano coast exit
  setRect(500, 2230, 600, 2300, 1);
  setRect(510, 2240, 550, 2270, 2);
  setRect(515, 2245, 545, 2265, 2.8);
  setRect(560, 2250, 590, 2280, 1.8);
  setRect(565, 2255, 585, 2275, 2.5);
  // Village well
  setRect(540, 2282, 548, 2290, 2);
  // Fishing pier
  setRect(480, 2260, 500, 2310, 1);
  setRect(485, 2280, 495, 2310, 0.8);
  // Boats
  setRect(488, 2295, 493, 2305, 1.2);

  // Village 2: midpoint along coast
  setRect(1050, 2380, 1150, 2440, 1);
  setRect(1060, 2390, 1100, 2420, 2);
  setRect(1065, 2395, 1095, 2415, 2.5);
  setRect(1110, 2390, 1140, 2420, 1.8);
  setRect(1115, 2395, 1135, 2415, 2.5);
  // Market
  setRect(1060, 2425, 1080, 2438, 1.5);
  setRect(1090, 2425, 1110, 2438, 1.5);
  setRect(1120, 2425, 1140, 2438, 1.5);

  // Village 3: near Jungle Ruins coast
  setRect(1850, 2280, 1950, 2350, 1);
  setRect(1860, 2290, 1910, 2320, 2);
  setRect(1865, 2295, 1905, 2315, 2.8);
  setRect(1920, 2290, 1940, 2320, 1.8);
  setRect(1925, 2295, 1935, 2315, 2.2);
  // Watchtower
  setRect(1940, 2280, 1950, 2290, 1);
  setRect(1942, 2282, 1948, 2288, 4);

  // Jump ramps along coastal highway
  setRamp(700, 2320, 730, 2330, RW, 1, 2.5);
  setRamp(1300, 2400, 1330, 2395, RW, 1, 2.5);
  setRamp(1700, 2310, 1730, 2305, RW, 1, 2.5);

  // Palm trees along coastal highway
  setRect(550, 2220, 558, 2228, 3);
  setRect(750, 2340, 758, 2348, 2.5);
  setRect(950, 2370, 958, 2378, 3.5);
  setRect(1200, 2420, 1208, 2428, 3);
  setRect(1500, 2400, 1508, 2408, 2.5);
  setRect(1700, 2320, 1708, 2328, 3);
  setRect(1950, 2300, 1958, 2308, 2.5);

  // Wind turbines
  setRect(800, 2350, 806, 2356, 1);
  setRect(802, 2352, 804, 2354, 7);
  setRect(1350, 2410, 1356, 2416, 1);
  setRect(1352, 2412, 1354, 2414, 7);
  setRect(1900, 2350, 1906, 2356, 1);
  setRect(1902, 2352, 1904, 2354, 6);

  // ---- CLIFFSIDE DROP (R13) EXPANSION ----
  // Watchtower ruins along the cliff
  setRect(2310, 850, 2325, 865, 4);
  setRect(2350, 1050, 2365, 1065, 3.5);
  setRect(2340, 1250, 2355, 1265, 3);
  setRect(2310, 1450, 2325, 1465, 4);
  setRect(2280, 1600, 2295, 1615, 3.5);

  // Scenic viewpoints (flat platforms jutting out)
  setRect(2350, 950, 2400, 980, 1);
  setRect(2355, 955, 2395, 975, 2);
  setRect(2370, 960, 2390, 970, 3);

  setRect(2380, 1200, 2430, 1230, 1);
  setRect(2385, 1205, 2425, 1225, 2);
  setRect(2400, 1210, 2420, 1220, 3);

  // Rope bridge across a gap in the cliff road
  setRect(2290, 1550, 2310, 1560, 1);
  // Gap (tiles removed — exciting!)
  setRect(2310, 1545, 2330, 1565, 0);
  // Landing
  setRect(2330, 1550, 2350, 1560, 1);

  // Cave entrance in cliffside
  setRect(2400, 1350, 2450, 1400, 1);
  setRect(2400, 1348, 2450, 1352, 3);
  setRect(2400, 1398, 2450, 1402, 3);
  setRect(2448, 1350, 2452, 1400, 3);
  // Cave interior (hidden room)
  setRect(2450, 1360, 2530, 1390, 1);
  setRect(2450, 1358, 2530, 1362, 4);
  setRect(2450, 1388, 2530, 1392, 4);
  setRect(2528, 1360, 2532, 1390, 4);
  // Treasure in cave
  setRect(2500, 1370, 2520, 1385, 2);
  setRect(2505, 1375, 2515, 1380, 3);

  // ---- FAR EAST HIGHWAY EXPANSION ----
  // Industrial zone along east highway
  setRect(2450, 1000, 2550, 1100, 1);
  // Factory buildings
  setRect(2460, 1010, 2510, 1050, 2.5);
  setRect(2465, 1015, 2505, 1045, 3.5);
  setRect(2520, 1020, 2545, 1060, 3);
  setRect(2525, 1025, 2540, 1055, 4);
  // Smokestacks
  setRect(2470, 1015, 2476, 1021, 6);
  setRect(2530, 1030, 2536, 1036, 7);
  // Loading area
  setRect(2460, 1060, 2545, 1080, 1);
  // Cargo containers
  setRect(2465, 1065, 2485, 1075, 1.8);
  setRect(2490, 1065, 2510, 1075, 2);
  setRect(2515, 1065, 2535, 1075, 1.8);
  // Road to factory
  setLine(2450, 1050, 2400, 1200, RW-3, 1);

  // Train station near factory
  setRect(2430, 1100, 2470, 1150, 1);
  setRect(2435, 1105, 2465, 1140, 2);
  // Platform
  setRect(2470, 1100, 2550, 1115, 1.5);
  // Train tracks (thin elevated lines)
  setRect(2480, 1110, 2540, 1113, 1.7);
  // Train cars (blocks on tracks)
  setRect(2485, 1108, 2505, 1115, 2);
  setRect(2510, 1108, 2530, 1115, 2);

  // Power plant north of factory
  setRect(2480, 900, 2550, 980, 1);
  // Cooling towers
  setArc(2500, 930, 15, 0, Math.PI*2, 8, 1);
  setRect(2492, 922, 2508, 938, 5);
  setArc(2535, 950, 12, 0, Math.PI*2, 6, 1);
  setRect(2528, 943, 2542, 957, 6);
  // Smokestack
  setRect(2480, 970, 2485, 975, 1);
  setRect(2481, 971, 2484, 974, 8);

  // ---- NE WILDERNESS ----
  // Dense forest between Cloud Citadel and drag strip
  setRect(2000, 250, 2020, 270, 2);
  setRect(2050, 280, 2070, 300, 2.5);
  setRect(1950, 300, 1970, 320, 2);
  setRect(2080, 250, 2100, 270, 2.2);
  setRect(1980, 350, 2000, 370, 2);
  setRect(2060, 340, 2080, 360, 2.3);
  setRect(2020, 380, 2040, 400, 1.8);
  setRect(1960, 250, 1978, 268, 2);
  setRect(2030, 310, 2048, 328, 2.5);
  setRect(1990, 380, 2008, 398, 2);

  // Hiking trail through NE forest
  setLine(2000, 300, 2050, 350, RW-5, 1);
  setLine(2050, 350, 2020, 400, RW-5, 1);
  setLine(2020, 400, 2100, 300, RW-5, 1);

  // Treehouse in NE forest
  setRect(2025, 320, 2050, 345, 3);
  // Rope bridge to nearby tree
  setLine(2050, 335, 2070, 345, 2, 3);
  // Ladder
  setRamp(2035, 345, 2035, 360, 3, 1, 3);

  // Mountain lake between drag strip and forest
  setRect(1800, 200, 1950, 300, 0.5);
  setArc(1875, 250, 60, 0, Math.PI*2, 40, 0.5);
  // Shore
  setArc(1875, 250, 65, 0, Math.PI*2, 5, 0.8);
  // Road around lake
  setArc(1875, 250, 75, 0, Math.PI*2, 4, 1);
  // Boathouse
  setRect(1820, 245, 1845, 265, 1.5);
  setRect(1825, 248, 1840, 262, 2.5);
  // Road from lake to drag strip
  setLine(1875, 300, 1875, 200+RW, RW-4, 1);

  // ---- SW WILDERNESS ----
  // Ancient ruins between Volcano and coast
  setRect(200, 2150, 280, 2230, 1);
  // Crumbled walls
  setRect(200, 2150, 210, 2230, 2);
  setRect(270, 2150, 280, 2210, 2);
  setRect(200, 2150, 260, 2160, 2);
  // Intact tower
  setRect(220, 2180, 240, 2200, 3);
  setRect(225, 2185, 235, 2195, 5);

  // Ritual stone circle
  (function() {
    const scx = 200, scy = 2000, sr = 35;
    for (let si = 0; si < 8; si++) {
      const a = si * Math.PI * 2 / 8;
      const sx = Math.round(scx + Math.cos(a) * sr);
      const sy = Math.round(scy + Math.sin(a) * sr);
      setRect(sx - 3, sy - 3, sx + 3, sy + 3, 4);
    }
  })();
  // Central dolmen
  setRect(195, 1995, 205, 2005, 2);
  setRect(197, 1997, 203, 2003, 6);

  // Mangrove swamp south of hot springs
  setRect(250, 2200, 400, 2350, 0.5);
  // Mangrove trees (pillars in water)
  setRect(270, 2220, 280, 2230, 2);
  setRect(310, 2250, 320, 2260, 2.5);
  setRect(350, 2230, 360, 2240, 2);
  setRect(290, 2290, 300, 2300, 2.2);
  setRect(370, 2280, 380, 2290, 2);
  setRect(330, 2310, 340, 2320, 2.5);
  setRect(280, 2340, 290, 2350, 2);
  setRect(360, 2330, 370, 2340, 2);
  // Boardwalk through mangrove
  setLine(260, 2210, 390, 2340, 4, 1);

  // ---- MID-MAP EXPANSION ----
  // University campus between town center and park
  setRect(1450, 1550, 1550, 1650, 1);
  // Main building
  setRect(1460, 1560, 1520, 1610, 2.5);
  setRect(1465, 1565, 1515, 1605, 3.5);
  // Library wing
  setRect(1520, 1570, 1545, 1620, 2.5);
  setRect(1525, 1575, 1540, 1615, 3);
  // Courtyard
  setRect(1470, 1620, 1530, 1645, 1);
  // Statue
  setRect(1495, 1628, 1505, 1638, 2.5);
  // Clock tower
  setRect(1458, 1558, 1465, 1565, 1);
  setRect(1459, 1559, 1464, 1564, 5);
  setRect(1460, 1560, 1463, 1563, 7);
  // Road from university to town center
  setLine(1450, 1600, 1430, 1520, RW-4, 1);
  // Road from university to figure-8
  setLine(1475, 1550, 1450, 1600, RW-4, 1);

  // Botanical garden south of town
  setRect(1100, 1550, 1200, 1650, 1);
  // Greenhouse (glass-like structure — tall with interior)
  setRect(1110, 1560, 1160, 1600, 1);
  setRect(1110, 1558, 1160, 1562, 2.5);
  setRect(1110, 1598, 1160, 1602, 2.5);
  setRect(1108, 1560, 1112, 1600, 2.5);
  setRect(1158, 1560, 1162, 1600, 2.5);
  // Interior plants
  setRect(1120, 1570, 1130, 1580, 2);
  setRect(1140, 1580, 1150, 1590, 2);
  // Walking paths
  setArc(1150, 1625, 30, 0, Math.PI*2, 3, 1);
  // Pond
  setArc(1150, 1625, 15, 0, Math.PI*2, 8, 0.5);
  // Topiary
  setRect(1105, 1610, 1115, 1620, 1.8);
  setRect(1185, 1610, 1195, 1620, 1.8);
  setRect(1105, 1640, 1115, 1650, 1.8);
  setRect(1185, 1640, 1195, 1650, 1.8);
  // Road to botanical garden
  setLine(1150, 1550, 1270, 1500, RW-4, 1);

  // Train tracks running west-east through town
  setRect(800, 1498, 1700, 1502, 1.5);
  // Support ties
  for (let ti = 820; ti <= 1680; ti += 20) {
    setRect(ti, 1495, ti + 5, 1505, 1.7);
  }
  // Train station in town
  setRect(1200, 1480, 1260, 1500, 1);
  setRect(1205, 1482, 1255, 1498, 2);
  // Platform
  setRect(1200, 1500, 1260, 1510, 1.3);
  // Train (blocks on tracks)
  setRect(1270, 1496, 1300, 1504, 2);
  setRect(1305, 1496, 1330, 1504, 2);
  setRect(1335, 1496, 1360, 1504, 2);

  // Bridge where train tracks cross Grand Avenue
  setRect(1268, 1495, 1292, 1505, 2.5);

  // ---- DRAG STRIP EXPANSION ----
  // Starting area — wide platform
  setRect(2080, 280, 2120, 330, 1);
  // Starting grid positions
  setRect(2085, 295, 2095, 305, 1.15);
  setRect(2085, 310, 2095, 320, 1.15);
  setRect(2105, 295, 2115, 305, 1.15);
  setRect(2105, 310, 2115, 320, 1.15);
  // Starting light tower
  setRect(2095, 280, 2105, 285, 1);
  setRect(2097, 282, 2103, 284, 5);
  // Grandstands along drag strip
  setRect(2150, 275, 2350, 290, 1.5);
  setRect(2150, 270, 2350, 278, 2);
  setRect(2150, 265, 2350, 270, 2.5);
  // South grandstands
  setRect(2150, 325, 2350, 340, 1.5);
  setRect(2150, 338, 2350, 346, 2);
  setRect(2150, 344, 2350, 350, 2.5);
  // Mega ramp at midpoint
  setRamp(2300, 300, 2340, 300, RW, 1, 3.5);
  // Gap (no tiles from 2340 to 2380)
  for (let i = 2341; i < 2380; i++)
    for (let j = 300 - RW; j <= 300 + RW; j++) setTile(i, j, 0);
  // Landing ramp
  setRamp(2380, 300, 2400, 300, RW, 2, 1);
  // Finish area
  setRect(2480, 280, 2520, 330, 1);
  // Timing tower
  setRect(2510, 280, 2520, 290, 1);
  setRect(2512, 282, 2518, 288, 4);
  // Spectator parking
  setRect(2150, 230, 2350, 260, 1);
  // Parked cars
  for (let pc = 2160; pc < 2340; pc += 30) {
    setRect(pc, 240, pc + 15, 255, 1.3);
  }
  // Pit garages
  setRect(2100, 335, 2140, 365, 1.5);
  setRect(2105, 340, 2115, 355, 2);
  setRect(2125, 340, 2135, 355, 2);
  // Connect drag strip to Cloud Citadel approach road
  setLine(2100, 330, 2100, 400, RW-4, 1);

  // ---- PARK EXPANSION ----
  // Zen garden in the park
  setRect(1550, 1450, 1630, 1530, 1);
  setRect(1555, 1455, 1625, 1525, 0.7);
  // Raked sand patterns (tiny bumps in rows)
  for (let zi = 1560; zi < 1620; zi += 8) {
    setRect(zi, 1460, zi + 2, 1520, 0.8);
  }
  // Meditation stones
  setRect(1580, 1480, 1590, 1490, 1.3);
  setRect(1600, 1500, 1610, 1510, 1.3);
  // Bamboo fence
  setRect(1550, 1448, 1630, 1452, 1.5);
  setRect(1550, 1528, 1630, 1532, 1.5);
  setRect(1548, 1450, 1552, 1530, 1.5);
  setRect(1628, 1450, 1632, 1530, 1.5);

  // Sports fields in park
  setRect(1650, 1420, 1700, 1480, 1);
  // Soccer goals
  setRect(1650, 1445, 1653, 1455, 1.5);
  setRect(1697, 1445, 1700, 1455, 1.5);
  // Running track
  setArc(1675, 1550, 60, 0, Math.PI*2, 4, 1);
  // Bleachers
  setRect(1740, 1530, 1750, 1570, 1.3);
  setRect(1748, 1530, 1755, 1570, 1.6);

  // Dog park
  setRect(1530, 1540, 1600, 1580, 1);
  setRect(1530, 1538, 1600, 1542, 1.2);
  setRect(1530, 1578, 1600, 1582, 1.2);
  setRect(1528, 1540, 1532, 1580, 1.2);
  setRect(1598, 1540, 1602, 1580, 1.2);
  // Obstacles inside
  setRect(1550, 1555, 1560, 1565, 1.5);
  setRect(1575, 1548, 1585, 1558, 1.5);

  // Skate park near the stadium
  setRect(820, 2300, 900, 2380, 0.5);
  // Quarter pipes
  setRamp(820, 2340, 835, 2340, 25, 0.5, 2.5);
  setRamp(900, 2340, 885, 2340, 25, 0.5, 2.5);
  setRamp(860, 2300, 860, 2315, 25, 0.5, 2.5);
  setRamp(860, 2380, 860, 2365, 25, 0.5, 2.5);
  // Central box
  setRect(850, 2330, 870, 2350, 1.5);
  // Rail
  setRect(835, 2340, 885, 2342, 1);
  // Connect to stadium
  setLine(900, 2340, 900, 2350, RW-5, 1);

  // ---- FARM EXPANSION ----
  // Orchard east of barn
  setRect(600, 630, 700, 710, 0.7);
  for (let oi = 610; oi < 700; oi += 25) {
    for (let oj = 640; oj < 710; oj += 25) {
      setRect(oi, oj, oi + 8, oj + 8, 2);
    }
  }
  // Farmhouse
  setRect(580, 720, 610, 750, 2);
  setRect(585, 725, 605, 745, 3);
  // Chicken coop
  setRect(615, 740, 640, 755, 1.5);
  // Fence around farmyard
  setRect(510, 708, 640, 712, 1.2);
  setRect(510, 756, 640, 760, 1.2);
  setRect(508, 710, 512, 758, 1.2);
  setRect(638, 710, 642, 758, 1.2);
  // Pond near farm
  setRect(530, 760, 580, 800, 0.5);
  setArc(555, 780, 20, 0, Math.PI*2, 12, 0.5);
  // Ducks (tiny blocks)
  setRect(545, 775, 548, 778, 0.8);
  setRect(560, 780, 563, 783, 0.8);
  setRect(555, 770, 558, 773, 0.8);

  // Vineyard south of farm
  setRect(500, 800, 650, 880, 0.7);
  for (let vi = 510; vi < 640; vi += 15) {
    setRect(vi, 810, vi + 3, 870, 0.9);
  }
  // Winery
  setRect(500, 880, 550, 920, 2);
  setRect(505, 885, 545, 915, 2.8);
  // Wine cellar (lower than ground)
  setRect(510, 920, 540, 950, 0.5);

  // ---- ADDITIONAL ROADS ----
  // Ring road connecting all outer nodes (going clockwise)
  // Harbor -> Jungle Ruins (via Market Road, already done)
  // Jungle Ruins -> Canyon Outpost (via Overgrown Trail, already done)
  // Canyon Outpost -> Cloud Citadel (via Thunderpath reverse, already done)
  // Cloud Citadel -> Sky Temple (via Skybridge, already done)
  // Sky Temple -> Frozen Lake (via Frost Highway, already done)
  // Frozen Lake -> Crystal Mines (via Mineshaft, already done)
  // Crystal Mines -> Volcano (via Lava Tubes, already done)
  // Volcano -> Harbor (via Coastal Cliffs, already done)
  // Good! The ring is complete!

  // Inner ring road (shorter loop through town center)
  setArc(1280, 1400, 180, 0, Math.PI*2, RW-4, 1);

  // Cross roads through the inner ring
  // NW diagonal
  setLine(1100, 1220, 800, 800, RW-4, 1);
  // NE diagonal
  setLine(1460, 1220, 1800, 800, RW-4, 1);
  // SW diagonal
  setLine(1100, 1580, 700, 1800, RW-4, 1);
  // SE diagonal
  setLine(1460, 1580, 1800, 1900, RW-4, 1);

  // ---- MARSH EXPANSION ----
  // More detail in the marsh area
  setRect(750, 1850, 850, 1930, 0.5);
  // Raised boardwalk on stilts
  setRect(760, 1860, 840, 1865, 1.5);
  setRect(760, 1910, 840, 1915, 1.5);
  setRect(758, 1860, 762, 1920, 1.5);
  setRect(838, 1860, 842, 1920, 1.5);
  // Stilt houses
  setRect(770, 1870, 795, 1895, 0.5);
  setRect(773, 1873, 792, 1892, 2);
  setRect(810, 1875, 835, 1900, 0.5);
  setRect(813, 1878, 832, 1897, 2);
  // Fishing dock
  setRect(835, 1895, 860, 1905, 1);
  setRect(840, 1900, 855, 1910, 0.8);

  // ---- HOT SPRINGS EXPANSION ----
  // Individual hot spring pools
  setArc(340, 2080, 12, 0, Math.PI*2, 6, 0.5);
  setArc(380, 2110, 15, 0, Math.PI*2, 8, 0.5);
  setArc(420, 2080, 10, 0, Math.PI*2, 5, 0.5);
  setArc(360, 2130, 12, 0, Math.PI*2, 6, 0.5);
  // Mineral deposits (colored bumps)
  setRect(320, 2095, 328, 2103, 0.8);
  setRect(400, 2065, 408, 2073, 0.8);
  setRect(440, 2095, 448, 2103, 0.8);
  // Bathing pavilion
  setRect(380, 2060, 420, 2075, 1);
  setRect(385, 2062, 415, 2073, 2);
  // Changing rooms
  setRect(310, 2050, 340, 2065, 2);

  // ---- COLOSSEUM RING EXPANSION ----
  // Add seating tiers
  setArc(2350, 1600, 90, 0, Math.PI*2, 3, 2.5);
  setArc(2350, 1600, 100, 0, Math.PI*2, 3, 3);
  // Gates at cardinal points
  setRect(2345, 1515, 2355, 1525, 1);
  setRect(2345, 1675, 2355, 1685, 1);
  setRect(2265, 1595, 2275, 1605, 1);
  setRect(2425, 1595, 2435, 1605, 1);
  // Champion statue
  setRect(2346, 1596, 2354, 1604, 4);
  setRect(2348, 1598, 2352, 1602, 6);
  // Armory building nearby
  setRect(2400, 1520, 2440, 1560, 1);
  setRect(2405, 1525, 2435, 1555, 2.5);
  setRect(2410, 1530, 2430, 1550, 3.5);
  // Training dummies
  setRect(2410, 1565, 2415, 1570, 2);
  setRect(2425, 1565, 2430, 1570, 2);

  // ---- BEACH EXPANSION ----
  // Surfboard rental (small shack)
  setRect(2310, 2270, 2340, 2290, 1.5);
  setRect(2315, 2275, 2335, 2285, 2);
  // Beach volleyball court
  setRect(2350, 2400, 2420, 2440, 0.5);
  setRect(2384, 2400, 2386, 2440, 1);  // net
  // Lifeguard tower
  setRect(2340, 2380, 2350, 2390, 1);
  setRect(2342, 2382, 2348, 2388, 3);
  // More beach umbrellas
  setRect(2370, 2360, 2375, 2365, 1.5);
  setRect(2400, 2380, 2405, 2385, 1.5);
  setRect(2430, 2360, 2435, 2365, 1.5);
  setRect(2350, 2380, 2355, 2385, 1.5);
  // Tiki bar
  setRect(2280, 2310, 2310, 2330, 1);
  setRect(2285, 2315, 2305, 2325, 2);
  // Bar stools
  setRect(2288, 2312, 2292, 2316, 1.5);
  setRect(2298, 2312, 2302, 2316, 1.5);

  // Coral reef (low bumpy structures in the sea, far SE)
  setRect(2480, 2480, 2500, 2500, 0.3);
  setRect(2490, 2470, 2510, 2490, 0.4);
  setRect(2500, 2490, 2520, 2510, 0.3);
  setRect(2510, 2480, 2530, 2495, 0.5);
  setRect(2520, 2500, 2540, 2520, 0.4);
  // Taller coral
  setRect(2495, 2485, 2502, 2492, 1.2);
  setRect(2515, 2495, 2522, 2502, 1);

  // ---- EVEN MORE SCATTER ----

  // Cemetery chapel expansion
  setRect(2105, 2250, 2125, 2270, 2.5);
  setRect(2108, 2253, 2122, 2267, 3.5);
  setRect(2113, 2258, 2117, 2262, 5);
  // More graves
  for (let gi = 0; gi < 6; gi++) {
    for (let gj = 0; gj < 3; gj++) {
      setRect(2110 + gi * 15, 2235 + gj * 12, 2113 + gi * 15, 2238 + gj * 12, 1.8);
    }
  }
  // Iron fence
  setRect(2100, 2228, 2200, 2232, 1.5);
  setRect(2100, 2278, 2200, 2282, 1.5);
  setRect(2098, 2230, 2102, 2280, 1.5);
  setRect(2198, 2230, 2202, 2280, 1.5);

  // Abandoned mine entrance near Crystal Mines
  setRect(150, 1100, 190, 1150, 1);
  // Mine shaft entrance (dark opening)
  setRect(155, 1110, 185, 1140, 0.3);
  // Mine cart tracks leading in
  setLine(190, 1125, 200, 1125, 2, 1.2);
  // Old mine buildings
  setRect(120, 1060, 160, 1090, 2);
  setRect(125, 1065, 155, 1085, 2.8);
  // Ore piles
  setRect(165, 1070, 180, 1085, 1.5);
  setRect(170, 1075, 178, 1083, 1.8);

  // Ancient aqueduct ruin between Frozen Lake and Sky Temple
  // Stone arches at intervals
  for (let ai = 600; ai <= 1100; ai += 60) {
    setRect(ai, 390, ai + 8, 395, 3);
    setRect(ai, 405, ai + 8, 410, 3);
  }
  // Fallen aqueduct section (rubble)
  setRect(780, 395, 840, 405, 1.5);
  setRect(790, 398, 830, 402, 0.8);

  // More NW forest detail
  // Mushroom ring
  (function() {
    const mcx = 300, mcy = 600, mr = 15;
    for (let mi = 0; mi < 6; mi++) {
      const a = mi * Math.PI * 2 / 6;
      const mx = Math.round(mcx + Math.cos(a) * mr);
      const my = Math.round(mcy + Math.sin(a) * mr);
      setRect(mx - 1, my - 1, mx + 1, my + 1, 1.3);
    }
  })();

  // Hermit's cabin deep in forest
  setRect(180, 680, 210, 710, 1);
  setRect(183, 683, 207, 707, 2);
  setRect(186, 686, 204, 704, 2.5);
  // Smoke from chimney (thin pillar)
  setRect(200, 686, 204, 690, 3.5);

  // Ruins of old bridge near creek
  setRect(370, 850, 390, 860, 1.5);
  setRect(410, 850, 430, 860, 1.5);
  // Fallen stones in creek
  setRect(390, 852, 410, 858, 0.5);

  // Watermill by the creek
  setRect(330, 950, 370, 990, 1);
  setRect(335, 955, 365, 985, 2);
  // Water wheel
  setArc(330, 970, 15, 0, Math.PI*2, 2, 1.5);
  setRect(328, 968, 332, 972, 3);

  // ---- INTERIOR DETAIL BETWEEN NODES ----

  // Abandoned train station along the train tracks
  setRect(900, 1480, 960, 1510, 1);
  setRect(905, 1482, 955, 1498, 2);
  // Platform
  setRect(900, 1500, 960, 1510, 1.3);
  // Rusted train
  setRect(965, 1496, 990, 1504, 1.8);

  // Water tower near train tracks
  setRect(1000, 1480, 1010, 1490, 1);
  setRect(1002, 1482, 1008, 1488, 4);
  setRect(1000, 1478, 1010, 1482, 4.5);

  // Old factory near train tracks
  setRect(1050, 1460, 1100, 1500, 1);
  setRect(1055, 1465, 1095, 1495, 2.5);
  setRect(1060, 1470, 1090, 1490, 3);
  // Smokestack
  setRect(1055, 1465, 1060, 1470, 5);

  // Wind farm north of coastal highway
  for (let wfi = 0; wfi < 5; wfi++) {
    const wx = 600 + wfi * 150;
    const wy = 2180 + (wfi % 2) * 40;
    setRect(wx, wy, wx + 5, wy + 5, 1);
    setRect(wx + 1, wy + 1, wx + 4, wy + 4, 6);
  }

  // Lighthouse on the NW coast (near castle)
  setRect(80, 300, 100, 320, 1);
  setRect(85, 305, 95, 315, 4);
  setRect(87, 307, 93, 313, 7);

  // Fishing village on NW coast
  setRect(50, 350, 150, 420, 1);
  setRect(60, 360, 90, 390, 2);
  setRect(65, 365, 85, 385, 2.5);
  setRect(100, 370, 130, 400, 1.8);
  setRect(105, 375, 125, 395, 2.5);
  // Fishing docks
  setRect(50, 420, 70, 460, 1);
  setRect(80, 430, 100, 470, 1);
  // Boats
  setRect(55, 440, 65, 455, 1.3);
  setRect(85, 445, 95, 460, 1.3);
  // Road to castle
  setLine(100, 400, 200, 270, RW-4, 1);
  // Road south along coast
  setLine(80, 460, 100, 700, RW-4, 1);

  // Shipyard south of fishing village
  setRect(50, 500, 150, 580, 1);
  // Ship hulls under construction
  setRect(60, 510, 100, 550, 1);
  setRect(65, 520, 95, 540, 1.5);
  setRect(70, 525, 90, 535, 2);
  // Crane
  setRect(110, 520, 118, 528, 5);
  setRect(108, 518, 120, 522, 5);
  // Lumber piles
  setRect(115, 550, 140, 570, 1.5);
  setRect(120, 555, 135, 565, 2);

  // West coast road (connecting NW coast to Volcano area)
  setLine(100, 700, 150, 1000, RW-3, 1);
  setLine(150, 1000, 200, 1050, RW-3, 1);

  // Tidal pools along west coast
  setRect(60, 750, 100, 790, 0.3);
  setRect(50, 850, 90, 890, 0.3);
  setRect(70, 950, 110, 980, 0.3);
  // Rock formations near tidal pools
  setRect(100, 760, 115, 775, 2);
  setRect(90, 870, 105, 885, 2.5);
  setRect(110, 960, 125, 975, 2);

  // Sea stack off west coast
  setRect(30, 800, 55, 825, 0.5);
  setRect(35, 805, 50, 820, 2);
  setRect(38, 808, 47, 817, 4);

  // ---- FAR SOUTH EXPANSION ----
  // Tidal flats along south coast
  setRect(500, 2400, 700, 2500, 0.3);
  setRect(750, 2420, 900, 2500, 0.3);
  // Sand bars
  setRect(550, 2420, 600, 2450, 0.5);
  setRect(650, 2440, 700, 2470, 0.5);
  setRect(800, 2440, 850, 2470, 0.5);
  // Shore birds (tiny dots)
  setRect(560, 2430, 563, 2433, 0.6);
  setRect(580, 2440, 583, 2443, 0.6);
  setRect(660, 2450, 663, 2453, 0.6);
  setRect(810, 2450, 813, 2453, 0.6);

  // Abandoned fort on south coast
  setRect(1100, 2440, 1200, 2520, 1);
  // Walls
  setRect(1100, 2440, 1110, 2520, 3);
  setRect(1190, 2440, 1200, 2520, 3);
  setRect(1100, 2440, 1200, 2450, 3);
  setRect(1100, 2510, 1200, 2520, 3);
  // Corner towers
  setRect(1100, 2440, 1115, 2455, 5);
  setRect(1185, 2440, 1200, 2455, 5);
  setRect(1100, 2505, 1115, 2520, 5);
  setRect(1185, 2505, 1200, 2520, 5);
  // Courtyard floor
  setRect(1111, 2451, 1189, 2509, 1);
  // Gate opening (south wall)
  setRect(1140, 2510, 1160, 2520, 1);
  // Keep
  setRect(1135, 2465, 1165, 2495, 2.5);
  setRect(1140, 2470, 1160, 2490, 4);
  setRect(1145, 2475, 1155, 2485, 6);
  // Road from fort to coastal highway
  setLine(1150, 2440, 1150, 2410, RW-4, 1);

  // Port town on far south coast
  setRect(1400, 2420, 1550, 2520, 1);
  // Warehouses
  setRect(1410, 2430, 1460, 2470, 2.5);
  setRect(1415, 2435, 1455, 2465, 3);
  setRect(1470, 2440, 1510, 2480, 2);
  setRect(1475, 2445, 1505, 2475, 2.8);
  // Harbor crane
  setRect(1520, 2450, 1530, 2460, 5);
  setRect(1518, 2448, 1532, 2452, 5);
  // Piers
  setRect(1410, 2480, 1430, 2520, 1);
  setRect(1450, 2490, 1470, 2520, 1);
  setRect(1500, 2480, 1520, 2520, 1);
  // Ships at piers
  setRect(1415, 2500, 1425, 2515, 1.3);
  setRect(1455, 2500, 1465, 2515, 1.5);
  setRect(1505, 2495, 1515, 2515, 1.3);
  // Custom house
  setRect(1530, 2430, 1545, 2460, 2.5);
  setRect(1533, 2435, 1542, 2455, 3.5);
  // Road to coastal highway
  setLine(1480, 2420, 1480, 2400, RW-4, 1);
  // Road from port to Market Road
  setLine(1500, 2420, 1700, 2200, RW-4, 1);

  // ---- MISC LANDMARKS ----
  // Giant tree in center-west area
  setRect(850, 1300, 870, 1320, 1);
  setRect(853, 1303, 867, 1317, 3);
  setRect(856, 1306, 864, 1314, 5);
  setRect(858, 1308, 862, 1312, 8);
  // Canopy spread
  setRect(840, 1290, 880, 1330, 3);

  // Gravity anomaly zone (floating blocks at various heights)
  setRect(1600, 800, 1620, 820, 3);
  setRect(1640, 790, 1660, 810, 5);
  setRect(1620, 830, 1640, 850, 4);
  setRect(1660, 820, 1680, 840, 6);
  setRect(1580, 810, 1600, 830, 2);
  setRect(1640, 850, 1660, 870, 3.5);
  setRect(1600, 870, 1620, 890, 2);
  setRect(1680, 800, 1700, 820, 4);
  // Connecting thin bridges
  setLine(1620, 810, 1640, 800, 2, 4);
  setLine(1640, 820, 1620, 840, 2, 4);
  setLine(1660, 830, 1680, 810, 2, 5);
  // Road approaching anomaly zone
  setLine(1600, 890, 1500, 1000, RW-4, 1);

  // Ruins of ancient civilization near tunnel midpoint
  setRect(1000, 1140, 1050, 1170, 1);
  // Crumbled walls
  setRect(1000, 1140, 1005, 1170, 2);
  setRect(1045, 1140, 1050, 1160, 2);
  setRect(1000, 1140, 1030, 1145, 2);
  // Mosaic floor (subtle bump pattern)
  for (let mi = 1005; mi < 1045; mi += 8) {
    for (let mj = 1145; mj < 1168; mj += 8) {
      setRect(mi, mj, mi + 3, mj + 3, 1.1);
    }
  }
  // Obelisk
  setRect(1020, 1150, 1030, 1160, 1);
  setRect(1022, 1152, 1028, 1158, 4);
  setRect(1024, 1154, 1026, 1156, 7);

  // Signal tower near the overpass
  setRect(1300, 1180, 1305, 1185, 1);
  setRect(1301, 1181, 1304, 1184, 6);

  // Bus depot near Harbor
  setRect(1060, 1930, 1130, 1960, 1);
  // Bus shelters
  setRect(1065, 1935, 1085, 1950, 2);
  setRect(1095, 1935, 1115, 1950, 2);
  // Buses (long blocks)
  setRect(1070, 1950, 1080, 1965, 1.5);
  setRect(1100, 1950, 1110, 1965, 1.5);

  // Memorial park near town center
  setRect(1320, 1450, 1370, 1480, 1);
  // War memorial (tall narrow block)
  setRect(1340, 1458, 1350, 1468, 1);
  setRect(1342, 1460, 1348, 1466, 5);
  setRect(1344, 1462, 1346, 1464, 8);
  // Eternal flame
  setRect(1343, 1470, 1347, 1474, 2);
  // Benches
  setRect(1325, 1455, 1335, 1460, 1.3);
  setRect(1355, 1455, 1365, 1460, 1.3);

  // Gazebo in park
  setRect(1660, 1480, 1690, 1510, 1);
  setRect(1665, 1485, 1685, 1505, 1);
  setRect(1670, 1490, 1680, 1500, 2.5);
  // Columns
  setRect(1662, 1482, 1665, 1485, 2.5);
  setRect(1687, 1482, 1690, 1485, 2.5);
  setRect(1662, 1507, 1665, 1510, 2.5);
  setRect(1687, 1507, 1690, 1510, 2.5);

  // Guard posts along Underground Express
  setRect(700, 1165, 715, 1180, 1);
  setRect(703, 1168, 712, 1177, 3);
  setRect(1000, 1165, 1015, 1180, 1);
  setRect(1003, 1168, 1012, 1177, 3);
  setRect(1400, 1165, 1415, 1180, 1);
  setRect(1403, 1168, 1412, 1177, 3);
  setRect(1700, 1165, 1715, 1180, 1);
  setRect(1703, 1168, 1712, 1177, 3);

  // Refugee camp near town center outskirts
  setRect(1450, 1250, 1550, 1320, 1);
  // Tents (small raised blocks)
  setRect(1460, 1260, 1480, 1280, 1.5);
  setRect(1490, 1260, 1510, 1280, 1.5);
  setRect(1520, 1260, 1540, 1280, 1.5);
  setRect(1460, 1290, 1480, 1310, 1.5);
  setRect(1490, 1290, 1510, 1310, 1.5);
  setRect(1520, 1290, 1540, 1310, 1.5);
  // Central cooking fire
  setRect(1495, 1282, 1505, 1288, 1.2);
  // Road to town
  setLine(1450, 1280, 1400, 1350, RW-4, 1);

  // Observatory on mountaintop near Frozen Lake
  setRect(350, 250, 400, 300, 2);
  // Dome
  setArc(375, 275, 20, 0, Math.PI*2, 12, 2);
  setRect(368, 268, 382, 282, 3);
  setRect(372, 272, 378, 278, 4);
  // Telescope pier
  setRect(400, 270, 420, 280, 2);
  setRect(405, 273, 418, 277, 3);
  // Road to observatory
  setLine(380, 300, 400, 380, RW-4, 1);

  // Suspension bridge connecting two cliff faces near Thunderpath
  // West pylon
  setRect(1950, 950, 1960, 960, 6);
  // East pylon
  setRect(2050, 950, 2060, 960, 6);
  // Bridge deck
  setWaveRoad(1960, 955, 2050, 955, 4, 4, 0.2, 30);
  // Cable lines (thin at higher elevation)
  setRect(1955, 953, 1960, 957, 7);
  setRect(2050, 953, 2055, 957, 7);

  // Ancient road (crumbling stone road) from town center to ruins
  setLine(1360, 1300, 1600, 1100, RW-5, 1);
  // Broken sections (gaps)
  setRect(1450, 1220, 1470, 1240, 0);
  setRect(1520, 1160, 1540, 1180, 0);
  // Overgrown sections (slightly raised)
  setRect(1400, 1260, 1420, 1280, 1.2);
  setRect(1480, 1200, 1500, 1220, 1.2);

  // Windmill farm west of town
  setRect(900, 1300, 950, 1350, 0.7);
  // Windmills
  setRect(910, 1310, 918, 1318, 1);
  setRect(912, 1312, 916, 1316, 4);
  setRect(930, 1330, 938, 1338, 1);
  setRect(932, 1332, 936, 1336, 4);
  // Road to town
  setLine(950, 1330, 1100, 1380, RW-4, 1);

  // Apiary (beehives) near farm
  setRect(650, 750, 700, 780, 0.7);
  setRect(655, 755, 665, 765, 1.3);
  setRect(670, 758, 680, 768, 1.3);
  setRect(685, 755, 695, 765, 1.3);

  // ---- FINAL ROAD CONNECTIONS to eliminate dead ends ----
  // From fishing village to Frozen Lake
  setLine(120, 460, 340, 450, RW-4, 1);
  // From shipyard to west coast road
  setLine(100, 580, 100, 700, RW-4, 1);
  // From watermill to Crystal Mines west entrance
  setLine(360, 980, 300, 1050, RW-4, 1);
  // From industrial zone to beach
  setLine(2450, 1100, 2500, 1200, RW-4, 1);
  // From port town east to beach area
  setLine(1550, 2500, 2200, 2350, RW-4, 1);
  // From fort north to coastal highway
  setLine(1100, 2440, 1050, 2400, RW-4, 1);
  // From gravity anomaly zone to Sky Temple
  setLine(1640, 790, 1500, 400, RW-4, 1);
  // From ancient ruins to tunnel
  setLine(1025, 1170, 1025, 1190, RW-4, 1);

  // ---- FINAL POLISH: decorative detail everywhere ----

  // Flag poles at Harbor start/finish
  setRect(1178, 2060, 1180, 2062, 1);
  setRect(1178, 2060, 1179, 2061, 5);
  setRect(1378, 2060, 1380, 2062, 1);
  setRect(1378, 2060, 1379, 2061, 5);

  // Speed bumps approaching Harbor from each direction
  setRect(1130, 2045, 1145, 2055, 1.2);
  setRect(1130, 2060, 1145, 2070, 1.2);
  setRect(1270, 1920, 1290, 1925, 1.2);
  setRect(1270, 1910, 1290, 1915, 1.2);

  // Bollards along Market Road
  for (let bi = 0; bi < 10; bi++) {
    const t = (bi + 1) / 11;
    const bx = Math.round(1930 + (1430 - 1930) * t);
    const by = Math.round(2100 + (2050 - 2100) * t);
    setRect(bx - 1, by - 15, bx + 1, by - 13, 1.5);
    setRect(bx - 1, by + 13, bx + 1, by + 15, 1.5);
  }

  // Flower beds along Grand Avenue (alternating sides)
  for (let fi = 0; fi < 12; fi++) {
    const fy = 1850 - fi * 100;
    if (fi % 2 === 0) {
      setRect(1255, fy, 1268, fy + 10, 0.8);
    } else {
      setRect(1292, fy, 1305, fy + 10, 0.8);
    }
  }

  // Street lights along Frost Highway
  for (let li = 0; li < 5; li++) {
    const t = (li + 1) / 6;
    const lx = Math.round(560 + (1100 - 560) * t);
    const ly = Math.round(450 + (380 - 450) * t);
    setRect(lx, ly + 16, lx + 3, ly + 19, 3);
    setRect(lx, ly - 19, lx + 3, ly - 16, 3);
  }

  // Barrier walls along Thunderpath steep sections
  setRamp(2050, 640, 2060, 660, 2, 8, 7);
  setRect(2058, 680, 2068, 700, 6);
  setRect(2065, 720, 2075, 740, 5);
  setRect(2070, 760, 2080, 780, 5.5);

  // Bridge supports for Skybridge (pillars below the bridge deck)
  setRect(1550, 380, 1556, 386, 1);
  setRect(1551, 381, 1555, 385, 4);
  setRect(1650, 400, 1656, 406, 1);
  setRect(1651, 401, 1655, 405, 4);
  setRect(1750, 430, 1756, 436, 1);
  setRect(1751, 431, 1755, 435, 4);

  // More Crystal Mines passage detail
  // Glowing fungus (tiny raised dots)
  setRect(210, 1070, 213, 1073, 1.3);
  setRect(230, 1100, 233, 1103, 1.3);
  setRect(250, 1130, 253, 1133, 1.3);
  setRect(270, 1160, 273, 1163, 1.3);
  setRect(290, 1190, 293, 1193, 1.3);
  setRect(310, 1220, 313, 1223, 1.3);
  setRect(390, 1080, 393, 1083, 1.3);
  setRect(380, 1110, 383, 1113, 1.3);
  setRect(370, 1140, 373, 1143, 1.3);
  setRect(360, 1170, 363, 1173, 1.3);
  setRect(350, 1200, 353, 1203, 1.3);
  setRect(340, 1230, 343, 1233, 1.3);

  // Volcano smoke plume (tall pillars at various heights near summit)
  setRect(448, 1752, 452, 1756, 8);
  setRect(450, 1748, 453, 1752, 9);
  setRect(447, 1745, 451, 1749, 10);

  // More Frozen Lake shore detail
  setArc(450, 450, 120, 0, Math.PI*2, 3, 1.5);
  // Dock on east shore
  setRect(560, 440, 590, 455, 1);
  setRect(570, 445, 585, 460, 0.8);
  // Boats at dock
  setRect(575, 450, 582, 458, 1.3);

  // Sky Temple prayer flags (thin pillars with small tops)
  setRect(1190, 260, 1193, 263, 5);
  setRect(1191, 261, 1192, 262, 7);
  setRect(1370, 260, 1373, 263, 5);
  setRect(1371, 261, 1372, 262, 7);
  setRect(1190, 440, 1193, 443, 5);
  setRect(1191, 441, 1192, 442, 7);
  setRect(1370, 440, 1373, 443, 5);
  setRect(1371, 441, 1372, 442, 7);

  // Cloud Citadel weather vane (on central spire)
  setRect(2048, 498, 2052, 502, 15);

  // Canyon Outpost signal fire (on each watchtower)
  setRect(2040, 1290, 2045, 1295, 5.5);
  setRect(2260, 1290, 2265, 1295, 5.5);
  setRect(2040, 1510, 2045, 1515, 5.5);
  setRect(2260, 1510, 2265, 1515, 5.5);

  // Jungle Ruins treasure chests (small decorated blocks)
  setRect(1955, 2015, 1962, 2022, 1.5);
  setRect(2145, 2095, 2152, 2102, 1.5);
  setRect(1950, 2180, 1957, 2187, 1.5);

  // More road detail: chevron signs at sharp curves
  // Thunderpath S-curves
  setRect(2095, 898, 2100, 905, 3);
  setRect(2098, 1098, 2103, 1105, 3);
  // Coastal Cliffs big arc
  setRect(690, 2195, 695, 2202, 2);
  setRect(580, 2095, 585, 2102, 2);

  // Decorative archways at node entrances
  // Harbor north entrance (Grand Avenue)
  setRect(1270, 1928, 1275, 1935, 3);
  setRect(1285, 1928, 1290, 1935, 3);
  setRect(1270, 1930, 1290, 1932, 3.5);

  // Sky Temple south entrance
  setRect(1270, 472, 1275, 480, 6);
  setRect(1285, 472, 1290, 480, 6);
  setRect(1270, 474, 1290, 476, 6.5);

  // Crystal Mines entrance arch
  setRect(400, 1128, 408, 1135, 5.5);
  setRect(400, 1165, 408, 1172, 5.5);
  setRect(400, 1132, 408, 1168, 6);

  // Canyon Outpost west entrance arch
  setRect(2028, 1395, 2035, 1402, 3);
  setRect(2028, 1398, 2035, 1405, 3);

  // Jungle Ruins north entrance (vine-covered arch)
  setRect(2045, 1978, 2052, 1985, 2.5);
  setRect(2048, 1978, 2055, 1985, 2.5);
  setRect(2045, 1980, 2055, 1983, 3);

  // More Marsh stilt village detail
  // Market platform
  setRect(790, 1880, 830, 1900, 2);
  // Stalls on platform
  setRect(795, 1885, 810, 1895, 2.3);
  setRect(815, 1885, 830, 1895, 2.3);

  // Industrial District crane detail
  setRect(2380, 1835, 2388, 1843, 6);
  setRect(2375, 1830, 2393, 1835, 6);
  // Crane arm (horizontal)
  setRect(2360, 1832, 2388, 1835, 6);

  // Power lines along east highway (thin tall pillars)
  for (let pi = 2500; pi <= 2500; pi += 0) {
    // Just place pylons at key points
    setRect(2498, 400, 2502, 404, 1);
    setRect(2499, 401, 2501, 403, 6);
    setRect(2498, 600, 2502, 604, 1);
    setRect(2499, 601, 2501, 603, 6);
    setRect(2498, 800, 2502, 804, 1);
    setRect(2499, 801, 2501, 803, 6);
    setRect(2498, 1000, 2502, 1004, 1);
    setRect(2499, 1001, 2501, 1003, 6);
    break;
  }

  // More detail along Lava Tubes (R2)
  // Lava flow channels alongside the road
  setLine(460, 1700, 360, 1300, 2, 0.3);
  setLine(440, 1720, 340, 1280, 2, 0.3);
  // Obsidian blocks
  setRect(430, 1550, 445, 1565, 2);
  setRect(380, 1450, 395, 1465, 2.5);
  setRect(420, 1350, 435, 1365, 2);

  // More detail along Mineshaft Ascent (R3)
  // Ore deposits in walls
  setRect(275, 970, 280, 980, 3);
  setRect(485, 760, 490, 770, 3);
  setRect(275, 670, 280, 680, 3);
  // Wooden support beams
  setRect(295, 940, 305, 945, 2);
  setRect(455, 840, 465, 845, 2);
  setRect(295, 730, 305, 735, 2);

  // Detail on the Overgrown Trail (R7)
  // Fallen tree across road (bump)
  setRect(2160, 1660, 2200, 1665, 1.5);
  // Moss-covered stones
  setRect(2115, 1780, 2130, 1795, 1.5);
  setRect(2080, 1920, 2095, 1935, 1.5);
  // Firefly clearing (tiny dots)
  setRect(2180, 1680, 2183, 1683, 1.2);
  setRect(2190, 1690, 2193, 1693, 1.2);
  setRect(2175, 1695, 2178, 1698, 1.2);

  // Underground Express interior detail
  // Emergency lighting (tiny raised dots along walls)
  for (let el = 500; el < 2000; el += 50) {
    setRect(el, 1190 - RW - 1, el + 2, 1190 - RW + 1, 4);
    setRect(el, 1190 + RW - 1, el + 2, 1190 + RW + 1, 4);
  }

  // Ventilation shafts (vertical columns from ground to tunnel ceiling)
  setRect(800, 1188, 805, 1192, 6.5);
  setRect(1200, 1188, 1205, 1192, 6.5);
  setRect(1600, 1188, 1605, 1192, 6.5);

  // Water feature along Grand Avenue at midpoint
  // Cascading fountain
  setRect(1295, 1210, 1305, 1220, 1.5);
  setRect(1296, 1211, 1304, 1219, 2.5);
  setRect(1295, 1225, 1305, 1235, 1.5);
  setRect(1296, 1226, 1304, 1234, 2);
  setRect(1295, 1240, 1305, 1250, 1.5);
  setRect(1296, 1241, 1304, 1249, 1.5);

  // Banners along Grand Avenue (thin tall blocks)
  for (let bj = 1800; bj >= 700; bj -= 150) {
    setRect(1258, bj, 1260, bj + 3, 3.5);
    setRect(1300, bj, 1302, bj + 3, 3.5);
  }

  // Information boards at key intersections
  setRect(1275, 1395, 1280, 1400, 1);
  setRect(1276, 1396, 1279, 1399, 2.5);
  setRect(800, 1445, 805, 1450, 1);
  setRect(801, 1446, 804, 1449, 2.5);

  // Weather stations (on high ground)
  setRect(1282, 108, 1286, 112, 12);
  setRect(1283, 109, 1285, 111, 14);
  setRect(2047, 498, 2053, 504, 14);

  // Decorative pools at Harbor dock area
  setRect(1350, 2165, 1380, 2170, 0.5);
  setRect(1400, 2162, 1415, 2168, 0.5);

  // Final scattered rocks across barren terrain
  // Far north
  setRect(800, 150, 818, 168, 1.5);
  setRect(1500, 120, 1518, 138, 2);
  setRect(1800, 100, 1818, 118, 1.8);
  setRect(2200, 150, 2218, 168, 2.2);
  // Far west
  setRect(50, 1200, 68, 1218, 2);
  setRect(70, 1500, 88, 1518, 2.5);
  setRect(50, 1700, 68, 1718, 2);
  // Far east
  setRect(2500, 1500, 2518, 1518, 2);
  setRect(2520, 1800, 2538, 1818, 2.5);
  setRect(2480, 2100, 2498, 2118, 2);
  // Far south
  setRect(200, 2480, 218, 2498, 2);
  setRect(500, 2500, 518, 2518, 1.5);
  setRect(900, 2480, 918, 2498, 2);
  setRect(1200, 2500, 1218, 2518, 1.8);
  setRect(1600, 2490, 1618, 2508, 2);
  setRect(2000, 2480, 2018, 2498, 2.2);

  // Edge-of-map walls (to keep players from falling off)
  // These are scattered rocks near the perimeter
  setRect(10, 10, 30, 2550, 2);
  setRect(10, 10, 2550, 30, 2);
  setRect(2530, 10, 2550, 2550, 2);
  setRect(10, 2530, 2550, 2550, 2);

  // ---- FINAL 300 LINES: Dense environmental filling ----

  // Dense tree line along west coast
  for (let ty = 500; ty <= 1000; ty += 30) {
    setRect(40 + (ty % 60), ty, 55 + (ty % 60), ty + 15, 2);
  }

  // Dense tree line between farm and Frost Highway
  for (let tx = 500; tx <= 800; tx += 35) {
    setRect(tx, 400 + (tx % 40), tx + 12, 415 + (tx % 40), 2);
  }

  // Dense forest east of Mineshaft Ascent
  setRect(520, 800, 540, 820, 2);
  setRect(550, 850, 570, 870, 2.2);
  setRect(510, 900, 530, 920, 1.8);
  setRect(540, 950, 560, 970, 2);
  setRect(520, 1000, 540, 1020, 2.3);
  setRect(480, 840, 500, 860, 2);
  setRect(510, 960, 530, 980, 1.8);
  setRect(530, 870, 545, 885, 2.5);
  setRect(500, 920, 515, 935, 2);

  // Scattered homesteads between town and Volcano
  // Homestead 1
  setRect(850, 1700, 890, 1740, 1);
  setRect(855, 1705, 880, 1730, 2);
  setRect(858, 1708, 877, 1727, 2.5);
  // Garden
  setRect(890, 1710, 920, 1730, 0.7);

  // Homestead 2
  setRect(750, 1600, 790, 1640, 1);
  setRect(755, 1605, 780, 1630, 2);
  setRect(758, 1608, 777, 1627, 2.5);
  // Fence
  setRect(748, 1598, 792, 1602, 1.2);
  setRect(748, 1638, 792, 1642, 1.2);

  // Homestead 3
  setRect(900, 1550, 940, 1590, 1);
  setRect(905, 1555, 930, 1580, 2);
  setRect(908, 1558, 927, 1577, 2.5);
  // Barn
  setRect(940, 1560, 970, 1580, 2.5);

  // Wells at homesteads
  setRect(895, 1715, 903, 1723, 2);
  setRect(795, 1615, 803, 1623, 2);
  setRect(945, 1585, 953, 1593, 2);

  // Dense jungle around Jungle Ruins
  setRect(1900, 1950, 1920, 1970, 2.5);
  setRect(1920, 2220, 1940, 2240, 2);
  setRect(2170, 2050, 2190, 2070, 2.5);
  setRect(2180, 2180, 2200, 2200, 2);
  setRect(1930, 2080, 1948, 2098, 2.2);
  setRect(2160, 2110, 2178, 2128, 2);
  setRect(1945, 2150, 1963, 2168, 2.3);
  setRect(2135, 2030, 2153, 2048, 2.5);
  setRect(1960, 2210, 1978, 2228, 2);
  setRect(2150, 2200, 2168, 2218, 2.2);

  // Desert scrub east of Canyon Outpost
  setRect(2280, 1420, 2295, 1435, 1.3);
  setRect(2310, 1380, 2325, 1395, 1.5);
  setRect(2340, 1430, 2355, 1445, 1.3);
  setRect(2280, 1480, 2295, 1495, 1.4);
  setRect(2320, 1520, 2335, 1535, 1.3);
  // Cacti (tall thin blocks)
  setRect(2290, 1425, 2294, 1429, 3);
  setRect(2320, 1385, 2324, 1389, 2.5);
  setRect(2345, 1435, 2349, 1439, 3);
  setRect(2285, 1485, 2289, 1489, 2.5);

  // Swamp between Marsh and Volcano
  setRect(600, 1900, 700, 1950, 0.3);
  // Swamp trees
  setRect(620, 1910, 635, 1925, 2);
  setRect(660, 1920, 675, 1935, 2.5);
  setRect(640, 1940, 655, 1950, 2);
  // Lily pads (tiny flat blocks)
  setRect(610, 1935, 615, 1940, 0.5);
  setRect(680, 1905, 685, 1910, 0.5);
  setRect(650, 1910, 655, 1915, 0.5);

  // Terraced fields south of town
  setRect(1100, 1650, 1250, 1700, 0.7);
  setRect(1100, 1700, 1250, 1750, 0.8);
  setRect(1100, 1750, 1250, 1800, 0.9);
  // Furrows in terraces
  for (let fi = 1110; fi < 1250; fi += 15) {
    setRect(fi, 1660, fi + 3, 1690, 0.8);
    setRect(fi, 1710, fi + 3, 1740, 0.9);
    setRect(fi, 1760, fi + 3, 1790, 1);
  }

  // Lake between town and Harbor (recreation area)
  setRect(1100, 1830, 1200, 1900, 0.5);
  setArc(1150, 1865, 45, 0, Math.PI*2, 30, 0.5);
  // Walking path around lake
  setArc(1150, 1865, 55, 0, Math.PI*2, 3, 1);
  // Ducks
  setRect(1140, 1855, 1143, 1858, 0.7);
  setRect(1160, 1870, 1163, 1873, 0.7);
  setRect(1145, 1878, 1148, 1881, 0.7);
  // Gazebo by the lake
  setRect(1100, 1880, 1115, 1895, 1);
  setRect(1103, 1883, 1112, 1892, 2.5);
  // Boat rental
  setRect(1175, 1830, 1195, 1845, 1);
  setRect(1178, 1833, 1192, 1842, 2);
  // Rowing boats
  setRect(1180, 1850, 1188, 1860, 1.2);
  setRect(1190, 1845, 1198, 1855, 1.2);

  // Cemetery expansion with mausoleum
  setRect(2100, 2285, 2140, 2310, 1);
  setRect(2105, 2290, 2135, 2305, 2.5);
  setRect(2110, 2293, 2130, 2302, 3.5);
  setRect(2115, 2296, 2125, 2299, 5);
  // Path to mausoleum
  setRect(2115, 2278, 2125, 2290, 1);

  // Bridges connecting broken ancient road
  setRect(1450, 1220, 1470, 1240, 1);
  setRect(1520, 1160, 1540, 1180, 1);

  // More connecting paths for navigation
  // From farm pond to winery
  setLine(560, 800, 520, 840, RW-5, 1);
  // From orchard to Forest Highway
  setLine(700, 670, 750, 450, RW-5, 1);
  // From playground to sports complex
  setLine(1060, 1930, 1010, 2060, RW-5, 1);
  // From botanical garden to train station
  setLine(1200, 1490, 1180, 1550, RW-5, 1);
  // From university to park
  setLine(1530, 1600, 1550, 1540, RW-5, 1);
  // From colosseum to industrial district
  setLine(2350, 1680, 2350, 1800, RW-5, 1);
  // From beach volleyball to pier
  setLine(2420, 2420, 2450, 2370, RW-5, 1);

  // Final details: road markings and signs
  // Speed limit signs near schools
  setRect(1095, 1258, 1098, 1261, 1);
  setRect(1096, 1259, 1097, 1260, 3);
  // Stop sign at major intersection
  setRect(1275, 1392, 1278, 1395, 3);
  // Yield sign near tunnel entrance
  setRect(408, 1148, 411, 1151, 3);
  setRect(2023, 1188, 2026, 1191, 3);

  // Bench detail in town center
  setRect(1215, 1385, 1225, 1388, 1.3);
  setRect(1235, 1385, 1245, 1388, 1.3);
  setRect(1255, 1385, 1265, 1388, 1.3);
  setRect(1215, 1412, 1225, 1415, 1.3);
  setRect(1235, 1412, 1245, 1415, 1.3);
  setRect(1255, 1412, 1265, 1415, 1.3);

  // Trash bins (tiny blocks) at key locations
  setRect(1270, 1928, 1272, 1930, 1.5);
  setRect(1288, 1928, 1290, 1930, 1.5);
  setRect(1180, 2042, 1182, 2044, 1.5);
  setRect(1375, 2042, 1377, 2044, 1.5);

  // Manhole covers along town roads (subtle bumps)
  setRect(1278, 1350, 1282, 1354, 1.15);
  setRect(1278, 1450, 1282, 1454, 1.15);
  setRect(1278, 1550, 1282, 1554, 1.15);
  setRect(1278, 1650, 1282, 1654, 1.15);
  setRect(1278, 1750, 1282, 1754, 1.15);
  setRect(1278, 1850, 1282, 1854, 1.15);

  // Road curbs along key streets (subtle raised edges)
  // Grand Avenue curbs are already there from lampposts

  // Guard rails along Cliffside Drop
  setLine(2290, 800, 2330, 1000, 1, 5.5);
  setLine(2330, 1000, 2370, 1200, 1, 3.5);

  // Signposts at road intersections
  setRect(1095, 1395, 1098, 1398, 1);
  setRect(1096, 1396, 1097, 1397, 3);
  setRect(1460, 1218, 1463, 1221, 1);
  setRect(1461, 1219, 1462, 1220, 3);
  setRect(1930, 2098, 1933, 2101, 1);
  setRect(1931, 2099, 1932, 2100, 3);

  // Antenna array on Cloud Citadel spire
  setRect(2046, 496, 2054, 504, 14);
  setRect(2049, 499, 2051, 501, 16);

  // Final scattered detail in empty areas
  // Between Grand Avenue and tunnel
  setRect(1150, 1100, 1170, 1120, 1.5);
  setRect(1350, 1100, 1370, 1120, 1.5);
  setRect(1200, 1050, 1220, 1070, 1.8);
  setRect(1350, 1050, 1370, 1070, 1.8);

  // Between Crystal Mines and Frozen Lake (along Mineshaft)
  setRect(350, 800, 365, 815, 1.5);
  setRect(380, 750, 395, 765, 1.3);
  setRect(320, 850, 335, 865, 1.8);

  // Between Cloud Citadel and Sky Temple (near Skybridge)
  setRect(1550, 350, 1565, 365, 1);
  setRect(1650, 360, 1665, 375, 1);
  setRect(1750, 340, 1765, 355, 1);

  // ---- ABSOLUTE FINAL TOUCHES ----

  // Abandoned vehicles along various roads (car-sized blocks)
  setRect(850, 2155, 865, 2170, 1.3);
  setRect(1600, 2070, 1615, 2085, 1.3);
  setRect(2300, 1650, 2315, 1665, 1.3);
  setRect(1800, 850, 1815, 865, 1.3);
  setRect(600, 1650, 615, 1665, 1.3);
  setRect(1050, 820, 1065, 835, 1.3);

  // Milestones along Grand Avenue
  setRect(1268, 700, 1270, 702, 1.8);
  setRect(1268, 900, 1270, 902, 1.8);
  setRect(1268, 1100, 1270, 1102, 1.8);
  setRect(1268, 1300, 1270, 1302, 1.8);
  setRect(1268, 1500, 1270, 1502, 1.8);
  setRect(1268, 1700, 1270, 1702, 1.8);

  // Bird nests in tall structures (tiny blocks on top of pillars)
  setRect(1420, 2137, 1424, 2141, 7.5);
  setRect(2048, 2090, 2052, 2094, 7.5);
  setRect(2262, 1292, 2266, 1296, 5.5);

  // Compass rose in central plaza
  setRect(1260, 1218, 1262, 1222, 2);
  setRect(1298, 1218, 1300, 1222, 2);
  setRect(1278, 1200, 1282, 1202, 2);
  setRect(1278, 1238, 1282, 1240, 2);

  // Reflecting pools at Sky Temple
  setRect(1220, 360, 1240, 380, 4.5);
  setRect(1320, 320, 1340, 340, 4.5);

  // Volcanic glass deposits near Volcano
  setRect(500, 1780, 515, 1795, 1.5);
  setRect(530, 1770, 545, 1785, 1.8);
  setRect(400, 1770, 415, 1785, 1.5);

  // Frozen waterfall detail (layered ice blocks)
  setRect(445, 545, 455, 548, 3.5);
  setRect(445, 548, 455, 552, 2.5);
  setRect(445, 552, 455, 556, 1.5);

  // Cloud Citadel lightning rods
  setRect(1935, 385, 1938, 388, 7);
  setRect(1936, 386, 1937, 387, 10);
  setRect(2165, 565, 2168, 568, 7);
  setRect(2166, 566, 2167, 567, 10);

  // Canyon Outpost war drums (small round platforms)
  setArc(2070, 1310, 5, 0, Math.PI*2, 3, 2.3);
  setArc(2100, 1320, 5, 0, Math.PI*2, 3, 2.3);

  // Jungle Ruins sacrificial altar
  setRect(2048, 2095, 2052, 2100, 7.5);

  // Harbor ship masts (very tall thin blocks at dock)
  setRect(1365, 2148, 1367, 2150, 5);
  setRect(1395, 2148, 1397, 2150, 6);

  // Final road: secret shortcut through Crystal Mines to tunnel
  setLine(350, 1240, 400, 1190, RW-5, 1);

}

buildTrack();

// Snapshot original color indices from generated heights
for (let i = 0; i < MAP_SIZE; i++) {
  for (let j = 0; j < MAP_SIZE; j++) {
    const h = map[i][j];
    mapColor[i][j] = h <= 0 ? 0 : h <= 1.1 ? 0 : h <= 3 ? 1 : h <= 6 ? 2 : 3;
  }
}
// Save original map for restart
const mapOriginal = [];
const mapColorOriginal = [];
for (let i = 0; i < MAP_SIZE; i++) {
  mapOriginal[i] = new Float32Array(map[i]);
  mapColorOriginal[i] = new Uint8Array(mapColor[i]);
}
