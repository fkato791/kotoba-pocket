import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { queryClient } from "@/lib/queryClient";
import { useAppBootstrap } from "@/bootstrap/useAppBootstrap";
import { BottomNavigation } from "@/ui/components/BottomNavigation";
import { colors } from "@/ui/theme";

export default function RootLayout(): JSX.Element {
  useAppBootstrap();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: { fontWeight: "800" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background }
          }}
        >
          <Stack.Screen name="index" options={{ title: "ホーム" }} />
          <Stack.Screen name="quick-add" options={{ title: "単語を追加", presentation: "modal" }} />
          <Stack.Screen name="card/[id]" options={{ title: "単語カード編集" }} />
          <Stack.Screen name="review" options={{ title: "復習" }} />
          <Stack.Screen name="collection" options={{ title: "単語帳" }} />
          <Stack.Screen name="study-stats" options={{ title: "学習記録" }} />
          <Stack.Screen name="import-export" options={{ title: "データ" }} />
          <Stack.Screen name="settings" options={{ title: "設定" }} />
        </Stack>
        <BottomNavigation />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
