import Link from "next/link";
import { site } from "@/lib/site-data";

/** End of the story: one obvious thing to do next. */
export function WorkCta({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="work-cta" className={`card bg-sun text-ink p-7 md:p-10 grid gap-6 md:grid-cols-12 md:items-center ${className}`}>
      <div className="md:col-span-8">
        <h2 id="work-cta" className="display text-[2rem] md:text-[2.8rem] max-w-[18ch]">
          Hiring for something real-time, mobile, or just hard?
        </h2>
        <p className="mt-4 text-[1.05rem] max-w-[50ch]">
          The résumé has the dates and the stack per role. One email is enough for the rest. I read every one.
        </p>
      </div>
      <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
        <a href={`mailto:${site.email}`} className="btn btn-primary w-full sm:w-auto">
          Email me
        </a>
        <a href="/resume.pdf" target="_blank" rel="noopener" className="btn btn-ghost !border-ink !text-ink hover:!bg-ink hover:!text-paper w-full sm:w-auto">
          Résumé (PDF)
        </a>
        <Link href="/cv" className="text-[15px] font-medium underline decoration-2 underline-offset-4 hover:opacity-80 md:mt-1">
          Or read the CV page
        </Link>
      </div>
    </section>
  );
}
