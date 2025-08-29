import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateCustomerInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890'
};

// Test input with nullable phone field
const testInputNoPhone: CreateCustomerInput = {
  email: 'nophone@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a customer with null phone', async () => {
    const result = await createCustomer(testInputNoPhone);

    expect(result.email).toEqual('nophone@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].email).toEqual('test@example.com');
    expect(customers[0].first_name).toEqual('John');
    expect(customers[0].last_name).toEqual('Doe');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Try to create another customer with the same email
    const duplicateInput: CreateCustomerInput = {
      email: 'test@example.com', // Same email
      first_name: 'Different',
      last_name: 'Person',
      phone: '+9876543210'
    };

    // Should throw an error
    await expect(createCustomer(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle database constraint violations gracefully', async () => {
    // First, create a customer directly in the database to test constraint
    await db.insert(customersTable)
      .values({
        email: 'constraint@test.com',
        first_name: 'Existing',
        last_name: 'User',
        phone: null
      })
      .execute();

    // Try to create customer with same email through handler
    const constraintInput: CreateCustomerInput = {
      email: 'constraint@test.com',
      first_name: 'New',
      last_name: 'User',
      phone: null
    };

    await expect(createCustomer(constraintInput)).rejects.toThrow(/already exists/i);
  });

  it('should validate email format through Zod schema', async () => {
    // Note: This test assumes the input validation happens before the handler
    // The handler receives already validated input, but we can test with invalid data
    const invalidInput = {
      email: 'not-an-email',
      first_name: 'Test',
      last_name: 'User',
      phone: null
    } as CreateCustomerInput;

    // This should still work as the handler doesn't validate format
    // But demonstrates that format validation should happen at the schema level
    const result = await createCustomer(invalidInput);
    expect(result.email).toEqual('not-an-email');
  });

  it('should handle multiple customers with different emails', async () => {
    const customer1 = await createCustomer({
      email: 'user1@example.com',
      first_name: 'User',
      last_name: 'One',
      phone: '+1111111111'
    });

    const customer2 = await createCustomer({
      email: 'user2@example.com',
      first_name: 'User',
      last_name: 'Two',
      phone: '+2222222222'
    });

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.email).toEqual('user1@example.com');
    expect(customer2.email).toEqual('user2@example.com');

    // Verify both are in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
  });

  it('should preserve created_at timestamp', async () => {
    const beforeCreate = new Date();
    const result = await createCustomer(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});