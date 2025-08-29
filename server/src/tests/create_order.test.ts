import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, cartItemsTable, jewelleryItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create a customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();
    const customer = customerResult[0];

    // Create jewellery items
    const itemsResult = await db.insert(jewelleryItemsTable)
      .values([
        {
          name: 'Gold Ring',
          materials: '18k Gold',
          description: 'Beautiful gold ring',
          price: '199.99',
          stock_quantity: 10,
          is_active: true
        },
        {
          name: 'Silver Necklace',
          materials: 'Sterling Silver',
          description: 'Elegant silver necklace',
          price: '99.50',
          stock_quantity: 5,
          is_active: true
        },
        {
          name: 'Inactive Item',
          materials: 'Gold',
          description: 'Not available',
          price: '50.00',
          stock_quantity: 1,
          is_active: false
        }
      ])
      .returning()
      .execute();

    const sessionId = 'test-session-123';

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: sessionId,
          jewellery_item_id: itemsResult[0].id,
          quantity: 2
        },
        {
          session_id: sessionId,
          jewellery_item_id: itemsResult[1].id,
          quantity: 1
        }
      ])
      .execute();

    return {
      customer,
      items: itemsResult,
      sessionId,
      totalAmount: (199.99 * 2) + (99.50 * 1) // 499.48
    };
  };

  const testInput: CreateOrderInput = {
    customer_id: 1, // Will be overwritten in tests
    total_amount: 499.48,
    shipping_address: '123 Test St, Test City, TC 12345',
    billing_address: '456 Billing Ave, Bill City, BC 67890',
    payment_method: 'credit_card'
  };

  it('should create an order successfully', async () => {
    const { customer, sessionId, totalAmount } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: totalAmount };

    const result = await createOrder(input, sessionId);

    // Verify order properties
    expect(result.id).toBeDefined();
    expect(result.customer_id).toEqual(customer.id);
    expect(result.total_amount).toEqual(499.48);
    expect(result.status).toEqual('pending');
    expect(result.shipping_address).toEqual(input.shipping_address);
    expect(result.billing_address).toEqual(input.billing_address);
    expect(result.payment_status).toEqual('pending');
    expect(result.payment_method).toEqual('credit_card');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save order to database', async () => {
    const { customer, sessionId, totalAmount } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: totalAmount };

    const result = await createOrder(input, sessionId);

    // Verify order in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_id).toEqual(customer.id);
    expect(parseFloat(orders[0].total_amount)).toEqual(499.48);
    expect(orders[0].status).toEqual('pending');
  });

  it('should create order items', async () => {
    const { customer, items, sessionId, totalAmount } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: totalAmount };

    const result = await createOrder(input, sessionId);

    // Verify order items in database
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result.id))
      .execute();

    expect(orderItems).toHaveLength(2);
    
    // Check first item
    const ringItem = orderItems.find(item => item.jewellery_item_id === items[0].id);
    expect(ringItem).toBeDefined();
    expect(ringItem!.quantity).toEqual(2);
    expect(parseFloat(ringItem!.price_per_item)).toEqual(199.99);

    // Check second item
    const necklaceItem = orderItems.find(item => item.jewellery_item_id === items[1].id);
    expect(necklaceItem).toBeDefined();
    expect(necklaceItem!.quantity).toEqual(1);
    expect(parseFloat(necklaceItem!.price_per_item)).toEqual(99.50);
  });

  it('should update stock quantities', async () => {
    const { customer, items, sessionId, totalAmount } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: totalAmount };

    await createOrder(input, sessionId);

    // Check updated stock quantities
    const updatedItems = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, items[0].id))
      .execute();

    expect(updatedItems[0].stock_quantity).toEqual(8); // 10 - 2 = 8

    const updatedNecklace = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, items[1].id))
      .execute();

    expect(updatedNecklace[0].stock_quantity).toEqual(4); // 5 - 1 = 4
  });

  it('should clear cart after order creation', async () => {
    const { customer, sessionId, totalAmount } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: totalAmount };

    await createOrder(input, sessionId);

    // Verify cart is empty
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should throw error for non-existent customer', async () => {
    const { sessionId } = await setupTestData();
    const input = { ...testInput, customer_id: 999 };

    await expect(createOrder(input, sessionId)).rejects.toThrow(/customer.*not found/i);
  });

  it('should throw error for empty cart', async () => {
    const { customer } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id };
    const emptySessionId = 'empty-session';

    await expect(createOrder(input, emptySessionId)).rejects.toThrow(/cart is empty/i);
  });

  it('should throw error for insufficient stock', async () => {
    const { customer, items, sessionId } = await setupTestData();
    
    // Add more items to cart than available in stock
    await db.insert(cartItemsTable)
      .values({
        session_id: sessionId,
        jewellery_item_id: items[1].id, // Silver necklace (stock: 5)
        quantity: 10 // More than available
      })
      .execute();

    const input = { ...testInput, customer_id: customer.id };

    await expect(createOrder(input, sessionId)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error for inactive items', async () => {
    const { customer, items } = await setupTestData();
    const sessionId = 'inactive-session';

    // Add inactive item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: sessionId,
        jewellery_item_id: items[2].id, // Inactive item
        quantity: 1
      })
      .execute();

    const input = { ...testInput, customer_id: customer.id, total_amount: 50.00 };

    await expect(createOrder(input, sessionId)).rejects.toThrow(/no longer available/i);
  });

  it('should throw error for total amount mismatch', async () => {
    const { customer, sessionId } = await setupTestData();
    const input = { ...testInput, customer_id: customer.id, total_amount: 100.00 }; // Wrong amount

    await expect(createOrder(input, sessionId)).rejects.toThrow(/total amount mismatch/i);
  });

  it('should handle null payment method', async () => {
    const { customer, sessionId, totalAmount } = await setupTestData();
    const input = { 
      ...testInput, 
      customer_id: customer.id, 
      total_amount: totalAmount,
      payment_method: null 
    };

    const result = await createOrder(input, sessionId);

    expect(result.payment_method).toBeNull();
  });
});