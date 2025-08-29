import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, jewelleryItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrder } from '../handlers/get_order';

describe('getOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return order with full details when order exists', async () => {
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
    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values([
        {
          name: 'Gold Ring',
          materials: 'Gold',
          description: 'Beautiful gold ring',
          price: '299.99',
          image_url: 'https://example.com/ring.jpg',
          stock_quantity: 10
        },
        {
          name: 'Silver Necklace',
          materials: 'Silver',
          description: 'Elegant silver necklace',
          price: '149.99',
          image_url: 'https://example.com/necklace.jpg',
          stock_quantity: 5
        }
      ])
      .returning()
      .execute();

    const jewelleryItems = jewelleryResult;

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customer.id,
        total_amount: '549.97',
        status: 'pending',
        shipping_address: '123 Main St, City, State 12345',
        billing_address: '123 Main St, City, State 12345',
        payment_status: 'pending',
        payment_method: 'credit_card'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewellery_item_id: jewelleryItems[0].id,
          quantity: 1,
          price_per_item: '299.99'
        },
        {
          order_id: order.id,
          jewellery_item_id: jewelleryItems[1].id,
          quantity: 2,
          price_per_item: '149.99'
        }
      ])
      .execute();

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(order.id);
    expect(result!.customer_id).toBe(customer.id);
    expect(result!.total_amount).toBe(549.97);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.status).toBe('pending');
    expect(result!.shipping_address).toBe('123 Main St, City, State 12345');
    expect(result!.billing_address).toBe('123 Main St, City, State 12345');
    expect(result!.payment_status).toBe('pending');
    expect(result!.payment_method).toBe('credit_card');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check customer details
    expect(result!.customer).toBeDefined();
    expect(result!.customer.id).toBe(customer.id);
    expect(result!.customer.email).toBe('test@example.com');
    expect(result!.customer.first_name).toBe('John');
    expect(result!.customer.last_name).toBe('Doe');
    expect(result!.customer.phone).toBe('+1234567890');
    expect(result!.customer.created_at).toBeInstanceOf(Date);

    // Check order items
    expect(result!.order_items).toHaveLength(2);
    
    const firstItem = result!.order_items[0];
    expect(firstItem.order_id).toBe(order.id);
    expect(firstItem.jewellery_item_id).toBe(jewelleryItems[0].id);
    expect(firstItem.quantity).toBe(1);
    expect(firstItem.price_per_item).toBe(299.99);
    expect(typeof firstItem.price_per_item).toBe('number');
    expect(firstItem.created_at).toBeInstanceOf(Date);

    // Check jewellery item details in first order item
    expect(firstItem.jewellery_item).toBeDefined();
    expect(firstItem.jewellery_item.id).toBe(jewelleryItems[0].id);
    expect(firstItem.jewellery_item.name).toBe('Gold Ring');
    expect(firstItem.jewellery_item.materials).toBe('Gold');
    expect(firstItem.jewellery_item.description).toBe('Beautiful gold ring');
    expect(firstItem.jewellery_item.price).toBe(299.99);
    expect(typeof firstItem.jewellery_item.price).toBe('number');
    expect(firstItem.jewellery_item.image_url).toBe('https://example.com/ring.jpg');
    expect(firstItem.jewellery_item.stock_quantity).toBe(10);
    expect(firstItem.jewellery_item.is_active).toBe(true);

    const secondItem = result!.order_items[1];
    expect(secondItem.order_id).toBe(order.id);
    expect(secondItem.jewellery_item_id).toBe(jewelleryItems[1].id);
    expect(secondItem.quantity).toBe(2);
    expect(secondItem.price_per_item).toBe(149.99);
    expect(typeof secondItem.price_per_item).toBe('number');

    // Check jewellery item details in second order item
    expect(secondItem.jewellery_item.name).toBe('Silver Necklace');
    expect(secondItem.jewellery_item.materials).toBe('Silver');
    expect(secondItem.jewellery_item.price).toBe(149.99);
    expect(typeof secondItem.jewellery_item.price).toBe('number');
  });

  it('should return null when order does not exist', async () => {
    const result = await getOrder(999);
    
    expect(result).toBeNull();
  });

  it('should handle order with no items', async () => {
    // Create a customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create an order without items
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customer.id,
        total_amount: '0.00',
        status: 'pending',
        shipping_address: '123 Main St, City, State 12345',
        billing_address: '456 Other St, City, State 12345',
        payment_status: 'pending',
        payment_method: null
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(order.id);
    expect(result!.total_amount).toBe(0);
    expect(result!.payment_method).toBeNull();
    expect(result!.customer.phone).toBeNull();
    expect(result!.order_items).toHaveLength(0);
  });

  it('should handle different order statuses correctly', async () => {
    // Create a customer
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'status@example.com',
        first_name: 'Status',
        last_name: 'Test'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create orders with different statuses
    const statusesTest = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
    
    for (const status of statusesTest) {
      const orderResult = await db.insert(ordersTable)
        .values({
          customer_id: customer.id,
          total_amount: '100.00',
          status: status,
          shipping_address: '123 Main St',
          billing_address: '123 Main St',
          payment_status: 'completed'
        })
        .returning()
        .execute();

      const result = await getOrder(orderResult[0].id);
      
      expect(result).toBeDefined();
      expect(result!.status).toBe(status);
    }
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create prerequisites
    const customerResult = await db.insert(customersTable)
      .values({
        email: 'numeric@example.com',
        first_name: 'Numeric',
        last_name: 'Test'
      })
      .returning()
      .execute();

    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Item',
        materials: 'Test Material',
        description: 'Test Description',
        price: '123.45',
        stock_quantity: 1
      })
      .returning()
      .execute();

    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerResult[0].id,
        total_amount: '987.65',
        shipping_address: 'Test Address',
        billing_address: 'Test Address',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    await db.insert(orderItemsTable)
      .values({
        order_id: orderResult[0].id,
        jewellery_item_id: jewelleryResult[0].id,
        quantity: 3,
        price_per_item: '123.45'
      })
      .execute();

    const result = await getOrder(orderResult[0].id);

    expect(result).toBeDefined();
    
    // Verify all numeric conversions
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.total_amount).toBe(987.65);
    
    expect(typeof result!.order_items[0].price_per_item).toBe('number');
    expect(result!.order_items[0].price_per_item).toBe(123.45);
    
    expect(typeof result!.order_items[0].jewellery_item.price).toBe('number');
    expect(result!.order_items[0].jewellery_item.price).toBe(123.45);
  });
});