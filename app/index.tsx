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
import {OneSignal} from "react-native-onesignal";

export default function App() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const { isLoggedIn, isLoading, userdetails } = useGlobalContext();

  // OneSignal Initialization
  useEffect(() => {
    if (Platform.OS === "web") return;

    const initializeOneSignal = async () => {
      try {
        const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
        console.log("OneSignal App ID:", appId);
        if (!appId) {
          console.error("OneSignal App ID is missing");
          return;
        }

        // Debug OneSignal state at runtime
        console.log("OneSignal at runtime:", OneSignal);
        console.log("OneSignal.initialize at runtime:", OneSignal.initialize);
       
        OneSignal.initialize(appId);
        console.log("OneSignal initialized with App ID:", appId);

        // Request notification permission
        await OneSignal.Notifications.requestPermission(true);
        const hasPermission = await OneSignal.Notifications.getPermissionAsync();
        console.log("Notification permission status:", hasPermission);

        // Get device state information (v5.x methods)
        const onesignalId = await OneSignal.User.getOnesignalId();
        const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
        const isSubscribed = await OneSignal.User.pushSubscription.getOptedInAsync();
        console.log("OneSignal ID:", onesignalId);
        console.log("Push Token:", pushToken);
        console.log("Is Subscribed:", isSubscribed);

        // Set external user ID if available
        if (userdetails?.accountId) {
          OneSignal.login(userdetails.accountId);
          console.log("OneSignal external user ID set:", userdetails.accountId);
        }
        console.log("OneSignal initialized successfully");
      } catch (error) {
        console.error("OneSignal initialization failed:", error);
      }
    };

    if (!isLoading && isLoggedIn) {
      initializeOneSignal();
    }
  }, [isLoading, isLoggedIn, userdetails?.accountId]);

  // Update handling
  const handleUpdate = useCallback(async () => {
    try {
      setIsChecking(true);
      const update = await Updates.fetchUpdateAsync();

      if (update.isNew) {
        Alert.alert(
          "Update Ready",
          "Restart app to apply changes",
          [
            { text: "Later", style: "cancel" },
            { text: "Restart Now", onPress: () => Updates.reloadAsync() },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkForUpdates = useCallback(
    async (manualCheck = false) => {
      if (__DEV__) return;

      try {
        setIsChecking(true);
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          Alert.alert(
            "Update Available",
            manualCheck ? "Download now?" : "A new version is available",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Update", onPress: handleUpdate },
            ]
          );
        } else if (manualCheck) {
          Alert.alert("You're up to date!");
        }
      } catch (error) {
        if (manualCheck) {
          Alert.alert(
            "Check Failed",
            error instanceof Error ? error.message : "An unknown error occurred"
          );
        }
      } finally {
        setIsChecking(false);
      }
    },
    [handleUpdate]
  );

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        checkForUpdates();
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [checkForUpdates]);

  // Loading state
  if (isLoading || isChecking) {
    return (
      <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5C94C8" />
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