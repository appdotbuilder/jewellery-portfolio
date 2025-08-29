import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type UpdateJewelleryItemInput, type CreateJewelleryItemInput } from '../schema';
import { updateJewelleryItem } from '../handlers/update_jewellery_item';
import { eq } from 'drizzle-orm';

// Helper function to create a test jewellery item
const createTestItem = async (): Promise<number> => {
  const testItem: CreateJewelleryItemInput = {
    name: 'Original Ring',
    materials: 'Gold, Diamond',
    description: 'Original description',
    price: 999.99,
    image_url: 'https://example.com/ring.jpg',
    stock_quantity: 10
  };

  const result = await db.insert(jewelleryItemsTable)
    .values({
      name: testItem.name,
      materials: testItem.materials,
      description: testItem.description,
      price: testItem.price.toString(),
      image_url: testItem.image_url,
      stock_quantity: testItem.stock_quantity
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateJewelleryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a jewellery item with all fields', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      name: 'Updated Ring',
      materials: 'Platinum, Emerald',
      description: 'Updated description',
      price: 1299.99,
      image_url: 'https://example.com/updated-ring.jpg',
      stock_quantity: 5,
      is_active: false
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(itemId);
    expect(result!.name).toBe('Updated Ring');
    expect(result!.materials).toBe('Platinum, Emerald');
    expect(result!.description).toBe('Updated description');
    expect(result!.price).toBe(1299.99);
    expect(typeof result!.price).toBe('number');
    expect(result!.image_url).toBe('https://example.com/updated-ring.jpg');
    expect(result!.stock_quantity).toBe(5);
    expect(result!.is_active).toBe(false);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      name: 'Partially Updated Ring',
      price: 1599.99
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(itemId);
    expect(result!.name).toBe('Partially Updated Ring');
    expect(result!.price).toBe(1599.99);
    expect(typeof result!.price).toBe('number');
    // Other fields should remain unchanged
    expect(result!.materials).toBe('Gold, Diamond');
    expect(result!.description).toBe('Original description');
    expect(result!.stock_quantity).toBe(10);
    expect(result!.is_active).toBe(true); // Default value
  });

  it('should save updated item to database', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      name: 'Database Updated Ring',
      price: 2000.00,
      stock_quantity: 15
    };

    await updateJewelleryItem(updateInput);

    // Query database directly to verify changes
    const items = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Database Updated Ring');
    expect(parseFloat(items[0].price)).toBe(2000.00);
    expect(items[0].stock_quantity).toBe(15);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent item', async () => {
    const updateInput: UpdateJewelleryItemInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Item'
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).toBeNull();
  });

  it('should update with null image_url', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      image_url: null
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.image_url).toBeNull();
  });

  it('should handle numeric price conversion correctly', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      price: 123.45
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.price).toBe(123.45);
    expect(typeof result!.price).toBe('number');

    // Verify in database that it's stored correctly
    const items = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, itemId))
      .execute();

    expect(parseFloat(items[0].price)).toBe(123.45);
  });

  it('should update stock_quantity to zero', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      stock_quantity: 0
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.stock_quantity).toBe(0);
  });

  it('should update updated_at timestamp', async () => {
    const itemId = await createTestItem();

    // Get original timestamp
    const originalItems = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, itemId))
      .execute();
    
    const originalUpdatedAt = originalItems[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateJewelleryItemInput = {
      id: itemId,
      name: 'Timestamp Test Ring'
    };

    const result = await updateJewelleryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});