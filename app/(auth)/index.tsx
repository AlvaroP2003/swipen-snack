import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import LoginScreen from './login';
import SignUpScreen from './sign_up';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Animation state
  const containerHeight = useRef(new Animated.Value(0.6)).current; // Start with login height
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animate container height when switching between login/signup
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(containerHeight, {
        toValue: isLogin ? 0.6 : 1, // Login uses less height, signup uses more
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });
  }, [isLogin]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        <Image
          style={styles.banner}
          source={require("../../assets/images/banner-icon.png")}
          resizeMode='contain'
        />
        <ScrollView style={styles.formContainer}>
           {isLogin ? (
            <LoginScreen onToggleAuthMode={() => setIsLogin(false)} />
            ) : (
              <SignUpScreen onToggleAuthMode={() => setIsLogin(true)} />
            )}
        </ScrollView>
         
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection:'column',
    justifyContent:'flex-end',
    backgroundColor: '#ff0a54',
  },
  banner: {
    width: 375,
    height: 100,
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopRightRadius: 50,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom:60,
  },
  formContent: {
    flex: 1,
  },
});