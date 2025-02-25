import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider";
import { handleUserChatData } from "../../lib/APIs/UserApi.js";
import useAlertContext from "@/context/AlertProvider";

export default function Dashboard() {
  const { user } = useGlobalContext();
  const { showAlert } = useAlertContext();
  // Initialize chatData as an empty array to prevent undefined errors
  const [chatData, setChatData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const getUserData = useCallback(async () => {
    if (!user?.$id) {
      showAlert("Error", "User ID not found. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      const documents = await handleUserChatData(user.$id);
      setChatData(documents || []);
    } catch (err) {
      const errorMessage =
        err?.message || "Failed to fetch chat data. Please try again later.";
      showAlert("Error", errorMessage, "error");
      setChatData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    getUserData();
  }, [user?.$id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getUserData();
    setRefreshing(false);
  }, [getUserData]);

  const renderItem = useCallback(
    ({ item }) => (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-md">
        {item?.image_data ? (
          <Image
            source={{ uri: item.image_data }}
            className="w-full h-48 rounded-lg mb-3"
            resizeMode="cover"
            onError={() =>
              console.warn(`Failed to load image for item ${item.$id}`)
            }
          />
        ) : (
          <Text className="text-center text-gray-500 font-pbold mb-3">
            No Image Available
          </Text>
        )}
        <Text className="text-lg font-pbold  text-gray-800 mb-2">
          {item?.user_message || "No message available"}
        </Text>
      </View>
    ),
    []
  );

  const renderEmpty = useCallback(
    () => (
      <View className="flex-1 justify-center items-center">
        <Text className="font-pbold text-gray-200 text-lg">
          No chat data available.
        </Text>
      </View>
    ),
    []
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#7C1F4E]">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#7C1F4E]">
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-12 mb-2">
        <Text className="text-2xl text-gray-200 font-pbold text-center">
          Dashboard
        </Text>
      </View>
      <FlatList
        data={chatData || []} // Ensure data is always an array
        renderItem={renderItem}
        keyExtractor={(item) => item?.$id || Math.random().toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexGrow: !chatData?.length ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      />
    </SafeAreaView>
  );
}
