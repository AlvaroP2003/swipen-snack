import ResponseModal from '@/components/ResponseModal';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SignUpScreenProps {
  onToggleAuthMode: () => void;
}

export default function SignUpScreen({ onToggleAuthMode }: SignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  
  // Response Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'success' | 'info'>('info');  

   const [agreed, setAgreed] = useState(false);

    const openUrl = (url: string) => {
      Linking.openURL(url);
    };

  // Helper function to show response modal
  const showResponseModal = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // Validation helpers
  const isPasswordValid = password.length >= 8;
  const isConfirmPasswordValid = confirmPassword === password && confirmPassword.length > 0;
  const showPasswordError = passwordTouched && !isPasswordValid && password.length > 0;
  const showConfirmPasswordError = confirmPasswordTouched && !isConfirmPasswordValid && confirmPassword.length > 0;

  async function signUpWithEmail() {
    setLoading(true)
    const {
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options : {
        data : {
          full_name : name
        }
      }
    })

      if (error) {
      showResponseModal('Error', error.message, 'error')
    } else {
      showResponseModal(
        'Notice',
        'Check your inbox to confirm your email',
        'info',
      )
      onToggleAuthMode()
    }

    setLoading(false)
  }



  const togglePage = () => {
    onToggleAuthMode();
  };

  return (
    <>
      <Text style={styles.welcomeText}>Join The Team!</Text>
      <Text style={styles.subText}>Create your account to get started</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.passwordFieldWrapper}>
        {showPasswordError && (
          <Text style={styles.errorText}>Password must be at least 8 characters</Text>
        )}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[
            styles.passwordContainer, 
            showPasswordError && styles.errorBorder
          ]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Create a password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setPasswordTouched(true)}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.passwordFieldWrapper}>
        {showConfirmPasswordError && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[
            styles.passwordContainer, 
            showConfirmPasswordError && styles.errorBorder
          ]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm your password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setConfirmPasswordTouched(true)}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

        <View style={styles.container}>
          <Pressable style={styles.checkboxContainer} onPress={() => setAgreed(!agreed)}>
            <View style={[styles.checkbox, agreed && styles.checked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.label}>
              I agree to the{' '}
              <Text style={styles.link} onPress={() => openUrl('https://yourapp.com/terms')}>
                Terms & Conditions
              </Text>{' '}
              and{' '}
              <Text style={styles.link} onPress={() => openUrl('https://yourapp.com/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>
      </View>

      <TouchableOpacity 
        style={[styles.signUpButton, loading && styles.buttonDisabled]} 
        onPress={signUpWithEmail}
        disabled={loading || !agreed}
      >
        <Text style={styles.signUpButtonText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={togglePage}>
          <Text style={styles.loginLink}>Login</Text>
        </TouchableOpacity>
      </View>
      
      <ResponseModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff0a54',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color:'#171717'
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'transparent',
    color:'#171717'
  },
  eyeIcon: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBorder: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  passwordFieldWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  errorText: {
    position: 'absolute',
    top: 2,
    right: 0,
    color: '#ff4444',
    fontSize: 12,
    zIndex: 1,
  },
  signUpButton: {
    backgroundColor: '#ff0a54',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#ff0a54',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#ff0a54',
    fontWeight: 'bold',
  },
   container: { padding: 20 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: '#555',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    checked: {
      backgroundColor: '#ff0a54',
      borderColor: '#ff0a54',
    },
    checkmark: { color: 'white', fontWeight: 'bold' },
    label: { flex: 1, flexWrap: 'wrap' },
    link: { color: 'blue', textDecorationLine: 'underline' },
});