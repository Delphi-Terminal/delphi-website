// The dot grids behind the heroes. `rgb` is the dot colour (white unless
// set) and `alphas` holds the dim and bright dot opacities; with `blocks`, the
// top-left 2×2 of every 3×3 block is bright, otherwise every dot is dim.
// Shared by the page-load intro so its dots land exactly on the hero's.
const DOT_GRIDS = [
  // Homepage hero blue.
  { host: ".shell", canvas: ".shell__dots", pitch: 12, size: 1.5, alphas: [0.1, 0.37], blocks: true },
  // Shippers hero 1, on white. `morph` gathers this grid into the logo on hero 2.
  { host: ".ship-fold__pin", canvas: ".ship-hero__dots", pitch: 14, size: 2, alphas: [0.12], rgb: "0, 0, 0", morph: true },
  // Carriers hero 1, blue with a sparse white grid.
  { host: ".carriers-hero", canvas: ".page-hero__dots", pitch: 24, size: 2, alphas: [0.17] },
  // Mission hero 1, black with a sparse white grid.
  { host: ".mission-hero", canvas: ".page-hero__dots", pitch: 24, size: 2, alphas: [0.12] },
];

// Page-load intro: the white logo on blue, redrawn as dots that fly out to
// the page's dot grid (continued across the whole window), then the blue
// fades to reveal the page.
function initIntro() {
  const intro = document.querySelector(".intro");
  const logo = intro && intro.querySelector(".intro__logo");
  const canvas = intro && intro.querySelector(".intro__dots");
  const ctx = canvas && canvas.getContext("2d");
  if (!intro || !logo || !ctx) return;
  intro.style.animation = "none";

  const grid = DOT_GRIDS.find((g) => document.querySelector(`${g.host} ${g.canvas}`)) || {
    pitch: 12,
    size: 1.5,
    alphas: [0.3],
  };
  const gridCanvas = grid.canvas && document.querySelector(`${grid.host} ${grid.canvas}`);
  const HOLD = 500; // logo on screen before it breaks apart, ms
  const DISPERSE = 1000; // breaking apart, ms
  const BEND = 0.35; // most a path bows sideways, as a fraction of its length
  const SAMPLE = 5; // spacing of the dots the logo is redrawn from, px
  // The dots look settled once the burst is this far along (the easing leaves
  // only a hair of travel after it). They then rest on the blue for PAUSE
  // before the page fades in.
  const SETTLED_AT = 0.65;
  const PAUSE = 200; // ms

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    intro.classList.add("is-done");
    document.documentElement.dataset.introDone = "";
    document.dispatchEvent(new Event("intro:done"));
    setTimeout(() => intro.remove(), 450);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }
  // If frames never run (e.g. the tab opened in the background), still get
  // out of the way.
  setTimeout(finish, HOLD + DISPERSE + 1200);

  const img = new Image();
  img.src = "/logo.png";
  img
    .decode()
    .then(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Opaque spots of the logo, in window coordinates.
      const box = logo.getBoundingClientRect();
      const lw = Math.max(1, Math.round(box.width));
      const lh = Math.max(1, Math.round(box.height));
      const probe = document.createElement("canvas");
      probe.width = lw;
      probe.height = lh;
      const pctx = probe.getContext("2d");
      pctx.drawImage(img, 0, 0, lw, lh);
      const alpha = pctx.getImageData(0, 0, lw, lh).data;
      const srcX = [];
      const srcY = [];
      for (let y = 0; y < lh; y += SAMPLE) {
        for (let x = 0; x < lw; x += SAMPLE) {
          if (alpha[(y * lw + x) * 4 + 3] > 128) {
            srcX.push(box.left + x);
            srcY.push(box.top + y);
          }
        }
      }
      if (!srcX.length) return finish();

      // The hero grid's origin; its rows and columns carry on past the hero.
      const origin = (gridCanvas && gridCanvas.getBoundingClientRect()) || { left: 0, top: 0 };
      const { pitch, size: dot, alphas, blocks } = grid;
      const i0 = Math.floor(-origin.left / pitch) - 1;
      const i1 = Math.ceil((width - origin.left) / pitch);
      const j0 = Math.floor(-origin.top / pitch) - 1;
      const j1 = Math.ceil((height - origin.top) / pitch);
      const count = (i1 - i0) * (j1 - j0);
      const fromX = new Float32Array(count);
      const fromY = new Float32Array(count);
      const toX = new Float32Array(count);
      const toY = new Float32Array(count);
      // Bow of each path: its sideways control point for a quadratic curve.
      const midX = new Float32Array(count);
      const midY = new Float32Array(count);
      const endAlpha = new Float32Array(count);
      const duration = new Float32Array(count);
      const mod3 = (n) => ((n % 3) + 3) % 3;
      for (let j = j0, k = 0; j < j1; j += 1) {
        for (let i = i0; i < i1; i += 1, k += 1) {
          const s = Math.floor(Math.random() * srcX.length);
          fromX[k] = srcX[s];
          fromY[k] = srcY[s];
          toX[k] = origin.left + pitch / 2 + i * pitch;
          toY[k] = origin.top + pitch / 2 + j * pitch;
          const bend = (Math.random() * 2 - 1) * BEND;
          midX[k] = (fromX[k] + toX[k]) / 2 - (toY[k] - fromY[k]) * bend;
          midY[k] = (fromY[k] + toY[k]) / 2 + (toX[k] - fromX[k]) * bend;
          endAlpha[k] = alphas[blocks && mod3(i) < 2 && mod3(j) < 2 ? 1 : 0];
          duration[k] = DISPERSE * (0.55 + Math.random() * 0.45);
        }
      }

      function draw(elapsed) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = `rgb(${grid.rgb || "255, 255, 255"})`;
        for (let k = 0; k < count; k += 1) {
          const p = Math.min(1, elapsed / duration[k]);
          const e = 1 - (1 - p) ** 4;
          const f = 1 - e;
          const x = f * f * fromX[k] + 2 * f * e * midX[k] + e * e * toX[k];
          const y = f * f * fromY[k] + 2 * f * e * midY[k] + e * e * toY[k];
          const size = SAMPLE + (dot - SAMPLE) * e;
          ctx.globalAlpha = 1 + (endAlpha[k] - 1) * e;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      }

      // The solid logo stays up until the burst, then quickly gives way to
      // the dots, which start out drawn over it.
      let start = 0;
      let burst = false;
      function tick(now) {
        if (!start) start = now + HOLD;
        const elapsed = now - start;
        if (elapsed >= 0) {
          if (!burst) {
            burst = true;
            logo.style.transition = "opacity 120ms ease";
            logo.style.opacity = "0";
          }
          draw(elapsed);
          if (elapsed >= DISPERSE * SETTLED_AT + PAUSE) finish();
        }
        if (elapsed < DISPERSE) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })
    .catch(finish);
}

initIntro();

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
      quote.elements.mode.value = mode.dataset.mode;
    });
  }
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
    const d = treeDegree.get(from) || 0;
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
    treeDegree.set(from, (treeDegree.get(from) || 0) + 1);
    treeDegree.set(to, (treeDegree.get(to) || 0) + 1);
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
      treeDegree.set(from, (treeDegree.get(from) || 0) + 1);
      treeDegree.set(to, (treeDegree.get(to) || 0) + 1);
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
    treeDegree.set(from, (treeDegree.get(from) || 0) + 1);
    treeDegree.set(to, (treeDegree.get(to) || 0) + 1);
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
    const path = node && (node.hasAttribute("d") ? node : node.querySelector("path"));
    const value = path && path.getAttribute("d");
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
  const hubsGroup = svg && svg.querySelector(".hubs");
  if (!svg || !hubsGroup) return;

  const frame = svg.closest(".map-frame");
  const glowData = loadGlowData();
  glowData.catch(() => {});
  loadBaseMap(svg)
    .then(async (shapes) => {
      initGlow(svg, frame, shapes, await glowData);
    })
    .catch((err) => console.warn(err))
    .finally(() => frame && frame.classList.add("is-ready"));

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
  const chicago = hubsGroup.querySelector('[data-hub="chicago"]');
  if (chicago) chicago.classList.add("is-lit");

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
    cellPaths = ((data && data.zips) || []).map((d) => new Path2D(d));
    for (const item of wavePaths.flat()) {
      const forward = item.fromId < item.toId;
      const chain =
        data && data.routes && data.routes[forward ? `${item.fromId}|${item.toId}` : `${item.toId}|${item.fromId}`];
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
    // Moves off from the first scroll, alongside neighbor wave 1, and is gone
    // by the wave's end.
    const leave = Math.min(1, Math.max(0, value));
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
    const t = Math.min(1, Math.max(0, value / 1.2));
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

        const lit = local >= 0.92 ? true : local < 0.5 ? false : item.lit;
        if (lit !== !!item.lit) {
          item.lit = lit;
          const hub = hubsGroup.querySelector(`[data-hub="${item.toId}"]`);
          if (hub) hub.classList.toggle("is-lit", lit);
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
      touchY = event.touches.length ? event.touches[0].clientY : null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      // Two-finger gestures are pinch-zoom; don't hijack them.
      if (touchY == null || event.touches.length > 1) return;
      if (!event.touches.length) return;
      const y = event.touches[0].clientY;
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
  const stage = track && track.querySelector(".services-stage");
  const band = stage && stage.querySelector(".blue-band");
  const pin = band && band.querySelector(".blue-band__pin");
  const view = band && band.querySelector(".services-window");
  const rows = band && band.querySelector(".services");
  if (!track || !stage || !pin || !view || !rows) return;
  const wide = window.matchMedia("(min-width: 901px)");
  const buttons = [...band.querySelectorAll(".services-nav__btn")];
  const BELOW_ROWS_REM = 3; // blue left showing beneath the second row while held
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
    // Stick with the pin's bottom padding, less BELOW_ROWS_REM, hanging below the
    // window, so the hold starts as soon as the second row is fully in view.
    const padBottom = parseFloat(getComputedStyle(pin).paddingBottom) || 0;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const stageTop = window.innerHeight - stage.offsetHeight + Math.max(0, padBottom - BELOW_ROWS_REM * rem);
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
  const toggle = menu && menu.querySelector(".contact-menu__toggle");
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

// A white dot grid drawn on `canvas` over `host`. Dots near the mouse are
// pushed away from it and ease back to their grid spots once it moves on or
// leaves the canvas. `pitch`, `size`, `alphas`, `rgb` and `blocks` are as in
// DOT_GRIDS. `excludeBottom` returns how much of the host's bottom to leave bare.
function initDotField(host, canvas, { pitch, size, alphas, rgb = "255, 255, 255", blocks = false, excludeBottom = () => 0 }) {
  const ctx = canvas && canvas.getContext("2d");
  if (!host || !canvas || !ctx) return;
  const colors = alphas.map((a) => `rgba(${rgb}, ${a})`);

  const PITCH = pitch;
  const SIZE = size; // dot diameter, px
  const RADIUS = 150; // how far from the mouse dots are disturbed
  const PUSH = 42; // how far the nearest dots are pushed, px
  const EASE = 0.12; // fraction of the way to its target a dot moves per frame
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;
  let height = 0;
  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let bright = new Uint8Array(0);
  let offX = new Float32Array(0);
  let offY = new Float32Array(0);
  let mouse = null; // pointer position in canvas coordinates, or null when away
  let client = null; // last mouse position in the window, to re-aim after scrolling
  let raf = 0;

  function layout() {
    width = host.clientWidth;
    height = Math.max(0, host.clientHeight - excludeBottom());
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(width / PITCH);
    const rows = Math.ceil(height / PITCH);
    const count = cols * rows;
    homeX = new Float32Array(count);
    homeY = new Float32Array(count);
    bright = new Uint8Array(count);
    offX = new Float32Array(count);
    offY = new Float32Array(count);
    for (let j = 0, k = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1, k += 1) {
        homeX[k] = PITCH / 2 + i * PITCH;
        homeY[k] = PITCH / 2 + j * PITCH;
        bright[k] = blocks && i % 3 < 2 && j % 3 < 2 ? 1 : 0;
      }
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const half = SIZE / 2;
    for (let level = 0; level < colors.length; level += 1) {
      ctx.fillStyle = colors[level];
      ctx.beginPath();
      for (let k = 0; k < homeX.length; k += 1) {
        if (bright[k] === level) ctx.rect(homeX[k] + offX[k] - half, homeY[k] + offY[k] - half, SIZE, SIZE);
      }
      ctx.fill();
    }
  }

  // Moves every dot a step toward its target (pushed away from the mouse, or
  // home). Returns true while anything is still moving.
  function step() {
    let moving = false;
    const r2 = RADIUS * RADIUS;
    for (let k = 0; k < homeX.length; k += 1) {
      let tx = 0;
      let ty = 0;
      if (mouse) {
        const dx = homeX[k] - mouse.x;
        const dy = homeY[k] - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const falloff = 1 - d / RADIUS;
          const push = PUSH * falloff * falloff;
          tx = (dx / d) * push;
          ty = (dy / d) * push;
        }
      }
      const ex = tx - offX[k];
      const ey = ty - offY[k];
      if (Math.abs(ex) > 0.05 || Math.abs(ey) > 0.05) {
        offX[k] += ex * EASE;
        offY[k] += ey * EASE;
        moving = true;
      } else {
        offX[k] = tx;
        offY[k] = ty;
      }
    }
    return moving;
  }

  function tick() {
    raf = 0;
    const moving = step();
    draw();
    if (moving) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function aim() {
    if (!client) return;
    const r = canvas.getBoundingClientRect();
    const x = client.x - r.left;
    const y = client.y - r.top;
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    if (!inside && !mouse) return;
    mouse = inside ? { x, y } : null;
    wake();
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" || still.matches) return;
      client = { x: event.clientX, y: event.clientY };
      aim();
    },
    { passive: true }
  );
  window.addEventListener("scroll", aim, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => {
    client = null;
    if (!mouse) return;
    mouse = null;
    wake();
  });

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(host);
  else window.addEventListener("resize", layout);
  layout();
}

// Shippers hero 1: the example load's updates come in one at a time, starting
// once the page-load intro is out of the way.
function initShipFeed() {
  const feed = document.querySelector(".ship-feed");
  const items = feed ? [...feed.querySelectorAll(".ship-feed__item")] : [];
  if (!items.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const FIRST = 300; // ms after the intro
  const EVERY = 900; // ms between updates
  feed.classList.add("is-sequenced");
  const run = () => items.forEach((item, i) => setTimeout(() => item.classList.add("is-in"), FIRST + i * EVERY));
  if (!document.querySelector(".intro") || "introDone" in document.documentElement.dataset) run();
  else document.addEventListener("intro:done", run, { once: true });
}

initShipFeed();

// Words of [data-type-words] blocks come in one at a time like an old
// terminal, once the page-load intro clears: each flickers through random
// glyphs before settling, with a block cursor riding the newest word.
// Blocks share one running order.
function initTypeWords() {
  const blocks = [...document.querySelectorAll("[data-type-words]")];
  if (!blocks.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const EVERY = 110; // ms between words starting
  const STEP = 45; // ms per scrambled frame
  const STEPS = 5; // scrambled frames before a word settles
  const GLYPHS = "!<>-_\\/[]{}=+*^?#01$%&";
  const words = [];
  for (const block of blocks) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
    for (const text of texts) {
      const frag = document.createDocumentFragment();
      for (const part of text.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(part);
          continue;
        }
        const word = document.createElement("span");
        word.className = "type-word";
        word.textContent = part;
        words.push(word);
        frag.append(word);
      }
      text.replaceWith(frag);
    }
    block.classList.add("is-typing");
  }

  // The scramble sits over the real word, which keeps the line's layout.
  const scramble = (length) =>
    Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");
  const cursor = document.createElement("span");
  cursor.className = "type-cursor";
  cursor.setAttribute("aria-hidden", "true");

  // Each word's state follows from the time since the start, so a slow or
  // paused frame never leaves a word stuck mid-scramble.
  const state = words.map(() => ({ frame: -1, noise: null }));
  let start = 0;
  function frame(now) {
    if (!start) start = now;
    let done = true;
    words.forEach((word, i) => {
      const s = state[i];
      const step = Math.floor((now - start - i * EVERY) / STEP);
      if (step < 0) {
        done = false;
        return;
      }
      if (s.frame < 0) {
        s.noise = document.createElement("span");
        s.noise.className = "type-word__noise";
        s.noise.setAttribute("aria-hidden", "true");
        word.append(s.noise, cursor);
        word.classList.add("is-on", "is-decoding");
      }
      if (step < STEPS) {
        done = false;
        if (step !== s.frame) s.noise.textContent = scramble(word.firstChild.textContent.length);
      } else if (s.noise) {
        s.noise.remove();
        s.noise = null;
        word.classList.remove("is-decoding");
      }
      s.frame = step;
    });
    if (done) cursor.classList.add("is-idle");
    else requestAnimationFrame(frame);
  }

  // Starts once the first block is well into the window.
  const run = () => {
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        seen.disconnect();
        requestAnimationFrame(frame);
      },
      { threshold: 0.5 },
    );
    seen.observe(blocks[0]);
  };
  if (!document.querySelector(".intro") || "introDone" in document.documentElement.dataset) run();
  else document.addEventListener("intro:done", run, { once: true });
}

initTypeWords();

// Shippers: scrolling gathers the dots into the circle. "Our Process" is a hole
// the dots never fill. More scrolling reveals Book It, then Move It, then Forget It.
function initShipMark() {
  const pin = document.querySelector(".ship-fold__pin");
  const fold = document.querySelector(".ship-fold");
  const canvas = pin && pin.querySelector(".ship-hero__dots");
  const grid = DOT_GRIDS.find((g) => g.morph);
  if (!pin || !fold || !canvas || !grid) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    initDotField(pin, canvas, grid);
    return;
  }

  const ctx = canvas.getContext("2d");
  const { pitch: PITCH, size: SIZE } = grid;
  const LOGO_DOT = 2.15;
  const RADIUS = 150;
  const PUSH = 42;
  const EASE = 0.12;
  const WORDS = ["Our", "Process"];

  let width = 0;
  let height = 0;
  let homeX = new Float32Array(0);
  let homeY = new Float32Array(0);
  let toX = new Float32Array(0);
  let toY = new Float32Array(0);
  let keep = new Uint8Array(0);
  let kind = new Uint8Array(0); // 1 word, 0 stays in the grid and fades
  let ang0 = new Float32Array(0);
  let rad0 = new Float32Array(0);
  let ang1 = new Float32Array(0);
  let rad1 = new Float32Array(0);
  let lag = new Float32Array(0);
  let offX = new Float32Array(0);
  let offY = new Float32Array(0);
  let logoReady = false;
  let logoBox = null; // crisp words, kept on top of the circle
  let ringRadius = 0;
  let circleDot = LOGO_DOT;
  const boxes = pin.querySelectorAll(".ship-box");
  let open = null;

  // The crossing point springs toward the hovered box. A spring keeps its
  // velocity when the target changes, so sweeping across boxes stays smooth.
  const SPLIT = { book: [60, 60], move: [40, 60], forget: [50, 40] };
  const split = { x: 50, y: 50, vx: 0, vy: 0, tx: 50, ty: 50, raf: 0, last: 0 };
  function splitStep(now) {
    const dt = Math.min(0.05, (now - (split.last || now)) / 1000) || 1 / 60;
    split.last = now;
    const k = 90;
    const c = 2 * Math.sqrt(k) * 0.95;
    split.vx += (k * (split.tx - split.x) - c * split.vx) * dt;
    split.vy += (k * (split.ty - split.y) - c * split.vy) * dt;
    split.x += split.vx * dt;
    split.y += split.vy * dt;
    const settled =
      Math.abs(split.tx - split.x) < 0.01 &&
      Math.abs(split.ty - split.y) < 0.01 &&
      Math.abs(split.vx) < 0.01 &&
      Math.abs(split.vy) < 0.01;
    if (settled) {
      split.x = split.tx;
      split.y = split.ty;
    }
    fold.style.setProperty("--ship-x", split.x.toFixed(3));
    fold.style.setProperty("--ship-y", split.y.toFixed(3));
    split.raf = settled ? 0 : requestAnimationFrame(splitStep);
    if (settled) split.last = 0;
  }
  function aimSplit(x, y) {
    split.tx = x;
    split.ty = y;
    if (!split.raf) split.raf = requestAnimationFrame(splitStep);
  }
  // Clicking a box grows it a step past the hover size and shows its details.
  const OPEN = { book: [68, 68], move: [32, 68], forget: [50, 30] };
  let active = null;
  function expand(box) {
    if (active === box) return;
    if (active) collapse(false);
    active = box;
    box.classList.add("is-active");
    fold.classList.add("has-active");
    box.querySelector(".ship-box__open").setAttribute("aria-expanded", "true");
    aimSplit(...OPEN[box.dataset.zone]);
  }
  function collapse(refocus = true) {
    if (!active) return;
    const box = active;
    active = null;
    box.classList.remove("is-active");
    fold.classList.remove("has-active");
    const opener = box.querySelector(".ship-box__open");
    opener.setAttribute("aria-expanded", "false");
    if (refocus) opener.focus({ preventScroll: true });
    const hovered = box.matches(":hover") || box.contains(document.activeElement);
    aimSplit(...(hovered && open ? SPLIT[box.dataset.zone] : [50, 50]));
  }
  for (const box of boxes) {
    const aim = () => {
      if (open && !active) aimSplit(...SPLIT[box.dataset.zone]);
    };
    const rest = () => {
      if (!active) aimSplit(50, 50);
    };
    box.addEventListener("pointerenter", aim);
    box.addEventListener("focusin", aim);
    box.addEventListener("focusout", rest);
    // Clicking the open box again, anywhere on it, closes it.
    box.addEventListener("click", () => {
      if (active === box) collapse();
      else if (open) expand(box);
    });
  }
  const boxesEl = pin.querySelector(".ship-boxes");
  if (boxesEl) boxesEl.addEventListener("pointerleave", () => {
    if (!active) aimSplit(50, 50);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active) collapse();
  });
  let mouse = null;
  let client = null;
  let raf = 0;

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function smooth(value) {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  }

  // Dots gather into the circle and leave the words as an unfilled cutout.
  // The three sections then fade in together.
  function phases() {
    const hero1 = fold.querySelector(".ship-hero--1");
    const hero1End = hero1.getBoundingClientRect().top + window.scrollY + hero1.offsetHeight;
    const release = fold.getBoundingClientRect().top + window.scrollY + fold.offsetHeight - window.innerHeight;
    const room = Math.max(window.innerHeight, release - hero1End);
    const gatherEnd = hero1End + room * 0.52;
    const wordT = smooth(clamp01(window.scrollY / Math.max(1, gatherEnd)));
    const after = clamp01((window.scrollY - gatherEnd) / Math.max(1, release - gatherEnd));
    const reveal = smooth(clamp01(after / 0.8));
    return { wordT, reveal };
  }

  function layout() {
    width = pin.clientWidth;
    height = pin.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(width / PITCH);
    const rows = Math.ceil(height / PITCH);
    const count = cols * rows;
    homeX = new Float32Array(count);
    homeY = new Float32Array(count);
    toX = new Float32Array(count);
    toY = new Float32Array(count);
    keep = new Uint8Array(count);
    kind = new Uint8Array(count);
    ang0 = new Float32Array(count);
    rad0 = new Float32Array(count);
    ang1 = new Float32Array(count);
    rad1 = new Float32Array(count);
    lag = new Float32Array(count);
    offX = new Float32Array(count);
    offY = new Float32Array(count);
    for (let j = 0, k = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1, k += 1) {
        homeX[k] = PITCH / 2 + i * PITCH;
        homeY[k] = PITCH / 2 + j * PITCH;
        toX[k] = homeX[k];
        toY[k] = homeY[k];
      }
    }
    if (!logoReady) {
      draw();
      return;
    }

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fontSize = Math.round(Math.min(width * 0.045, 2.6 * rem));
    const scratch = document.createElement("canvas").getContext("2d");
    scratch.font = `800 ${fontSize}px "Cabinet Grotesk", sans-serif`;
    const lineH = Math.round(fontSize * 1.02);
    const lw = Math.ceil(Math.max(...WORDS.map((word) => scratch.measureText(word).width)));
    const lh = lineH * WORDS.length;
    const left = (width - lw) / 2;
    const top = (height - lh) / 2;
    const dprMark = window.devicePixelRatio || 1;
    const mark = document.createElement("canvas");
    mark.width = Math.max(1, Math.round(lw * dprMark));
    mark.height = Math.max(1, Math.round(lh * dprMark));
    const mctx = mark.getContext("2d");
    mctx.scale(dprMark, dprMark);
    mctx.font = `800 ${fontSize}px "Cabinet Grotesk", sans-serif`;
    mctx.fillStyle = "#111";
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    WORDS.forEach((word, i) => mctx.fillText(word, lw / 2, lineH * i + lineH / 2));
    logoBox = { left, top, lw, lh, mark };
    const ring = Math.ceil(lw + fontSize * 0.55);
    ringRadius = ring / 2;
    fold.style.setProperty("--ship-type", `${fontSize}px`);
    fold.style.setProperty("--ship-ring", `${ring}px`);
    const cx = width / 2;
    const cy = height / 2;
    const gatherR = Math.min(width, height) * 0.5;
    // The rim wobbles, so the cloud's edge is jagged instead of a clean circle.
    const tooth = (angle) => {
      const s = Math.sin(Math.floor(angle * 18) * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    const rim = (angle) => {
      const lobes = Math.sin(angle * 5 + 0.6) * 0.22 + Math.sin(angle * 9 + 2.1) * 0.14;
      const teeth = (tooth(angle) - 0.5) * 0.55;
      return Math.max(0.62, Math.min(1, 0.82 + lobes + teeth));
    };
    const pool = [];
    for (let k = 0; k < count; k += 1) {
      const dx = homeX[k] - cx;
      const dy = homeY[k] - cy;
      const dist = Math.hypot(dx, dy);
      const limit = gatherR * rim(Math.atan2(dy, dx));
      if (dist <= limit) pool.push(k);
    }
    const budget = Math.max(1, pool.length);
    // Dots swell as they land until they merge into the solid circle, so each
    // one has to land far enough inside the edge to stay within it.
    // Sized so randomly placed dots cover about 99% of the circle once landed.
    circleDot = Math.min(12, Math.max(4, (ringRadius * 4.4) / Math.sqrt(budget)));
    const circleR = Math.max(1, ringRadius - circleDot / 2);
    // Random spots inside the circle, so the landed dots never read as a grid.
    const wordPts = [];
    for (let n = 0; n < budget; n += 1) {
      const r = circleR * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      wordPts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    if (!wordPts.length) {
      draw();
      return;
    }
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    const used = Math.min(wordPts.length, pool.length);
    for (let n = 0; n < used; n += 1) {
      const k = pool[n];
      const point = wordPts[n];
      kind[k] = 1;
      keep[k] = 1;
      toX[k] = point[0];
      toY[k] = point[1];
      const hx = homeX[k] - cx;
      const hy = homeY[k] - cy;
      const tx = point[0] - cx;
      const ty = point[1] - cy;
      ang0[k] = Math.atan2(hy, hx);
      rad0[k] = Math.hypot(hx, hy);
      ang1[k] = Math.atan2(ty, tx);
      rad1[k] = Math.hypot(tx, ty);
      lag[k] = Math.random();
    }
    draw();
  }

  function draw() {
    const idle = { wordT: 0, reveal: 0 };
    const { wordT, reveal } = logoReady ? phases() : idle;
    fold.style.setProperty("--ship-reveal", reveal.toFixed(4));
    // Boxes respond to hover and clicks a little before they finish fading in.
    const isOpen = reveal >= 0.9;
    if (isOpen !== open) {
      open = isOpen;
      fold.classList.toggle("is-open", isOpen);
      for (const box of boxes) {
        const opener = box.querySelector(".ship-box__open");
        if (isOpen) opener.removeAttribute("tabindex");
        else opener.setAttribute("tabindex", "-1");
      }
      if (isOpen) {
        const hovered = [...boxes].find((box) => box.matches(":hover"));
        if (hovered) hovered.dispatchEvent(new Event("pointerenter"));
      } else {
        collapse(false);
        aimSplit(50, 50);
      }
    }
    // One motion: as the dots close in they swell until they cover the circle
    // themselves. The solid fill only closes the last gaps at the very end.
    const solid = smooth(clamp01((wordT - 0.9) / 0.1));
    const dotsOut = wordT >= 1 ? 1 : 0;
    ctx.clearRect(0, 0, width, height);
    if (solid > 0 && ringRadius > 0) {
      ctx.globalAlpha = solid;
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#111";
    const count = homeX.length;
    for (let pass = 0; pass < 2; pass += 1) {
      for (let k = 0; k < count; k += 1) {
        const wordDot = kind[k] === 1;
        if ((pass === 1) !== wordDot) continue;
        // The spare grid fades early. The rest of the dots settle into the circle.
        const fade = smooth(Math.min(1, wordT / 0.32));
        const opacity = wordDot ? (0.12 + 0.88 * wordT) * (1 - dotsOut) : 0.12 * (1 - fade);
        if (opacity < 0.015) continue;
        const size = wordDot ? SIZE + (circleDot - SIZE) * wordT * wordT * wordT : SIZE;
        const scatter = 1 - wordT;
        let x;
        let y;
        if (wordDot) {
          const settle = smooth(clamp01((wordT - lag[k] * 0.14) / 0.86));
          x = homeX[k] + (toX[k] - homeX[k]) * settle + offX[k] * scatter;
          y = homeY[k] + (toY[k] - homeY[k]) * settle + offY[k] * scatter;
        } else {
          x = homeX[k] + offX[k] * scatter;
          y = homeY[k] + offY[k] * scatter;
        }
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The words are a cutout of the real letter shapes, not missing dots.
    if (logoBox) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.drawImage(logoBox.mark, logoBox.left, logoBox.top, logoBox.lw, logoBox.lh);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    let moving = false;
    if (!mouse) {
      for (let k = 0; k < offX.length; k += 1) {
        if (Math.abs(offX[k]) > 0.05 || Math.abs(offY[k]) > 0.05) {
          offX[k] *= 1 - EASE;
          offY[k] *= 1 - EASE;
          moving = true;
        } else {
          offX[k] = 0;
          offY[k] = 0;
        }
      }
      return moving;
    }
    const r2 = RADIUS * RADIUS;
    for (let k = 0; k < homeX.length; k += 1) {
      let tx = 0;
      let ty = 0;
      const dx = homeX[k] - mouse.x;
      const dy = homeY[k] - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2) {
        const d = Math.sqrt(d2) || 1;
        const falloff = 1 - d / RADIUS;
        const push = PUSH * falloff * falloff;
        tx = (dx / d) * push;
        ty = (dy / d) * push;
      }
      const ex = tx - offX[k];
      const ey = ty - offY[k];
      if (Math.abs(ex) > 0.05 || Math.abs(ey) > 0.05) {
        offX[k] += ex * EASE;
        offY[k] += ey * EASE;
        moving = true;
      } else {
        offX[k] = tx;
        offY[k] = ty;
      }
    }
    return moving;
  }

  function tick() {
    raf = 0;
    const moving = step();
    draw();
    if (moving) raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function aim() {
    if (!client) return;
    const r = canvas.getBoundingClientRect();
    const x = client.x - r.left;
    const y = client.y - r.top;
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    if (!inside && !mouse) return;
    mouse = inside ? { x, y } : null;
    wake();
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      client = { x: event.clientX, y: event.clientY };
      aim();
    },
    { passive: true }
  );
  window.addEventListener(
    "scroll",
    () => {
      aim();
      draw();
    },
    { passive: true }
  );
  document.documentElement.addEventListener("mouseleave", () => {
    client = null;
    if (!mouse) return;
    mouse = null;
    wake();
  });

  document.fonts
    .load('800 64px "Cabinet Grotesk"')
    .then(() => {
      logoReady = true;
      layout();
    })
    .catch(() => {
      logoReady = true;
      layout();
    });

  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(pin);
  else window.addEventListener("resize", layout);
  layout();
}

initShipMark();

// Shippers rate form: the load picker and the date and time picker open popups,
// so the ZIP codes are the only typed fields.
function initShipRate() {
  const form = document.querySelector(".ship-rate__form");
  if (!form) return;
  let openPop = null;

  function closePop(refocus = true) {
    if (!openPop) return;
    const { pop, pick } = openPop;
    pop.hidden = true;
    pick.setAttribute("aria-expanded", "false");
    openPop = null;
    if (refocus) pick.focus();
  }

  function showPop(entry) {
    if (openPop === entry) return closePop();
    closePop(false);
    entry.pop.hidden = false;
    entry.pick.setAttribute("aria-expanded", "true");
    openPop = entry;
    entry.onOpen();
  }

  document.addEventListener("click", (event) => {
    if (openPop && !openPop.field.contains(event.target)) closePop(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openPop) closePop();
  });

  // What you're shipping.
  const loadField = form.querySelector(".ship-rate__field--load");
  const loadPick = loadField.querySelector(".ship-rate__pick");
  const loadList = loadField.querySelector(".ship-pop");
  const loadInput = loadField.querySelector("input[name='load']");
  const options = [...loadList.querySelectorAll("[role='option']")];
  let current = 0;
  options.forEach((option, i) => {
    option.id = `ship-rate-load-${i}`;
    option.addEventListener("click", () => choose(i));
    option.addEventListener("mousemove", () => highlight(i));
  });
  function highlight(i) {
    current = (i + options.length) % options.length;
    options.forEach((option, k) => option.classList.toggle("is-current", k === current));
    loadList.setAttribute("aria-activedescendant", options[current].id);
  }
  function choose(i) {
    const text = options[i].textContent;
    options.forEach((option, k) => option.setAttribute("aria-selected", String(k === i)));
    loadInput.value = text;
    loadPick.querySelector(".ship-rate__value").textContent = text;
    loadPick.setAttribute("aria-label", `What you’re shipping: ${text}`);
    closePop();
  }
  const load = {
    field: loadField,
    pick: loadPick,
    pop: loadList,
    onOpen() {
      highlight(Math.max(0, options.findIndex((o) => o.getAttribute("aria-selected") === "true")));
      loadList.focus();
    },
  };
  loadList.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") highlight(current + 1);
    else if (event.key === "ArrowUp") highlight(current - 1);
    else if (event.key === "Home") highlight(0);
    else if (event.key === "End") highlight(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") choose(current);
    else if (event.key === "Tab") closePop(false);
    else return;
    event.preventDefault();
  });
  loadPick.addEventListener("click", () => showPop(load));
  loadPick.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (openPop !== load) showPop(load);
  });

  // Pickup date and time.
  const dateField = form.querySelector(".ship-rate__field--date");
  const datePick = dateField.querySelector(".ship-rate__pick");
  const cal = dateField.querySelector(".ship-pop");
  const dateInput = dateField.querySelector("input[name='date']");
  const timeInput = dateField.querySelector("input[name='time']");
  const monthLabel = cal.querySelector(".ship-cal__month");
  const daysEl = cal.querySelector(".ship-cal__days");
  const timesEl = cal.querySelector(".ship-cal__times");
  const done = cal.querySelector(".ship-cal__done");
  const prev = cal.querySelector(".ship-cal__nav[data-step='-1']");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let view = new Date(firstMonth);
  let pickedDay = null;
  let pickedTime = null;

  const TIMES = [];
  for (let minutes = 7 * 60; minutes <= 17 * 60; minutes += 60) TIMES.push(minutes);
  const timeText = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
  };
  const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  for (const minutes of TIMES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = timeText(minutes);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      pickedTime = minutes;
      for (const b of timesEl.children) b.setAttribute("aria-pressed", String(b === button));
      done.disabled = !pickedDay;
    });
    timesEl.append(button);
  }

  function renderMonth() {
    monthLabel.textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    prev.disabled = view <= firstMonth;
    daysEl.textContent = "";
    for (let i = 0; i < view.getDay(); i += 1) daysEl.append(document.createElement("span"));
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= count; n += 1) {
      const day = new Date(view.getFullYear(), view.getMonth(), n);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(n);
      button.setAttribute("aria-label", day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
      button.setAttribute("aria-pressed", String(sameDay(day, pickedDay)));
      button.disabled = day < today;
      if (sameDay(day, today)) button.classList.add("is-today");
      button.addEventListener("click", () => {
        pickedDay = day;
        for (const b of daysEl.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === button));
        done.disabled = pickedTime === null;
      });
      daysEl.append(button);
    }
  }

  for (const nav of cal.querySelectorAll(".ship-cal__nav")) {
    nav.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.step), 1);
      renderMonth();
    });
  }

  done.addEventListener("click", () => {
    const weekday = pickedDay.toLocaleDateString("en-US", { weekday: "short" });
    const text = `${weekday} ${pickedDay.getMonth() + 1}/${pickedDay.getDate()}, ${timeText(pickedTime)}`;
    dateInput.value = iso(pickedDay);
    timeInput.value = `${String(Math.floor(pickedTime / 60)).padStart(2, "0")}:${String(pickedTime % 60).padStart(2, "0")}`;
    const value = datePick.querySelector(".ship-rate__value");
    value.textContent = text;
    value.classList.remove("is-empty");
    datePick.setAttribute("aria-label", `Pickup date and time: ${text}`);
    closePop();
  });

  const date = {
    field: dateField,
    pick: datePick,
    pop: cal,
    onOpen() {
      if (pickedDay) view = new Date(pickedDay.getFullYear(), pickedDay.getMonth(), 1);
      renderMonth();
      const day = daysEl.querySelector("button[aria-pressed='true']") || daysEl.querySelector("button:not(:disabled)");
      if (day) day.focus();
    },
  };
  datePick.addEventListener("click", () => showPop(date));
}

initShipRate();

// Shippers: the header scrolls away with hero 1 and comes back once hero 3
// reaches the top of the window.
function initShipHeader() {
  const header = document.querySelector(".page-shippers .site-header");
  const after = document.querySelector(".ship-rate");
  if (!header || !after) return;
  let docked = false;
  function update() {
    const dock = after.getBoundingClientRect().top < 1;
    if (dock === docked) return;
    docked = dock;
    document.body.style.paddingTop = dock ? `${header.offsetHeight}px` : "";
    header.classList.toggle("is-docked", dock);
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

initShipHeader();

// Shippers "Look us up": the search demo waits, MC typed, until it's on
// screen, then plays from there; leaving rewinds it for the next visit.
function initShipLookup() {
  const demo = document.querySelector(".ship-lookup__demo");
  if (!demo || !demo.getAnimations) return;
  const animations = demo.getAnimations({ subtree: true });
  if (!animations.length) return;
  const rewind = () => {
    for (const a of animations) {
      a.pause();
      a.currentTime = 0;
    }
  };
  rewind();
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) for (const a of animations) a.play();
      else rewind();
    },
    { threshold: 0.75 }
  ).observe(demo);
}

initShipLookup();

// Instant quote: the load ticket fills in as the form is answered. ZIPs are
// named through the free zippopotam.us lookup, which also gives the distance
// (straight line, padded by a typical road detour). Query parameters from the
// homepage quote box prefill the form.
function initQuoteForm() {
  const form = document.querySelector(".quote-form");
  if (!form) return;
  const cells = {};
  for (const dd of form.querySelectorAll("[data-ticket]")) cells[dd.dataset.ticket] = dd;
  const field = (name) => form.elements[name];
  const ROAD_FACTOR = 1.2;
  const MODES = { ftl: "FTL", ltl: "LTL", ptl: "PTL", unsure: "Not sure, we'll recommend" };
  const places = {};

  const params = new URLSearchParams(window.location.search);
  for (const name of ["from", "to", "pickup", "commodity", "pallets", "weight", "instructions", "email", "phone"]) {
    if (params.get(name) && field(name)) field(name).value = params.get(name);
  }
  const mode = form.querySelector(`input[name="mode"][value="${params.get("mode")}"]`);
  if (mode) mode.checked = true;
  const today = new Date();
  field("pickup").min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00`;

  const digits = (value) => value.replace(/\D/g, "");
  const withCommas = (value) => (value ? Number(value).toLocaleString("en-US") : "");

  function lookup(zip) {
    if (!places[zip]) {
      places[zip] = fetch(`https://api.zippopotam.us/us/${zip}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const place = data && data.places && data.places[0];
          if (!place) return null;
          return {
            name: `${place["place name"]}, ${place["state abbreviation"]} ${zip}`,
            lat: Number(place.latitude),
            lon: Number(place.longitude),
          };
        })
        .catch(() => undefined);
    }
    return places[zip];
  }

  function miles(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(h));
  }

  function set(name, text) {
    const cell = cells[name];
    cell.textContent = text || cell.dataset.empty;
    cell.classList.toggle("is-empty", !text);
  }

  const resolved = { from: null, to: null };
  let lane = 0;
  function updateLane() {
    const run = ++lane;
    for (const name of ["from", "to"]) {
      const zip = field(name).value;
      resolved[name] = null;
      field(name).classList.remove("is-invalid");
      set(name, zip.length === 5 ? zip : "");
    }
    set("distance", "");
    for (const name of ["from", "to"]) {
      const zip = field(name).value;
      if (zip.length !== 5) continue;
      lookup(zip).then((place) => {
        if (run !== lane) return;
        if (place === null) {
          resolved[name] = false;
          set(name, `${zip} — ZIP not found`);
          field(name).classList.add("is-invalid");
        } else if (place) {
          resolved[name] = place;
          set(name, place.name);
        }
        if (resolved.from && resolved.to) {
          set("distance", `≈ ${Math.round(miles(resolved.from, resolved.to) * ROAD_FACTOR).toLocaleString("en-US")} mi`);
        }
      });
    }
  }

  function updateFreight() {
    const checked = form.querySelector('input[name="mode"]:checked');
    set("mode", checked ? MODES[checked.value] : "");
    const pallets = Number(field("pallets").value);
    const weight = field("weight").value;
    const parts = [];
    if (field("commodity").value.trim()) parts.push(field("commodity").value.trim());
    if (pallets) parts.push(`${pallets} pallet${pallets === 1 ? "" : "s"}`);
    if (weight) parts.push(`${weight} lbs`);
    set("freight", parts.join(" · "));
    const [date, time] = field("pickup").value.split("T");
    let pickup = "";
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = (time || "").split(":").map(Number);
      const at = new Date(y, m - 1, d, hh || 0, mm || 0);
      pickup = at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (time) pickup += ` · ${at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    set("pickup", pickup);
    set("handling", field("handling").value);
    const notes = field("instructions").value.trim().replace(/\s+/g, " ");
    set("notes", notes.length > 60 ? `${notes.slice(0, 57)}…` : notes);
  }

  const emailOk = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field("email").value.trim());

  for (const name of ["from", "to", "pallets"]) {
    field(name).addEventListener("input", () => {
      field(name).value = digits(field(name).value);
      if (name === "pallets") updateFreight();
      else updateLane();
    });
  }
  field("weight").addEventListener("input", () => {
    field("weight").value = withCommas(digits(field("weight").value).slice(0, 6));
    updateFreight();
  });
  form.addEventListener("input", (event) => {
    if (!["from", "to", "pallets", "weight"].includes(event.target.name)) updateFreight();
    if (event.target.name === "email") field("email").classList.remove("is-invalid");
  });
  form.addEventListener("change", updateFreight);

  form.addEventListener("submit", (event) => {
    const missing = [];
    for (const name of ["from", "to"]) if (field(name).value.length !== 5 || resolved[name] === false) missing.push(name);
    if (!emailOk()) missing.push("email");
    for (const name of missing) field(name).classList.add("is-invalid");
    if (missing.length) {
      event.preventDefault();
      field(missing[0]).focus();
    }
  });

  field("weight").value = withCommas(digits(field("weight").value));
  updateLane();
  updateFreight();
}

// Swaps each quote-page <select> for a site-styled listbox. The native select
// stays in the form (hidden) so its value is what gets submitted.
function initQuoteSelects() {
  let uid = 0;
  for (const select of document.querySelectorAll(".quote-field select")) {
    const id = `quote-select-${uid++}`;
    const wrap = document.createElement("div");
    wrap.className = "quote-select";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quote-select__btn";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    const labelledBy = select.getAttribute("aria-labelledby");
    const valueSpan = document.createElement("span");
    valueSpan.className = "quote-select__value";
    valueSpan.id = `${id}-value`;
    button.setAttribute("aria-labelledby", labelledBy ? `${labelledBy} ${valueSpan.id}` : valueSpan.id);
    const chevron = document.createElement("span");
    chevron.className = "quote-select__chevron";
    chevron.setAttribute("aria-hidden", "true");
    button.append(valueSpan, chevron);

    const list = document.createElement("ul");
    list.className = "quote-select__list";
    list.id = id;
    list.setAttribute("role", "listbox");
    list.tabIndex = -1;
    list.hidden = true;
    if (labelledBy) list.setAttribute("aria-labelledby", labelledBy);
    const items = Array.prototype.map.call(select.options, (option, index) => {
      const li = document.createElement("li");
      li.id = `${id}-opt-${index}`;
      li.setAttribute("role", "option");
      li.textContent = option.textContent;
      li.addEventListener("click", () => choose(index));
      li.addEventListener("mousemove", () => highlight(index));
      list.appendChild(li);
      return li;
    });

    select.hidden = true;
    select.tabIndex = -1;
    select.parentNode.insertBefore(wrap, select);
    wrap.append(button, list, select);

    let active = 0;
    function sync() {
      valueSpan.textContent = select.options[select.selectedIndex].textContent;
      items.forEach((li, index) => li.setAttribute("aria-selected", String(index === select.selectedIndex)));
    }
    function highlight(index) {
      active = Math.max(0, Math.min(items.length - 1, index));
      items.forEach((li, i) => li.classList.toggle("is-active", i === active));
      list.setAttribute("aria-activedescendant", items[active].id);
      const li = items[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
    }
    function open() {
      list.hidden = false;
      wrap.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      highlight(select.selectedIndex);
      list.focus();
    }
    function close(refocus) {
      if (list.hidden) return;
      list.hidden = true;
      wrap.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      if (refocus) button.focus();
    }
    function choose(index) {
      if (index !== select.selectedIndex) {
        select.selectedIndex = index;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      sync();
      close(true);
    }

    button.addEventListener("mousedown", (event) => {
      if (!list.hidden) event.preventDefault();
    });
    button.addEventListener("click", () => (list.hidden ? open() : close(true)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        open();
      }
    });
    list.addEventListener("keydown", (event) => {
      const keys = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: items.length - 1 };
      if (event.key in keys) {
        event.preventDefault();
        highlight(keys[event.key]);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(active);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Tab") {
        close(false);
      }
    });
    document.addEventListener("mousedown", (event) => {
      if (!wrap.contains(event.target)) close(false);
    });
    list.addEventListener("blur", (event) => {
      if (!wrap.contains(event.relatedTarget)) close(false);
    });
    select.addEventListener("change", sync);
    sync();
  }
}

initQuoteForm();
initQuoteSelects();

// The homepage grid stops at the black carrier bar.
for (const grid of DOT_GRIDS) {
  if (grid.morph) continue;
  const host = document.querySelector(grid.host);
  initDotField(host, host && host.querySelector(grid.canvas), {
    ...grid,
    excludeBottom: () => {
      const bar = host.querySelector(".carriers");
      return bar ? bar.offsetHeight : 0;
    },
  });
}
