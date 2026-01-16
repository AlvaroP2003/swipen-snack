import ResponseModal from '@/components/ResponseModal';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function JoinRoomScreen() {

  const router = useRouter();
  const [uniqueCode,setUniqueCode] = useState('')
  const [user,setUser]  = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Response Modal state
  const [modalVisible,setModalVisible] = useState(false)
  const [modalTitle,setModalTitle] = useState('')
  const [modalMessage,setModalMessage] = useState('')
  const [modaltype,setModalType] = useState('')

  useEffect(() => {
     const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching user:', error.message)
      } else {
        setUser(data.user)
      }
    }
    getUser()
  },[])

  const joinRoom = async (code: string, userId: string) => {

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (roomError) throw roomError;
      if (!room) throw new Error('Room not found');

      const { error: insertError } = await supabase
        .from('participants')
        .insert({ user_id: userId, room_id: room.id });

      if (insertError) throw insertError;

      return { success: true, roomId: room.id };
    } catch (err) {
      console.error('Join room error:', err);
      return { success: false, message: err.message };
    }
  };

const handleJoinRoom = async () => {

  if(!uniqueCode) {
    setModalVisible(true)
    setModalTitle('Missing value')
    setModalMessage('Please enter a value as a code')
    setModalType('error')
    return
  }
  
  setIsLoading(true)
  const { success, roomId, message } = await joinRoom(uniqueCode, user.id);
  setIsLoading(false)
  
  if (success) {
    console.log('Joined room', roomId);
    router.replace({
      pathname:"/(main)/gameScreen",
      params: {roomId: roomId}
    })
    setUniqueCode('')
  } else {
    setModalVisible(true)
    setModalTitle('No Room Found')
    setModalMessage('No room could be found that matches the entered code')
    setModalType('error')
  }
};

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="white" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>ENTER UNIQUE CODE</Text>
      <TextInput 
        maxLength={6}
        style={styles.input}
        value={uniqueCode}
        onChangeText={setUniqueCode}
        placeholder="XXXXXX"
        autoCapitalize='characters'
        placeholderTextColor="#ffffff9d" />
      <Text style={styles.subtitle}>We've sent a code to the host</Text>

       <TouchableOpacity 
         style={[styles.confirmContainer, isLoading && styles.confirmContainerDisabled]} 
         onPress={() => handleJoinRoom()}
         disabled={isLoading}
       >
         {isLoading ? (
           <ActivityIndicator size="small" color="#ff0a54" />
         ) : (
           <Text style={styles.confirmText}>CONFIRM</Text>
         )}
        </TouchableOpacity>

        <ResponseModal
          visible={modalVisible}
          title={modalTitle}
          message={modalMessage}
          onClose={() => setModalVisible(false)}
          type={modaltype}
          buttonText={'OK'}
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
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth:2,
    borderColor: 'white',
    borderRadius: 10,
  },
  backText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '500',
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
  input: {
    height: 60,
    width: 250,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "transparent",
    color: "white",
    paddingHorizontal: 10,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    letterSpacing: 5,
    marginBottom: 20,
  },
  confirmContainer: {
    color: "white",
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "white",
    height: 50,
    width: 200,
    display:'flex',
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
  },
  confirmContainerDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    fontSize: 16,
    color: "#ff0a54",
    fontWeight: "500",
  },
});
