import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export const createCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
  try {
    // Check if customer with this email already exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.email, input.email))
      .execute();

    if (existingCustomer.length > 0) {
      throw new Error(`Customer with email ${input.email} already exists`);
    }

    // Insert new customer record
    const result = await db.insert(customersTable)
      .values({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
};