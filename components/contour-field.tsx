import { contourPaths } from "@/lib/contour";

interface ContourFieldProps {
  seed?: number;
  className?: string;
  levels?: number;
}

const WIDTH = 1200;
const HEIGHT = 720;

export function ContourField({ seed = 17385, className = "", levels = 9 }: ContourFieldProps) {
  const paths = contourPaths({ seed, width: WIDTH, height: HEIGHT, levels });
  return (
    <svg
      aria-hidden
      className={`pointer-events-none select-none text-fg ${className}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          strokeWidth={i % 3 === 2 ? 0.9 : 0.55}
          strokeOpacity={i % 3 === 2 ? 0.26 : 0.16}
        />
      ))}
    </svg>
  );
}
