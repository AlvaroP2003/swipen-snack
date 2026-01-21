import ConfirmModal from "@/components/ConfirmModal";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.25;
const OFFSCREEN = width * 1.5;

export default function GameScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [index, setIndex] = useState(0);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Animated values for current card only
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.95);
  const nextCardTranslateY = useSharedValue(10);

  // Fetch meals
  useEffect(() => {
    const fetchMeals = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from("users")
          .select("preferences")
          .eq("id", user.id)
          .single();

        const userPreferences = userData?.preferences || [];

        const { data: allMeals } = await supabase.from("meals").select("*");

        const filteredMeals =
          allMeals?.filter((meal: any) => {
            const mealPreferences = meal.preferences || [];
            if (!userPreferences.length || !mealPreferences.length) return true;
            return mealPreferences.some((p: string) =>
              userPreferences.includes(p),
            );
          }) || [];

        const mealsWithUrls = filteredMeals.map((meal: any) => {
          const { data: urlData } = supabase.storage
            .from("meal_images")
            .getPublicUrl(meal.image);
          return { ...meal, imageUrl: urlData?.publicUrl || "" };
        });

        setMeals(mealsWithUrls);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeals();
  }, []);

  // Fetch participant ID
  useEffect(() => {
    const fetchParticipant = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("participants")
        .select("id")
        .eq("user_id", user.id)
        .eq("room_id", roomId)
        .single();

      if (error) return console.error("Error fetching participant");

      setParticipantId(data.id);
    };
    fetchParticipant();
  }, [roomId]);

  // Swipe logic
  const swipe = (direction: "left" | "right") => {
    if (!currentMeal) return;
    recordSwipe(currentMeal, direction === "left" ? "disliked" : "like");

    setIndex((prev) => prev + 1);

    if (index >= meals.length - 1) {
      runOnJS(onSwipedAll)();
    }
  };

  const recordSwipe = async (meal: any, action: "like" | "disliked") => {
    if (!meal || !participantId) return;
    try {
      await supabase
        .from("swipes")
        .insert({ participant_id: participantId, meal_id: meal.id, action });
    } catch (err) {
      console.error(err);
    }
  };

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      const progress = Math.min(
        Math.abs(translateX.value) / SWIPE_THRESHOLD,
        1,
      );
      nextCardScale.value = 0.95 + 0.05 * progress;
      nextCardTranslateY.value = 10 - 10 * progress;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(OFFSCREEN, {}, () => {
          runOnJS(swipe)("right");
          translateX.value = 0;
          translateY.value = 0;
          nextCardScale.value = 0.95;
          nextCardTranslateY.value = 10;
        });
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-OFFSCREEN, {}, () => {
          runOnJS(swipe)("left");
          translateX.value = 0;
          translateY.value = 0;
          nextCardScale.value = 0.95;
          nextCardTranslateY.value = 10;
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        nextCardScale.value = withSpring(0.95);
        nextCardTranslateY.value = withSpring(10);
      }
    });

  // Animated styles
  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 15}deg` },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: nextCardScale.value },
      { translateY: nextCardTranslateY.value },
    ],
    opacity: 0.9,
  }));

  const onSwipedAll = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("participants")
      .update({ status: "waiting" })
      .eq("user_id", user.id);

    router.replace({ pathname: "/waitingScreen", params: { roomId } });
  };

  const currentMeal = meals[index];

  return (
    <SafeAreaView style={styles.container}>
      <Image
        style={styles.image}
        source={require("../../assets/images/banner-icon.png")}
        resizeMode="contain"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      ) : (
        <>
          <View style={styles.gameContainer}>
            {meals
              .slice(index, index + 2)
              .reverse() // so top card renders on top
              .map((meal, i) => {
                const isTop = i === 1; // after reverse(), last item is top

                // Only apply animated style to the top card
                // Next card gets static initial positioning
                const animStyle = isTop ? topCardStyle : nextCardStyle;

                const CardContent = (
                  <Animated.View
                    key={`${meal.id}-${index}`}
                    style={[
                      styles.card,
                      isTop ? styles.cardTop : styles.cardBehind,
                      animStyle,
                    ]}
                  >
                    <Image
                      source={{ uri: meal.imageUrl }}
                      style={styles.cardImage}
                    />
                    <View style={styles.nameContainer}>
                      <Text style={styles.name}>{meal.name}</Text>
                    </View>
                  </Animated.View>
                );

                return isTop ? (
                  <GestureDetector
                    key={`${meal.id}-${index}`}
                    gesture={panGesture}
                  >
                    {CardContent}
                  </GestureDetector>
                ) : (
                  CardContent
                );
              })}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => swipe("left")}
            >
              <Ionicons name="close" size={40} color="#ff0a54" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => setShowExitModal(true)}
            >
              <Ionicons name="ban" size={40} color="#ff0a54" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => swipe("right")}
            >
              <Ionicons name="heart" size={40} color="#ff0a54" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <ConfirmModal
        visible={showExitModal}
        title="Leave Game?"
        message="Are you sure you want to leave? Your swiping progress will be lost and you'll need to start over."
        onConfirm={() => {
          setShowExitModal(false);
          router.back();
        }}
        onCancel={() => setShowExitModal(false)}
        confirmText="Yes, Leave"
        cancelText="Stay"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#ff0a54" },
  image: {
    marginTop: 10,
    width: 380,
    height: height * 0.1,
    alignSelf: "center",
  },
  gameContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    height: "90%",
    width: width * 0.9,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  cardImage: { width: "100%", height: "100%", borderRadius: 20 },
  cardBehind: { zIndex: 1, position: "absolute", top: 0, bottom: 0 },
  cardTop: { zIndex: 2, position: "absolute", top: 0, bottom: 0 },
  nameContainer: {
    backgroundColor: "white",
    height: "10%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  name: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#ff0a54",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    width: "100%",
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "white",
    height: 60,
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },
});
