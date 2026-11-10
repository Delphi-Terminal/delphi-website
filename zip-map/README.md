# US ZIP Code (ZCTA) boundary map

A static, zoomable map of every ZIP Code Tabulation Area in the 50 states and DC. It is drawn in the browser with D3 v7 and topojson-client and needs no framework or build step for the page itself.

> **ZCTAs are not ZIP codes.** ZIP Code Tabulation Areas are the U.S. Census Bureau's generalized areal approximations of USPS ZIP Code service areas. USPS ZIP codes are mail delivery routes, not polygons, and there are no official ZIP boundaries. Some ZIP codes, such as PO-box-only and single-building ZIPs, have no ZCTA, and some land, such as large parts of Alaska, Nevada and the national forests, falls in no ZCTA.

## Data sources and vintage

| Layer | File | Source |
| --- | --- | --- |
| ZCTA polygons | `cb_2020_us_zcta520_500k` (2020 ZCTAs, 1:500,000) | [Census cartographic boundary files, 2020](https://www2.census.gov/geo/tiger/GENZ2020/shp/) |
| National outline | `cb_2020_us_state_500k` (2020 states, 1:500,000), dissolved | same |

2020 is the current ZCTA vintage. The Census delineates ZCTAs once per decennial census.

The outline comes from the 2020 state file at 1:500k, dissolved into one shape, rather than from `cb_*_us_nation_5m`. The nation file is only published at 1:5M and 1:20M. At those scales the coastline is roughly ten times coarser than the ZCTAs, and when zoomed into places like New York Harbor it cuts across water and land. The Census generalizes each vintage's 1:500k files together, so the 2020 state shoreline traces the same coast as the 2020 ZCTAs. The build also puts both layers in one shared topology, so a coastline segment shared by a ZCTA and the outline is a single arc, simplified once. The two can't drift apart.

### What's excluded or changed

- **Territories.** Puerto Rico, the USVI, Guam, the Northern Mariana Islands and American Samoa are dropped (ZCTA prefixes 006–009 and 969, plus 96799; state FIPS 60, 66, 69, 72 and 78). The Albers USA projection has no frame for them.
- **Far western Aleutians.** Albers USA's Alaska inset crops islands west of about 180°, which removes ZCTAs 99546 (Adak) and 99547 (Atka) and a few uninhabited islets from the outline.
- **Multi-part ZIPs stay exploded.** Each polygon part is its own TopoJSON feature with a `zip` property. That lets `keep-shapes` preserve every island during simplification. Re-dissolving by ZIP after simplifying collapses a few tiny enclave ZCTAs, such as 75270 and 55903. The page groups parts by `zip`, so hover, highlight and the interior mesh behave as if each ZIP were one MultiPolygon.

## Layout

```
scripts/build-data.sh   download + process -> public/zcta.json, public/nation.json
scripts/check-data.js   correctness checks on the processed output
public/index.html       the map (canvas renderer)
public/zcta.json        TopoJSON, object "zcta": one feature per polygon part, property "zip"
public/nation.json      TopoJSON, object "nation": the dissolved outline
data/raw/               downloaded Census shapefiles (gitignored)
```

Both JSON files are already projected to Albers USA (meters, y pointing north). The page renders them with `d3.geoIdentity().reflectY(true).fitExtent(...)` and `d3.geoPath` and does no re-projection.

## Build the data

Requires Node 20+, `curl` and `unzip`.

```sh
npm install
npm run build:data   # downloads into data/raw/ on first run, then writes public/*.json
npm run check        # validates the output
```

The build prints the output sizes. With the defaults:

```
public/zcta.json       8.34 MB  (gzip  2.57 MB)
public/nation.json     0.19 MB  (gzip  0.07 MB)
```

`npm run check` verifies the following:

- There are no NaN or null coordinates.
- Every part has a 5-digit `zip` and no other properties.
- Every ring is closed.
- Fixed points in 10001, 60601, 90210 and 99501 each land in exactly that one ZIP.
- More than 99.5% of ZIPs sit inside the outline.

## Serve it

```sh
npx serve public     # or: npm run serve
```

Open the printed URL. Scroll or pinch to zoom up to 500×, drag to pan, and hover to see a ZIP. The page has to be served over HTTP because it `fetch`es the JSON, so opening the file directly won't work.

## Change simplification

The build reads its settings from environment variables:

```sh
SIMPLIFY=15% npm run build:data         # more detail, larger file
SIMPLIFY=5% npm run build:data          # coarser, smaller file
QUANTIZATION=1e6 npm run build:data     # finer coordinate grid (default 1e5)
```

`SIMPLIFY` is mapshaper's percentage of removable vertices to keep. Both layers share one topology, so a single value applies to both; that is what keeps the coastline identical in each.

Lowering it below about 8% saves little space. Most of the file is per-feature overhead plus the minimum vertices `keep-shapes` needs to keep every ZCTA and island, so 7.5% is still 8.2 MB. At 8%, ZIP outlines look visibly angular past about 50× zoom. Raise `SIMPLIFY` if you need crisp street-level edges.

## Theseus hero map

The site's hero (`../index.html`) draws a lightweight static version of this map from `../public/us-zips.svg`:

```sh
npm run build:data   # once, to download data/raw/
npm run build:hero   # writes ../public/us-zips.svg and prints hub positions
```

It uses the same shared-topology pipeline, limited to the lower 48 and simplified to `HERO_SIMPLIFY` (default 2%). It is fitted to the hero's 960×600 viewBox, with the lower 48 spanning y 24–576. The SVG has four layers:

- `.us-outline`: the land fill.
- `.zip-lines`: every ZIP edge except the coastline and national border, including edges against land with no ZCTA.
- `.us-outline-stroke`: the national outline.
- `.hub-zips`: one merged shape per freight hub, tagged `data-hub`. It covers the hub's 3-digit ZIP area, found from the ZIP containing the city point. Chicago's point falls in 60604, so its area is all 606xx ZIPs. A single downtown ZIP renders under a pixel at hero size, which is why it uses the 3-digit area.

`js/main.js` inserts these layers under the routes and the hub labels.

The build also writes `../public/hub-zips.json`, the per-ZIP shapes within `GLOW_RADIUS_KM` (default 60) of each hub, for the hero's glow canvas. That canvas draws two effects:

- A pulsing neon glow on each hub city that lights up the nearby ZIP borders.
- Random pulses on the individual ZIPs around each hub. The script also prints each freight hub's position in the same frame. If you change the frame or the hub list in `scripts/build-hero.js`, paste the printed positions into `HUBS` in `js/main.js` and the hub `translate(...)` values in `index.html`.

## Rendering notes

- Layers are drawn bottom to top: a light land fill for areas with no ZCTA, white ZCTA fills, the interior ZIP-to-ZIP mesh (`topojson.mesh(..., (a, b) => a.properties.zip !== b.properties.zip)`) as a thin gray stroke, and the national outline as a darker, thicker stroke.
- It draws to a canvas, because about 36k SVG paths lag when panning. Each ZIP is cached as a `Path2D`. Stroke widths are divided by the zoom factor so lines stay the same width at every zoom, with round joins and caps.
- Hover uses a grid index over ZIP bounding boxes plus `isPointInPath` (even-odd rule) for exact hit-testing.
