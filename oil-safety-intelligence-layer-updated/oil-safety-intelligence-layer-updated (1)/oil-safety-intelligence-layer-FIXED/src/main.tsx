import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Resolve the Convex backend URL. On the Freebuff platform this is injected via
 * VITE_CONVEX_URL. When running the source zip locally (no .env), fall back to
 * the standard local Convex dev port so `npx convex dev` works out of the box.
 */
const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://127.0.0.1:3210" : undefined);

/** Full-screen setup guide shown when the app is missing its Convex URL. */
function SetupRequired() {
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6"
      style={{ fontFamily: "IBM Plex Mono, monospace" }}
    >
      <div className="max-w-xl w-full border border-slate-200 rounded-lg bg-white shadow-sm p-8">
        <p className="text-amber-600 text-xs tracking-[0.3em] mb-3">
          SETUP REQUIRED
        </p>
        <h1 className="text-2xl font-bold mb-4 text-slate-900" style={{ fontFamily: "Orbitron, sans-serif" }}>
          Convex backend not connected
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          This app talks to a Convex backend, but no URL was configured. Run
          these commands from the project root:
        </p>
        <pre className="bg-slate-100 border border-slate-200 rounded p-4 text-xs leading-6 text-blue-700 overflow-x-auto mb-6">
{`# 1. install dependencies
bun install        # or: npm install

# 2. start Convex once (creates your local deployment + generates types)
npx convex dev

# 3. stop Convex, configure local Auth keys, then restart Convex
npm run setup:auth
npx convex dev

# 4. in a second terminal, start the web app
bun run dev        # or: npm run dev`}
        </pre>
        <p className="text-xs text-slate-500">
          Then reload this page. The auth system also needs env vars on the
          Convex deployment — <code className="text-blue-700">npx convex dev</code>{" "}
          sets them up automatically on first run.
        </p>
      </div>
    </div>
  );
}

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      {convex ? (
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/dashboard" />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      ) : (
        <SetupRequired />
      )}
    </RootErrorBoundary>
  </StrictMode>,
);
