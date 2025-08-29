import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { removeFromCart } from '../handlers/remove_from_cart';
import { eq } from 'drizzle-orm';

describe('removeFromCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove item from cart and return true', async () => {
    // Create a jewellery item first
    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Ring',
        materials: 'Gold',
        description: 'A test ring',
        price: '199.99',
        stock_quantity: 10
      })
      .returning()
      .execute();

    const jewelleryItemId = jewelleryResult[0].id;

    // Create a cart item
    const cartResult = await db.insert(cartItemsTable)
      .values({
        session_id: 'test-session-123',
        jewellery_item_id: jewelleryItemId,
        quantity: 2
      })
      .returning()
      .execute();

    const cartItemId = cartResult[0].id;

    // Remove the cart item
    const result = await removeFromCart(cartItemId);

    // Should return true indicating success
    expect(result).toBe(true);

    // Verify the item was actually deleted from the database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should return false when cart item does not exist', async () => {
    const nonExistentCartItemId = 99999;

    // Try to remove a non-existent cart item
    const result = await removeFromCart(nonExistentCartItemId);

    // Should return false indicating no item was found/deleted
    expect(result).toBe(false);
  });

  it('should not affect other cart items', async () => {
    // Create a jewellery item first
    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Necklace',
        materials: 'Silver',
        description: 'A test necklace',
        price: '149.99',
        stock_quantity: 5
      })
      .returning()
      .execute();

    const jewelleryItemId = jewelleryResult[0].id;

    // Create two cart items
    const cartResults = await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'test-session-456',
          jewellery_item_id: jewelleryItemId,
          quantity: 1
        },
        {
          session_id: 'test-session-789',
          jewellery_item_id: jewelleryItemId,
          quantity: 3
        }
      ])
      .returning()
      .execute();

    const firstCartItemId = cartResults[0].id;
    const secondCartItemId = cartResults[1].id;

    // Remove only the first cart item
    const result = await removeFromCart(firstCartItemId);

    expect(result).toBe(true);

    // Verify first item was deleted
    const deletedItem = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, firstCartItemId))
      .execute();

    expect(deletedItem).toHaveLength(0);

    // Verify second item still exists
    const remainingItem = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, secondCartItemId))
      .execute();

    expect(remainingItem).toHaveLength(1);
    expect(remainingItem[0].session_id).toBe('test-session-789');
    expect(remainingItem[0].quantity).toBe(3);
  });

  it('should handle deletion of cart item with different session IDs', async () => {
    // Create a jewellery item first
    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Bracelet',
        materials: 'Platinum',
        description: 'A test bracelet',
        price: '299.99',
        stock_quantity: 3
      })
      .returning()
      .execute();

    const jewelleryItemId = jewelleryResult[0].id;

    // Create cart item
    const cartResult = await db.insert(cartItemsTable)
      .values({
        session_id: 'unique-session-abc',
        jewellery_item_id: jewelleryItemId,
        quantity: 1
      })
      .returning()
      .execute();

    const cartItemId = cartResult[0].id;

    // Remove the cart item
    const result = await removeFromCart(cartItemId);

    expect(result).toBe(true);

    // Verify removal
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });
});