"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { KeyRound, Bot, Palette, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function apiConfig() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("solari_api_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("solari_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("solari_api_key");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">API Configuration</h2>
          <p className="text-sm text-gray-400">
            Solari API key used for authenticated requests.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key" className="text-gray-200">
            Solari API Key
          </Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-solari-..."
            className="bg-white/5 border-white/10 text-white"
          />
          <p className="text-xs text-gray-500">
            Stored locally in your browser. Never committed to source.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saved ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Saved
              </>
            ) : (
              "Save API Key"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function agentDefaults({ setDirty }: { setDirty: (v: boolean) => void }) {
  const [proxy, setProxy] = useState("US-East");
  const [stealth, setStealth] = useState(true);
  const [recording, setRecording] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(
      "solari_agent_defaults",
      JSON.stringify({ proxy, stealth, recording })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Agent Defaults</h2>
          <p className="text-sm text-gray-400">
            Default behavior applied to new agents and tasks.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="proxy" className="text-gray-200">
            Default Proxy Location
          </Label>
          <select
            id="proxy"
            value={proxy}
            onChange={(e) => {
              setProxy(e.target.value);
              setDirty(true);
            }}
            className="h-8 w-full rounded-lg border border-input bg-white/5 px-2.5 py-1 text-sm text-white focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {["US-East", "US-West", "EU-Central", "Asia-Pacific"].map((loc) => (
              <option key={loc} value={loc} className="bg-[#0a0a0a]">
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-200">Stealth Mode</Label>
            <p className="text-xs text-gray-500">
              Enable anti-detection &amp; fingerprint randomization.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={stealth}
            onClick={() => {
              setStealth((v) => !v);
              setDirty(true);
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              stealth ? "bg-purple-600" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                stealth ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-200">Record Sessions</Label>
            <p className="text-xs text-gray-500">
              Capture video replays of agent sessions.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={recording}
            onClick={() => {
              setRecording((v) => !v);
              setDirty(true);
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              recording ? "bg-purple-600" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                recording ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saved ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Saved
              </>
            ) : (
              "Save Defaults"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function themeSection() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Palette className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">System</h2>
          <p className="text-sm text-gray-400">
            Appearance and display preferences.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-200">Theme</Label>
          <div className="flex gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                  theme === opt.value
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {theme === "dark" ? "Dark mode active." : "Light mode active."}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [, setDirty] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-gray-400">
          Configure your Solari API, agent defaults, and system preferences.
        </p>
      </div>

      {apiConfig()}
      {agentDefaults({ setDirty })}
      {themeSection()}
    </div>
  );
}
