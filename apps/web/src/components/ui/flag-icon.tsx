import React from "react";
import { cn } from "@/lib/utils";

type FlagIconProps = {
  lang: "id" | "en" | "us" | "gb" | string;
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
};

const FLAG_CONFIG: Record<string, { src: string; alt: string; label: string }> =
  {
    id: {
      src: "/flags/id.svg",
      alt: "Bendera Indonesia",
      label: "Bahasa Indonesia",
    },
    en: {
      src: "/flags/en.svg",
      alt: "Bendera Inggris (English)",
      label: "English",
    },
    gb: {
      src: "/flags/en.svg",
      alt: "Bendera Inggris (English)",
      label: "English",
    },
    us: {
      src: "/flags/us.svg",
      alt: "Bendera Amerika Serikat",
      label: "English (US)",
    },
  };

const SIZE_CLASSES = {
  sm: "w-4 h-2.5",
  md: "w-5 h-3.5",
  lg: "w-6 h-4",
};

export function FlagIcon({
  lang,
  className,
  size = "md",
  title,
}: FlagIconProps) {
  const normalized = (lang || "").toLowerCase().trim();
  const config = FLAG_CONFIG[normalized] || {
    src: `/flags/${normalized}.svg`,
    alt: `Bendera ${normalized.toUpperCase()}`,
    label: normalized.toUpperCase(),
  };

  const tooltip = title || config.label;

  return (
    <img
      src={config.src}
      alt={config.alt}
      title={tooltip}
      loading="eager"
      decoding="sync"
      className={cn(
        SIZE_CLASSES[size],
        "object-cover rounded-[2px] shadow-xs ring-1 ring-black/15 dark:ring-white/20 inline-block align-middle shrink-0 transition-transform select-none",
        className,
      )}
    />
  );
}
