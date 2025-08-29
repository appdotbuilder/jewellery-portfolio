import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type PaginationInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';
import { eq } from 'drizzle-orm';

// Helper function to create test customers
const createTestCustomer = async (overrides: Partial<CreateCustomerInput> = {}) => {
  const defaultCustomer: CreateCustomerInput = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  };

  const customerData = { ...defaultCustomer, ...overrides };

  const result = await db.insert(customersTable)
    .values(customerData)
    .returning()
    .execute();

  return result[0];
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
  });

  it('should return all customers with default pagination', async () => {
    // Create test customers
    await createTestCustomer({ email: 'customer1@example.com', first_name: 'Alice' });
    await createTestCustomer({ email: 'customer2@example.com', first_name: 'Bob' });
    await createTestCustomer({ email: 'customer3@example.com', first_name: 'Charlie' });

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    expect(result[0].first_name).toBe('Charlie'); // Most recent first (desc order)
    expect(result[1].first_name).toBe('Bob');
    expect(result[2].first_name).toBe('Alice');
    
    // Verify all required fields are present
    result.forEach(customer => {
      expect(customer.id).toBeDefined();
      expect(customer.email).toBeDefined();
      expect(customer.first_name).toBeDefined();
      expect(customer.last_name).toBeDefined();
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.phone).toBeDefined(); // Can be null
    });
  });

  it('should apply pagination correctly', async () => {
    // Create 5 test customers
    for (let i = 1; i <= 5; i++) {
      await createTestCustomer({ 
        email: `customer${i}@example.com`, 
        first_name: `Customer${i}` 
      });
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const paginationInput: PaginationInput = {
      page: 2,
      limit: 2
    };

    const result = await getCustomers(paginationInput);

    expect(result).toHaveLength(2);
    // Should get customers 3 and 2 (ordered by created_at desc, page 2 with limit 2)
    expect(result[0].first_name).toBe('Customer3');
    expect(result[1].first_name).toBe('Customer2');
  });

  it('should handle first page pagination', async () => {
    // Create 5 test customers
    for (let i = 1; i <= 5; i++) {
      await createTestCustomer({ 
        email: `customer${i}@example.com`, 
        first_name: `Customer${i}` 
      });
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    const paginationInput: PaginationInput = {
      page: 1,
      limit: 3
    };

    const result = await getCustomers(paginationInput);

    expect(result).toHaveLength(3);
    // Should get the 3 most recent customers
    expect(result[0].first_name).toBe('Customer5');
    expect(result[1].first_name).toBe('Customer4');
    expect(result[2].first_name).toBe('Customer3');
  });

  it('should handle page beyond available data', async () => {
    // Create only 2 customers
    await createTestCustomer({ email: 'customer1@example.com' });
    await createTestCustomer({ email: 'customer2@example.com' });

    const paginationInput: PaginationInput = {
      page: 3,
      limit: 2
    };

    const result = await getCustomers(paginationInput);

    expect(result).toHaveLength(0);
  });

  it('should order customers by created_at in descending order', async () => {
    // Create customers with specific timing
    const customer1 = await createTestCustomer({ 
      email: 'first@example.com', 
      first_name: 'First' 
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const customer2 = await createTestCustomer({ 
      email: 'second@example.com', 
      first_name: 'Second' 
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const customer3 = await createTestCustomer({ 
      email: 'third@example.com', 
      first_name: 'Third' 
    });

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    // Most recent should be first
    expect(result[0].first_name).toBe('Third');
    expect(result[1].first_name).toBe('Second');
    expect(result[2].first_name).toBe('First');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThan(result[2].created_at.getTime());
  });

  it('should handle customers with nullable phone numbers', async () => {
    await createTestCustomer({ 
      email: 'with-phone@example.com', 
      phone: '+1234567890' 
    });
    
    await createTestCustomer({ 
      email: 'without-phone@example.com', 
      phone: null 
    });

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Find customers by email to verify phone handling
    const withPhone = result.find(c => c.email === 'with-phone@example.com');
    const withoutPhone = result.find(c => c.email === 'without-phone@example.com');

    expect(withPhone?.phone).toBe('+1234567890');
    expect(withoutPhone?.phone).toBeNull();
  });

  it('should save customers to database correctly', async () => {
    const testInput: CreateCustomerInput = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890'
    };

    // Create customer directly in database
    const insertResult = await db.insert(customersTable)
      .values(testInput)
      .returning()
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(insertResult[0].id);
    expect(result[0].email).toBe('test@example.com');
    expect(result[0].first_name).toBe('Test');
    expect(result[0].last_name).toBe('User');
    expect(result[0].phone).toBe('+1234567890');

    // Verify it exists in database
    const dbCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result[0].id))
      .execute();

    expect(dbCustomers).toHaveLength(1);
    expect(dbCustomers[0].email).toBe('test@example.com');
  });

  it('should handle large limit values within bounds', async () => {
    // Create 5 customers
    for (let i = 1; i <= 5; i++) {
      await createTestCustomer({ email: `customer${i}@example.com` });
    }

    // Request more than available
    const paginationInput: PaginationInput = {
      page: 1,
      limit: 100 // Max allowed by schema
    };

    const result = await getCustomers(paginationInput);

    expect(result).toHaveLength(5); // Should return all 5 available customers
  });
});