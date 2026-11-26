import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProfileTabItem<T extends string> = {
  id: T;
  label: string;
  count?: number | null;
  icon?: ReactNode;
};

type ProfileTabsProps<T extends string> = {
  tabs: ReadonlyArray<ProfileTabItem<T>>;
  activeTab: T;
  onChange: (tabId: T) => void;
  ariaLabel: string;
  idPrefix: string;
  className?: string;
};

export function ProfileTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
  idPrefix,
  className,
}: ProfileTabsProps<T>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = tabs[nextIndex];
      onChange(targetTab.id);
      const btn = tabRefs.current[targetTab.id];
      btn?.focus();
      btn?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[var(--color-rule)]",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative flex-none min-h-11 px-4 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
              isSelected
                ? "text-[var(--color-ink)] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:border-b-[3px] after:border-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span className="rounded-md bg-[var(--color-paper-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink-2)]">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
