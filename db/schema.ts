import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const shops = sqliteTable("shops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  subscriptionStatus: text("subscription_status").notNull().default("trial"),
  websiteUrl: text("website_url"),
  allowedDomains: text("allowed_domains").notNull().default("[]"),
  platform: text("platform").notNull().default("other"),
  catalogSourceType: text("catalog_source_type").notNull().default("manual"),
  catalogSourceUrl: text("catalog_source_url"),
  catalogSyncStatus: text("catalog_sync_status").notNull().default("not_configured"),
  catalogSyncedAt: text("catalog_synced_at"),
  catalogSyncMessage: text("catalog_sync_message"),
  installationStatus: text("installation_status").notNull().default("not_started"),
  installationCheckedAt: text("installation_checked_at"),
  plan: text("plan").notNull().default("pilot"),
  trialEndsAt: text("trial_ends_at"),
  ownerUserId: text("owner_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_shops_slug").on(table.slug)]);

export const shopMembers = sqliteTable("shop_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default("owner"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_shop_members_shop_user").on(table.shopId, table.userId), index("idx_shop_members_user").on(table.userId)]);

export const platformOperators = sqliteTable("platform_operators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_platform_operators_user").on(table.userId)]);

export const shopInvites = sqliteTable("shop_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("owner"),
  acceptedAt: text("accepted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_shop_invites_shop_email").on(table.shopId, table.email), index("idx_shop_invites_email").on(table.email)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  sourceUrl: text("source_url"),
  imageUrls: text("image_urls").notNull().default("[]"),
  sourceUpdatedAt: text("source_updated_at"),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Мебель"),
  price: text("price").notNull().default(""),
  material: text("material").notNull().default(""),
  color: text("color").notNull().default("#d2bda8"),
  widthCm: real("width_cm"),
  heightCm: real("height_cm"),
  depthCm: real("depth_cm"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_products_shop_sku").on(table.shopId, table.sku), index("idx_products_shop_active").on(table.shopId, table.active)]);

export const productModels = sqliteTable("product_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("missing"),
  glbUrl: text("glb_url"),
  usdzUrl: text("usdz_url"),
  sourceType: text("source_type").notNull().default("none"),
  validationMessage: text("validation_message"),
  qualityScore: integer("quality_score"),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_product_models_product").on(table.productId), index("idx_product_models_status").on(table.status)]);

export const productVariants = sqliteTable("product_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  colorName: text("color_name").notNull(),
  colorHex: text("color_hex").notNull().default("#777777"),
  material: text("material").notNull().default(""),
  imageUrl: text("image_url"),
  glbUrl: text("glb_url"),
  usdzUrl: text("usdz_url"),
  modelStatus: text("model_status").notNull().default("missing"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [
  uniqueIndex("idx_product_variants_product_sku").on(table.productId, table.sku),
  index("idx_product_variants_product_active_sort").on(table.productId, table.active, table.sortOrder),
]);

export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(0),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  externalJobId: text("external_job_id"),
  sourceImages: text("source_images").notNull().default("[]"),
  resultGlbUrl: text("result_glb_url"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, table => [
  index("idx_generation_jobs_shop_status_priority").on(table.shopId, table.status, table.priority),
  index("idx_generation_jobs_product_created").on(table.productId, table.createdAt),
]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  kind: text("kind").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_assets_storage_key").on(table.storageKey), index("idx_assets_shop_created").on(table.shopId, table.createdAt)]);

export const widgetEvents = sqliteTable("widget_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("idx_widget_events_shop_created").on(table.shopId, table.createdAt)]);
