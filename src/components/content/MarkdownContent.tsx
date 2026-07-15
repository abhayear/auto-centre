import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  className?: string;
  variant?: "default" | "print";
};

const printTable =
  "print:mb-4 print:overflow-visible print:rounded-none print:border print:border-black";
const printText = "print:text-black";
const printHeading = "print:text-black print:border-black";

export function MarkdownContent({ content, className, variant = "default" }: MarkdownContentProps) {
  const isPrint = variant === "print";

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2
              className={`mb-4 mt-10 border-b border-slate-700/50 pb-2 text-xl font-semibold text-white first:mt-0 ${isPrint ? `${printHeading} print:mt-6 print:text-lg` : ""}`}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={`mb-3 mt-8 text-lg font-semibold text-red-300 ${isPrint ? "print:text-black" : ""}`}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              className={`mb-4 leading-relaxed text-slate-300 ${isPrint ? `${printText} print:text-sm` : ""}`}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className={`mb-4 list-disc space-y-2 pl-6 text-slate-300 ${isPrint ? printText : ""}`}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={`mb-4 list-decimal space-y-2 pl-6 text-slate-300 ${isPrint ? printText : ""}`}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => <li className={`leading-relaxed ${isPrint ? printText : ""}`}>{children}</li>,
          strong: ({ children }) => (
            <strong className={`font-semibold text-white ${isPrint ? printText : ""}`}>{children}</strong>
          ),
          hr: () => (
            <hr className={`my-8 border-slate-700/50 ${isPrint ? "print:border-black print:my-4" : ""}`} />
          ),
          table: ({ children }) => (
            <div
              className={`mb-6 overflow-x-auto rounded-lg border border-slate-700/50 ${isPrint ? printTable : ""}`}
            >
              <table className="min-w-full text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead
              className={`bg-slate-800/80 text-slate-200 ${isPrint ? "print:bg-white print:text-black" : ""}`}
            >
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody
              className={`divide-y divide-slate-700/50 ${isPrint ? "print:divide-black" : ""}`}
            >
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={`text-slate-300 ${isPrint ? printText : ""}`}>{children}</tr>
          ),
          th: ({ children }) => (
            <th
              className={`px-4 py-3 font-semibold text-white ${isPrint ? `print:px-2 print:py-1 print:text-xs ${printText}` : ""}`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-4 py-3 align-top ${isPrint ? "print:px-2 print:py-1 print:text-xs" : ""}`}>
              {children}
            </td>
          ),
          a: ({ href, children }) => {
            const isInternal = href?.startsWith("/");
            if (isInternal && href) {
              return (
                <Link href={href} className="text-red-400 underline hover:text-red-300">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                className="text-red-400 underline hover:text-red-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
