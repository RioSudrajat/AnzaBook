export interface ProseMirrorDocLike {
  content: { size: number };
  childCount: number;
  child(index: number): {
    type: { name: string };
    textContent: string;
    nodeSize: number;
  };
  resolve(pos: number): {
    depth: number;
    index(depth?: number): number;
  };
}

export const EDITOR_MAX_PAGE_WORDS = 250;
export const EDITOR_MAX_PAGE_CHARS = 1650;
export const EDITOR_MAX_PAGE_HEIGHT_PX = 720;

export interface PageSliceNode {
  type?: string;
  textContent?: string;
}

export interface PageSliceMetrics {
  pageNumber: number;
  wordsInPage: number;
  charsInPage: number;
}

export function countWordsSimple(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Walks backwards from `endIndexInclusive` to the closest chapterBreak or pageBreak
 * and computes page number within the chapter plus total words and characters on that page.
 */
export function computePageMetricsInSlice(
  nodes: readonly PageSliceNode[],
  endIndexInclusive = nodes.length - 1,
): PageSliceMetrics {
  if (nodes.length === 0 || endIndexInclusive < 0) {
    return { pageNumber: 1, wordsInPage: 0, charsInPage: 0 };
  }

  const limitIdx = Math.min(endIndexInclusive, nodes.length - 1);
  let chapterStartIdx = 0;
  for (let i = limitIdx; i >= 0; i--) {
    if (nodes[i]?.type === "chapterBreak") {
      chapterStartIdx = i + 1;
      break;
    }
  }

  let pageNumber = 1;
  let pageStartIdx = chapterStartIdx;
  for (let i = chapterStartIdx; i <= limitIdx; i++) {
    if (nodes[i]?.type === "pageBreak") {
      pageNumber += 1;
      pageStartIdx = i + 1;
    }
  }

  let wordsInPage = 0;
  let charsInPage = 0;
  for (let i = pageStartIdx; i <= limitIdx; i++) {
    const node = nodes[i];
    if (!node || node.type === "chapterBreak" || node.type === "pageBreak") {
      continue;
    }
    const text = (node.textContent || "").trim();
    if (!text) continue;
    wordsInPage += countWordsSimple(text);
    charsInPage += text.length;
  }

  return { pageNumber, wordsInPage, charsInPage };
}

export interface AutoPageBreakCheckInput {
  wordsInPage: number;
  charsInPage: number;
  renderedPageHeightPx?: number;
  cursorAtEndOfBlock: boolean;
  currentBlockHasText: boolean;
  parentTypeName: string;
}

/**
 * Best-practice guard for automatic page breaks on Enter:
 * only triggers when the cursor is at the end of a non-empty body block
 * and the current page has met the standard 1-page capacity.
 */
export function shouldAutoInsertPageBreakOnEnter(
  input: AutoPageBreakCheckInput,
): boolean {
  const {
    wordsInPage,
    charsInPage,
    renderedPageHeightPx,
    cursorAtEndOfBlock,
    currentBlockHasText,
    parentTypeName,
  } = input;

  if (parentTypeName === "chapterBreak") return false;
  if (!cursorAtEndOfBlock || !currentBlockHasText) return false;

  if (
    typeof renderedPageHeightPx === "number" &&
    renderedPageHeightPx >= EDITOR_MAX_PAGE_HEIGHT_PX
  ) {
    return true;
  }

  return (
    wordsInPage >= EDITOR_MAX_PAGE_WORDS || charsInPage >= EDITOR_MAX_PAGE_CHARS
  );
}

/**
 * Computes current page metrics and page-start top-level node position inside a ProseMirror document.
 */
export function computeProseMirrorPageContext(
  doc: ProseMirrorDocLike,
  pos: number,
): PageSliceMetrics & { pageStartChildPos: number; currentChildIndex: number } {
  const resolved = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  const currentChildIndex =
    resolved.depth >= 1 ? resolved.index(0) : Math.max(0, doc.childCount - 1);

  const flatNodes: PageSliceNode[] = [];
  const childStartPositions: number[] = [];
  let offset = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    childStartPositions.push(offset);
    flatNodes.push({
      type: child.type.name,
      textContent: child.textContent,
    });
    offset += child.nodeSize;
  }

  const metrics = computePageMetricsInSlice(flatNodes, currentChildIndex);
  let pageStartIdx = 0;
  for (let i = currentChildIndex; i >= 0; i--) {
    const t = flatNodes[i]?.type;
    if (t === "chapterBreak" || t === "pageBreak") {
      pageStartIdx = i + 1;
      break;
    }
  }

  return {
    ...metrics,
    currentChildIndex,
    pageStartChildPos: childStartPositions[pageStartIdx] ?? 0,
  };
}
