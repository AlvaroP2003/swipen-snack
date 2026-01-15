import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

export default function WaitingScreen() {

  const router = useRouter()
  const {roomId} = useLocalSearchParams()

  useEffect(() => {
    const checkInitialStatus = async () => {
      const { data: participants } = await supabase
        .from('participants')
        .select('status')
        .eq('room_id', roomId);

      const allDone = (participants || []).every(p => p.status === 'waiting');

      if (allDone) {
        await supabase
          .from('rooms')
          .update({ status: 'finished', updated_at: new Date() })
          .eq('id', roomId);

        router.replace({
          pathname: '/resultScreen',
          params: { roomId },
        });
      }
    };


    // Check immediately on entering screen
    checkInitialStatus();

    // Now subscribe for future updates
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const { data: participants } = await supabase
            .from('participants')
            .select('status')
            .eq('room_id', roomId);

          const allDone = (participants || []).every(p => p.status === 'waiting');

          if (allDone) {
            await supabase
              .from('rooms')
              .update({ status: 'finished', updated_at: new Date() })
              .eq('id', roomId);

            router.replace({
              pathname: '/resultScreen',
              params: { roomId },
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [roomId]);




  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopAnimation = () => {
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(500), // pause after flipping
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(500), // pause after flipping back
      ]).start(() => loopAnimation());
    };

    loopAnimation();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("../../assets/images/banner-icon.png")}
        resizeMode="contain"
      />

      <Animated.View style={[styles.icon, { transform: [{ rotate: spin }] }]}>
        <Ionicons name="hourglass-outline" size={150} color="white" />
      </Animated.View>

      <Text style={styles.text}>WAITING FOR PARTICIPANT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#ff0a54",
  },
  image: {
    marginTop: 30,
    width: 300,
    height: 100,
  },
  icon: {
    marginTop: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 20,
    marginTop: 40,
    width: 200,
    textAlign: "center",
    lineHeight: 30,
  },
});
