import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  bigint,
  mediumtext,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

export const sellers = mysqlTable("sellers", {
  id: serial("id").primaryKey(),
  shopName: varchar("shop_name", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  idType: varchar("id_type", { length: 64 }),
  idNumber: varchar("id_number", { length: 64 }),
  idPhotoName: varchar("id_photo_name", { length: 255 }),
  district: varchar("district", { length: 64 }),
  landmark: varchar("landmark", { length: 255 }),
  tin: varchar("tin", { length: 32 }),
  payoutMethod: varchar("payout_method", { length: 32 }),
  payoutNumber: varchar("payout_number", { length: 32 }),
  commissionTermsAccepted: boolean("commission_terms_accepted").notNull().default(false),
  sellerContractAccepted: boolean("seller_contract_accepted").notNull().default(false),
  commissionTermsAcceptedAt: timestamp("commission_terms_accepted_at"),
  sellerContractAcceptedAt: timestamp("seller_contract_accepted_at"),
  verified: boolean("verified").notNull().default(false),
  rating: int("rating").notNull().default(45),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended", "terminated"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  price: int("price").notNull(),
  oldPrice: int("old_price"),
  image: varchar("image", { length: 255 }).notNull(),
  stock: int("stock").notNull().default(0),
  condition: mysqlEnum("condition", ["new", "refurbished", "used"]).notNull().default("new"),
  warrantyMonths: int("warranty_months").notNull().default(0),
  flashSale: boolean("flash_sale").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listings = mysqlTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  price: int("price").notNull(),
  oldPrice: int("old_price"),
  stock: int("stock").notNull().default(1),
  condition: mysqlEnum("condition", ["new", "refurbished", "used"]).notNull().default("new"),
  warrantyMonths: int("warranty_months").notNull().default(0),
  imageNote: varchar("image_note", { length: 255 }).notNull(),
  imageData: mediumtext("image_data"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended", "terminated"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const restaurants = mysqlTable("restaurants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  cuisine: varchar("cuisine", { length: 128 }).notNull(),
  area: varchar("area", { length: 128 }).notNull(),
  deliveryMins: int("delivery_mins").notNull().default(35),
  deliveryFee: int("delivery_fee").notNull().default(3000),
  minOrder: int("min_order").notNull().default(10000),
  rating: int("rating").notNull().default(45),
  image: varchar("image", { length: 255 }).notNull(),
  open: boolean("open").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuItems = mysqlTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: bigint("restaurant_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: int("price").notNull(),
  image: varchar("image", { length: 255 }),
  popular: boolean("popular").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 16 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  address: text("address").notNull(),
  paymentMethod: mysqlEnum("payment_method", ["mtn_momo", "airtel_money", "cash"]).notNull(),
  subtotal: int("subtotal").notNull(),
  deliveryFee: int("delivery_fee").notNull().default(0),
  total: int("total").notNull(),
  status: mysqlEnum("status", ["placed", "confirmed", "pending_delivery", "on_the_way", "delivered", "cancelled"]).notNull().default("placed"),
  paymentStatus: mysqlEnum("payment_status", ["unpaid", "pending_confirmation", "paid"]).notNull().default("unpaid"),
  paymentRef: varchar("payment_ref", { length: 64 }),
  deliveryPartnerId: bigint("delivery_partner_id", { mode: "number", unsigned: true }),
  deliveryAssignedAt: timestamp("delivery_assigned_at"),
  deliveryNotes: text("delivery_notes"),
  deliveredAt: timestamp("delivered_at"),
  paidOut: boolean("paid_out").notNull().default(false),
  payoutRef: varchar("payout_ref", { length: 64 }),
  commissionFee: int("commission_fee").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = mysqlTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  itemType: mysqlEnum("item_type", ["product", "menu_item"]).notNull(),
  itemId: bigint("item_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  price: int("price").notNull(),
  qty: int("qty").notNull(),
});

export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketingSubscribers = mysqlTable("marketing_subscribers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 32 }).unique(),
  emailOptIn: boolean("email_opt_in").notNull().default(false),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
  consentSource: varchar("consent_source", { length: 64 }).notNull().default("homepage"),
  consentVersion: varchar("consent_version", { length: 32 }).notNull().default("2026-09-01"),
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).notNull().unique(),
  consentedAt: timestamp("consented_at").notNull().defaultNow(),
  emailUnsubscribedAt: timestamp("email_unsubscribed_at"),
  whatsappUnsubscribedAt: timestamp("whatsapp_unsubscribed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// A membership is attached to a real buyer record, never just a browser session.
// Payment attempts are kept separately so provider callbacks can be audited and retried safely.
export const plusMemberships = mysqlTable("plus_memberships", {
  id: serial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull().unique(),
  plan: varchar("plan", { length: 32 }).notNull().default("monthly"),
  status: mysqlEnum("status", ["pending", "active", "expired", "cancelled", "payment_failed"]).notNull().default("pending"),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  provider: varchar("provider", { length: 32 }),
  providerReference: varchar("provider_reference", { length: 128 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const plusPayments = mysqlTable("plus_payments", {
  id: serial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull(),
  membershipId: bigint("membership_id", { mode: "number", unsigned: true }),
  reference: varchar("reference", { length: 128 }).notNull().unique(),
  transactionId: varchar("transaction_id", { length: 128 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("UGX"),
  status: mysqlEnum("status", ["pending", "successful", "failed", "cancelled"]).notNull().default("pending"),
  providerResponse: json("provider_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export const affiliates = mysqlTable("affiliates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  channel: varchar("channel", { length: 64 }).notNull(),
  code: varchar("code", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deliveryPartners = mysqlTable("delivery_partners", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  area: varchar("area", { length: 128 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 64 }).notNull(),
  payoutMethod: varchar("payout_method", { length: 32 }).notNull(),
  payoutNumber: varchar("payout_number", { length: 32 }).notNull(),
  contractAccepted: boolean("contract_accepted").notNull().default(false),
  deliveryShareAccepted: boolean("delivery_share_accepted").notNull().default(false),
  contractAcceptedAt: timestamp("contract_accepted_at"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "suspended", "terminated"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sellerAdBookings = mysqlTable("seller_ad_bookings", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  planType: mysqlEnum("plan_type", ["weekly", "monthly"]).notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["booked", "paid", "active", "completed", "cancelled"]).notNull().default("booked"),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  actorTag: varchar("actor_tag", { length: 32 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  beforeState: text("before_state"),
  afterState: text("after_state"),
  meta: text("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// NEW TABLES
export const payouts = mysqlTable("payouts", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  orderCodes: json("order_codes").notNull(),
  amount: int("amount").notNull(),
  payoutMethod: varchar("payout_method", { length: 32 }).notNull(),
  payoutNumber: varchar("payout_number", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "rolled_back"]).notNull().default("pending"),
  reference: varchar("reference", { length: 128 }).notNull().unique(),
  flutterwaveResponse: json("flutterwave_response"),
  processedAt: timestamp("processed_at"),
  failedReason: text("failed_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").primaryKey().default(1),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.0700"),
  deliveryFeeBase: int("delivery_fee_base").notNull().default(3000),
  deliveryFeePerKm: int("delivery_fee_per_km").notNull().default(500),
  platformName: varchar("platform_name", { length: 128 }).notNull().default("UG Souq"),
  platformEmail: varchar("platform_email", { length: 255 }).default("support@ugsouq.com"),
  enableCashOnDelivery: boolean("enable_cash_on_delivery").notNull().default(true),
  enableMtnMomo: boolean("enable_mtn_momo").notNull().default(true),
  enableAirtelMoney: boolean("enable_airtel_money").notNull().default(true),
  minOrderAmount: int("min_order_amount").notNull().default(5000),
  freeDeliveryThreshold: int("free_delivery_threshold").notNull().default(100000),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const sellerContracts = mysqlTable("seller_contracts", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  contractType: mysqlEnum("contract_type", ["seller_agreement", "commission_terms", "delivery_terms"]).notNull(),
  version: varchar("version", { length: 16 }).notNull().default("1.0"),
  accepted: boolean("accepted").notNull().default(false),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: mysqlEnum("accepted_by", ["seller", "admin"]).notNull().default("seller"),
  adminKeyHash: varchar("admin_key_hash", { length: 64 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  type: mysqlEnum("type", [
    "new_order", "payment_received", "seller_registered",
    "delivery_partner_registered", "payout_completed", "payout_failed",
    "listing_pending", "order_cancelled", "low_stock"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: varchar("entity_id", { length: 64 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const returns = mysqlTable("returns", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  orderCode: varchar("order_code", { length: 16 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["requested", "approved", "rejected", "picked_up", "refunded", "closed"]).notNull().default("requested"),
  refundAmount: int("refund_amount").notNull().default(0),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// ============================================================
// TRUST ARCHITECTURE — NEW TABLES
// ============================================================

export const escrowTransactions = mysqlTable("escrow_transactions", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  buyerPhone: varchar("buyer_phone", { length: 32 }).notNull(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull(),
  amount: int("amount").notNull(),
  platformFee: int("platform_fee").notNull().default(0),
  status: mysqlEnum("status", ["held", "released", "disputed", "refunded", "cancelled"]).notNull().default("held"),
  heldAt: timestamp("held_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at"),
  disputedAt: timestamp("disputed_at"),
  resolvedAt: timestamp("resolved_at"),
  resolution: varchar("resolution", { length: 50 }),
  disputeReason: text("dispute_reason"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const souqHubs = mysqlTable("souq_hubs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  hubType: mysqlEnum("hub_type", ["verification_center", "pickup_dropoff", "return_center", "full_service"]).notNull().default("full_service"),
  address: text("address").notNull(),
  town: varchar("town", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  coordinates: json("coordinates"),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  operatingHours: varchar("operating_hours", { length: 100 }),
  managerName: varchar("manager_name", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  services: json("services").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communityAgents = mysqlTable("community_agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  town: varchar("town", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),
  totalOrdersAggregated: int("total_orders_aggregated").notNull().default(0),
  totalCommissionEarned: int("total_commission_earned").notNull().default(0),
  status: mysqlEnum("status", ["pending", "active", "suspended", "inactive"]).notNull().default("pending"),
  verifiedBy: varchar("verified_by", { length: 32 }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupOrders = mysqlTable("group_orders", {
  id: serial("id").primaryKey(),
  agentId: bigint("agent_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetQuantity: int("target_quantity").notNull(),
  currentQuantity: int("current_quantity").notNull().default(0),
  unitPrice: int("unit_price").notNull(),
  originalPrice: int("original_price").notNull(),
  deadline: timestamp("deadline").notNull(),
  status: mysqlEnum("status", ["open", "locked", "ordered", "delivered", "cancelled"]).notNull().default("open"),
  deliveryHubId: bigint("delivery_hub_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const groupOrderParticipants = mysqlTable("group_order_participants", {
  id: serial("id").primaryKey(),
  groupOrderId: bigint("group_order_id", { mode: "number", unsigned: true }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  amountPaid: int("amount_paid").notNull(),
  paidAt: timestamp("paid_at"),
  status: mysqlEnum("status", ["pending", "paid", "delivered"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trustScores = mysqlTable("trust_scores", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull().unique(),
  verificationLevel: mysqlEnum("verification_level", ["basic", "verified", "premium", "gold"]).notNull().default("basic"),
  businessVerified: boolean("business_verified").notNull().default(false),
  idVerified: boolean("id_verified").notNull().default(false),
  locationVerified: boolean("location_verified").notNull().default(false),
  stockVerified: boolean("stock_verified").notNull().default(false),
  deliveryScore: decimal("delivery_score", { precision: 4, scale: 2 }).notNull().default("5.00"),
  qualityScore: decimal("quality_score", { precision: 4, scale: 2 }).notNull().default("5.00"),
  responseScore: decimal("response_score", { precision: 4, scale: 2 }).notNull().default("5.00"),
  overallScore: decimal("overall_score", { precision: 4, scale: 2 }).notNull().default("5.00"),
  totalTransactions: int("total_transactions").notNull().default(0),
  successfulTransactions: int("successful_transactions").notNull().default(0),
  disputeCount: int("dispute_count").notNull().default(0),
  positiveReviews: int("positive_reviews").notNull().default(0),
  negativeReviews: int("negative_reviews").notNull().default(0),
  lastVerifiedAt: timestamp("last_verified_at"),
  nextVerificationDue: timestamp("next_verification_due"),
  badge: mysqlEnum("badge", ["none", "verified", "trusted", "gold", "platinum"]).notNull().default("none"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const sellerSubscriptions = mysqlTable("seller_subscriptions", {
  id: serial("id").primaryKey(),
  sellerId: bigint("seller_id", { mode: "number", unsigned: true }).notNull().unique(),
  tier: mysqlEnum("tier", ["free", "basic", "verified", "premium"]).notNull().default("free"),
  monthlyFee: int("monthly_fee").notNull().default(0),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  features: json("features").$type<string[]>().default([]),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

