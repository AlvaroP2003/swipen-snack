import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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
  imageUrl: string | any; // Can be string URL or require() object
  score: number;
}

export default function ResultScreen() {
  const [modalExpanded, setModalExpanded] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { roomId } = useLocalSearchParams();
  const slideAnim = useRef(new Animated.Value(height - 80)).current;
  const flatListRef = useRef<FlatList>(null);

  const restaurants: Restaurant[] = [
    {
      id: 1,
      name: "Mario's Pizzeria",
      address: "123 Main St",
      distance: "0.5 km",
      rating: 4.5,
      image: require("../../assets/images/image-fallback.png"),
    },
    {
      id: 2,
      name: "Pasta Palace",
      address: "456 Oak Ave",
      distance: "1.2 km",
      rating: 4.8,
      image: require("../../assets/images/image-fallback.png"),
    },
    {
      id: 3,
      name: "Burger Barn",
      address: "789 Pine Rd",
      distance: "2.1 km",
      rating: 4.2,
      image: require("../../assets/images/image-fallback.png"),
    },
  ];

  useEffect(() => {
    const fetchSwipes = async () => {
      try {
        setLoading(true);

        // 🧪 MOCK DATA FOR TESTING - Remove this section when ready to use real data
        const useMockData = true; // Set to false to use real Supabase data

        if (useMockData) {
          // Simulate loading delay
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const mockResults: MatchResult[] = [
            {
              meal: {
                id: 1,
                name: "Margherita Pizza",
                image: "../../assets/images/image-fallback.png",
                characteristics: ["Italian", "Cheesy", "Vegetarian", "Classic"],
              },
              sharedCharacteristics: ["Italian", "Cheesy", "Vegetarian"],
              imageUrl: require("../../assets/images/image-fallback.png"),
              score: 3,
            },
            {
              meal: {
                id: 2,
                name: "Chicken Teriyaki Bowl",
                image: "../../assets/images/image-fallback.png",
                characteristics: [
                  "Asian",
                  "Savory",
                  "Protein-rich",
                  "Rice-based",
                ],
              },
              sharedCharacteristics: ["Asian", "Savory"],
              imageUrl: require("../../assets/images/image-fallback.png"),
              score: 2,
            },
            {
              meal: {
                id: 3,
                name: "Caesar Salad",
                image: "../../assets/images/image-fallback.png",
                characteristics: ["Fresh", "Light", "Crispy", "Classic"],
              },
              sharedCharacteristics: ["Fresh", "Light"],
              imageUrl: require("../../assets/images/image-fallback.png"),
              score: 2,
            },
          ];

          setMatchResults(mockResults);
          setLoading(false);
          return;
        }
        // 🧪 END MOCK DATA

        // 1️⃣ Fetch all "like" swipes for the room with their meals
        const { data, error } = await supabase
          .from("swipes")
          .select(
            `
              id,
              participant_id,
              action,
              participant:participant_id (
                room_id
              ),
              meals:meal_id (
                id,
                name,
                characteristics,
                image
              )
            `,
          )
          .eq("action", "like")
          .eq("participant.room_id", roomId);

        if (error) throw error;

        // 2️⃣ Get logged-in user
        const { data: userData } = await supabase.auth.getUser();

        const user = userData?.user;

        if (!user) return;

        // 3️⃣ Separate your swipes from participant swipes
        const myItems = data.filter((item) => item.participant_id === user.id);
        const participantItems = data.filter(
          (item) => item.participant_id !== user.id,
        );

        if (myItems.length === 0 || participantItems.length === 0) {
          console.log("No match found - insufficient swipes");
          return;
        }

        // 4️⃣ Function to compute characteristic overlap
        const getOverlap = (a: string[], b: string[]) => {
          if (!a || !b) return [];
          return a.filter((x) => b.includes(x));
        };

        // 5️⃣ Collect all matches with scores
        const allMatches: Map<number, MatchResult> = new Map();

        myItems.forEach((my) => {
          participantItems.forEach((their) => {
            const shared = getOverlap(
              my.meals.characteristics || [],
              their.meals.characteristics || [],
            );

            if (shared.length > 0) {
              const mealId = my.meals.id;

              // If we already have this meal, only update if this has a better score
              if (
                !allMatches.has(mealId) ||
                allMatches.get(mealId)!.score < shared.length
              ) {
                const { data: urlData } = supabase.storage
                  .from("meal_images")
                  .getPublicUrl(my.meals.image);

                allMatches.set(mealId, {
                  meal: my.meals,
                  sharedCharacteristics: shared,
                  imageUrl: urlData?.publicUrl || "",
                  score: shared.length,
                });
              }
            }
          });
        });

        // 6️⃣ Sort by score and take top 3
        const sortedMatches = Array.from(allMatches.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        setMatchResults(sortedMatches);

        if (sortedMatches.length === 0) {
          console.log("No compatible match found");
        }
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSwipes();
  }, []);

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
    // Handle both URI strings and require() objects for images
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
            <Text style={styles.characteristicsText}>
              {item.sharedCharacteristics.join(", ")}
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

      <Text style={styles.title}>
        {matchResults.length > 0
          ? "Based on your results, here are your top matches"
          : "Based on your results, we think you'll like this"}
      </Text>

      {loading ? (
        <View style={styles.card}>
          <Text style={styles.loadingText}>Finding your matches...</Text>
        </View>
      ) : matchResults.length > 0 ? (
        <>
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
          {matchResults.length > 1 && (
            <View style={styles.dotsContainer}>
              {matchResults.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === 0 && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.card}>
          <View style={styles.noMatchContainer}>
            <Text style={styles.noMatchText}>No match found</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.push("/")}
      >
        <Text style={styles.homeButtonText}>Return Home</Text>
      </TouchableOpacity>

      {/* GOOGLE PLACES API WHICH WILL BE IMPLEMENTED LATER */}
      {/* <Animated.View style={[styles.modal, { top: slideAnim }]}>
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
                    <Image source={restaurant.image} style={styles.restaurantImage} />
                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName}>{restaurant.name}</Text>
                      <View style={styles.addressRow}>
                        <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                        <Text style={styles.dot}> • </Text>
                        <Text style={styles.restaurantDistance}>{restaurant.distance}</Text>
                      </View>
                      <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < Math.floor(restaurant.rating) ? "star" : "star-outline"}
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
          </Animated.View> */}
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
    marginTop: 30,
    width: 300,
    height: 100,
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
  flatListContent: {
    paddingHorizontal: width * 0.075,
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
  nameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 10,
    paddingHorizontal: 15,
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
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  loadingText: {
    fontSize: 18,
    color: "#ff0a54",
    textAlign: "center",
    marginTop: 180,
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noMatchText: {
    fontSize: 20,
    color: "#ff0a54",
    fontWeight: "bold",
  },
  homeButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#fff",
    marginTop: 10,
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
    height: height * 0.9,
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
