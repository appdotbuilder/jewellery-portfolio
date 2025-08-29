import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createJewelleryItemInputSchema,
  updateJewelleryItemInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  createCustomerInputSchema,
  createOrderInputSchema,
  updateOrderInputSchema,
  createCustomerQueryInputSchema,
  updateCustomerQueryInputSchema,
  paginationInputSchema
} from './schema';

// Import handlers
import { createJewelleryItem } from './handlers/create_jewellery_item';
import { getJewelleryItems, getAllJewelleryItems } from './handlers/get_jewellery_items';
import { getJewelleryItem } from './handlers/get_jewellery_item';
import { updateJewelleryItem } from './handlers/update_jewellery_item';
import { deleteJewelleryItem } from './handlers/delete_jewellery_item';
import { addToCart } from './handlers/add_to_cart';
import { getCart } from './handlers/get_cart';
import { updateCartItem } from './handlers/update_cart_item';
import { removeFromCart } from './handlers/remove_from_cart';
import { clearCart } from './handlers/clear_cart';
import { createCustomer } from './handlers/create_customer';
import { createOrder } from './handlers/create_order';
import { getOrders, getCustomerOrders } from './handlers/get_orders';
import { getOrder } from './handlers/get_order';
import { updateOrder } from './handlers/update_order';
import { createCustomerQuery } from './handlers/create_customer_query';
import { getCustomerQueries } from './handlers/get_customer_queries';
import { updateCustomerQuery } from './handlers/update_customer_query';
import { getCustomers } from './handlers/get_customers';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Jewellery Items (Public)
  getJewelleryItems: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getJewelleryItems(input)),
  
  getJewelleryItem: publicProcedure
    .input(z.number())
    .query(({ input }) => getJewelleryItem(input)),

  // Jewellery Items (Admin)
  getAllJewelleryItems: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getAllJewelleryItems(input)),

  createJewelleryItem: publicProcedure
    .input(createJewelleryItemInputSchema)
    .mutation(({ input }) => createJewelleryItem(input)),

  updateJewelleryItem: publicProcedure
    .input(updateJewelleryItemInputSchema)
    .mutation(({ input }) => updateJewelleryItem(input)),

  deleteJewelleryItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteJewelleryItem(input)),

  // Shopping Cart
  addToCart: publicProcedure
    .input(addToCartInputSchema)
    .mutation(({ input }) => addToCart(input)),

  getCart: publicProcedure
    .input(z.string())
    .query(({ input }) => getCart(input)),

  updateCartItem: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItem(input)),

  removeFromCart: publicProcedure
    .input(z.number())
    .mutation(({ input }) => removeFromCart(input)),

  clearCart: publicProcedure
    .input(z.string())
    .mutation(({ input }) => clearCart(input)),

  // Customers
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getCustomers(input)),

  // Orders
  createOrder: publicProcedure
    .input(z.object({
      order: createOrderInputSchema,
      sessionId: z.string()
    }))
    .mutation(({ input }) => createOrder(input.order, input.sessionId)),

  getOrders: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getOrders(input)),

  getCustomerOrders: publicProcedure
    .input(z.object({
      customerId: z.number(),
      pagination: paginationInputSchema.optional()
    }))
    .query(({ input }) => getCustomerOrders(input.customerId, input.pagination)),

  getOrder: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrder(input)),

  updateOrder: publicProcedure
    .input(updateOrderInputSchema)
    .mutation(({ input }) => updateOrder(input)),

  // Customer Queries
  createCustomerQuery: publicProcedure
    .input(createCustomerQueryInputSchema)
    .mutation(({ input }) => createCustomerQuery(input)),

  getCustomerQueries: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getCustomerQueries(input)),

  updateCustomerQuery: publicProcedure
    .input(updateCustomerQueryInputSchema)
    .mutation(({ input }) => updateCustomerQuery(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();