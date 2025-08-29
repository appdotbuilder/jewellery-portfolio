import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelleryItemsTable } from '../db/schema';
import { type UpdateCartItemInput } from '../schema';
import { updateCartItem } from '../handlers/update_cart_item';
import { eq } from 'drizzle-orm';

describe('updateCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testJewelleryItemId: number;
  let testCartItemId: number;

  beforeEach(async () => {
    // Create a test jewellery item first
    const jewelleryResult = await db.insert(jewelleryItemsTable)
      .values({
        name: 'Test Ring',
        materials: 'Gold, Diamond',
        description: 'A beautiful test ring',
        price: '299.99',
        stock_quantity: 10,
        is_active: true
      })
      .returning()
      .execute();

    testJewelleryItemId = jewelleryResult[0].id;

    // Create a test cart item
    const cartResult = await db.insert(cartItemsTable)
      .values({
        session_id: 'test-session-123',
        jewellery_item_id: testJewelleryItemId,
        quantity: 2
      })
      .returning()
      .execute();

    testCartItemId = cartResult[0].id;
  });

  it('should update cart item quantity successfully', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 5
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testCartItemId);
    expect(result!.quantity).toEqual(5);
    expect(result!.session_id).toEqual('test-session-123');
    expect(result!.jewellery_item_id).toEqual(testJewelleryItemId);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should save updated quantity to database', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 3
    };

    await updateCartItem(input);

    // Verify the update in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(3);
  });

  it('should return null for non-existent cart item', async () => {
    const input: UpdateCartItemInput = {
      id: 99999, // Non-existent ID
      quantity: 1
    };

    const result = await updateCartItem(input);

    expect(result).toBeNull();
  });

  it('should throw error when requested quantity exceeds stock', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 15 // Exceeds stock of 10
    };

    await expect(updateCartItem(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error when jewellery item is inactive', async () => {
    // Make the jewellery item inactive
    await db.update(jewelleryItemsTable)
      .set({ is_active: false })
      .where(eq(jewelleryItemsTable.id, testJewelleryItemId))
      .execute();

    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 1
    };

    await expect(updateCartItem(input)).rejects.toThrow(/no longer available/i);
  });

  it('should allow quantity update equal to available stock', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 10 // Exactly the stock quantity
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.quantity).toEqual(10);
  });

  it('should allow updating to minimum quantity of 1', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 1
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.quantity).toEqual(1);
  });

  it('should handle cart item with different session', async () => {
    // Create another cart item with different session
    const anotherCartResult = await db.insert(cartItemsTable)
      .values({
        session_id: 'different-session',
        jewellery_item_id: testJewelleryItemId,
        quantity: 1
      })
      .returning()
      .execute();

    const input: UpdateCartItemInput = {
      id: anotherCartResult[0].id,
      quantity: 3
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.session_id).toEqual('different-session');
    expect(result!.quantity).toEqual(3);
  });
});