import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateCustomerQueryInput, type CustomerQuery } from '../schema';

export const updateCustomerQuery = async (input: UpdateCustomerQueryInput): Promise<CustomerQuery | null> => {
  try {
    // Update the customer query status
    const result = await db.update(customerQueriesTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(customerQueriesTable.id, input.id))
      .returning()
      .execute();

    // Return null if no query was found/updated
    if (result.length === 0) {
      return null;
    }

    // Return the updated query
    const updatedQuery = result[0];
    return {
      ...updatedQuery,
      // No numeric conversions needed for customer queries table
    };
  } catch (error) {
    console.error('Customer query update failed:', error);
    throw error;
  }
};