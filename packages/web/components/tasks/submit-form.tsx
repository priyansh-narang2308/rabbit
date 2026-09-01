"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Globe, Shield, User, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export function TaskSubmitForm({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState("");
  const [profileId, setProfileId] = useState("");
  const [proxyCountry, setProxyCountry] = useState("us");
  const [stealthEnabled, setStealthEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/profiles`)
        .then((res) => res.json())
        .then((data) => setProfiles(data))
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          profileId: profileId || undefined,
          proxyCountry,
          stealthEnabled,
        }),
      });

      if (res.ok) {
        setDescription("");
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">New Task</h2>
            <p className="text-sm text-gray-400">Deploy an autonomous agent.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Objective
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Find the cheapest flight from SFO to JFK next Friday on United Airlines."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Agent Identity
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
            >
              <option value="" className="bg-gray-900">
                Ephemeral (No persistent auth)
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-gray-900">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                Proxy Location
              </label>
              <select
                value={proxyCountry}
                onChange={(e) => setProxyCountry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
              >
                <option value="us" className="bg-gray-900">
                  United States
                </option>
                <option value="uk" className="bg-gray-900">
                  United Kingdom
                </option>
                <option value="eu" className="bg-gray-900">
                  Europe
                </option>
                <option value="any" className="bg-gray-900">
                  Random
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Stealth Mode
              </label>
              <div
                onClick={() => setStealthEnabled(!stealthEnabled)}
                className={`w-full cursor-pointer border rounded-xl p-3 flex justify-center items-center transition-colors ${
                  stealthEnabled
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                    : "bg-white/5 border-white/10 text-gray-400"
                }`}
              >
                {stealthEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-white/10 bg-white/5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !description}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isSubmitting ? "Deploying..." : "Deploy Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
