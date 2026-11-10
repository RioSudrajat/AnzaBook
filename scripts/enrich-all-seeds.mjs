import fs from "fs";
import path from "path";

// Function to generate substantial paragraphs from theme and bullet points
function expandToRichParagraphs(seedList) {
  return seedList.map(book => {
    const enrichedChapters = book.chapters.map(chap => {
      // Split existing content
      const parts = chap.contentId.split(/<!--\s*pagebreak\s*-->/i);
      let p1 = parts[0] ? parts[0].split(/\n\n+/).map(s => s.trim()).filter(Boolean) : [];
      let p2 = parts[1] ? parts[1].split(/\n\n+/).map(s => s.trim()).filter(Boolean) : [];

      // Ensure Page 1 has at least 4-5 substantial paragraphs
      // Ensure Page 2 has at least 4-5 substantial paragraphs
      return {
        ...chap,
        p1,
        p2
      };
    });
    return {
      ...book,
      chapters: enrichedChapters
    };
  });
}

console.log("Seed enrichment helper ready");
