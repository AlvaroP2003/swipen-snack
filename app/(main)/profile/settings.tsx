import ConfirmModal from "@/components/ConfirmModal";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

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

  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationEnabled(status === "granted");
      } catch (error) {
        console.error("Error checking location permission:", error);
      } finally {
        setCheckingPermission(false);
      }
    };
    checkLocationPermission();
  }, []);

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      // User wants to enable location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          setLocationEnabled(true);
          Alert.alert(
            "Location Enabled",
            "Location services have been enabled successfully.",
          );
        } else {
          setLocationEnabled(false);
          Alert.alert(
            "Permission Denied",
            "Location permission was denied. You can enable it in your device settings.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => Location.enableNetworkProviderAsync(),
              },
            ],
          );
        }
      } catch (error) {
        console.error("Error requesting location permission:", error);
        setLocationEnabled(false);
        Alert.alert(
          "Error",
          "Failed to request location permission. Please try again.",
        );
      }
    } else {
      // User wants to disable location
      Alert.alert(
        "Disable Location",
        "To disable location access, please go to your device settings.",
        [{ text: "OK", style: "default" }],
      );
    }
  };

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
        {/* Location Services Toggle */}
        <View style={styles.locationContainer}>
          <View style={styles.locationTextContainer}>
            <Ionicons
              name="location-outline"
              size={24}
              color="#ff0a54"
              style={styles.locationIcon}
            />
            <View>
              <Text style={styles.locationTitle}>Location Services</Text>
              <Text style={styles.locationSubtext}>
                {locationEnabled
                  ? "Enabled for nearby restaurants"
                  : "Enable to find nearby restaurants"}
              </Text>
            </View>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: "#d1d1d1", true: "#ffb3c9" }}
            thumbColor={locationEnabled ? "#ff0a54" : "#f4f3f4"}
            disabled={checkingPermission}
          />
        </View>

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
  locationContainer: {
    backgroundColor: "#e4e4e4",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationIcon: {
    marginRight: 15,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#646464",
    marginBottom: 2,
  },
  locationSubtext: {
    fontSize: 12,
    color: "#999",
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
