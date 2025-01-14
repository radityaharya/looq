import { Slot } from "@radix-ui/react-slot";
import { cn } from "src/client/lib/utils";

interface ShineBorderProps {
  active?: boolean;
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string | string[];
  className?: string;
  children: React.ReactNode;
  asChild?: boolean;
}

export function ShineBorder({
  active = false,
  borderRadius = 0,
  borderWidth = 1,
  duration = 14,
  color = "#ffff",
  className,
  children,
  asChild = false,
}: ShineBorderProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      style={{
        "--border-radius": `${borderRadius}px`,
      } as React.CSSProperties}
      className={cn(
        "relative grid min-h-[60px] w-fit min-w-[300px] rounded-[--border-radius] bg-white text-black dark:bg-black dark:text-white",
        className,
      )}
    >
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--border-radius": `${borderRadius}px`,
          "--shine-pulse-duration": `${duration}s`,
          "--mask-linear-gradient": "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${Array.isArray(color) ? color.join(",") : color},transparent,transparent)`,
        } as React.CSSProperties}
        className={cn(
          "before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:[mask:--mask-linear-gradient] before:transition-opacity before:duration-300 before:z-[10]",
          {
            "motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear] before:opacity-100": active,
            "before:opacity-0": !active,
          },
        )}
      />
      <div className="relative z-[11]">{children}</div>
    </Comp>
  );
}
