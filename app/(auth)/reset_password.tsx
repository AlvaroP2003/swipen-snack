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

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
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

  async function handleResetPassword() {
    if (!password || !confirmPassword) {
      showResponseModal("Error", "Please fill in all fields", "error");
      return;
    }

    if (password.length < 6) {
      showResponseModal(
        "Error",
        "Password must be at least 6 characters long",
        "error",
      );
      return;
    }

    if (password !== confirmPassword) {
      showResponseModal("Error", "Passwords do not match", "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      showResponseModal("Error", error.message, "error");
      setLoading(false);
      return;
    }

    showResponseModal(
      "Success",
      "Your password has been reset successfully",
      "success",
    );
    setLoading(false);

    // Navigate to login after successful reset
    setTimeout(() => {
      router.replace("/login");
    }, 2000);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>Reset Password</Text>
          <Text style={styles.subText}>
            Please enter your new password below
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              onChangeText={(text) => setPassword(text)}
              value={password}
              placeholder="Enter new password"
              autoCapitalize="none"
              placeholderTextColor="#999"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={[
                styles.input,
                confirmPasswordFocused && styles.inputFocused,
              ]}
              onChangeText={(text) => setConfirmPassword(text)}
              value={confirmPassword}
              placeholder="Confirm new password"
              autoCapitalize="none"
              placeholderTextColor="#999"
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, loading && styles.buttonDisabled]}
            disabled={loading}
            onPress={handleResetPassword}
          >
            <Text style={styles.resetButtonText}>
              {loading ? "Resetting..." : "Reset Password"}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
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
