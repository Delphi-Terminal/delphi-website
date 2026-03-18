# Legacy Features Reference

Notes from git history (pre-redesign) for re-adding API docs, pricing/checkout, and contact form as tabs in the new style.

---

## 1. Contact Form (FormSubmit)

**Original FormSubmit config** (from `871370f^` / pre-redesign):

- **Action URL:** `https://formsubmit.co/armon@delphiterminal.co`
- **Method:** POST
- **Fields (all with `name` attributes):**
  - `name` (required)
  - `email` (required)
  - `referral` (optional) — "Referral Code (Optional)"
  - `message` (optional) — "Message (Optional)"
- **Hidden fields:**
  - `_subject`: "New Contact Form Submission from Delphi Website"
  - `_captcha`: "false"
  - `_next`: redirect URL after submit (e.g. `?submitted=true` for thank-you state)

**Important:** FormSubmit only includes fields with `name` attributes in the email. Without `name`, the message/email won't appear.

**Contact email in JSON-LD:** `armon@delphiterminal.co` (contactType: sales)

---

## 2. API Documentation

**How it was accessed:**

| Location | URL |
|----------|-----|
| Header nav | `https://docs.delphiterminal.co` (target="_blank") |
| Hero "Documentation" link | `https://docs.delphiterminal.co` |
| FAQ answer | "Full documentation is available at docs.delphiterminal.co" |

**Alternative URL (earlier commit):** `https://api.delphiterminal.co/docs`

**Setup:** The old repo had a `docs-ui/` folder with a React app (OpenAPI/Swagger-style docs). It used `openapi.json` and was built to `docs-ui/dist/`. The live docs were likely hosted at `docs.delphiterminal.co` separately.

---

## 3. Pricing / Checkout (Stripe)

**Checkout URL:** `/checkout` (or `https://delphiterminal.co/checkout`)

**3-tier pricing:**

| Tier | Price | CTA | Stripe link |
|------|-------|-----|-------------|
| Free | $0/mo | "Get Started" | `https://buy.stripe.com/9B6cN75Ix4tAaJDgYMew803` |
| Pro | $20/mo | "Subscribe" | `https://buy.stripe.com/9B6cN75Ix4tAaJDgYMew803` |
| Max | $300/mo | "Subscribe" | `https://buy.stripe.com/28E5kF4EtbW2eZTaAoew801` |

**Header / CTAs:** "Sign Up" button linked to `/checkout` in header, hero, "What We Do" section, and product preview.

**JSON-LD:** `offers.url` pointed to `https://delphiterminal.co/checkout` for the SoftwareApplication schema.

---

## 4. Suggested Tab Structure for New Layout

When re-adding these as tabs in the new style:

1. **Header nav:** Add "Docs" (→ docs.delphiterminal.co or api.delphiterminal.co/docs) and "Pricing" or "Sign Up" (→ /checkout)
2. **Contact:** FormSubmit → `armon@delphiterminal.co` with `name`, `email`, `message` (and optionally `referral`), all with `name` attributes
3. **Checkout page:** `/checkout` with 3-tier pricing cards and Stripe payment links

**Update (Mar 2026):** Pricing has been added at `/pricing/` with 3-tier cards (Free, Pro, Max) and Stripe payment links. Nav order: Markets | News | About | Pricing | Contact.

---

## 5. Domain Notes

- **Old:** delphiterminal.co
- **New:** delphimarkets.com

Update URLs accordingly when re-adding (e.g. `docs.delphimarkets.com` if that exists, or keep `docs.delphiterminal.co` if still in use).
