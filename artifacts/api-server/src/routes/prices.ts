import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  rank: number;
}

let priceCache: { data: CoinData[]; timestamp: number } | null = null;
const CACHE_DURATION = 30000;

export async function getPriceForCoin(coinId: string): Promise<number | null> {
  const now = Date.now();
  if (priceCache && now - priceCache.timestamp < CACHE_DURATION) {
    const coin = priceCache.data.find((c) => c.id === coinId);
    return coin ? coin.currentPrice : null;
  }

  try {
    await refreshPriceCache();
    const coin = priceCache?.data.find((c) => c.id === coinId);
    return coin ? coin.currentPrice : null;
  } catch {
    return null;
  }
}

async function refreshPriceCache(): Promise<void> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h",
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko error: ${response.status}`);
  }

  const rawData = (await response.json()) as Array<{
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    market_cap: number;
    market_cap_rank: number;
  }>;

  priceCache = {
    data: rawData.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price,
      priceChange24h: coin.price_change_24h,
      priceChangePercentage24h: coin.price_change_percentage_24h,
      marketCap: coin.market_cap,
      rank: coin.market_cap_rank,
    })),
    timestamp: Date.now(),
  };
}

router.get("/prices", async (req, res) => {
  try {
    const now = Date.now();

    if (priceCache && now - priceCache.timestamp < CACHE_DURATION) {
      res.json(priceCache.data.slice(0, 20));
      return;
    }

    await refreshPriceCache();
    res.json(priceCache!.data.slice(0, 20));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    if (priceCache) {
      res.json(priceCache.data.slice(0, 20));
      return;
    }
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

export default router;
