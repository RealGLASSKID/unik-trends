# UNIK TRENDS (Next.js + Firebase)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase web app keys + `NEXT_PUBLIC_ADMIN_EMAIL`.
3. Firebase console: enable Authentication (Email/Password + Google), create Firestore + Storage, paste `firestore.rules` (change the admin email) and set Storage rules.
4. `npm run dev`, sign up with the admin email, open `/admin`, go to Products and click "Load demo products", then set the WhatsApp number in Settings.
