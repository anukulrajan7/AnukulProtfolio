import type { Metadata } from "next";
import { StoryMount } from "@/components/arcade/story/mount";
import "@/components/arcade/story/story.css";

export const metadata: Metadata = {
  title: "The Long Way to OK",
  description:
    "A short 2D walk-and-touch story game about five developers, before AI and after. Hand-drawn in code, plain TypeScript and Canvas.",
  alternates: { canonical: "/arcade/story" },
};

export default function StoryPage() {
  return (
    <section>
      <p className="label">Arcade · story</p>
      <h1 className="display-md text-[2.2rem] md:text-[3rem] mt-1">The Long Way to OK</h1>
      <p className="mt-3 max-w-[60ch] text-muted">
        Play five developers, before AI and after. Walk, notice things, and decide what to do when Tab, an AI helper,
        offers a shortcut. It takes about 20 minutes.
      </p>
      <div className="mt-8">
        <StoryMount />
      </div>
    </section>
  );
}
