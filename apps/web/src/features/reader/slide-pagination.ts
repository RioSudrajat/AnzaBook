import { useEffect, useRef, useState } from "react";
import type { BookReaderChapterDto } from "@starter/shared/types";
import {
  computeSpreadLeafPageNumbers,
  computeStableBookSlideMeta,
  extractCleanSlideParagraphs as extractCleanSlideParagraphsCore,
  findSlide,
  slideParagraphText,
  type SlideFragment,
  type SlideLeaf,
  type SlidePosition,
  type SlideSpread,
} from "./slide-pagination-helpers";

export {
  computeSpreadLeafPageNumbers,
  computeStableBookSlideMeta,
  findSlide,
  slideParagraphText,
  type SlideFragment,
  type SlideLeaf,
  type SlidePosition,
  type SlideSpread,
};

const emptySpreads: SlideSpread[] = [];

function parseHtmlSlideBlocksInBrowser(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc
    .querySelectorAll(
      '[data-type="chapter-break"], [data-type="page-break"], .tiptap-chapter-break, .tiptap-page-break',
    )
    .forEach((el) => el.remove());

  const blocks: string[] = [];
  doc.body
    .querySelectorAll("p, h1, h2, h3, h4, blockquote, li")
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text) blocks.push(text);
    });

  if (blocks.length > 0) return blocks;
  const bodyText = doc.body.textContent?.trim();
  return bodyText
    ? bodyText
        .split(/\n\s*\n+/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
}

export function extractCleanSlideParagraphs(content?: string | null): string[] {
  return extractCleanSlideParagraphsCore(
    content,
    typeof document !== "undefined" ? parseHtmlSlideBlocksInBrowser : undefined,
  );
}

function paginateSingleChapter(
  probe: HTMLElement,
  heading: HTMLElement,
  numberEl: Element,
  titleEl: Element,
  bottom: number,
  leafCount: number,
  chapter: BookReaderChapterDto,
  english: boolean,
): SlideSpread[] {
  const leaves: SlideLeaf[] = [];
  let fragments: SlideFragment[] = [];
  probe.replaceChildren(heading);
  heading.hidden = false;
  numberEl.textContent = `CHAPTER ${chapter.chapterNumber}`;
  titleEl.textContent = chapter.title;

  function nextLeaf() {
    leaves.push({ heading: leaves.length === 0, fragments });
    fragments = [];
    probe.replaceChildren(heading);
    heading.hidden = true;
  }

  const content =
    english && chapter.contentEn ? chapter.contentEn : chapter.contentId;
  const paragraphs = extractCleanSlideParagraphs(content);
  for (const [paragraph, raw] of paragraphs.entries()) {
    const source = slideParagraphText(raw);
    const ends = Array.from(
      source.matchAll(/\S+\s*/gu),
      (word) => word.index + word[0].length,
    );
    const element = document.createElement("p");
    let start = 0;
    let word = 0;
    while (start < source.length) {
      if (leaves.length === 0 && fragments.length === 0 && start === 0) {
        element.dataset.opening = "true";
      } else {
        delete element.dataset.opening;
      }
      if (start > 0) {
        element.dataset.continuation = "true";
      } else {
        delete element.dataset.continuation;
      }
      probe.append(element);
      const fits = (end: number) => {
        element.textContent = source.slice(start, end);
        return element.offsetTop + element.offsetHeight <= bottom;
      };
      if (fits(source.length)) {
        fragments.push({ paragraph, source, start, end: source.length });
        break;
      }

      let low = word;
      let high = ends.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(ends[mid])) low = mid + 1;
        else high = mid;
      }
      if (low > word) {
        const end = ends[low - 1];
        fragments.push({ paragraph, source, start, end });
        start = end;
        word = low;
      } else if (!fragments.length && leaves.length > 0) {
        // An unbroken token may wrap across multiple lines in a narrow leaf.
        const token = Array.from(source.slice(start, ends[word]));
        let first = 1;
        let last = token.length;
        while (first < last) {
          const mid = Math.ceil((first + last) / 2);
          if (fits(start + token.slice(0, mid).join("").length)) first = mid;
          else last = mid - 1;
        }
        const end = start + token.slice(0, first).join("").length;
        fragments.push({ paragraph, source, start, end });
        start = end;
        if (start === ends[word]) word++;
      }
      nextLeaf();
    }
  }
  if (fragments.length || !leaves.length) nextLeaf();

  const spreads: SlideSpread[] = [];
  for (let i = 0; i < leaves.length; i += leafCount) {
    const spreadLeaves = leaves.slice(i, i + leafCount);
    const first = spreadLeaves[0].fragments[0] ?? spreadLeaves[1]?.fragments[0];
    spreads.push({
      chapter,
      position: {
        chapter: chapter.chapterNumber,
        paragraph: first?.paragraph ?? -1,
        offset: first?.start ?? 0,
      },
      leaves: spreadLeaves,
      chapterPage: i / leafCount + 1,
      chapterPages: Math.ceil(leaves.length / leafCount),
    });
  }
  return spreads;
}

function paginateWithCache(
  probe: HTMLElement,
  chapters: readonly BookReaderChapterDto[],
  english: boolean,
  layoutSignature: string,
  cache: Map<string, SlideSpread[]>,
): SlideSpread[] {
  const heading = probe.querySelector<HTMLElement>("header")!;
  const numberEl = heading.querySelector("span")!;
  const titleEl = heading.querySelector("h1")!;
  const style = getComputedStyle(probe);
  const bottom = probe.clientHeight - parseFloat(style.paddingBottom);
  if (bottom - parseFloat(style.paddingTop) < parseFloat(style.lineHeight)) {
    return emptySpreads;
  }
  const leafCount =
    probe.clientWidth < (probe.parentElement?.clientWidth ?? 0) - 1 ? 2 : 1;
  const spreads: SlideSpread[] = [];

  for (const chapter of chapters) {
    const content =
      english && chapter.contentEn ? chapter.contentEn : chapter.contentId;
    const cacheKey = `${layoutSignature}|${leafCount}|${chapter.id}|${chapter.chapterNumber}|${chapter.title}|${content.length}|${content.slice(0, 48)}`;
    let chapterSpreads = cache.get(cacheKey);
    if (!chapterSpreads) {
      chapterSpreads = paginateSingleChapter(
        probe,
        heading,
        numberEl,
        titleEl,
        bottom,
        leafCount,
        chapter,
        english,
      );
      cache.set(cacheKey, chapterSpreads);
    }
    spreads.push(...chapterSpreads);
  }
  return spreads;
}

export function useSlidePagination(
  chapters: readonly BookReaderChapterDto[],
  enabled: boolean,
  english: boolean,
  fontClass: string,
  fontSize: number,
) {
  const [probe, setProbe] = useState<HTMLElement | null>(null);
  const chapterCacheRef = useRef<Map<string, SlideSpread[]>>(new Map());
  const [layout, setLayout] = useState<{
    firstChapterId: string | undefined;
    english: boolean;
    spreads: SlideSpread[];
  } | null>(null);

  useEffect(() => {
    if (!enabled || !probe) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (probe.clientWidth && probe.clientHeight) {
          const layoutSignature = `${probe.clientWidth}x${probe.clientHeight}|${fontClass}|${fontSize}|${english ? "en" : "id"}`;
          const nextSpreads = paginateWithCache(
            probe,
            chapters,
            english,
            layoutSignature,
            chapterCacheRef.current,
          );
          if (chapterCacheRef.current.size > 80) {
            chapterCacheRef.current.clear();
          }
          setLayout({
            firstChapterId: chapters[0]?.id,
            english,
            spreads: nextSpreads,
          });
        }
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    document.fonts.addEventListener("loadingdone", measure);
    measure();
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
      cancelAnimationFrame(frame);
    };
  }, [probe, enabled, chapters, english, fontClass, fontSize]);

  // Keep showing valid spreads seamlessly while incremental chapter prefetch measures, avoiding "Menata halaman…" flash.
  const spreads =
    layout &&
    layout.english === english &&
    layout.firstChapterId === chapters[0]?.id
      ? layout.spreads
      : emptySpreads;
  return { spreads, setProbe };
}
