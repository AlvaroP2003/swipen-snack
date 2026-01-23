import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface Restaurant {
  id: number;
  name: string;
  address: string;
  distance: string;
  rating: number;
  image: any;
}

interface Meal {
  id: number;
  name: string;
  image: string;
  characteristics: string[];
}

interface MatchResult {
  meal: Meal;
  sharedCharacteristics: string[];
  imageUrl: string | any;
  score: number;
  matchCount: number;
}

// Mock restaurant data
const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "The Italian Corner",
    address: "123 Main St, Cape Town",
    distance: "0.5 km",
    rating: 4.5,
    image: require("../../assets/images/image-fallback.png"),
  },
  {
    id: 2,
    name: "Spice Route",
    address: "456 Long St, Cape Town",
    distance: "1.2 km",
    rating: 4.8,
    image: require("../../assets/images/image-fallback.png"),
  },
  {
    id: 3,
    name: "Ocean Basket",
    address: "789 Waterfront, Cape Town",
    distance: "2.0 km",
    rating: 4.2,
    image: require("../../assets/images/image-fallback.png"),
  },
  {
    id: 4,
    name: "Burger Bliss",
    address: "321 Kloof St, Cape Town",
    distance: "0.8 km",
    rating: 4.6,
    image: require("../../assets/images/image-fallback.png"),
  },
  {
    id: 5,
    name: "Sushi Express",
    address: "654 Sea Point, Cape Town",
    distance: "1.5 km",
    rating: 4.7,
    image: require("../../assets/images/image-fallback.png"),
  },
];

export default function ResultScreen() {
  const [modalExpanded, setModalExpanded] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { roomId } = useLocalSearchParams();
  const slideAnim = useRef(new Animated.Value(height - 80)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchSwipes = async () => {
      try {
        setLoading(true);

        // 1️⃣ Fetch all "like" swipes for the room with their meals
        const { data: swipesData, error: swipesError } = await supabase
          .from("swipes")
          .select(
            `
              id,
              participant_id,
              action,
              meal_id,
              meals:meal_id (
                id,
                name,
                characteristics,
                image
              )
            `,
          )
          .eq("action", "like");

        if (swipesError) throw swipesError;

        // 2️⃣ Get participants in this room
        const { data: participantsData, error: participantsError } =
          await supabase
            .from("participants")
            .select("id, user_id")
            .eq("room_id", roomId);

        if (participantsError) throw participantsError;

        const participantIds = participantsData.map((p) => p.id);

        // 3️⃣ Filter swipes to only include participants from this room
        const roomSwipes = swipesData.filter((swipe) =>
          participantIds.includes(swipe.participant_id),
        );

        if (roomSwipes.length === 0) {
          console.log("No swipes found for this room");
          setLoading(false);
          return;
        }

        // 4️⃣ Get current user
        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;

        if (!currentUserId) {
          setLoading(false);
          return;
        }

        // 5️⃣ Group swipes by meal_id and calculate matches
        const mealMap = new Map<
          number,
          {
            meal: Meal;
            likedBy: Set<string>;
            characteristicsByUser: Map<string, string[]>;
          }
        >();

        roomSwipes.forEach((swipe) => {
          if (!swipe.meals) return;

          const mealId = swipe.meal_id;

          if (!mealMap.has(mealId)) {
            mealMap.set(mealId, {
              meal: swipe.meals as Meal,
              likedBy: new Set(),
              characteristicsByUser: new Map(),
            });
          }

          const mealData = mealMap.get(mealId)!;
          mealData.likedBy.add(swipe.participant_id);
          mealData.characteristicsByUser.set(
            swipe.participant_id,
            swipe.meals.characteristics || [],
          );
        });

        // 6️⃣ Calculate matching scores for each meal
        const matches: MatchResult[] = [];

        mealMap.forEach((mealData, mealId) => {
          const { meal, likedBy, characteristicsByUser } = mealData;

          // Only consider meals liked by at least 2 people (indicating a match)
          if (likedBy.size < 2) return;

          // Calculate shared characteristics across all users who liked this meal
          const allCharacteristics = Array.from(characteristicsByUser.values());
          const sharedCharacteristics =
            findCommonCharacteristics(allCharacteristics);

          // Calculate score based on:
          // 1. Number of shared characteristics (weight: 3)
          // 2. Number of users who liked it (weight: 2)
          // 3. Bonus for unanimous likes (weight: 1)
          const characteristicsScore = sharedCharacteristics.length * 3;
          const matchCountScore = likedBy.size * 2;
          const unanimousBonus = likedBy.size === participantIds.length ? 5 : 0;

          const totalScore =
            characteristicsScore + matchCountScore + unanimousBonus;

          // Get image URL
          const imageUrl = meal.image
            ? supabase.storage.from("meal_images").getPublicUrl(meal.image).data
                .publicUrl
            : require("../../assets/images/image-fallback.png");

          matches.push({
            meal,
            sharedCharacteristics,
            imageUrl,
            score: totalScore,
            matchCount: likedBy.size,
          });
        });

        // 7️⃣ Sort by score and take top 3
        const topMatches = matches
          .sort((a, b) => {
            // Primary sort by score
            if (b.score !== a.score) return b.score - a.score;
            // Secondary sort by number of matches
            if (b.matchCount !== a.matchCount)
              return b.matchCount - a.matchCount;
            // Tertiary sort by number of shared characteristics
            return (
              b.sharedCharacteristics.length - a.sharedCharacteristics.length
            );
          })
          .slice(0, 3);

        setMatchResults(topMatches);

        if (topMatches.length === 0) {
          console.log("No compatible matches found");
        }
      } catch (err: any) {
        console.error("Error fetching matches:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSwipes();
  }, [roomId]);

  // Helper function to find characteristics common across multiple arrays
  const findCommonCharacteristics = (
    characteristicArrays: string[][],
  ): string[] => {
    if (characteristicArrays.length === 0) return [];
    if (characteristicArrays.length === 1) return characteristicArrays[0];

    // Count occurrences of each characteristic
    const characteristicCounts = new Map<string, number>();

    characteristicArrays.forEach((chars) => {
      const uniqueChars = new Set(chars);
      uniqueChars.forEach((char) => {
        characteristicCounts.set(
          char,
          (characteristicCounts.get(char) || 0) + 1,
        );
      });
    });

    // Find characteristics that appear in at least 2 users' lists
    const minOccurrences = Math.min(2, characteristicArrays.length);
    const commonChars = Array.from(characteristicCounts.entries())
      .filter(([_, count]) => count >= minOccurrences)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([char, _]) => char);

    return commonChars;
  };

  const toggleModal = () => {
    const toValue = modalExpanded ? height - 80 : height * 0.3;
    setModalExpanded(!modalExpanded);

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: false,
    }).start();
  };

  const renderCard = ({
    item,
    index,
  }: {
    item: MatchResult;
    index: number;
  }) => {
    const imageSource =
      typeof item.imageUrl === "string"
        ? { uri: item.imageUrl }
        : item.imageUrl;

    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={imageSource}
            style={styles.cardImage}
            defaultSource={require("../../assets/images/image-fallback.png")}
          />
          <View style={styles.nameContainer}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <Text style={styles.cardName}>{item.meal.name}</Text>
            {item.sharedCharacteristics.length > 0 && (
              <Text style={styles.characteristicsText}>
                {item.sharedCharacteristics.join(", ")}
              </Text>
            )}
            <Text style={styles.matchCountText}>
              {item.matchCount} {item.matchCount === 1 ? "person" : "people"}{" "}
              liked this
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        style={styles.image}
        source={require("../../assets/images/banner-icon.png")}
        resizeMode="contain"
      />

      {!loading && matchResults.length > 0 && (
        <Text style={styles.title}>
          Based on your results, here are your top matches
        </Text>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Finding your matches...</Text>
        </View>
      ) : matchResults.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={matchResults}
          renderItem={renderCard}
          keyExtractor={(item) => item.meal.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.85}
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          pagingEnabled={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.noMatchText}>No match found</Text>
          <Text style={styles.noMatchSubtext}>Try swiping on more meals!</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.push("/")}
      >
        <Text style={styles.homeButtonText}>Return Home</Text>
      </TouchableOpacity>

      {/* Places Near Me Modal */}
      <Animated.View style={[styles.modal, { top: slideAnim }]}>
        <TouchableOpacity style={styles.modalHeader} onPress={toggleModal}>
          <Ionicons name="location" size={20} color="#ff0a54" />
          <Text style={styles.modalTitle}>Places near me</Text>
          <Ionicons
            name={modalExpanded ? "chevron-down" : "chevron-up"}
            size={20}
            color="#ff0a54"
          />
        </TouchableOpacity>

        {modalExpanded && (
          <ScrollView style={styles.modalContent}>
            {restaurants.map((restaurant) => (
              <View key={restaurant.id} style={styles.restaurantItem}>
                <Image
                  source={restaurant.image}
                  style={styles.restaurantImage}
                />
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <View style={styles.addressRow}>
                    <Text style={styles.restaurantAddress}>
                      {restaurant.address}
                    </Text>
                    <Text style={styles.dot}> • </Text>
                    <Text style={styles.restaurantDistance}>
                      {restaurant.distance}
                    </Text>
                  </View>
                  <View style={styles.ratingRow}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={
                          i < Math.floor(restaurant.rating)
                            ? "star"
                            : "star-outline"
                        }
                        size={14}
                        color="#ff0a54"
                      />
                    ))}
                    <Text style={styles.ratingText}>{restaurant.rating}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#ff0a54",
  },
  image: {
    marginTop: 10,
    width: 380,
    height: height * 0.1,
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flatListContent: {
    paddingHorizontal: width * 0.075,
    paddingTop: 30,
  },
  cardContainer: {
    width: width * 0.85,
    marginRight: 10,
  },
  card: {
    width: "100%",
    height: 400,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "white",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  nameContainer: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  rankBadge: {
    position: "absolute",
    top: -30,
    right: 10,
    backgroundColor: "#ff0a54",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardName: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#ff0a54",
    textAlign: "center",
    marginBottom: 5,
  },
  characteristicsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 5,
  },
  matchCountText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "white",
    fontWeight: "500",
  },
  noMatchText: {
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
    marginBottom: 10,
  },
  noMatchSubtext: {
    fontSize: 14,
    color: "white",
  },
  homeButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 20,
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.8,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff0a54",
    flex: 1,
    marginLeft: 10,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  restaurantItem: {
    flexDirection: "row",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: "center",
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff0a54",
    marginBottom: 5,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  restaurantAddress: {
    fontSize: 12,
    color: "#666",
  },
  dot: {
    fontSize: 12,
    color: "#666",
  },
  restaurantDistance: {
    fontSize: 12,
    color: "#666",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#ff0a54",
    marginLeft: 5,
    fontWeight: "bold",
  },
});
