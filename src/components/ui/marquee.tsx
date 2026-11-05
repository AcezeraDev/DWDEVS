// Magic UI · Marquee (https://magicui.design/r/marquee.json)
import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  repeat?: number;
}

export function Marquee({ className, reverse = false, pauseOnHover = false, children, repeat = 4, ...props }: MarqueeProps) {
  return (
    <div {...props} className={cn("group flex flex-row gap-(--gap) overflow-hidden [--duration:40s] [--gap:1rem]", className)}>
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            aria-hidden={i > 0}
            className={cn("animate-marquee flex shrink-0 flex-row justify-around gap-(--gap)", {
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
