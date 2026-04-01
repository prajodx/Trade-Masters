import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useGetPortfolio } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { HoldingItem } from "@workspace/api-client-react";

function HoldingCard({ holding }: { holding: HoldingItem }) {
  const colors = useColors();
  const isProfit = holding.profitLoss >= 0;

  return (
    <View style={[styles.holdingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.holdingTop}>
        <View style={styles.holdingNameArea}>
          <View style={[styles.coinDot, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={[styles.holdingName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {holding.coinName}
            </Text>
            <Text style={[styles.holdingSymbol, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {holding.coinSymbol} · {holding.quantity.toFixed(6)}
            </Text>
          </View>
        </View>
        <View style={styles.holdingValues}>
          <Text style={[styles.holdingValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            ${holding.currentValue.toFixed(2)}
          </Text>
          <View style={[styles.plBadge, { backgroundColor: isProfit ? colors.profit + "20" : colors.loss + "20" }]}>
            <Text style={[styles.plText, { color: isProfit ? colors.profit : colors.loss, fontFamily: "Inter_500Medium" }]}>
              {isProfit ? "+" : ""}${holding.profitLoss.toFixed(2)} ({isProfit ? "+" : ""}{holding.profitLossPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.holdingDivider, { backgroundColor: colors.border }]} />
      <View style={styles.holdingBottom}>
        <Text style={[styles.holdingMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Avg: ${holding.avgBuyPrice.toFixed(2)}
        </Text>
        <Text style={[styles.holdingMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Current: ${holding.currentPrice.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: portfolio, isLoading, error, refetch } = useGetPortfolio();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : 100;

  const isOverallProfit = (portfolio?.totalProfitLoss ?? 0) >= 0;

  const renderHeader = () => (
    <View>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Portfolio
        </Text>
      </View>

      {portfolio && (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Total Value
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              ${portfolio.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={[styles.plRow, { backgroundColor: isOverallProfit ? colors.profit + "15" : colors.loss + "15", borderRadius: 10 }]}>
              <MaterialCommunityIcons
                name={isOverallProfit ? "trending-up" : "trending-down"}
                size={16}
                color={isOverallProfit ? colors.profit : colors.loss}
              />
              <Text style={[styles.overallPL, { color: isOverallProfit ? colors.profit : colors.loss, fontFamily: "Inter_600SemiBold" }]}>
                {isOverallProfit ? "+" : ""}${portfolio.totalProfitLoss.toFixed(2)} ({isOverallProfit ? "+" : ""}{portfolio.totalProfitLossPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {[
              { label: "Cash Balance", value: `$${portfolio.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
              { label: "Invested", value: `$${portfolio.totalInvested.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statBoxLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {s.label}
                </Text>
                <Text style={[styles.statBoxValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          {portfolio.holdings.length > 0 && (
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              HOLDINGS ({portfolio.holdings.length})
            </Text>
          )}
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Failed to load portfolio
        </Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={[styles.retryText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={portfolio?.holdings ?? []}
        keyExtractor={(item) => item.coinId}
        renderItem={({ item }) => <HoldingCard holding={item} />}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          portfolio ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="briefcase-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                No holdings yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Go to the Market tab to start trading
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28 },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 36, letterSpacing: -1 },
  plRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  overallPL: { fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 20 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statBoxLabel: { fontSize: 12 },
  statBoxValue: { fontSize: 16 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  holdingCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  holdingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  holdingNameArea: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  coinDot: { width: 8, height: 8, borderRadius: 4 },
  holdingName: { fontSize: 15 },
  holdingSymbol: { fontSize: 12, marginTop: 2 },
  holdingValues: { alignItems: "flex-end", gap: 6 },
  holdingValue: { fontSize: 16 },
  plBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  plText: { fontSize: 11 },
  holdingDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  holdingBottom: { flexDirection: "row", justifyContent: "space-between" },
  holdingMeta: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  errorText: { fontSize: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { fontSize: 15 },
});
