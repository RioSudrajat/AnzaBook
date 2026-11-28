import * as React from "react";
import {
  parseEventDescriptionBlocks,
  type DescriptionInlineRun,
} from "../event-description-doc";

function renderInlineRuns(
  runs: DescriptionInlineRun[],
  keyPrefix: string,
): React.ReactNode {
  return runs.map((run, idx) => {
    const key = `${keyPrefix}-${idx}`;
    let content: React.ReactNode = run.text;

    if (run.code) {
      content = (
        <code className="rounded border border-border bg-[var(--color-paper-2)] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          {content}
        </code>
      );
    }
    if (run.italic) {
      content = <em>{content}</em>;
    }
    if (run.bold) {
      content = (
        <strong className="font-semibold text-foreground">{content}</strong>
      );
    }
    if (run.linkHref) {
      return (
        <a
          key={key}
          href={run.linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent)] underline underline-offset-4 hover:opacity-85 break-words"
        >
          {content}
        </a>
      );
    }
    return <React.Fragment key={key}>{content}</React.Fragment>;
  });
}

type EventDescriptionRendererProps = {
  description: string;
};

export function EventDescriptionRenderer({
  description,
}: EventDescriptionRendererProps) {
  const blocks = React.useMemo(
    () => parseEventDescriptionBlocks(description),
    [description],
  );

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Penyelenggara belum menambahkan deskripsi tambahan untuk acara ini.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-foreground/90 max-w-[70ch]">
      {blocks.map((block, index) => {
        const key = `desc-block-${index}`;
        switch (block.type) {
          case "heading":
            if (block.level === 1) {
              return (
                <h3
                  key={key}
                  className="font-serif text-xl sm:text-2xl font-bold text-foreground pt-3 first:pt-0 tracking-tight"
                >
                  {renderInlineRuns(block.runs, key)}
                </h3>
              );
            }
            if (block.level === 2) {
              return (
                <h4
                  key={key}
                  className="font-serif text-lg font-bold text-foreground pt-2 first:pt-0 tracking-tight"
                >
                  {renderInlineRuns(block.runs, key)}
                </h4>
              );
            }
            return (
              <h5
                key={key}
                className="font-serif text-base font-semibold text-foreground pt-1 first:pt-0"
              >
                {renderInlineRuns(block.runs, key)}
              </h5>
            );
          case "blockquote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-[var(--color-accent)] pl-4 py-1 italic text-foreground/85 bg-[var(--color-paper-2)]/60 rounded-r-lg"
              >
                {renderInlineRuns(block.runs, key)}
              </blockquote>
            );
          case "bulletList":
            return (
              <ul
                key={key}
                className="list-disc pl-6 space-y-1.5 marker:text-[var(--color-accent)]"
              >
                {block.items.map((itemRuns, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`}>
                    {renderInlineRuns(itemRuns, `${key}-li-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          case "orderedList":
            return (
              <ol
                key={key}
                className="list-decimal pl-6 space-y-1.5 marker:font-mono marker:text-xs marker:text-muted-foreground"
              >
                {block.items.map((itemRuns, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`}>
                    {renderInlineRuns(itemRuns, `${key}-li-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
          case "divider":
            return <hr key={key} className="border-t border-border my-4" />;
          case "image":
            return (
              <figure key={key} className="my-4 space-y-1.5">
                <img
                  src={block.src}
                  alt={block.alt}
                  className="max-h-[420px] w-full rounded-xl border border-border object-cover bg-[var(--color-paper-2)]"
                />
                {block.alt && block.alt !== "Gambar acara" && (
                  <figcaption className="text-xs text-muted-foreground font-mono">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );
          case "paragraph":
          default:
            return (
              <p key={key} className="leading-relaxed">
                {renderInlineRuns(block.runs, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
