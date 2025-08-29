import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type CreateJewelleryItemInput } from '../schema';
import { deleteJewelleryItem } from '../handlers/delete_jewellery_item';
import { eq } from 'drizzle-orm';

// Test jewellery item data
const testJewelleryItem: CreateJewelleryItemInput = {
  name: 'Test Ring',
  materials: 'Gold, Diamond',
  description: 'Beautiful gold ring with diamond',
  price: 299.99,
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5
};

describe('deleteJewelleryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete an existing jewellery item', async () => {
    // Create a test jewellery item first
    const insertResult = await db.insert(jewelleryItemsTable)
      .values({
        name: testJewelleryItem.name,
        materials: testJewelleryItem.materials,
        description: testJewelleryItem.description,
        price: testJewelleryItem.price.toString(),
        image_url: testJewelleryItem.image_url,
        stock_quantity: testJewelleryItem.stock_quantity
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];
    expect(createdItem.is_active).toBe(true);

    // Delete the item
    const result = await deleteJewelleryItem(createdItem.id);

    expect(result).toBe(true);

    // Verify the item is soft deleted (is_active = false)
    const deletedItem = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, createdItem.id))
      .execute();

    expect(deletedItem).toHaveLength(1);
    expect(deletedItem[0].is_active).toBe(false);
    expect(deletedItem[0].updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at was changed (should be more recent)
    expect(deletedItem[0].updated_at.getTime()).toBeGreaterThan(createdItem.updated_at.getTime());
  });

  it('should return false when trying to delete non-existent jewellery item', async () => {
    const nonExistentId = 99999;
    
    const result = await deleteJewelleryItem(nonExistentId);

    expect(result).toBe(false);
  });

  it('should return true when deleting already inactive item', async () => {
    // Create an inactive jewellery item
    const insertResult = await db.insert(jewelleryItemsTable)
      .values({
        name: testJewelleryItem.name,
        materials: testJewelleryItem.materials,
        description: testJewelleryItem.description,
        price: testJewelleryItem.price.toString(),
        image_url: testJewelleryItem.image_url,
        stock_quantity: testJewelleryItem.stock_quantity,
        is_active: false
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];
    expect(createdItem.is_active).toBe(false);

    // Try to delete the already inactive item
    const result = await deleteJewelleryItem(createdItem.id);

    expect(result).toBe(true);

    // Verify it's still inactive
    const item = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, createdItem.id))
      .execute();

    expect(item).toHaveLength(1);
    expect(item[0].is_active).toBe(false);
  });

  it('should preserve all other item data when soft deleting', async () => {
    // Create a test jewellery item
    const insertResult = await db.insert(jewelleryItemsTable)
      .values({
        name: testJewelleryItem.name,
        materials: testJewelleryItem.materials,
        description: testJewelleryItem.description,
        price: testJewelleryItem.price.toString(),
        image_url: testJewelleryItem.image_url,
        stock_quantity: testJewelleryItem.stock_quantity
      })
      .returning()
      .execute();

    const originalItem = insertResult[0];

    // Delete the item
    await deleteJewelleryItem(originalItem.id);

    // Verify all other data is preserved
    const deletedItem = await db.select()
      .from(jewelleryItemsTable)
      .where(eq(jewelleryItemsTable.id, originalItem.id))
      .execute();

    expect(deletedItem).toHaveLength(1);
    const item = deletedItem[0];
    
    expect(item.name).toBe(originalItem.name);
    expect(item.materials).toBe(originalItem.materials);
    expect(item.description).toBe(originalItem.description);
    expect(item.price).toBe(originalItem.price);
    expect(item.image_url).toBe(originalItem.image_url);
    expect(item.stock_quantity).toBe(originalItem.stock_quantity);
    expect(item.created_at).toEqual(originalItem.created_at);
    expect(item.is_active).toBe(false); // Only this should change
  });
});