import { Client, Databases } from "react-native-appwrite";
// Config object using environment variables
export const config = {
  aiKey: process.env.EXPO_PUBLIC_AI_KEY,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  endpoint: process.env.EXPO_PUBLIC_ENDPOINT,
  aiImageEndpoint: process.env.EXPO_PUBLIC_AI_IMAGE_ENDPOINT,
  platform: process.env.EXPO_PUBLIC_PLATFORM,
  databaseId: process.env.EXPO_PUBLIC_DATABASE_ID,
  aiChatCollectionId: process.env.EXPO_PUBLIC_AI_CHAT_COLLECTION_ID,
};

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

export const databases = new Databases(client);
