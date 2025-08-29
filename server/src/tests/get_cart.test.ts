import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { getCart } from '../handlers/get_cart';

describe('getCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty cart for non-existent session', async () => {
    const result = await getCart('non-existent-session');

    expect(result.items).toHaveLength(0);
    expect(result.total_amount).toEqual(0);
  });

  it('should return cart with single item', async () => {
    // Create test jewellery item
    const [jewelryItem] = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Silver Ring',
        materials: 'Sterling Silver',
        description: 'Beautiful silver ring',
        price: '99.99',
        stock_quantity: 10,
        is_active: true
      })
      .returning()
      .execute();

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: 'test-session',
        jewellery_item_id: jewelryItem.id,
        quantity: 2
      })
      .execute();

    const result = await getCart('test-session');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toEqual(2);
    expect(result.items[0].jewellery_item.name).toEqual('Silver Ring');
    expect(result.items[0].jewellery_item.price).toEqual(99.99);
    expect(typeof result.items[0].jewellery_item.price).toEqual('number');
    expect(result.total_amount).toEqual(199.98);
  });

  it('should return cart with multiple items and calculate total correctly', async () => {
    // Create test jewellery items
    const [item1] = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Gold Necklace',
        materials: '14K Gold',
        description: 'Elegant gold necklace',
        price: '299.99',
        stock_quantity: 5,
        is_active: true
      })
      .returning()
      .execute();

    const [item2] = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Diamond Earrings',
        materials: 'Diamond, 18K Gold',
        description: 'Sparkling diamond earrings',
        price: '599.99',
        stock_quantity: 3,
        is_active: true
      })
      .returning()
      .execute();

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'test-session-multi',
          jewellery_item_id: item1.id,
          quantity: 1
        },
        {
          session_id: 'test-session-multi',
          jewellery_item_id: item2.id,
          quantity: 2
        }
      ])
      .execute();

    const result = await getCart('test-session-multi');

    expect(result.items).toHaveLength(2);
    
    // Check first item
    const necklaceItem = result.items.find(item => item.jewellery_item.name === 'Gold Necklace');
    expect(necklaceItem).toBeDefined();
    expect(necklaceItem!.quantity).toEqual(1);
    expect(necklaceItem!.jewellery_item.price).toEqual(299.99);

    // Check second item
    const earringsItem = result.items.find(item => item.jewellery_item.name === 'Diamond Earrings');
    expect(earringsItem).toBeDefined();
    expect(earringsItem!.quantity).toEqual(2);
    expect(earringsItem!.jewellery_item.price).toEqual(599.99);

    // Check total calculation: 299.99 * 1 + 599.99 * 2 = 1499.97
    expect(result.total_amount).toEqual(1499.97);
  });

  it('should only return items for specified session', async () => {
    // Create test jewellery item
    const [jewelryItem] = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Ruby Ring',
        materials: 'Ruby, Gold',
        description: 'Beautiful ruby ring',
        price: '199.99',
        stock_quantity: 5,
        is_active: true
      })
      .returning()
      .execute();

    // Add items to different sessions
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'session-1',
          jewellery_item_id: jewelryItem.id,
          quantity: 1
        },
        {
          session_id: 'session-2',
          jewellery_item_id: jewelryItem.id,
          quantity: 3
        }
      ])
      .execute();

    // Get cart for session-1
    const result1 = await getCart('session-1');
    expect(result1.items).toHaveLength(1);
    expect(result1.items[0].quantity).toEqual(1);
    expect(result1.total_amount).toEqual(199.99);

    // Get cart for session-2
    const result2 = await getCart('session-2');
    expect(result2.items).toHaveLength(1);
    expect(result2.items[0].quantity).toEqual(3);
    expect(result2.total_amount).toEqual(599.97);
  });

  it('should handle decimal prices correctly', async () => {
    // Create jewellery item with decimal price
    const [jewelryItem] = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Silver Bracelet',
        materials: 'Sterling Silver',
        description: 'Delicate silver bracelet',
        price: '49.95', // Price with decimal
        stock_quantity: 15,
        is_active: true
      })
      .returning()
      .execute();

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: 'decimal-test',
        jewellery_item_id: jewelryItem.id,
        quantity: 3
      })
      .execute();

    const result = await getCart('decimal-test');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].jewellery_item.price).toEqual(49.95);
    expect(typeof result.items[0].jewellery_item.price).toEqual('number');
    expect(result.total_amount).toBeCloseTo(149.85, 2); // 49.95 * 3
  });
});