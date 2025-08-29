import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type JewelleryItem, type PaginationInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getJewelleryItems = async (input?: PaginationInput): Promise<JewelleryItem[]> => {
  try {
    // Default pagination values if not provided
    const page = input?.page || 1;
    const limit = input?.limit || 10;
    const offset = (page - 1) * limit;

    // Query for active jewellery items only
    const results = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.is_active, true))
      .orderBy(desc(jewelleryItemsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch active jewellery items:', error);
    throw error;
  }
};

export const getAllJewelleryItems = async (input?: PaginationInput): Promise<JewelleryItem[]> => {
  try {
    // Default pagination values if not provided
    const page = input?.page || 1;
    const limit = input?.limit || 10;
    const offset = (page - 1) * limit;

    // Query for ALL jewellery items (including inactive)
    const results = await db.select()
      .from(jewelleryItemsTable)
      .orderBy(desc(jewelleryItemsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch all jewellery items:', error);
    throw error;
  }
};