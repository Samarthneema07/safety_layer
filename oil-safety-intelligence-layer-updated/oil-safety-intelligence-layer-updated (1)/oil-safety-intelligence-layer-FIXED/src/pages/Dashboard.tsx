import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  Upload,
  Map,
  GitBranch,
  Database,
  Grid3X3,
  LogOut,
  Crosshair,
  FlaskConical,
  History,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { OIL_ASSETS, type TabId } from "@/components/hud/hud";
import ExecutiveTab from "@/components/hud/tabs/ExecutiveTab";
import AssessPortalTab from "@/components/hud/tabs/AssessPortalTab";
import HeatmapTab from "@/components/hud/tabs/HeatmapTab";
import BarrierEngineTab from "@/components/hud/tabs/BarrierEngineTab";
import DatasetBrowserTab from "@/components/hud/tabs/DatasetBrowserTab";
import GapMatrixTab from "@/components/hud/tabs/GapMatrixTab";
import EvalTab from "@/components/hud/tabs/EvalTab";
import ReplayTab from "@/components/hud/tabs/ReplayTab";

const TABS = [
  { id: "exec", label: "EXECUTIVE OVERVIEW", icon: LayoutDashboard },
  { id: "assess", label: "SUPERVISOR LIVE UPLOAD & ASSESS", icon: Upload },
  { id: "heatmap", label: "LOCATION RISK HEATMAP", icon: Map },
  { id: "barrier", label: "FAILING BARRIER & ROOT CAUSE", icon: GitBranch },
  { id: "dataset", label: "PERMANENT INDIAN HSSE DATASET", icon: Database },
  { id: "gap", label: "GAP ANALYSIS RESOLUTION", icon: Grid3X3 },
  { id: "eval", label: "ENGINE EVALUATION", icon: FlaskConical },
  { id: "replay", label: "HISTORICAL INCIDENT REPLAY", icon: History },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("exec");
  const [activeAsset, setActiveAsset] = useState<string>("Duliajan");
  const [now, setNow] = useState(() => new Date());
  const status = useQuery(api.safety.getEngineStatus);
  const seedKb = useMutation(api.safety.seedKb);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    seedKb().catch(() => undefined);
  }, [seedKb]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const ist = new Date(now.getTime() + 5.5 * 3600_000);

  return (
    <div className="hud hud-grid-bg hud-scanline hud-vignette relative min-h-screen text-[#1E293B]">
      {/* ============ TOP HUD STRIP ============ */}
      <header className="sticky top-0 z-40 border-b border-[#2563EB]/15 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="glow-pulse flex size-10 items-center justify-center rounded-lg border border-[#2563EB]/40 bg-white">
              <img src={logo} alt="OIL" className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-[13px] font-black tracking-[0.18em] text-foreground">
                SAFETY INTELLIGENCE LAYER <span className="text-[#2563EB] text-glow-cyan">// OIL INDIA LIMITED</span>
              </h1>
              <p className="font-data text-[9px] tracking-[0.28em] text-[#64748B]">
                AI SAFETY INTELLIGENCE OFFICER · SIF TRIAGE NODE
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-2 rounded border border-[#16A34A]/30 bg-[#16A34A]/5 px-2.5 py-1">
              <span className="hud-blink size-1.5 rounded-full bg-[#16A34A]" />
              <span className="font-data text-[9px] tracking-[0.2em] text-[#16A34A]">
                {status?.status ?? "SYNC"} · {status?.triage_mode ?? "REAL-TIME"}
              </span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Crosshair className="size-3.5 text-[#2563EB]" />
              <select
                value={activeAsset}
                onChange={(e) => setActiveAsset(e.target.value)}
                className="font-data rounded border border-[#2563EB]/25 bg-white px-2 py-1 text-[10px] tracking-wider text-[#2563EB] outline-none"
              >
                {OIL_ASSETS.map((a) => (
                  <option key={a} value={a} className="bg-[#FFFFFF]">
                    {a.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="font-data text-right text-[10px] leading-tight">
              <p className="tracking-[0.18em] text-foreground/85">
                UTC {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())}
              </p>
              <p className="tracking-[0.18em] text-[#D97706]">
                IST {pad(ist.getUTCHours())}:{pad(ist.getUTCMinutes())}:{pad(ist.getUTCSeconds())}
              </p>
            </div>
            <div className="hidden font-data text-[9px] tracking-[0.15em] text-[#64748B] lg:block">
              {user?.email ?? "OPERATOR"}
            </div>
            <button
              onClick={handleSignOut}
              className="font-data flex items-center gap-1.5 rounded border border-[#DC2626]/30 px-2.5 py-1.5 text-[9px] tracking-[0.18em] text-[#DC2626] transition hover:bg-[#DC2626]/10"
            >
              <LogOut className="size-3" /> EXIT
            </button>
          </div>
        </div>

        {/* ============ NAV TABS ============ */}
        <nav className="hud-scroll mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 pb-1.5">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-t-md border-x border-t px-3.5 py-2 font-head text-[11px] font-bold tracking-[0.14em] whitespace-nowrap transition ${
                  active
                    ? "glass-cyan border-[#2563EB]/50 bg-[#2563EB]/10 text-[#2563EB] text-glow-cyan"
                    : "border-transparent text-[#64748B] hover:border-[#2563EB]/20 hover:text-[#475569]"
                }`}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ============ TAB CONTENT ============ */}
      <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-6">
        {tab === "exec" && <ExecutiveTab onNavigate={setTab} activeAsset={activeAsset} />}
        {tab === "assess" && <AssessPortalTab />}
        {tab === "heatmap" && <HeatmapTab />}
        {tab === "barrier" && <BarrierEngineTab />}
        {tab === "dataset" && <DatasetBrowserTab />}
        {tab === "gap" && <GapMatrixTab />}
        {tab === "eval" && <EvalTab />}
        {tab === "replay" && <ReplayTab />}
      </main>

      <footer className="relative z-10 border-t border-[#2563EB]/10 py-3 text-center">
        <p className="font-data text-[9px] tracking-[0.3em] text-[#64748B]">
          {status?.engine ?? "OIL-SIF TRIAGE ENGINE"} · {status?.engine_summary ?? "Deterministic rule engine"} · KB{" "}
          {status?.knowledge_base.incidents ?? 0} CASES · IOGP LSR EDITION 2020
        </p>
      </footer>
    </div>
  );
}
