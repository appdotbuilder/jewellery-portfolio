import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { type CreateCustomerQueryInput, type CustomerQuery } from '../schema';

export const createCustomerQuery = async (input: CreateCustomerQueryInput): Promise<CustomerQuery> => {
  try {
    // Insert customer query record
    const result = await db.insert(customerQueriesTable)
      .values({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: 'new' // Default status for new queries
      })
      .returning()
      .execute();

    // Return the created customer query
    const customerQuery = result[0];
    return {
      ...customerQuery
    };
  } catch (error) {
    console.error('Customer query creation failed:', error);
    throw error;
  }
};