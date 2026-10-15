# Admmis.fashion – mobile app (Android + iPhone)

React Native (Expo) app that uses the **same Supabase project and the same website** as the web shop.
Customers can browse, search, pick sizes/colours, buy now, use promo codes, pay by **eSewa** or **cash on delivery**, track orders, and switch to **Nepali**.

The shop rules (prices, cart, text in English/Nepali) live in `src/shared/` and are **copied from the website** (`../src/shared`) every time you run `npm start`, so the app and website never disagree.

## 1. Install (once)

You need Node 20 or newer (the website already needs it) and the **Expo Go** app on your phone (free in Play Store / App Store).

```bash
cd mobile
npm install
```

## 2. Settings

```bash
cp .env.example .env
```

Open `.env` and fill in three lines:

| Line | What to put |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same value as `NEXT_PUBLIC_SUPABASE_URL` in the website's `.env.local` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `EXPO_PUBLIC_API_URL` | Where the **website** runs, as your **phone** can reach it. On your Mac: `http://<your-wifi-address>:3000` |

Find your Mac's Wi-Fi address with `ipconfig getifaddr en0` (example result: `192.168.1.23`).
`localhost` will **not** work from a phone: on the phone, "localhost" means the phone itself.

## 3. Run the website so the phone can reach it

The app places orders and starts eSewa through the website's API, so the website must be running.
In the website's `.env.local` set (use your own address), then restart it:

```
NEXT_PUBLIC_SITE_URL=http://192.168.1.23:3000
```

```bash
# in the main admmis-store folder
npm run dev -- -H 0.0.0.0
```

(`NEXT_PUBLIC_SITE_URL` is where eSewa sends the customer back after paying, so the phone must be able to open it.)

## 4. Start the app

```bash
cd mobile
npx expo start
```

A QR code appears. **Android:** open Expo Go and scan it. **iPhone:** open the normal Camera app, scan, tap the banner.
Phone and Mac must be on the same Wi-Fi. If the phone cannot connect, try `npx expo start --tunnel`.

Changed `.env`? Stop (Ctrl+C) and run `npx expo start -c` so the new values are picked up.

## What to test

1. Home: hero, offer sticker, scrolling strip, Featured, category chips, trust strip. Pull down to refresh.
2. Tap **नेपाली** (top right): the whole app switches language and remembers it.
3. Shop: search, category chips, sort.
4. A product: swipe photos, choose size/colour, quantity, **Buy now**, **Add to cart**, "You may also like".
5. Cart: change quantities, remove, free-delivery hint.
6. Checkout: log in/sign up when asked, fill delivery details, try a promo code, place a **cash on delivery** order.
7. Checkout again with **eSewa**: the sandbox eSewa page opens inside the app (test ID `9806800001`, password `Nepal@123`, MPIN `1122`, OTP `123456`). After paying you land on the order, marked **Paid**.
8. Account → My orders: order progress bar, cancel a pending order, "Pay now" on an unpaid eSewa order.
9. Turn the phone sideways / try a tablet: the layout adapts (2, 3 or 4 product columns).

If you change an order's status in the website admin panel, pull down on the order screen in the app to see it update.

## Publishing later

- App name/icon/colours: `app.json` and `assets/`.
- Android build for the Play Store / a file to share: `npx eas-cli@latest build --platform android` (needs a free Expo account). iPhone App Store needs an Apple developer account.
- Before publishing, set `EXPO_PUBLIC_API_URL` to your real website address (https) and use real eSewa merchant keys in the website's environment.

## Folder map

```
app.json               app name, icon, bundle id (com.admmis.fashion)
src/app/               screens (file name = screen)
  (tabs)/index.tsx       Home          (tabs)/shop.tsx     Shop
  (tabs)/cart.tsx        Cart          (tabs)/account.tsx  Account
  product/[slug].tsx     Product page  checkout.tsx        Checkout
  pay.tsx                eSewa payment orders/              Orders + tracking
  login.tsx, signup.tsx
src/components/        reusable pieces (ProductCard, Hero, buttons…)
src/providers/         language, login and cart state
src/lib/               Supabase client, website API calls, theme colours
src/shared/            copied from ../src/shared (do not edit here; edit the website's copy)
```
