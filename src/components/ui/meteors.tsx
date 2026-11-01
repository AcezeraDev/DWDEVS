"use client"

import React, { useMemo } from "react"

import { cn } from "@/lib/utils"

interface MeteorsProps {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  className?: string
}

export const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) => {
  // Seeded so server and client render the same meteors (no effect + setState round trip)
  const meteorStyles = useMemo<Array<React.CSSProperties>>(() => {
    let seed = number * 9301 + angle * 49297
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    return [...new Array(number)].map(() => ({
      "--angle": -angle + "deg",
      top: "-5%",
      left: `${Math.floor(rand() * 100)}%`,
      animationDelay: rand() * (maxDelay - minDelay) + minDelay + "s",
      animationDuration:
        Math.floor(rand() * (maxDuration - minDuration) + minDuration) + "s",
    }))
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle])

  return (
    <>
      {[...meteorStyles].map((style, idx) => (
        // Meteor Head
        <span
          key={idx}
          style={{ ...style }}
          className={cn(
            "animate-meteor pointer-events-none absolute size-0.5 rotate-(--angle) rounded-full bg-lime shadow-[0_0_6px_1px_rgba(200,240,49,0.6)]",
            className
          )}
        >
          {/* Meteor Tail */}
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-12.5 -translate-y-1/2 bg-linear-to-r from-lime/70 to-transparent" />
        </span>
      ))}
    </>
  )
}
