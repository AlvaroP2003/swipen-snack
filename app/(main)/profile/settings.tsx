import ConfirmModal from "@/components/ConfirmModal";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }
      setUser(data.user);
    };
    fetchUser();
  }, []);

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      // ⚠️ For production, use a secure server-side function
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      router.replace("/(auth)"); // redirect after deletion
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/profile/edit")}
        >
          <Text style={styles.actionText}>Edit Profile</Text>
          <Ionicons name="create-outline" size={20} color="#646464" />
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={[styles.actionText, { color: "white" }]}>
            Delete Account
          </Text>
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* ConfirmModal for delete confirmation */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Confirm Account Deletion"
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
  container: { flex: 1 },
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
  deleteButton: {
    backgroundColor: "#ff0a54",
  },
});
