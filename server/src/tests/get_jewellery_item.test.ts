import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { getJewelleryItem } from '../handlers/get_jewellery_item';

describe('getJewelleryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a jewellery item by ID', async () => {
    // Create test jewellery item
    const testItem = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Ring',
        materials: 'Gold, Diamond',
        description: 'A beautiful test ring',
        price: '299.99', // Store as string (numeric column)
        image_url: 'https://example.com/ring.jpg',
        stock_quantity: 5,
        is_active: true
      })
      .returning()
      .execute();

    const createdItem = testItem[0];
    const result = await getJewelleryItem(createdItem.id);

    // Verify all fields are correctly returned
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.name).toEqual('Test Ring');
    expect(result!.materials).toEqual('Gold, Diamond');
    expect(result!.description).toEqual('A beautiful test ring');
    expect(result!.price).toEqual(299.99); // Should be converted to number
    expect(typeof result!.price).toBe('number'); // Verify numeric conversion
    expect(result!.image_url).toEqual('https://example.com/ring.jpg');
    expect(result!.stock_quantity).toEqual(5);
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when item does not exist', async () => {
    const result = await getJewelleryItem(99999); // Non-existent ID
    expect(result).toBeNull();
  });

  it('should handle item with null image_url', async () => {
    // Create test item with null image_url
    const testItem = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Necklace',
        materials: 'Silver',
        description: 'A test necklace without image',
        price: '150.00',
        image_url: null, // Null image URL
        stock_quantity: 3,
        is_active: false
      })
      .returning()
      .execute();

    const createdItem = testItem[0];
    const result = await getJewelleryItem(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Test Necklace');
    expect(result!.image_url).toBeNull();
    expect(result!.is_active).toEqual(false);
    expect(result!.price).toEqual(150.00);
    expect(typeof result!.price).toBe('number');
  });

  it('should handle various price formats correctly', async () => {
    // Test with different price formats
    const testCases = [
      { price: '0.99', expected: 0.99 },
      { price: '1000.00', expected: 1000.00 },
      { price: '25.5', expected: 25.5 },
      { price: '999.95', expected: 999.95 }
    ];

    for (const testCase of testCases) {
      const testItem = await db.insert(jewelleryItemsTable)
        .values({
          name: `Test Item ${testCase.price}`,
          materials: 'Test Material',
          description: 'Price test item',
          price: testCase.price,
          stock_quantity: 1
        })
        .returning()
        .execute();

      const result = await getJewelleryItem(testItem[0].id);
      
      expect(result).not.toBeNull();
      expect(result!.price).toEqual(testCase.expected);
      expect(typeof result!.price).toBe('number');
    }
  });

  it('should return inactive items as well', async () => {
    // Create inactive item
    const testItem = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Inactive Item',
        materials: 'Gold',
        description: 'This item is inactive',
        price: '100.00',
        stock_quantity: 0,
        is_active: false // Inactive item
      })
      .returning()
      .execute();

    const result = await getJewelleryItem(testItem[0].id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Inactive Item');
    expect(result!.is_active).toEqual(false);
    expect(result!.stock_quantity).toEqual(0);
  });
});