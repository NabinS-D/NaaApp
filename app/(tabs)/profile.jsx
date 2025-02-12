import React, { useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "../../context/GlobalProvider";
import { router } from "expo-router";
import CustomButton from "../../components/CustomButton";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import CustomModal from "../../components/CustomModal";
import {
  changePassword,
  handleLogout,
  uploadUserProfilePicture,
} from "../../lib/APIs/UserApi";
import FormFields from "@/components/FormFields";

const HeaderButtons = memo(({ handlePasswordChange }) => (
  <View className="flex-row justify-evenly">
    <CustomButton
      title="Change password"
      containerStyles="w-[200]"
      handlePress={handlePasswordChange}
      fullWidth={false}
      buttoncolor="bg-green-500"
    />
  </View>
));
// Memoized components for better performance
const ProfileImage = memo(({ uri, isUploading, onPress }) => (
  <TouchableOpacity onPress={onPress} disabled={isUploading}>
    <View style={styles.profileImageContainer}>
      <Image style={styles.profileImage} source={{ uri }} resizeMode="cover" />
      {isUploading ? (
        <ActivityIndicator
          style={styles.uploadOverlay}
          size="large"
          color="#fff"
        />
      ) : (
        <View style={styles.uploadOverlay}>
          <Ionicons name="camera" size={30} color="#fff" />
        </View>
      )}
    </View>
  </TouchableOpacity>
));

const UserDetails = memo(
  ({ username, email, userId, labels, emailVerification }) => (
    <View style={styles.detailsContainer}>
      <Text style={styles.username}>
        {username || "User"}{" "}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={emailVerification ? "checkmark-circle" : "close-circle"}
            size={20}
            color={emailVerification ? "green" : "red"}
          />
        </View>
      </Text>
      <View>
        <Text style={styles.email}>{labels?.[0] ?? "User"}</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.email}>User ID - {userId}</Text>
      </View>
    </View>
  )
);

const ImagePreview = memo(({ uri, onClose }) => (
  <View style={styles.previewOverlay}>
    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
      <Ionicons name="close" size={30} color="#fff" />
    </TouchableOpacity>
    <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
  </View>
));

const ModalOptions = memo(({ onOptionPress }) => (
  <>
    {["Upload from Gallery", "Open Camera", "View profile picture"].map(
      (item, index) => (
        <Pressable
          key={index}
          style={styles.optionButton}
          onPress={() => onOptionPress(item)}
        >
          <Text style={styles.optionText}>{item}</Text>
        </Pressable>
      )
    )}
  </>
));

export default function Profile() {
  const { user, userdetails, checkAuth, setuserdetails } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordChangeModalVisible, setPasswordChangeModalVisible] =
    useState(false);
  const [passwordChangeIsLoading, setPasswordChangeIsLoading] = useState(false);
  const [userPasswords, setuserPasswords] = useState({ old: "", new: "" });

  // Loading state check
  if (!user || !userdetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  // Memoized handlers
  const handleLogoutAction = useCallback(async () => {
    setIsLoading(true);
    try {
      await handleLogout();
      await checkAuth();
      router.replace("/signin");
    } catch (error) {
      Alert.alert("Logout Error", "Unable to log out. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth]);

  const toggleModal = useCallback(() => {
    setModalVisible((prev) => !prev);
  }, []);

  const togglePasswordChangeModal = useCallback(() => {
    setPasswordChangeModalVisible((prev) => !prev);
  }, []);
  const handleProfilePictureUpload = useCallback(
    async (result) => {
      setIsUploading(true);
      try {
        const fileUrl = await uploadUserProfilePicture(userdetails, result);
        setuserdetails((prev) => ({
          ...prev,
          avatar: fileUrl,
        }));
        Alert.alert("Success", "Profile picture uploaded successfully!");
      } catch (error) {
        Alert.alert(
          "Error",
          `Failed to upload profile picture: ${error.message}`
        );
      } finally {
        setIsUploading(false);
      }
    },
    [userdetails, setuserdetails]
  );

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissions needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        await handleProfilePictureUpload(result.assets[0]);
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  }, [handleProfilePictureUpload]);

  const handleOptionPress = useCallback(
    (option) => {
      toggleModal();

      switch (option) {
        case "Upload from Gallery":
          pickImage();
          break;
        case "Open Camera":
          handleOpenCamera();
          break;
        case "View profile picture":
          setShowImagePreview(true);
          break;
      }
    },
    [pickImage, toggleModal]
  );

  const handleOpenCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === "granted") {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });

        if (!result.canceled) {
          await handleProfilePictureUpload(result.assets[0]);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Failed to access camera");
    }
  }, [handleProfilePictureUpload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  }, [checkAuth]);

  // Memoized styles that depend on props
  const containerStyle = useMemo(
    () => [styles.container, showImagePreview && styles.blurBackground],
    [showImagePreview]
  );

  const handlePasswordChange = useCallback(async () => {
    setPasswordChangeIsLoading(true);
    try {
      await changePassword(userPasswords, userdetails.$id);
      Alert.alert("Success", "Password changed successfully!");
    } catch (error) {
      Alert.alert("Error", `Failed to change password: ${error.message}`);
    } finally {
      setIsLoading(false);
      setPasswordChangeModalVisible(false);
      setPasswordChangeIsLoading(false);
    }
  }, [userPasswords]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-5">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#999999"
            titleColor="#999999"
          />
        }
      >
        <View style={containerStyle}>
          {showImagePreview && (
            <ImagePreview
              uri={userdetails?.avatar}
              onClose={() => setShowImagePreview(false)}
            />
          )}

          <ProfileImage
            uri={userdetails?.avatar}
            isUploading={isUploading}
            onPress={toggleModal}
          />

          <UserDetails
            username={userdetails?.username}
            email={userdetails?.email}
            userId={user?.$id}
            labels={user?.labels}
            emailVerification={user?.emailVerification}
          />

          <CustomButton
            title="Logout"
            containerStyles="w-[100]"
            handlePress={handleLogoutAction}
            isLoading={isLoading}
          />
          <View className="mt-6">
            <HeaderButtons
              handlePasswordChange={() => setPasswordChangeModalVisible(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Use Absolute Positioning */}
      {passwordChangeModalVisible && (
        <View style={styles.previewOverlay}>
          <CustomModal
            title="Change password"
            modalVisible={passwordChangeModalVisible}
            onSecondaryPress={togglePasswordChangeModal}
            onPrimaryPress={handlePasswordChange}
          >
            <View className="w-full">
              <FormFields
                placeholder="Enter old password"
                value={userPasswords.old}
                inputfieldcolor="bg-gray-200" // Light gray background
                textcolor="text-gray-800" // Darker text
                bordercolor="border-gray-400" // Gray border
                handleChangeText={(text) =>
                  setuserPasswords({ ...userPasswords, old: text })
                }
                otherStyles="mb-4"
              />
              <FormFields
                placeholder="Enter new password"
                value={userPasswords.new}
                inputfieldcolor="bg-gray-200" // Light gray background
                textcolor="text-gray-800" // Darker text
                bordercolor="border-gray-400" // Gray border
                handleChangeText={(text) =>
                  setuserPasswords({ ...userPasswords, new: text })
                }
                otherStyles="mb-4"
              />
            </View>
          </CustomModal>
        </View>
      )}

      {modalVisible && (
        <View style={styles.previewOverlay}>
          <CustomModal
            title="Select an Action"
            modalVisible={modalVisible}
            onSecondaryPress={toggleModal}
            onPrimaryPress={toggleModal}
          >
            <ModalOptions onOptionPress={handleOptionPress} />
          </CustomModal>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#7C1F4E",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 5,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#fff",
  },
  uploadOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsContainer: {
    flex: 1,
  },
  username: {
    fontFamily: "Poppins-Bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 5,
    alignSelf: "center",
    alignItems: "center",
    marginLeft: 20,
  },
  email: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    color: "#f8f8f8",
    marginBottom: 5,
    alignSelf: "center",
  },
  optionButton: {
    padding: 15,
    backgroundColor: "#f1f1f1",
    marginVertical: 5,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  optionText: {
    color: "black",
    fontWeight: "bold",
  },
  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.1)", // Light grey background
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%", // Full width
    height: "100%", // Let height be calculated based on aspect ratio
    aspectRatio: 1, // Maintain aspect ratio
    resizeMode: "cover", // Ensure whole image is visible
  },
  closeButton: {
    position: "absolute",
    top: -20,
    right: 20,
    zIndex: 1001,
    padding: 10,
    backgroundColor: "grey", // Remove background
    borderRadius: 50,
    width: 50,
    height: 50,
  },
});
