"use client";

import React, { useEffect, useRef } from "react";
// @ts-ignore - rrweb-player types can be finicky
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";

export function ReplayViewer({ events }: { events: any[] }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current || events.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = new rrwebPlayer({
        target: playerRef.current,
        props: {
          events,
          width: playerRef.current.clientWidth,
          height: 600,
          autoPlay: false,
        },
      });
    }

    return () => {};
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="w-full h-150 bg-black border border-white/10 rounded-xl flex items-center justify-center text-gray-500">
        No replay data available for this run.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <div ref={playerRef} className="w-full" />
    </div>
  );
}
