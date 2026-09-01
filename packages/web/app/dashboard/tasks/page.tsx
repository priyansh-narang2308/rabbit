"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchTasks } from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { TaskSubmitForm } from "@/components/tasks/submit-form";
import { useRouter } from "next/navigation";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskSubmit = () => {
    loadTasks();
    router.refresh();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <PlayCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Tasks</h1>
            <p className="text-gray-400">
              Manage and submit objectives for your agents.
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Target Proxy</th>
                <th className="px-6 py-4">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No tasks found. Submit a new task to get started.
                  </td>
                </tr>
              ) : (
                tasks.map((task: any) => (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="capitalize text-gray-300">
                          {task.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white max-w-md truncate">
                      {task.description}
                    </td>
                    <td className="px-6 py-4 text-gray-400 uppercase">
                      {task.proxyCountry || "ANY"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskSubmitForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleTaskSubmit}
      />
    </>
  );
}
