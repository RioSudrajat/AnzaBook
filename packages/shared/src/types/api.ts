// The JSON contract between the API and the web app. Timestamps cross the wire
// as ISO strings, so these are the shapes the browser actually receives.
import type { EventTheme, MeetingPlatform } from "../validators/community";
import type {
  SpotCategory,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotReportReason,
  SpotReviewTag,
  SpotSource,
  SpotStatus,
  SpotVerifiedBadge,
} from "../validators/spots";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
};

export type PageMeta = {
  limit: number;
  offset: number;
  hasMore: boolean;
  total?: number;
};

export type Paginated<T> = { data: T[]; meta: PageMeta };

export type DataResponse<T> = { data: T };

export type NoteDto = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminNoteDto = NoteDto & { ownerName: string; ownerEmail: string };

// ---------------- AnzaBook DTOs ---------------- //

export type BookDistributionModel =
  "free_open" | "nakama_subscription" | "single_purchase";
export type ManuscriptSourceLanguage = "id" | "en";
export type ManuscriptTargetAudience =
  "general" | "young_adult" | "mature_academic";
export type AuthorStatus = "none" | "pending" | "verified" | "rejected";
export type AccessTier = "free" | "premium";
export type EditionTier =
  "rakyat_economy" | "standard_trade" | "kolektor_hardcover";
export type PartnerType =
  "gramedia" | "togamas" | "pos_indonesia" | "komunitas";
export type ShelfStatus = "want_to_read" | "reading" | "finished" | "abandoned";
export type ReadingMode = "full" | "blueprint" | "audio";
export type HighlightColor = "yellow" | "green" | "coral" | "blue";

export type QuoteTemplate =
  "book_cover" | "furrow_paper" | "night_stabilo" | "cover_tint";

export type SessionTemplate =
  "cover_trail" | "photo_overlay" | "transparent_sticker" | "literary_index";

export type CardAspect = "square" | "story" | "4:3";

export type QuotePostConfig = {
  template: QuoteTemplate;
  aspect: CardAspect;
  alignment: "left" | "center";
  includeNote: boolean;
};

export type SessionPostConfig = {
  template: SessionTemplate;
  aspect: CardAspect;
  showWpm: boolean;
  showDuration: boolean;
  showPages: boolean;
  stickerInk?: "light" | "dark";
};

export type BookPrintEditionDto = {
  id: string;
  bookId: string;
  tier: EditionTier;
  tierName: string;
  paperType: string;
  coverType: string;
  bindingType: string;
  priceIdr: number;
  traditionalStorePriceIdr: number;
  savingsPercent: number;
  weightGrams: number;
  inStock: boolean;
};

export type StoreStockItemDto = {
  id: string;
  branchName: string;
  partnerType: PartnerType;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  rakyatStock: number;
  standardStock: number;
  lastStockCheck: string;
};

export type BookSummaryDto = {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorAvatar: string | null;
  editor: string | null;
  editorAvatar: string | null;
  coverUrl: string;
  coverColor: string;
  synopsis: string;
  bulletinExcerpt: string | null;
  publishedYear: number;
  pageCount: number;
  totalChapters: number;
  readingMinutes: number;
  audioDurationMinutes: number;
  digitalPolicy: BookDistributionModel;
  accessTier: AccessTier;
  hasPhysical: boolean;
  isWeeklyBulletin: boolean;
  rakyatPriceIdr: number;
  standardPriceIdr: number;
  ratingAvg: number;
  ratingCount: number;
  availableLanguages: string[];
  categories: string[];
  collectionName: string | null;
  genres: string[];
  publisherId?: string | null;
  publisherSlug?: string | null;
  publisherName?: string | null;
  publisherLogoUrl?: string | null;
  authorUserId?: string | null;
  authorUsername?: string | null;
  digitalPriceIdr?: number | null;
};

export type BookDetailDto = BookSummaryDto & {
  chapters: BookChapterSummaryDto[];
  editions: BookPrintEditionDto[];
  storeStocks: StoreStockItemDto[];
  hasClaimedDigital: boolean;
  hasPurchasedDigital?: boolean;
  checkoutAvailable?: boolean;
  isArchived?: boolean;
  totalShelved: number;
  upcomingEvents?: CommunityEventSummaryDto[];
};

export type BookChapterSummaryDto = {
  id: string;
  chapterNumber: number;
  title: string;
  isSample: boolean;
  wordCount?: number;
};

export type BookReaderChapterDto = {
  id: string;
  chapterNumber: number;
  title: string;
  contentId: string;
  contentEn: string | null;
  blueprintContent: string;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  fullWordCount?: number;
  isPreviewTruncated?: boolean;
};

export type BookReaderPayloadDto = {
  book: BookSummaryDto;
  mode: ReadingMode;
  currentChapter: BookReaderChapterDto;
  chapters?: BookReaderChapterDto[];
  allChapters: BookChapterSummaryDto[];
  hasFullAccess: boolean;
  accessExpiresAt: string | null;
  hasEventSampleAccess?: boolean;
};

export type ReadingSessionDto = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl?: string | null;
  title?: string | null;
  pagesRead: number;
  wordsRead?: number | null;
  durationSeconds: number;
  avgWpm: number;
  mode: ReadingMode;
  startProgressPercent?: number | null;
  endProgressPercent?: number | null;
  startChapterNumber?: number | null;
  endChapterNumber?: number | null;
  highlightsCount?: number;
  isValidForRoyalty?: boolean;
  isPosted?: boolean;
  note?: string | null;
  postConfig?: SessionPostConfig | null;
  postedAt?: string | null;
  createdAt: string;
};

export type ReadingTelemetrySummaryDto = {
  totalMinutesRead: number;
  totalPagesRead: number;
  currentStreakDays: number;
  booksCompleted: number;
  avgWpm: number;
};

export type ShelfItemDto = {
  id: string;
  bookId: string;
  book: BookSummaryDto;
  shelfStatus: ShelfStatus;
  favorite: boolean;
  progressPercent: number;
  previewProgressPercent?: number | null;
  previewBookPercent?: number | null;
  updatedAt: string;
};

export type BookReviewDto = {
  id: string;
  bookId: string;
  userName: string;
  userRole: string;
  rating: number;
  content: string;
  editionTierReviewed: string;
  createdAt: string;
};

export type ParagraphCommentDto = {
  id: string;
  chapterId: string;
  paragraphIndex: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type BookHighlightDto = {
  id: string;
  userId: string;
  bookId: string;
  bookSlug?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  bookPublishedYear?: number | null;
  bookGenres?: string[];
  bookPageCount?: number | null;
  chapterId: string | null;
  chapterNumber: number;
  pageNumber: number;
  selectedText: string;
  color: HighlightColor;
  note: string | null;
  postCaption?: string | null;
  postConfig?: QuotePostConfig | null;
  isPosted?: boolean;
  postedAt?: string | null;
  createdAt: string;
};

export type ReadingProgressDto = {
  bookId: string;
  lastChapterId: string | null;
  lastChapterNumber: number;
  lastPageNumber: number;
  lastScrollPercent: number;
  lastParagraphIndex: number | null;
  layout: "scroll" | "slide" | null;
  capturedAt: number;
  updatedAt: string;
};

export type ReadingProgressScope = "full" | "preview";

export type AuthorSummaryDto = {
  name: string;
  avatarUrl: string | null;
  bookCount: number;
};

export type CollectionSummaryDto = {
  name: string;
  slug: string;
  bookCount: number;
  coverUrl?: string;
};

// ---------------- Community Calendars & Events DTOs ---------------- //

export type LocationSuggestionDto = {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string | null;
  latitude: number;
  longitude: number;
  mapsUrl?: string | null;
  source: "partner_store" | "recent_venue";
  isStoreBranch?: boolean;
};

export type VerificationDocumentDto = {
  title: string;
  url: string;
  fileType?: string;
};

export type CommunityCalendarMemberDto = {
  id: string;
  userId: string;
  name: string;
  username?: string | null;
  image: string | null;
  role: "owner" | "admin" | "checkin_staff" | "member";
  createdAt: string;
};

export type CommunityCalendarDto = {
  id: string;
  slug: string;
  name: string;
  type: "community" | "author" | "publisher";
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  contactEmail: string | null;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    website?: string;
    discord?: string;
    telegram?: string;
    whatsapp?: string;
  } | null;
  verificationStatus: "pending" | "verified" | "trusted" | "rejected";
  rejectionReason?: string | null;
  verificationDocuments?: VerificationDocumentDto[] | null;
  followerCount: number;
  isFollowing?: boolean;
  isManager?: boolean;
  isMember?: boolean;
  memberRole?: "owner" | "admin" | "checkin_staff" | "member" | null;
  createdAt: string;
};

export type FeaturedWorkDto = {
  mediaType: "book" | "film" | "article" | "other";
  title: string;
  creator?: string;
  externalUrl?: string;
};

export type EventCoHostDto = {
  userId?: string;
  name: string;
  avatarUrl?: string;
  roleLabel?: string;
};

export type EventAttendeePreviewDto = {
  userId: string;
  name: string;
  image: string | null;
};

export type CommunityEventSummaryDto = {
  id: string;
  slug: string;
  calendarId: string;
  calendarSlug: string;
  calendarName: string;
  calendarAvatarUrl: string | null;
  bookId: string | null;
  bookSummary?: BookSummaryDto | null;
  featuredWork: FeaturedWorkDto | null;
  title: string;
  description: string;
  coverUrl: string;
  themePreset: EventTheme;
  visibility: "public" | "private_link";
  eventType:
    | "book_club"
    | "film_discussion"
    | "silent_reading"
    | "book_launch"
    | "writing_session"
    | "community_meetup";
  categoryTag: string;
  coHosts: EventCoHostDto[];
  format: "offline" | "online" | "hybrid";
  district: string | null;
  city: string | null;
  venueName: string | null;
  venueAddress: string | null;
  hideAddressUntilApproved: boolean;
  isAddressHidden: boolean;
  latitude: number | null;
  longitude: number | null;
  meetingPlatform?: MeetingPlatform | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  requiresApproval: boolean;
  allowWaitlist: boolean;
  status: "draft" | "pending_review" | "published" | "canceled" | "completed";
  attendeeCount: number;
  attendeesPreview: EventAttendeePreviewDto[];
  userRsvpStatus?:
    | "going"
    | "pending_approval"
    | "waitlisted"
    | "canceled"
    | "rejected"
    | null;
  canManage?: boolean;
  pendingRsvpCount?: number;
};

export type CommunityEventDetailDto = CommunityEventSummaryDto & {
  logisticsNotes: string | null;
  onlineMeetingUrl: string | null;
  canManage: boolean;
  userRsvp?: EventRsvpDto | null;
};

export type EventRsvpDto = {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  status: "going" | "pending_approval" | "waitlisted" | "canceled" | "rejected";
  checkinCode: string;
  checkedInAt: string | null;
  createdAt: string;
};

export type HostEventAnalyticsDto = {
  totalRsvps: number;
  goingCount: number;
  pendingCount: number;
  waitlistCount: number;
  checkedInCount: number;
};

// ---------------- Social Profile & Directory DTOs ---------------- //

export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  website?: string;
  goodreads?: string;
  linkedin?: string;
  headerImage?: string;
};

export type ManagedCommunitySummaryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  verificationStatus: "pending" | "verified" | "trusted" | "rejected";
  rejectionReason?: string | null;
  role: "owner" | "admin" | "checkin_staff" | "member";
  followerCount?: number;
};

export type ManagedPublisherSummaryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl: string | null;
  headerImageUrl: string | null;
  city: string | null;
  topics?: string[];
  verificationStatus: PublisherVerificationStatus;
  rejectionReason?: string | null;
  role?: PublisherMemberRole | null;
  followerCount?: number;
  isFollowing?: boolean;
};

export type PublicProfileReviewDto = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  book: BookSummaryDto;
};

export type SocialProfileDto = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  headerImage: string | null;
  bio: string;
  locationCity: string | null;
  socialLinks: SocialLinks | null;
  authorStatus: AuthorStatus;
  authorPenName: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isSubscribedUpdates?: boolean;
  isApprovedWriter?: boolean;
  booksPublishedCount?: number;
  totalReadingMinutes?: number;
  isPublisher?: boolean;
  publisherSlug?: string | null;
  publisherName?: string | null;
  isCommunityOwner?: boolean;
  ownedCommunitySlug?: string | null;
  ownedCommunityName?: string | null;
  managedCommunities?: ManagedCommunitySummaryDto[];
  managedPublishers?: ManagedPublisherSummaryDto[];
  publishedBooks?: BookSummaryDto[];
  /** Books this person is reading or has finished. Always the profile owner's, never the viewer's. */
  publicShelves?: ShelfItemDto[];
  publicReviews?: PublicProfileReviewDto[];
  publicActivities?: ExplorePostItemDto[];
  booksCompletedCount?: number;
  createdAt: string;
};

export type SocialRelationItemDto = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  role?: string;
  type: "user" | "author" | "publisher" | "community";
  href: string;
  isFollowing: boolean;
};

export type AuthorDirectoryItemDto = {
  id: string;
  name: string;
  penName: string;
  username: string | null;
  image: string | null;
  bio: string;
  locationCity: string | null;
  authorStatus: AuthorStatus;
  bookCount: number;
  followerCount: number;
  isFollowing?: boolean;
};

export type ReaderDirectoryItemDto = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string;
  locationCity: string | null;
  booksReadCount: number;
  streakDays: number;
  followerCount: number;
  isFollowing?: boolean;
};

export type ExploreUserItemDto = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  locationCity: string | null;
  authorStatus: AuthorStatus;
  authorPenName?: string | null;
  followerCount?: number;
  bookCount?: number;
  booksReadCount?: number;
  streakDays?: number;
  isFollowing?: boolean;
};

export type ExplorePostItemDto = {
  id: string;
  type: "quote" | "review" | "session";
  content: string;
  note?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
  };
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverColor?: string | null;
    coverUrl?: string | null;
    publishedYear?: number | null;
    genres?: string[];
    pageCount?: number | null;
  };
  rating?: number;
  color?: HighlightColor;
  chapterNumber?: number | null;
  pageNumber?: number | null;
  pagesRead?: number;
  durationSeconds?: number;
  avgWpm?: number | null;
  wordsRead?: number | null;
  title?: string | null;
  startProgressPercent?: number | null;
  endProgressPercent?: number | null;
  startChapterNumber?: number | null;
  endChapterNumber?: number | null;
  highlightsCount?: number;
  postCaption?: string | null;
  postConfig?: QuotePostConfig | SessionPostConfig | null;
};

export type UnifiedExploreResultDto = {
  users: ExploreUserItemDto[];
  books: BookSummaryDto[];
  posts: ExplorePostItemDto[];
  communities: ManagedCommunitySummaryDto[];
  publishers: ManagedPublisherSummaryDto[];
};

// ---------------- Publisher & B2B2C DTOs ---------------- //

export type PublisherVerificationStatus = "pending" | "verified" | "rejected";
export type PublisherMemberRole = "owner" | "editor" | "finance";

export type PublisherApprovedWriterStatus = "invited" | "active" | "revoked";

export type PublisherApprovedWriterSummaryDto = {
  id: string;
  userId: string | null;
  name: string;
  username: string | null;
  image: string | null;
};

export type PublisherApprovedWriterDto = {
  id: string;
  publisherId: string;
  userId: string | null;
  invitedEmail: string | null;
  status: PublisherApprovedWriterStatus;
  canFastTrack: boolean;
  name: string | null;
  username: string | null;
  image: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

export type StoreBranchDto = {
  id: string;
  chainName: PartnerType;
  branchName: string;
  city: string;
  address: string;
};

export type PublisherBookInventoryItemDto = {
  branchId: string;
  branchName: string;
  chainName: PartnerType;
  city: string;
  address: string;
  rakyatStock: number;
  standardStock: number;
  stockStatus: string;
  lastSyncedAt: string;
};

export type UploadedMediaDto = {
  key: string;
  url: string;
  contentType: string;
  bytes: number;
};

export type PublisherDto = {
  id: string;
  slug: string;
  name: string;
  ikapiNumber: string | null;
  description: string | null;
  logoUrl: string | null;
  headerImageUrl?: string | null;
  city: string | null;
  address: string | null;
  contactEmail: string | null;
  topics?: string[];
  isAcceptingSubmissions?: boolean;
  submissionGuidelines?: string | null;
  topicMatchScore?: number;
  matchedTopics?: string[];
  approvedWriters?: PublisherApprovedWriterSummaryDto[];
  isCurrentUserApprovedWriter?: boolean;
  verificationStatus: PublisherVerificationStatus;
  rejectionReason?: string | null;
  verificationDocuments?: VerificationDocumentDto[] | null;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
    whatsapp?: string;
  } | null;
  verifiedAt: string | null;
  freeClaimCodeQuotaPerBook: number;
  claimCodeFeeIdr: number;
  totalBooks?: number;
  followerCount?: number;
  isFollowing?: boolean;
  currentUserRole?: PublisherMemberRole | null;
  createdAt: string;
  updatedAt: string;
};

export type PublisherMemberDto = {
  id: string;
  publisherId: string;
  userId: string;
  role: PublisherMemberRole;
  name: string;
  username: string | null;
  email?: string;
  image: string | null;
  createdAt: string;
};

export type ManuscriptSubmissionStatus =
  | "draft"
  | "pending_review"
  | "in_editing"
  | "revision_requested"
  | "published"
  | "rejected";

export type ManuscriptChapterDto = {
  id: string;
  manuscriptId: string;
  chapterNumber: number;
  titleId: string;
  contentId: string;
  contentEn: string | null;
  blueprintContent: string | null;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type ManuscriptSubmissionDto = {
  id: string;
  authorUserId: string;
  authorName?: string;
  authorPenName?: string | null;
  publisherId: string | null;
  publisherName?: string | null;
  title: string;
  slug?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  category?: string | null;
  synopsis: string;
  sourceLanguage?: ManuscriptSourceLanguage;
  targetAudience?: ManuscriptTargetAudience;
  authorNotes?: string | null;
  isbn?: string | null;
  estimatedPages?: number | null;
  editorialNotes?: string | null;
  proposedDigitalPolicy: BookDistributionModel;
  proposedDigitalPriceIdr: number | null;
  printSimJson: Record<string, unknown> | null;
  status: ManuscriptSubmissionStatus;
  rejectionReason: string | null;
  publishedBookId: string | null;
  isCatalogRevision?: boolean;
  isApprovedWriter?: boolean;
  chapters?: ManuscriptChapterDto[];
  totalChapters?: number;
  createdAt: string;
  updatedAt: string;
};

export type PublisherCatalogBookDto = BookSummaryDto & {
  activeRevisionManuscriptId: string | null;
  activeRevisionUpdatedAt: string | null;
  paidPurchaseCount: number;
};

export type BookClaimBatchDto = {
  id: string;
  bookId: string;
  bookTitle?: string;
  publisherId: string;
  publisherName?: string;
  batchName: string;
  totalCodes: number;
  unitFeeIdr: number;
  billingStatus: "free_tier" | "unbilled" | "paid";
  createdAt: string;
};

export type PublishManuscriptResultDto = {
  publishedBookId: string;
  book: BookSummaryDto;
  claimBatch: BookClaimBatchDto | null;
};

export type BookPurchaseDto = {
  id: string;
  userId: string;
  bookId: string;
  bookSlug?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  priceIdr: number;
  tax?: {
    subtotalIdr: number;
    taxIdr: number;
    rateBps: number;
  } | null;
  publisherShareIdr: number;
  affiliateCalendarId: string | null;
  affiliateCommissionIdr: number;
  anzabookNetIdr: number;
  status: "pending" | "paid" | "failed" | "canceled" | "expired" | "refunded";
  paymentMethod: string;
  checkoutUrl?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export type BookPurchaseOrderDto = {
  id: string;
  bookId: string;
  bookSlug: string;
  bookTitle: string;
  bookCoverUrl: string;
  priceIdr: number;
  tax: {
    subtotalIdr: number;
    taxIdr: number;
    rateBps: number;
  } | null;
  status: "pending" | "paid" | "failed" | "canceled" | "expired" | "refunded";
  checkoutUrl: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type CommunityWalletLedgerDto = {
  id: string;
  calendarId: string;
  entryType:
    | "affiliate_nakama"
    | "affiliate_book_purchase"
    | "paid_event_ticket"
    | "payout_withdrawal";
  amountIdr: number;
  sourceOrderId: string | null;
  sourceEventId: string | null;
  sourceBookPurchaseId: string | null;
  description: string;
  createdAt: string;
};

export type CommunityWalletDto = {
  calendarId: string;
  calendarName: string;
  balanceIdr: number;
  totalAffiliateNakamaIdr: number;
  totalAffiliateBookPurchasesIdr: number;
  totalPaidEventTicketsIdr: number;
  totalPayoutsWithdrawnIdr: number;
  recentLedgers: CommunityWalletLedgerDto[];
};

export type AdminOverviewDto = {
  pendingCalendarsCount: number;
  pendingAuthorsCount: number;
  pendingPublishersCount: number;
  pendingSpotsCount?: number;
  openSpotReportsCount?: number;
  highRiskDrmEvents24hCount: number;
  estimatedNakamaRoyaltyPoolIdr: number;
  totalSinglePurchaseSalesIdr: number;
  totalPublisherShareIdr: number;
  totalAffiliateCommissionsIdr: number;
  totalNetAnzabookIdr: number;
};

export type DrmSecurityEventType =
  | "screenshot_shortcut"
  | "clipboard_copy"
  | "devtools_attempt"
  | "dom_tampering"
  | "print_save_attempt"
  | "api_scrape_anomaly"
  | "context_menu"
  | "drag_attempt"
  | "window_blur"
  | "visibility_hidden"
  | "multi_touch";

export type DrmSecurityRiskLevel = "high" | "medium" | "low";

export type DrmSecurityEventDto = {
  id: string;
  userId: string;
  userName: string;
  username: string | null;
  userEmail: string;
  watermarkCode: string;
  bookId: string | null;
  bookSlug: string;
  bookTitle: string | null;
  chapterNumber: number | null;
  eventType: DrmSecurityEventType;
  riskLevel: DrmSecurityRiskLevel;
  triggerDetail: string;
  clientOs: string;
  createdAt: string;
};

export type AdminDrmEventsSummaryDto = {
  totalEvents: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  last24hHighRiskCount: number;
  uniqueFlaggedUsersCount: number;
};

export type AdminDrmEventsListResponse = Paginated<DrmSecurityEventDto> & {
  summary: AdminDrmEventsSummaryDto;
};

export type DrmWatermarkTraceDto = {
  watermarkCode: string;
  userId: string;
  userName: string;
  username: string | null;
  userEmail: string;
  bookId: string;
  bookSlug: string;
  bookTitle: string;
  createdAt: string;
  lastSeenAt: string;
  recentEvents: DrmSecurityEventDto[];
};

export type DrmSuspensionStatus =
  "suspended" | "appeal_pending" | "reinstated" | "rejected";

export type DrmReaderSuspensionDto = {
  id: string;
  userId: string;
  userName: string;
  username: string | null;
  userEmail: string;
  status: DrmSuspensionStatus;
  cycleNumber: number;
  triggerCount: number;
  lastEventType: DrmSecurityEventType;
  lastBookSlug: string | null;
  suspendedAt: string;
  appealMessage: string | null;
  appealedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reinstatedAt: string | null;
};

export type ReaderDrmStatusDto = {
  status: "active" | DrmSuspensionStatus;
  highRiskCount: number;
  strikeLimit: number;
  latestSuspension: DrmReaderSuspensionDto | null;
};

export type RecordDrmEventResultDto = {
  id: string;
  riskLevel: DrmSecurityRiskLevel;
  createdAt: string;
  highRiskCount: number;
  strikeLimit: number;
  suspensionTriggered: boolean;
  readerStatus: "active" | DrmSuspensionStatus;
};

export type AdminDrmSuspensionsListResponse =
  Paginated<DrmReaderSuspensionDto> & {
    summary: {
      activeSuspendedCount: number;
      appealPendingCount: number;
      reinstatedCount: number;
      rejectedCount: number;
    };
  };

export type AdminCalendarDto = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  contactEmail: string | null;
  socialLinks: Record<string, string> | null;
  verificationStatus: "pending" | "verified" | "trusted" | "rejected";
  rejectionReason?: string | null;
  verificationDocuments?: VerificationDocumentDto[] | null;
  createdByUserId: string;
  creatorName: string | null;
  creatorEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuthorApplicationDto = {
  id: string;
  userId: string;
  penName: string;
  bio: string | null;
  portfolioUrl: string | null;
  claimedBookId: string | null;
  claimedBookTitle: string | null;
  claimedBookCover: string | null;
  status: "pending" | "verified" | "rejected";
  rejectionReason?: string | null;
  verificationDocuments?: VerificationDocumentDto[] | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPublishManuscriptResultDto = {
  publishedBookId: string;
  book: Record<string, unknown>;
  claimBatch: BookClaimBatchDto | null;
};

export type AdminCreateClaimBatchResultDto = {
  batch: BookClaimBatchDto;
  codes: string[];
};

export type AdminClaimBatchCodesDto = {
  batch: BookClaimBatchDto;
  codes: {
    id: string;
    code: string;
    isDemo: boolean;
    claimedByUserId: string | null;
    claimedAt: string | null;
    createdAt: string;
  }[];
};

// ---------------- Reading Spots DTOs ---------------- //

export type {
  SpotCategory,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotReportReason,
  SpotReviewTag,
  SpotSource,
  SpotStatus,
  SpotVerifiedBadge,
} from "../validators/spots";

export type SpotFacilitiesDto = {
  wifi?: boolean;
  powerOutlets?: boolean;
  airConditioned?: boolean;
  quietZone?: boolean;
  hasBookCollection?: boolean;
  outdoorSeating?: boolean;
  prayerRoom?: boolean;
  parking?: boolean;
};

export type ReadingSpotSummaryDto = {
  id: string;
  slug: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  address: string;
  district: string | null;
  city: string;
  province: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  instagramHandle: string | null;
  websiteUrl: string | null;
  openingHoursText: string | null;
  priceRange: SpotPriceRange;
  noiseLevel: SpotNoiseLevel;
  facilities: SpotFacilitiesDto;
  coverUrl: string | null;
  verifiedBadge: SpotVerifiedBadge;
  linkedBranchId: string | null;
  linkedCalendarId: string | null;
  ratingAvg: number;
  ratingCount: number;
  bookmarkCount: number;
  distanceMeters?: number | null;
  isBookmarked?: boolean;
};

export type ReadingSpotUpcomingEventDto = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
};

export type ReadingSpotReviewDto = {
  id: string;
  spotId: string;
  userId: string;
  userName: string;
  userUsername: string | null;
  userImage: string | null;
  rating: number;
  content: string;
  tags: SpotReviewTag[];
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadingSpotDetailDto = ReadingSpotSummaryDto & {
  linkedBranchName?: string | null;
  linkedCalendarSlug?: string | null;
  linkedCalendarName?: string | null;
  upcomingEvents?: ReadingSpotUpcomingEventDto[];
  myReview?: ReadingSpotReviewDto | null;
  status?: SpotStatus;
  source?: SpotSource;
  rejectionReason?: string | null;
};

export type ListSpotsResponseDto = {
  data: ReadingSpotSummaryDto[];
  meta: {
    total: number;
    limit?: number;
    offset?: number;
  };
};

export type SpotCitySummaryDto = {
  city: string;
  province: string | null;
  count: number;
  latitude: number;
  longitude: number;
};

export type SpotNearbyMatchDto = {
  id: string;
  slug: string;
  name: string;
  category: SpotCategory;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  status: SpotStatus;
};

export type SpotGeocodeResultDto = {
  displayName: string;
  address: string;
  district: string | null;
  city: string;
  province: string | null;
  latitude: number;
  longitude: number;
};

export type ReadingSpotReportDto = {
  id: string;
  spotId: string;
  reviewId: string | null;
  reporterUserId: string;
  reporterName: string | null;
  reasonType: SpotReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
};

export type AdminSpotModerationItemDto = ReadingSpotDetailDto & {
  submittedByUserId: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  openReportsCount: number;
  recentReports: ReadingSpotReportDto[];
  createdAt: string;
  updatedAt: string;
};

export type {
  PrintEconomicsResult,
  PrintTierResult,
  SimulatePrintInput,
} from "../print-economics.js";
