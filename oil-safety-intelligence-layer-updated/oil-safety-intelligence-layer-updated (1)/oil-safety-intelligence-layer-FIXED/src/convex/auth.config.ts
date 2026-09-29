import type { AuthConfig } from "convex/server";

/**
 * Local-first Convex Auth configuration.
 *
 * The source project previously included a Freebuff federated JWT provider
 * controlled by VLY_CONVEX_AUTH_ISSUER. That provider is not required by the
 * local OIL Safety Intelligence Layer UI and made a fresh local deployment
 * fail before the generated Convex API could be created.
 *
 * The app uses Convex's own auth tokens for Email OTP and Anonymous sign-in.
 * The issuer is the local Convex site URL supplied by the deployment.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
