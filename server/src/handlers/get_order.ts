import { db } from '../db';
import { ordersTable, customersTable, orderItemsTable, jewelleryItemsTable } from '../db/schema';
import { type OrderWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export const getOrder = async (id: number): Promise<OrderWithItems | null> => {
  try {
    // Get the order with customer details
    const orderResults = await db.select()
      .from(ordersTable)
      .innerJoin(customersTable, eq(ordersTable.customer_id, customersTable.id))
      .where(eq(ordersTable.id, id))
      .execute();

    if (orderResults.length === 0) {
      return null;
    }

    const orderResult = orderResults[0];

    // Get order items with jewellery item details
    const orderItemResults = await db.select()
      .from(orderItemsTable)
      .innerJoin(jewelleryItemsTable, eq(orderItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .where(eq(orderItemsTable.order_id, id))
      .execute();

    // Convert numeric fields and build the response
    const order = orderResult.orders;
    const customer = orderResult.customers;

    const orderItems = orderItemResults.map(result => ({
      id: result.order_items.id,
      order_id: result.order_items.order_id,
      jewellery_item_id: result.order_items.jewellery_item_id,
      quantity: result.order_items.quantity,
      price_per_item: parseFloat(result.order_items.price_per_item),
      created_at: result.order_items.created_at,
      jewellery_item: {
        id: result.jewellery_items.id,
        name: result.jewellery_items.name,
        materials: result.jewellery_items.materials,
        description: result.jewellery_items.description,
        price: parseFloat(result.jewellery_items.price),
        image_url: result.jewellery_items.image_url,
        stock_quantity: result.jewellery_items.stock_quantity,
        is_active: result.jewellery_items.is_active,
        created_at: result.jewellery_items.created_at,
        updated_at: result.jewellery_items.updated_at
      }
    }));

    return {
      id: order.id,
      customer_id: order.customer_id,
      total_amount: parseFloat(order.total_amount),
      status: order.status,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      created_at: order.created_at,
      updated_at: order.updated_at,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        created_at: customer.created_at
      },
      order_items: orderItems
    };
  } catch (error) {
    console.error('Get order failed:', error);
    throw error;
  }
};