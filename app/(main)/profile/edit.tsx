import ResponseModal from "@/components/ResponseModal"; // import your modal
import ScreenHeader from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function EditProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"info" | "error">("info");

  // Fetch current user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }

      const user = data.user;
      setUser(user);
      setFullName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
    };

    fetchUser();
  }, []);

  // Handle Save
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const { data: userUpdate, error: metaError } =
      await supabase.auth.updateUser({
        email: email,
        data: { full_name: fullName },
      });

    setLoading(false);

    if (metaError) {
      // Show error modal
      setModalTitle("Error");
      setModalMessage(metaError.message);
      setModalType("error");
      setModalVisible(true);
      return;
    }

    // Show success modal
    setModalTitle("New year New you");
    setModalMessage("Profile updated successfully!");
    setModalType("success");
    setModalVisible(true);
  };

  if (!user) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Profile" />

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholder="Enter your full name"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: "#ff0a54", marginTop: 20 },
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={[styles.actionText, { color: "white" }]}>
            {loading ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Response Modal */}
      <ResponseModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => {
          setModalVisible(false);
          if (modalType === "info") router.back(); // close modal and go back on success
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 20, gap: 15 },
  label: { fontSize: 14, fontWeight: "500", color: "#646464" },
  input: {
    backgroundColor: "#e4e4e4",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    color: "#333",
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { fontSize: 16, fontWeight: "500" },
});
