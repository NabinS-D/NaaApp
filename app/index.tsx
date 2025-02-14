import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  View,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants";
import CustomButton from "../components/CustomButton";
import { useGlobalContext } from "../context/GlobalProvider";
import React, { useEffect, useState, useCallback } from "react";
import * as Updates from "expo-updates";
import NetInfo from "@react-native-community/netinfo";

export default function App() {
  // State management
  const [isChecking, setIsChecking] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { isLoggedIn, isLoading } = useGlobalContext();

  // Function to handle the update process
  const handleUpdate = useCallback(async () => {
    try {
      setIsChecking(true);
      await Updates.fetchUpdateAsync();

      Alert.alert(
        "Update Ready",
        "Update has been downloaded successfully. The app will now restart to apply changes.",
        [
          {
            text: "OK",
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (error) {
                Alert.alert(
                  "Error",
                  "Failed to restart app. Please manually close and reopen the app."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      setIsChecking(false);
      Alert.alert(
        "Update Failed",
        "Failed to download the update. Please check your connection and try again."
      );
      console.error("Update error:", error);
    }
  }, []);

  // Function to check for updates
  const checkForUpdates = useCallback(
    async (showNoUpdateAlert = false) => {
      if (__DEV__) return; // Don't check for updates in development

      try {
        setIsChecking(true);

        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          Alert.alert(
            "No Connection",
            "Please check your internet connection and try again."
          );
          setIsChecking(false);
          return;
        }

        // Check for updates
        const update = await Updates.checkForUpdateAsync();
        setUpdateAvailable(update.isAvailable);

        if (update.isAvailable) {
          Alert.alert(
            "Update Available",
            "A new version of the app is available. Would you like to update now?",
            [
              {
                text: "Later",
                onPress: () => setIsChecking(false),
                style: "cancel",
              },
              {
                text: "Update Now",
                onPress: handleUpdate,
              },
            ]
          );
        } else {
          setIsChecking(false);
          if (showNoUpdateAlert) {
            Alert.alert("Up to Date", "You're using the latest version!");
          }
        }
      } catch (error) {
        setIsChecking(false);
        console.error("Error checking for updates:", error);
        Alert.alert(
          "Error",
          "Unable to check for updates. Please try again later."
        );
      }
    },
    [handleUpdate]
  );

  // Check for updates on mount and setup network listener
  useEffect(() => {
    // Initial update check
    checkForUpdates();

    // Network change listener
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && updateAvailable) {
        checkForUpdates();
      }
    });

    // Cleanup function
    return () => {
      unsubscribeNetInfo();
    };
  }, [checkForUpdates, updateAvailable]);

  // Loading state UI
  if (isLoading || isChecking) {
    return (
      <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#00ff00" />
          {isChecking && (
            <>
              <Text className="text-white mt-2">
                {updateProgress > 0
                  ? "Downloading update..."
                  : "Checking for updates..."}
              </Text>
              {updateProgress > 0 && (
                <Text className="text-white mt-1">{updateProgress}%</Text>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Redirect if logged in
  if (isLoggedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Main UI
  return (
    <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="mt-10">
          <View className="items-center mt-8">
            <Image
              source={images.NaaApp}
              style={{ width: 150, height: 100 }}
              resizeMode="contain"
            />
          </View>

          <View className="items-center px-6">
            <Image
              source={images.cards}
              style={{ width: 320, height: 360 }}
              resizeMode="contain"
            />
          </View>

          <View className="relative mt-1">
            <Text className="text-3xl text-white font-pbold text-center">
              Believe and you shall achieve it. Unlock your full potential with{" "}
              <Text className="text-secondary-200">NaaApp</Text>
            </Text>
            <Image
              source={images.path}
              style={{
                width: 136,
                height: 15,
                position: "absolute",
                bottom: -8,
                left: 120,
              }}
              resizeMode="contain"
            />
          </View>

          <View className="mt-5 text-center justify-center items-center">
            <Text className="font-pextralight text-white">
              It's never too late to start your journey.
            </Text>
          </View>

          <View className="px-6">
            <CustomButton
              title="Continue with email"
              handlePress={() => router.push("/(auth)/signin")}
              containerStyles="w-full mt-4"
              isLoading={isLoading}
            />

            {/* Manual update check button */}
            <CustomButton
              title="Check for Updates"
              handlePress={() => checkForUpdates(true)}
              containerStyles="w-full mt-4"
              isLoading={isChecking}
              buttoncolor="bg-green-500"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
