import ConfirmModal from '@/components/ConfirmModal'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

type UserProfile = {
  name: string;
  email: string;
};

export default function ProfileScreen() {
    const [user,setUser] = useState<UserProfile>({name:'', email:''})
    const [email,setEmail] = useState('')
    const [loading,setLoading] = useState(false)

    const [fullNameEditing,setFullNameEditing] = useState(false)
    const [emialEditing, setEmailEditing] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [modalVisible,setModalVisible] = useState(false)

    // Fetch cached data first
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);

        // Load from local storage first
        const cached = await AsyncStorage.getItem('user_profile');
        if (cached) {
          setUser(JSON.parse(cached));
        }

        // Fetch latest from Supabase auth table
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error) throw error;

        const profile: UserProfile = {
          name: authUser?.user_metadata?.full_name || '',
          email: authUser?.email || '',
        };

        setUser(profile);

        // 3️⃣ Update local storage with fresh data
        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);


   const handleSave = async () => {
    try {
        // Update local cache
        await AsyncStorage.setItem('user_profile', JSON.stringify(user));

        // Optional: update Supabase auth metadata
        const { data, error } = await supabase.auth.updateUser({
        data: { full_name: user.name }
        });
        if (error) throw error;

        alert('Profile updated successfully!');
    } catch (err) {
        console.error('Failed to save profile:', err);
    }
};

    
    const handleConfirmSignout = async () => {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Error signing out:', error.message);
        } 
        };

        
    const handleSignOut = () => {
        setModalVisible(true)
    }

    const handleCancel = () => {
        setModalVisible(false)
    } 
    
    return (
        <View>
            <ScreenHeader title='Account Settings'/>

            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={{color:'#FFFFFF', fontSize:30, fontWeight:'bold'}}>{user.name.charAt(0)}</Text>
                </View>
                <Text style={{color:'#ff0a54',fontSize:22, fontWeight:'500'}}>{user.name}</Text>
            </View>

            <View style={{padding:22}}>
                <Text style={{marginBottom:8}}>Full Name</Text>
                    <View style={[styles.field, {backgroundColor: fullNameEditing ? 'white' : '#e0e0e0ff'}]}>
                        {fullNameEditing ? 
                            <TextInput
                            value={user.name}
                            onChangeText={(text) => setUser(prev => ({ ...prev, name: text }))}
                            ></TextInput> : <Text>{user.name}</Text>}

                            <TouchableOpacity 
                                onPress={() => setFullNameEditing(!fullNameEditing)}
                                style={styles.iconContainer}>
                                <Ionicons name='pencil' size={18}/>
                            </TouchableOpacity>
                    </View>

                <Text style={{marginBottom:8}}>Email</Text>
                    <View style={[styles.field, {backgroundColor: emialEditing ? 'white' : '#e0e0e0ff'}]}>
                        {emialEditing ? 
                            <TextInput
                                value={user.email}
                                onChangeText={(text) => setUser(prev => ({ ...prev, email: text }))}
                            ></TextInput> : <Text>{user.email}</Text>}

                            <TouchableOpacity
                                onPress={() => setEmailEditing(!emialEditing)}
                                style={styles.iconContainer}>
                                <Ionicons name='pencil' size={18}/>
                            </TouchableOpacity>
                    </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.signOutButton, isSigningOut && styles.buttonDisabled]} 
                        onPress={handleSignOut}
                        disabled={isSigningOut}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#ff0a54" style={{marginRight: 6}} />
                        <Text style={styles.signOutButtonText}>
                            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => handleSave()}
                        style={styles.button}>
                        <Text style={{color:'#ffffff', fontWeight:'bold'}}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </View>
           <ConfirmModal 
            visible={modalVisible}
            title="Confirm Sign Out"
            message="Are you sure you want to sign out?"
            onConfirm={handleConfirmSignout}
            onCancel={handleCancel}
            confirmText="Sign Out"
            cancelText="Cancel"
           />
        </View>
    )
}

const styles = StyleSheet.create ({
    avatarContainer:{
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        gap:15,
        marginTop:50,
    },
    avatar: {
        backgroundColor:'#ff0a54',

        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        width:100,
        height:100,

        borderRadius:50,
    },
    field: {
        display:'flex',
        justifyContent:'center',
        position:'relative',
        borderWidth:1,
        borderColor:'#c4c4c4ff',
        marginBottom:16,
        height:45,
        paddingHorizontal:10,
        borderRadius:5,
    },
    iconContainer: {
        position:'absolute',
        right:10,
        top:8,
        borderWidth:1,
        padding:2.5,
        borderRadius:5,
        borderColor:'#A3A3A3',
        backgroundColor:'#b9b9b9ff'
    },
    buttonContainer: {
        display:'flex',
        flexDirection:'row',
        justifyContent:'space-between',
        alignItems:'center',
        gap: 15,
        marginTop: 20,
    },
    button: {
        display:'flex',
        paddingVertical:10,
        width:130,
        flexDirection:'row',
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'#ff0a54',
        borderWidth: 2,
        borderColor: '#ff0a54',
        borderRadius:50,
    },
    signOutButton: {
        display:'flex',
        paddingVertical:10,
        width:130,
        flexDirection:'row',
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'transparent',
        borderWidth: 2,
        borderColor: '#ff0a54',
        borderRadius:50,
    },
    signOutButtonText: {
        color:'#ff0a54',
        fontWeight:'bold',
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.6,
    }
})