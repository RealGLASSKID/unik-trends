# UNIK TRENDS (Next.js + Firebase + Cloudinary + Paystack + PWA)

Wholesale streetwear store with admin dashboard, bookings, online orders, and installable PWA.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Firebase console: enable Authentication (Email/Password + Google), create Firestore, paste `firestore.rules` (change the admin email to the owner). Firebase Storage is not used.
4. Cloudinary: Settings > Upload > add an **unsigned** upload preset and put its name and your cloud name in `.env.local`.
5. Paystack (optional until key is ready): set `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` when the owner provides it. Without it, online orders still work via WhatsApp fallback.
6. `npm run dev`, sign in with the owner email (verified), open `/admin`, add products, set WhatsApp + waybill fee in Settings.

## Features

- **Book & pick up** — customer reserves items, pays at the Lagos shop
- **Order online** — Paystack payment (when key is set) + waybill fee option
- **Admin** — products CRUD, orders, customers, team, settings, live order alerts + browser notifications
- **PWA** — installable on mobile; service worker + icons under `/public/icons`

## Admin access

- The owner is `NEXT_PUBLIC_ADMIN_EMAIL`. Other admins are added in Admin > Team (owner only).
- Admins must sign in with a verified email.
- Change `owner@example.com` in `firestore.rules` to the owner's email.
