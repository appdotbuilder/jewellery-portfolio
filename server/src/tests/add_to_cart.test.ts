import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelleryItemsTable, cartItemsTable } from '../db/schema';
import { type AddToCartInput } from '../schema';
import { addToCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

describe('addToCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test jewellery item
  const createTestJewelleryItem = async (stockQuantity = 10, isActive = true) => {
    const result = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Ring',
        materials: 'Gold, Diamond',
        description: 'A beautiful test ring',
        price: '299.99',
        stock_quantity: stockQuantity,
        is_active: isActive
      })
      .returning()
      .execute();
    return result[0];
  };

  const testInput: AddToCartInput = {
    session_id: 'test-session-123',
    jewellery_item_id: 1,
    quantity: 2
  };

  it('should add new item to cart', async () => {
    // Create test jewellery item
    const jewelleryItem = await createTestJewelleryItem();
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id
    };

    const result = await addToCart(input);

    expect(result.session_id).toEqual('test-session-123');
    expect(result.jewellery_item_id).toEqual(jewelleryItem.id);
    expect(result.quantity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    const jewelleryItem = await createTestJewelleryItem();
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id
    };

    const result = await addToCart(input);

    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].session_id).toEqual('test-session-123');
    expect(cartItems[0].jewellery_item_id).toEqual(jewelleryItem.id);
    expect(cartItems[0].quantity).toEqual(2);
  });

  it('should update existing cart item quantity', async () => {
    const jewelleryItem = await createTestJewelleryItem(15); // Higher stock for this test
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      quantity: 3
    };

    // Add item first time
    const firstResult = await addToCart(input);
    expect(firstResult.quantity).toEqual(3);

    // Add same item again
    const secondInput = {
      ...input,
      quantity: 2 // Adding 2 more
    };
    
    const secondResult = await addToCart(secondInput);
    expect(secondResult.id).toEqual(firstResult.id); // Same cart item
    expect(secondResult.quantity).toEqual(5); // 3 + 2 = 5

    // Verify in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.session_id, input.session_id),
        eq(cartItemsTable.jewellery_item_id, jewelleryItem.id)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(5);
  });

  it('should reject when jewellery item does not exist', async () => {
    const input = {
      ...testInput,
      jewellery_item_id: 999 // Non-existent ID
    };

    await expect(addToCart(input)).rejects.toThrow(/not found/i);
  });

  it('should reject when jewellery item is not active', async () => {
    const jewelleryItem = await createTestJewelleryItem(10, false); // Not active
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id
    };

    await expect(addToCart(input)).rejects.toThrow(/not available/i);
  });

  it('should reject when requested quantity exceeds stock', async () => {
    const jewelleryItem = await createTestJewelleryItem(5); // Limited stock
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      quantity: 10 // More than available
    };

    await expect(addToCart(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should reject when total quantity would exceed stock', async () => {
    const jewelleryItem = await createTestJewelleryItem(5); // Limited stock
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      quantity: 3
    };

    // Add item first time
    await addToCart(input);

    // Try to add more, which would exceed total stock
    const secondInput = {
      ...input,
      quantity: 3 // 3 + 3 = 6, but only 5 available
    };

    await expect(addToCart(secondInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle different sessions separately', async () => {
    const jewelleryItem = await createTestJewelleryItem();
    
    const input1 = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      session_id: 'session-1',
      quantity: 2
    };

    const input2 = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      session_id: 'session-2',
      quantity: 3
    };

    const result1 = await addToCart(input1);
    const result2 = await addToCart(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.quantity).toEqual(2);
    expect(result2.quantity).toEqual(3);
    expect(result1.session_id).toEqual('session-1');
    expect(result2.session_id).toEqual('session-2');

    // Verify both items exist in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.jewellery_item_id, jewelleryItem.id))
      .execute();

    expect(cartItems).toHaveLength(2);
  });

  it('should allow adding up to exact stock quantity', async () => {
    const jewelleryItem = await createTestJewelleryItem(5); // Exact stock
    
    const input = {
      ...testInput,
      jewellery_item_id: jewelleryItem.id,
      quantity: 5 // Exactly the available stock
    };

    const result = await addToCart(input);
    expect(result.quantity).toEqual(5);

    // Verify in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems[0].quantity).toEqual(5);
  });
});