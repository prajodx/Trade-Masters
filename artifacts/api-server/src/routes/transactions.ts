import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/transactions", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "50", 10), 100);
  const offset = parseInt((req.query["offset"] as string) ?? "0", 10);

  try {
    const [txRows, totalRows] = await Promise.all([
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.userId, userId))
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(transactionsTable).where(eq(transactionsTable.userId, userId)),
    ]);

    res.json({
      transactions: txRows.map((tx) => ({
        id: tx.id,
        type: tx.type,
        coinId: tx.coinId,
        coinSymbol: tx.coinSymbol,
        coinName: tx.coinName,
        quantity: parseFloat(tx.quantity),
        price: parseFloat(tx.price),
        total: parseFloat(tx.total),
        createdAt: tx.createdAt.toISOString(),
      })),
      total: totalRows[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
