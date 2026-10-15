# Admmis Store — e-commerce web app for Nepal

A mobile-friendly, installable (PWA) online shop for clothing and everyday products.
Customers sign up, browse, add to cart and pay with **eSewa** or **cash on delivery**.
You manage products and orders from a built-in **admin panel**. The whole shop works in **English and Nepali**.

**Stack:** Next.js 15 (React 19, TypeScript) · Tailwind CSS · Supabase (Postgres + Auth + file storage) · eSewa ePay v2

---

## What is included

| Area | Features |
|---|---|
| **Accounts** | Sign up, log in, log out, forgot/reset password, email confirmation, profile (name, phone) |
| **Shop** | Home page, categories, search, sorting, product pages with size/colour variants and live stock, discount badges |
| **Cart** | Persistent cart (survives refresh), quantity limits from stock, prices re-checked against the database every time the cart opens |
| **Checkout** | Nepal delivery form, mobile-number validation, free delivery above a threshold, **eSewa** and **cash on delivery** |
| **Orders** | Order history, order page with progress tracker, pay-again if eSewa failed, cancel while still pending |
| **Admin** (`/admin`) | Dashboard (sales, pending orders, low stock), order list + status/payment updates, product create/edit with photo upload, variants and stock |
| **Language** | English / नेपाली toggle (Nepali fonts bundled, no Google Fonts needed) |
| **PWA** | Installable on phones, offline page, app icons |
| **Production basics** | Security headers, SEO (sitemap, robots, product structured data), Docker file, `.env.example` |

### Security design (why you can trust the money parts)
- **Prices are never taken from the browser.** Orders are created by a database function (`place_order`) that reads real prices and stock, decrements stock atomically and rejects anything invalid. If one item is out of stock the whole order is rolled back.
- **Payments are verified on the server.** eSewa's redirect is only accepted after its HMAC signature is checked, the amount matches the order, and eSewa's status API agrees.
- **Row Level Security** on every table: customers can only see their own orders and cannot promote themselves to admin; only admins can change products, orders and prices.
- The Supabase *service-role key* is used in exactly one place (recording a verified payment) and never reaches the browser.

---

## 1. Run it on your computer

You need **Node.js 20+** and a free [Supabase](https://supabase.com) account.

1. **Create a Supabase project.** Pick the region closest to Nepal (*Mumbai* or *Singapore*).
2. **Create the database.** Supabase → *SQL Editor* → paste all of `supabase/schema.sql` → Run.
   Optionally run `supabase/seed.sql` too for demo products (delete them later from the admin panel).
3. **Copy the settings.** `cp .env.example .env.local`, then fill in the three Supabase values from *Project Settings → API*
   (`URL`, `anon` key, `service_role` key). Leave the eSewa test values as they are for now.
4. **Install and start:**
   ```bash
   npm install
   npm run dev
   ```
   Open <http://localhost:3000>.
5. **Make yourself the admin.** Sign up in the shop, then in the Supabase SQL Editor run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
   ```
   Reload the site — an **Admin** link appears in the menu.

> **Tip:** while testing, turn off *Authentication → Providers → Email → "Confirm email"* in Supabase so sign-ups log in instantly. Turn it back on before launch.

### Test an eSewa payment
Choose *eSewa* at checkout. On eSewa's test page use ID `9806800001` (up to `…05`), password `Nepal@123`, MPIN `1122`, OTP `123456`.
After paying you land on your order page marked **Paid**.

---

## 2. Deploy (Vercel + Supabase) — about 15 minutes

1. Put the project on GitHub (private repo is fine).
2. On [vercel.com](https://vercel.com) → *Add New → Project* → import the repo. Framework is detected automatically.
3. Add these **Environment Variables** (see `.env.example`):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | your final address, e.g. `https://admmis.com` (no trailing slash) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase — keep secret |
   | `ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`, `ESEWA_FORM_URL`, `ESEWA_STATUS_URL` | test values first, **live values at launch** (section 3) |
   | `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_STORE_CITY` | optional — shown in the footer and legal pages |

4. Click **Deploy**.
5. In Supabase → *Authentication → URL Configuration* set **Site URL** to your address and add `https://YOUR-ADDRESS/auth/callback` under **Redirect URLs** (otherwise confirmation and reset-password emails won't work).
6. Add your domain in Vercel → *Settings → Domains*.

**Prefer your own server?** A `Dockerfile` is included (instructions at the top of the file).

---

## 3. Going live with eSewa

The test credentials only move pretend money. For real payments:

1. Open an **eSewa merchant account** (eSewa's merchant team handles this; you will need your business registration/PAN documents).
2. eSewa gives you a real **product code** and **secret key**. Set in Vercel:
   ```
   ESEWA_PRODUCT_CODE=<your code>
   ESEWA_SECRET_KEY=<your secret key>
   ESEWA_FORM_URL=https://epay.esewa.com.np/api/epay/main/v2/form
   ESEWA_STATUS_URL=https://epay.esewa.com.np/api/epay/transaction/status/
   ```
   Redeploy.
3. Ask eSewa whether your live **success/failure URLs** must be registered:
   `https://YOUR-ADDRESS/api/payments/esewa/success` and `https://YOUR-ADDRESS/api/payments/esewa/failure/<order-id>`.
4. Make one real small order yourself and confirm it shows **Paid** in `/admin/orders`.

> The secret key must stay private. Never put it in a `NEXT_PUBLIC_` variable or commit it to Git.

---

## 4. Daily use (admin panel)

- **Orders** — new orders arrive as *pending*. Call/confirm the customer (important for cash on delivery), then move the order through *confirmed → processing → shipped → delivered*. For COD, set **payment = paid** once the courier hands you the cash.
- **Cancelling** an order puts its items back in stock automatically. A cancelled order cannot be re-opened.
- **eSewa refunds** are done in your eSewa merchant portal; afterwards set the order's payment to *refunded*. The dashboard warns you about cancelled-but-paid orders.
- **Products** — add photos (resized automatically), a price, an optional "old price" to show a discount, and one row per size/colour with its stock. Untick *Visible in shop* to hide a product without deleting it.
- **Delivery fee / free-delivery threshold / turning COD or eSewa off** live in one table. Edit them in Supabase → *Table Editor → store_settings* (default: Rs. 150, free over Rs. 5,000).

---

## 5. What else a real shop needs (production checklist)

**Do before launch**
- [ ] **Email delivery.** Supabase's built-in email sender is limited to a handful of emails per hour — fine for testing, not for customers. Add an SMTP provider (Resend, Brevo, Amazon SES…) in *Authentication → SMTP Settings*, and edit the email templates (also translate them to Nepali if you like).
- [ ] **Order alerts for you.** The shop does not yet notify *you* when an order arrives — you'd have to look at the admin page. Add a Supabase *Database Webhook* on `orders` → email / Telegram / WhatsApp message. (Highest-value next feature.)
- [ ] **Legal pages.** `/legal/privacy`, `/legal/terms`, `/legal/returns` contain **template text**. Have them reviewed for Nepal and add your PAN/VAT number and registered address. Ask your accountant what invoice/bill format you must give customers.
- [ ] **Real content.** Product photos (portrait 4:5 looks best), Nepali names/descriptions, correct stock. Review the Nepali UI text in `src/shared/i18n.ts` with a native speaker.
- [ ] **Courier.** Decide who delivers (Kathmandu valley vs outside) and whether the flat delivery fee matches their rates.
- [ ] **Turn on email confirmation** and set strong rules: Supabase *Authentication → Attack Protection* (enable CAPTCHA) to stop fake sign-ups.
- [ ] **Place test orders** for each path: COD, eSewa success, eSewa cancelled, out-of-stock.

**Do soon after launch**
- [ ] **Backups.** Supabase's free plan has no automatic point-in-time backup. Upgrade to a paid plan or schedule a regular `pg_dump`.
- [ ] **Monitoring.** Free uptime check (UptimeRobot) and error tracking (Sentry).
- [ ] **Analytics & ads.** Plausible/Google Analytics and the Meta Pixel for Facebook/Instagram campaigns.
- [ ] **More payment options.** Khalti, Fonepay and ConnectIPS are the next most common in Nepal; the payment code is isolated in `src/lib/esewa.ts` so another gateway can be added next to it.
- [ ] **COD fraud control.** Phone-confirm first-time COD orders before dispatch (the *pending → confirmed* step exists for this). Consider a COD limit for new customers.
- [ ] **Guest checkout, wishlist, product reviews, discount codes, SMS/WhatsApp order updates** — common requests once you have customers.

---

## 6. Project map

```
supabase/schema.sql      Database, security rules, order + stock logic  ← run first
supabase/seed.sql        Optional demo products
src/shared/              Pure TypeScript shared with the future mobile app:
                         types, cart logic, price formatting, English + Nepali text
src/lib/                 Supabase clients, auth guards, eSewa signing/verification, data queries
src/app/                 Pages and API routes (shop, cart, checkout, orders, admin, payments)
src/components/          UI components
public/sw.js             Service worker (offline page, caching of public pages only)
```

### Planned mobile app (React Native / Expo)
The web app and the mobile app are meant to share one backend. Everything in `src/shared/` has no web-only imports, so it can be copied (or turned into a shared package) and used as-is in React Native. The mobile app would talk to the **same Supabase project** (login, products, `place_order`). Before building it, one small change is needed: the checkout/eSewa API routes currently identify the customer through the website's login cookie; for the app they should also accept the Supabase access token in an `Authorization: Bearer` header.

---

## Useful commands

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # run the production build
npm run typecheck   # TypeScript check
```

## Mobile app (Android + iPhone)

The `mobile/` folder is a React Native (Expo) app for the same shop: same Supabase project, same orders, same eSewa flow, English/Nepali. It copies `src/shared/` from this website so prices and cart rules never differ. Setup and test steps are in [`mobile/README.md`](mobile/README.md).

The app logs in with Supabase and calls this website's `/api/checkout` and `/api/payments/esewa/initiate` with an `Authorization: Bearer <login token>` header (the website still accepts normal browser cookies too).

## Troubleshooting

| Problem | Fix |
|---|---|
| "Supabase is not configured" | `.env.local` is missing or the dev server wasn't restarted after editing it |
| Sign-up email never arrives | Normal on Supabase's built-in sender — set up SMTP, or disable email confirmation for testing |
| Confirmation / reset link goes to the wrong site | Fix **Site URL** and **Redirect URLs** in Supabase *Authentication → URL Configuration* |
| Admin link doesn't show | The `update public.profiles set role = 'admin' …` query matched no row — check the email, then reload |
| Images from upload don't display | `NEXT_PUBLIC_SUPABASE_URL` must be set at **build** time (redeploy after changing it) |
| eSewa returns to the order page as "not confirmed" | Check `ESEWA_SECRET_KEY` has no extra spaces, and the product code/secret belong to the same environment (test vs live) |
