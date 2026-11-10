import fs from "fs";
import path from "path";

// Helper to format chapter with 4-5 paragraphs on Page 1 and 4-5 paragraphs on Page 2
function makeChapter(num, titleId, titleEn, p1List, p2List) {
  const p1 = p1List.map(s => s.trim()).join("\n\n");
  const p2 = p2List.map(s => s.trim()).join("\n\n");
  return {
    chapterNumber: num,
    titleId,
    titleEn,
    contentId: `${p1}\n\n<!-- pagebreak -->\n\n${p2}`,
    contentEn: null,
    audioUrl: null,
    audioDurationSec: null
  };
}

console.log("Preparing rich seed data generator...");
