import { Query, ID } from "react-native-appwrite";
import {
  account,
  databases,
  storage,
  avatars,
  appwriteConfig,
} from "../appwrite";

export const createUser = async (email, password, username) => {
  try {
    const accountResponse = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: accountResponse.$id,
        email,
        username,
        password,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    throw new Error(error);
  }
};

export const getCurrentUser = async () => {
  // Check for active session
  const session = await account.getSession("current");

  if (!session) {
    throw new Error("No active session found. Please log in.");
  }

  // Fetch the current account
  const currentAccount = await account.get();

  if (!currentAccount) {
    throw new Error("No current account found.");
  }

  // Query the database for the current user
  const currentUser = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("accountId", currentAccount.$id)]
  );

  // Check if user document is found
  if (!currentUser.documents.length) {
    throw new Error("No user document found for the current account.");
  }

  // Return both the account details and the first matching user document
  return {
    account: currentAccount,
    document: currentUser.documents[0],
  };
};

export const uploadUserProfilePicture = async (userDoc, pickerResult) => {
  try {
    const fileId = ID.unique();
    const file = {
      name: pickerResult.fileName,
      type: pickerResult.mimeType,
      size: pickerResult.fileSize,
      uri: pickerResult.uri,
    };

    // Using SDK's createFile method directly
    const result = await storage.createFile(
      appwriteConfig.storageId,
      fileId,
      file
    );

    // Get file preview URL
    const fileUrl = storage
      .getFilePreview(
        appwriteConfig.storageId,
        result.$id,
        2000,
        2000,
        "top",
        100
      )
      .toString();

    // Update the database document with the new avatar URL
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDoc.$id,
      { avatar: fileUrl }
    );

    return fileUrl; // Return the file URL
  } catch (error) {
    console.error("Upload error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
};
export const handleLogout = async () => {
  await account.deleteSession("current");
  return true;
};

export const handleUserChatData = async (userId) => {
  try {
    const userChats = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.aiChatCollectionId,
      [Query.equal("user_id", [userId]), Query.orderDesc("createdAt")]
    );
    return userChats?.documents || [];
  } catch (error) {
    console.error("Error in handleUserChatData:", error);
    return [];
  }
};

export const changePassword = async (userpasswords) => {
  await account.updatePassword(userpasswords.new, userpasswords.old);
};
