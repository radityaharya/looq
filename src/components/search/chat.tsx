import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { Send, AlertCircle, RefreshCcw, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  content: string;
  role: "user" | "assistant";
};

type ChatProps = {
  requestId: string;
  model: string;
};

const LoadingDots = () => (
  <div className="flex space-x-1.5 items-center">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

const ErrorMessage = ({ onRetry }: { onRetry: () => void }) => (
  <div className="space-y-2 bg-destructive/10 p-3 rounded-md border border-destructive/20">
    <div className="flex items-center gap-2 text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span className="font-medium">Failed to generate response</span>
    </div>
    <p className="text-xs text-muted-foreground">
      There was an error processing your request. Please try again.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="h-7 text-xs"
    >
      Try again
    </Button>
  </div>
);

const RegenerateButton = ({ onClick }: { onClick: () => void }) => (
  <div className="flex justify-end">
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-6 w-6 p-0 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 hover:w-[140px] hover:border relative"
    >
      <div className="absolute inset-0 flex items-center justify-end px-1.5">
        <span className="text-[10px] mr-1 truncate opacity-0 hover:opacity-100 transition-opacity duration-200">
          Regenerate response
        </span>
        <RefreshCcw className="h-3 w-3 flex-shrink-0" />
      </div>
    </Button>
  </div>
);

const MarkdownContent = ({ content }: { content: string }) => (
  <Markdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-2">{children}</p>,
      ul: ({ children }) => (
        <ul className="list-disc pl-4 mb-2">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal pl-4 mb-2">{children}</ol>
      ),
      li: ({ children }) => <li className="mb-1">{children}</li>,
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
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] py-0"
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
    }}
  >
    {content}
  </Markdown>
);

const ChatBubble = ({ 
  message, 
  isStreaming, 
  onRetry 
}: { 
  message: Message; 
  isStreaming: boolean; 
  onRetry: () => void;
}) => (
  <div
    className={`rounded-lg p-4 text-sm mb-4 group ${
      message.role === "user" 
        ? "bg-muted/70 ml-8" 
        : "bg-muted mr-8"
    }`}
  >
    <div className="text-xs text-muted-foreground mb-1">
      {message.role === "user" ? "You" : "Assistant"}
    </div>
    {message.content === "" ? (
      <LoadingDots />
    ) : message.content === "An error occurred while processing your message." ? (
      <ErrorMessage onRetry={onRetry} />
    ) : (
      <div className="space-y-2">
        <MarkdownContent content={message.content} />
        {message.role === "assistant" && !isStreaming && (
          <RegenerateButton onClick={onRetry} />
        )}
      </div>
    )}
  </div>
);

const ChatInput = ({ 
  message, 
  isStreaming, 
  onMessageChange, 
  onSend, 
  onAbort 
}: { 
  message: string;
  isStreaming: boolean;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
}) => (
  <div className="flex gap-2">
    <Input
      placeholder="Ask a question about these results..."
      value={message}
      onChange={(e) => onMessageChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSend()}
      disabled={isStreaming}
    />
    <Button 
      size="icon"
      onClick={isStreaming ? onAbort : onSend}
      variant={isStreaming ? "destructive" : "default"}
    >
      {isStreaming ? (
        <X className="h-4 w-4" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  </div>
);

export const Chat: React.FC<ChatProps> = ({ requestId, model }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      if (isStreaming || viewport.scrollHeight - viewport.scrollTop <= viewport.clientHeight + 100) {
        setTimeout(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        }, 0);
      }
    }
  }, [messages, isStreaming]);

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleChat = async () => {
    if (!message.trim()) return;
    
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);
    const currentMessage = message;
    setMessage("");
    
    setMessages(prev => [...prev, { content: currentMessage, role: "user" }]);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          message: currentMessage,
          model,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = "";
      setMessages(prev => [...prev, { content: "", role: "assistant" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n").filter(Boolean);

        for (const line of lines) {
          const event = line.replace("data: ", "");
          try {
            const data = JSON.parse(event);
            if (data.content) {
              assistantMessage = data.content;
              setMessages(prev => [
                ...prev.slice(0, -1),
                { content: assistantMessage, role: "assistant" }
              ]);
            }
          } catch (e) {
            console.error("Failed to parse SSE message:", e);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, {
          content: "An error occurred while processing your message.",
          role: "assistant"
        }]);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async (message: Message) => {
    const messageIndex = messages.findIndex(m => m === message);
    const lastUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find(m => m.role === "user");

    if (!lastUserMessage) return;

    setMessages(prev => prev.slice(0, messageIndex));
    
    setIsStreaming(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          message: lastUserMessage.content,
          model,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = "";
      setMessages(prev => [...prev, { content: "", role: "assistant" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n").filter(Boolean);

        for (const line of lines) {
          const event = line.replace("data: ", "");
          try {
            const data = JSON.parse(event);
            if (data.content) {
              assistantMessage = data.content;
              setMessages(prev => [
                ...prev.slice(0, -1),
                { content: assistantMessage, role: "assistant" }
              ]);
            }
          } catch (e) {
            console.error("Failed to parse SSE message:", e);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        content: "An error occurred while processing your message.",
        role: "assistant"
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Chat with results</h3>
      
      <ScrollArea 
        ref={scrollAreaRef}
        className={`pr-4 ${messages.length > 0 ? "h-[400px]" : "h-0"}`}
      >
        <div className="space-y-2">
          {messages.map((msg, index) => (
            <ChatBubble 
              key={index} 
              message={msg} 
              isStreaming={isStreaming}
              onRetry={() => handleRetry(msg)}
            />
          ))}
        </div>
      </ScrollArea>
      
      <ChatInput 
        message={message}
        isStreaming={isStreaming}
        onMessageChange={setMessage}
        onSend={handleChat}
        onAbort={handleAbort}
      />
    </div>
  );
}; 