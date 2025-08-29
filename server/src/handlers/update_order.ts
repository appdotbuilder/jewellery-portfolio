import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrder = async (input: UpdateOrderInput): Promise<Order | null> => {
  try {
    // Check if order exists
    const existingOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.id))
      .execute();

    if (existingOrder.length === 0) {
      return null;
    }

    // Prepare update values, converting numeric fields
    const updateValues: any = {};
    
    if (input.status !== undefined) {
      updateValues.status = input.status;
    }
    
    if (input.payment_status !== undefined) {
      updateValues.payment_status = input.payment_status;
    }
    
    if (input.payment_method !== undefined) {
      updateValues.payment_method = input.payment_method;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateValues)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const updatedOrder = result[0];
    return {
      ...updatedOrder,
      total_amount: parseFloat(updatedOrder.total_amount)
    };
  } catch (error) {
    console.error('Order update failed:', error);
    throw error;
  }
};