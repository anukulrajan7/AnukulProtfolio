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

function A({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/")) {
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

const components = {
  code: Code,
  a: A,
};

export function MDXContent({ source }: { source: string }) {
  return (
    <article className="prose">
      <MDXRemote source={source} components={components} />
    </article>
  );
}
