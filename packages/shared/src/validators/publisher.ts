import { z } from "zod";

export const simulatePrintSchema = z
  .object({
    pageCount: z
      .number()
      .int("Jumlah halaman harus berupa bilangan bulat")
      .min(24, "Jumlah halaman minimal 24")
      .max(1200, "Jumlah halaman maksimal 1200"),
    printRun: z
      .number()
      .int("Oplah cetak harus berupa bilangan bulat")
      .min(100, "Oplah minimal 100 eksemplar")
      .max(50000, "Oplah maksimal 50000 eksemplar"),
    authorRoyaltyPct: z
      .number()
      .min(5, "Royalti penulis minimal 5%")
      .max(25, "Royalti penulis maksimal 25%")
      .default(12),
  })
  .strict();

export type SimulatePrintSchemaInput = z.infer<typeof simulatePrintSchema>;
