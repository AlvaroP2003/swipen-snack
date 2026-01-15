import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="createRoom" />
      <Stack.Screen name="joinRoom" />
    </Stack>
  );
}
