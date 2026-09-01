import Hero24 from "@/components/ui/hero-24";
import { BentoGrid } from "@/components/ui/bento-grid";

export default function Home() {
  return (
    <main className="bg-black min-h-screen">
      <Hero24
        brandName="Rabbit"
        navLinks={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scenarios", href: "/dashboard/demo" },
          {
            label: "GitHub",
            href: "https://github.com/priyansh-narang2308/rabbit",
          },
        ]}
        headingLine1="Enterprise Agent"
        headingLine2Prefix="Execution"
        headingHighlight="Engine"
        description="Rabbit decouples LLM reasoning from physical execution, orchestrating autonomous AI agents across cloud browsers, secure sandboxes, and remote desktops."
        primaryCtaLabel="Launch Dashboard"
        primaryCtaHref="/dashboard"
        videoHref="https://github.com/priyansh-narang2308/rabbit"
        loginLabel="View Source"
        loginHref="https://github.com/priyansh-narang2308/rabbit"
        backgroundImage="https://assets.watermelon.sh/hero-24-bg.avif"
      />
      <BentoGrid />
    </main>
  );
}
