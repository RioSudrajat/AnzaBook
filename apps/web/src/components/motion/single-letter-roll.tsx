import { useState, type ReactNode } from "react";

type SingleLetterRollProps = {
  text: string;
  className?: string;
  icon?: ReactNode;
};

export function SingleLetterRoll({
  text,
  className = "",
  icon,
}: SingleLetterRollProps) {
  const [isHovered, setIsHovered] = useState(false);
  const letters = Array.from(text);

  return (
    <span
      className={`inline-flex items-center gap-2 overflow-hidden cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={text}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="relative inline-flex overflow-hidden leading-tight" aria-hidden="true">
        {/* Top line (slides up on hover) */}
        <span className="inline-flex">
          {letters.map((char, i) => (
            <span
              key={`top-${i}`}
              className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)]"
              style={{
                transitionDelay: `${i * 12}ms`,
                transform: isHovered ? "translateY(-105%)" : "translateY(0%)",
                whiteSpace: char === " " ? "pre" : "normal",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>

        {/* Bottom line (slides up from below on hover) */}
        <span className="absolute inset-0 inline-flex" aria-hidden="true">
          {letters.map((char, i) => (
            <span
              key={`bot-${i}`}
              className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] text-[var(--color-ink)]"
              style={{
                transitionDelay: `${i * 12}ms`,
                transform: isHovered ? "translateY(0%)" : "translateY(105%)",
                whiteSpace: char === " " ? "pre" : "normal",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
