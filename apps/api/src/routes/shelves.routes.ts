import { Router } from "express";
import { upsertShelfSchema } from "@starter/shared/validators/community";
import { getAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { getUserShelves, upsertShelf } from "../services/community.service";

export const shelvesRouter = Router();

shelvesRouter.use(requireAuth);

shelvesRouter.get("/", async (req, res) => {
  const shelves = await getUserShelves(getAuth(req).user.id);
  res.json({ data: shelves });
});

shelvesRouter.post("/", requireTrustedOrigin, jsonBody, async (req, res) => {
  const input = upsertShelfSchema.parse(req.body);
  const shelf = await upsertShelf(getAuth(req).user.id, input);
  res.status(200).json({ data: shelf });
});
