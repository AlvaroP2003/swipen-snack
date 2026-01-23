import ResponseModal from "@/components/ResponseModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const router = useRouter();

  // Response Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"error" | "success" | "info">(
    "info",
  );

  // Helper function to show response modal
  const showResponseModal = (
    title: string,
    message: string,
    type: "error" | "success" | "info" = "info",
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  async function resetPassword() {
    if (!email) {
      showResponseModal("Error", "Please enter your email address", "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "com.swipensnack://reset_password",
    });

    if (error) {
      showResponseModal("Error", error.message, "error");
      setLoading(false);
      return;
    }

    showResponseModal(
      "Success",
      "Password reset link has been sent to your email",
      "success",
    );
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Forgot Password?</Text>
          <Text style={styles.subText}>
            Enter your email and we'll send you a link to reset your password
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="Enter your email"
              autoCapitalize="none"
              placeholderTextColor="#999"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, loading && styles.buttonDisabled]}
            disabled={loading}
            onPress={resetPassword}
          >
            <Text style={styles.resetButtonText}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ResponseModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ff0a54", // Hot pink background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formCard: {
    backgroundColor: "#ffffff", // White background for form
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    padding: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ff0a54",
    textAlign: "center",
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#171717",
  },
  inputFocused: {
    borderColor: "#ff0a54",
    borderWidth: 2,
  },
  resetButton: {
    backgroundColor: "#ff0a54",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    shadowColor: "#ff0a54",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 16,
    color: "#666",
  },
  loginLink: {
    fontSize: 16,
    color: "#ff0a54",
    fontWeight: "bold",
  },
});
