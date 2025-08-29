import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { clearCart } from '../handlers/clear_cart';
import { eq } from 'drizzle-orm';

describe('clearCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should clear all items from a specific session cart', async () => {
    // Create a jewellery item first (required for foreign key)
    const jewelItem = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Ring',
        materials: 'Gold',
        description: 'A beautiful ring',
        price: '99.99',
        stock_quantity: 10
      })
      .returning()
      .execute();

    const sessionId = 'test-session-123';
    
    // Add multiple items to the cart
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: sessionId,
          jewellery_item_id: jewelItem[0].id,
          quantity: 2
        },
        {
          session_id: sessionId,
          jewellery_item_id: jewelItem[0].id,
          quantity: 1
        }
      ])
      .execute();

    // Verify items exist before clearing
    const itemsBeforeClear = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    expect(itemsBeforeClear).toHaveLength(2);

    // Clear the cart
    const result = await clearCart(sessionId);

    // Should return true
    expect(result).toBe(true);

    // Verify all items are deleted
    const itemsAfterClear = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    expect(itemsAfterClear).toHaveLength(0);
  });

  it('should only clear items from the specified session', async () => {
    // Create a jewellery item first
    const jewelItem = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Necklace',
        materials: 'Silver',
        description: 'A beautiful necklace',
        price: '149.99',
        stock_quantity: 5
      })
      .returning()
      .execute();

    const sessionId1 = 'session-1';
    const sessionId2 = 'session-2';

    // Add items to both sessions
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: sessionId1,
          jewellery_item_id: jewelItem[0].id,
          quantity: 1
        },
        {
          session_id: sessionId2,
          jewellery_item_id: jewelItem[0].id,
          quantity: 2
        }
      ])
      .execute();

    // Clear only session1
    const result = await clearCart(sessionId1);

    expect(result).toBe(true);

    // Session1 should be empty
    const session1Items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId1))
      .execute();

    expect(session1Items).toHaveLength(0);

    // Session2 should still have items
    const session2Items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId2))
      .execute();

    expect(session2Items).toHaveLength(1);
    expect(session2Items[0].quantity).toBe(2);
  });

  it('should handle clearing an empty cart gracefully', async () => {
    const sessionId = 'empty-session';

    // Attempt to clear a cart that has no items
    const result = await clearCart(sessionId);

    // Should still return true even if no items were deleted
    expect(result).toBe(true);

    // Verify no items exist for this session
    const items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    expect(items).toHaveLength(0);
  });

  it('should handle clearing a cart with non-existent session id', async () => {
    const nonExistentSessionId = 'non-existent-session-999';

    // Should not throw an error
    const result = await clearCart(nonExistentSessionId);

    expect(result).toBe(true);

    // Verify no items exist
    const items = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, nonExistentSessionId))
      .execute();

    expect(items).toHaveLength(0);
  });
});