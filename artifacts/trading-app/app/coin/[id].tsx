import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useGetPrices, useBuyCoin, useSellCoin, useGetPortfolio } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPortfolioQueryKey, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { CoinPrice } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

function PriceBar({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <Text style={[styles.barValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{value}</Text>
    </View>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return "$" + price.toFixed(2);
  if (price >= 0.01) return "$" + price.toFixed(4);
  return "$" + price.toFixed(8);
}

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString("en-US");
}

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "buy" | "sell";
  coin: CoinPrice;
  maxBalance: number;
  maxQuantity: number;
}

function TradeModal({ visible, onClose, mode, coin, maxBalance, maxQuantity }: TradeModalProps) {
  const colors = useColors();
  const { updateBalance } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const buyCoin = useBuyCoin();
  const sellCoin = useSellCoin();

  const isBuy = mode === "buy";
  const qty = parseFloat(quantity) || 0;
  const total = qty * coin.currentPrice;
  const canSubmit = qty > 0 && (isBuy ? total <= maxBalance : qty <= maxQuantity);

  const handleMax = () => {
    if (isBuy) {
      const maxQty = maxBalance / coin.currentPrice;
      setQuantity(maxQty.toFixed(8));
    } else {
      setQuantity(maxQuantity.toFixed(8));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tradeData = {
      coinId: coin.id,
      coinSymbol: coin.symbol,
      coinName: coin.name,
      quantity: qty,
      price: coin.currentPrice,
    };

    const mutateOptions = {
      onSuccess: (data: { newBalance: number; message: string }) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateBalance(data.newBalance);
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
        Alert.alert(isBuy ? "Bought!" : "Sold!", data.message);
        onClose();
        setQuantity("");
        setIsLoading(false);
      },
      onError: (err: Error) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", err.message || "Trade failed");
        setIsLoading(false);
      },
    };

    if (isBuy) {
      buyCoin.mutate({ data: tradeData }, mutateOptions);
    } else {
      sellCoin.mutate({ data: tradeData }, mutateOptions);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {isBuy ? "Buy" : "Sell"} {coin.symbol}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.priceSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.psLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Current Price
            </Text>
            <Text style={[styles.psPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {formatPrice(coin.currentPrice)}
            </Text>
          </View>

          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Quantity ({coin.symbol})
            </Text>
            <TextInput
              style={[styles.quantityInput, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
            />
            <TouchableOpacity onPress={handleMax} style={[styles.maxBtn, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.maxBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {isBuy ? "Available Balance" : "Available to Sell"}
              </Text>
              <Text style={[styles.totalSub, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {isBuy ? `$${maxBalance.toFixed(2)}` : `${maxQuantity.toFixed(6)} ${coin.symbol}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit
                  ? isBuy ? colors.profit : colors.loss
                  : colors.muted,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitBtnText, { color: canSubmit ? "#fff" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                {isBuy ? "Buy" : "Sell"} {coin.symbol}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CoinDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [tradeModal, setTradeModal] = useState<"buy" | "sell" | null>(null);

  const { data: coins, isLoading } = useGetPrices();
  const { data: portfolio } = useGetPortfolio();

  const coin = coins?.find((c) => c.id === id);
  const holding = portfolio?.holdings.find((h) => h.coinId === id);
  const maxBalance = user?.balance ?? 0;
  const maxQuantity = holding?.quantity ?? 0;

  const isPositive = (coin?.priceChangePercentage24h ?? 0) >= 0;
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topInset + 60 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!coin) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topInset + 60 }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Coin not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.heroSection, { paddingTop: topInset + 60 }]}>
          {coin.image ? (
            <Image source={{ uri: coin.image }} style={styles.coinLogo} />
          ) : null}
          <Text style={[styles.coinName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {coin.name}
          </Text>
          <Text style={[styles.coinSymbol, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {coin.symbol} · Rank #{coin.rank}
          </Text>
          <Text style={[styles.coinPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {formatPrice(coin.currentPrice)}
          </Text>
          <View style={[styles.changePill, { backgroundColor: isPositive ? colors.profit + "20" : colors.loss + "20" }]}>
            <MaterialCommunityIcons
              name={isPositive ? "trending-up" : "trending-down"}
              size={16}
              color={isPositive ? colors.profit : colors.loss}
            />
            <Text style={[styles.changeText, { color: isPositive ? colors.profit : colors.loss, fontFamily: "Inter_600SemiBold" }]}>
              {isPositive ? "+" : ""}{coin.priceChangePercentage24h?.toFixed(2)}% (24h)
            </Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              MARKET DATA
            </Text>
            <PriceBar label="Market Cap" value={formatLargeNumber(coin.marketCap)} />
            <PriceBar label="24h Change" value={`${isPositive ? "+" : ""}$${Math.abs(coin.priceChange24h).toFixed(2)}`} />
            <PriceBar label="Symbol" value={coin.symbol} />
          </View>

          {holding && (
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                YOUR POSITION
              </Text>
              <PriceBar label="Holdings" value={`${holding.quantity.toFixed(6)} ${coin.symbol}`} />
              <PriceBar label="Avg Buy Price" value={formatPrice(holding.avgBuyPrice)} />
              <PriceBar label="Current Value" value={`$${holding.currentValue.toFixed(2)}`} />
              <PriceBar
                label="Profit / Loss"
                value={`${holding.profitLoss >= 0 ? "+" : ""}$${holding.profitLoss.toFixed(2)} (${holding.profitLossPercent.toFixed(2)}%)`}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.tradeBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.tradeBtn, { backgroundColor: colors.profit }]}
          onPress={() => setTradeModal("buy")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tradeBtnText, { fontFamily: "Inter_700Bold" }]}>BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tradeBtn, { backgroundColor: colors.loss }]}
          onPress={() => setTradeModal("sell")}
          activeOpacity={0.8}
          disabled={!holding || maxQuantity === 0}
        >
          <Text style={[styles.tradeBtnText, { fontFamily: "Inter_700Bold", opacity: !holding || maxQuantity === 0 ? 0.5 : 1 }]}>
            SELL
          </Text>
        </TouchableOpacity>
      </View>

      {tradeModal && coin && (
        <TradeModal
          visible={!!tradeModal}
          onClose={() => setTradeModal(null)}
          mode={tradeModal}
          coin={coin}
          maxBalance={maxBalance}
          maxQuantity={maxQuantity}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  coinLogo: { width: 72, height: 72, borderRadius: 36, marginBottom: 4 },
  coinName: { fontSize: 28, letterSpacing: -0.5 },
  coinSymbol: { fontSize: 14 },
  coinPrice: { fontSize: 40, letterSpacing: -2, marginTop: 4 },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeText: { fontSize: 14 },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  barRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLabel: { fontSize: 14 },
  barValue: { fontSize: 14 },
  tradeBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  tradeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tradeBtnText: {
    fontSize: 16,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  errorText: { fontSize: 16 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17 },
  modalContent: { flex: 1, padding: 20 },
  priceSummary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  psLabel: { fontSize: 13 },
  psPrice: { fontSize: 28, marginTop: 4 },
  inputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  inputLabel: { fontSize: 12 },
  quantityInput: { fontSize: 28, paddingVertical: 4 },
  maxBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  maxBtnText: { fontSize: 12 },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 24 },
  totalSub: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  submitBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontSize: 17 },
});
