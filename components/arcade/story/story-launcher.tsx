import Link from "next/link";

/**
 * Story tile for /arcade. The game itself lives at /arcade/story.
 * (Kept as a server-safe component so /arcade can import it without loading the game.)
 */
export function StoryLauncher({ className = "" }: { className?: string }) {
  return (
    <div className={`card overflow-hidden md:grid md:grid-cols-12 ${className}`}>
      <div className="bg-accent text-on-accent p-6 md:p-8 md:col-span-8">
        <p className="hand text-[1.3rem] text-sun">a small story game</p>
        <h2 className="display text-[2.2rem] md:text-[3.2rem]">The Long Way to OK</h2>
        <p className="mt-3 max-w-[52ch] text-[#C9CCFF] text-[1.05rem]">
          A short walk-and-touch game about learning to build things, in the years the machines learned too. Walk, notice,
          and decide what to do when Tab offers a shortcut.
        </p>
        <Link href="/arcade/story" className="btn btn-sun mt-6">
          Play the story
        </Link>
      </div>
      <div className="p-6 md:p-8 md:col-span-4 grid content-center gap-2">
        <p className="label">Vertical slice · about 5 minutes</p>
        <p>Prologue, one field test, and a small ending. Keyboard or touch.</p>
      </div>
    </div>
  );
}
