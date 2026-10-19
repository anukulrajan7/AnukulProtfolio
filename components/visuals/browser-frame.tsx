import Image from "next/image";

interface BrowserFrameProps {
  src: string;
  alt: string;
  url: string;
  className?: string;
}

/** A real screenshot inside a simple browser window that bleeds off the bottom of the tile. */
export function BrowserFrame({ src, alt, url, className = "" }: BrowserFrameProps) {
  return (
    <div className={`absolute inset-x-[5cqw] top-[5cqw] bottom-0 ${className}`}>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "2px solid #121217",
          borderBottom: 0,
          borderRadius: "1.5cqw 1.5cqw 0 0",
          color: "#121217",
        }}
      >
        <div className="flex items-center gap-[1.2cqw] px-[1.8cqw] border-b-2 border-[#121217]" style={{ height: "4.6cqw" }}>
          <span className="rounded-full" style={{ width: "1.2cqw", height: "1.2cqw", background: "var(--p-3)" }} />
          <span className="rounded-full" style={{ width: "1.2cqw", height: "1.2cqw", background: "var(--p-2)" }} />
          <span className="rounded-full" style={{ width: "1.2cqw", height: "1.2cqw", background: "var(--p-4)" }} />
          <span
            className="ml-[1.4cqw] flex-1 truncate rounded-full border border-[#121217]/30 px-[1.4cqw] font-medium"
            style={{ fontSize: "1.6cqw", lineHeight: "2.6cqw", background: "#F2F1EC" }}
          >
            {url}
          </span>
        </div>
        <div className="relative" style={{ aspectRatio: "16 / 10" }}>
          <Image src={src} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-top" />
        </div>
      </div>
    </div>
  );
}
