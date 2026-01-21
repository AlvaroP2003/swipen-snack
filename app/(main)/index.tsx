import { Header } from "@/components/Header";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Homescreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header />
      <Image
        style={styles.image}
        source={require("../../assets/images/adaptive-icon.png")}
      />
      <TouchableOpacity
        style={styles.joinContainer}
        onPress={() => router.push("/(main)/joinRoom")}
      >
        <Text style={styles.joinText}>JOIN ROOM</Text>
      </TouchableOpacity>

      <View style={styles.orContainer}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        style={styles.createContainer}
        onPress={() => router.push("/(main)/resultScreen")}
      >
        <Text style={styles.createText}>CREATE ROOM</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#ff0a54",
    alignItems: "center",
  },
  image: {
    width: 550,
    height: 125,
  },
  joinContainer: {
    color: "white",
    borderWidth: 2,
    borderColor: "white",
    height: 50,
    width: 200,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    marginTop: 25,
  },
  joinText: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
  createContainer: {
    color: "white",
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "white",
    height: 50,
    width: 200,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
  },
  createText: {
    fontSize: 16,
    color: "#ff0a54",
    fontWeight: "500",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  orText: {
    fontSize: 15,
    color: "white",
    marginHorizontal: 10,
    fontWeight: "500",
  },
  orLine: {
    height: 2,
    width: 50,
    backgroundColor: "white",
  },
});
