#!/usr/bin/env node
// Sanity checks for public/zcta.json and public/nation.json.
// Exits non-zero if any check fails.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as topojson from "topojson-client";
import mapshaper from "mapshaper";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (name) => JSON.parse(readFileSync(path.join(root, "public", name), "utf8"));

// Real-world locations that must fall inside the given ZCTA.
const KNOWN = [
  { zip: "10001", name: "Fashion Institute of Technology, NYC", lon: -73.9942, lat: 40.747 },
  { zip: "60601", name: "Aon Center, Chicago", lon: -87.6216, lat: 41.8853 },
  { zip: "90210", name: "Beverly Hills", lon: -118.4065, lat: 34.0901 },
  { zip: "99501", name: "Downtown Anchorage", lon: -149.8963, lat: 61.2176 },
];

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

function scanNumbers(value, where, bad) {
  if (value === null || value === undefined) {
    bad.push(`${where}: ${value}`);
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) bad.push(`${where}: ${value}`);
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length && bad.length < 10; i += 1) {
      scanNumbers(value[i], `${where}[${i}]`, bad);
    }
  }
}

function checkTopology(topo, name) {
  const bad = [];
  scanNumbers(topo.arcs, `${name}.arcs`, bad);
  if ("bbox" in topo) scanNumbers(topo.bbox, `${name}.bbox`, bad);
  if (topo.transform) {
    scanNumbers(topo.transform.scale, `${name}.transform.scale`, bad);
    scanNumbers(topo.transform.translate, `${name}.transform.translate`, bad);
  }
  check(bad.length === 0, `${name}: no NaN/null in arcs, bbox, transform`, bad.slice(0, 3).join("; "));
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function checkRings(features, name) {
  let rings = 0;
  let multi = 0;
  const problems = [];
  for (const f of features) {
    if (f.geometry?.type === "MultiPolygon") multi += 1;
    for (const polygon of polygonsOf(f.geometry)) {
      for (const ring of polygon) {
        rings += 1;
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (ring.length < 4) problems.push(`${f.properties?.zip ?? name}: ring with ${ring.length} points`);
        else if (first[0] !== last[0] || first[1] !== last[1]) problems.push(`${f.properties?.zip ?? name}: unclosed ring`);
        for (const [x, y] of ring) {
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            problems.push(`${f.properties?.zip ?? name}: non-finite vertex`);
            break;
          }
        }
      }
    }
  }
  check(problems.length === 0, `${name}: ${rings.toLocaleString()} rings closed and finite (${multi.toLocaleString()} MultiPolygons)`, problems.slice(0, 3).join("; "));
}

// Even-odd ray casting over every ring, so holes are excluded.
function contains(geometry, [px, py]) {
  let inside = false;
  for (const polygon of polygonsOf(geometry)) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

async function projectKnown() {
  const input = {
    type: "FeatureCollection",
    features: KNOWN.map((k) => ({
      type: "Feature",
      properties: { zip: k.zip },
      geometry: { type: "Point", coordinates: [k.lon, k.lat] },
    })),
  };
  const out = await mapshaper.applyCommands(
    "-i points.json -proj albersusa -o points.json format=geojson",
    { "points.json": input }
  );
  const fc = JSON.parse(out["points.json"]);
  return fc.features.map((f) => f.geometry.coordinates);
}

const zctaTopo = load("zcta.json");
const nationTopo = load("nation.json");

check(Boolean(zctaTopo.objects?.zcta), "zcta.json has object 'zcta'");
check(Boolean(nationTopo.objects?.nation), "nation.json has object 'nation'");

checkTopology(zctaTopo, "zcta");
checkTopology(nationTopo, "nation");

const zips = topojson.feature(zctaTopo, zctaTopo.objects.zcta).features;
const nation = topojson.feature(nationTopo, nationTopo.objects.nation);
const nationGeom = nation.features ? nation.features[0].geometry : nation.geometry;

const missingZip = zips.filter((f) => !/^\d{5}$/.test(f.properties?.zip ?? "")).length;
const nullGeom = zips.filter((f) => !f.geometry).length;
const uniqueZips = new Set(zips.map((f) => f.properties?.zip)).size;
check(uniqueZips > 33000, `zcta: ${uniqueZips.toLocaleString()} ZIPs in ${zips.length.toLocaleString()} polygon parts`);
check(missingZip === 0, "zcta: every feature has a 5-digit zip property", `${missingZip} missing`);
check(nullGeom === 0, "zcta: no null geometries", `${nullGeom} null`);
const extraProps = zips.filter((f) => Object.keys(f.properties ?? {}).join() !== "zip").length;
check(extraProps === 0, "zcta: properties contain only 'zip'", `${extraProps} with extras`);

checkRings(zips, "zcta");
checkRings(nation.features ?? [nation], "nation");

const projected = await projectKnown();
KNOWN.forEach((known, i) => {
  const point = projected[i];
  const hits = zips.filter((f) => contains(f.geometry, point));
  check(hits.length <= 1, `${known.name} is covered by at most one ZIP`, `${hits.length} hits`);
  const hit = hits[0];
  check(hit?.properties.zip === known.zip, `${known.zip} contains ${known.name}`, `found ${hit?.properties.zip ?? "nothing"}`);
});

// Alignment: each ZIP's largest part should sit inside the separate nation
// outline. A few offshore islets and very concave shapes land outside.
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

const largest = new Map();
for (const f of zips) {
  for (const polygon of polygonsOf(f.geometry)) {
    const ring = polygon[0];
    const area = ringArea(ring);
    const prev = largest.get(f.properties.zip);
    if (!prev || area > prev.area) largest.set(f.properties.zip, { area, ring });
  }
}

const outside = [];
for (const [zip, { ring }] of largest) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  if (!contains(nationGeom, [sx / ring.length, sy / ring.length])) outside.push(zip);
}
const share = 1 - outside.length / largest.size;
check(share > 0.995, "ZIPs fall inside the nation outline", `${(share * 100).toFixed(2)}% of ZIPs (largest part) inside; outside e.g. ${outside.slice(0, 8).join(", ")}`);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
