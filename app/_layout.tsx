import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading) return

    const inMainRoute = segments[0] === '(main)'
    const inAuthRoute = segments[0] === '(auth)'

    if (!session && !inAuthRoute) {
      router.replace('/(auth)')
    }

    if (session && !inMainRoute) {
      router.replace('/(main)')
    }
  }, [loading, session, segments])

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.fullScreen}>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={styles.fullScreen}>
      <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(auth)" />
      </Stack>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
