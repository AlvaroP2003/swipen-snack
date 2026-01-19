import ResponseModal from "@/components/ResponseModal";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PreferencesScreen() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("info");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState([
    {
      category: "General",
      options: [
        { name: "Vegan", active: false },
        { name: "Vegetarian", active: false },
        { name: "Pescetarian", active: false },
        { name: "Flexitarian", active: false },
      ],
    },
    {
      category: "Religious/Cultural",
      options: [
        { name: "Halal", active: false },
        { name: "Kosher", active: false },
        { name: "Jain", active: false },
        { name: "Rastafarian", active: false },
      ],
    },
    {
      category: "Allergy & Health",
      options: [
        { name: "Gluten-Free", active: false },
        { name: "Lactose-Free", active: false },
        { name: "Nut-Free", active: false },
        { name: "Low Carb/Keto", active: false },
        { name: "Diabetic-Friendly", active: false },
        { name: "Low FODMAP", active: false },
      ],
    },
  ]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.from("users").select("*");

        if (error) {
          throw error;
        }

        const savedPreferences = data[0]?.preferences || [];

        setPreferences((prev) =>
          prev.map((category) => ({
            ...category,
            options: category.options.map((option) => ({
              ...option,
              active: savedPreferences.includes(option?.name),
            })),
          })),
        );
      } catch (error) {
        console.error("Error loading preferences", error.message || error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const savePreferences = async () => {
    const prefPayload = preferences
      .flatMap((pref) => pref.options)
      .filter((opt) => opt.active)
      .map((opt) => opt.name);

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting user:", error.message);
      return;
    }

    const userId = data.user?.id;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("users")
        .update({ preferences: prefPayload })
        .eq("id", userId);

      if (error) {
        setModalTitle("Not quite!");
        setModalMessage(error.message);
        setModalType("error");
        setModalVisible(true);
        throw error;
      }

      setModalTitle("You know what you like!");
      setModalMessage("Your preferences have been saved successfully");
      setModalType("success");
      setModalVisible(true);
    } catch (error) {
      console.error(error.message || error);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle filter
  const toggleOption = (categoryIndex: number, optionIndex: number) => {
    const newPreferences = preferences.map((cat, cIdx) => ({
      ...cat,
      options: cat.options.map((opt, oIdx) => ({
        ...opt,
        active:
          cIdx === categoryIndex && oIdx === optionIndex
            ? !opt.active
            : opt.active,
      })),
    }));
    setPreferences(newPreferences);
  };

  // Clear all preferences
  const clearPreferences = () => {
    const cleared = preferences.map((cat) => ({
      ...cat,
      options: cat.options.map((opt) => ({ ...opt, active: false })),
    }));
    setPreferences(cleared);
  };

  const displayedOptions = preferences.map((item, catIndex) => (
    <View key={catIndex} style={{ marginBottom: 25 }}>
      <Text style={styles.category}>{item.category}</Text>
      <View style={styles.optionContainer}>
        {item.options.map((opt, optIndex) => (
          <TouchableOpacity
            key={optIndex}
            style={[
              styles.option,
              opt.active && styles.optionActive, // apply active style
            ]}
            onPress={() => toggleOption(catIndex, optIndex)}
          >
            <Text
              style={opt.active ? { color: "#fff" } : { color: "#202020ff" }}
            >
              {opt.name}
            </Text>
            <Ionicons
              name={opt.active ? "remove" : "add"}
              size={15}
              color={opt.active ? "#fff" : "black"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ));

  return (
    <View>
      <ScreenHeader title="Preferences" />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff0a54" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      ) : (
        <>
          <View style={{ padding: 16 }}>{displayedOptions}</View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={clearPreferences}
              style={[styles.button, isSaving && styles.buttonDisabled]}
              disabled={isSaving}
            >
              <Text style={{ color: "#ff0a54", fontWeight: "bold" }}>
                Clear Preferences
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={savePreferences}
              style={[styles.submitBtn, isSaving && styles.buttonDisabled]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={{ color: "#ffffff", fontWeight: "bold" }}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <ResponseModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => {
          setModalVisible(false);
          setTimeout(() => router.back(), 500);
        }}
        type={modalType}
        buttonText="OK"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  category: {
    fontSize: 18,
    color: "#ff0a54",
    fontWeight: "500",
    marginBottom: 12,
  },
  optionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    backgroundColor: "#e4e4e4",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 50,
  },
  optionActive: {
    backgroundColor: "#ff0a54",
    borderColor: "#ff0a54",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "row",
    marginHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#d3d3d3ff",
    justifyContent: "space-between",
  },
  button: {
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#ff0a54",
    borderRadius: 50,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 150,
  },
  submitBtn: {
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#ff0a54",
    backgroundColor: "#ff0a54",
    borderRadius: 50,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 150,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
