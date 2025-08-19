import { Query, ID } from "react-native-appwrite";
import {
  account,
  databases,
  storage,
  avatars,
  appwriteConfig,
} from "../appwrite";
import { OneSignal } from "react-native-onesignal";

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
    // Authenticate with Appwrite
    const session = await account.createEmailPasswordSession(email, password);

    // Get the user details
    const user = await account.get();

    // Return the session and user data immediately
    const authData = { session };

    // Handle OneSignal registration in the background (non-blocking)
    registerUserWithOneSignal(user).catch((error) => {
      console.error("Background OneSignal registration failed:", error);
    });

    return authData;
  } catch (error) {
    console.error("Error during sign in:", error);
    throw new Error(error);
  }
};

// Separate function to handle OneSignal operations
const registerUserWithOneSignal = async (user) => {
  // Check if OneSignal is initialized
  if (!OneSignal.Notifications) {
    console.error("OneSignal is not initialized.");
    return;
  }

  // Retrieve the current external user ID from OneSignal
  try {
    const currentExternalId = await OneSignal.User.getExternalId();

    // Check if the user is already logged into OneSignal
    if (currentExternalId === user.$id) {
      console.log("User is already logged into OneSignal with the same ID.");
    } else {
      // Log the user into OneSignal
      OneSignal.login(user.$id);
      console.log(`OneSignal login successful for user: ${user.$id}`);
    }

    // Add the user's email to OneSignal
    OneSignal.User.addEmail(user.email);
    console.log(`Email added to OneSignal for user: ${user.email}`);

    // Add additional tags for segmentation
    OneSignal.User.addTag("username", user.name);
    OneSignal.User.addTag("accountCreated", user.$createdAt);
    OneSignal.User.addTag("userId", user.$id);
    console.log("Tags added to OneSignal for user:", user.$id);
  } catch (error) {
    console.error("OneSignal operations failed:", error);
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

    // Get file download URL (more permissive than preview)
    const fileUrl = storage
      .getFileDownload(appwriteConfig.storageId, result.$id)
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
  try {
    // Delete the current session
    await account.deleteSession("current");
    // Remove user identification
    if (OneSignal && OneSignal.login) {
      OneSignal.logout();
      OneSignal.User.removeTag("email");
    }
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
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
