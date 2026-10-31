import { Router } from "express";
import {
  createReadingSessionSchema,
  listReadingSessionsQuerySchema,
} from "@starter/shared/validators/reading";
import { getAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  createReadingSession,
  listReadingSessions,
} from "../services/reading.service";

export const readingRouter = Router();

readingRouter.use(requireAuth);

readingRouter.get("/", async (req, res) => {
  const query = listReadingSessionsQuerySchema.parse(req.query);
  const result = await listReadingSessions(getAuth(req).user.id, query);
  res.json(result);
});

readingRouter.post("/", requireTrustedOrigin, jsonBody, async (req, res) => {
  const input = createReadingSessionSchema.parse(req.body);
  const session = await createReadingSession(getAuth(req).user.id, input);
  res.status(201).json({ data: session });
});
