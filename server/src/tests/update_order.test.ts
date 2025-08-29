import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, customersTable } from '../db/schema';
import { type UpdateOrderInput, type CreateCustomerInput } from '../schema';
import { updateOrder } from '../handlers/update_order';
import { eq } from 'drizzle-orm';

// Helper to create a test customer
const createTestCustomer = async (): Promise<number> => {
  const customerInput: CreateCustomerInput = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  };

  const result = await db.insert(customersTable)
    .values(customerInput)
    .returning()
    .execute();

  return result[0].id;
};

// Helper to create a test order
const createTestOrder = async (customerId: number) => {
  const orderData = {
    customer_id: customerId,
    total_amount: '299.99',
    status: 'pending' as const,
    shipping_address: '123 Test Street, Test City',
    billing_address: '123 Test Street, Test City',
    payment_status: 'pending',
    payment_method: 'credit_card'
  };

  const result = await db.insert(ordersTable)
    .values(orderData)
    .returning()
    .execute();

  return result[0];
};

describe('updateOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      status: 'processing'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(order.id);
    expect(result!.status).toEqual('processing');
    expect(result!.total_amount).toEqual(299.99);
    expect(typeof result!.total_amount).toEqual('number');
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > order.updated_at).toBe(true);
  });

  it('should update payment status', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      payment_status: 'paid'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.payment_status).toEqual('paid');
    expect(result!.status).toEqual('pending'); // Should remain unchanged
  });

  it('should update payment method', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      payment_method: 'bank_transfer'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.payment_method).toEqual('bank_transfer');
  });

  it('should update multiple fields at once', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      status: 'shipped',
      payment_status: 'paid',
      payment_method: 'paypal'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('shipped');
    expect(result!.payment_status).toEqual('paid');
    expect(result!.payment_method).toEqual('paypal');
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      status: 'delivered',
      payment_status: 'paid'
    };

    await updateOrder(updateInput);

    // Verify changes are persisted in database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrder).toHaveLength(1);
    expect(updatedOrder[0].status).toEqual('delivered');
    expect(updatedOrder[0].payment_status).toEqual('paid');
    expect(updatedOrder[0].updated_at > order.updated_at).toBe(true);
  });

  it('should return null for non-existent order', async () => {
    const updateInput: UpdateOrderInput = {
      id: 99999,
      status: 'processing'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeNull();
  });

  it('should handle null payment method update', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      payment_method: null
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.payment_method).toBeNull();
  });

  it('should update only provided fields', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.status).toEqual('cancelled');
    expect(result!.payment_status).toEqual('pending'); // Should remain unchanged
    expect(result!.payment_method).toEqual('credit_card'); // Should remain unchanged
    expect(result!.total_amount).toEqual(299.99); // Should remain unchanged
  });

  it('should handle all valid order statuses', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

    for (const status of statuses) {
      const updateInput: UpdateOrderInput = {
        id: order.id,
        status: status
      };

      const result = await updateOrder(updateInput);
      expect(result!.status).toEqual(status);
    }
  });

  it('should preserve other order fields during update', async () => {
    const customerId = await createTestCustomer();
    const order = await createTestOrder(customerId);

    const updateInput: UpdateOrderInput = {
      id: order.id,
      status: 'processing'
    };

    const result = await updateOrder(updateInput);

    expect(result).toBeDefined();
    expect(result!.customer_id).toEqual(order.customer_id);
    expect(result!.total_amount).toEqual(299.99);
    expect(result!.shipping_address).toEqual(order.shipping_address);
    expect(result!.billing_address).toEqual(order.billing_address);
    expect(result!.created_at).toEqual(order.created_at);
  });
});