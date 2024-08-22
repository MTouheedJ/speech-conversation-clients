"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "../lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  onTypingStart?: () => void;
  onTypingEnd?: () => void;
  shouldStop?: boolean; // New prop to control stopping
}

export default function TypingAnimation({
  text,
  duration = 200,
  className,
  onTypingStart,
  onTypingEnd,
  shouldStop = false, // Default to not stopping
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [i, setI] = useState<number>(0);

  const typingEffect = useCallback(() => {
    if (i < text.length) {
      setDisplayedText(text.substring(0, i + 1));
      setI(i + 1);
    } else if (i === text.length) {
      if (onTypingEnd) {
        onTypingEnd();
      }
    }
  }, [i, text, onTypingEnd]);

  useEffect(() => {
    if (onTypingStart && i === 0) {
      onTypingStart();
    }

    let interval: NodeJS.Timeout;

    if (!shouldStop) {
      interval = setInterval(typingEffect, duration);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [duration, i, text, onTypingStart, shouldStop, typingEffect]);

  useEffect(() => {
    // If shouldStop is true, stop the typing effect immediately
    if (shouldStop) {
      setI(text.length); // Display the full text immediately
      if (onTypingEnd) {
        onTypingEnd();
      }
    }
  }, [shouldStop, text, onTypingEnd]);

  return (
    <p className={cn("font-display tracking-[-0.02em]", className)}>
      {displayedText}
    </p>
  );
}
