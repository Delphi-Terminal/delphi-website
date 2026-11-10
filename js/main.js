const WORDS_MS = 1700;

const rotate = document.querySelector(".hero__rotate");
if (rotate) {
  const words = [...rotate.querySelectorAll(".hero__word")];

  setInterval(() => {
    const current = words.findIndex((word) => word.classList.contains("is-active"));
    const next = (current + 1) % words.length;
    if (current >= 0) words[current].classList.remove("is-active");
    words[next].classList.add("is-active");
  }, WORDS_MS);
}

const quote = document.querySelector(".quote");
if (quote) {
  const modes = [...quote.querySelectorAll(".quote__mode")];

  for (const mode of modes) {
    mode.addEventListener("click", () => {
      for (const other of modes) {
        const active = other === mode;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-selected", active ? "true" : "false");
      }
    });
  }

  quote.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

// Projected positions from zip-map/scripts/build-hero.js (same frame as /us-zips.svg).
const HUBS = [
  { id: "seattle", x: 115.2, y: 55.1 },
  { id: "oakland", x: 59.3, y: 255.4 },
  { id: "los-angeles", x: 105.4, y: 350.0 },
  { id: "denver", x: 344.5, y: 267.2 },
  { id: "phoenix", x: 208.6, y: 384.2 },
  { id: "dallas", x: 471.1, y: 419.5 },
  { id: "houston", x: 501.1, y: 486.0 },
  { id: "new-orleans", x: 598.1, y: 478.6 },
  { id: "minneapolis", x: 530.4, y: 162.1 },
  { id: "chicago", x: 620.5, y: 222.7 },
  { id: "kansas-city", x: 512.6, y: 287.5 },
  { id: "detroit", x: 690.5, y: 205.1 },
  { id: "indianapolis", x: 648.1, y: 265.2 },
  { id: "pittsburgh", x: 744.2, y: 237.6 },
  { id: "memphis", x: 591.6, y: 368.6 },
  { id: "atlanta", x: 692.1, y: 389.2 },
  { id: "savannah", x: 754.7, y: 416.1 },
  { id: "miami", x: 792.6, y: 544.7 },
  { id: "new-york", x: 836.8, y: 212.9 },
  { id: "norfolk", x: 818.3, y: 301.4 },
];

const CHICAGO_NEIGHBORS = [
  "minneapolis",
  "detroit",
  "indianapolis",
  "kansas-city",
  "pittsburgh",
  "memphis",
  "denver",
];

const WAVE2_LINKS = {
  denver: ["seattle", "oakland", "los-angeles"],
  "kansas-city": ["dallas", "phoenix"],
  memphis: ["houston", "miami"],
  indianapolis: ["new-orleans", "savannah"],
  minneapolis: ["atlanta"],
};

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function buildGraph(hubs, k = 4) {
  const byId = new Map(hubs.map((hub) => [hub.id, hub]));
  const adj = new Map(hubs.map((hub) => [hub.id, new Set()]));

  for (const hub of hubs) {
    const nearest = hubs
      .filter((other) => other.id !== hub.id)
      .map((other) => ({ id: other.id, d: dist(hub, other) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k);

    for (const n of nearest) {
      adj.get(hub.id).add(n.id);
      adj.get(n.id).add(hub.id);
    }
  }

  for (const id of CHICAGO_NEIGHBORS) {
    if (!byId.has(id)) continue;
    adj.get("chicago").add(id);
    adj.get(id).add("chicago");
  }

  return { byId, adj };
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pickParent(candidates, treeDegree) {
  let best = [];
  let bestDegree = Infinity;

  for (const from of candidates) {
    const d = treeDegree.get(from) ?? 0;
    if (d < bestDegree) {
      bestDegree = d;
      best = [from];
    } else if (d === bestDegree) {
      best.push(from);
    }
  }

  return best[Math.floor(Math.random() * best.length)];
}

function nearestReached(hub, reached, byId, limit = 4) {
  return [...reached]
    .map((id) => ({ id, d: dist(hub, byId.get(id)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((item) => item.id);
}

// Exactly two waves, but every hub gets a connection.
function buildWaves(startId, adj, byId) {
  const treeDegree = new Map([...byId.keys()].map((id) => [id, 0]));
  const reached = new Set([startId]);
  const waves = [];

  // Wave 1: start → its neighbors (unique targets).
  const wave1Claims = new Map();
  for (const to of adj.get(startId) || []) {
    if (to === startId || reached.has(to)) continue;
    if (!wave1Claims.has(to)) wave1Claims.set(to, []);
    wave1Claims.get(to).push(startId);
  }

  const wave1 = [];
  for (const [to, candidates] of wave1Claims) {
    const from = pickParent(candidates, treeDegree);
    wave1.push([from, to]);
    treeDegree.set(from, (treeDegree.get(from) ?? 0) + 1);
    treeDegree.set(to, (treeDegree.get(to) ?? 0) + 1);
    reached.add(to);
  }
  if (wave1.length) waves.push(wave1);

  // Wave 2: forced corridors first, then any leftover hubs.
  const wave2 = [];

  for (const [from, targets] of Object.entries(WAVE2_LINKS)) {
    if (!reached.has(from)) continue;
    for (const to of targets) {
      if (!byId.has(to) || reached.has(to)) continue;
      wave2.push([from, to]);
      treeDegree.set(from, (treeDegree.get(from) ?? 0) + 1);
      treeDegree.set(to, (treeDegree.get(to) ?? 0) + 1);
      reached.add(to);
    }
  }

  const remaining = [...byId.keys()].filter((id) => !reached.has(id));
  for (const to of remaining) {
    const hub = byId.get(to);
    const candidates = nearestReached(hub, reached, byId, 4);
    if (!candidates.length) continue;
    const from = pickParent(candidates, treeDegree);
    wave2.push([from, to]);
    treeDegree.set(from, (treeDegree.get(from) ?? 0) + 1);
    treeDegree.set(to, (treeDegree.get(to) ?? 0) + 1);
    reached.add(to);
  }

  if (wave2.length) waves.push(wave2);
  return waves;
}

function curvePath(a, b, bias = 1) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(42, len * 0.18) * bias;
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

const VIEW_W = 960;
const VIEW_H = 600;

const BASE_STYLE = `
.us-outline { fill: #fff; filter: url(#us-edge-glow); }
.zip-lines path { fill: none; stroke: #111; stroke-width: 0.4; stroke-opacity: 0.4; stroke-linejoin: round; stroke-linecap: round; }
.us-outline-stroke { fill: none; stroke: #111; stroke-width: 1.75; stroke-linejoin: round; stroke-linecap: round; }
.hub-zips path { fill: #0b3a8c; stroke: #0b3a8c; stroke-width: 0.6; stroke-linejoin: round; }
`;

const EDGE_GLOW = `
<filter id="us-edge-glow" x="-30%" y="-45%" width="160%" height="190%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="nearBlur" />
  <feComponentTransfer in="nearBlur" result="near"><feFuncA type="linear" slope="1.3" /></feComponentTransfer>
  <feFlood flood-color="#fff" flood-opacity="0.45" />
  <feComposite in2="near" operator="in" result="nearGlow" />
  <feMerge><feMergeNode in="nearGlow" /><feMergeNode in="SourceGraphic" /></feMerge>
</filter>`;

// Draw an SVG string into a new canvas once. Browser zoom then only rescales
// the bitmap instead of re-rasterizing the vector map on every zoom step.
async function rasterize(markup, width, height, className) {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Position an absolutely placed layer that extends `pad` viewBox units past
// each edge of the map.
function placeOverflow(el, pad) {
  el.style.left = `${(-pad / VIEW_W) * 100}%`;
  el.style.top = `${(-pad / VIEW_H) * 100}%`;
  el.style.width = `${((VIEW_W + 2 * pad) / VIEW_W) * 100}%`;
  el.style.height = `${((VIEW_H + 2 * pad) / VIEW_H) * 100}%`;
}

// Land fill, ZIP borders, hub ZIP areas and outline come from one shared
// topology, so everything ends exactly on the outline without masking. They
// are static, so they're drawn into bitmaps; only hub hit areas stay in the SVG.
async function loadBaseMap(svg) {
  const res = await fetch("/us-zips.svg");
  if (!res.ok) throw new Error(`Failed to load base map (${res.status})`);
  const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
  const d = (selector) => {
    const node = doc.querySelector(selector);
    const value = node?.getAttribute("d") ?? node?.querySelector("path")?.getAttribute("d");
    if (!value) throw new Error(`Base map is missing ${selector}`);
    return value;
  };
  const shapes = { land: d(".us-outline"), mesh: d(".zip-lines"), outline: d(".us-outline-stroke") };

  const frame = svg.closest(".map-frame");
  const width = svg.getBoundingClientRect().width || VIEW_W / 2;
  const dpr = window.devicePixelRatio || 1;

  // Crisp up to ~2× browser zoom; the edge glow needs room past the viewBox.
  const pad = 60;
  const scale = Math.min(4, Math.max(1.5, (width * dpr * 2) / VIEW_W));
  const root = doc.documentElement;
  root.setAttribute("viewBox", `${-pad} ${-pad} ${VIEW_W + 2 * pad} ${VIEW_H + 2 * pad}`);
  root.setAttribute("width", String((VIEW_W + 2 * pad) * scale));
  root.setAttribute("height", String((VIEW_H + 2 * pad) * scale));
  root.insertAdjacentHTML("afterbegin", `<style>${BASE_STYLE}</style><defs>${EDGE_GLOW}</defs>`);
  const markup = new XMLSerializer().serializeToString(doc);

  // Wide white halo: the land scaled up and heavily blurred. It's soft, so a
  // low-resolution bitmap is enough.
  const haloBlur = (150 * VIEW_W) / width;
  const haloPad = Math.round(haloBlur * 3 + VIEW_W * 0.2);
  const haloScale = 0.35;
  const haloMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-haloPad} ${-haloPad} ${VIEW_W + 2 * haloPad} ${VIEW_H + 2 * haloPad}" width="${(VIEW_W + 2 * haloPad) * haloScale}" height="${(VIEW_H + 2 * haloPad) * haloScale}">
<defs><filter id="b" filterUnits="userSpaceOnUse" x="${-haloPad}" y="${-haloPad}" width="${VIEW_W + 2 * haloPad}" height="${VIEW_H + 2 * haloPad}"><feGaussianBlur stdDeviation="${haloBlur.toFixed(1)}" /></filter></defs>
<g filter="url(#b)"><path fill="#fff" fill-rule="evenodd" transform="translate(480 300) scale(1.35) translate(-480 -300)" d="${shapes.land}" /></g>
</svg>`;

  const [base, halo] = await Promise.all([
    rasterize(markup, (VIEW_W + 2 * pad) * scale, (VIEW_H + 2 * pad) * scale, "map-base"),
    rasterize(haloMarkup, (VIEW_W + 2 * haloPad) * haloScale, (VIEW_H + 2 * haloPad) * haloScale, "map-halo"),
  ]);
  placeOverflow(base, pad);
  placeOverflow(halo, haloPad);
  frame.prepend(halo, base);

  // Invisible hub ZIP areas: hovering one shows that hub's label.
  const hits = document.importNode(doc.querySelector(".hub-zips"), true);
  hits.setAttribute("aria-hidden", "true");
  svg.insertBefore(hits, svg.querySelector(".hubs"));
  for (const area of hits.querySelectorAll("[data-hub]")) {
    const hub = svg.querySelector(`.hubs [data-hub="${area.dataset.hub}"]`);
    if (!hub) continue;
    area.addEventListener("pointerenter", () => hub.classList.add("is-hover"));
    area.addEventListener("pointerleave", () => hub.classList.remove("is-hover"));
  }

  return shapes;
}

const NEON = "11, 58, 160";

// Canvas backing-store scale fixed at creation: resizing a canvas clears and
// redraws it, which shows up as a glitch while zooming.
function fixedCanvasScale(el, headroom) {
  const width = el.getBoundingClientRect().width || VIEW_W / 2;
  return Math.min(3, Math.max(1, (width * (window.devicePixelRatio || 1) * headroom) / VIEW_W));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Neon layer over the map: each hub city has a glow that lights up the ZIP
// borders around it and swells and shrinks on its own rhythm, and hub ZIPs
// pulse at random. The CSS drop-shadow on .map-glow adds the neon bloom.
function initGlow(svg, frame, shapes, hubData) {
  const canvas = document.createElement("canvas");
  canvas.className = "map-glow";
  canvas.setAttribute("aria-hidden", "true");
  frame.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const mesh = new Path2D(shapes.mesh);
  const outline = new Path2D(shapes.outline);
  const land = new Path2D(shapes.land);

  // Each hub glows in independent bursts: wait a random time, swell to a
  // random peak, fade back to a dim idle glow, repeat.
  function scheduleBurst(glow, now) {
    glow.start = now + rand(600, 5500);
    glow.duration = rand(2800, 4800);
    glow.peak = rand(40, 58);
  }
  const glows = hubData.hubs.map((hub) => {
    const glow = { x: hub.x, y: hub.y };
    scheduleBurst(glow, performance.now() - rand(0, 4000));
    return glow;
  });

  const zips = hubData.hubs.flatMap((hub) =>
    hub.zips.map((z) => ({
      path: new Path2D(z.d),
      core: z.core === 1,
      falloff: 1 - z.r * 0.75,
      phase: rand(0, Math.PI * 2),
      speed: rand(0.3, 0.95),
    }))
  );

  const borders = document.createElement("canvas");
  const bctx = borders.getContext("2d");
  const scale = fixedCanvasScale(svg, 1.5);

  function resize() {
    canvas.width = Math.round(VIEW_W * scale);
    canvas.height = Math.round(VIEW_H * scale);

    // Pre-render the neon ZIP borders once; the hub glows reveal them.
    borders.width = canvas.width;
    borders.height = canvas.height;
    bctx.setTransform(scale, 0, 0, scale, 0, 0);
    bctx.lineJoin = "round";
    bctx.lineCap = "round";
    bctx.strokeStyle = `rgb(${NEON})`;
    bctx.lineWidth = 0.55;
    bctx.stroke(mesh);
    bctx.lineWidth = 1.4;
    bctx.stroke(outline);
  }

  const startTime = performance.now();

  function draw(now) {
    const seconds = (now - startTime) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hub glows: paint a soft mask per city sized by its current burst, then
    // keep only the neon borders underneath it.
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const heads = glows.map((glow) => {
      let t = (now - glow.start) / glow.duration;
      if (t >= 1) {
        scheduleBurst(glow, now);
        t = 0;
      }
      const burst = t > 0 ? Math.sin(Math.PI * t) ** 2 : 0;
      const idle = 12;
      return { x: glow.x, y: glow.y, r: idle + (glow.peak - idle) * burst, alpha: 0.45 + 0.5 * burst };
    });
    for (const head of heads) {
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, head.r);
      g.addColorStop(0, `rgba(255, 255, 255, ${head.alpha})`);
      g.addColorStop(0.45, `rgba(255, 255, 255, ${head.alpha * 0.5})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(head.x - head.r, head.y - head.r, head.r * 2, head.r * 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(borders, 0, 0);

    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.clip(land, "evenodd");
    for (const head of heads) {
      const r = head.r * 0.55;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r);
      g.addColorStop(0, `rgba(${NEON}, ${0.14 * head.alpha})`);
      g.addColorStop(1, `rgba(${NEON}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(head.x - r, head.y - r, r * 2, r * 2);
    }
    ctx.restore();

    // Hub ZIPs: sparse random pulses, brightest in the city's own ZIP area
    // and fading toward the edge of the surrounding ring.
    ctx.fillStyle = `rgb(${NEON})`;
    ctx.strokeStyle = "rgb(30, 80, 200)";
    ctx.lineWidth = 0.45;
    ctx.lineJoin = "round";
    for (const z of zips) {
      const wave = Math.max(0, Math.sin(seconds * z.speed + z.phase));
      const pulse = wave ** 5;
      const alpha = ((z.core ? 0.3 : 0) + pulse) * z.falloff;
      if (alpha < 0.03) continue;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fill(z.path);
      ctx.stroke(z.path);
    }
    ctx.globalAlpha = 1;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let running = false;
  let visible = true;
  let raf = 0;

  resize();

  function loop(now) {
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function update() {
    const shouldRun = visible && !document.hidden && !reduceMotion;
    if (shouldRun && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    update();
  }).observe(frame);
  document.addEventListener("visibilitychange", update);

  draw(performance.now());
  update();
}

async function loadGlowData() {
  const res = await fetch("/hub-zips.json");
  if (!res.ok) throw new Error(`Failed to load hub ZIPs (${res.status})`);
  return res.json();
}

async function loadRouteData() {
  const res = await fetch("/route-zips.json");
  if (!res.ok) throw new Error(`Failed to load route ZIPs (${res.status})`);
  return res.json();
}

function initHubNetwork() {
  const svg = document.querySelector(".map-frame svg");
  const hubsGroup = svg?.querySelector(".hubs");
  if (!svg || !hubsGroup) return;

  const frame = svg.closest(".map-frame");
  const glowData = loadGlowData();
  glowData.catch(() => {});
  loadBaseMap(svg)
    .then(async (shapes) => {
      initGlow(svg, frame, shapes, await glowData);
    })
    .catch((err) => console.warn(err))
    .finally(() => frame?.classList.add("is-ready"));

  const hubNodes = [...hubsGroup.querySelectorAll(".hub")];
  hubNodes.forEach((node, i) => {
    if (HUBS[i]) node.dataset.hub = HUBS[i].id;
  });

  const { byId, adj } = buildGraph(HUBS, 4);
  const waves = buildWaves("chicago", adj, byId);
  if (!waves.length) return;

  const routes = document.createElementNS("http://www.w3.org/2000/svg", "g");
  routes.setAttribute("class", "routes");
  svg.insertBefore(routes, hubsGroup);

  const stage = document.querySelector('.hero__stage:not(.hero__stage--story)');
  const storyStage = document.querySelector(".hero__stage--story");
  const backed = document.querySelector(".hero__backed");
  hubsGroup.querySelector('[data-hub="chicago"]')?.classList.add("is-lit");

  const wavePaths = waves.map((edges) =>
    edges
      .filter(([fromId, toId]) => byId.has(fromId) && byId.has(toId))
      .map(([fromId, toId]) => ({ fromId, toId, cells: [], path: null, length: 0, lit: false }))
  );

  // Each route is a chain of ZIPs from zip-map/scripts/build-hero.js that
  // fills in from the source hub toward the target as you scroll. Cells are
  // painted on a canvas that only redraws while a cell is fading.
  const routeCanvas = document.createElement("canvas");
  routeCanvas.className = "map-routes";
  routeCanvas.setAttribute("aria-hidden", "true");
  frame.appendChild(routeCanvas);
  const routeScale = fixedCanvasScale(svg, 2);
  routeCanvas.width = Math.round(VIEW_W * routeScale);
  routeCanvas.height = Math.round(VIEW_H * routeScale);
  const rctx = routeCanvas.getContext("2d");
  const ROUTE_FADE_MS = 220;
  let cellPaths = [];
  let routeRaf = 0;
  let routeLast = 0;

  function drawRoutes(now) {
    const dt = routeLast ? now - routeLast : 16;
    routeLast = now;
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    rctx.clearRect(0, 0, routeCanvas.width, routeCanvas.height);
    rctx.setTransform(routeScale, 0, 0, routeScale, 0, 0);
    let fading = false;
    const visible = [];
    for (const item of wavePaths.flat()) {
      for (const cell of item.cells) {
        const goal = cell.on ? 1 : 0;
        if (cell.alpha !== goal) {
          const step = dt / ROUTE_FADE_MS;
          cell.alpha = goal ? Math.min(1, cell.alpha + step) : Math.max(0, cell.alpha - step);
          fading = true;
        }
        if (cell.alpha > 0) visible.push(cell);
      }
    }

    // Fills first, then outlines, so neighboring fills don't cover borders.
    rctx.fillStyle = "#4b9df2";
    rctx.strokeStyle = "#4b9df2";
    rctx.lineWidth = 0.6;
    rctx.lineJoin = "round";
    for (const cell of visible) {
      rctx.globalAlpha = cell.alpha;
      rctx.fill(cellPaths[cell.index]);
      rctx.stroke(cellPaths[cell.index]);
    }
    rctx.strokeStyle = "#111";
    rctx.lineWidth = 0.75;
    for (const cell of visible) {
      rctx.globalAlpha = cell.alpha;
      rctx.stroke(cellPaths[cell.index]);
    }
    rctx.globalAlpha = 1;
    routeRaf = fading ? requestAnimationFrame(drawRoutes) : 0;
    if (!fading) routeLast = 0;
  }

  function requestRouteDraw() {
    if (!routeRaf) routeRaf = requestAnimationFrame(drawRoutes);
  }

  let bendSign = 1;
  function buildRoutes(data) {
    cellPaths = (data?.zips ?? []).map((d) => new Path2D(d));
    for (const item of wavePaths.flat()) {
      const forward = item.fromId < item.toId;
      const chain = data?.routes?.[forward ? `${item.fromId}|${item.toId}` : `${item.toId}|${item.fromId}`];
      if (chain) {
        item.cells = chain
          .map(([index, t]) => ({ index, at: (forward ? t : 1000 - t) / 1000, on: false, alpha: 0 }))
          .sort((a, b) => a.at - b.at);
        continue;
      }

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "route-line");
      path.setAttribute("d", curvePath(byId.get(item.fromId), byId.get(item.toId), bendSign));
      bendSign *= -1;
      routes.appendChild(path);
      item.path = path;
      item.length = path.getTotalLength();
      path.style.strokeDasharray = `${item.length}`;
      path.style.strokeDashoffset = `${item.length}`;
    }
    applyProgress(progress);
  }

  loadRouteData()
    .catch((err) => {
      console.warn(err);
      return null;
    })
    .then(buildRoutes);

  const waveCount = waves.length;
  const maxProgress = waveCount + 0.35; // a short beat after the network to reveal the bar
  const shell = document.querySelector(".shell");
  let progress = 0;
  let target = 0;
  let raf = 0;

  function applyStage(value) {
    if (!stage) return;
    // Hold still for the first half of neighbor wave 1, then exit by wave end.
    const leave = Math.min(1, Math.max(0, (value - 0.5) / 0.5));
    stage.style.transform = `translateY(${-leave * 115}%)`;
    stage.style.opacity = String(1 - leave);
    stage.classList.toggle("is-away", leave >= 0.98);
  }

  function applyStory(value) {
    if (!storyStage) return;
    // Show once wave-1 neighbors light (~0.92), then hold through later waves.
    const enter = Math.min(1, Math.max(0, (value - 0.92) / 0.28));
    storyStage.style.opacity = String(enter);
    storyStage.style.transform = `translateY(${(1 - enter) * 18}%)`;
    storyStage.classList.toggle("is-in", enter >= 0.98);
    storyStage.setAttribute("aria-hidden", enter > 0.05 ? "false" : "true");
    if (backed) {
      backed.style.opacity = String(enter);
      backed.setAttribute("aria-hidden", enter > 0.05 ? "false" : "true");
    }
  }

  // Hero 1 → 2: slide the map from the right edge to the left column (where
  // hero 1's copy was), lifting it slightly, while the hero 2 copy comes in
  // on the right.
  const mapSection = document.querySelector(".map-section");
  const heroEl = document.querySelector(".hero");
  const wideLayout = window.matchMedia("(min-width: 901px)");
  function applyMap(value) {
    if (!mapSection || !heroEl) return;
    if (!wideLayout.matches) {
      mapSection.style.transform = "";
      return;
    }
    const t = Math.min(1, Math.max(0, (value - 0.5) / 0.7));
    const eased = t * t * (3 - 2 * t);
    const shift = Math.max(0, mapSection.offsetLeft - heroEl.offsetLeft);
    mapSection.style.transform = `translate(${(-shift * eased).toFixed(1)}px, ${(-18 * eased).toFixed(2)}%)`;
  }
  // The blue and the black bar beneath it run past the window by the shell's
  // negative bottom margin (--shell-tail in CSS); the reveal lifts the shell a
  // bit further so a strip of white shows beneath the bar.
  const WHITE_STRIP_REM = 5;
  let overhang = 0;
  function measureOverhang() {
    const margin = shell ? Math.max(0, -parseFloat(getComputedStyle(shell).marginBottom) || 0) : 0;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    overhang = margin > 0 ? margin + WHITE_STRIP_REM * rem : 0;
  }
  measureOverhang();
  window.addEventListener("resize", () => {
    measureOverhang();
    applyMap(progress);
    applyReveal(progress);
  });

  function applyReveal(value) {
    // After all neighbors: lift the blue by its overhang to reveal its bottom
    // edge, the black bar, and the top of the white section below.
    const t = Math.min(1, Math.max(0, (value - waveCount) / 0.3));
    const reveal = t * t * (3 - 2 * t);
    if (!shell) return;
    shell.style.transform = `translateY(${(-reveal * overhang).toFixed(1)}px)`;
  }

  // Native page scrolling only takes over once the animation has finished,
  // and hands back when scrolled to the top.
  function syncHijack() {
    document.documentElement.classList.toggle("is-hijacked", target < maxProgress);
  }
  // The animation always starts at the top, so a reload mustn't restore a
  // scroll position below it (page scrolling would be locked out there).
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  syncHijack();

  function applyProgress(value) {
    progress = value;
    applyStage(value);
    applyStory(value);
    applyMap(value);
    applyReveal(value);

    for (let i = 0; i < wavePaths.length; i += 1) {
      const local = Math.min(1, Math.max(0, progress - i));

      for (const item of wavePaths[i]) {
        if (item.path) item.path.style.strokeDashoffset = `${item.length * (1 - local)}`;
        for (const cell of item.cells) {
          const on = local > 0 && cell.at <= local;
          if (on !== cell.on) {
            cell.on = on;
            requestRouteDraw();
          }
        }

        if (local >= 0.92 && !item.lit) {
          item.lit = true;
          hubsGroup.querySelector(`[data-hub="${item.toId}"]`)?.classList.add("is-lit");
        } else if (local < 0.5 && item.lit) {
          item.lit = false;
          hubsGroup.querySelector(`[data-hub="${item.toId}"]`)?.classList.remove("is-lit");
        }
      }
    }
  }

  function tick() {
    raf = 0;
    const next = progress + (target - progress) * 0.18;
    if (Math.abs(target - next) < 0.001) {
      applyProgress(target);
      return;
    }
    applyProgress(next);
    raf = requestAnimationFrame(tick);
  }

  function nudge(delta) {
    const before = target;
    target = Math.min(maxProgress, Math.max(0, target + delta));
    syncHijack();
    if (target === before && ((delta > 0 && before >= maxProgress) || (delta < 0 && before <= 0))) {
      return false;
    }
    if (!raf) raf = requestAnimationFrame(tick);
    return target < maxProgress || before < maxProgress;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      // Trackpad pinch arrives as ctrl+wheel; leave it to the browser's zoom.
      if (event.deltaY === 0 || event.ctrlKey) return;
      const consumed =
        (event.deltaY > 0 && target < maxProgress) || (event.deltaY < 0 && target > 0 && window.scrollY <= 0);
      if (!consumed) return;
      event.preventDefault();
      nudge(event.deltaY / 900);
    },
    { passive: false }
  );

  let touchY = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      // Two-finger gestures are pinch-zoom; don't hijack them.
      if (touchY == null || event.touches.length > 1) return;
      const y = event.touches[0]?.clientY;
      if (y == null) return;
      const dy = touchY - y;
      touchY = y;
      if (dy === 0) return;
      const consumed = (dy > 0 && target < maxProgress) || (dy < 0 && target > 0 && window.scrollY <= 0);
      if (!consumed) return;
      event.preventDefault();
      nudge(dy / 400);
    },
    { passive: false }
  );
}

initHubNetwork();

// Specialized services: "Our Modes" and the services band stick in place once
// the second row of services is fully on screen. The track around them is
// taller by the rows' sideways travel, and scrolling through that extra length
// slides the rows left so columns four and five come into view; then the page
// carries on to the footer. It's all native scrolling, so trackpad momentum,
// the scrollbar, and the keyboard behave the same as everywhere else.
function initServicesScroll() {
  const track = document.querySelector(".services-track");
  const stage = track?.querySelector(".services-stage");
  const band = stage?.querySelector(".blue-band");
  const pin = band?.querySelector(".blue-band__pin");
  const view = band?.querySelector(".services-window");
  const rows = band?.querySelector(".services");
  if (!track || !stage || !pin || !view || !rows) return;
  const wide = window.matchMedia("(min-width: 901px)");
  const buttons = [...band.querySelectorAll(".services-nav__btn")];
  const BELOW_ROWS = 48; // blue left showing beneath the second row while held
  let travel = 0;
  let startY = 0; // page scroll where the stage sticks and the slide begins

  function layout() {
    if (!wide.matches) {
      travel = 0;
      track.style.height = "";
      stage.style.removeProperty("--stage-top");
      rows.style.transform = "";
      update();
      return;
    }
    travel = Math.max(0, rows.scrollWidth - view.clientWidth + 12);
    // Stick with the pin's bottom padding, less BELOW_ROWS, hanging below the
    // window, so the hold starts as soon as the second row is fully in view.
    const padBottom = parseFloat(getComputedStyle(pin).paddingBottom) || 0;
    const stageTop = window.innerHeight - stage.offsetHeight + Math.max(0, padBottom - BELOW_ROWS);
    stage.style.setProperty("--stage-top", `${stageTop}px`);
    track.style.height = `${stage.offsetHeight + travel}px`;
    startY = track.getBoundingClientRect().top + window.scrollY - stageTop;
    update();
  }

  const progress = () => (travel ? Math.min(1, Math.max(0, (window.scrollY - startY) / travel)) : 0);

  function update() {
    const p = progress();
    if (travel) rows.style.transform = `translateX(${(-p * travel).toFixed(1)}px)`;
    for (const btn of buttons) {
      btn.disabled = !travel || (Number(btn.dataset.step) < 0 ? p <= 0.001 : p >= 0.999);
    }
  }

  window.addEventListener("scroll", update, { passive: true });

  // Sideways swipes slide the rows too (by scrolling through the hold), but
  // only while held, and never past either end of the slide.
  function sideways(dx) {
    const y = window.scrollY;
    if (!travel || y < startY - 1 || y > startY + travel + 1) return false;
    const next = Math.min(startY + travel, Math.max(startY, y + dx));
    if (Math.abs(next - y) < 0.5) return false;
    window.scrollTo(0, next);
    return true;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (sideways(event.deltaX)) event.preventDefault();
    },
    { passive: false }
  );

  let touch = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      const p = event.touches[0];
      touch = event.touches.length === 1 && p ? { x: p.clientX, y: p.clientY } : null;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      const p = event.touches[0];
      if (!touch || !p) return;
      const dx = touch.x - p.clientX;
      const dy = touch.y - p.clientY;
      touch = { x: p.clientX, y: p.clientY };
      if (Math.abs(dx) > Math.abs(dy) && sideways(dx)) event.preventDefault();
    },
    { passive: false }
  );

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const card = rows.querySelector("li");
      const gap = parseFloat(getComputedStyle(rows).columnGap) || 0;
      const column = (card ? card.getBoundingClientRect().width : 0) + gap;
      const at = progress() * travel;
      const next = Math.min(travel, Math.max(0, at + Number(btn.dataset.step) * column));
      window.scrollTo({ top: startY + next, behavior: "smooth" });
    });
  }

  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  wide.addEventListener("change", layout);
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(stage);
  layout();
}

initServicesScroll();

// Header Contact dropdown: hover opens it in CSS; a click toggles it (for
// touch, and for anyone who clicks), and clicking elsewhere or Escape closes.
function initContactMenu() {
  const menu = document.querySelector(".contact-menu");
  const toggle = menu?.querySelector(".contact-menu__toggle");
  if (!menu || !toggle) return;

  function setOpen(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
  menu.addEventListener("mouseleave", () => setOpen(false));
  // Tabbing into the links keeps it open; tabbing out of the menu closes it.
  menu.addEventListener("focusin", (event) => {
    if (event.target !== toggle) setOpen(true);
  });
  menu.addEventListener("focusout", (event) => {
    if (!menu.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
}

initContactMenu();
