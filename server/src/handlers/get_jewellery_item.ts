import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type JewelleryItem } from '../schema';
import { eq } from 'drizzle-orm';

export const getJewelleryItem = async (id: number): Promise<JewelleryItem | null> => {
  try {
    // Query the database for the jewellery item by ID
    const results = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, id))
      .execute();

    // Return null if no item found
    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const item = results[0];
    return {
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Get jewellery item failed:', error);
    throw error;
  }
};