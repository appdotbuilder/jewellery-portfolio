import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { type AddToCartInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addToCart = async (input: AddToCartInput): Promise<CartItem> => {
  try {
    // First, verify the jewellery item exists and has sufficient stock
    const jewelleryItem = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, input.jewellery_item_id))
      .execute();

    if (jewelleryItem.length === 0) {
      throw new Error(`Jewellery item with ID ${input.jewellery_item_id} not found`);
    }

    const item = jewelleryItem[0];
    
    // Check if item is active
    if (!item.is_active) {
      throw new Error(`Jewellery item with ID ${input.jewellery_item_id} is not available`);
    }

    // Check for existing cart item for this session and jewellery item
    const existingCartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.session_id, input.session_id),
        eq(cartItemsTable.jewellery_item_id, input.jewellery_item_id)
      ))
      .execute();

    if (existingCartItems.length > 0) {
      // Update existing cart item quantity
      const existingItem = existingCartItems[0];
      const newQuantity = existingItem.quantity + input.quantity;

      // Check if total quantity exceeds stock
      if (newQuantity > item.stock_quantity) {
        throw new Error(`Insufficient stock. Available: ${item.stock_quantity}, Requested total: ${newQuantity}`);
      }

      const updatedItems = await db.update(cartItemsTable)
        .set({ quantity: newQuantity })
        .where(eq(cartItemsTable.id, existingItem.id))
        .returning()
        .execute();

      return updatedItems[0];
    } else {
      // Check if requested quantity exceeds available stock
      if (input.quantity > item.stock_quantity) {
        throw new Error(`Insufficient stock. Available: ${item.stock_quantity}, Requested: ${input.quantity}`);
      }

      // Create new cart item
      const newCartItems = await db.insert(cartItemsTable)
        .values({
          session_id: input.session_id,
          jewellery_item_id: input.jewellery_item_id,
          quantity: input.quantity
        })
        .returning()
        .execute();

      return newCartItems[0];
    }
  } catch (error) {
    console.error('Add to cart failed:', error);
    throw error;
  }
};