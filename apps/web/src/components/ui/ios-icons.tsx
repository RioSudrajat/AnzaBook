import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  filled?: boolean;
};

/**
 * iOS SF-Symbols style Star icon
 * Rounded vertices and soft concave joints for an organic, non-rigid appearance.
 */
export function IosStar({ className = "size-4", filled = false, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? "0.5" : "1.8"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2.6l2.42 5.37a1.5 1.5 0 0 0 1.2.91l5.85.64a1.2 1.2 0 0 1 .68 2.08l-4.35 3.96a1.5 1.5 0 0 0-.46 1.41l1.21 5.76a1.2 1.2 0 0 1-1.78 1.29L12 21.05a1.5 1.5 0 0 0-1.46 0l-4.77 2.97a1.2 1.2 0 0 1-1.78-1.29l1.21-5.76a1.5 1.5 0 0 0-.46-1.41L.41 11.6a1.2 1.2 0 0 1 .68-2.08l5.85-.64a1.5 1.5 0 0 0 1.2-.91L10.56 2.6a1.2 1.2 0 0 1 1.44 0z" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style List / TOC icon (rounded bars and dots)
 */
export function IosList({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="8.5" y1="6" x2="20.5" y2="6" />
      <line x1="8.5" y1="12" x2="20.5" y2="12" />
      <line x1="8.5" y1="18" x2="20.5" y2="18" />
      <circle cx="4" cy="6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style Highlighter / Marker icon
 */
export function IosHighlighter({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14.5 3.5l6 6-9.5 9.5H5v-6l9.5-9.5z" />
      <path d="M12.5 5.5l6 6" />
      <path d="M3 21h7" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style Checkmark
 */
export function IosCheckmark({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style Share icon (square.and.arrow.up)
 */
export function IosShare({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M4 12v6a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-6" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style Chevrons
 */
export function IosChevronLeft({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IosChevronRight({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * iOS SF-Symbols style Back Arrow
 */
export function IosArrowLeft({ className = "size-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
