import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { sendOtpEmail } from "./otpMailer";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 6);
  },

  async sendVerificationRequest({ identifier: email, token }) {
    // Delivers the code to the address the user typed. Provider is chosen by
    // env vars — see ./otpMailer.ts for the full list.
    try {
      await sendOtpEmail(email, token, process.env);
    } catch (error) {
      console.error("OTP email delivery failed:", error instanceof Error ? error.message : error);
      throw new Error(
        `Email delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
