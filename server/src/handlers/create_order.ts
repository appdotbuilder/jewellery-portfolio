import { db } from '../db';
import { customersTable, cartItemsTable, jewelleryItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput, sessionId: string): Promise<Order> => {
  try {
    // 1. Validate customer exists
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customers.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // 2. Get cart items for session with jewellery item details
    const cartItems = await db.select({
      id: cartItemsTable.id,
      jewellery_item_id: cartItemsTable.jewellery_item_id,
      quantity: cartItemsTable.quantity,
      name: jewelleryItemsTable.name,
      price: jewelleryItemsTable.price,
      stock_quantity: jewelleryItemsTable.stock_quantity,
      is_active: jewelleryItemsTable.is_active
    })
      .from(cartItemsTable)
      .innerJoin(jewelleryItemsTable, eq(cartItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // 3. Validate stock availability and active status
    for (const item of cartItems) {
      if (!item.is_active) {
        throw new Error(`Item "${item.name}" is no longer available`);
      }
      if (item.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${item.name}". Available: ${item.stock_quantity}, Requested: ${item.quantity}`);
      }
    }

    // Calculate total amount from cart items (for validation)
    const calculatedTotal = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Validate total amount matches calculation (allow small floating point differences)
    if (Math.abs(calculatedTotal - input.total_amount) > 0.01) {
      throw new Error(`Total amount mismatch. Expected: ${calculatedTotal.toFixed(2)}, Provided: ${input.total_amount.toFixed(2)}`);
    }

    // 4. Create order in orders table
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: input.customer_id,
        total_amount: input.total_amount.toString(), // Convert to string for numeric column
        shipping_address: input.shipping_address,
        billing_address: input.billing_address,
        payment_method: input.payment_method
      })
      .returning()
      .execute();

    const createdOrder = orderResult[0];

    // 5. Create order items in order_items table
    const orderItemsData = cartItems.map(item => ({
      order_id: createdOrder.id,
      jewellery_item_id: item.jewellery_item_id,
      quantity: item.quantity,
      price_per_item: item.price // Already a string from the database
    }));

    await db.insert(orderItemsTable)
      .values(orderItemsData)
      .execute();

    // 6. Update stock quantities
    for (const item of cartItems) {
      await db.update(jewelleryItemsTable)
        .set({ 
          stock_quantity: item.stock_quantity - item.quantity,
          updated_at: new Date()
        })
        .where(eq(jewelleryItemsTable.id, item.jewellery_item_id))
        .execute();
    }

    // 7. Clear cart
    await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    // 8. Return created order with numeric conversion
    return {
      ...createdOrder,
      total_amount: parseFloat(createdOrder.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};