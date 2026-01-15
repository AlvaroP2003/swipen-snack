import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  onFoodPress?: () => void;
  onUserPress?: () => void;
}

export function Header({ onFoodPress, onUserPress }: HeaderProps) {
  const router = useRouter();

  const handleFoodPress = () => {
    if (onFoodPress) {
      onFoodPress();
    } else {
      router.push('/(main)/preferences');
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress();
    } else {
      router.push('/(main)/profile');
    }
  };

  return (
    <View style={styles.container}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleFoodPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="restaurant" size={25} color="#ff0a54" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleUserPress}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={25} color="#ff0a54" />
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,

    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    padding: 10,
    backgroundColor:'white',
    borderRadius: 50,
  },
});
