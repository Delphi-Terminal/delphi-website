"""Instant quote: ranked carrier rates from Warp's gateway API.

POST /api/quote with JSON
  { from, to, pickup: "YYYY-MM-DDTHH:MM", mode, pallets, weight, handling, commodity }
returns
  { rates: [{ carrier, service, transitDays, price, currency, isWarp, token }], expires }
or { manual: true, reason } for freight Warp can't price self-serve.

Each rate's token is what /api/book charges and books from. It is signed with
rate_secret() so the price can't be edited in the browser; api/book.py checks it
with the same secret.

The Warp key (WARP_API_KEY) stays on the server; set it in the Vercel project's
environment variables.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler
from urllib import error, request

WARP_BASE = "https://gw.wearewarp.com/api/v1"
TIMEOUT_S = 25
CACHE_TTL_S = 300
PALLET_IN = {"length": 48, "width": 40, "height": 48}

MODES = {"ftl", "ltl", "ptl", "unsure"}
DELIVERY_SERVICES = {
    "Liftgate": "liftgate-delivery",
    "Inside delivery": "inside-delivery",
    "Appointment required": "delivery-appointment",
}
MANUAL = {
    "Temperature-controlled": "Warp doesn't price refrigerated freight self-serve yet.",
    "Hazmat": "Hazmat loads need to be declared and placed with a hazmat-certified carrier.",
    "Oversized": "Oversized freight is priced from its exact dimensions.",
}

_cache = {}


class QuoteError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def parse(body):
    zips = {}
    for name in ("from", "to"):
        value = str(body.get(name) or "").strip()
        if not re.fullmatch(r"\d{5}", value):
            raise QuoteError(f"Enter a valid {'pickup' if name == 'from' else 'delivery'} ZIP code.")
        zips[name] = value
    match = re.match(r"(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?", str(body.get("pickup") or ""))
    if not match:
        raise QuoteError("Add a pickup date to see rates.")
    try:
        pallets = int(body.get("pallets") or 0)
        weight = float(str(body.get("weight") or "0").replace(",", ""))
    except ValueError:
        raise QuoteError("Pallets and weight must be numbers.")
    if not 1 <= pallets <= 30:
        raise QuoteError("Add between 1 and 30 pallets to see rates.")
    if not 1 <= weight <= 48000:
        raise QuoteError("Add a total weight up to 48,000 lbs to see rates.")
    mode = body.get("mode") if body.get("mode") in MODES else "unsure"
    handling = str(body.get("handling") or "")
    commodity = str(body.get("commodity") or "").strip()[:80] or "Pallet"
    return {
        "from": zips["from"],
        "to": zips["to"],
        "date": match.group(1),
        "pickup": match.group(0),
        "mode": mode,
        "pallets": pallets,
        "weight": round(weight),
        "handling": handling,
        "commodity": commodity,
    }


def warp(path, payload, key):
    req = request.Request(
        WARP_BASE + path,
        data=json.dumps(payload).encode(),
        headers={"apikey": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=TIMEOUT_S) as res:
            return json.load(res)
    except error.HTTPError as exc:
        if exc.code in (401, 403):
            raise QuoteError("Rates are unavailable right now.", 502)
        if exc.code == 429:
            raise QuoteError("We're getting a lot of quote requests. Try again in a few minutes.", 503)
        try:
            message = json.load(exc).get("message")
        except Exception:
            message = None
        status = 400 if 400 <= exc.code < 500 else 502
        raise QuoteError(message or "Rates are unavailable right now.", status)
    except (error.URLError, TimeoutError):
        raise QuoteError("Rates are taking too long. Try again in a moment.", 504)


ACRONYMS = {"LLC", "ABF", "XPO", "RL", "LTL", "FTL", "USA"}
SPECIAL = {"FEDEX": "FedEx", "INC": "Inc", "UPS": "UPS"}


def carrier_name(raw):
    words = []
    for word in str(raw or "Carrier").split():
        upper = word.upper()
        if upper in SPECIAL:
            words.append(SPECIAL[upper])
        elif upper in ACRONYMS or "&" in word:
            words.append(upper)
        else:
            words.append(word[:1].upper() + word[1:].lower())
    while len(words) > 1 and words[-1].rstrip(".,") in ("Inc", "LLC"):
        words.pop()
    return " ".join(words).rstrip(",")


def charges(option):
    linehaul = fuel = 0.0
    extras = []
    for charge in option.get("serviceCharges") or []:
        amount = charge.get("amount")
        if not isinstance(amount, (int, float)):
            continue
        name = str(charge.get("description") or charge.get("code") or "")
        if charge.get("code") == "TRANSIT":
            linehaul += amount
        elif "fuel" in name.lower():
            fuel += amount
        else:
            extras.append({"name": name.replace("_", " ").replace("-", " ").strip().capitalize(), "amount": round(amount, 2)})
    if not linehaul:
        return None
    return {"linehaul": round(linehaul, 2), "fuel": round(fuel, 2), "accessorials": extras}


def service_name(raw):
    text = str(raw or "").replace("_", " ").strip().lower()
    if text.startswith("fedex freight "):
        text = text[len("fedex freight "):]
    if len(text) <= 3 and text not in ("", "std"):
        return text.upper()
    return {"std": "Standard", "": "Standard"}.get(text, text[:1].upper() + text[1:])


def rows_from_market(data):
    rows = []
    for option in data.get("options") or []:
        price = option.get("rate")
        if not isinstance(price, (int, float)) or price <= 0:
            continue
        seconds = option.get("transitTime")
        rows.append({
            "quoteId": option.get("id"),
            "kind": "market",
            "carrier": carrier_name(option.get("carrierName")),
            "carrierCode": str(option.get("carrierCode") or "").upper() or None,
            "service": service_name(option.get("serviceLevel")),
            "type": option.get("shipmentType"),
            "transitDays": round(seconds / 86400) if isinstance(seconds, (int, float)) and seconds > 0 else None,
            "price": round(price, 2),
            "currency": option.get("currency") if option.get("currency") in ("USD", "CAD") else "USD",
            "isWarp": option.get("source") == "WARP",
            "expires": option.get("expirationTs"),
            "charges": charges(option),
        })
    return rows


def row_from_ftl(data):
    price = (data.get("price") or {}).get("amount")
    if not isinstance(price, (int, float)) or price <= 0:
        return None
    expires = data.get("expiration_time_utc")
    return {
        "quoteId": data.get("quote_id"),
        "kind": "ftl",
        "carrier": "Warp Technology",
        "carrierCode": "WTCH",
        "service": "53' dry van",
        "type": "FTL",
        "transitDays": data.get("transit_time") or None,
        "price": round(price, 2),
        "currency": (data.get("price") or {}).get("currency_code") or "USD",
        "isWarp": True,
        "expires": expires * 1000 if isinstance(expires, (int, float)) else None,
        "charges": None,
    }


def rate_secret(key):
    secret = os.environ.get("BOOKING_SECRET", "").strip()
    return (secret or "theseus-rate:" + key).encode()


def sign_rate(row, load, key):
    payload = {
        "q": row["quoteId"], "k": row["kind"], "p": row["price"], "c": row["currency"],
        "x": row["expires"], "n": row["carrier"], "s": row["service"], "t": row["transitDays"],
        "l": load,
    }
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    mac = hmac.new(rate_secret(key), body.encode(), hashlib.sha256).hexdigest()[:40]
    return f"{body}.{mac}"


def get_rates(body, key):
    load = parse(body)
    if load["handling"] in MANUAL:
        return {"manual": True, "reason": MANUAL[load["handling"]]}
    if not key:
        raise QuoteError("Instant rates aren't configured yet.", 503)

    cache_key = json.dumps(load, sort_keys=True)
    hit = _cache.get(cache_key)
    if hit and hit[0] > time.time():
        return hit[1]

    service = DELIVERY_SERVICES.get(load["handling"])
    item = dict(PALLET_IN, name=load["commodity"], sizeUnit="IN", totalWeight=load["weight"],
                weightUnit="lbs", quantity=load["pallets"], packaging="Pallet", stackable=False)
    market = {
        "pickupDate": load["date"],
        "pickupInfo": {"zipcode": load["from"], "country": "US", "serviceOptions": []},
        "deliveryInfo": {"zipcode": load["to"], "country": "US", "serviceOptions": [service] if service else []},
        "items": [item],
    }

    with ThreadPoolExecutor(max_workers=2) as pool:
        market_job = pool.submit(warp, "/freights/freight-quote", market, key)
        ftl_job = None
        if load["mode"] == "ftl":
            ftl = {
                "pickupDate": load["date"],
                "pickupInfo": {"zipcode": load["from"]},
                "deliveryInfo": {"zipcode": load["to"]},
                "deliveryServices": [{"service": service, "quantity": 1}] if service else [],
                "shipmentType": "FTL",
                "vehicleType": {"code": "DRY_VAN_53"},
                "listItems": [item],
            }
            ftl_job = pool.submit(warp, "/freights/quote", ftl, key)
        rows, failure = [], None
        try:
            rows = rows_from_market(market_job.result())
        except QuoteError as exc:
            failure = exc
        if ftl_job:
            try:
                row = row_from_ftl(ftl_job.result())
                if row:
                    rows.append(row)
            except QuoteError as exc:
                failure = failure or exc

    wanted = {"ftl": "FTL", "ltl": "LTL", "ptl": "LTL"}.get(load["mode"])
    if wanted and any(row["type"] == wanted for row in rows):
        rows = [row for row in rows if row["type"] == wanted]
    if not rows:
        if failure:
            raise failure
        raise QuoteError("No carriers returned a rate for this lane and date.", 404)

    for row in rows:
        quote_id = row.pop("quoteId")
        kind = row.pop("kind")
        if quote_id:
            row["token"] = sign_rate(dict(row, quoteId=quote_id, kind=kind), load, key)
    rows.sort(key=lambda row: row["price"])
    expiries = [row["expires"] for row in rows if isinstance(row["expires"], (int, float))]
    result = {"rates": rows, "expires": min(expiries) if expiries else None}
    _cache[cache_key] = (time.time() + CACHE_TTL_S, result)
    return result


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        try:
            length = min(int(self.headers.get("Content-Length") or 0), 10_000)
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError
        except ValueError:
            return self._send(400, {"error": "Send the quote as JSON."})
        try:
            self._send(200, get_rates(body, os.environ.get("WARP_API_KEY", "").strip()))
        except QuoteError as exc:
            self._send(exc.status, {"error": str(exc)})
        except Exception:
            self._send(500, {"error": "Something went wrong getting rates."})

    def do_GET(self):
        self._send(405, {"error": "Use POST."})
