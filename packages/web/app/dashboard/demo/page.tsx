"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Globe,
  Loader2,
  Play,
  Boxes,
  Table as TableIcon,
  Download,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { API_BASE_URL, launchPricingResearchDemo } from "@/lib/api";

const SCENARIO = {
  subject: "cloud storage plans",
  competitors: [
    {
      name: "Dropbox",
      url: "https://www.dropbox.com/business",
      proxyCountry: "us",
    },
    {
      name: "Google Drive",
      url: "https://www.google.com/drive/pricing",
      proxyCountry: "gb",
    },
    {
      name: "Microsoft OneDrive",
      url: "https://www.microsoft.com/en-us/microsoft-365/onedrive/compare-onedrive-plans",
      proxyCountry: "jp",
    },
  ],
};

type StepEvent = {
  type?: string;
  stepIndex?: number;
  actionType?: string;
  target?: string;
  value?: string;
  url?: string;
  reasoning?: string;
  success?: boolean;
  environment?: string;
  phase?: number;
  objective?: string;
  result?: string;
  timestamp?: string;
};

export default function DemoPage() {
  const [launching, setLaunching] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    setSteps([]);
    setResult(null);
    setStatus("idle");
    try {
      const res = await launchPricingResearchDemo({
        subject: SCENARIO.subject,
        competitors: SCENARIO.competitors,
        stealthEnabled: true,
        captchaEnabled: true,
        recordingEnabled: true,
      });
      setTaskId(res.id);
      setStatus("queued");
    } catch (e: any) {
      setError(e.message || "Failed to launch demo");
    } finally {
      setLaunching(false);
    }
  };

  // Poll task status + stream SSE for live updates
  useEffect(() => {
    if (!taskId) return;

    const evtSource = new EventSource(`${API_BASE_URL}/events/${taskId}`);

    evtSource.addEventListener("step", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setSteps((prev) => [data, ...prev.slice(0, 49)]);
      } catch {}
    });

    const poll = setInterval(async () => {
      try {
        const t = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          cache: "no-store",
        }).then((r) => r.json());
        setStatus(t.status);
        if (t.status === "completed") {
          try {
            setResult(JSON.parse(t.result));
          } catch {
            setResult(t.result);
          }
          clearInterval(poll);
          evtSource.close();
        } else if (t.status === "failed") {
          setError(t.errorMessage || "Demo failed");
          clearInterval(poll);
          evtSource.close();
        }
      } catch {}
    }, 2500);

    return () => {
      clearInterval(poll);
      evtSource.close();
    };
  }, [taskId]);

  const comparisonTable = useCallback(() => {
    if (!result) return null;
    const raw =
      typeof result === "string"
        ? result
        : result.finalResult || result.result || "";
    if (!raw) return null;
    return extractTable(raw);
  }, [result]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-purple-400" />
            Demo Scenario
          </h1>
          <p className="text-gray-400">
            One-click competitor pricing research — 3 different geo-proxies,
            extraction, then sandbox processing into a comparison table.
          </p>
        </div>
        <button
          onClick={handleLaunch}
          disabled={launching || status === "running" || status === "queued"}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
        >
          {launching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Launching...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Launch Demo
            </>
          )}
        </button>
      </div>

      {/* Status banner */}
      {taskId && status !== "idle" && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between ${
            status === "completed"
              ? "border-green-500/50 bg-green-500/10 text-green-300"
              : status === "failed"
                ? "border-red-500/50 bg-red-500/10 text-red-300"
                : status === "running"
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                  : "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
          }`}
        >
          <span className="font-medium capitalize">
            {status === "running"
              ? `Running — ${steps[0]?.actionType || "working"}...`
              : `${status}`}
          </span>
          <span className="font-mono text-xs opacity-80">
            Task: {taskId.substring(0, 8)}...
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/10 text-red-300 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Scenario plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SCENARIO.competitors.map((comp, i) => (
          <div
            key={comp.name}
            className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{comp.name}</h3>
                  <span className="text-xs text-gray-500">
                    Phase {i + 1} · Browse
                  </span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase">
                {comp.proxyCountry}
              </span>
            </div>
            <p className="text-sm text-gray-400 truncate">{comp.url}</p>
          </div>
        ))}
      </div>

      {/* Processing step */}
      <div className="p-6 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Boxes className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">
            Sandbox Processing (Final Phase)
          </h3>
          <p className="text-sm text-gray-400">
            All scraped pricing data is fed into a Solari sandbox where the
            agent normalizes it and generates a structured comparison table.
          </p>
        </div>
      </div>

      {/* Live steps */}
      {steps.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
          <div className="h-12 border-b border-white/10 bg-white/5 flex items-center px-4 font-mono text-sm text-gray-400">
            <FlaskConical className="w-4 h-4 mr-2" />
            Live Agent Steps
          </div>
          <div className="p-4 space-y-2 font-mono text-sm max-h-80 overflow-y-auto">
            {steps.map((s, idx) => (
              <div
                key={`${s.timestamp}-${idx}`}
                className="flex gap-3 p-2 rounded hover:bg-white/5 transition-colors"
              >
                <span className="text-gray-500 shrink-0 w-16">
                  {s.timestamp
                    ? new Date(s.timestamp).toLocaleTimeString()
                    : ""}
                </span>
                <span
                  className={`shrink-0 font-bold uppercase ${
                    s.type === "phase_start"
                      ? "text-purple-400"
                      : s.type === "phase_complete"
                        ? "text-green-400"
                        : s.actionType === "error"
                          ? "text-red-400"
                          : "text-blue-400"
                  }`}
                >
                  {s.type === "phase_start"
                    ? `Phase ${s.environment}`
                    : s.type === "phase_complete"
                      ? "Complete"
                      : s.actionType}
                </span>
                <span className="text-gray-300 flex-1">
                  {s.objective || s.target || s.reasoning || s.value || ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table result */}
      {result && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Comparison Table</h2>
          </div>
          {comparisonTable()}
        </div>
      )}
    </div>
  );
}

function extractTable(rawValue: string): React.ReactNode {
  const markdownTable = findMarkdownTable(rawValue);
  if (markdownTable) {
    return <MarkdownTable content={markdownTable} />;
  }

  // Fallback: render raw result as preformatted text
  return (
    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 bg-black/40 rounded-lg p-4 max-h-96 overflow-y-auto">
      {rawValue}
    </pre>
  );
}

function findMarkdownTable(text: string): string | null {
  const lines = text.split("\n");
  const tableLines: string[] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      inTable = true;
      tableLines.push(line);
    } else if (inTable && trimmed === "") {
      break;
    } else if (inTable) {
      break;
    }
  }
  return tableLines.length >= 2 ? tableLines.join("\n") : null;
}

function MarkdownTable({ content }: { content: string }) {
  const rows = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"))
    .map((l) =>
      l
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim().replace(/\*\*/g, "")),
    )
    .filter(
      (r) =>
        !r.every((c) => /^[: -]*$/i.test(c) && c.includes("-") && c.length > 0),
    );

  if (rows.length === 0)
    return <p className="text-gray-500">No table found.</p>;

  const header = rows[0];
  const body = rows.slice(1);
  const colCount = header.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {header.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-gray-300 font-semibold uppercase tracking-wider text-xs"
              >
                {h || `Col ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-white/5 transition-colors">
              {Array.from({ length: colCount }).map((_, ci) => (
                <td key={ci} className="px-4 py-3 text-gray-300">
                  {row[ci] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            const blob = new Blob([content], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "pricing-comparison.md";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 cursor-pointer text-white text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" /> Download .md
        </button>
      </div>
    </div>
  );
}
