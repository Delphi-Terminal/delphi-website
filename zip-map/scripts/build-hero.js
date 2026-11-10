// Build the Theseus hero map (../public/us-zips.svg) from the same Census
// files as public/zcta.json, and print hub coordinates in the hero's
// 960×600 viewBox. Run `npm run build:data` first so data/raw/ is populated.
//
//   HERO_SIMPLIFY=2% node scripts/build-hero.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mapshaper from "mapshaper";
import * as topojson from "topojson-client";
import { geoIdentity, geoPath } from "d3-geo";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(root, "../public/us-zips.svg");

const SIMPLIFY = process.env.HERO_SIMPLIFY ?? "2%";
const WIDTH = 960;
const HEIGHT = 600;
// The hero frames the lower 48 so its height spans y 24–576.
const EXTENT = [
  [0, 24],
  [WIDTH, HEIGHT - 24],
];

const HUBS = [
  ["seattle", -122.3321, 47.6062],
  ["oakland", -122.2712, 37.8044],
  ["los-angeles", -118.2437, 34.0522],
  ["denver", -104.9903, 39.7392],
  ["phoenix", -112.074, 33.4484],
  ["dallas", -97.0403, 32.8998],
  ["houston", -95.3698, 29.7604],
  ["new-orleans", -90.0715, 29.9511],
  ["minneapolis", -93.265, 44.9778],
  ["chicago", -87.6298, 41.8781],
  ["kansas-city", -94.5786, 39.0997],
  ["detroit", -83.0458, 42.3314],
  ["indianapolis", -86.1581, 39.7684],
  ["pittsburgh", -79.9959, 40.4406],
  ["memphis", -90.049, 35.1495],
  ["atlanta", -84.388, 33.749],
  ["savannah", -81.0912, 32.0809],
  ["miami", -80.1918, 25.7617],
  ["new-york", -74.006, 40.7128],
  ["norfolk", -76.2859, 36.8508],
];

const zcta = path.join(root, "data/raw/cb_2020_us_zcta520_500k/cb_2020_us_zcta520_500k.shp");
const state = path.join(root, "data/raw/cb_2020_us_state_500k/cb_2020_us_state_500k.shp");
for (const file of [zcta, state]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${path.relative(root, file)} — run 'npm run build:data' first`);
    process.exit(1);
  }
}

const hubs = {
  type: "FeatureCollection",
  features: HUBS.map(([id, lon, lat]) => ({
    type: "Feature",
    properties: { id },
    geometry: { type: "Point", coordinates: [lon, lat] },
  })),
};

// Same shared-topology pipeline as build-data.sh, limited to the lower 48:
// AK ZCTAs are 995–999, HI are 967–968; AK and HI state FIPS are 02 and 15.
const result = await mapshaper.applyCommands(
  [
    `-i "${zcta}" "${state}" combine-files`,
    "-rename-layers zcta,nation",
    "-rename-fields zip=ZCTA5CE20 target=zcta",
    "-filter-fields zip target=zcta",
    `-filter '!/^(00[6-9]|96[7-9]|99[5-9])/.test(zip)' target=zcta`,
    `-filter '!["02", "15", "60", "66", "69", "72", "78"].includes(STATEFP)' target=nation`,
    "-dissolve target=nation",
    "-explode target=zcta,nation",
    "-proj albersusa",
    "-filter remove-empty target=zcta,nation",
    `-simplify ${SIMPLIFY} keep-shapes`,
    "-dissolve target=nation",
    "-o hero.json target=zcta,nation format=topojson quantization=1e5",
    "-i hubs.json -proj albersusa",
    "-o hubs-projected.json format=geojson",
  ].join(" "),
  { "hubs.json": JSON.stringify(hubs) },
);

const topo = JSON.parse(result["hero.json"]);
const nation = topojson.feature(topo, topo.objects.nation);
const outline = topojson.mesh(topo, topo.objects.nation);

// Every ZIP edge that isn't the national outline: borders between ZIPs, plus
// ZIP edges facing land with no ZCTA (common in the West). The layers share
// arcs, so outline arcs can be excluded by index.
const arcIds = (geometry) => {
  const ids = [];
  const walk = (a) => (Array.isArray(a) ? a.forEach(walk) : ids.push(a < 0 ? ~a : a));
  walk(geometry.arcs ?? []);
  return ids;
};
const outlineArcs = new Set(topo.objects.nation.geometries.flatMap(arcIds));
const arcZips = new Map();
for (const g of topo.objects.zcta.geometries) {
  for (const id of arcIds(g)) {
    if (!arcZips.has(id)) arcZips.set(id, new Set());
    arcZips.get(id).add(g.properties.zip);
  }
}
const zipArcs = [...arcZips].filter(([id, zips]) => zips.size > 1 || !outlineArcs.has(id)).map(([id]) => [id]);
const interior = topojson.mesh(topo, {
  type: "GeometryCollection",
  geometries: [{ type: "MultiLineString", arcs: zipArcs }],
});

const projection = geoIdentity().reflectY(true).fitExtent(EXTENT, nation);
const toSvg = geoPath(projection).digits(1);

const landD = toSvg(nation);
const zipD = toSvg(interior);
const outlineD = toSvg(outline);

// Each hub is shown as its 3-digit ZIP area (e.g. 606xx for Chicago): a
// single downtown ZIP renders under a pixel at hero size.
const ringsOf = (g) => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
const contains = ([x, y], rings) => {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};
const parts = topo.objects.zcta.geometries;
const partFeatures = parts.map((g) => topojson.feature(topo, g));

const projected = JSON.parse(result["hubs-projected.json"]);
const hubAreas = projected.features.map((f) => {
  const { id } = f.properties;
  const index = partFeatures.findIndex((p) => contains(f.geometry.coordinates, ringsOf(p.geometry)));
  if (index < 0) throw new Error(`No ZIP contains hub ${id}`);
  const zip = parts[index].properties.zip;
  const zip3 = zip.slice(0, 3);
  const area = topojson.merge(topo, parts.filter((g) => g.properties.zip.startsWith(zip3)));
  return { id, zip, zip3, point: f.geometry.coordinates, d: toSvg(area) };
});
const hubD = hubAreas.map((h) => `<path data-hub="${h.id}" data-zip3="${h.zip3}" d="${h.d}"/>`).join("\n");

// Per-ZIP shapes around each hub for the glow animation: the hub's 3-digit
// area plus every ZIP whose centroid is within GLOW_RADIUS_KM of the city.
const GLOW_RADIUS_KM = Number(process.env.GLOW_RADIUS_KM ?? 60);
const planar = geoPath(geoIdentity());
const partsByZip = new Map();
for (const g of parts) {
  if (!partsByZip.has(g.properties.zip)) partsByZip.set(g.properties.zip, []);
  partsByZip.get(g.properties.zip).push(g);
}
const zipCentroids = [...partsByZip].map(([zip, geoms]) => {
  const largest = geoms.reduce((best, g) => {
    const area = planar.area(topojson.feature(topo, g));
    return area > best.area ? { g, area } : best;
  }, { g: geoms[0], area: -1 });
  return { zip, centroid: planar.centroid(topojson.feature(topo, largest.g)) };
});
const glowHubs = hubAreas.map((h) => {
  const radius = GLOW_RADIUS_KM * 1000;
  const zips = zipCentroids
    .map(({ zip, centroid }) => ({ zip, dist: Math.hypot(centroid[0] - h.point[0], centroid[1] - h.point[1]) }))
    .filter(({ zip, dist }) => zip.startsWith(h.zip3) || dist <= radius)
    .sort((a, b) => a.dist - b.dist)
    .map(({ zip, dist }) => ({
      zip,
      core: zip.startsWith(h.zip3) ? 1 : 0,
      r: Number(Math.min(1, dist / radius).toFixed(2)),
      d: toSvg(topojson.merge(topo, partsByZip.get(zip))),
    }));
  const [x, y] = projection(h.point);
  return { id: h.id, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), zips };
});
const glowOut = path.resolve(root, "../public/hub-zips.json");
const glowJson = JSON.stringify({ width: WIDTH, height: HEIGHT, hubs: glowHubs });
fs.writeFileSync(glowOut, glowJson);

// Route corridors for the scroll animation: a chain of touching ZIPs between
// hub pairs, found with Dijkstra over ZIP adjacency. Edge weights get a fixed
// per-ZIP jitter so chains wander instead of tracing a straight line, and
// small neighboring ZIPs are added so eastern chains stay visible at hero size.
const ROUTE_JITTER = Number(process.env.ROUTE_JITTER ?? 0.9);
const DILATE_KM = Number(process.env.ROUTE_DILATE_KM ?? 14);
const BRIDGE_KM = 30;
const zipList = [...partsByZip.keys()];
const zipIndex = new Map(zipList.map((zip, i) => [zip, i]));
const centroidOf = new Map(zipCentroids.map(({ zip, centroid }) => [zip, centroid]));
const cxy = zipList.map((zip) => centroidOf.get(zip));
const near = (a, b) => Math.hypot(cxy[a][0] - cxy[b][0], cxy[a][1] - cxy[b][1]);

const touching = zipList.map(() => new Set());
topojson.neighbors(parts).forEach((list, i) => {
  const a = zipIndex.get(parts[i].properties.zip);
  for (const j of list) {
    const b = zipIndex.get(parts[j].properties.zip);
    if (a !== b) touching[a].add(b);
  }
});

// Bridge gaps of land with no ZCTA (deserts, parks) so every hub pair is
// reachable; bridges cost more so chains only use them when they must.
const graph = touching.map((set) => [...set].map((b) => [b, 1]));
const cell = BRIDGE_KM * 1000;
const grid = new Map();
cxy.forEach(([x, y], i) => {
  const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  if (!grid.has(key)) grid.set(key, []);
  grid.get(key).push(i);
});
cxy.forEach(([x, y], a) => {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (const b of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
        if (b !== a && !touching[a].has(b) && near(a, b) <= cell) graph[a].push([b, 3]);
      }
    }
  }
});

const jitter = zipList.map((zip) => {
  let h = 2166136261;
  for (const c of zip) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 1 + ROUTE_JITTER * ((h >>> 0) / 2 ** 32);
});

function shortestChain(from, to) {
  const dist = new Float64Array(zipList.length).fill(Infinity);
  const prev = new Int32Array(zipList.length).fill(-1);
  const heap = [[0, from]];
  dist[from] = 0;
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, a] = pop();
    if (a === to) break;
    if (d > dist[a]) continue;
    for (const [b, cost] of graph[a]) {
      const nd = d + near(a, b) * cost * jitter[b];
      if (nd < dist[b]) {
        dist[b] = nd;
        prev[b] = a;
        push([nd, b]);
      }
    }
  }
  if (prev[to] < 0) throw new Error(`No ZIP chain from ${zipList[from]} to ${zipList[to]}`);
  const chain = [to];
  while (chain[chain.length - 1] !== from) chain.push(prev[chain[chain.length - 1]]);
  return chain.reverse();
}

// Every hub pair the hero can draw: each hub's nearest hubs plus the fixed
// corridors in js/main.js (CHICAGO_NEIGHBORS and WAVE2_LINKS).
const ROUTE_NEAREST = 4;
const FIXED_ROUTES = [
  ...["minneapolis", "detroit", "indianapolis", "kansas-city", "pittsburgh", "memphis", "denver"].map((id) => ["chicago", id]),
  ["denver", "seattle"], ["denver", "oakland"], ["denver", "los-angeles"],
  ["kansas-city", "dallas"], ["kansas-city", "phoenix"],
  ["memphis", "houston"], ["memphis", "miami"],
  ["indianapolis", "new-orleans"], ["indianapolis", "savannah"],
  ["minneapolis", "atlanta"],
];
const hubById = new Map(glowHubs.map((h, i) => [h.id, { ...h, zip: hubAreas[i].zip }]));
const pairKeys = new Set(FIXED_ROUTES.map(([a, b]) => [a, b].sort().join("|")));
for (const a of glowHubs) {
  glowHubs
    .filter((b) => b.id !== a.id)
    .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))
    .slice(0, ROUTE_NEAREST)
    .forEach((b) => pairKeys.add([a.id, b.id].sort().join("|")));
}

const usedZips = new Map();
const routeOut = {};
for (const key of pairKeys) {
  const [a, b] = key.split("|").map((id) => hubById.get(id));
  const chain = shortestChain(zipIndex.get(a.zip), zipIndex.get(b.zip));
  const along = [0];
  for (let i = 1; i < chain.length; i++) along.push(along[i - 1] + near(chain[i - 1], chain[i]));
  const total = along[along.length - 1] || 1;
  const order = new Map(chain.map((z, i) => [z, along[i] / total]));
  for (const [i, z] of chain.entries()) {
    for (const n of touching[z]) {
      if (!order.has(n) && near(z, n) <= DILATE_KM * 1000) order.set(n, along[i] / total);
    }
  }
  routeOut[key] = [...order]
    .sort((p, q) => p[1] - q[1])
    .map(([z, t]) => {
      if (!usedZips.has(z)) usedZips.set(z, usedZips.size);
      return [usedZips.get(z), Math.round(t * 1000)];
    });
}
const routeZipD = [...usedZips.keys()].map((z) => toSvg(topojson.merge(topo, partsByZip.get(zipList[z]))));
const routeJsonOut = path.resolve(root, "../public/route-zips.json");
const routeJson = JSON.stringify({ zips: routeZipD, routes: routeOut });
fs.writeFileSync(routeJsonOut, routeJson);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<path class="us-outline" fill-rule="evenodd" d="${landD}"/>
<g class="zip-lines"><path d="${zipD}"/></g>
<path class="us-outline-stroke" d="${outlineD}"/>
<g class="hub-zips">
${hubD}
</g>
</svg>
`;
fs.writeFileSync(out, svg);

const kb = (s) => (Buffer.byteLength(s) / 1e3).toFixed(0);
console.log(`Wrote ${path.relative(process.cwd(), out)} (simplify ${SIMPLIFY})`);
console.log(`  land ${kb(landD)} kB, zip lines ${kb(zipD)} kB, outline ${kb(outlineD)} kB, total ${kb(svg)} kB`);
const glowCount = glowHubs.reduce((n, h) => n + h.zips.length, 0);
console.log(`Wrote ${path.relative(process.cwd(), glowOut)} (${glowCount} ZIPs within ${GLOW_RADIUS_KM} km of hubs, ${kb(glowJson)} kB)`);

console.log(`Wrote ${path.relative(process.cwd(), routeJsonOut)} (${pairKeys.size} routes over ${usedZips.size} ZIPs, ${kb(routeJson)} kB)`);

console.log("\nHub positions (viewBox units):");
for (const h of hubAreas) {
  const [x, y] = projection(h.point);
  console.log(`  { id: "${h.id}", x: ${x.toFixed(1)}, y: ${y.toFixed(1)} }, // ZIP ${h.zip}, area ${h.zip3}xx`);
}
