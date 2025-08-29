import { db } from '../db';
import { ordersTable, customersTable, orderItemsTable, jewelleryItemsTable } from '../db/schema';
import { type OrderWithItems, type PaginationInput } from '../schema';
import { eq } from 'drizzle-orm';

export const getOrders = async (input?: PaginationInput): Promise<OrderWithItems[]> => {
  try {
    const limit = input?.limit || 10;
    const offset = ((input?.page || 1) - 1) * limit;

    // Build query with joins and pagination
    const results = await db.select()
      .from(ordersTable)
      .innerJoin(customersTable, eq(ordersTable.customer_id, customersTable.id))
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .innerJoin(jewelleryItemsTable, eq(orderItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .limit(limit)
      .offset(offset)
      .execute();

    // Group results by order
    const ordersMap = new Map<number, OrderWithItems>();

    results.forEach(result => {
      const order = result.orders;
      const customer = result.customers;
      const orderItem = result.order_items;
      const jewelleryItem = result.jewellery_items;

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          ...order,
          total_amount: parseFloat(order.total_amount),
          customer: {
            ...customer
          },
          order_items: []
        });
      }

      const existingOrder = ordersMap.get(order.id)!;
      existingOrder.order_items.push({
        ...orderItem,
        price_per_item: parseFloat(orderItem.price_per_item),
        jewellery_item: {
          ...jewelleryItem,
          price: parseFloat(jewelleryItem.price)
        }
      });
    });

    return Array.from(ordersMap.values());
  } catch (error) {
    console.error('Get orders failed:', error);
    throw error;
  }
};

export const getCustomerOrders = async (customerId: number, input?: PaginationInput): Promise<OrderWithItems[]> => {
  try {
    const limit = input?.limit || 10;
    const offset = ((input?.page || 1) - 1) * limit;

    // Build query with joins, customer filter, and pagination
    const results = await db.select()
      .from(ordersTable)
      .innerJoin(customersTable, eq(ordersTable.customer_id, customersTable.id))
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .innerJoin(jewelleryItemsTable, eq(orderItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .where(eq(ordersTable.customer_id, customerId))
      .limit(limit)
      .offset(offset)
      .execute();

    // Group results by order
    const ordersMap = new Map<number, OrderWithItems>();

    results.forEach(result => {
      const order = result.orders;
      const customer = result.customers;
      const orderItem = result.order_items;
      const jewelleryItem = result.jewellery_items;

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          ...order,
          total_amount: parseFloat(order.total_amount),
          customer: {
            ...customer
          },
          order_items: []
        });
      }

      const existingOrder = ordersMap.get(order.id)!;
      existingOrder.order_items.push({
        ...orderItem,
        price_per_item: parseFloat(orderItem.price_per_item),
        jewellery_item: {
          ...jewelleryItem,
          price: parseFloat(jewelleryItem.price)
        }
      });
    });

    return Array.from(ordersMap.values());
  } catch (error) {
    console.error('Get customer orders failed:', error);
    throw error;
  }
};