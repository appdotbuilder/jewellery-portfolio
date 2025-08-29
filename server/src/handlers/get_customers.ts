import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer, type PaginationInput } from '../schema';
import { desc } from 'drizzle-orm';

export const getCustomers = async (input?: PaginationInput): Promise<Customer[]> => {
  try {
    // Apply default pagination values if not provided
    const limit = input?.limit ?? 10;
    const page = input?.page ?? 1;
    const offset = (page - 1) * limit;

    // Build the query with pagination and ordering
    let query = db.select()
      .from(customersTable)
      .orderBy(desc(customersTable.created_at))
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Return customers (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Get customers failed:', error);
    throw error;
  }
};