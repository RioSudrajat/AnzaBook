export type SimulatePrintInput = {
  pageCount: number;
  printRun: number;
  authorRoyaltyPct?: number;
};

export type EditionTier =
  "rakyat_economy" | "standard_trade" | "kolektor_hardcover";

export type PrintTierResult = {
  editionTier: EditionTier;
  editionName: string;
  paperType: string;
  coverFinishing: string;
  hppPerUnitIdr: number;
  breakEvenUnits: number;
  authorRoyaltyPerUnitIdr: number;
  recommendedPriceIdr: number;
  traditionalRetailPriceIdr: number;
  savingsPercentVsTraditional: number;
};

export type PrintEconomicsResult = {
  input: Required<SimulatePrintInput>;
  tiers: PrintTierResult[];
  summary: string;
};

export function calculatePrintEconomics(
  rawInput: SimulatePrintInput,
): PrintEconomicsResult {
  const pageCount = Math.max(
    24,
    Math.min(1200, Math.round(rawInput.pageCount)),
  );
  const printRun = Math.max(
    100,
    Math.min(50000, Math.round(rawInput.printRun)),
  );
  const authorRoyaltyPct =
    rawInput.authorRoyaltyPct !== undefined
      ? Math.max(5, Math.min(25, rawInput.authorRoyaltyPct))
      : 12;

  // 1. Edisi Rakyat (Newsprint 48.8 gsm)
  const rakyatPlateCost = 1200000 / printRun;
  const rakyatPaperCost = pageCount * 42; // ~42 IDR per page for 48.8 gsm newsprint
  const rakyatCoverCost = 2800; // Art carton 210gsm doff
  const rakyatBindingCost = 1500; // Standard glue binding
  const rakyatDistributionOverhead = 1800; // Direct reader packing & community hub
  const rakyatHpp = Math.round(
    rakyatPlateCost +
      rakyatPaperCost +
      rakyatCoverCost +
      rakyatBindingCost +
      rakyatDistributionOverhead,
  );

  // Recommended direct price: target 35% margin + royalty, rounded to nearest 1,000 IDR
  const rawRakyatPrice = (rakyatHpp * 1.4) / (1 - authorRoyaltyPct / 100);
  const rakyatRecommendedPrice = Math.min(
    49000,
    Math.max(25000, Math.round(rawRakyatPrice / 1000) * 1000),
  );
  const rakyatAuthorRoyalty = Math.round(
    (rakyatRecommendedPrice * authorRoyaltyPct) / 100,
  );
  const rakyatBreakEven = Math.ceil(
    (1200000 +
      (rakyatPaperCost + rakyatCoverCost + rakyatBindingCost) * printRun) /
      rakyatRecommendedPrice,
  );

  // 2. Standard Trade Edition (Bookpaper 72 gsm)
  const standardPlateCost = 1500000 / printRun;
  const standardPaperCost = pageCount * 70; // ~70 IDR per page for 72 gsm bookpaper
  const standardCoverCost = 5500; // Art carton 260gsm laminasi doff + spot uv
  const standardBindingCost = 3000;
  const standardDistributionOverhead = 2500;
  const standardHpp = Math.round(
    standardPlateCost +
      standardPaperCost +
      standardCoverCost +
      standardBindingCost +
      standardDistributionOverhead,
  );

  // Traditional bookstore retail calculation:
  // Bookstores take 45-50% cut, distributors take 15%, publisher needs 20%, author gets royalty.
  // Standard bookstore price is roughly 3.2x to 3.5x standard HPP.
  const standardTraditionalRetail =
    Math.round((standardHpp * 3.3) / 1000) * 1000;
  const standardRecommendedPrice =
    Math.round((standardHpp * 1.8) / 1000) * 1000;
  const standardAuthorRoyalty = Math.round(
    (standardRecommendedPrice * authorRoyaltyPct) / 100,
  );
  const standardBreakEven = Math.ceil(
    (1500000 +
      (standardPaperCost + standardCoverCost + standardBindingCost) *
        printRun) /
      standardRecommendedPrice,
  );
  const standardSavingsPercent = Math.max(
    0,
    Math.round(
      (1 - standardRecommendedPrice / standardTraditionalRetail) * 100,
    ),
  );

  const rakyatTraditionalRetail = standardTraditionalRetail;
  const rakyatSavingsPercent = Math.max(
    0,
    Math.round((1 - rakyatRecommendedPrice / rakyatTraditionalRetail) * 100),
  );

  // 3. Kolektor Hardcover (Bookpaper 80 gsm Premium + Hardboard)
  const kolektorPlateCost = 2200000 / printRun;
  const kolektorPaperCost = pageCount * 92;
  const kolektorCoverCost = 22000; // Hardcover board No. 30 + foil gold + ribbon + dust jacket
  const kolektorBindingCost = 8000; // Sewing + glue
  const kolektorDistributionOverhead = 4000;
  const kolektorHpp = Math.round(
    kolektorPlateCost +
      kolektorPaperCost +
      kolektorCoverCost +
      kolektorBindingCost +
      kolektorDistributionOverhead,
  );

  const kolektorTraditionalRetail =
    Math.round((kolektorHpp * 3.1) / 1000) * 1000;
  const kolektorRecommendedPrice =
    Math.round((kolektorHpp * 1.9) / 1000) * 1000;
  const kolektorAuthorRoyalty = Math.round(
    (kolektorRecommendedPrice * authorRoyaltyPct) / 100,
  );
  const kolektorBreakEven = Math.ceil(
    (2200000 +
      (kolektorPaperCost + kolektorCoverCost + kolektorBindingCost) *
        printRun) /
      kolektorRecommendedPrice,
  );
  const kolektorSavingsPercent = Math.max(
    0,
    Math.round(
      (1 - kolektorRecommendedPrice / kolektorTraditionalRetail) * 100,
    ),
  );

  const tiers: PrintTierResult[] = [
    {
      editionTier: "rakyat_economy",
      editionName: "Edisi Rakyat (Newsprint)",
      paperType: "Newsprint Halus 48.8 gsm",
      coverFinishing: "Softcover Art Carton 210gsm Doff",
      hppPerUnitIdr: rakyatHpp,
      breakEvenUnits: Math.min(printRun, rakyatBreakEven),
      authorRoyaltyPerUnitIdr: rakyatAuthorRoyalty,
      recommendedPriceIdr: rakyatRecommendedPrice,
      traditionalRetailPriceIdr: rakyatTraditionalRetail,
      savingsPercentVsTraditional: rakyatSavingsPercent,
    },
    {
      editionTier: "standard_trade",
      editionName: "Edisi Standar (Bookpaper)",
      paperType: "Bookpaper Krem 72 gsm",
      coverFinishing: "Softcover AC 260gsm Doff + Spot UV",
      hppPerUnitIdr: standardHpp,
      breakEvenUnits: Math.min(printRun, standardBreakEven),
      authorRoyaltyPerUnitIdr: standardAuthorRoyalty,
      recommendedPriceIdr: standardRecommendedPrice,
      traditionalRetailPriceIdr: standardTraditionalRetail,
      savingsPercentVsTraditional: standardSavingsPercent,
    },
    {
      editionTier: "kolektor_hardcover",
      editionName: "Edisi Kolektor (Hardcover)",
      paperType: "Bookpaper Premium 80 gsm",
      coverFinishing: "Hardcover Board No. 30 + Foil Emas + Pembatas Pita",
      hppPerUnitIdr: kolektorHpp,
      breakEvenUnits: Math.min(printRun, kolektorBreakEven),
      authorRoyaltyPerUnitIdr: kolektorAuthorRoyalty,
      recommendedPriceIdr: kolektorRecommendedPrice,
      traditionalRetailPriceIdr: kolektorTraditionalRetail,
      savingsPercentVsTraditional: kolektorSavingsPercent,
    },
  ];

  return {
    input: {
      pageCount,
      printRun,
      authorRoyaltyPct,
    },
    tiers,
    summary: `Edisi Rakyat memotong hingga ${rakyatSavingsPercent}% harga ritel konvensional dengan memotong potongan distributor 45-50% dan memakai kertas Newsprint 48.8 gsm ramah baca.`,
  };
}
