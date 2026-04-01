import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuthGoogle } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  useSharedValue,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const authMutation = useAuthGoogle();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "placeholder",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      handleGoogleSuccess(response.authentication.accessToken);
    }
  }, [response]);

  const handleGoogleSuccess = async (accessToken: string) => {
    setIsLoading(true);
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json() as {
        sub: string;
        email: string;
        name: string;
        picture: string;
      };

      authMutation.mutate(
        {
          data: {
            idToken: accessToken,
            userInfo: {
              id: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            },
          },
        },
        {
          onSuccess: async (data) => {
            await login(data.token, data.user);
          },
          onError: (err) => {
            Alert.alert("Error", "Failed to sign in. Please try again.");
            setIsLoading(false);
          },
        }
      );
    } catch {
      Alert.alert("Error", "Failed to get user info. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      authMutation.mutate(
        {
          data: {
            idToken: "demo_token",
            userInfo: {
              id: "demo_user_" + Math.random().toString(36).substr(2, 9),
              email: "demo@cryptosim.app",
              name: "Demo Trader",
              picture: undefined,
            },
          },
        },
        {
          onSuccess: async (data) => {
            await login(data.token, data.user);
          },
          onError: () => {
            Alert.alert("Error", "Failed to create demo account.");
            setIsLoading(false);
          },
        }
      );
    } catch {
      setIsLoading(false);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#00c89620", "#090d14", "#090d14"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: topInset + 60 }]}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoArea}>
          <View style={[styles.iconBg, { backgroundColor: colors.primary + "20" }]}>
            <MaterialCommunityIcons name="chart-line" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            CryptoSim
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Trade crypto with $100,000 virtual funds
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
          {[
            { label: "Starting Balance", value: "$100K" },
            { label: "Live Prices", value: "Real-time" },
            { label: "Risk", value: "$0" },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.buttons}>
          {isLoading ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Signing in...
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: "#ffffff" }]}
                onPress={() => promptAsync()}
                disabled={!request}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[styles.googleBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoBtn, { backgroundColor: colors.primary }]}
                onPress={handleDemoLogin}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primaryForeground} />
                <Text style={[styles.demoBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Try Demo Account
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(700).springify()}
          style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
        >
          No real money involved. Practice trading with virtual funds.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 32,
  },
  logoArea: {
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 36,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  buttons: {
    gap: 12,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
    gap: 10,
  },
  googleBtnText: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
    gap: 10,
  },
  demoBtnText: {
    fontSize: 16,
  },
  loadingContainer: {
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
