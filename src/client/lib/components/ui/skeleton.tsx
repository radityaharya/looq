import { cn } from "src/client/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
}

function Skeleton({
  className,
  delay = 0,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted animate-[pulse_2s_ease-in-out_infinite]",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "backwards"
      }}
      {...props}
    />
  );
}

export { Skeleton };
