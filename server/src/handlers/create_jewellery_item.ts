import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type CreateJewelleryItemInput, type JewelleryItem } from '../schema';

export const createJewelleryItem = async (input: CreateJewelleryItemInput): Promise<JewelleryItem> => {
  try {
    // Insert jewellery item record
    const result = await db.insert(jewelleryItemsTable)
      .values({
        name: input.name,
        materials: input.materials,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        image_url: input.image_url,
        stock_quantity: input.stock_quantity // Integer column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const jewelleryItem = result[0];
    return {
      ...jewelleryItem,
      price: parseFloat(jewelleryItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Jewellery item creation failed:', error);
    throw error;
  }
};