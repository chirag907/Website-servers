# Chirag – portfolio + private workspace

Plain HTML/CSS/JS, no build step. Netlify: empty build command, publish directory `.`.

## One-time Supabase setup (about 10 minutes)
1. Create a free project at supabase.com.
2. **SQL Editor** -> New query -> paste `supabase.sql` -> Run. This creates your links table and a private `files` bucket, with rules so each login only sees its own data.
3. **Authentication -> Users -> Add user**: create your own email + a strong password (tick "Auto confirm").
4. **Authentication -> Sign In / Providers -> Email**: turn **off** "Allow new users to sign up", so nobody else can create an account. (Optional: turn on multi-factor auth for extra safety.)
5. **Project Settings -> API**: copy the Project URL and the `anon` public key into `config.js`.
6. Commit and push to GitHub; Netlify redeploys. Open the site, go to Workspace and sign in.

## Safety notes
- The anon key in `config.js` is public by design. Protection comes from your login and the rules in `supabase.sql`. **Never** put the `service_role` key anywhere in this repo.
- Free Supabase limits uploads to 50 MB per file and 1 GB total storage.
- Supabase doesn't offer fingerprint/face passkeys out of the box, so sign-in is email + password (with optional MFA).
- Free projects pause after about a week of inactivity; open the dashboard to resume.
