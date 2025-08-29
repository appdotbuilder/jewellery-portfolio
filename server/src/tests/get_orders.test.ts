import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, jewelleryItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateJewelleryItemInput, type CreateOrderInput, type CreateOrderItemInput, type PaginationInput } from '../schema';
import { getOrders, getCustomerOrders } from '../handlers/get_orders';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  const testCustomer: CreateCustomerInput = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  };

  const testCustomer2: CreateCustomerInput = {
    email: 'test2@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+0987654321'
  };

  const testJewellery: CreateJewelleryItemInput = {
    name: 'Gold Ring',
    materials: 'Gold, Diamond',
    description: 'Beautiful gold ring with diamond',
    price: 299.99,
    image_url: 'https://example.com/ring.jpg',
    stock_quantity: 10
  };

  const testJewellery2: CreateJewelleryItemInput = {
    name: 'Silver Necklace',
    materials: 'Silver, Pearl',
    description: 'Elegant silver necklace with pearl',
    price: 149.99,
    image_url: 'https://example.com/necklace.jpg',
    stock_quantity: 5
  };

  it('should fetch all orders with customer and item details', async () => {
    // Create test customers
    const [customer1, customer2] = await db.insert(customersTable)
      .values([testCustomer, testCustomer2])
      .returning()
      .execute();

    // Create test jewellery items
    const [jewellery1, jewellery2] = await db.insert(jewelleryItemsTable)
      .values([
        { ...testJewellery, price: testJewellery.price.toString() },
        { ...testJewellery2, price: testJewellery2.price.toString() }
      ])
      .returning()
      .execute();

    // Create test orders
    const testOrder1: CreateOrderInput = {
      customer_id: customer1.id,
      total_amount: 599.98,
      shipping_address: '123 Main St',
      billing_address: '123 Main St',
      payment_method: 'credit_card'
    };

    const testOrder2: CreateOrderInput = {
      customer_id: customer2.id,
      total_amount: 149.99,
      shipping_address: '456 Oak Ave',
      billing_address: '456 Oak Ave',
      payment_method: 'paypal'
    };

    const [order1, order2] = await db.insert(ordersTable)
      .values([
        { ...testOrder1, total_amount: testOrder1.total_amount.toString() },
        { ...testOrder2, total_amount: testOrder2.total_amount.toString() }
      ])
      .returning()
      .execute();

    // Create order items
    const testOrderItem1: CreateOrderItemInput = {
      order_id: order1.id,
      jewellery_item_id: jewellery1.id,
      quantity: 2,
      price_per_item: 299.99
    };

    const testOrderItem2: CreateOrderItemInput = {
      order_id: order2.id,
      jewellery_item_id: jewellery2.id,
      quantity: 1,
      price_per_item: 149.99
    };

    await db.insert(orderItemsTable)
      .values([
        { ...testOrderItem1, price_per_item: testOrderItem1.price_per_item.toString() },
        { ...testOrderItem2, price_per_item: testOrderItem2.price_per_item.toString() }
      ])
      .execute();

    // Test the handler
    const results = await getOrders();

    expect(results).toHaveLength(2);
    
    // Verify first order
    const firstOrder = results.find(order => order.customer.email === 'test@example.com');
    expect(firstOrder).toBeDefined();
    expect(firstOrder!.total_amount).toBe(599.98);
    expect(typeof firstOrder!.total_amount).toBe('number');
    expect(firstOrder!.customer.first_name).toBe('John');
    expect(firstOrder!.customer.last_name).toBe('Doe');
    expect(firstOrder!.order_items).toHaveLength(1);
    expect(firstOrder!.order_items[0].quantity).toBe(2);
    expect(firstOrder!.order_items[0].price_per_item).toBe(299.99);
    expect(typeof firstOrder!.order_items[0].price_per_item).toBe('number');
    expect(firstOrder!.order_items[0].jewellery_item.name).toBe('Gold Ring');
    expect(firstOrder!.order_items[0].jewellery_item.price).toBe(299.99);
    expect(typeof firstOrder!.order_items[0].jewellery_item.price).toBe('number');

    // Verify second order
    const secondOrder = results.find(order => order.customer.email === 'test2@example.com');
    expect(secondOrder).toBeDefined();
    expect(secondOrder!.total_amount).toBe(149.99);
    expect(secondOrder!.customer.first_name).toBe('Jane');
    expect(secondOrder!.order_items).toHaveLength(1);
    expect(secondOrder!.order_items[0].jewellery_item.name).toBe('Silver Necklace');
  });

  it('should handle pagination correctly', async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer])
      .returning()
      .execute();

    // Create test jewellery item
    const [jewellery] = await db.insert(jewelleryItemsTable)
      .values([{ ...testJewellery, price: testJewellery.price.toString() }])
      .returning()
      .execute();

    // Create 3 orders
    const orders = await db.insert(ordersTable)
      .values([
        { customer_id: customer.id, total_amount: '100.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' },
        { customer_id: customer.id, total_amount: '200.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' },
        { customer_id: customer.id, total_amount: '300.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' }
      ])
      .returning()
      .execute();

    // Create order items for each order
    await db.insert(orderItemsTable)
      .values(orders.map(order => ({
        order_id: order.id,
        jewellery_item_id: jewellery.id,
        quantity: 1,
        price_per_item: '100.00'
      })))
      .execute();

    // Test pagination
    const paginationInput: PaginationInput = { page: 1, limit: 2 };
    const results = await getOrders(paginationInput);

    expect(results).toHaveLength(2);
  });

  it('should return empty array when no orders exist', async () => {
    const results = await getOrders();
    expect(results).toHaveLength(0);
  });

  it('should handle orders with multiple items correctly', async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer])
      .returning()
      .execute();

    // Create test jewellery items
    const [jewellery1, jewellery2] = await db.insert(jewelleryItemsTable)
      .values([
        { ...testJewellery, price: testJewellery.price.toString() },
        { ...testJewellery2, price: testJewellery2.price.toString() }
      ])
      .returning()
      .execute();

    // Create order
    const [order] = await db.insert(ordersTable)
      .values([{
        customer_id: customer.id,
        total_amount: '449.98',
        shipping_address: '123 Main St',
        billing_address: '123 Main St',
        payment_status: 'pending'
      }])
      .returning()
      .execute();

    // Create multiple order items for the same order
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewellery_item_id: jewellery1.id,
          quantity: 1,
          price_per_item: testJewellery.price.toString()
        },
        {
          order_id: order.id,
          jewellery_item_id: jewellery2.id,
          quantity: 2,
          price_per_item: testJewellery2.price.toString()
        }
      ])
      .execute();

    const results = await getOrders();

    expect(results).toHaveLength(1);
    expect(results[0].order_items).toHaveLength(2);
    
    // Verify items are grouped correctly
    const goldRingItem = results[0].order_items.find(item => item.jewellery_item.name === 'Gold Ring');
    const necklaceItem = results[0].order_items.find(item => item.jewellery_item.name === 'Silver Necklace');
    
    expect(goldRingItem).toBeDefined();
    expect(goldRingItem!.quantity).toBe(1);
    expect(necklaceItem).toBeDefined();
    expect(necklaceItem!.quantity).toBe(2);
  });
});

describe('getCustomerOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  const testCustomer: CreateCustomerInput = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  };

  const testCustomer2: CreateCustomerInput = {
    email: 'test2@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+0987654321'
  };

  const testJewellery: CreateJewelleryItemInput = {
    name: 'Gold Ring',
    materials: 'Gold, Diamond',
    description: 'Beautiful gold ring with diamond',
    price: 299.99,
    image_url: 'https://example.com/ring.jpg',
    stock_quantity: 10
  };

  it('should fetch orders for specific customer only', async () => {
    // Create test customers
    const [customer1, customer2] = await db.insert(customersTable)
      .values([testCustomer, testCustomer2])
      .returning()
      .execute();

    // Create test jewellery item
    const [jewellery] = await db.insert(jewelleryItemsTable)
      .values([{ ...testJewellery, price: testJewellery.price.toString() }])
      .returning()
      .execute();

    // Create orders for both customers
    const [order1, order2] = await db.insert(ordersTable)
      .values([
        { customer_id: customer1.id, total_amount: '299.99', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' },
        { customer_id: customer2.id, total_amount: '299.99', shipping_address: '456 Oak Ave', billing_address: '456 Oak Ave', payment_status: 'pending' }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        { order_id: order1.id, jewellery_item_id: jewellery.id, quantity: 1, price_per_item: testJewellery.price.toString() },
        { order_id: order2.id, jewellery_item_id: jewellery.id, quantity: 1, price_per_item: testJewellery.price.toString() }
      ])
      .execute();

    // Test getting orders for customer1 only
    const results = await getCustomerOrders(customer1.id);

    expect(results).toHaveLength(1);
    expect(results[0].customer.email).toBe('test@example.com');
    expect(results[0].customer.first_name).toBe('John');
    expect(results[0].shipping_address).toBe('123 Main St');
  });

  it('should handle pagination for customer orders', async () => {
    // Create test customer
    const [customer] = await db.insert(customersTable)
      .values([testCustomer])
      .returning()
      .execute();

    // Create test jewellery item
    const [jewellery] = await db.insert(jewelleryItemsTable)
      .values([{ ...testJewellery, price: testJewellery.price.toString() }])
      .returning()
      .execute();

    // Create 3 orders for the customer
    const orders = await db.insert(ordersTable)
      .values([
        { customer_id: customer.id, total_amount: '100.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' },
        { customer_id: customer.id, total_amount: '200.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' },
        { customer_id: customer.id, total_amount: '300.00', shipping_address: '123 Main St', billing_address: '123 Main St', payment_status: 'pending' }
      ])
      .returning()
      .execute();

    // Create order items
    await db.insert(orderItemsTable)
      .values(orders.map(order => ({
        order_id: order.id,
        jewellery_item_id: jewellery.id,
        quantity: 1,
        price_per_item: '100.00'
      })))
      .execute();

    // Test pagination
    const paginationInput: PaginationInput = { page: 1, limit: 2 };
    const results = await getCustomerOrders(customer.id, paginationInput);

    expect(results).toHaveLength(2);
  });

  it('should return empty array when customer has no orders', async () => {
    // Create test customer but no orders
    const [customer] = await db.insert(customersTable)
      .values([testCustomer])
      .returning()
      .execute();

    const results = await getCustomerOrders(customer.id);
    expect(results).toHaveLength(0);
  });

  it('should return empty array when customer does not exist', async () => {
    const results = await getCustomerOrders(999); // Non-existent customer ID
    expect(results).toHaveLength(0);
  });
});