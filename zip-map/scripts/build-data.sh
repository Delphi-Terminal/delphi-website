#!/usr/bin/env bash
# Rebuild public/zcta.json and public/nation.json from Census cartographic boundary files.
#
#   SIMPLIFY=8% bash scripts/build-data.sh
set -euo pipefail

cd "$(dirname "$0")/.."

SIMPLIFY="${SIMPLIFY:-8%}"
QUANTIZATION="${QUANTIZATION:-1e5}"

# Same vintage and scale on purpose: the Census generalizes a year's 1:500k
# files together, so ZCTA coastlines and the state shoreline match. The
# national outline is the 50 states + DC dissolved (the nation file only
# ships at 1:5M/1:20M, too coarse to line up with 1:500k ZCTAs).
ZCTA_NAME="cb_2020_us_zcta520_500k"
STATE_NAME="cb_2020_us_state_500k"
ZCTA_URL="https://www2.census.gov/geo/tiger/GENZ2020/shp/${ZCTA_NAME}.zip"
STATE_URL="https://www2.census.gov/geo/tiger/GENZ2020/shp/${STATE_NAME}.zip"

RAW="data/raw"
OUT="public"
MAPSHAPER="node_modules/.bin/mapshaper"

if [[ ! -x "$MAPSHAPER" ]]; then
  echo "mapshaper not found — run 'npm install' first" >&2
  exit 1
fi

mkdir -p "$RAW" "$OUT"

fetch() {
  local url="$1" name="$2"
  if [[ ! -f "$RAW/$name.zip" ]]; then
    echo "Downloading ${name}..."
    curl -fL --retry 3 -o "$RAW/$name.zip.part" "$url"
    mv "$RAW/$name.zip.part" "$RAW/$name.zip"
  fi
  if [[ ! -f "$RAW/$name/$name.shp" ]]; then
    mkdir -p "$RAW/$name"
    unzip -o -q "$RAW/$name.zip" -d "$RAW/$name"
  fi
}

fetch "$ZCTA_URL" "$ZCTA_NAME"
fetch "$STATE_URL" "$STATE_NAME"

echo "Building $OUT/zcta.json + $OUT/nation.json (simplify ${SIMPLIFY}, quantization ${QUANTIZATION})..."

# Both layers live in one dataset so they share a topology: a coastline that
# is both a ZCTA edge and the outline is one arc, simplified once.
#
# - Albers USA covers the 50 states + DC. Territory ZCTAs (PR/VI 006–009xx,
#   Guam/CNMI 969xx, American Samoa 96799) and territory states
#   (FIPS 60, 66, 69, 72, 78) are dropped. The Alaska inset also crops the
#   far western Aleutians, emptying 99546 (Adak) and 99547 (Atka).
# - keep-shapes only protects each feature's largest ring, so both layers
#   are exploded before -simplify so every island keeps a shape.
# - ZCTA parts stay exploded (one feature per polygon, sharing `zip`):
#   re-dissolving by zip collapses tiny enclave ZCTAs such as 75270 and
#   55903. The page groups parts by zip. The outline is re-dissolved.
"$MAPSHAPER" -i "$RAW/$ZCTA_NAME/$ZCTA_NAME.shp" "$RAW/$STATE_NAME/$STATE_NAME.shp" combine-files \
  -rename-layers zcta,nation \
  -rename-fields zip=ZCTA5CE20 target=zcta \
  -filter-fields zip target=zcta \
  -filter '!/^(00[6-9]|969)/.test(zip) && zip !== "96799"' target=zcta \
  -filter '!["60", "66", "69", "72", "78"].includes(STATEFP)' target=nation \
  -dissolve target=nation \
  -explode target=zcta,nation \
  -proj albersusa \
  -filter remove-empty target=zcta,nation \
  -simplify "$SIMPLIFY" keep-shapes \
  -dissolve target=nation \
  -o "$OUT/zcta.json" target=zcta format=topojson quantization="$QUANTIZATION" force \
  -o "$OUT/nation.json" target=nation format=topojson quantization="$QUANTIZATION" force

# Quantization can collapse a sliver island part to nothing; drop those parts.
node -e '
const fs = require("fs");
const file = process.argv[1];
const topo = JSON.parse(fs.readFileSync(file, "utf8"));
const obj = topo.objects.zcta;
const before = obj.geometries.length;
obj.geometries = obj.geometries.filter((g) => g.type !== null && g.type !== undefined);
fs.writeFileSync(file, JSON.stringify(topo));
console.log(`[prune] Removed ${before - obj.geometries.length} empty part(s)`);
' "$OUT/zcta.json"

echo
echo "Output sizes:"
for f in "$OUT/zcta.json" "$OUT/nation.json"; do
  bytes=$(wc -c < "$f" | tr -d ' ')
  gz=$(gzip -c "$f" | wc -c | tr -d ' ')
  awk -v f="$f" -v b="$bytes" -v g="$gz" 'BEGIN { printf "  %-20s %6.2f MB  (gzip %5.2f MB)\n", f, b/1e6, g/1e6 }'
done
