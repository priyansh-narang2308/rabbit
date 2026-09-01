import React from "react";
import { Terminal, Activity, Eye, Play } from "lucide-react";
import { fetchStatus } from "@/lib/api";

export default async function DashboardOverview() {
  let statusData = {
    activeSessions: 0,
    completedRuns: 0,
    successRate: 0,
  };

  try {
    statusData = await fetchStatus();
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-gray-400">
          Monitor your autonomous agents and execution pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">
              Active Agents
            </span>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold">{statusData.activeSessions}</div>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">
              Completed Runs
            </span>
            <Terminal className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold">{statusData.completedRuns.toLocaleString()}</div>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 font-medium">
              Success Rate
            </span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold">{statusData.successRate}%</div>
        </div>
        <div className="p-6 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-purple-500/20 transition-colors">
          <Play className="w-6 h-6 text-purple-400 fill-purple-400" />
          <span className="font-semibold text-purple-300">New Agent Run</span>
        </div>
      </div>

      <div className="p-8 rounded-xl border border-white/10 bg-black/50 flex flex-col items-center justify-center min-h-100 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Live Streams</h3>
        <p className="text-gray-400 max-w-md">
          Go to Live Runs to watch an agent execute its task in real-time with
          visual DOM extraction.
        </p>
      </div>
    </div>
  );
}
