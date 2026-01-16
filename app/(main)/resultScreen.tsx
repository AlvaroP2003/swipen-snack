import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

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
  imageUrl: string;
}

export default function ResultScreen() {
    const [modalExpanded, setModalExpanded] = useState(false);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const {roomId} = useLocalSearchParams();
    const slideAnim = useRef(new Animated.Value(height - 80)).current;

    const restaurants: Restaurant[] = [
      {
        id: 1,
        name: "Mario's Pizzeria",
        address: "123 Main St",
        distance: "0.5 km",
        rating: 4.5,
        image: require('../../assets/images/image-fallback.png')
      },
      {
        id: 2,
        name: "Pasta Palace",
        address: "456 Oak Ave",
        distance: "1.2 km",
        rating: 4.8,
        image: require('../../assets/images/image-fallback.png')
      },
      {
        id: 3,
        name: "Burger Barn",
        address: "789 Pine Rd",
        distance: "2.1 km",
        rating: 4.2,
        image: require('../../assets/images/image-fallback.png')
      }
    ];


    useEffect(() => {
      const fetchSwipes = async () => {
        try {
          setLoading(true);

          // 1️⃣ Fetch all "like" swipes for the room with their meals
           const { data, error } = await supabase
            .from('swipes')
            .select(`
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
            `)
            .eq('action', 'like')
            .eq('participant.room_id', roomId); // filter via participant

          if (error) throw error;

          // 2️⃣ Get logged-in user
          const { data: userData } = await supabase.auth.getUser();
          
          const user = userData?.user;

          if (!user) return;

          // 3️⃣ Separate your swipes from participant swipes
          const myItems = data.filter(item => item.participant_id === user.id);
          const participantItems = data.filter(item => item.participant_id !== user.id);

          if (myItems.length === 0 || participantItems.length === 0) {
            console.log("No match found - insufficient swipes");
            return;
          }

          // 4️⃣ Function to compute characteristic overlap
          const getOverlap = (a: string[], b: string[]) => {
            if (!a || !b) return [];
            return a.filter(x => b.includes(x));
          };

          // 5️⃣ Compare every combination to find best overlapping match
          let bestMatch = null;
          let bestScore = 0;

          myItems.forEach(my => {
            participantItems.forEach(their => {
              const shared = getOverlap(
                my.meals.characteristics || [],
                their.meals.characteristics || []
              );

              if (shared.length > bestScore) {
                bestScore = shared.length;
                bestMatch = {
                  myMeal: my.meals,
                  theirMeal: their.meals,
                  shared,
                };
              }
            });
          });

          // 6️⃣ Update UI with matched meal
          if (bestMatch && bestScore > 0) {
            // Use the meal with more matching characteristics (or pick one)
            const selectedMeal = bestMatch.myMeal;
            
            // Get public URL for the meal image
            const { data: urlData } = supabase
              .storage
              .from('meal_images')
              .getPublicUrl(selectedMeal.image);

            setMatchResult({
              meal: selectedMeal,
              sharedCharacteristics: bestMatch.shared,
              imageUrl: urlData?.publicUrl || ''
            });
          } else {
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


    return (
        <View style={styles.container}>
          <Image
                  style={styles.image}
                  source={require("../../assets/images/banner-icon.png")}
                  resizeMode='contain'
                />
          
          <Text style={styles.title}>
            Based on your results, we think you'll like this
          </Text>

          {loading ? (
            <View style={styles.card}>
              <Text style={styles.loadingText}>Finding your match...</Text>
            </View>
          ) : matchResult ? (
            <View style={styles.card}>
              <Image
                source={{ uri: matchResult.imageUrl }}
                style={styles.cardImage}
                defaultSource={require('../../assets/images/image-fallback.png')}
              />
              <View style={styles.nameContainer}>
                <Text style={styles.cardName}>{matchResult.meal.name}</Text>
                <Text style={styles.characteristicsText}>
                  {matchResult.sharedCharacteristics.join(", ")}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.noMatchContainer}>
                <Text style={styles.noMatchText}>No match found</Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => router.push('/')}
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
        </View>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ff0a54',
  },
  image: {
    marginTop: 30,
    width: 300,
    height: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  card: {
    width: width * 0.8,
    height: 400,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
    backgroundColor: 'white',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  nameContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#ff0a54',
    textAlign: 'center',
    marginBottom: 5,
  },
  characteristicsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 18,
    color: '#ff0a54',
    textAlign: 'center',
    marginTop: 180,
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMatchText: {
    fontSize: 20,
    color: '#ff0a54',
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.9,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff0a54',
    flex: 1,
    marginLeft: 10,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  restaurantItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff0a54',
    marginBottom: 5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#666',
  },
  dot: {
    fontSize: 14,
    color: '#666',
  },
  restaurantDistance: {
    fontSize: 12,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#ff0a54',
    marginLeft: 5,
    fontWeight: 'bold',
  },
})