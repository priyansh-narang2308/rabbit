import React from "react";
import { CheckCircle2, Clock, XCircle, PlayCircle, Loader2 } from "lucide-react";

export function AuditTimeline({ entries }: { entries: any[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-gray-500 py-8 text-center bg-white/5 border border-white/10 rounded-xl">
        No audit entries recorded for this run.
      </div>
    );
  }

  const getIcon = (type: string, success: boolean | null) => {
    if (success === false || type === "error") return <XCircle className="w-5 h-5 text-red-500 bg-black rounded-full" />;
    if (type === "done") return <CheckCircle2 className="w-5 h-5 text-green-500 bg-black rounded-full" />;
    return <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-4 border-black" />;
  };

  return (
    <div className="relative border-l border-white/20 ml-4 space-y-8 py-4">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="relative pl-8">
          {/* Timeline Node */}
          <div className="absolute -left-2.5 top-0">
            {getIcon(entry.actionType, entry.success)}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 transition-colors hover:bg-white/10 group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-purple-400 font-mono text-sm uppercase mr-2 tracking-wide font-bold">
                  [{entry.actionType}]
                </span>
                <span className="text-gray-300 font-medium">
                  {entry.target || "N/A"}
                </span>
              </div>
              <span className="text-gray-500 text-xs font-mono">
                {new Date(entry.timestamp).toLocaleTimeString()} 
                {entry.durationMs ? ` (${entry.durationMs}ms)` : ""}
              </span>
            </div>
            
            {entry.value && (
              <div className="text-sm text-gray-400 mt-2 bg-black/50 p-2 rounded border border-white/5">
                <span className="text-gray-500 mr-2">Value:</span> {entry.value}
              </div>
            )}
            
            {entry.reasoning && (
              <div className="text-sm text-purple-300/80 italic mt-2">
                " {entry.reasoning} "
              </div>
            )}

            {entry.screenshotPath && (
              <div className="mt-4 pt-4 border-t border-white/10 hidden group-hover:block transition-all">
                <div className="text-xs text-gray-500 mb-2">Screenshot Evidence</div>
                {/* We would render an image here. Since it's a local file path, it would need to be served statically */}
                <div className="w-full h-32 bg-white/5 border border-white/10 rounded flex items-center justify-center text-gray-500">
                  {entry.screenshotPath}
                </div>
              </div>
            )}
            
            {entry.errorMessage && (
              <div className="text-sm text-red-400 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">
                {entry.errorMessage}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
