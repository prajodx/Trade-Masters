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
import { useGetTransactions } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import type { TransactionItem } from "@workspace/api-client-react";

function TransactionCard({ tx }: { tx: TransactionItem }) {
  const colors = useColors();
  const isBuy = tx.type === "buy";
  const date = new Date(tx.createdAt);

  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isBuy ? colors.profit + "20" : colors.loss + "20" }]}>
        <MaterialCommunityIcons
          name={isBuy ? "arrow-down-circle" : "arrow-up-circle"}
          size={24}
          color={isBuy ? colors.profit : colors.loss}
        />
      </View>
      <View style={styles.txInfo}>
        <View style={styles.txTopRow}>
          <Text style={[styles.txCoin, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {tx.coinName}
          </Text>
          <Text style={[styles.txTotal, { color: isBuy ? colors.loss : colors.profit, fontFamily: "Inter_600SemiBold" }]}>
            {isBuy ? "-" : "+"}${tx.total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.txBottomRow}>
          <Text style={[styles.txDetails, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {isBuy ? "Bought" : "Sold"} {tx.quantity.toFixed(6)} {tx.coinSymbol} @ ${tx.price.toFixed(2)}
          </Text>
          <Text style={[styles.txDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {dateStr} {timeStr}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useGetTransactions({ limit: 100, offset: 0 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : 100;

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
          Failed to load history
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
        data={data?.transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard tx={item} />}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: topInset + 8 }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              History
            </Text>
            {data && (
              <Text style={[styles.headerCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {data.total} trades
              </Text>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              No trades yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your trade history will appear here
            </Text>
          </View>
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
  headerCount: { fontSize: 14, marginTop: 4 },
  txCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  txCoin: { fontSize: 15 },
  txTotal: { fontSize: 15 },
  txBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txDetails: { fontSize: 12, flex: 1 },
  txDate: { fontSize: 11 },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  errorText: { fontSize: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText: { fontSize: 15 },
});
