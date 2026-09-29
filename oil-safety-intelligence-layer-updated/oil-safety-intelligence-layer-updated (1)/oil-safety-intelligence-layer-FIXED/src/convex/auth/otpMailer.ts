/**
 * OTP e-mail delivery (no framework imports, so it is easy to unit-test).
 *
 * Convex functions cannot open raw SMTP sockets, so mail is sent through an
 * HTTPS e-mail API. Pick ONE provider by setting its env vars on the Convex
 * deployment (`npx convex env set NAME value`):
 *
 *   Brevo   (works with just a verified sender address, no domain needed)
 *     BREVO_API_KEY, EMAIL_FROM            e.g. yourname@gmail.com (verified in Brevo)
 *
 *   Resend  (needs a verified domain to mail arbitrary recipients)
 *     RESEND_API_KEY, EMAIL_FROM           e.g. "OIL Safety <no-reply@yourdomain.com>"
 *
 *   Custom relay (the original setup)
 *     EMAIL_OTP_URL, EMAIL_OTP_API_KEY
 *
 * Optional: EMAIL_FROM_NAME (display name), VLY_APP_NAME (used in subject/body).
 *
 * If nothing is configured, sign-in FAILS with a clear message instead of
 * silently printing the code in the terminal. For local-only testing you can
 * opt back in to terminal printing with EMAIL_OTP_DEV_FALLBACK=true.
 */

export type MailerEnv = Record<string, string | undefined>;

const APP_DEFAULT = "OIL Safety Intelligence Layer";

function parseFrom(env: MailerEnv): { email: string; name: string } | null {
  const raw = env.EMAIL_FROM?.trim();
  if (!raw) return null;
  // Accept both `me@x.com` and `Name <me@x.com>`
  const m = raw.match(/^(.*)<([^>]+)>\s*$/);
  const email = (m ? m[2] : raw).trim();
  const name = (m ? m[1].replace(/["']/g, "").trim() : "") || env.EMAIL_FROM_NAME?.trim() || env.VLY_APP_NAME || APP_DEFAULT;
  return { email, name };
}

export function buildOtpMessage(token: string, appName: string) {
  const subject = `${token} is your ${appName} sign-in code`;
  const text = `Your ${appName} verification code is ${token}.\n\nIt expires in 15 minutes. If you did not request it, you can ignore this email.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;color:#0f172a">
  <h2 style="margin:0 0 8px;font-size:18px">${appName}</h2>
  <p style="margin:0 0 16px;color:#475569;font-size:14px">Use this code to sign in:</p>
  <p style="margin:0 0 16px;font-size:32px;letter-spacing:8px;font-weight:700;color:#2563eb">${token}</p>
  <p style="margin:0;color:#64748b;font-size:12px">This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.</p>
</div>`;
  return { subject, text, html };
}

async function assertOk(res: Response, provider: string) {
  if (res.ok) return;
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  throw new Error(`${provider} rejected the request (HTTP ${res.status}). ${detail}`.trim());
}

export async function sendOtpEmail(
  to: string,
  token: string,
  env: MailerEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<{ provider: string }> {
  const appName = env.VLY_APP_NAME || APP_DEFAULT;
  const { subject, text, html } = buildOtpMessage(token, appName);
  const from = parseFrom(env);

  // ── Brevo ────────────────────────────────────────────────────────────
  if (env.BREVO_API_KEY) {
    if (!from) throw new Error("EMAIL_FROM is not set (must be a sender address verified in Brevo).");
    const res = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    await assertOk(res, "Brevo");
    return { provider: "brevo" };
  }

  // ── Resend ───────────────────────────────────────────────────────────
  if (env.RESEND_API_KEY) {
    const sender = from ? `${from.name} <${from.email}>` : "OIL Safety <onboarding@resend.dev>";
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: sender, to: [to], subject, html, text }),
    });
    await assertOk(res, "Resend");
    return { provider: "resend" };
  }

  // ── Original custom relay ────────────────────────────────────────────
  if (env.EMAIL_OTP_URL && env.EMAIL_OTP_API_KEY) {
    const res = await fetchImpl(env.EMAIL_OTP_URL, {
      method: "POST",
      headers: { "x-api-key": env.EMAIL_OTP_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ to, otp: token, appName }),
    });
    await assertOk(res, "Email relay");
    return { provider: "relay" };
  }

  // ── Nothing configured ───────────────────────────────────────────────
  if (env.EMAIL_OTP_DEV_FALLBACK === "true") {
    console.log(`[LOCAL AUTH – dev fallback] OTP for ${to}: ${token}`);
    return { provider: "console" };
  }
  throw new Error(
    "Email delivery is not configured. Set BREVO_API_KEY + EMAIL_FROM (or RESEND_API_KEY) on the Convex deployment.",
  );
}
