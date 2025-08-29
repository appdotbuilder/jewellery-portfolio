import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { type CreateCustomerQueryInput, type UpdateCustomerQueryInput } from '../schema';
import { updateCustomerQuery } from '../handlers/update_customer_query';
import { eq } from 'drizzle-orm';

// Test data for creating prerequisite customer query
const testQueryData: CreateCustomerQueryInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  subject: 'Product Inquiry',
  message: 'I would like to know more about your gold rings collection.'
};

// Helper function to create a customer query
const createTestQuery = async () => {
  const result = await db.insert(customerQueriesTable)
    .values({
      name: testQueryData.name,
      email: testQueryData.email,
      subject: testQueryData.subject,
      message: testQueryData.message,
      status: 'new'
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateCustomerQuery', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update customer query status', async () => {
    // Create a test customer query
    const createdQuery = await createTestQuery();

    // Update the query status
    const updateInput: UpdateCustomerQueryInput = {
      id: createdQuery.id,
      status: 'in_progress'
    };

    const result = await updateCustomerQuery(updateInput);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdQuery.id);
    expect(result!.status).toEqual('in_progress');
    expect(result!.name).toEqual(testQueryData.name);
    expect(result!.email).toEqual(testQueryData.email);
    expect(result!.subject).toEqual(testQueryData.subject);
    expect(result!.message).toEqual(testQueryData.message);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(createdQuery.updated_at.getTime());
  });

  it('should update query status to resolved', async () => {
    // Create a test customer query
    const createdQuery = await createTestQuery();

    // Update the query status to resolved
    const updateInput: UpdateCustomerQueryInput = {
      id: createdQuery.id,
      status: 'resolved'
    };

    const result = await updateCustomerQuery(updateInput);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.status).toEqual('resolved');
  });

  it('should persist changes to database', async () => {
    // Create a test customer query
    const createdQuery = await createTestQuery();

    // Update the query status
    const updateInput: UpdateCustomerQueryInput = {
      id: createdQuery.id,
      status: 'in_progress'
    };

    await updateCustomerQuery(updateInput);

    // Verify the changes were persisted in the database
    const queriesInDb = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, createdQuery.id))
      .execute();

    expect(queriesInDb).toHaveLength(1);
    expect(queriesInDb[0].status).toEqual('in_progress');
    expect(queriesInDb[0].updated_at).toBeInstanceOf(Date);
    expect(queriesInDb[0].updated_at.getTime()).toBeGreaterThan(createdQuery.updated_at.getTime());
  });

  it('should return null when query does not exist', async () => {
    const updateInput: UpdateCustomerQueryInput = {
      id: 999, // Non-existent ID
      status: 'in_progress'
    };

    const result = await updateCustomerQuery(updateInput);

    expect(result).toBeNull();
  });

  it('should handle multiple status transitions', async () => {
    // Create a test customer query
    const createdQuery = await createTestQuery();

    // First update: new -> in_progress
    const firstUpdate: UpdateCustomerQueryInput = {
      id: createdQuery.id,
      status: 'in_progress'
    };

    const firstResult = await updateCustomerQuery(firstUpdate);
    expect(firstResult!.status).toEqual('in_progress');

    // Second update: in_progress -> resolved
    const secondUpdate: UpdateCustomerQueryInput = {
      id: createdQuery.id,
      status: 'resolved'
    };

    const secondResult = await updateCustomerQuery(secondUpdate);
    expect(secondResult!.status).toEqual('resolved');
    expect(secondResult!.updated_at.getTime()).toBeGreaterThan(firstResult!.updated_at.getTime());
  });

  it('should only update the specified query', async () => {
    // Create two test customer queries
    const firstQuery = await createTestQuery();
    const secondQueryData = {
      ...testQueryData,
      email: 'jane.doe@example.com',
      subject: 'Different Subject'
    };
    
    const secondQueryResult = await db.insert(customerQueriesTable)
      .values({
        name: secondQueryData.name,
        email: secondQueryData.email,
        subject: secondQueryData.subject,
        message: secondQueryData.message,
        status: 'new'
      })
      .returning()
      .execute();
    
    const secondQuery = secondQueryResult[0];

    // Update only the first query
    const updateInput: UpdateCustomerQueryInput = {
      id: firstQuery.id,
      status: 'resolved'
    };

    await updateCustomerQuery(updateInput);

    // Verify only the first query was updated
    const firstQueryInDb = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, firstQuery.id))
      .execute();

    const secondQueryInDb = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, secondQuery.id))
      .execute();

    expect(firstQueryInDb[0].status).toEqual('resolved');
    expect(secondQueryInDb[0].status).toEqual('new'); // Should remain unchanged
  });
});