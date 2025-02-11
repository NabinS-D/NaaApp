import {
  Account,
  Avatars,
  Client,
  Databases,
  Storage,
} from "react-native-appwrite";
// Config object using environment variables
export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_ENDPOINT,
  platform: process.env.EXPO_PUBLIC_PLATFORM,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_DATABASE_ID,
  userCollectionId: process.env.EXPO_PUBLIC_USER_COLLECTION_ID,
  aiChatCollectionId: process.env.EXPO_PUBLIC_AI_CHAT_COLLECTION_ID,
  storageId: process.env.EXPO_PUBLIC_STORAGE_ID,
  categoryCollectionId: process.env.EXPO_PUBLIC_CATEGORY_COLLECTION_ID,
  expenseCollectionId: process.env.EXPO_PUBLIC_EXPENSE_COLLECTION_ID,
};

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

// Initialize services
export const account = new Account(client);
export const avatars = new Avatars(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
