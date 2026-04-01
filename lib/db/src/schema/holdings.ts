import { pgTable, text, timestamp, decimal, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const holdingsTable = pgTable("holdings", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  coinId: text("coin_id").notNull(),
  coinSymbol: text("coin_symbol").notNull(),
  coinName: text("coin_name").notNull(),
  quantity: decimal("quantity", { precision: 30, scale: 18 }).notNull().default("0"),
  avgBuyPrice: decimal("avg_buy_price", { precision: 20, scale: 8 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.coinId] }),
}));

export type InsertHolding = typeof holdingsTable.$inferInsert;
export type Holding = typeof holdingsTable.$inferSelect;
