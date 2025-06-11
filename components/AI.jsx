import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { ID } from "react-native-appwrite";
import { useGlobalContext } from "../context/GlobalProvider.js";
import { config, databases } from "../lib/AIconfig.js";
import { handleUserChatData } from "../lib/APIs/UserApi.js";
import useAlertContext from "@/context/AlertProvider.js";

// Separate message creation logic
const createMessage = (text, sender, imageData = null) => ({
  id: ID.unique(),
  text,
  sender,
  imageData,
  timestamp: new Date().toISOString(),
});

const AIChat = () => {
  const { user, isLoggedIn } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingChatHistory, setIsLoadingChatHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // Fetch chat history
  const fetchChatHistory = useCallback(async () => {
    if (!isLoggedIn || !user) return;

    setIsLoadingChatHistory(true);
    try {
      const chatHistory = await handleUserChatData(user.$id);
      if (!chatHistory?.length) {
        setMessages([]);
        return;
      }

      const formattedMessages = chatHistory
        .flatMap((doc) => {
          const messages = [];
          if (doc.image_data) {
            messages.push(
              createMessage("Here's your generated image", "ai", doc.image_data)
            );
          }
          if (doc.user_message) {
            messages.push(createMessage(doc.user_message, "user"));
          }
          return messages;
        })
        .reverse();

      setMessages(formattedMessages);
    } catch (error) {
      showAlert(
        "Error",
        `{Could not load chat history. ${error.message}`,
        "error"
      );
    } finally {
      setIsLoadingChatHistory(false);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // Image generation query
  const generateImage = useCallback(async (prompt) => {
    const response = await fetch(config.aiImageEndpoint, {
      headers: {
        Authorization: `Bearer ${config.aiKey}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
        "x-use-cache": "false",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      showAlert(
        "Error",
        "Failed to generate image. Please try again.",
        "error"
      );
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Database operations
  const saveToDatabase = useCallback(
    async (userMessage, imageData) => {
      if (!isLoggedIn || !user) return;

      try {
        await databases.createDocument(
          config.databaseId,
          config.aiChatCollectionId,
          ID.unique(),
          {
            user_message: userMessage,
            image_data: imageData,
            user_id: user.$id,
            createdAt: new Date().toISOString(),
          }
        );
      } catch (error) {
        showAlert("Database error:", error.message, "error");
        if (error.code === 401) {
          showAlert(
            "Session Expired",
            "Please log in again to save your chat history."
          );
        }
      }
    },
    [isLoggedIn, user]
  );

  // Message handling
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    setIsLoading(true);
    setInputText("");

    // Add user message immediately
    const userMessage = createMessage(trimmedInput, "user");
    setMessages((prev) => [...prev, userMessage]);

    try {
      const base64Image = await generateImage(trimmedInput);
      const aiMessage = createMessage(
        "Here's your generated image",
        "ai",
        base64Image
      );

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(true);
      await saveToDatabase(trimmedInput, base64Image);
    } catch (error) {
      const errorMessage = createMessage(
        "Sorry, I encountered an error generating your image. Please try again.",
        "ai"
      );
      setMessages((prev) => [...prev, errorMessage]);
      showAlert(
        "Error",
        "Failed to generate image. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, generateImage, saveToDatabase]);

  // UI Components
  const MessageItem = useMemo(
    () =>
      ({ item }) =>
        (
          <View
            className={`max-w-[80%] my-1 p-3 rounded-xl ${
              item.sender === "user"
                ? "self-end bg-blue-500 rounded-br-sm"
                : "self-start bg-gray-200 rounded-bl-sm"
            }`}
          >
            <Text
              className={`text-base ${
                item.sender === "user" ? "text-white" : "text-black"
              }`}
            >
              {item.text}
            </Text>
            {item.imageData && (
              <Image
                source={{ uri: item.imageData }}
                className="w-48 h-48 mt-3 rounded-xl"
                resizeMode="contain"
              />
            )}
            <Text className="text-xs text-black mt-1 self-end">
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ),
    []
  );

  if (isLoadingChatHistory) {
    return (
      <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#7C1F4E]">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        className="flex-1 px-4 py-2"
      />

      <View className="flex-row p-3 bg-[#7C1F4E]">
        <TextInput
          className="flex-1 mr-3 p-3 bg-gray-100 rounded-xl max-h-24 text-black text-base"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Describe the image you want to generate..."
          multiline
          maxLength={10000}
          placeholderTextColor="#666"
          editable={!isLoading}
        />
        <TouchableOpacity
          className={`justify-center items-center rounded-xl h-12 w-32 ${
            isLoading ? "bg-gray-400" : "bg-blue-500"
          }`}
          onPress={handleSendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          {isLoading ? (
          <ActivityIndicator size="small" color="#5C94C8" />
          ) : (
            <Text className="text-white font-semibold text-lg">Generate</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AIChat;
