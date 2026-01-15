import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function JoinRoomScreen() {
  const router = useRouter();
  const [uniqueCode, setUniqueCode] = useState("XXXXXX");
  const [copied, setCopied] = useState(false);
  const [roomId, setRoomId] = useState('')


  // Generate random code
  const generateCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return code
  };

  // Copy code to clipboard
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(uniqueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // reset after 1.5s
  };


  // Creates Room
  useEffect(() => {
    const createRoom = async () => {
      try {
        const code = await generateCode();
        setUniqueCode(code)

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) throw userError

        // Create room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .insert({code, created_by: user.id})
          .select()
          .single();

        if (roomError) throw roomError;

        setRoomId(roomData.id)

        // Add participant
        const { error: participantError } = await supabase
          .from('participants')
          .insert([{ id: user.id, room_id: roomData.id}]);

        if (participantError) throw participantError;



      } catch (err) {
        console.error('Error creating room or participant:', err.message);
      }
    };

    createRoom();
  }, []);


  // Deletes Room
  const deleteRoom = async () => {
    const {error} = await supabase
    .from('rooms')
    .delete()
    .eq('code', uniqueCode)

    if(error) {
      console.error('Error deleting room', error.message)
      return false
    } else {
      return true
    }
  }


useEffect(() => {
    const subscription = supabase
    .channel('participants-listener')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table:'participants'
      },
      async () => {
        const { data } = await supabase
        .from('participants')
        .select('*', {count : 'exact'})
        .eq('room_id', roomId)

        if(data?.length === 2) {
          router.replace ({
            pathname: '/(main)/gameScreen',
            params: { roomId : roomId}
          })
        }
      }
    ).subscribe()

      return () => {
          supabase.removeChannel(subscription);
      };
}, [roomId]);


  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={async () => {
          const success = await deleteRoom()
          if (success) router.back()
      }}>
        <Ionicons name="chevron-back" size={20} color="white" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>UNIQUE ROOM CODE</Text>

      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{uniqueCode}</Text>
        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
          <Ionicons name={copied ? "checkmark" : "copy"} size={20} color="#ff0a54" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {copied ? "Copied to clipboard!" : "Share this code with participant"}
      </Text>
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
