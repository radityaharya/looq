import { Badge } from "src/client/lib/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "src/client/lib/components/ui/tooltip";
import { ScrollArea } from "src/client/lib/components/ui/scroll-area";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";

// Custom plugin to handle search directives
const remarkSearchLinks = () => {
  return (tree: any) => {
    visit(tree, (node) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        if (node.name !== 'search') return;

        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        const data = node.data || (node.data = {});
        const attributes = node.attributes || {};

        // Convert directive to a span with special attributes
        data.hName = 'span';
        data.hProperties = {
          className: 'search-link',
          'data-search-query': attributes.query || node.children[0].value,
        };
      }
    });
  };
};

export const MarkdownRenderer = ({ content, onSearchClick }: { content: string, onSearchClick?: (query: string) => void }) => (
  <Markdown
    remarkPlugins={[remarkGfm, remarkDirective, remarkSearchLinks]}
    components={{
      h1: ({ children }) => (
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl mb-2">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0 mb-2">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight mb-2">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mb-2">
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className="scroll-m-20 text-base font-semibold tracking-tight mb-1">
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className="scroll-m-20 text-sm font-semibold tracking-tight mb-1">
          {children}
        </h6>
      ),
      p: ({ children }) => <p className="mb-2 leading-6">{children}</p>,
      ul: ({ children }) => (
        <ul className="list-disc pl-6 mb-2 space-y-1">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal pl-6 mb-2 space-y-1">{children}</ol>
      ),
      li: ({ children }) => <li className="leading-6">{children}</li>,
      a: ({ children, href }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline truncate overflow-hidden whitespace-nowrap break-words"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[11px] py-0"
                >
                  {(() => {
                    const urlPattern = /^(https?:\/\/)?([^\/?#]+)(?:[\/?#]|$)/i;
                    const match = (href as string).match(urlPattern);
                    return match ? match[2] : href;
                  })()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs">{href}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </a>
      ),
      code: ({ node, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        
        return (
          <div className="relative my-4 rounded-lg border bg-muted/50">
            {language && (
              <div className="absolute right-3 top-3">
                <Badge variant="secondary" className="text-xs">
                  {language}
                </Badge>
              </div>
            )}
            <ScrollArea className="relative w-full max-h-[650px]">
              <pre className="overflow-x-auto py-4 px-4 text-sm leading-6">
                <code className="relative rounded font-mono text-sm" {...props}>
                  {children}
                </code>
              </pre>
            </ScrollArea>
          </div>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="my-6 w-full overflow-y-auto">
          <table className="w-full">
            {children}
          </table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border px-4 py-2 text-left font-bold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border px-4 py-2">
          {children}
        </td>
      ),
      span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { 'data-search-query'?: string }) => {
        if (className === 'search-link') {
          return (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onSearchClick?.(props['data-search-query'] as string)}
            >
              🔍 {children}
            </Badge>
          );
        }
        return <span {...props}>{children}</span>;
      },
    }}
  >
    {content}
  </Markdown>
);