import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import { InsertShippingAddress, InsertUser, orderItems, orders, savedBooks, shippingAddresses, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function setUserStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function listShippingAddresses(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt));
}

type AddressValues = Omit<InsertShippingAddress, "id" | "userId" | "createdAt" | "updatedAt">;

async function assertOwnedShippingAddress(userId: number, addressId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const address = await db.select({ id: shippingAddresses.id }).from(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId))).limit(1);
  if (!address.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That saved address is unavailable on this profile." });
  }
  return db;
}

export async function createShippingAddress(userId: number, values: AddressValues) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.transaction(async tx => {
    const existing = await tx.select({ id: shippingAddresses.id }).from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).limit(1);
    const shouldBeDefault = values.isDefault || existing.length === 0;
    if (shouldBeDefault) await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.insert(shippingAddresses).values({ ...values, userId, isDefault: shouldBeDefault });
  });
}

export async function updateShippingAddress(userId: number, addressId: number, values: AddressValues) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.transaction(async tx => {
    if (values.isDefault) await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.update(shippingAddresses).set(values).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
  });
}

export async function deleteShippingAddress(userId: number, addressId: number) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.delete(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
}

export async function setDefaultShippingAddress(userId: number, addressId: number) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.transaction(async tx => {
    await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.update(shippingAddresses).set({ isDefault: true }).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
  });
}

export async function getDefaultShippingAddress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const [address] = await db.select().from(shippingAddresses).where(and(eq(shippingAddresses.userId, userId), eq(shippingAddresses.isDefault, true))).limit(1);
  return address;
}

export async function recordCompletedOrder(input: { userId: number; stripeCheckoutSessionId: string; stripePaymentIntentId?: string | null; shippingAddressId?: number | null; items: Array<{ bookId: string; quantity: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.transaction(async tx => {
    const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.stripeCheckoutSessionId, input.stripeCheckoutSessionId)).limit(1);
    if (existing) return;
    await tx.insert(orders).values({ userId: input.userId, stripeCheckoutSessionId: input.stripeCheckoutSessionId, stripePaymentIntentId: input.stripePaymentIntentId || null, shippingAddressId: input.shippingAddressId || null });
    const [created] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.stripeCheckoutSessionId, input.stripeCheckoutSessionId)).limit(1);
    if (created && input.items.length) await tx.insert(orderItems).values(input.items.map(item => ({ orderId: created.id, ...item })));
  });
}

export async function listOrdersForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select({ order: orders, item: orderItems }).from(orders).leftJoin(orderItems, eq(orderItems.orderId, orders.id)).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  const grouped = new Map<number, { id: number; fulfillmentStatus: "processing" | "packed" | "shipped" | "delivered" | "cancelled"; createdAt: Date; items: Array<{ bookId: string; quantity: number }> }>();
  rows.forEach(({ order, item }) => {
    if (!grouped.has(order.id)) grouped.set(order.id, { id: order.id, fulfillmentStatus: order.fulfillmentStatus, createdAt: order.createdAt, items: [] });
    if (item) grouped.get(order.id)?.items.push({ bookId: item.bookId, quantity: item.quantity });
  });
  return Array.from(grouped.values());
}

export async function listSavedBooks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(savedBooks).where(eq(savedBooks.userId, userId)).orderBy(desc(savedBooks.createdAt));
}

export async function saveBook(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(savedBooks).values({ userId, bookId }).onDuplicateKeyUpdate({ set: { bookId } });
}

export async function removeSavedBook(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.delete(savedBooks).where(and(eq(savedBooks.userId, userId), eq(savedBooks.bookId, bookId)));
}
