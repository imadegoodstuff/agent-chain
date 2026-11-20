import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GithubSlugger from "github-slugger";

type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[]; properties?: Record<string, unknown> };

function textOf(n: HastNode): string {
  if (n.type === "text") return n.value ?? "";
  return (n.children ?? []).map(textOf).join("");
}

/**
 * Assigns heading ids. When `ids` (from lib/docs extractHeadings, same order) is
 * provided they are used verbatim so TOC hrefs and heading ids can never drift;
 * otherwise falls back to github-slugger, the same algorithm the TOC uses.
 */
function rehypeHeadingIds(ids?: string[]) {
  return () => (tree: HastNode) => {
    const slugger = new GithubSlugger();
    let i = 0;
    const walk = (n: HastNode) => {
      if (n.type === "element" && n.tagName && /^h[1-6]$/.test(n.tagName)) {
        n.properties = n.properties ?? {};
        const fromDoc = ids?.[i];
        n.properties.id = fromDoc ?? (slugger.slug(textOf(n)) || `section-${i + 1}`);
        i++;
      }
      n.children?.forEach(walk);
    };
    walk(tree);
  };
}

export function Markdown({ content, className = "", headingIds }: { content: string; className?: string; headingIds?: string[] }) {
  return (
    <div className={`prose-doc ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHeadingIds(headingIds)]}
        components={{
          a: ({ href, children, ...rest }) => {
            const external = typeof href === "string" && /^https?:/.test(href);
            return (
              <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} {...rest}>
                {children}
              </a>
            );
          },
          input: ({ type, checked, disabled: _d, ...rest }) =>
            type === "checkbox" ? (
              <span
                role="img"
                aria-label={checked ? "done" : "not done"}
                className={`mr-2 inline-block h-3.5 w-3.5 translate-y-[2px] rounded-sm border align-middle ${
                  checked ? "border-green bg-green" : "border-line bg-surface-2"
                }`}
              />
            ) : (
              <input type={type} {...rest} />
            ),
          table: ({ children }) => (
            <div className="not-prose my-8 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2/70">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-line px-4 py-2.5 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b border-line/60 px-4 py-2.5 align-top text-bone/85">{children}</td>,
          pre: ({ children }) => <pre className="max-w-full overflow-x-auto">{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
