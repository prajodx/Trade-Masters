import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, holdingsTable, transactionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

router.post("/buy", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    const { coinId, coinSymbol, coinName, quantity, price } = req.body as {
      coinId: string;
      coinSymbol: string;
      coinName: string;
      quantity: number;
      price: number;
    };

    if (!coinId || !coinSymbol || !coinName || !quantity || !price || quantity <= 0 || price <= 0) {
      res.status(400).json({ error: "Invalid trade parameters" });
      return;
    }

    const total = quantity * price;

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = users[0];

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const currentBalance = parseFloat(user.balance);

    if (currentBalance < total) {
      res.status(400).json({ error: "Insufficient funds" });
      return;
    }

    const newBalance = currentBalance - total;

    const existingHoldings = await db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.coinId, coinId)))
      .limit(1);

    const existingHolding = existingHoldings[0];

    if (existingHolding) {
      const existingQty = parseFloat(existingHolding.quantity);
      const existingAvg = parseFloat(existingHolding.avgBuyPrice);
      const newQty = existingQty + quantity;
      const newAvg = (existingQty * existingAvg + total) / newQty;

      await db
        .update(holdingsTable)
        .set({
          quantity: newQty.toString(),
          avgBuyPrice: newAvg.toString(),
          updatedAt: new Date(),
        })
        .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.coinId, coinId)));
    } else {
      await db.insert(holdingsTable).values({
        userId,
        coinId,
        coinSymbol,
        coinName,
        quantity: quantity.toString(),
        avgBuyPrice: price.toString(),
      });
    }

    await db.update(usersTable).set({ balance: newBalance.toString(), updatedAt: new Date() }).where(eq(usersTable.id, userId));

    const txId = generateId();
    const transactions = await db
      .insert(transactionsTable)
      .values({
        id: txId,
        userId,
        type: "buy",
        coinId,
        coinSymbol,
        coinName,
        quantity: quantity.toString(),
        price: price.toString(),
        total: total.toString(),
      })
      .returning();

    const tx = transactions[0];

    res.json({
      transaction: {
        id: tx.id,
        type: tx.type,
        coinId: tx.coinId,
        coinSymbol: tx.coinSymbol,
        coinName: tx.coinName,
        quantity: parseFloat(tx.quantity),
        price: parseFloat(tx.price),
        total: parseFloat(tx.total),
        createdAt: tx.createdAt.toISOString(),
      },
      newBalance,
      message: `Successfully bought ${quantity} ${coinSymbol}`,
    });
  } catch (err) {
    req.log.error({ err }, "Buy error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sell", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    const { coinId, coinSymbol, coinName, quantity, price } = req.body as {
      coinId: string;
      coinSymbol: string;
      coinName: string;
      quantity: number;
      price: number;
    };

    if (!coinId || !coinSymbol || !coinName || !quantity || !price || quantity <= 0 || price <= 0) {
      res.status(400).json({ error: "Invalid trade parameters" });
      return;
    }

    const total = quantity * price;

    const existingHoldings = await db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.coinId, coinId)))
      .limit(1);

    const holding = existingHoldings[0];

    if (!holding || parseFloat(holding.quantity) < quantity) {
      res.status(400).json({ error: "Insufficient holdings" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = users[0];

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const currentBalance = parseFloat(user.balance);
    const newBalance = currentBalance + total;
    const newQty = parseFloat(holding.quantity) - quantity;

    if (newQty < 0.000001) {
      await db.delete(holdingsTable).where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.coinId, coinId)));
    } else {
      await db
        .update(holdingsTable)
        .set({ quantity: newQty.toString(), updatedAt: new Date() })
        .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.coinId, coinId)));
    }

    await db.update(usersTable).set({ balance: newBalance.toString(), updatedAt: new Date() }).where(eq(usersTable.id, userId));

    const txId = generateId();
    const transactions = await db
      .insert(transactionsTable)
      .values({
        id: txId,
        userId,
        type: "sell",
        coinId,
        coinSymbol,
        coinName,
        quantity: quantity.toString(),
        price: price.toString(),
        total: total.toString(),
      })
      .returning();

    const tx = transactions[0];

    res.json({
      transaction: {
        id: tx.id,
        type: tx.type,
        coinId: tx.coinId,
        coinSymbol: tx.coinSymbol,
        coinName: tx.coinName,
        quantity: parseFloat(tx.quantity),
        price: parseFloat(tx.price),
        total: parseFloat(tx.total),
        createdAt: tx.createdAt.toISOString(),
      },
      newBalance,
      message: `Successfully sold ${quantity} ${coinSymbol}`,
    });
  } catch (err) {
    req.log.error({ err }, "Sell error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
