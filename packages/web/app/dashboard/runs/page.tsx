"use client";

import React, { useEffect, useState } from "react";
import { Activity, Terminal, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type RunEvent = {
  id: string;
  type: string; // 'start', 'step', 'complete', 'failed'
  message: string;
  timestamp: string;
  runId: string;
};

export default function LiveRunsPage() {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const evtSource = new EventSource(`${API_BASE_URL}/events`);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev]);
      } catch (e) {
        console.error("Failed to parse SSE event", e);
      }
    };

    evtSource.onopen = () => setConnected(true);
    evtSource.onerror = () => setConnected(false);

    return () => {
      evtSource.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Live Runs</h1>
        <p className="text-gray-400">
          Watch your autonomous agents execute tasks in real-time.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}
          ></div>
          <span className="font-medium text-gray-300">
            {connected ? "SSE Connected" : "SSE Disconnected"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-black overflow-hidden flex flex-col min-h-150">
          <div className="h-12 border-b border-white/10 bg-white/5 flex items-center px-4 font-mono text-sm text-gray-400">
            <Terminal className="w-4 h-4 mr-2" />
            Agent Console Output
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-sm">
            {events.length === 0 ? (
              <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                Waiting for new agent events...
              </div>
            ) : (
              events.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  className="flex gap-4 p-2 rounded hover:bg-white/5 transition-colors"
                >
                  <span className="text-gray-500 shrink-0 w-24">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`shrink-0 w-24 font-bold ${
                      evt.type === "start"
                        ? "text-blue-400"
                        : evt.type === "step"
                          ? "text-purple-400"
                          : evt.type === "complete"
                            ? "text-green-400"
                            : "text-red-400"
                    }`}
                  >
                    [{evt.type.toUpperCase()}]
                  </span>
                  <span className="text-gray-300 wrap-break-word flex-1">
                    {evt.message}
                  </span>
                  <span className="text-gray-600 shrink-0 text-xs mt-0.5">
                    Run: {evt.runId?.substring(0, 8)}...
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-bold mb-4">Active Task</h3>
            {events.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Run ID
                  </span>
                  <div className="text-sm font-mono text-purple-300 mt-1">
                    {events[0].runId}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Last Action
                  </span>
                  <div className="text-sm text-gray-200 mt-1 line-clamp-3">
                    {events[0].message}
                  </div>
                </div>
                <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  View Live VNC
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No active tasks currently executing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
