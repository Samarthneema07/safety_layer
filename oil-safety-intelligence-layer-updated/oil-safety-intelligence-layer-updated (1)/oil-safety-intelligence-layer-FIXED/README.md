## Overview

# OIL Safety Intelligence Layer 🛢️🛡️

AI Safety Intelligence Engine + Futuristic HUD Command Center for **Oil India Limited** — multilingual safety-report triage (Assamese / Hindi / Bengali / English), SIF-Potential classification, IOGP Life-Saving Rules mapping (Edition 2020), failing-barrier root cause analysis, and a permanent Indian O&G incident knowledge base.

## Quick Start (from the source zip)

**Prerequisites:** Node.js **20.19+ or 22.12+** (Vite 7 requirement) — check with `node -v`.

```bash
unzip oil-safety-intelligence-layer.zip -d oil-safety && cd oil-safety
bun install          # or: npm install

# Terminal 1 — create the local Convex deployment + generated API
npx convex dev
# Stop it with Ctrl+C after the deployment is created.

# Configure local Convex Auth signing keys
npm run setup:auth

# Terminal 1 — start Convex again and leave it running
npx convex dev

# Terminal 2 — start the web app
bun run dev          # or: npm run dev
```

Open http://localhost:5173. Sign in works best with **"Continue as Guest"**
(no email setup needed).

## Optional: enable real NLP categorization (LLM)

By default the SIF engine runs entirely on a deterministic keyword/pattern
system — no external AI model is called, and the UI says so honestly
(`RULE-BASED` in the engine status strip and on every report). To have
Claude actually *read and understand* each narrative — semantics,
negation, mixed-language context — and produce the SIF label, IOGP
Life-Saving Rule mapping, failing-barrier analysis, root cause and
recommendations from that comprehension (rather than from substring
matches), set an API key on your **Convex** deployment (not `.env.local`
— this must stay server-side):

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-...
# optional — defaults to claude-3-5-haiku-20241022
npx convex env set ANTHROPIC_MODEL claude-3-5-haiku-20241022
```

Restart `npx convex dev`. The status strip will switch to `LLM-AUGMENTED`,
and every report's metadata will show which mode produced it
(`analysis_mode` + a plain-language `ai_disclosure` string). The model is
only ever allowed to choose IOGP rules, barriers, and knowledge-base
incidents from this plant's fixed lists — it can never invent a category
outside them. The deterministic rule engine still runs on every report
too, both as the baseline used whenever no key is configured and as a
same-report cross-check; if the key is missing, invalid, the call fails,
or the model's response doesn't validate against the fixed vocabulary,
that specific field (or the whole report) silently falls back to the rule
engine's answer — an LLM outage can never block or degrade report
submission.

## Troubleshooting: "page fails to load"

| Symptom | Cause & fix |
|---|---|
| `Failed to resolve import "@/components/hud/tabs/..."` | Your extracted copy is a **stale zip** missing the HUD tab files. Re-download the latest `oil-safety-intelligence-layer.zip` and re-extract into a **clean folder**. |
| "Convex backend not connected" screen | Convex isn't running or the URL is missing. Start `npx convex dev` first, copy the URL it prints into `.env.local` as `VITE_CONVEX_URL`, then reload. In dev mode the app also falls back to `http://127.0.0.1:3210` automatically. |
| Blank page after sign-in | Run `npx convex dev` once so it generates `src/convex/_generated/` and pushes the functions, then restart `bun run dev`. |
| Sign-in says `Missing environment variable 'JWT_PRIVATE_KEY'` | Stop Convex, run `npm run setup:auth`, then restart `npx convex dev`. This generates a local RSA key pair and sets `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` on the Convex deployment. |
| Email sign-in does not send a code | Set `BREVO_API_KEY` + `EMAIL_FROM` (or `RESEND_API_KEY`) with `npx convex env set`. Check the Convex terminal for `OTP email delivery failed:` to see the provider's reason. Also check the spam folder. |
| `error:0308010C digital envelope routines` or engine errors | Your Node is too old for Vite 7 — upgrade to Node 20.19+ / 22.12+. |

> Important: always extract into an empty/new directory. Extracting over an
> older copy leaves stale files behind and causes resolve/import errors.

---

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project uses `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` in `.env.local` for the local client.

Convex Auth keeps its signing secrets on the Convex deployment, not in the Vite client environment. Run `npm run setup:auth` after the first `npx convex dev` to generate and configure:

- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL=http://localhost:5173`

The generated private key is deployment-specific and is never written into the source tree.

Email OTP codes are delivered by e-mail to the address entered on the sign-in page. Configure `BREVO_API_KEY` + `EMAIL_FROM` (or `RESEND_API_KEY` + `EMAIL_FROM`, or `EMAIL_OTP_URL` + `EMAIL_OTP_API_KEY`) on the Convex deployment. See `src/convex/auth/otpMailer.ts`.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The auth files are configured for local-first development. `src/convex/auth.config.ts` uses Convex's own local issuer, while `src/convex/auth.ts` keeps the Email OTP and Anonymous providers.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`, which sends
signed-out users to `/auth?returnTo=<current route>`. Extend that page for the
product's authenticated experience, and reuse `RequireAuth` when adding another
protected route.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
