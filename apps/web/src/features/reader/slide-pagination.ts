import { useEffect, useState } from "react";
import type { BookReaderChapterDto } from "@starter/shared/types";

export type SlidePosition = {
  chapter: number;
  paragraph: number;
  offset: number;
};
export type SlideFragment = {
  paragraph: number;
  source: string;
  start: number;
  end: number;
};
export type SlideLeaf = { heading: boolean; fragments: SlideFragment[] };
export type SlideSpread = {
  chapter: BookReaderChapterDto;
  position: SlidePosition;
  leaves: SlideLeaf[];
  chapterPage: number;
  chapterPages: number;
};

const emptySpreads: SlideSpread[] = [];

export function findSlide(spreads: SlideSpread[], position: SlidePosition) {
  const first = spreads.findIndex(
    ({ position: start }) => start.chapter === position.chapter,
  );
  if (first === -1) return 0;
  let index = first;
  for (let i = first + 1; i < spreads.length; i++) {
    const start = spreads[i].position;
    if (
      start.chapter !== position.chapter ||
      start.paragraph > position.paragraph ||
      (start.paragraph === position.paragraph && start.offset > position.offset)
    )
      break;
    index = i;
  }
  return index;
}

export function slideParagraphText(raw: string) {
  return raw.replace(/<!--\s*pagebreak\s*-->|---pagebreak---/gi, "").trim();
}

function paginate(
  probe: HTMLElement,
  chapters: readonly BookReaderChapterDto[],
  english: boolean,
) {
  const heading = probe.querySelector<HTMLElement>("header")!;
  const number = heading.querySelector("span")!;
  const title = heading.querySelector("h1")!;
  const style = getComputedStyle(probe);
  const bottom = probe.clientHeight - parseFloat(style.paddingBottom);
  if (bottom - parseFloat(style.paddingTop) < parseFloat(style.lineHeight))
    return emptySpreads;
  const leafCount =
    probe.clientWidth < (probe.parentElement?.clientWidth ?? 0) - 1 ? 2 : 1;
  const spreads: SlideSpread[] = [];

  for (const chapter of chapters) {
    const leaves: SlideLeaf[] = [];
    let fragments: SlideFragment[] = [];
    probe.replaceChildren(heading);
    heading.hidden = false;
    number.textContent = `BAB ${chapter.chapterNumber}`;
    title.textContent = chapter.title;

    function nextLeaf() {
      leaves.push({ heading: leaves.length === 0, fragments });
      fragments = [];
      probe.replaceChildren(heading);
      heading.hidden = true;
    }

    const content =
      english && chapter.contentEn ? chapter.contentEn : chapter.contentId;
    const paragraphs = content
      .split(/\n\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
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

    for (let i = 0; i < leaves.length; i += leafCount) {
      const spreadLeaves = leaves.slice(i, i + leafCount);
      const first =
        spreadLeaves[0].fragments[0] ?? spreadLeaves[1]?.fragments[0];
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
  const [layout, setLayout] = useState<{
    chapters: typeof chapters;
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
          setLayout({
            chapters,
            english,
            spreads: paginate(probe, chapters, english),
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

  const spreads =
    layout?.chapters === chapters && layout.english === english
      ? layout.spreads
      : emptySpreads;
  return { spreads, setProbe };
}
