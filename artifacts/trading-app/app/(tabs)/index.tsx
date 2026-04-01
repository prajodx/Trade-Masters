import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetPrices } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { CoinPrice } from "@workspace/api-client-react";

function CoinRow({ coin, onPress }: { coin: CoinPrice; onPress: () => void }) {
  const colors = useColors();
  const isPositive = coin.priceChangePercentage24h >= 0;

  return (
    <TouchableOpacity
      style={[styles.coinRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.coinLeft}>
        <View style={[styles.rankBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.rankText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {coin.rank}
          </Text>
        </View>
        {coin.image ? (
          <Image source={{ uri: coin.image }} style={styles.coinIcon} />
        ) : (
          <View style={[styles.coinIconPlaceholder, { backgroundColor: colors.muted }]} />
        )}
        <View style={styles.coinInfo}>
          <Text style={[styles.coinName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {coin.name}
          </Text>
          <Text style={[styles.coinSymbol, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {coin.symbol}
          </Text>
        </View>
      </View>
      <View style={styles.coinRight}>
        <Text style={[styles.coinPrice, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {formatPrice(coin.currentPrice)}
        </Text>
        <View style={[styles.changeBadge, { backgroundColor: isPositive ? colors.profit + "20" : colors.loss + "20" }]}>
          <Text style={[styles.changeText, { color: isPositive ? colors.profit : colors.loss, fontFamily: "Inter_500Medium" }]}>
            {isPositive ? "+" : ""}{coin.priceChangePercentage24h?.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) return "$" + price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return "$" + price.toFixed(2);
  if (price >= 0.01) return "$" + price.toFixed(4);
  return "$" + price.toFixed(8);
}

export default function MarketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: coins, isLoading, error, refetch } = useGetPrices();

  const filtered = coins?.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const renderHeader = () => (
    <View>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Welcome back
          </Text>
          <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {user?.name?.split(" ")[0] ?? "Trader"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.balancePill, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.balanceText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              ${user?.balance?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "0"}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.muted }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Search coins..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        TOP 20 COINS BY MARKET CAP
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Loading market data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Failed to load prices
        </Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={[styles.retryBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CoinRow
            coin={item}
            onPress={() => router.push(`/coin/${item.id}` as any)}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No coins found
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 84 : 100 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13 },
  userName: { fontSize: 24, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  balancePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  balanceText: { fontSize: 14 },
  logoutBtn: { padding: 4 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, paddingHorizontal: 20, paddingBottom: 8 },
  listContent: { paddingBottom: 100 },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coinLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  rankBadge: {
    width: 28,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11 },
  coinIcon: { width: 40, height: 40, borderRadius: 20 },
  coinIconPlaceholder: { width: 40, height: 40, borderRadius: 20 },
  coinInfo: { flex: 1 },
  coinName: { fontSize: 15 },
  coinSymbol: { fontSize: 13, marginTop: 2 },
  coinRight: { alignItems: "flex-end", gap: 6 },
  coinPrice: { fontSize: 15 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  changeText: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16 },
  loadingText: { fontSize: 16, marginTop: 12 },
  errorText: { fontSize: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  retryBtnText: { fontSize: 15 },
});
