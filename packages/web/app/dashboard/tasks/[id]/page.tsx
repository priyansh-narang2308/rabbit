import React from "react";
import { fetchTaskById, fetchRunById, fetchReplay } from "@/lib/api";
import { ReplayViewer } from "@/components/tasks/replay-viewer";
import { AuditTimeline } from "@/components/tasks/audit-timeline";
import { Globe, Shield, Terminal, Clock, Server } from "lucide-react";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  let task: any = null;
  let run: any = null;
  let replayEvents: any[] = [];
  
  try {
    task = await fetchTaskById(params.id);
    
    // If there is a run, get its details and replay
    if (task && task.runs && task.runs.length > 0) {
      const latestRunId = task.runs[0].id; // The most recent run
      run = await fetchRunById(latestRunId);
      
      try {
        const replayRes = await fetchReplay(latestRunId);
        if (replayRes && replayRes.data) {
          replayEvents = replayRes.data;
        }
      } catch (err) {
        console.warn("No replay found for run", latestRunId);
      }
    }
  } catch (error) {
    console.error("Failed to load task details:", error);
    return <div className="text-red-500">Error loading task details.</div>;
  }

  if (!task) {
    return <div className="text-gray-400">Task not found.</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Task Details</h1>
            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${
              task.status === 'completed' ? 'border-green-500/50 bg-green-500/10 text-green-400' :
              task.status === 'failed' ? 'border-red-500/50 bg-red-500/10 text-red-400' :
              task.status === 'running' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' :
              'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
            }`}>
              {task.status}
            </span>
          </div>
          <p className="text-gray-300 text-lg max-w-3xl">{task.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1">
          <span className="text-xs text-gray-500 flex items-center gap-1 uppercase font-bold"><Globe className="w-3 h-3"/> Proxy Target</span>
          <span className="text-white font-medium uppercase">{task.proxyCountry}</span>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1">
          <span className="text-xs text-gray-500 flex items-center gap-1 uppercase font-bold"><Shield className="w-3 h-3"/> Stealth</span>
          <span className="text-white font-medium">{task.stealthEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1">
          <span className="text-xs text-gray-500 flex items-center gap-1 uppercase font-bold"><Clock className="w-3 h-3"/> Submitted</span>
          <span className="text-white font-medium text-sm">{new Date(task.createdAt).toLocaleString()}</span>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1">
          <span className="text-xs text-gray-500 flex items-center gap-1 uppercase font-bold"><Server className="w-3 h-3"/> Identity</span>
          <span className="text-purple-400 font-mono text-sm">{task.profileId ? task.profileId.substring(0,8) : 'Ephemeral'}</span>
        </div>
      </div>

      {run && (
        <div className="space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="w-6 h-6 text-purple-400" />
              Latest Run Execution
            </h2>
            <div className="flex gap-4 text-sm text-gray-400 mt-2 font-mono">
              <span>Run ID: {run.id}</span>
              <span>•</span>
              <span>Steps: {run.totalSteps}</span>
              <span>•</span>
              <span>Duration: {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'Ongoing'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-300">Execution Replay</h3>
              <p className="text-sm text-gray-500">High-fidelity DOM replay of the browser session.</p>
              <ReplayViewer events={replayEvents} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-300">Audit Timeline</h3>
              <p className="text-sm text-gray-500">Atomic step-by-step history of agent actions.</p>
              <div className="bg-black/50 border border-white/10 rounded-xl p-6 overflow-y-auto max-h-150 shadow-inner">
                <AuditTimeline entries={run.auditEntries || []} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
