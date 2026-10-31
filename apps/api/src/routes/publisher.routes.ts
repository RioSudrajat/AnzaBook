import { Router } from "express";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import { simulatePrintSchema } from "@starter/shared/validators/publisher";
import { jsonBody } from "../middleware/body";

export const publisherRouter = Router();

publisherRouter.post("/simulate", jsonBody, async (req, res) => {
  const input = simulatePrintSchema.parse(req.body);
  const result = calculatePrintEconomics(input);
  res.json({ data: result });
});
