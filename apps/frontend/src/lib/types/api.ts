export type ApiRole = "ADMIN" | "SELLER" | "BUYER" | "CUSTOMER_SERVICE";

export interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  role?: ApiRole;
  ecoPoints?: number;
  balance?: number | string;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

export interface ApiSeller {
  id: string;
  userId: string;
  tier?: string;
  totalSales?: number | string;
  isVerified?: boolean;
  kycStatus?: "PENDING" | "APPROVED" | "REJECTED";
  kycReviewedAt?: string | null;
  kycReviewedById?: string | null;
  kycRejectionReason?: string | null;
  user?: ApiUser;
  kycDocuments?: ApiKycDocument[];
  products?: ApiProduct[];
}

export interface ApiKycDocument {
  id: string;
  sellerId: string;
  docType: string;
  url: string;
  status: string;
  uploadedAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  rejectionReason?: string | null;
}

export interface ApiAdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  admin?: ApiUser;
}

export interface ApiPrivacySettings {
  id: string;
  userId: string;
  dataCollection: boolean;
  marketing: boolean;
  analytics: boolean;
  consentGivenAt: string;
  lastUpdatedAt: string;
  deletionRequested?: string | null;
  deletionAt?: string | null;
  deletionScheduledAt?: string | null;
  gracePeriodDays?: number;
}

export interface ApiDataExportLog {
  id: string;
  userId: string;
  format: string;
  exportedAt: string;
  expiresAt: string;
  downloadUrl?: string | null;
  downloadedAt?: string | null;
}

export interface ApiFulfillmentEvent {
  id: string;
  orderId: string;
  type: string;
  status: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
  createdAt: string;
  actor?: ApiUser | null;
  order?: ApiOrder;
}

export interface ApiFulfillmentSummary {
  automationEnabled: boolean;
  stepHours: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  failed: number;
  active: number;
  recentEvents?: ApiFulfillmentEvent[];
}

export interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  processingFee?: number | string | null;
  stock: number;
  stockStatus?: string;
  category: string;
  ecoScore: number;
  sellerId?: string;
  imageUrl?: string | null;
  approvalStatus?: string;
  deliveryStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  seller?: ApiSeller;
  wishlisted?: boolean;
}

export interface ApiProductReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: Pick<ApiUser, "id" | "name">;
}

export interface ApiEcoImpact {
  id: string;
  impact: string;
  pointsEarned: number;
}

export interface ApiOrder {
  id: string;
  buyerId?: string;
  productId?: string;
  quantity?: number;
  status: string;
  totalAmount?: number | string;
  total?: number | string;
  paymentIntentId?: string | null;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  deliveryTrackingId?: string | null;
  product?: ApiProduct;
  buyer?: ApiUser;
  ecoImpacts?: ApiEcoImpact[];
  ecoPointsAwarded?: number;
  carbonOffset?: boolean;
}

export interface ApiReferral {
  id: string;
  referrerId?: string;
  refereeId: string;
  referrer?: ApiUser;
  referee?: ApiUser;
  status: string;
  createdAt?: string;
}

export interface ApiSubscription {
  id: string;
  userId?: string;
  plan: string;
  status: string;
  startedAt?: string;
  endsAt?: string | null;
  createdAt?: string;
}

export interface ApiSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  benefits: string[];
  stripePriceId?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ApiMarketingCampaign {
  id: string;
  createdById: string;
  title: string;
  message: string;
  audience: "ALL" | "BUYERS" | "SELLERS" | string;
  status: "DRAFT" | "SENT" | string;
  recipientCount: number;
  sentAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: ApiUser;
}

export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiGrowthSummary {
  referrals: {
    total: number;
    pending: number;
    completed: number;
    conversionRate: number;
  };
  subscriptions: {
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    monthlyRecurringRevenue: number;
    planBreakdown: Array<{
      plan: string;
      status: string;
      count: number;
      monthlyRevenue: number;
    }>;
  };
  campaigns: {
    total: number;
    sent: number;
    draft: number;
    recent: ApiMarketingCampaign[];
  };
  audience: {
    buyers: number;
    sellers: number;
    marketingReach: number;
  };
  recommendations: {
    approvedProducts: number;
    inStockProducts: number;
    topCategories: Array<{ category: string; count: number }>;
  };
}

export interface ApiDashboardAnalytics {
  totalRevenue?: number | string;
  totalOrders?: number;
  totalUsers?: number;
  totalSellers?: number;
}

export interface ApiEcoImpactAnalytics {
  ecoFriendlyProducts?: number;
  carbonSaved?: number;
  treesPlanted?: number;
}

export interface ApiReferralAnalytics {
  total?: number;
  pending?: number;
  completed?: number;
}

export interface ApiSubscriptionAnalytics {
  total?: number;
  active?: number;
  cancelled?: number;
  expired?: number;
}

export interface ApiRetentionAnalytics {
  totalBuyers?: number;
  repeatBuyers?: number;
}

export interface ApiCategoryAnalytics {
  category: string;
  count: number;
}

export interface ApiProductAnalytics {
  pending?: number;
  approved?: number;
  rejected?: number;
  total?: number;
}

export interface ApiUserGrowthAnalytics {
  newUsers?: number;
  newSellers?: number;
  period?: number;
}

export interface ApiRevenueTrendAnalytics {
  period?: number;
  totalRevenue?: number | string;
  ordersCount?: number;
}

export type ApiTopSellerAnalytics = ApiSeller;

export interface ApiMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  unreadCount?: number;
  sender?: ApiUser;
  receiver?: ApiUser;
}

export interface ApiDispute {
  id: string;
  orderId: string;
  openedById?: string;
  assignedToId?: string | null;
  reason?: string;
  status: string;
  priority?: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolution?: string | null;
  createdAt?: string;
  updatedAt?: string;
  order?: ApiOrder;
  openedBy?: ApiUser;
  assignedTo?: ApiUser | null;
  resolvedBy?: ApiUser | null;
  messages?: ApiDisputeMessage[];
}

export interface ApiDisputeMessage {
  id: string;
  disputeId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: Pick<ApiUser, "id" | "name" | "role">;
}

export interface ApiTicketResponse {
  id: string;
  message: string;
  createdAt: string;
}

export interface ApiTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  issueType?: string;
  createdAt: string;
  userId: string;
  csUserId?: string | null;
  responses?: ApiTicketResponse[];
}

export interface ApiModerationFlag {
  id: string;
  messageId: string;
  reason: string;
  status: string;
  message?: ApiMessage;
}
