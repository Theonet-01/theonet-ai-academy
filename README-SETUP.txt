# TheoNet Academy - Supabase starter upgrade

## Included
- Existing website split into `index.html`, `style.css`, and `script.js`
- Supabase authentication UI for student registration, login and password reset
- Student dashboard starter
- Admin dashboard starter with course create/delete and overview data
- Supabase schema with profiles, courses, enrolments, payments, service orders and certificates
- Row Level Security policies

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. Open `supabase-config.js` and enter the Project URL and publishable/anon key from Project Settings -> API.
   Never use the `service_role` or secret key in browser code.
4. In Supabase Authentication settings, configure your production Site URL as `https://www.theonet.online` and add the appropriate redirect URLs.
5. Register your own account through the website.
6. In SQL Editor, run the final commented UPDATE statement in `schema.sql` after replacing `YOUR-ADMIN-EMAIL` with your exact registration email. This promotes only that account to admin.
7. Upload the files to your existing GitHub repository and redeploy through Vercel.

## Important limitations / next integration stage
- The old checkout is still a manual bank-transfer information screen. It does not verify payments. Do not grant course access based on a screenshot or a browser-side success message.
- Paystack must be integrated through a trusted server-side Edge Function/webhook before automatic payment activation.
- Course video protection requires private storage or a dedicated video provider with signed playback tokens. Do not put paid videos in public Cloudinary URLs.
- Browser code cannot guarantee prevention of screenshots, screen recording, photography or all copying. This project can add deterrents and access control, not absolute prevention.
- The admin page currently provides starter course management and summary data. Payment review, service order management, lesson builder, certificate issuance and full analytics are follow-on modules.
- The current public catalogue still uses the original static `inventory` in `script.js`; move all catalogue rendering to the Supabase `courses` table in the next stage.
- Before launch, test RLS using separate student and admin accounts.
