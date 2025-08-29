import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const clearCart = async (sessionId: string): Promise<boolean> => {
  try {
    // Delete all cart items for the given session_id
    const result = await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    // Return true if operation completed successfully
    // Note: result.rowCount can be 0 if no items existed, but operation still succeeded
    return true;
  } catch (error) {
    console.error('Clear cart failed:', error);
    throw error;
  }
};