import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

export function ChapterBreakNodeView({
  node,
  editor,
  selected,
}: NodeViewProps) {
  const chapterNumber = Number(node.attrs.chapterNumber) || 1;
  const isFirst = chapterNumber === 1;
  const isEmpty = node.textContent.trim().length === 0;
  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper
      data-type="chapter-break"
      data-chapter-number={chapterNumber}
      data-selected={selected ? "true" : "false"}
      className={`tiptap-chapter-break w-full text-center select-text ${
        isFirst ? "mt-2 mb-10 pt-2 pb-4" : "pt-14 pb-8"
      } ${selected ? "ProseMirror-selectednode" : ""}`}
    >
      {!isFirst && (
        <div
          contentEditable={false}
          aria-hidden="true"
          className="flex items-center justify-center gap-3 mb-6 text-current/30"
        >
          <div className="w-16 h-px bg-current/20" />
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-current/40 inline-block" />
            <span className="size-2 rounded-full bg-current/70 inline-block" />
            <span className="size-2 rounded-full bg-current/70 inline-block" />
            <span className="size-1.5 rounded-full bg-current/40 inline-block" />
          </div>
          <div className="w-16 h-px bg-current/20" />
        </div>
      )}

      <div
        contentEditable={false}
        className="text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2"
      >
        CHAPTER {chapterNumber}
      </div>

      <div className="relative" role="heading" aria-level={isFirst ? 1 : 2}>
        <NodeViewContent
          data-chapter-title-editable="true"
          data-placeholder={
            isEditable ? `Tulis judul Bab ${chapterNumber}...` : undefined
          }
          className={`tiptap-chapter-title font-serif font-bold tracking-tight text-foreground outline-none ${
            isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
          } ${isEmpty ? "is-chapter-title-empty" : ""}`}
        />
        {!isEditable && isEmpty && (
          <div className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Bab {chapterNumber}
          </div>
        )}
      </div>

      {/* Garis pembatas tegas tepat di bawah judul bab */}
      <div
        contentEditable={false}
        aria-hidden="true"
        className="w-full h-px bg-current/15 mt-6"
      />
    </NodeViewWrapper>
  );
}
