import type { ComponentPropsWithoutRef, ElementType } from "react";

type FrameProps<T extends ElementType> = {
  as?: T;
  ticks?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function Frame<T extends ElementType = "div">({
  as,
  ticks = true,
  className = "",
  children,
  ...rest
}: FrameProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`frame ${className}`} {...rest}>
      {ticks ? <Ticks /> : undefined}
      {children}
    </Tag>
  );
}

export function Ticks() {
  return (
    <>
      <span aria-hidden className="tick tick-tl" />
      <span aria-hidden className="tick tick-tr" />
      <span aria-hidden className="tick tick-bl" />
      <span aria-hidden className="tick tick-br" />
    </>
  );
}
