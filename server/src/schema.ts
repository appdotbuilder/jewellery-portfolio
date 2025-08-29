import { z } from 'zod';

// Jewellery Item Schema
export const jewelleryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  materials: z.string(),
  description: z.string(),
  price: z.number(),
  image_url: z.string().nullable(),
  stock_quantity: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type JewelleryItem = z.infer<typeof jewelleryItemSchema>;

// Input schema for creating jewellery items
export const createJewelleryItemInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  materials: z.string().min(1, "Materials are required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  image_url: z.string().url().nullable(),
  stock_quantity: z.number().int().nonnegative("Stock quantity must be non-negative")
});

export type CreateJewelleryItemInput = z.infer<typeof createJewelleryItemInputSchema>;

// Input schema for updating jewellery items
export const updateJewelleryItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  materials: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export type UpdateJewelleryItemInput = z.infer<typeof updateJewelleryItemInputSchema>;

// Customer Schema
export const customerSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Input schema for creating customers
export const createCustomerInputSchema = z.object({
  email: z.string().email("Valid email is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order Schema
export const orderSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  total_amount: z.number(),
  status: orderStatusSchema,
  shipping_address: z.string(),
  billing_address: z.string(),
  payment_status: z.string(),
  payment_method: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Input schema for creating orders
export const createOrderInputSchema = z.object({
  customer_id: z.number(),
  total_amount: z.number().positive("Total amount must be positive"),
  shipping_address: z.string().min(1, "Shipping address is required"),
  billing_address: z.string().min(1, "Billing address is required"),
  payment_method: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Input schema for updating orders
export const updateOrderInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema.optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().nullable().optional()
});

export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;

// Order Item Schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  jewellery_item_id: z.number(),
  quantity: z.number().int(),
  price_per_item: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Input schema for creating order items
export const createOrderItemInputSchema = z.object({
  order_id: z.number(),
  jewellery_item_id: z.number(),
  quantity: z.number().int().positive("Quantity must be positive"),
  price_per_item: z.number().positive("Price per item must be positive")
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

// Cart Item Schema (for temporary cart storage)
export const cartItemSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  jewellery_item_id: z.number(),
  quantity: z.number().int(),
  created_at: z.coerce.date()
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Input schema for adding items to cart
export const addToCartInputSchema = z.object({
  session_id: z.string().min(1, "Session ID is required"),
  jewellery_item_id: z.number(),
  quantity: z.number().int().positive("Quantity must be positive")
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

// Input schema for updating cart items
export const updateCartItemInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().positive("Quantity must be positive")
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Customer Query Schema
export const customerQuerySchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(['new', 'in_progress', 'resolved']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// Input schema for creating customer queries
export const createCustomerQueryInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required")
});

export type CreateCustomerQueryInput = z.infer<typeof createCustomerQueryInputSchema>;

// Input schema for updating customer queries
export const updateCustomerQueryInputSchema = z.object({
  id: z.number(),
  status: z.enum(['new', 'in_progress', 'resolved'])
});

export type UpdateCustomerQueryInput = z.infer<typeof updateCustomerQueryInputSchema>;

// Pagination schema
export const paginationInputSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

// Cart with items response schema
export const cartWithItemsSchema = z.object({
  items: z.array(z.object({
    id: z.number(),
    quantity: z.number(),
    jewellery_item: jewelleryItemSchema
  })),
  total_amount: z.number()
});

export type CartWithItems = z.infer<typeof cartWithItemsSchema>;

// Order with items response schema
export const orderWithItemsSchema = orderSchema.extend({
  customer: customerSchema,
  order_items: z.array(orderItemSchema.extend({
    jewellery_item: jewelleryItemSchema
  }))
});

export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;