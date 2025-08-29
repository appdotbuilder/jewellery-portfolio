import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable } from '../db/schema';
import { type PaginationInput } from '../schema';
import { getJewelleryItems, getAllJewelleryItems } from '../handlers/get_jewellery_items';

// Test jewellery items data
const activeItem1 = {
  name: 'Gold Ring',
  materials: 'Gold, Diamond',
  description: 'Beautiful gold ring with diamond',
  price: '299.99',
  image_url: 'https://example.com/gold-ring.jpg',
  stock_quantity: 5,
  is_active: true
};

const activeItem2 = {
  name: 'Silver Necklace',
  materials: 'Silver, Pearl',
  description: 'Elegant silver necklace with pearls',
  price: '199.99',
  image_url: 'https://example.com/silver-necklace.jpg',
  stock_quantity: 10,
  is_active: true
};

const inactiveItem = {
  name: 'Old Bracelet',
  materials: 'Brass',
  description: 'Discontinued brass bracelet',
  price: '49.99',
  image_url: null,
  stock_quantity: 0,
  is_active: false
};

describe('getJewelleryItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active jewellery items only', async () => {
    // Create test data
    await db.insert(jewelleryItemsTable).values([
      activeItem1,
      activeItem2,
      inactiveItem
    ]).execute();

    const result = await getJewelleryItems();

    // Should return only active items
    expect(result).toHaveLength(2);
    
    // Verify all returned items are active
    result.forEach(item => {
      expect(item.is_active).toBe(true);
    });

    // Verify numeric conversion
    expect(typeof result[0].price).toBe('number');
    
    // Verify prices are converted correctly (order may vary due to timestamp precision)
    const prices = result.map(item => item.price).sort((a, b) => a - b);
    expect(prices).toEqual([199.99, 299.99]);
  });

  it('should return empty array when no active items exist', async () => {
    // Create only inactive item
    await db.insert(jewelleryItemsTable).values([inactiveItem]).execute();

    const result = await getJewelleryItems();
    expect(result).toHaveLength(0);
  });

  it('should apply pagination correctly', async () => {
    // Create multiple active items
    const items = [];
    for (let i = 1; i <= 15; i++) {
      items.push({
        name: `Item ${i}`,
        materials: 'Test Material',
        description: `Test item ${i}`,
        price: `${i}.99`,
        image_url: null,
        stock_quantity: i,
        is_active: true
      });
    }
    await db.insert(jewelleryItemsTable).values(items).execute();

    // Test first page with limit 5
    const paginationInput: PaginationInput = { page: 1, limit: 5 };
    const firstPage = await getJewelleryItems(paginationInput);

    expect(firstPage).toHaveLength(5);
    
    // Verify we get the correct number of items (order may vary due to timestamp precision)
    const firstPageNames = firstPage.map(item => item.name);
    expect(firstPageNames).toHaveLength(5);

    // Test second page
    const secondPageInput: PaginationInput = { page: 2, limit: 5 };
    const secondPage = await getJewelleryItems(secondPageInput);

    expect(secondPage).toHaveLength(5);
    
    // Verify pagination works - no overlap between pages
    const secondPageNames = secondPage.map(item => item.name);
    const overlap = firstPageNames.filter(name => secondPageNames.includes(name));
    expect(overlap).toHaveLength(0);
  });

  it('should use default pagination values when not provided', async () => {
    // Create 15 active items
    const items = [];
    for (let i = 1; i <= 15; i++) {
      items.push({
        name: `Item ${i}`,
        materials: 'Test Material',
        description: `Test item ${i}`,
        price: `${i}.99`,
        image_url: null,
        stock_quantity: i,
        is_active: true
      });
    }
    await db.insert(jewelleryItemsTable).values(items).execute();

    const result = await getJewelleryItems();

    // Should return default limit of 10
    expect(result).toHaveLength(10);
    
    // Verify all items are unique
    const names = result.map(item => item.name);
    const uniqueNames = [...new Set(names)];
    expect(uniqueNames).toHaveLength(10);
  });

  it('should order items by created_at descending', async () => {
    // Insert items with slight delay to ensure different timestamps
    await db.insert(jewelleryItemsTable).values([activeItem1]).execute();
    
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(jewelleryItemsTable).values([activeItem2]).execute();

    const result = await getJewelleryItems();

    expect(result).toHaveLength(2);
    // Most recently created should be first
    expect(result[0].name).toBe('Silver Necklace');
    expect(result[1].name).toBe('Gold Ring');
  });
});

describe('getAllJewelleryItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all jewellery items including inactive', async () => {
    // Create test data
    await db.insert(jewelleryItemsTable).values([
      activeItem1,
      activeItem2,
      inactiveItem
    ]).execute();

    const result = await getAllJewelleryItems();

    // Should return all items
    expect(result).toHaveLength(3);

    // Verify we get both active and inactive items
    const activeItems = result.filter(item => item.is_active);
    const inactiveItems = result.filter(item => !item.is_active);
    
    expect(activeItems).toHaveLength(2);
    expect(inactiveItems).toHaveLength(1);

    // Verify numeric conversion
    expect(typeof result[0].price).toBe('number');
  });

  it('should return empty array when no items exist', async () => {
    const result = await getAllJewelleryItems();
    expect(result).toHaveLength(0);
  });

  it('should apply pagination correctly for all items', async () => {
    // Create mix of active and inactive items
    const items = [];
    for (let i = 1; i <= 12; i++) {
      items.push({
        name: `Item ${i}`,
        materials: 'Test Material',
        description: `Test item ${i}`,
        price: `${i}.99`,
        image_url: null,
        stock_quantity: i,
        is_active: i % 3 !== 0 // Every 3rd item is inactive
      });
    }
    await db.insert(jewelleryItemsTable).values(items).execute();

    // Test first page with limit 5
    const paginationInput: PaginationInput = { page: 1, limit: 5 };
    const firstPage = await getAllJewelleryItems(paginationInput);

    expect(firstPage).toHaveLength(5);
    
    // Verify we get 5 unique items
    const firstPageNames = firstPage.map(item => item.name);
    const uniqueFirstPageNames = [...new Set(firstPageNames)];
    expect(uniqueFirstPageNames).toHaveLength(5);

    // Test second page
    const secondPageInput: PaginationInput = { page: 2, limit: 5 };
    const secondPage = await getAllJewelleryItems(secondPageInput);

    expect(secondPage).toHaveLength(5);
    
    // Verify pagination works - no overlap between pages
    const secondPageNames = secondPage.map(item => item.name);
    const overlap = firstPageNames.filter(name => secondPageNames.includes(name));
    expect(overlap).toHaveLength(0);
  });

  it('should order all items by created_at descending', async () => {
    // Insert items with different timestamps
    await db.insert(jewelleryItemsTable).values([activeItem1]).execute();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(jewelleryItemsTable).values([inactiveItem]).execute();

    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(jewelleryItemsTable).values([activeItem2]).execute();

    const result = await getAllJewelleryItems();

    expect(result).toHaveLength(3);
    // Most recently created should be first
    expect(result[0].name).toBe('Silver Necklace');
    expect(result[1].name).toBe('Old Bracelet');
    expect(result[2].name).toBe('Gold Ring');
  });

  it('should handle large pagination parameters', async () => {
    // Create 5 items
    const items = [];
    for (let i = 1; i <= 5; i++) {
      items.push({
        name: `Item ${i}`,
        materials: 'Test Material',
        description: `Test item ${i}`,
        price: `${i}.99`,
        image_url: null,
        stock_quantity: i,
        is_active: true
      });
    }
    await db.insert(jewelleryItemsTable).values(items).execute();

    // Request page beyond available data
    const paginationInput: PaginationInput = { page: 3, limit: 5 };
    const result = await getAllJewelleryItems(paginationInput);

    expect(result).toHaveLength(0);
  });
});