import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteJewelleryItem = async (id: number): Promise<boolean> => {
  try {
    // Soft delete by setting is_active = false
    const result = await db.update(jewelleryItemsTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(jewelleryItemsTable.id, id))
      .execute();

    // Return true if a row was affected (item was found and updated)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Jewellery item deletion failed:', error);
    throw error;
  }
};