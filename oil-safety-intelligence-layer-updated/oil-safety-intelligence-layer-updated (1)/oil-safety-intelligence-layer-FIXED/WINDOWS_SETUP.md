# OIL Safety Intelligence Layer — Windows local setup

This copy is patched for a fresh local Convex deployment.

## 1. Install dependencies

Open PowerShell in the project root:

```powershell
npm install
```

## 2. Create the local Convex deployment

Run:

```powershell
npx convex dev
```

On the first run Convex creates `.env.local` and the local deployment. Once that has completed, press `Ctrl+C`.

## 3. Configure Convex Auth

Run:

```powershell
npm run setup:auth
```

This generates a fresh RSA key pair locally and stores `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` on the current Convex deployment.

The private key is not written to the project and `.env.local` is ignored by git.

## 4. Start Convex

```powershell
npx convex dev
```

Leave this terminal running.

## 5. Start the React app

Open a second PowerShell window:

```powershell
cd "D:\oil-safety-intelligence-layer (3)"
npm run dev
```

Open:

```text
http://localhost:5173
```

## 6. Authentication

### Guest login

Click **Continue as Guest**. It should now work.

### Email OTP

The six-digit code is **emailed to the address you type** on the sign-in page. Configure a mail provider once (Brevo shown; it only needs a verified sender address, no domain):

1. Create a free account at https://www.brevo.com, verify a sender address (e.g. your Gmail), and create an API key (SMTP & API -> API Keys).
2. In the project folder run:

```bash
npx convex env set BREVO_API_KEY "xkeysib-..."
npx convex env set EMAIL_FROM "OIL Safety <your-verified-sender@gmail.com>"
```

Alternatives: `RESEND_API_KEY` + `EMAIL_FROM` (needs a verified domain), or the original `EMAIL_OTP_URL` + `EMAIL_OTP_API_KEY`.

If no provider is configured, sign-in shows an error instead of printing the code. For offline testing only, you can re-enable terminal printing with `npx convex env set EMAIL_OTP_DEV_FALLBACK true`.

## Important

Do not run:

```powershell
npm audit fix --force
```

while troubleshooting this project. It can upgrade packages across breaking versions.

Do not commit `.env.local`, `JWT_PRIVATE_KEY`, or `JWKS`.
