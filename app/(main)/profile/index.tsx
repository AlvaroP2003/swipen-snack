import ConfirmModal from "@/components/ConfirmModal";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [initials, setInitials] = useState("U");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error fetching user:", error.message);
          return;
        }

        const user = data.user;
        setUser(user);

        const fullName = user.user_metadata?.full_name || "";
        const nameParts = fullName.split(" ");
        const initials = (nameParts[0]?.[0] || "") + (nameParts[1]?.[0] || "");
        setInitials(initials.toUpperCase());
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.replace("/(auth)");
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      // ⚠️ Use a secure server-side function in production
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      router.replace("/(auth)");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff0a54" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          {/* Avatar & User Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.fullName}>{user.user_metadata.full_name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>

          {/* Profile Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/profile/edit")}
            >
              <Text style={styles.actionText}>Edit Profile</Text>
              <Ionicons name="create-outline" size={20} color="#646464" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/profile/settings")}
            >
              <Text style={styles.actionText}>Settings</Text>
              <Ionicons name="cog" size={20} color="#646464" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL("https://yourdomain.com/privacy")}
            >
              <Text style={styles.actionText}>Privacy Policy</Text>
              <Ionicons name="lock-closed-outline" size={20} color="#646464" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL("https://yourdomain.com/terms")}
            >
              <Text style={styles.actionText}>Terms & Conditions</Text>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#646464"
              />
            </TouchableOpacity>

            {/* Logout – outlined */}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setShowLogoutModal(true)}
            >
              <Text style={styles.deleteText}>Logout</Text>
              <Ionicons name="log-out-outline" size={20} color="#ff0a54" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <ConfirmModal
        visible={showLogoutModal}
        title="Bye, I guess"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Are you sure about that?"
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#646464",
  },
  userInfo: {
    alignItems: "center",
    marginVertical: 30,
  },
  avatarContainer: {
    backgroundColor: "#ff0a54",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
  },
  fullName: {
    fontWeight: "bold",
    fontSize: 18,
  },
  email: {
    color: "gray",
    fontStyle: "italic",
  },
  actions: {
    padding: 20,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#e4e4e4",
    paddingVertical: 15,
    borderRadius: 10,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#646464",
  },
  logoutButton: {
    backgroundColor: "#ff0a54",
  },
  deleteButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#ff0a54",
  },
  deleteText: {
    color: "#ff0a54",
    fontSize: 16,
    fontWeight: "500",
  },
});
