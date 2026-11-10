export type CardFormat = "speed_sticker" | "receipt" | "quote";
export type CardAspect = "square" | "story";

export type RenderCanvasOptions = {
  format: CardFormat;
  aspect: CardAspect;
  userName: string;
  bookTitle: string;
  author: string;
  quoteText?: string;
  pagesRead: number;
  durationMinutes: number;
  wpm: number;
  streakDays: number;
  totalSavedIdr?: number;
  isTransparent?: boolean;
};

export function renderLiteracyCanvas(
  canvas: HTMLCanvasElement,
  options: RenderCanvasOptions,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = options.aspect === "story" ? 1080 : 1080;
  const height = options.aspect === "story" ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  if (options.format === "speed_sticker") {
    renderSpeedSticker(ctx, width, height, options);
  } else if (options.format === "receipt") {
    renderReceipt(ctx, width, height, options);
  } else {
    renderQuoteCard(ctx, width, height, options);
  }
}

function renderSpeedSticker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: RenderCanvasOptions,
) {
  // Background
  if (!opts.isTransparent) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#191613");
    bgGrad.addColorStop(1, "#0D0B0A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  const cx = width / 2;
  const topY = opts.aspect === "story" ? 420 : 140;

  // Header Badge
  ctx.save();
  ctx.fillStyle = "#A35C37";
  ctx.fillRect(cx - 190, topY, 380, 48);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px 'Red Hat Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STRAVA LITERASI • ANZABOOK", cx, topY + 24);
  ctx.restore();

  // Streak Badge
  ctx.save();
  ctx.fillStyle = "#F6F2E9";
  ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔥 ${opts.streakDays} HARI BERUNTUN`, cx, topY + 110);
  ctx.restore();

  // Speed Gauge Box
  const boxW = 560;
  const boxH = 260;
  const boxY = topY + 160;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.strokeStyle = "#A35C37";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - boxW / 2, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // Big WPM Number
  ctx.fillStyle = "#E88A58";
  ctx.font = "bold 110px 'Red Hat Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.wpm}`, cx, boxY + 140);

  ctx.fillStyle = "#D6CFBE";
  ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("KATA PER MENIT (WPM)", cx, boxY + 200);
  ctx.restore();

  // Reading Metrics Row
  const metricsY = boxY + boxH + 80;
  ctx.save();
  ctx.fillStyle = "#F6F2E9";
  ctx.font = "bold 36px 'Literata', serif";
  ctx.textAlign = "center";
  ctx.fillText(`"${opts.bookTitle}"`, cx, metricsY);

  ctx.fillStyle = "#A89F91";
  ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`Karya ${opts.author}`, cx, metricsY + 45);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px 'Red Hat Mono', monospace";
  ctx.fillText(
    `${opts.pagesRead} Halaman • ${opts.durationMinutes} Menit Baca`,
    cx,
    metricsY + 110,
  );
  ctx.restore();

  // User Footer
  const footerY = opts.aspect === "story" ? height - 200 : height - 100;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "20px 'Red Hat Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`Pembaca: @${opts.userName} • AnzaBook ID`, cx, footerY);
  ctx.restore();
}

function renderReceipt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: RenderCanvasOptions,
) {
  // Paper Background
  ctx.fillStyle = "#F4F0E6";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const paperW = 860;
  const paperX = (width - paperW) / 2;
  const topY = opts.aspect === "story" ? 280 : 100;

  // Receipt Content Box
  ctx.save();
  ctx.fillStyle = "#FAF8F2";
  ctx.strokeStyle = "#DDD5C7";
  ctx.lineWidth = 2;
  ctx.fillRect(paperX, topY, paperW, height - topY * 2);
  ctx.strokeRect(paperX, topY, paperW, height - topY * 2);

  // Jagged paper header border
  ctx.fillStyle = "#221E1B";
  ctx.textAlign = "center";
  ctx.font = "bold 34px 'Red Hat Mono', monospace";
  ctx.fillText("ANZABOOK LITERACY RECEIPT", cx, topY + 70);

  ctx.font = "20px 'Red Hat Mono', monospace";
  ctx.fillStyle = "#6B6357";
  ctx.fillText("CABANG KOMUNITAS BACA NASIONAL #001", cx, topY + 110);
  ctx.fillText(
    `TANGGAL: ${new Date().toLocaleDateString("id-ID")}`,
    cx,
    topY + 145,
  );
  ctx.fillText(
    "------------------------------------------------",
    cx,
    topY + 185,
  );

  // Items
  const startItemY = topY + 240;
  ctx.textAlign = "left";
  ctx.fillStyle = "#221E1B";
  ctx.font = "bold 24px 'Red Hat Mono', monospace";
  ctx.fillText(opts.bookTitle.slice(0, 32), paperX + 40, startItemY);

  ctx.font = "20px 'Red Hat Mono', monospace";
  ctx.fillStyle = "#6B6357";
  ctx.fillText(
    "Edisi Cetak Rakyat (Newsprint 48.8 gsm)",
    paperX + 40,
    startItemY + 36,
  );

  ctx.textAlign = "right";
  ctx.font = "22px 'Red Hat Mono', monospace";
  ctx.fillText("Rp38.000", paperX + paperW - 40, startItemY + 36);

  // Price comparison
  ctx.textAlign = "left";
  ctx.fillStyle = "#6B6357";
  ctx.fillText("Harga Ritel Standar Toko:", paperX + 40, startItemY + 100);
  ctx.textAlign = "right";
  ctx.fillText("Rp98.000", paperX + paperW - 40, startItemY + 100);

  ctx.textAlign = "center";
  ctx.fillText(
    "------------------------------------------------",
    cx,
    startItemY + 150,
  );

  // Big Savings Banner
  const totalSaved = opts.totalSavedIdr || 60000;
  ctx.fillStyle = "#2E5C38";
  ctx.font = "bold 36px 'Red Hat Mono', monospace";
  ctx.fillText(
    `TOTAL PENGHEMATAN: Rp${totalSaved.toLocaleString("id-ID")}`,
    cx,
    startItemY + 210,
  );

  ctx.font = "22px 'Red Hat Mono', monospace";
  ctx.fillText(
    "(Hemat 61% untuk Literasi Berkelanjutan)",
    cx,
    startItemY + 255,
  );

  // Barcode simulation
  const barcodeY = startItemY + 330;
  ctx.fillStyle = "#221E1B";
  for (let x = paperX + 100; x < paperX + paperW - 100; x += 8) {
    const barW = (x * 7) % 5 === 0 ? 5 : 2;
    ctx.fillRect(x, barcodeY, barW, 60);
  }

  ctx.font = "18px 'Red Hat Mono', monospace";
  ctx.fillStyle = "#6B6357";
  ctx.fillText("AZ-RAKYAT-2026-BACA-BERDAULAT", cx, barcodeY + 95);
  ctx.fillText(`Verifikasi: @${opts.userName}`, cx, barcodeY + 130);

  ctx.restore();
}

function renderQuoteCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: RenderCanvasOptions,
) {
  // Deep warm literary background
  ctx.fillStyle = "#161311";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const quote =
    opts.quoteText ||
    "Buku tidak seharusnya menjadi barang mewah. Ilmu pengetahuan adalah hak setiap insan yang bernapas.";

  const topY = opts.aspect === "story" ? 480 : 260;

  // Huge stylized quotes
  ctx.save();
  ctx.fillStyle = "rgba(163, 92, 55, 0.35)";
  ctx.font = "italic 160px 'Literata', serif";
  ctx.textAlign = "center";
  ctx.fillText("“", cx, topY);

  // Quote Paragraph wrap
  ctx.fillStyle = "#F6F2E9";
  ctx.font = "italic 44px 'Literata', serif";
  ctx.textAlign = "center";

  const words = quote.split(" ");
  let line = "";
  let curY = topY + 70;
  const maxLineW = 760;

  for (const w of words) {
    const testLine = line + w + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxLineW && line !== "") {
      ctx.fillText(line, cx, curY);
      line = w + " ";
      curY += 66;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, cx, curY);

  // Author & Book attribution
  const attrY = curY + 100;
  ctx.fillStyle = "#E88A58";
  ctx.font = "bold 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`Penulis: ${opts.author}`, cx, attrY);

  ctx.fillStyle = "#A89F91";
  ctx.font = "22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`Dalam karya "${opts.bookTitle}"`, cx, attrY + 40);

  // Footer Seal
  const footY = opts.aspect === "story" ? height - 200 : height - 90;
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "18px 'Red Hat Mono', monospace";
  ctx.fillText(`AnzaBook • Dibaca oleh @${opts.userName}`, cx, footY);

  ctx.restore();
}

export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
