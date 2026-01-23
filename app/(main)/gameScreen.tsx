import ConfirmModal from "@/components/ConfirmModal";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";
import { runOnJS } from "react-native-worklets";

type MealsData = {
  id: string;
  name: string;
  imageUrl: string;
  preferences: string[];
  characteristics: string[];
};

const { width, height } = Dimensions.get("window");

export default function GameScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const [meals, setMeals] = useState<MealsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [index, setIndex] = useState(0);
  const [participantId, setParticipantId] = useState<string | null>(null);

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

      if (error) {
        console.error("Error fetching participant", error.message);
        return;
      }

      setParticipantId(data.id);
    };
    fetchParticipant();
  }, [roomId]);

  // Hearbeat check to make sure user is active
  useEffect(() => {
    const setHearbeat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const interval = setInterval(() => {
        supabase
          .from("room_participants")
          .update({ last_active_at: new Date().toISOString() })
          .eq("room_id", roomId)
          .eq("user_id", user?.id);
      }, 15000);

      return () => clearInterval(interval);
    };

    setHearbeat();
  }, []);

  type Props = {
    item: MealsData;
    index: number;
    datalenght: number;
    maxVisibleItem: number;
    currentIndex: number;
    animatedValue: SharedValue<number>;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  };

  const [newData, setNewData] = useState([...meals, ...meals]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    setNewData([...meals]);
  }, [meals]);

  // Function that writes to supabase
  const recordSwipe = async (mealId: string, action: "like" | "dislike") => {
    if (!participantId) return;

    try {
      const { data, error, status } = await supabase
        .from("swipes")
        .insert({
          participant_id: participantId,
          meal_id: mealId,
          action: action,
        })
        .select();

      if (error) {
        console.error("Error inserting swipe:", error);
        return false;
      }

      if (!data || data.length === 0) {
        console.warn(
          "No rows returned from insert, maybe something went wrong",
        );
        return false;
      }

      console.log(`Swipe recorded successfully:`, data[0]);
      return true;
    } catch (err) {
      console.error("Unexpected error recording swipe:", err);
      return false;
    }
  };

  // Card Component
  const Card = ({
    item,
    index,
    datalenght,
    maxVisibleItem,
    currentIndex,
    animatedValue,
    setCurrentIndex,
  }: Props) => {
    const { width } = useWindowDimensions();
    const translateX = useSharedValue(0);
    const direction = useSharedValue(0);

    const pan = Gesture.Pan()
      .onUpdate((e) => {
        const isSwipeRight = e.translationX > 0;

        direction.value = isSwipeRight ? 1 : -1;

        if (currentIndex === index) {
          translateX.value = e.translationX;
          animatedValue.value = interpolate(
            Math.abs(e.translationX),
            [0, width],
            [index, index + 1],
          );
        }
      })
      .onEnd((e) => {
        if (currentIndex == index) {
          if (Math.abs(e.translationX) > 150 || Math.abs(e.velocityX) > 1000) {
            const action: "like" | "dislike" =
              direction.value > 0 ? "like" : "dislike";

            translateX.value = withTiming(
              width * 1.2 * direction.value,
              {},
              () => {
                runOnJS(setCurrentIndex)(currentIndex + 1);
                runOnJS(recordSwipe)(item.id, action);
              },
            );
            animatedValue.value = withTiming(currentIndex + 1);
          } else {
            translateX.value = withTiming(0, { duration: 300 });
            animatedValue.value = withTiming(currentIndex);
          }
        }
      });

    const animatedStyle = useAnimatedStyle(() => {
      const currentItem = index === currentIndex;

      const rotateZ = interpolate(
        Math.abs(translateX.value),
        [0, width],
        [0, 20],
      );

      const translateY = interpolate(
        animatedValue.value,
        [index - 1, index],
        [-30, 0],
      );

      const scale = interpolate(
        animatedValue.value,
        [index - 1, index],
        [0.9, 1],
      );

      const opacity = interpolate(
        animatedValue.value + maxVisibleItem,
        [index, index + 1],
        [0, 1],
      );

      return {
        transform: [
          { translateX: translateX.value },
          {
            scale: currentItem ? 1 : scale,
          },
          {
            translateY: currentItem ? 0 : translateY,
          },
          {
            rotateZ: currentItem ? `${direction.value * rotateZ}deg` : "0deg",
          },
        ],
        opacity: index < maxVisibleItem + currentIndex ? 1 : opacity,
      };
    });

    return (
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            {
              zIndex: datalenght - index,
            },
            animatedStyle,
          ]}
        >
          {/* Background Image */}
          <Image
            source={{ uri: item.imageUrl }} // URL from Supabase
            style={styles.cardImage}
          />

          {/* Overlay Text */}
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardText}>{item.name}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    );
  };

  // --- --- ---

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
            {newData?.map((item, index) => {
              if (index > currentIndex + 3 || index < currentIndex) {
                return null;
              }
              return (
                <Card
                  key={item.id}
                  item={item}
                  index={index}
                  datalenght={newData.length}
                  maxVisibleItem={3}
                  currentIndex={currentIndex}
                  animatedValue={animatedValue}
                  setCurrentIndex={setCurrentIndex}
                />
              );
            })}
          </View>

          {/* Buttons which will be implemented later */}
          {/* <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.iconContainer}
              disabled={index >= meals.length}
            >
              <Ionicons name="close" size={40} color="#ff0a54" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconContainer}
              disabled={index >= meals.length}
            >
              <Ionicons name="heart" size={40} color="#ff0a54" />
            </TouchableOpacity>
          </View> */}
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
  gameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 28,
    overflow: "hidden", // important so image doesn't spill
    backgroundColor: "gray", // fallback color
  },

  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  cardTextContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
  },

  cardText: {
    textAlign: "center",
    color: "#ff0a54",
    fontSize: 24,
    fontWeight: "bold",
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
