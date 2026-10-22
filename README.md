# UNIK TRENDS

Next.js + Firebase + Cloudinary + Paystack UI + PWA wholesale store.

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` (Firebase, Cloudinary, `NEXT_PUBLIC_ADMIN_EMAIL`, optional Paystack key)
3. Deploy `firestore.rules` (change `owner@example.com` to the owner email)
4. `npm run dev`

## Customer flow

1. Browse shop → cart → checkout  
2. **Book** = pick up & pay at Tejuosho Plaza, Yaba, Lagos  
3. **Order** = pay online (Paystack when key is set) + optional waybill fee  
4. No WhatsApp negotiation required to place an order  

Contact form messages appear under **Admin → Messages**.

## Admin

`/admin` — products, orders, messages, customers, team, settings (waybill fee, shop address, WhatsApp for optional chat).
