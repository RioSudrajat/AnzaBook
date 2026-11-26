import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { computeProseMirrorPageContext } from "../page-limit";

export function PageBreakNodeView({ editor, getPos, selected }: NodeViewProps) {
  const isEditable = editor.isEditable;
  let newPageNumber = 2;

  if (typeof getPos === "function") {
    const pos = getPos();
    if (typeof pos === "number") {
      // Compute the page number that starts immediately AFTER this pageBreak node
      const ctx = computeProseMirrorPageContext(
        editor.state.doc,
        Math.min(pos + 1, editor.state.doc.content.size),
      );
      newPageNumber = ctx.pageNumber;
    }
  }

  return (
    <NodeViewWrapper
      data-type="page-break"
      data-page-number={newPageNumber}
      data-selected={selected ? "true" : "false"}
      onClick={() => {
        if (!isEditable || typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos === "number") {
          editor.chain().focus().setNodeSelection(pos).run();
        }
      }}
      className={`tiptap-page-break my-10 py-4 text-center flex items-center justify-center gap-4 text-current/40 w-full cursor-pointer select-text ${
        selected ? "ProseMirror-selectednode" : ""
      }`}
    >
      <div className="flex-1 max-w-20 h-px bg-current/25" />
      <div className="inline-flex items-center gap-2 px-2">
        <span className="text-xs tracking-[0.55em] opacity-70 text-current font-serif">
          ✦ ✦ ✦
        </span>
        {isEditable && (
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/20 bg-muted/40 text-foreground/75">
            Halaman {newPageNumber}
          </span>
        )}
      </div>
      <div className="flex-1 max-w-20 h-px bg-current/25" />
    </NodeViewWrapper>
  );
}
