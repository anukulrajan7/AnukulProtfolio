import type { Metadata } from "next";
import { ArcadeCabinet } from "@/components/arcade/arcade-cabinet";
import { StoryLauncher } from "@/components/arcade/story/story-launcher";
import { SectionHeading } from "@/components/ui/section-label";

export const metadata: Metadata = {
  title: "Arcade",
  description:
    "A story game about becoming a software engineer, plus three arcade games in plain TypeScript with levels, stars and endless modes: a block stacker, a vector shooter, and a GPS-trail snake.",
};

export default function ArcadePage() {
  return (
    <section>
      <SectionHeading as="h1" size="lg" name="Games I made for fun" />
      <p className="mt-4 max-w-[60ch] text-muted text-[1.05rem]">
        One story game about how I ended up doing this job, and three arcade games for procrastinating properly.
        Plain TypeScript, no game libraries, saves stay in your browser.
      </p>

      <StoryLauncher className="mt-10" />

      <SectionHeading name="Free play" aside="three games · 8 levels each · endless mode" className="mt-16" />
      <ArcadeCabinet className="mt-6" />
    </section>
  );
}
