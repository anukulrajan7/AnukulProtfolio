import Image from "next/image";
import { site } from "@/lib/site-data";
import { HandArrow, HandNote } from "./hand-note";

/**
 * The one signature element: a tilted, taped photo with a cobalt block behind
 * and a handwritten note. Rendered width is capped at 340px so the current
 * 400x400 source never upscales; swap `site.photo` for a bigger file later.
 */
export function HeroPhoto({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto mb-28 w-[72%] max-w-[340px] md:mb-0 md:w-full ${className}`}>
      {/* cobalt block behind */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-4 translate-y-4 rounded-[14px] bg-accent"
        style={{ transform: "translate(16px, 16px) rotate(2deg)" }}
      />
      <figure className="photo-settle relative bg-card border-2 border-fg rounded-[14px] p-3 pb-10 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]">
        <span aria-hidden className="tape" />
        <div className="relative aspect-square overflow-hidden rounded-[6px] bg-surface">
          <Image
            src={site.photo}
            alt="Anukul Raj, outdoors, in a navy hoodie"
            fill
            sizes="(min-width: 768px) 340px, 72vw"
            className="object-cover"
            priority
          />
        </div>
        <figcaption className="sr-only">Anukul Raj</figcaption>
      </figure>

      <div className="absolute top-full mt-10 left-0 md:-left-6 flex items-end gap-1 text-fg">
        <HandNote className="rotate-[-4deg] max-w-[13ch] leading-[1.15]">that&apos;s me. usually arguing with GPS.</HandNote>
        <HandArrow className="w-16 h-8 mb-3 rotate-[-35deg]" />
      </div>
    </div>
  );
}
