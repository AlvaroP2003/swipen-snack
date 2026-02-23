import { AuthContext } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { createSessionFromUrl } from "@/utils/use-password-recovery";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const handleUrlRef = useRef(false);

  const router = useRouter();
  const segments = useSegments();

  // Use Effect to get initial session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (_event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Hook to get url and tokens from link path and create a session (via emails)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (handleUrlRef.current) return; // Prevents it from firing twice
      handleUrlRef.current = true;

      const result = await createSessionFromUrl(url);
      if (!result) return;

      if (result.type === "recovery") {
        setIsRecovering(true);
        setTimeout(() => {
          router.replace("/(auth)/reset_password");
        }, 0);
      }
    };

    // Get url from cold boot up
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Get url from open link
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));

    return () => sub.remove();
  }, []);

  // Auth guard to redirect unauthorized users
  useEffect(() => {
    if (loading) return;

    const inMainRoute = segments[0] === "(main)";
    const inAuthRoute = segments[0] === "(auth)";

    if (!session && !inAuthRoute && !isRecovering) {
      router.replace("/(auth)");
    }

    if (session && !inMainRoute && !isRecovering) {
      router.replace("/(main)");
    }
  }, [loading, session, segments, isRecovering]);

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.fullScreen}>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fullScreen}>
      <StatusBar
        backgroundColor={"#ff0a54"}
        barStyle={"light-content"}
        hidden={false}
      />
      <AuthContext.Provider
        value={{
          isRecovering,
          setIsRecovering,
        }}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
