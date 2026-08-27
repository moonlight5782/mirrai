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
  installationStatus: text("installation_status").notNull().default("not_started"),
  installationCheckedAt: text("installation_checked_at"),
  ownerUserId: text("owner_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_shops_slug").on(table.slug)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("idx_product_models_product").on(table.productId), index("idx_product_models_status").on(table.status)]);

export const widgetEvents = sqliteTable("widget_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("idx_widget_events_shop_created").on(table.shopId, table.createdAt)]);
