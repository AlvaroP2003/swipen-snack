import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
const OFFSCREEN = width * 1.5;

export default function GameScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [index, setIndex] = useState(0);

  const translateX = useSharedValue(0);
  const nextCardScale = useSharedValue(0.95);
  const nextCardTranslateY = useSharedValue(10);

  // Fetch meals on mount
  useEffect(() => {
    const fetchMeals = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const userPreferences = userData?.preferences || [];

        const { data: allMeals } = await supabase.from('meals').select('*');

        const filteredMeals = allMeals?.filter((meal: any) => {
          const mealPreferences = meal.preferences || [];
          if (!userPreferences.length) return true;
          if (!mealPreferences.length) return true;
          return mealPreferences.some((p: string) => userPreferences.includes(p));
        }) || [];

        const mealsWithUrls = filteredMeals.map((meal: any) => {
          const { data: urlData } = supabase.storage
            .from('meal_images')
            .getPublicUrl(meal.image);
          return { ...meal, imageUrl: urlData?.publicUrl || '' };
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



  // Helper functions for buttons
  const swipeLeftAnimated = () => {
    translateX.value = withSpring(-OFFSCREEN, {}, () => runOnJS(swipeLeft)());
    };

  const swipeRightAnimated = () => {
      translateX.value = withSpring(OFFSCREEN, {}, () => runOnJS(swipeRight)());
    };


  // Swipe handlers
  const swipeLeft = () => {
    if (index < meals.length - 1) {
      recordSwipe(meals[index], 'disliked');
      setIndex(index + 1);
    } else {
      recordSwipe(meals[index], 'disliked');
      setIndex(meals.length);
      runOnJS(onSwipedAll)();
    }
    resetCardAnimation();
  };

  const swipeRight = () => {
    if (index < meals.length - 1) {
      recordSwipe(meals[index], 'like');
      setIndex(index + 1);
    } else {
      recordSwipe(meals[index], 'like');
      setIndex(meals.length);
      runOnJS(onSwipedAll)();
    }
    resetCardAnimation();
  };

  const recordSwipe = async (meal: any, action: 'like' | 'disliked') => {
    if (!meal) return;
    try {
      await supabase.from('swipes').insert({ meal_id: meal.id, action });
    } catch (err) {
      console.error(err);
    }
  };

  const resetCardAnimation = () => {
    translateX.value = 0;
    nextCardScale.value = 0.95;
    nextCardTranslateY.value = 10;
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      const progress = Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1);
      nextCardScale.value = 0.95 + 0.05 * progress;
      nextCardTranslateY.value = 10 - 10 * progress;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(OFFSCREEN, {}, () => runOnJS(swipeRight)());
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-OFFSCREEN, {}, () => runOnJS(swipeLeft)());
      } else {
        translateX.value = withSpring(0);
        nextCardScale.value = withSpring(0.95);
        nextCardTranslateY.value = withSpring(10);
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('participants').update({ status: 'waiting' }).eq('id', user.id);

    router.replace({
      pathname: '/waitingScreen',
      params: { roomId },
    });
  };

  const currentMeal = meals[index];
  const nextMeal = index < meals.length - 1 ? meals[index + 1] : null;

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("../../assets/images/banner-icon.png")}
        resizeMode="contain"
      />

      <View style={styles.gameContainer}>
        {meals.slice(index + 1, index + 3).reverse().map((meal, i) => {

          return (
            <Animated.View
              key={meal.id}
              style={[
                styles.card,
                styles.cardBehind,
              ]}
            >
              <Image source={{ uri: meal.imageUrl }} style={styles.cardImage} />
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{meal.name}</Text>
              </View>
            </Animated.View>
          );
          })}

        {/* Top swipeable card */}
        {currentMeal && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.card, styles.cardTop, topCardStyle]}>
              <Image source={{ uri: currentMeal.imageUrl }} style={styles.cardImage} />
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{currentMeal.name}</Text>
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>


      <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.iconContainer} onPress={swipeLeftAnimated}>
        <Ionicons name="close" size={40} color="#ff0a54" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconContainer} onPress={() => setShowExitModal(true)}>
        <Ionicons name="ban" size={40} color="#ff0a54" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconContainer} onPress={swipeRightAnimated}>
        <Ionicons name="heart" size={40} color="#ff0a54" />
      </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:'relative',
    flex: 1,
    backgroundColor: '#ff0a54',
  },
  image: {
    marginTop: 20,
    width: 380,
    height: height * 0.1,
    alignSelf:'center',
  },
    gameContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  card: {
    height: height * 0.70,
    width: width * 0.90,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  cardBehind: {
  zIndex: 1,
  position: 'absolute',
  top: 0,
  bottom: 0,
  borderRadius: 20,
  backgroundColor: '#fff',
  },
  cardTop: {
    zIndex: 2,
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  nameContainer: {
    backgroundColor: 'white',
    height: '10%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  name: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#ff0a54',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 50,
  },
  buttonContainer: {
    position:'absolute',
    bottom: 75,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    backgroundColor: 'white',
    height: 60,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
});
