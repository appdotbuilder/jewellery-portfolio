import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type UpdateJewelleryItemInput, type JewelleryItem } from '../schema';
import { eq, SQL } from 'drizzle-orm';

export const updateJewelleryItem = async (input: UpdateJewelleryItemInput): Promise<JewelleryItem | null> => {
  try {
    // First, check if the item exists
    const existingItem = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, input.id))
      .execute();

    if (existingItem.length === 0) {
      return null; // Item doesn't exist
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.materials !== undefined) {
      updateData.materials = input.materials;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }
    
    if (input.image_url !== undefined) {
      updateData.image_url = input.image_url;
    }
    
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity; // Integer column - no conversion needed
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the item
    const result = await db.update(jewelleryItemsTable)
      .set(updateData)
      .where(eq(jewelleryItemsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedItem = result[0];
    return {
      ...updatedItem,
      price: parseFloat(updatedItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Jewellery item update failed:', error);
    throw error;
  }
};