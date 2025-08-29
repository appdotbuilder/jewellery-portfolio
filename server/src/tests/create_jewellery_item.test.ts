import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type CreateJewelleryItemInput } from '../schema';
import { createJewelleryItem } from '../handlers/create_jewellery_item';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateJewelleryItemInput = {
  name: 'Gold Ring',
  materials: '14k Gold, Diamond',
  description: 'A beautiful gold ring with diamond accent',
  price: 299.99,
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 10
};

describe('createJewelleryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a jewellery item', async () => {
    const result = await createJewelleryItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Gold Ring');
    expect(result.materials).toEqual('14k Gold, Diamond');
    expect(result.description).toEqual(testInput.description);
    expect(result.price).toEqual(299.99);
    expect(typeof result.price).toBe('number'); // Verify numeric conversion
    expect(result.image_url).toEqual('https://example.com/ring.jpg');
    expect(result.stock_quantity).toEqual(10);
    expect(result.is_active).toBe(true); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save jewellery item to database', async () => {
    const result = await createJewelleryItem(testInput);

    // Query using proper drizzle syntax
    const items = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Gold Ring');
    expect(items[0].materials).toEqual('14k Gold, Diamond');
    expect(items[0].description).toEqual(testInput.description);
    expect(parseFloat(items[0].price)).toEqual(299.99); // Verify stored as string
    expect(items[0].image_url).toEqual('https://example.com/ring.jpg');
    expect(items[0].stock_quantity).toEqual(10);
    expect(items[0].is_active).toBe(true);
    expect(items[0].created_at).toBeInstanceOf(Date);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null image_url', async () => {
    const inputWithNullImage: CreateJewelleryItemInput = {
      ...testInput,
      image_url: null
    };

    const result = await createJewelleryItem(inputWithNullImage);

    expect(result.image_url).toBeNull();
    expect(result.name).toEqual('Gold Ring');
    expect(result.price).toEqual(299.99);
    expect(typeof result.price).toBe('number');
  });

  it('should handle decimal prices correctly', async () => {
    const inputWithDecimalPrice: CreateJewelleryItemInput = {
      ...testInput,
      price: 1234.56
    };

    const result = await createJewelleryItem(inputWithDecimalPrice);

    expect(result.price).toEqual(1234.56);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const items = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, result.id))
      .execute();

    expect(parseFloat(items[0].price)).toEqual(1234.56);
  });

  it('should create multiple items with different data', async () => {
    const silverBraceletInput: CreateJewelleryItemInput = {
      name: 'Silver Bracelet',
      materials: 'Sterling Silver',
      description: 'Elegant silver bracelet',
      price: 89.99,
      image_url: 'https://example.com/bracelet.jpg',
      stock_quantity: 5
    };

    const pearlNecklaceInput: CreateJewelleryItemInput = {
      name: 'Pearl Necklace',
      materials: 'Freshwater Pearls, Gold Clasp',
      description: 'Classic pearl necklace',
      price: 159.50,
      image_url: null,
      stock_quantity: 3
    };

    const result1 = await createJewelleryItem(silverBraceletInput);
    const result2 = await createJewelleryItem(pearlNecklaceInput);

    // Verify both items are created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Silver Bracelet');
    expect(result2.name).toEqual('Pearl Necklace');
    expect(result1.price).toEqual(89.99);
    expect(result2.price).toEqual(159.50);
    expect(result1.image_url).toEqual('https://example.com/bracelet.jpg');
    expect(result2.image_url).toBeNull();
  });

  it('should handle zero stock quantity', async () => {
    const inputWithZeroStock: CreateJewelleryItemInput = {
      ...testInput,
      stock_quantity: 0
    };

    const result = await createJewelleryItem(inputWithZeroStock);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual('Gold Ring');
  });
});