// server/app.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";

// drizzle/schema.ts
import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** Stripe Customer identifier only. Stripe stores the underlying payment instruments. */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var shippingAddresses = mysqlTable("shipping_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 64 }).notNull(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  postalCode: varchar("postalCode", { length: 24 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("IN"),
  phone: varchar("phone", { length: 32 }),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("shipping_addresses_user_idx").on(table.userId)]);
var orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  shippingAddressId: int("shippingAddressId"),
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["processing", "packed", "shipped", "delivered", "cancelled"]).notNull().default("processing"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("orders_user_idx").on(table.userId)]);
var orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  bookId: varchar("bookId", { length: 128 }).notNull(),
  quantity: int("quantity").notNull()
}, (table) => [index("order_items_order_idx").on(table.orderId)]);
var savedBooks = mysqlTable("saved_books", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: varchar("bookId", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [uniqueIndex("saved_books_user_book_idx").on(table.userId, table.bookId), index("saved_books_user_idx").on(table.userId)]);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function setUserStripeCustomerId(userId, stripeCustomerId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}
async function listShippingAddresses(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt));
}
async function assertOwnedShippingAddress(userId, addressId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const address = await db.select({ id: shippingAddresses.id }).from(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId))).limit(1);
  if (!address.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That saved address is unavailable on this profile." });
  }
  return db;
}
async function createShippingAddress(userId, values) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: shippingAddresses.id }).from(shippingAddresses).where(eq(shippingAddresses.userId, userId)).limit(1);
    const shouldBeDefault = values.isDefault || existing.length === 0;
    if (shouldBeDefault) await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.insert(shippingAddresses).values({ ...values, userId, isDefault: shouldBeDefault });
  });
}
async function updateShippingAddress(userId, addressId, values) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.transaction(async (tx) => {
    if (values.isDefault) await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.update(shippingAddresses).set(values).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
  });
}
async function deleteShippingAddress(userId, addressId) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.delete(shippingAddresses).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
}
async function setDefaultShippingAddress(userId, addressId) {
  const db = await assertOwnedShippingAddress(userId, addressId);
  await db.transaction(async (tx) => {
    await tx.update(shippingAddresses).set({ isDefault: false }).where(eq(shippingAddresses.userId, userId));
    await tx.update(shippingAddresses).set({ isDefault: true }).where(and(eq(shippingAddresses.id, addressId), eq(shippingAddresses.userId, userId)));
  });
}
async function getDefaultShippingAddress(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const [address] = await db.select().from(shippingAddresses).where(and(eq(shippingAddresses.userId, userId), eq(shippingAddresses.isDefault, true))).limit(1);
  return address;
}
async function recordCompletedOrder(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.stripeCheckoutSessionId, input.stripeCheckoutSessionId)).limit(1);
    if (existing) return;
    await tx.insert(orders).values({ userId: input.userId, stripeCheckoutSessionId: input.stripeCheckoutSessionId, stripePaymentIntentId: input.stripePaymentIntentId || null, shippingAddressId: input.shippingAddressId || null });
    const [created] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.stripeCheckoutSessionId, input.stripeCheckoutSessionId)).limit(1);
    if (created && input.items.length) await tx.insert(orderItems).values(input.items.map((item) => ({ orderId: created.id, ...item })));
  });
}
async function listOrdersForUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select({ order: orders, item: orderItems }).from(orders).leftJoin(orderItems, eq(orderItems.orderId, orders.id)).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  const grouped = /* @__PURE__ */ new Map();
  rows.forEach(({ order, item }) => {
    if (!grouped.has(order.id)) grouped.set(order.id, { id: order.id, fulfillmentStatus: order.fulfillmentStatus, createdAt: order.createdAt, items: [] });
    if (item) grouped.get(order.id)?.items.push({ bookId: item.bookId, quantity: item.quantity });
  });
  return Array.from(grouped.values());
}
async function listSavedBooks(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(savedBooks).where(eq(savedBooks.userId, userId)).orderBy(desc(savedBooks.createdAt));
}
async function saveBook(userId, bookId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(savedBooks).values({ userId, bookId }).onDuplicateKeyUpdate({ set: { bookId } });
}
async function removeSavedBook(userId, bookId) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.delete(savedBooks).where(and(eq(savedBooks.userId, userId), eq(savedBooks.bookId, bookId)));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/stripe.ts
import express from "express";
import Stripe from "stripe";

// server/orderUtils.ts
function encodePurchasedBooks(items) {
  return items.map((item) => `${item.bookId}:${item.quantity}`).join(",");
}
function decodePurchasedBooks(value) {
  if (!value) return [];
  return value.split(",").flatMap((entry) => {
    const [bookId, quantityValue] = entry.split(":");
    const quantity = Number(quantityValue);
    return bookId && Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? [{ bookId, quantity }] : [];
  });
}

// server/stripe.ts
var stripeClient = null;
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe payment processing is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
function isStripeTestEvent(eventId) {
  return eventId.startsWith("evt_test_");
}
function registerStripeWebhook(app) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature) || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing Stripe webhook signature." });
    }
    let event;
    try {
      event = getStripeClient().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.warn("[Stripe webhook] Signature verification failed", error instanceof Error ? error.message : "Unknown error");
      return res.status(400).json({ error: "Invalid Stripe webhook signature." });
    }
    if (isStripeTestEvent(event.id)) {
      console.log("[Stripe webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = Number(session.metadata?.user_id || session.client_reference_id);
      const shippingAddressId = Number(session.metadata?.shipping_address_id) || void 0;
      if (Number.isInteger(userId) && userId > 0) {
        await recordCompletedOrder({
          userId,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          shippingAddressId,
          items: decodePurchasedBooks(session.metadata?.cart_items)
        });
      }
      console.log("[Stripe webhook] Checkout completed", { eventId: event.id, sessionId: session.id, customerId: session.customer, userId: session.metadata?.user_id });
    }
    return res.json({ received: true });
  });
}

// server/checkoutRouter.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z } from "zod";

// server/products.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
var checkoutProducts = {
  "quiet-architect": { name: "The Quiet Architect", description: "by Elias Rowan", unitAmount: 59900 },
  "art-starting-again": { name: "The Art of Starting Again", description: "by Clara Bennett", unitAmount: 49900 },
  "after-last-train": { name: "After the Last Train", description: "by Noah Ellis", unitAmount: 44900 },
  "thinking-systems": { name: "Thinking in Systems", description: "by Adrian Cole", unitAmount: 69900 },
  "weight-of-words": { name: "The Weight of Words", description: "by Mira Lawson", unitAmount: 39900 },
  "room-sunlight": { name: "A Room Full of Sunlight", description: "by Eleanor Hayes", unitAmount: 54900 },
  "human-pattern": { name: "The Human Pattern", description: "by Daniel Mercer", unitAmount: 64900 },
  "small-habits": { name: "Small Habits, Big Days", description: "by Oliver Reed", unitAmount: 49900 },
  "last-letter": { name: "The Last Letter", description: "by Sophie Laurent", unitAmount: 44900 },
  "beyond-obvious": { name: "Beyond the Obvious", description: "by Marcus Vale", unitAmount: 59900 },
  "founders-notebook": { name: "The Founders' Notebook", description: "by James Carter", unitAmount: 74900 },
  "where-light-ends": { name: "Where the Light Ends", description: "by Amelia Rose", unitAmount: 52900 },
  "long-way-home": { name: "The Long Way Home", description: "by Theo Martin", unitAmount: 57900 },
  "ordinary-life": { name: "Notes from an Ordinary Life", description: "by Hannah Brooks", unitAmount: 49900 },
  "language-mind": { name: "The Language of Mind", description: "by Nathan Wright", unitAmount: 69900 },
  "thousand-moments": { name: "A Thousand Small Moments", description: "by Lily Harper", unitAmount: 44900 },
  "courage-different": { name: "The Courage to Be Different", description: "by Ethan Blake", unitAmount: 54900 },
  "midnight-march": { name: "Midnight in March", description: "by Isabella Grey", unitAmount: 59900 }
};
function getCheckoutProducts(items) {
  const combined = /* @__PURE__ */ new Map();
  items.forEach((item) => combined.set(item.bookId, (combined.get(item.bookId) || 0) + item.quantity));
  return Array.from(combined, ([bookId, quantity]) => {
    const product = checkoutProducts[bookId];
    if (!product) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: "A selected book is no longer available for checkout." });
    }
    if (quantity < 1 || quantity > 10) {
      throw new TRPCError2({ code: "BAD_REQUEST", message: "Each title can have between one and ten copies in a checkout." });
    }
    return { bookId, quantity, product };
  });
}

// server/checkoutAddress.ts
function toStripeShippingAddress(address) {
  return {
    name: address.fullName,
    phone: address.phone || void 0,
    address: {
      line1: address.line1,
      line2: address.line2 || void 0,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country
    }
  };
}

// server/checkoutSession.ts
function createCheckoutSessionParams(input) {
  return {
    mode: "payment",
    client_reference_id: input.user.id.toString(),
    customer: input.customerId,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["IN"] },
    customer_update: { shipping: "auto", name: "auto" },
    phone_number_collection: { enabled: true },
    metadata: {
      user_id: input.user.id.toString(),
      customer_email: input.user.email || "",
      customer_name: input.user.name || "",
      cart_item_ids: input.entries.map((entry) => entry.bookId).join(","),
      cart_items: encodePurchasedBooks(input.entries.map((entry) => ({ bookId: entry.bookId, quantity: entry.quantity }))),
      shipping_address_id: input.defaultAddressId?.toString() || ""
    },
    line_items: input.entries.map(({ product, quantity }) => ({ quantity, price_data: { currency: "inr", unit_amount: product.unitAmount, product_data: { name: product.name, description: product.description } } })),
    success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/checkout/cancel`
  };
}

// server/stripeCustomer.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripeClient().customers.create({
    email: user.email || void 0,
    name: user.name || void 0,
    metadata: { user_id: user.id.toString() }
  });
  await setUserStripeCustomerId(user.id, customer.id);
  return customer.id;
}
async function getSafePaymentMethods(user) {
  const customerId = await ensureStripeCustomer(user);
  const stripe = getStripeClient();
  const [customer, methods] = await Promise.all([
    stripe.customers.retrieve(customerId),
    stripe.paymentMethods.list({ customer: customerId, type: "card" })
  ]);
  const defaultPaymentMethod = !customer.deleted && typeof customer.invoice_settings.default_payment_method === "string" ? customer.invoice_settings.default_payment_method : void 0;
  return methods.data.flatMap((method) => method.card ? [{
    id: method.id,
    brand: method.card.brand,
    last4: method.card.last4,
    expMonth: method.card.exp_month,
    expYear: method.card.exp_year,
    isDefault: method.id === defaultPaymentMethod
  }] : []);
}
async function assertCustomerPaymentMethod(customerId, paymentMethodId) {
  const method = await getStripeClient().paymentMethods.retrieve(paymentMethodId);
  if (method.customer !== customerId || method.type !== "card") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "That payment method is not available on this profile." });
  }
}
async function setDefaultStripePaymentMethod(user, paymentMethodId) {
  const customerId = await ensureStripeCustomer(user);
  await assertCustomerPaymentMethod(customerId, paymentMethodId);
  await getStripeClient().customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
}
async function detachStripePaymentMethod(user, paymentMethodId) {
  const customerId = await ensureStripeCustomer(user);
  await assertCustomerPaymentMethod(customerId, paymentMethodId);
  await getStripeClient().paymentMethods.detach(paymentMethodId);
}
async function createStripeCustomerPortal(user, returnUrl) {
  const customerId = await ensureStripeCustomer(user);
  return getStripeClient().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError4 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError4({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError4({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/checkoutRouter.ts
var checkoutInput = z.object({
  items: z.array(z.object({ bookId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1).max(18)
});
var checkoutRouter = router({
  createSession: protectedProcedure.input(checkoutInput).mutation(async ({ ctx, input }) => {
    const entries = getCheckoutProducts(input.items);
    const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
    if (!origin || origin.includes("undefined")) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Could not determine a secure checkout return address." });
    }
    let session;
    try {
      const customerId = await ensureStripeCustomer(ctx.user);
      const defaultAddress = await getDefaultShippingAddress(ctx.user.id);
      if (defaultAddress) {
        await getStripeClient().customers.update(customerId, {
          shipping: toStripeShippingAddress(defaultAddress)
        });
      }
      session = await getStripeClient().checkout.sessions.create(createCheckoutSessionParams({ origin, customerId, user: ctx.user, entries, defaultAddressId: defaultAddress?.id }));
    } catch (error) {
      console.error("[Stripe checkout] Session creation failed", error);
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Unable to start secure checkout. Please try again." });
    }
    if (!session.url) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Stripe did not return a checkout link." });
    }
    return { url: session.url };
  })
});

// server/profileRouter.ts
import { z as z3 } from "zod";

// server/profileValidation.ts
import { z as z2 } from "zod";
var addressInputSchema = z2.object({
  label: z2.string().trim().min(1).max(64),
  fullName: z2.string().trim().min(2).max(160),
  line1: z2.string().trim().min(3).max(255),
  line2: z2.string().trim().max(255).optional().nullable(),
  city: z2.string().trim().min(2).max(120),
  state: z2.string().trim().min(2).max(120),
  postalCode: z2.string().trim().min(4).max(24),
  country: z2.literal("IN"),
  phone: z2.string().trim().min(8).max(32).optional().nullable(),
  isDefault: z2.boolean().optional()
}).strict();

// server/profileRouter.ts
var addressIdInput = z3.object({ id: z3.number().int().positive() });
var paymentMethodInput = z3.object({ paymentMethodId: z3.string().min(1).max(255) });
function requestOrigin(request) {
  return request.headers.origin || `${request.protocol}://${request.get("host")}`;
}
var profileRouter = router({
  addresses: protectedProcedure.query(({ ctx }) => listShippingAddresses(ctx.user.id)),
  addAddress: protectedProcedure.input(addressInputSchema).mutation(async ({ ctx, input }) => {
    await createShippingAddress(ctx.user.id, input);
    return { success: true };
  }),
  updateAddress: protectedProcedure.input(addressIdInput.extend({ address: addressInputSchema })).mutation(async ({ ctx, input }) => {
    await updateShippingAddress(ctx.user.id, input.id, input.address);
    return { success: true };
  }),
  removeAddress: protectedProcedure.input(addressIdInput).mutation(async ({ ctx, input }) => {
    await deleteShippingAddress(ctx.user.id, input.id);
    return { success: true };
  }),
  setDefaultAddress: protectedProcedure.input(addressIdInput).mutation(async ({ ctx, input }) => {
    await setDefaultShippingAddress(ctx.user.id, input.id);
    return { success: true };
  }),
  paymentMethods: protectedProcedure.query(({ ctx }) => getSafePaymentMethods(ctx.user)),
  setDefaultPaymentMethod: protectedProcedure.input(paymentMethodInput).mutation(async ({ ctx, input }) => {
    await setDefaultStripePaymentMethod(ctx.user, input.paymentMethodId);
    return { success: true };
  }),
  removePaymentMethod: protectedProcedure.input(paymentMethodInput).mutation(async ({ ctx, input }) => {
    await detachStripePaymentMethod(ctx.user, input.paymentMethodId);
    return { success: true };
  }),
  createPaymentPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const session = await createStripeCustomerPortal(ctx.user, `${requestOrigin(ctx.req)}/profile`);
    return { url: session.url };
  }),
  orders: protectedProcedure.query(({ ctx }) => listOrdersForUser(ctx.user.id)),
  savedBooks: protectedProcedure.query(({ ctx }) => listSavedBooks(ctx.user.id)),
  saveBook: protectedProcedure.input(z3.object({ bookId: z3.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    getCheckoutProducts([{ bookId: input.bookId, quantity: 1 }]);
    await saveBook(ctx.user.id, input.bookId);
    return { success: true };
  }),
  removeSavedBook: protectedProcedure.input(z3.object({ bookId: z3.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    await removeSavedBook(ctx.user.id, input.bookId);
    return { success: true };
  })
});

// server/_core/systemRouter.ts
import { z as z4 } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError6({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError6({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError6({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError6({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError6({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError6({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z4.object({
      timestamp: z4.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z4.object({
      title: z4.string().min(1, "title is required"),
      content: z4.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  checkout: checkoutRouter,
  profile: profileRouter
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/app.ts
function createApp() {
  const app = express2();
  registerStripeWebhook(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}
export {
  createApp
};
