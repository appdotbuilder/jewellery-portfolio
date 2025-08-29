import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { type CartWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export const getCart = async (sessionId: string): Promise<CartWithItems> => {
  try {
    // Query cart items with joined jewellery item details
    const results = await db.select()
      .from(cartItemsTable)
      .innerJoin(jewelleryItemsTable, eq(cartItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    // Transform results to match CartWithItems schema
    const items = results.map(result => ({
      id: result.cart_items.id,
      quantity: result.cart_items.quantity,
      jewellery_item: {
        ...result.jewellery_items,
        price: parseFloat(result.jewellery_items.price) // Convert numeric field back to number
      }
    }));

    // Calculate total amount
    const total_amount = items.reduce((total, item) => {
      return total + (item.jewellery_item.price * item.quantity);
    }, 0);

    return {
      items,
      total_amount
    };
  } catch (error) {
    console.error('Get cart failed:', error);
    throw error;
  }
};