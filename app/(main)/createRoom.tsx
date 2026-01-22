import ResponseModal from "@/components/ResponseModal";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function JoinRoomScreen() {
  const router = useRouter();
  const [uniqueCode, setUniqueCode] = useState("......");
  const [copied, setCopied] = useState(false);
  const [roomId, setRoomId] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const roomIdRef = useRef("");
  const navigatedRef = useRef(false);

  // Generate random code
  const generateCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return code;
  };

  // Copy code to clipboard
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(uniqueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Creates Room
  useEffect(() => {
    const createRoom = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        // 1️⃣ Rate limit check: get all rooms by this user (most recent first)
        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .select("created_at")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }); // newest first

        if (roomsError) throw roomsError;

        // Take the most recent room
        const lastRoom = rooms[0];

        const now = new Date();
        const cooldown = 2 * 60 * 1000; // 2 minutes

        if (lastRoom && now - new Date(lastRoom.created_at) < cooldown) {
          setModalTitle("Hold your horses!");
          setModalMessage(
            "You need to wait 2 minutes before creating another room.",
          );
          setModalVisible(true);
          return; // stop room creation
        }

        // 2️⃣ Generate unique code
        const code = await generateCode();
        setUniqueCode(code);

        // 3️⃣ Create room
        const { data: roomDataArray, error: roomError } = await supabase
          .from("rooms")
          .insert({ code, created_by: user.id })
          .select();
        if (roomError) throw roomError;

        const roomData = roomDataArray[0];
        setRoomId(roomData.id);

        // Reference the roomId for cleanup
        roomIdRef.current = roomData.id;

        // 4️⃣ Add participant
        const { error: participantError } = await supabase
          .from("participants")
          .insert([{ user_id: user.id, room_id: roomData.id }]);
        if (participantError) throw participantError;
      } catch (err) {
        console.error("Error creating room or participant:", err.message);
      }
    };

    createRoom();

    // Delete room when component is unmounted
    return () => {
      if (roomIdRef.current && !navigatedRef) deleteRoom(roomIdRef.current);
    };
  }, []);

  // Deletes Room Function
  const deleteRoom = async (id = roomId) => {
    if (!id) return false;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
      console.error("Error deleting room", error.message);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const subscription = supabase
      .channel("participants-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
        },
        async () => {
          const { data } = await supabase
            .from("participants")
            .select("*", { count: "exact" })
            .eq("room_id", roomId);

          if (data?.length === 2) {
            navigatedRef.current = true;
            router.replace({
              pathname: "/(main)/gameScreen",
              params: { roomId: roomId },
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={async () => {
          const success = await deleteRoom(roomId);
          if (success) router.back();
        }}
      >
        <Ionicons name="chevron-back" size={20} color="white" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>UNIQUE ROOM CODE</Text>

      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{uniqueCode}</Text>
        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
          <Ionicons
            name={copied ? "checkmark" : "copy"}
            size={20}
            color="#ff0a54"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {copied ? "Copied to clipboard!" : "Share this code with participant"}
      </Text>

      <ResponseModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => {
          setModalVisible(false);
          setTimeout(() => router.back(), 500);
        }}
        type="error"
        buttonText="My Bad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ff0a54",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
  },
  backText: {
    color: "white",
    fontSize: 16,
    marginLeft: 5,
    fontWeight: "500",
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: "white",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "white",
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    width: 250,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  codeText: {
    color: "#ff0a54",
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 5,
  },
  copyButton: {
    marginLeft: 10,
    padding: 5,
  },
});
