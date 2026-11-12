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
  getUserFollowers,
  getUserFollowing,
  togglePostHighlight,
  togglePostSession,
  unfollowUser,
  unifiedExplore,
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

// Unified Explore Search Engine (Substack / Instagram style)
socialRouter.get("/explore", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const sort = req.query.sort === "latest" ? "latest" : "top";
  const result = await unifiedExplore(currentUserId, { q, category, sort });
  res.json({ data: result });
});

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

// User followers list
socialRouter.get("/users/:username/followers", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const username = String(req.params.username);
  const followers = await getUserFollowers(username, currentUserId);
  res.json({ data: followers });
});

// User following list
socialRouter.get("/users/:username/following", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const username = String(req.params.username);
  const following = await getUserFollowing(username, currentUserId);
  res.json({ data: following });
});

// Follow user
socialRouter.post(
  "/users/:userId/follow",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const currentUserId = getAuth(req).user.id;
    const input = followUserSchema.parse({
      targetUserId: String(req.params.userId),
      ...(req.body ?? {}),
    });

    const result = await followUser(
      currentUserId,
      input.targetUserId,
      input.isSubscribedUpdates,
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

// Toggle post highlight/quote to public feed
socialRouter.post(
  "/highlights/:id/toggle-post",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const highlightId = String(req.params.id);
    const isPosted =
      typeof req.body?.isPosted === "boolean" ? req.body.isPosted : undefined;
    const result = await togglePostHighlight(userId, highlightId, isPosted);
    res.json({ data: result });
  },
);

// Toggle post reading session to public feed
socialRouter.post(
  "/sessions/:id/toggle-post",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const sessionId = String(req.params.id);
    const isPosted =
      typeof req.body?.isPosted === "boolean" ? req.body.isPosted : undefined;
    const note = typeof req.body?.note === "string" ? req.body.note : undefined;
    const result = await togglePostSession(userId, sessionId, {
      note,
      isPosted,
    });
    res.json({ data: result });
  },
);
