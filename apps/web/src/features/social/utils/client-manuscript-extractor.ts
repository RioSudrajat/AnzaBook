export type ExtractedChapter = {
  chapterNumber: number;
  titleId: string;
  contentId: string;
  estimatedMinutes: number;
};

export type ExtractionResult = {
  titleCandidate?: string;
  chapters: ExtractedChapter[];
  totalWords: number;
  estimatedTotalMinutes: number;
  fileType: "docx" | "txt";
};

const CHAPTER_HEADING_REGEX =
  /^(?:BAB\s+([0-9]+|[IVXLCDM]+|SATU|DUA|TIGA|EMPAT|LIMA|ENAM|TUJUH|DELAPAN|SEMBILAN|SEPULUH|[A-Z]\b)|Chapter\s+([0-9]+|[IVXLCDM]+|[A-Z]\b)|Bagian\s+(?:Ke-)?([0-9]+|[IVXLCDM]+|[A-Z]\b))(?:\s*[:\-\.]\s*|\s+)([^\n]*)$/i;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Client-side unzipper for extracting word/document.xml from .docx in memory
 * using native web standards (DecompressionStream).
 */
async function extractWordDocumentXml(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 22) {
    throw new Error("Berkas .docx terlalu kecil atau rusak.");
  }

  // 1. Locate End of Central Directory (EOCD) signature: 0x50, 0x4b, 0x05, 0x06
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length - 22, 65557);
  for (let i = bytes.length - 22; i >= bytes.length - 22 - maxSearch && i >= 0; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error(
      "Format .docx tidak valid (End of Central Directory tidak ditemukan).",
    );
  }

  const view = new DataView(arrayBuffer);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  if (cdOffset >= bytes.length) {
    throw new Error("Header Central Directory .docx corrupt.");
  }

  // 2. Iterate Central Directory entries to find word/document.xml
  let currentOffset = cdOffset;
  let targetEntry: {
    compressionMethod: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
  } | null = null;

  const decoder = new TextDecoder("utf-8");

  for (let i = 0; i < totalEntries; i++) {
    if (currentOffset + 46 > bytes.length) break;

    const signature = view.getUint32(currentOffset, true);
    if (signature !== 0x02014b50) {
      // 0x50, 0x4b, 0x01, 0x02
      break;
    }

    const compressionMethod = view.getUint16(currentOffset + 10, true);
    const compressedSize = view.getUint32(currentOffset + 20, true);
    const uncompressedSize = view.getUint32(currentOffset + 24, true);
    const filenameLength = view.getUint16(currentOffset + 28, true);
    const extraLength = view.getUint16(currentOffset + 30, true);
    const commentLength = view.getUint16(currentOffset + 32, true);
    const localHeaderOffset = view.getUint32(currentOffset + 42, true);

    const filenameBytes = bytes.slice(
      currentOffset + 46,
      currentOffset + 46 + filenameLength,
    );
    const filename = decoder.decode(filenameBytes);

    if (filename === "word/document.xml") {
      targetEntry = {
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      };
      break;
    }

    currentOffset += 46 + filenameLength + extraLength + commentLength;
  }

  if (!targetEntry) {
    throw new Error(
      "Dokumen Word tidak berisi 'word/document.xml' yang valid.",
    );
  }

  // 3. Read Local File Header
  const lhOffset = targetEntry.localHeaderOffset;
  if (lhOffset + 30 > bytes.length) {
    throw new Error("Local file header .docx korup.");
  }

  const localSig = view.getUint32(lhOffset, true);
  if (localSig !== 0x04034b50) {
    throw new Error("Local file header signature mismatch.");
  }

  const localFilenameLen = view.getUint16(lhOffset + 26, true);
  const localExtraLen = view.getUint16(lhOffset + 28, true);
  const dataStart = lhOffset + 30 + localFilenameLen + localExtraLen;
  const compressedData = bytes.slice(
    dataStart,
    dataStart + targetEntry.compressedSize,
  );

  // 4. Decompress
  if (targetEntry.compressionMethod === 0) {
    return decoder.decode(compressedData);
  }

  if (targetEntry.compressionMethod === 8) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "Peramban ini tidak mendukung DecompressionStream untuk membaca berkas .docx.",
      );
    }
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    await writer.write(compressedData);
    await writer.close();
    const decompressed = await new Response(ds.readable).arrayBuffer();
    return decoder.decode(decompressed);
  }

  throw new Error(
    `Metode kompresi ZIP (${targetEntry.compressionMethod}) belum didukung.`,
  );
}

/**
 * Parse XML string of word/document.xml into cleaned paragraphs.
 */
function parseDocxXmlToParagraphs(
  xml: string,
): { text: string; isHeading: boolean }[] {
  // Try DOMParser if available (Browser environment)
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      if (!doc.querySelector("parsererror")) {
        const pElements = Array.from(doc.getElementsByTagName("w:p"));
        const results: { text: string; isHeading: boolean }[] = [];

        for (const p of pElements) {
          const styleElem =
            p.getElementsByTagName("w:pStyle")[0] ||
            p.getElementsByTagName("pStyle")[0];
          const styleVal =
            styleElem?.getAttribute("w:val") ||
            styleElem?.getAttribute("val") ||
            "";
          const isHeading = /heading|judul|title/i.test(styleVal);

          const tElements = Array.from(p.getElementsByTagName("w:t"));
          const text = tElements
            .map((t) => t.textContent || "")
            .join("")
            .trim();

          if (text.length > 0) {
            results.push({ text, isHeading });
          }
        }
        if (results.length > 0) return results;
      }
    } catch {
      // Fall through to regex parser
    }
  }

  // Fallback regex parser for Node / non-DOM environments
  const paragraphMatches = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const results: { text: string; isHeading: boolean }[] = [];

  for (const pXml of paragraphMatches) {
    const isHeading =
      /<w:pStyle[^>]*w:val="[^"]*(?:heading|judul|title)[^"]*"/i.test(pXml);

    const tMatches = Array.from(pXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g));
    const text = tMatches
      .map((m) => decodeXmlEntities(m[1] || ""))
      .join("")
      .trim();

    if (text.length > 0) {
      results.push({ text, isHeading });
    }
  }

  return results;
}

/**
 * Convert structured paragraphs into chapters.
 */
function organizeParagraphsIntoChapters(
  paragraphs: { text: string; isHeading: boolean }[],
  fallbackTitle: string,
): ExtractedChapter[] {
  if (paragraphs.length === 0) {
    return [];
  }

  const chapters: ExtractedChapter[] = [];
  let currentChapterNumber = 0;
  let currentTitle = "";
  let currentParagraphs: string[] = [];

  const flushChapter = () => {
    if (currentParagraphs.length > 0 || currentTitle) {
      const content = currentParagraphs.join("\n\n").trim();
      const words = countWords(content);
      const estimatedMinutes = Math.max(1, Math.round(words / 200));

      chapters.push({
        chapterNumber: currentChapterNumber,
        titleId: currentTitle.slice(0, 255),
        contentId: content || currentTitle,
        estimatedMinutes,
      });
    }
  };

  for (const para of paragraphs) {
    const headingMatch = para.text.match(CHAPTER_HEADING_REGEX);

    if (headingMatch || (para.isHeading && para.text.length < 120)) {
      // Flush previous chapter if exists
      if (currentChapterNumber > 0) {
        flushChapter();
        currentParagraphs = [];
      }

      currentChapterNumber = chapters.length + 1;
      currentTitle = para.text.trim();
    } else {
      if (currentChapterNumber === 0) {
        // Start first chapter if no explicit header at the very top
        currentChapterNumber = 1;
        currentTitle = fallbackTitle || "Bab 1: Pendahuluan";
      }
      currentParagraphs.push(para.text);
    }
  }

  // Flush last chapter
  if (currentChapterNumber > 0) {
    flushChapter();
  }

  return chapters;
}

/**
 * Parse plain text string into chapters.
 */
function parseTxtToChapters(
  text: string,
  fallbackTitle: string,
): ExtractedChapter[] {
  const lines = text.split(/\r?\n/);
  const paragraphs: { text: string; isHeading: boolean }[] = [];
  let currentBlock: string[] = [];

  const flushBlock = () => {
    const raw = currentBlock.join(" ").trim();
    if (raw.length > 0) {
      paragraphs.push({ text: raw, isHeading: false });
    }
    currentBlock = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    if (CHAPTER_HEADING_REGEX.test(trimmed)) {
      flushBlock();
      paragraphs.push({ text: trimmed, isHeading: true });
    } else {
      currentBlock.push(trimmed);
    }
  }
  flushBlock();

  return organizeParagraphsIntoChapters(paragraphs, fallbackTitle);
}

/**
 * Main entry point: extracts manuscript chapters from a File object (.docx or .txt)
 * purely in browser memory without sending binary data to any server.
 */
export async function extractManuscriptFromFile(
  file: File,
): Promise<ExtractionResult> {
  if (!file) {
    throw new Error("Berkas tidak dipilih.");
  }

  if (file.size === 0) {
    throw new Error("Berkas kosong (0 byte).");
  }

  const name = file.name.toLowerCase();
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const xml = await extractWordDocumentXml(arrayBuffer);
    const paragraphs = parseDocxXmlToParagraphs(xml);

    if (paragraphs.length === 0) {
      throw new Error(
        "Dokumen .docx tidak memuat teks paragraf yang dapat diekstrak.",
      );
    }

    const chapters = organizeParagraphsIntoChapters(
      paragraphs,
      `Bab 1: ${baseName}`,
    );

    if (chapters.length === 0) {
      throw new Error("Tidak ada bab yang berhasil diekstrak dari berkas .docx.");
    }

    const totalWords = chapters.reduce(
      (sum, ch) => sum + countWords(ch.contentId),
      0,
    );
    const estimatedTotalMinutes = chapters.reduce(
      (sum, ch) => sum + ch.estimatedMinutes,
      0,
    );

    return {
      titleCandidate: baseName,
      chapters,
      totalWords,
      estimatedTotalMinutes,
      fileType: "docx",
    };
  }

  if (name.endsWith(".txt")) {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error("Berkas teks .txt kosong.");
    }

    const chapters = parseTxtToChapters(text, `Bab 1: ${baseName}`);

    if (chapters.length === 0) {
      throw new Error("Tidak ada bab yang berhasil diekstrak dari berkas .txt.");
    }

    const totalWords = chapters.reduce(
      (sum, ch) => sum + countWords(ch.contentId),
      0,
    );
    const estimatedTotalMinutes = chapters.reduce(
      (sum, ch) => sum + ch.estimatedMinutes,
      0,
    );

    return {
      titleCandidate: baseName,
      chapters,
      totalWords,
      estimatedTotalMinutes,
      fileType: "txt",
    };
  }

  throw new Error(
    "Format berkas tidak didukung. Harap unggah berkas berekstensi .docx atau .txt.",
  );
}
