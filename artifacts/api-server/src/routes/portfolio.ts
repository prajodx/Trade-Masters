import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, holdingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

async function fetchPricesMap(): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1",
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return {};

    const data = (await response.json()) as Array<{ id: string; current_price: number }>;
    const map: Record<string, number> = {};
    for (const coin of data) {
      map[coin.id] = coin.current_price;
    }
    return map;
  } catch {
    return {};
  }
}

router.get("/portfolio", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = users[0];

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const holdings = await db.select().from(holdingsTable).where(eq(holdingsTable.userId, userId));

    const balance = parseFloat(user.balance);

    if (holdings.length === 0) {
      res.json({
        balance,
        totalValue: balance,
        totalInvested: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        holdings: [],
      });
      return;
    }

    const pricesMap = await fetchPricesMap();

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const holdingItems = holdings.map((h) => {
      const qty = parseFloat(h.quantity);
      const avgBuy = parseFloat(h.avgBuyPrice);
      const currentPrice = pricesMap[h.coinId] ?? avgBuy;
      const invested = qty * avgBuy;
      const currentValue = qty * currentPrice;
      const profitLoss = currentValue - invested;
      const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

      totalInvested += invested;
      totalCurrentValue += currentValue;

      return {
        coinId: h.coinId,
        coinSymbol: h.coinSymbol,
        coinName: h.coinName,
        quantity: qty,
        avgBuyPrice: avgBuy,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent,
      };
    });

    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    res.json({
      balance,
      totalValue: balance + totalCurrentValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercent,
      holdings: holdingItems,
    });
  } catch (err) {
    req.log.error({ err }, "Portfolio error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
