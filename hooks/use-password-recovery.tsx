import { supabase } from "@/lib/supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export function usePasswordRecovery() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const { params } = QueryParams.getQueryParams(url);
      const { access_token, refresh_token, type } = params;

      if (!access_token) return;

      if (type === "recovery" && access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        router.replace("/(auth)/reset_password");
      }
    };

    // App opened from background
    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    // App opened from cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);
}
