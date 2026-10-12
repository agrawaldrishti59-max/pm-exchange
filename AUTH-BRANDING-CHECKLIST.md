# PM Exchange — authentication branding checklist

These steps are **provider dashboard settings**, not values to commit to GitHub.

## Preview authentication (required before preview test)
- In Supabase Dashboard > Authentication > URL Configuration > Redirect URLs, add the **exact Vercel preview** callback URL, e.g. `https://YOUR-PREVIEW-URL.vercel.app/auth/callback`. Keep the production callback allowlisted as well.
- The application OAuth and magic-link endpoints now derive the callback from the current request host, so a preview login can return to preview and production continues to return to production.
- Verify the exact preview URL is in the allowlist before testing; Supabase may otherwise fall back to the production Site URL.
- After redeploying the branch, re-open the latest preview deployment and log in. Check the address bar remains on the preview hostname after signing in.

## Google sign-in (OAuth consent)
1. In Google Cloud Console, select the OAuth project used by Supabase.
2. Under Google Auth Platform > Branding, set application name to **PM Exchange**, add a verified support email, logo where appropriate, and your authorized domain.
3. Verify the branded app information on the Google consent screen with a test account.
4. If the consent screen still displays a `*.supabase.co` domain, Google is showing Supabase's authorization/redirect domain. A branded application name alone does not change that URL. Investigate Supabase **custom domains** for the auth endpoint (availability/plan requirements apply), and update Google Cloud authorized redirect URIs and any related allowlists, then retest.
5. Do **not** replace a live redirect URI until the new callback is actually functioning. Verify both new-user and returning-user sign-in.

## Magic-link emails
1. Choose a transactional email provider supporting SMTP (e.g. Resend, Postmark, or another provider).
2. Verify a domain you control in the provider (DNS SPF/DKIM as instructed by that provider).
3. In Supabase Dashboard > Authentication > SMTP Settings, configure a custom SMTP provider and set sender name to **PM Exchange** and a verified sender email address.
4. Under Authentication > Email Templates, brand the magic-link email with a PM Exchange subject, explanation, and a working `{{ .ConfirmationURL }}` link.
5. Test delivery, spam placement, expiry, and callback in a private browser window. Keep SMTP passwords and API keys in provider dashboards, never the repository.

## Booking details verification
- Booking UI currently labels sessions **45 minutes**, matching the existing minimum 45-minute slot spacing; confirm that the intended session duration is actually 45 minutes as a product policy.
- Meet links are currently attempted using `GOOGLE_SCRIPT_URL` after the host accepts. If no link is returned, the app should not claim a link was guaranteed.
- Verify an interviewer can accept a request and the candidate can access meeting coordination details in Sessions.

## Manual acceptance tests
- Mobile: the availability filter is visible without sideways scrolling.
- Tab/Enter/Space: available slot controls can be focused and selected; focus is visible.
- No slots: there is no dead request form; Explore navigation works.
- Booking: candidate sees type, duration, timezone and joining process before requesting.
- Copy: interviewer-facing labels say **Conduct interviews**, candidate-facing labels say **Book**.
