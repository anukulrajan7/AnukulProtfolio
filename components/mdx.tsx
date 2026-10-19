import { MDXRemote } from "next-mdx-remote/rsc";
import { highlight } from "sugar-high";
import type { ComponentPropsWithoutRef } from "react";

function Code({ children, ...props }: ComponentPropsWithoutRef<"code">) {
  const isInline = !props.className;

  if (isInline) {
    return <code {...props}>{children}</code>;
  }

  const html = highlight(children as string);
  return <code dangerouslySetInnerHTML={{ __html: html }} {...props} />;
}

function Pre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const lang = langFromChildren(children);
  return (
    <pre {...props} data-lang={lang}>
      {lang ? <span className="code-lang" aria-hidden>{lang}</span> : undefined}
      {children}
    </pre>
  );
}

function langFromChildren(children: ComponentPropsWithoutRef<"pre">["children"]): string | undefined {
  if (!children || typeof children !== "object" || !("props" in children)) return undefined;
  const className = (children.props as { className?: string }).className;
  return className?.replace("language-", "");
}

function A({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/") || href?.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function Img({ alt, ...props }: ComponentPropsWithoutRef<"img">) {
  if (!alt) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" loading="lazy" {...props} />;
  }
  return (
    <span className="block my-[1.8em]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} loading="lazy" {...props} />
      <span className="block mt-[0.6em] font-mono text-[0.6875rem] tracking-[0.06em] uppercase text-muted">
        {alt}
      </span>
    </span>
  );
}

const components = {
  code: Code,
  pre: Pre,
  a: A,
  img: Img,
};

export function MDXContent({ source }: { source: string }) {
  return (
    <article className="prose">
      <MDXRemote source={source} components={components} />
    </article>
  );
}
