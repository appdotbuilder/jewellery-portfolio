import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const queryStatusEnum = pgEnum('query_status', ['new', 'in_progress', 'resolved']);

// Jewellery Items Table
export const jewelleryItemsTable = pgTable('jewellery_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  materials: text('materials').notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'), // Nullable by default
  stock_quantity: integer('stock_quantity').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers Table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Orders Table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  shipping_address: text('shipping_address').notNull(),
  billing_address: text('billing_address').notNull(),
  payment_status: text('payment_status').notNull().default('pending'),
  payment_method: text('payment_method'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order Items Table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  jewellery_item_id: integer('jewellery_item_id').notNull().references(() => jewelleryItemsTable.id),
  quantity: integer('quantity').notNull(),
  price_per_item: numeric('price_per_item', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Cart Items Table (for temporary cart storage)
export const cartItemsTable = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  session_id: text('session_id').notNull(),
  jewellery_item_id: integer('jewellery_item_id').notNull().references(() => jewelleryItemsTable.id),
  quantity: integer('quantity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Customer Queries Table
export const customerQueriesTable = pgTable('customer_queries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: queryStatusEnum('status').notNull().default('new'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const jewelleryItemsRelations = relations(jewelleryItemsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
  cartItems: many(cartItemsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [ordersTable.customer_id],
    references: [customersTable.id],
  }),
  orderItems: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  jewelleryItem: one(jewelleryItemsTable, {
    fields: [orderItemsTable.jewellery_item_id],
    references: [jewelleryItemsTable.id],
  }),
}));

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  jewelleryItem: one(jewelleryItemsTable, {
    fields: [cartItemsTable.jewellery_item_id],
    references: [jewelleryItemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type JewelleryItem = typeof jewelleryItemsTable.$inferSelect;
export type NewJewelleryItem = typeof jewelleryItemsTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type CartItem = typeof cartItemsTable.$inferSelect;
export type NewCartItem = typeof cartItemsTable.$inferInsert;

export type CustomerQuery = typeof customerQueriesTable.$inferSelect;
export type NewCustomerQuery = typeof customerQueriesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  jewelleryItems: jewelleryItemsTable,
  customers: customersTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  cartItems: cartItemsTable,
  customerQueries: customerQueriesTable,
};