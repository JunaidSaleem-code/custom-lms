# Developer setup: Supabase auth and local run

These steps are set in the Supabase dashboard, not in code. Do them once for the dev project, and repeat them for the production project before launch.

## 1. Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project settings > API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project settings > API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | Project settings > API Keys (secret). Server only. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |

Never commit `.env.local`, and never paste the secret key into chat or a ticket.

## 2. Database

Run the migrations in order in **SQL Editor**:

1. `supabase/migrations/0001_student_schema.sql`
2. `supabase/migrations/0002_harden_anon_grants.sql`
3. `supabase/migrations/0003_student_app_policies.sql`

## 3. Authentication settings (Supabase dashboard > Authentication)

- **Providers > Email**: turn **off** "Allow new users to sign up". Students are invited by staff only. Without this, anyone could create an account.
- **Providers > Email**: keep "Confirm email" on.
- **URL Configuration**:
  - Site URL: `http://localhost:3000` (dev) or the production domain.
  - Redirect URLs: add `http://localhost:3000/**` (dev) and the production `/**` URL.
- **Password**: minimum length 10 (matches the app's rule).

## 4. Email templates (Authentication > Email Templates)

The app uses the one-time token flow (`token_hash`), so the links in the emails must point at `/auth/confirm`. Supabase's default links don't work with this app.

**Invite user**: set the button or link to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
```

**Reset password**: set the link to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

**Confirm sign up / Magic link / Change email**: not used by this app for students. Leave them as they are, or disable them.

## 5. Email delivery

Supabase's built-in email is rate-limited and meant for testing. For real students, configure custom SMTP (for example Resend) under **Project settings > Authentication > SMTP**. This is part of the production setup.

## 6. Local run

```bash
npm install
npm run dev            # http://localhost:3000
npm run test:unit      # unit tests (no network needed)
npm run lint
npm run build
```

Seed the dev project with sample content and a test student (dev project only; the script refuses other projects):

```bash
node --env-file=.env.local scripts/dev-seed.mjs
```

The script prints an invite link for `student.dev@example.com`. Open it in the browser to set a password, then sign in.

## 7. Video (Cloudflare Stream)

Lessons play only after a Stream signing key is configured. In Cloudflare: **Stream > Settings > Signing Keys**, create a key, then set `STREAM_SIGNING_KEY_ID` and `STREAM_SIGNING_PRIVATE_KEY_BASE64` (base64 of the PKCS#8 PEM private key). Set each lesson's `stream_uid` in the database to the Stream video id.

## 8. Public sign-up (optional)

Sign-up is off by default. Students are normally invited by staff. To allow self sign-up:

1. In `.env.local`, set `SIGNUP_ENABLED=true`, then restart `npm run dev`.
2. In Supabase > Authentication > Providers > Email, turn **on** "Allow new users to sign up" and keep "Confirm email" on.
3. Supabase > Authentication > Email Templates > **Confirm sign up**, set the link to:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/learn
```

Both settings must agree. If the app flag is on and Supabase sign-up is off, sign-up shows a "closed" message.

Self sign-up creates an account only. Course access still depends on an enrollment (a purchase or a staff grant), so a new account sees "No active membership yet" until one exists.

## 9. Auth security settings (do before any real students)

In the Supabase dashboard, under **Authentication**:

- **Password security**: enable "Prevent use of leaked passwords" (checks against known breached passwords).
- **Email OTP expiration**: set to 3600 seconds (1 hour). Invite, reset and sign-up links expire after this.
- **Sessions**: keep refresh-token rotation on. Access tokens expire after 1 hour and renew silently.
- **Rate limits**: keep the defaults for sign-in, sign-up and email sends. Adjust only with a reason.
- **Secure password change**: enable it if available, so changing a password requires recent sign-in.
- **Multi-factor**: not enabled yet. Plan to require it for admin accounts when the admin dashboard is built.

Application-level protections already in place:

- Login, reset and sign-up responses never reveal whether an email has an account.
- Redirects after sign-in only go to paths on this site.
- Invite and reset links work once, through `/auth/confirm`. A password can only be set in the browser that verified the link (a 15-minute cookie).
- Changing or resetting a password signs out all other devices.
- Server actions are protected against cross-site form posts by Next.js.
- Responses send `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and HSTS.
