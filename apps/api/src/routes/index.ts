import { Router } from "express";
import { noStore } from "../middleware/no-store";
import { adminRouter } from "./admin.routes";
import { booksRouter } from "./books.routes";
import { eventsRouter } from "./events.routes";
import { healthRouter } from "./health.routes";
import { membershipRouter } from "./membership.routes";
import { notesRouter } from "./notes.routes";
import { publisherRouter } from "./publisher.routes";
import { readingRouter } from "./reading.routes";
import { shelvesRouter } from "./shelves.routes";

// Mounted at /api. Add a router per resource and register it here.
export const apiRouter = Router();

apiRouter.use(noStore);
apiRouter.use("/health", healthRouter);
apiRouter.use("/notes", notesRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/books", booksRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/membership", membershipRouter);
apiRouter.use("/reading", readingRouter);
apiRouter.use("/reading-sessions", readingRouter);
apiRouter.use("/shelves", shelvesRouter);
apiRouter.use("/publisher", publisherRouter);
