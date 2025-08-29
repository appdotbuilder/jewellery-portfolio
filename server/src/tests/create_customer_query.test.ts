import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customerQueriesTable } from '../db/schema';
import { type CreateCustomerQueryInput } from '../schema';
import { createCustomerQuery } from '../handlers/create_customer_query';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCustomerQueryInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  subject: 'Question about jewelry care',
  message: 'How should I clean my silver necklace?'
};

describe('createCustomerQuery', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer query', async () => {
    const result = await createCustomerQuery(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.subject).toEqual('Question about jewelry care');
    expect(result.message).toEqual('How should I clean my silver necklace?');
    expect(result.status).toEqual('new');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer query to database', async () => {
    const result = await createCustomerQuery(testInput);

    // Query using proper drizzle syntax
    const queries = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, result.id))
      .execute();

    expect(queries).toHaveLength(1);
    expect(queries[0].name).toEqual('John Doe');
    expect(queries[0].email).toEqual('john.doe@example.com');
    expect(queries[0].subject).toEqual('Question about jewelry care');
    expect(queries[0].message).toEqual('How should I clean my silver necklace?');
    expect(queries[0].status).toEqual('new');
    expect(queries[0].created_at).toBeInstanceOf(Date);
    expect(queries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple customer queries with different data', async () => {
    const firstInput: CreateCustomerQueryInput = {
      name: 'Alice Smith',
      email: 'alice@example.com',
      subject: 'Custom order inquiry',
      message: 'Can you create a custom engagement ring?'
    };

    const secondInput: CreateCustomerQueryInput = {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      subject: 'Delivery question',
      message: 'What are your shipping options?'
    };

    const firstResult = await createCustomerQuery(firstInput);
    const secondResult = await createCustomerQuery(secondInput);

    // Verify both queries were created with unique IDs
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.name).toEqual('Alice Smith');
    expect(secondResult.name).toEqual('Bob Johnson');
    expect(firstResult.subject).toEqual('Custom order inquiry');
    expect(secondResult.subject).toEqual('Delivery question');

    // Verify both are saved in database
    const allQueries = await db.select().from(customerQueriesTable).execute();
    expect(allQueries).toHaveLength(2);
  });

  it('should set correct default status for new queries', async () => {
    const result = await createCustomerQuery(testInput);

    expect(result.status).toEqual('new');

    // Verify in database as well
    const savedQuery = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, result.id))
      .execute();

    expect(savedQuery[0].status).toEqual('new');
  });

  it('should handle special characters in message content', async () => {
    const specialInput: CreateCustomerQueryInput = {
      name: 'María González',
      email: 'maria@example.com',
      subject: 'Pregunta sobre joyería',
      message: 'Hello! I have a question about your products. Can you help? 🙂 Special chars: @#$%^&*()'
    };

    const result = await createCustomerQuery(specialInput);

    expect(result.name).toEqual('María González');
    expect(result.message).toEqual('Hello! I have a question about your products. Can you help? 🙂 Special chars: @#$%^&*()');

    // Verify special characters are properly stored
    const savedQuery = await db.select()
      .from(customerQueriesTable)
      .where(eq(customerQueriesTable.id, result.id))
      .execute();

    expect(savedQuery[0].name).toEqual('María González');
    expect(savedQuery[0].message).toContain('🙂');
  });
});