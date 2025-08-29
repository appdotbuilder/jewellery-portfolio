import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { type UpdateCartItemInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateCartItem = async (input: UpdateCartItemInput): Promise<CartItem | null> => {
  try {
    // First, check if the cart item exists and get associated jewellery item for stock validation
    const cartItemWithJewellery = await db.select({
      cartItem: cartItemsTable,
      jewelleryItem: jewelleryItemsTable
    })
      .from(cartItemsTable)
      .innerJoin(jewelleryItemsTable, eq(cartItemsTable.jewellery_item_id, jewelleryItemsTable.id))
      .where(eq(cartItemsTable.id, input.id))
      .execute();

    if (cartItemWithJewellery.length === 0) {
      return null; // Cart item doesn't exist
    }

    const { cartItem, jewelleryItem } = cartItemWithJewellery[0];

    // Check stock availability
    if (input.quantity > jewelleryItem.stock_quantity) {
      throw new Error(`Insufficient stock. Available: ${jewelleryItem.stock_quantity}, requested: ${input.quantity}`);
    }

    // Check if jewellery item is active
    if (!jewelleryItem.is_active) {
      throw new Error('Jewellery item is no longer available');
    }

    // Update the cart item quantity
    const result = await db.update(cartItemsTable)
      .set({
        quantity: input.quantity
      })
      .where(eq(cartItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Cart item update failed:', error);
    throw error;
  }
};