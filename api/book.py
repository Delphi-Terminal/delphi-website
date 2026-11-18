"""Checkout for a rate from /api/quote: Stripe authorizes the card, Warp books
the truck, then the card is captured. If Warp can't book, the hold is released.

GET  /api/book                                  -> { publishableKey, testMode }
POST /api/book { step: "intent", token, email } -> { clientSecret }
POST /api/book { step: "book", token, intentId, pickup, delivery }
                                                -> { booking: { trackingNumber, ... } }

The rate token comes from api/quote.py and is checked against the same secret,
so the amount charged is always the quoted price. With a test Stripe key
(sk_test_) nothing is sent to Warp and the booking that comes back is marked
test. Live Stripe keys only run on the production deployment.

Env: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, WARP_API_KEY, optional BOOKING_SECRET.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler
from urllib import error, parse, request

WARP_BASE = "https://gw.wearewarp.com/api/v1"
STRIPE_BASE = "https://api.stripe.com/v1"
TIMEOUT_S = 25
PALLET_IN = {"length": 48, "width": 40, "height": 48}
DELIVERY_SERVICES = {
    "Liftgate": "liftgate-delivery",
    "Inside delivery": "inside-delivery",
    "Appointment required": "delivery-appointment",
}
ISO_UTC = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z")
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")


class BookError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def env(name):
    return os.environ.get(name, "").strip()


def stripe_key():
    key = env("STRIPE_SECRET_KEY")
    if not key:
        raise BookError("Online booking isn't set up yet.", 503)
    if key.startswith(("sk_live_", "rk_live_")) and env("VERCEL_ENV") != "production":
        raise BookError("Live payments only run on the production site.", 503)
    return key


def is_test(key):
    return key.startswith(("sk_test_", "rk_test_"))


def read_rate(token):
    warp_key = env("WARP_API_KEY")
    secret = (env("BOOKING_SECRET") or "theseus-rate:" + warp_key).encode()
    body, _, mac = str(token or "").partition(".")
    expected = hmac.new(secret, body.encode(), hashlib.sha256).hexdigest()[:40]
    if not body or not hmac.compare_digest(mac, expected):
        raise BookError("This rate couldn't be verified. Get fresh rates and try again.")
    rate = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
    if isinstance(rate.get("x"), (int, float)) and rate["x"] / 1000 < time.time() + 60:
        raise BookError("This rate has expired. Get fresh rates to book.", 410)
    return rate


def stripe(method, path, key, params=None, idempotency=None):
    data = None
    if params:
        data = parse.urlencode(params).encode()
    headers = {"Authorization": f"Bearer {key}"}
    if idempotency:
        headers["Idempotency-Key"] = idempotency
    req = request.Request(STRIPE_BASE + path, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=TIMEOUT_S) as res:
            return json.load(res)
    except error.HTTPError as exc:
        try:
            message = json.load(exc).get("error", {}).get("message")
        except Exception:
            message = None
        raise BookError(message or "Payment is unavailable right now.", 402 if exc.code == 402 else 502)
    except (error.URLError, TimeoutError):
        raise BookError("Payment is taking too long. Try again in a moment.", 504)


def warp(path, payload):
    req = request.Request(
        WARP_BASE + path,
        data=json.dumps(payload).encode(),
        headers={"apikey": env("WARP_API_KEY"), "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=TIMEOUT_S) as res:
            return json.load(res)
    except error.HTTPError as exc:
        try:
            message = json.load(exc).get("message")
        except Exception:
            message = None
        if exc.code in (401, 403):
            message = None
        raise BookError(message or "The carrier couldn't confirm this booking.", 409 if exc.code == 409 else 502)
    except (error.URLError, TimeoutError):
        raise BookError("Booking is taking too long. Your card wasn't charged; try again.", 504)


def stop(raw, label):
    raw = raw if isinstance(raw, dict) else {}
    clean = {}
    for name, limit in (("company", 80), ("name", 80), ("street", 120), ("city", 60)):
        value = str(raw.get(name) or "").strip()
        if not value:
            raise BookError(f"Add the {label} {'contact name' if name == 'name' else name}.")
        clean[name] = value[:limit]
    clean["street2"] = str(raw.get("street2") or "").strip()[:60]
    state = str(raw.get("state") or "").strip().upper()
    if not re.fullmatch(r"[A-Z]{2}", state):
        raise BookError(f"Add the {label} state as two letters.")
    clean["state"] = state
    phone = re.sub(r"\D", "", str(raw.get("phone") or ""))
    if not 10 <= len(phone) <= 15:
        raise BookError(f"Add a {label} phone number.")
    clean["phone"] = phone
    email = str(raw.get("email") or "").strip()
    if not EMAIL.fullmatch(email):
        raise BookError(f"Add a {label} email.")
    clean["email"] = email[:120]
    start, end = str(raw.get("from") or ""), str(raw.get("to") or "")
    if not (ISO_UTC.fullmatch(start) and ISO_UTC.fullmatch(end)) or start >= end:
        raise BookError(f"Pick a {label} time window.")
    clean["from"], clean["to"] = start, end
    clean["instructions"] = str(raw.get("instructions") or "").strip()[:500]
    clean["ref"] = str(raw.get("ref") or "").strip()[:60]
    return clean


def warp_stop(info, zipcode, services):
    return {
        "locationName": info["company"],
        "contactName": info["name"],
        "contactPhone": info["phone"],
        "contactEmail": info["email"],
        "address": {
            "street": info["street"], "street2": info["street2"],
            "city": info["city"], "state": info["state"], "zipcode": zipcode,
        },
        "requiresAppointment": "delivery-appointment" in services,
        "instructions": info["instructions"],
    }, {"from": info["from"], "to": info["to"]}


def book_with_warp(rate, pickup, delivery):
    load = rate["l"]
    service = DELIVERY_SERVICES.get(load.get("handling"))
    item = dict(PALLET_IN, name=load.get("commodity") or "Pallet", sizeUnit="IN", totalWeight=load["weight"],
                weightUnit="lbs", quantity=load["pallets"], packaging="Pallet", stackable=False)
    pick, pick_window = warp_stop(pickup, load["from"], [])
    drop, drop_window = warp_stop(delivery, load["to"], [service] if service else [])
    if rate["k"] == "ftl":
        pick["windowTime"], drop["windowTime"] = pick_window, drop_window
        if pickup["ref"]:
            pick["refNum"] = pickup["ref"]
        payload = {
            "quoteId": rate["q"], "pickupDate": [load["date"]], "shipmentType": "FTL",
            "pickupInfo": pick, "deliveryInfo": drop, "listItems": [item],
        }
        result = warp("/freights/booking", payload)
    else:
        pick["timeWindow"], drop["timeWindow"] = pick_window, drop_window
        pick["serviceOptions"], drop["serviceOptions"] = [], [service] if service else []
        pick["refNums"] = [pickup["ref"]] if pickup["ref"] else []
        drop["refNums"] = []
        payload = {"quoteId": rate["q"], "pickupInfo": pick, "deliveryInfo": drop, "items": [item]}
        result = warp("/freights/book", payload)
    tracking = result.get("trackingNumber") or result.get("shipmentNumber")
    if not tracking and not result.get("orderId"):
        raise BookError(result.get("message") or "The carrier couldn't confirm this booking.", 502)
    return {
        "trackingNumber": tracking,
        "proNumber": result.get("proNumber"),
        "orderId": result.get("orderId"),
        "unpaid": bool(result.get("paymentLink")),
    }


def create_intent(body, key):
    rate = read_rate(body.get("token"))
    email = str(body.get("email") or "").strip()
    load = rate["l"]
    params = {
        "amount": int(round(rate["p"] * 100)),
        "currency": str(rate.get("c") or "USD").lower(),
        "capture_method": "manual",
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "link",
        "description": f"Freight {load['from']} to {load['to']}, {rate['n']} {rate['s']}",
        "metadata[quote_id]": rate["q"],
        "metadata[carrier]": rate["n"],
        "metadata[lane]": f"{load['from']}-{load['to']}",
    }
    if EMAIL.fullmatch(email):
        params["receipt_email"] = email
    intent = stripe("POST", "/payment_intents", key, params)
    return {"clientSecret": intent["client_secret"]}


def confirm_booking(body, key):
    rate = read_rate(body.get("token"))
    intent_id = str(body.get("intentId") or "")
    if not re.fullmatch(r"pi_[A-Za-z0-9]+", intent_id):
        raise BookError("Payment wasn't found. Try again.")
    intent = stripe("GET", f"/payment_intents/{intent_id}", key)
    meta = intent.get("metadata") or {}
    if meta.get("quote_id") != rate["q"] or intent.get("amount") != int(round(rate["p"] * 100)):
        raise BookError("This payment doesn't match the rate. Try again.")
    if meta.get("tracking_number") or meta.get("order_id"):
        return {"booking": {
            "trackingNumber": meta.get("tracking_number"), "proNumber": meta.get("pro_number") or None,
            "orderId": meta.get("order_id"), "test": meta.get("test") == "true",
        }}
    if intent.get("status") != "requires_capture":
        raise BookError("Your card wasn't authorized. Check the details and try again.", 402)

    pickup = stop(body.get("pickup"), "pickup")
    delivery = stop(body.get("delivery"), "delivery")
    try:
        if is_test(key):
            booking = {"trackingNumber": "TEST-" + secrets.token_hex(4).upper(), "proNumber": None,
                       "orderId": "test_" + secrets.token_hex(6), "unpaid": False}
        else:
            booking = book_with_warp(rate, pickup, delivery)
    except BookError:
        try:
            stripe("POST", f"/payment_intents/{intent_id}/cancel", key, idempotency=f"cancel-{intent_id}")
        except BookError:
            pass
        raise

    # The truck is booked from here on, so a Stripe hiccup must not turn into an
    # error for the shipper; an uncaptured hold can be captured from the
    # dashboard for 7 days.
    try:
        stripe("POST", f"/payment_intents/{intent_id}", key, {
            "metadata[tracking_number]": booking["trackingNumber"] or "",
            "metadata[pro_number]": booking["proNumber"] or "",
            "metadata[order_id]": booking["orderId"] or "",
            "metadata[test]": "true" if is_test(key) else "false",
            "metadata[warp_unpaid]": "true" if booking["unpaid"] else "false",
            "metadata[pickup_company]": pickup["company"],
            "metadata[delivery_company]": delivery["company"],
        })
    except BookError:
        pass
    try:
        stripe("POST", f"/payment_intents/{intent_id}/capture", key, idempotency=f"capture-{intent_id}")
    except BookError:
        pass
    return {"booking": {
        "trackingNumber": booking["trackingNumber"], "proNumber": booking["proNumber"],
        "orderId": booking["orderId"], "test": is_test(key),
    }}


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        try:
            key = stripe_key()
            publishable = env("STRIPE_PUBLISHABLE_KEY")
            if not publishable:
                raise BookError("Online booking isn't set up yet.", 503)
            self._send(200, {"publishableKey": publishable, "testMode": is_test(key)})
        except BookError as exc:
            self._send(exc.status, {"error": str(exc)})

    def do_POST(self):
        try:
            length = min(int(self.headers.get("Content-Length") or 0), 20_000)
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError
        except ValueError:
            return self._send(400, {"error": "Send the booking as JSON."})
        try:
            key = stripe_key()
            if body.get("step") == "intent":
                self._send(200, create_intent(body, key))
            elif body.get("step") == "book":
                self._send(200, confirm_booking(body, key))
            else:
                self._send(400, {"error": "Unknown step."})
        except BookError as exc:
            self._send(exc.status, {"error": str(exc)})
        except Exception:
            self._send(500, {"error": "Something went wrong booking this load. Your card wasn't charged."})
