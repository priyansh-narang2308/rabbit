import { ParallaxComponent } from "@/components/ui/parallax-scrolling";
import { BentoGrid } from "@/components/ui/bento-grid";

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <ParallaxComponent />
      <BentoGrid />
    </main>
  );
}
