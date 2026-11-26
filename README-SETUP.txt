THEONET AI ACADEMY — PAYSTACK UPDATE

Included files:
- index.html, style.css, script.js, supabase-config.js, supabase.js: replace the matching website files.
- migration.sql: run ONCE in Supabase SQL Editor before deploying the updated website.
- supabase/functions/initialize-paystack-payment/index.ts: create this Edge Function in the same path.
- supabase/functions/verify-paystack-payment/index.ts: create this Edge Function in the same path.
- schema.sql: original schema reference only; do not rerun it over an existing database.

IMPORTANT SETUP
1. Confirm PAYSTACK_SECRET_KEY exists in Supabase Edge Function Secrets. Do not paste it into code or GitHub.
2. In Supabase SQL Editor, run migration.sql once. It sets every course to NGN 5,000, enforces that price, and seeds AI Image Generation, AI Video Generation and AI Animation if missing.
3. In your GitHub repository root, replace the five website files.
4. Create the two Edge Function folders/files exactly as shown. Deploy both functions to your existing Supabase project. Keep JWT verification enabled for both functions.
5. In Paystack Dashboard, set the callback URL to https://www.theonet.online/ (the code also supplies this callback during initialization).
6. Commit and push to GitHub; Vercel should deploy automatically.
7. Test using Paystack TEST keys and a Paystack test payment method. Do not switch to live keys until test payment, verification and enrolment all work.

PAYMENT SAFETY
- The browser never receives the Paystack secret key.
- Amount and course availability are checked on the server.
- The server verifies transaction status, reference, NGN currency and exact amount before activating enrolment.
- Students cannot directly write payment success records from the browser.

NOTE
The checkout supports published courses and the ₦50,000 complete package. Creative/web services remain quote-based and do not use course checkout. The founder image is set to the Cloudinary image supplied by you.
