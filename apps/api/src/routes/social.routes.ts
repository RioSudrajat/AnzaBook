import { Router } from "express";
import {
  applyAuthorSchema,
  followUserSchema,
  updateProfileBioSchema,
} from "@starter/shared/validators/social";
import { getAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  applyOfficialAuthor,
  exploreAuthors,
  exploreReaders,
  followUser,
  getSocialProfile,
  unfollowUser,
  updateMySocialProfile,
} from "../services/social.service";

export const socialRouter = Router();

// Current user profile
socialRouter.get("/me", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const profile = await getSocialProfile(userId, userId);
  res.json({ data: profile });
});

socialRouter.patch(
  "/me",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = updateProfileBioSchema.parse(req.body);
    const profile = await updateMySocialProfile(userId, input);
    res.json({ data: profile });
  },
);

socialRouter.patch(
  "/profile",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = updateProfileBioSchema.parse(req.body);
    const profile = await updateMySocialProfile(userId, input);
    res.json({ data: profile });
  },
);

// 4D Explore Directories: Authors & Readers
socialRouter.get("/explore/authors", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const query = typeof req.query.query === "string" ? req.query.query : undefined;
  const authors = await exploreAuthors(currentUserId, query);
  res.json({ data: authors });
});

socialRouter.get("/explore/readers", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const query = typeof req.query.query === "string" ? req.query.query : undefined;
  const readers = await exploreReaders(currentUserId, query);
  res.json({ data: readers });
});

// Official Author Application
socialRouter.post(
  "/author-applications",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = applyAuthorSchema.parse(req.body);
    const application = await applyOfficialAuthor(userId, input);
    res.status(201).json({ data: application });
  },
);

// Public profile by username or userId
socialRouter.get("/users/:username", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const username = String(req.params.username);
  const profile = await getSocialProfile(username, currentUserId);
  res.json({ data: profile });
});

// Follow user
socialRouter.post(
  "/users/:userId/follow",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const currentUserId = getAuth(req).user.id;
    const targetUserId = String(req.params.userId);
    const isSubscribedUpdates =
      typeof req.body?.isSubscribedUpdates === "boolean"
        ? req.body.isSubscribedUpdates
        : true;

    const result = await followUser(
      currentUserId,
      targetUserId,
      isSubscribedUpdates,
    );
    res.json({ data: result });
  },
);

// Unfollow user
socialRouter.delete(
  "/users/:userId/follow",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const currentUserId = getAuth(req).user.id;
    const targetUserId = String(req.params.userId);
    const result = await unfollowUser(currentUserId, targetUserId);
    res.json({ data: result });
  },
);
