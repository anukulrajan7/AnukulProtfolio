import type { ComponentPropsWithoutRef, ElementType } from "react";

type FrameProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/** A card with a 2px ink border. The arcade cabinet and the CV sheet use it. */
export function Frame<T extends ElementType = "div">({ as, className = "", children, ...rest }: FrameProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
