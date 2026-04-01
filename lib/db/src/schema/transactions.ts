import { pgTable, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(), // "buy" | "sell"
  coinId: text("coin_id").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  coinName: text("coin_name").notNull(),
  quantity: decimal("quantity", { precision: 30, scale: 18 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  total: decimal("total", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
