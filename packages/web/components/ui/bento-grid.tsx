import React from "react";
import {
  Terminal,
  ShieldCheck,
  Activity,
  Eye,
  Workflow,
  Cpu,
  Globe,
} from "lucide-react";

const features = [
  {
    title: "Visual DOM Extraction",
    description:
      "Rabbit doesn't just parse HTML. It natively renders the DOM, executes JS, and extracts spatial coordinates for human-like visual reasoning.",
    icon: <Eye className="w-6 h-6 text-purple-400" />,
    className:
      "md:col-span-2 md:row-span-2 bg-gradient-to-br from-purple-900/20 to-black",
    visual: (
      <div className="absolute right-0 bottom-0 w-[80%] h-[70%] bg-black/50 border-t border-l border-white/10 rounded-tl-xl p-4 overflow-hidden backdrop-blur-sm">
        <div className="flex gap-1.5 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        <div className="space-y-2 opacity-70 font-mono text-xs text-green-400">
          <p>{`> target: button#submit-order`}</p>
          <p>{`> resolving spatial coordinates...`}</p>
          <p>{`> { x: 420, y: 128, visible: true }`}</p>
          <p className="animate-pulse">{`> executing click()...`}</p>
        </div>
      </div>
    ),
  },
  {
    title: "Zero-Trust Sandboxing",
    description:
      "Every browser session runs in an ephemeral, isolated container. Perfect security with no lingering state.",
    icon: <ShieldCheck className="w-6 h-6 text-blue-400" />,
    className: "bg-gradient-to-br from-blue-900/20 to-black",
  },
  {
    title: "Real-Time SSE",
    description:
      "Stream logs, network events, and DOM mutations live to your dashboard as the agent executes.",
    icon: <Activity className="w-6 h-6 text-green-400" />,
    className: "bg-gradient-to-br from-green-900/20 to-black",
  },
  {
    title: "Autonomous Recovery",
    description:
      "When selectors fail, Rabbit self-corrects using AI vision to find the intended elements.",
    icon: <Cpu className="w-6 h-6 text-orange-400" />,
    className: "md:col-span-2 bg-gradient-to-br from-orange-900/20 to-black",
  },
];

export function BentoGrid() {
  return (
    <section className="w-full bg-black py-24 px-6 relative z-40">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 font-(family-name:--font-caveat) tracking-wide">
            Built for Agents.
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl">
            A bulletproof infrastructure layer designed specifically for
            running, monitoring, and scaling autonomous browser agents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-62.5">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`relative rounded-3xl border border-white/10 p-8 overflow-hidden group hover:border-white/20 transition-colors ${feature.className}`}
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-[80%]">
                  {feature.description}
                </p>
              </div>

              {feature.visual}

              <div className="absolute inset-0 bg-linear-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
