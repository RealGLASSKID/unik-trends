# UNIK TRENDS (Next.js + Firebase + Cloudinary)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Firebase console: enable Authentication (Email/Password + Google), create Firestore, paste `firestore.rules` (change the admin email). Firebase Storage is not used.
4. Cloudinary: Settings > Upload > add an **unsigned** upload preset and put its name and your cloud name in `.env.local`.
5. `npm run dev`, sign in with the owner email (verified), open `/admin`, add products, and set the WhatsApp number in Settings.

## Admin access
- The owner is `NEXT_PUBLIC_ADMIN_EMAIL`. Other admins are added in Admin > Team (owner only).
- Admins must sign in with a verified email (Google sign-in is verified automatically; email signups get a verification link).
- Change `owner@example.com` in `firestore.rules` to the owner's email.
