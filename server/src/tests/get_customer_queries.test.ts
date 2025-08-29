import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { type CreateCustomerQueryInput, type PaginationInput } from '../schema';
import { getCustomerQueries } from '../handlers/get_customer_queries';
import { eq } from 'drizzle-orm';

// Test data for customer queries
const testQueries = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    subject: 'Product Inquiry',
    message: 'I would like to know more about your gold rings.'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    subject: 'Order Issue',
    message: 'My order is delayed. Can you please help?'
  },
  {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    subject: 'Return Request',
    message: 'I want to return a necklace I purchased last week.'
  }
];

describe('getCustomerQueries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no queries exist', async () => {
    const result = await getCustomerQueries();

    expect(result).toEqual([]);
  });

  it('should return customer queries ordered by created_at desc', async () => {
    // Insert test queries with slight delays to ensure different timestamps
    for (const query of testQueries) {
      await db.insert(customerQueriesTable)
        .values(query)
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const result = await getCustomerQueries();

    expect(result).toHaveLength(3);
    
    // Verify ordering - most recent first
    expect(result[0].name).toEqual('Bob Johnson'); // Last inserted
    expect(result[1].name).toEqual('Jane Smith');
    expect(result[2].name).toEqual('John Doe'); // First inserted

    // Verify all fields are present
    expect(result[0].id).toBeDefined();
    expect(result[0].email).toEqual('bob@example.com');
    expect(result[0].subject).toEqual('Return Request');
    expect(result[0].message).toEqual('I want to return a necklace I purchased last week.');
    expect(result[0].status).toEqual('new'); // Default status
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should apply pagination correctly', async () => {
    // Insert 5 test queries
    const moreQueries = [
      ...testQueries,
      {
        name: 'Alice Brown',
        email: 'alice@example.com',
        subject: 'Custom Order',
        message: 'Can you create a custom engagement ring?'
      },
      {
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        subject: 'Store Hours',
        message: 'What are your store hours during holidays?'
      }
    ];

    for (const query of moreQueries) {
      await db.insert(customerQueriesTable)
        .values(query)
        .execute();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Test first page with limit 2
    const paginationInput: PaginationInput = { page: 1, limit: 2 };
    const firstPage = await getCustomerQueries(paginationInput);

    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].name).toEqual('Charlie Wilson'); // Most recent
    expect(firstPage[1].name).toEqual('Alice Brown');

    // Test second page with limit 2
    const secondPage = await getCustomerQueries({ page: 2, limit: 2 });

    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].name).toEqual('Bob Johnson');
    expect(secondPage[1].name).toEqual('Jane Smith');

    // Test third page with limit 2
    const thirdPage = await getCustomerQueries({ page: 3, limit: 2 });

    expect(thirdPage).toHaveLength(1);
    expect(thirdPage[0].name).toEqual('John Doe'); // Oldest
  });

  it('should use default pagination when no input provided', async () => {
    // Insert test queries
    for (const query of testQueries) {
      await db.insert(customerQueriesTable)
        .values(query)
        .execute();
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const result = await getCustomerQueries();

    // Should return all 3 queries (within default limit of 10)
    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Bob Johnson');
  });

  it('should handle empty page correctly', async () => {
    // Insert only 2 queries
    for (let i = 0; i < 2; i++) {
      await db.insert(customerQueriesTable)
        .values(testQueries[i])
        .execute();
    }

    // Request page 2 with limit 2 (should be empty)
    const result = await getCustomerQueries({ page: 2, limit: 2 });

    expect(result).toEqual([]);
  });

  it('should handle queries with different statuses', async () => {
    // Insert queries and update their statuses
    const insertedQuery1 = await db.insert(customerQueriesTable)
      .values(testQueries[0])
      .returning()
      .execute();

    const insertedQuery2 = await db.insert(customerQueriesTable)
      .values(testQueries[1])
      .returning()
      .execute();

    // Update statuses
    await db.update(customerQueriesTable)
      .set({ status: 'in_progress' })
      .where(eq(customerQueriesTable.id, insertedQuery1[0].id))
      .execute();

    await db.update(customerQueriesTable)
      .set({ status: 'resolved' })
      .where(eq(customerQueriesTable.id, insertedQuery2[0].id))
      .execute();

    const result = await getCustomerQueries();

    expect(result).toHaveLength(2);
    
    // Should include queries with all statuses
    const statuses = result.map(q => q.status);
    expect(statuses).toContain('resolved');
    expect(statuses).toContain('in_progress');
  });
});