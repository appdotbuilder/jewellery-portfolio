import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { type CustomerQuery, type PaginationInput } from '../schema';
import { desc } from 'drizzle-orm';

export const getCustomerQueries = async (input?: PaginationInput): Promise<CustomerQuery[]> => {
  try {
    // Set default pagination values if input is not provided
    const page = input?.page || 1;
    const limit = input?.limit || 10;
    const offset = (page - 1) * limit;

    // Query customer queries with pagination, ordered by created_at descending
    const results = await db.select()
      .from(customerQueriesTable)
      .orderBy(desc(customerQueriesTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Return the results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Customer queries fetch failed:', error);
    throw error;
  }
};