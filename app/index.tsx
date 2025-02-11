import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants";
import CustomButton from "../components/CustomButton";
import { useGlobalContext } from "../context/GlobalProvider";
import React, { useEffect } from "react";
import * as Updates from 'expo-updates';

export default function App() {
  // useEffect(() => {
  //   async function checkUpdates() {
  //     if (!__DEV__) {
  //       try {
  //         const update = await Updates.checkForUpdateAsync();
  //         if (update.isAvailable) {
  //           await Updates.fetchUpdateAsync();
  //           await Updates.reloadAsync();
  //         }
  //       } catch (error) {
  //         console.log(`Error checking updates: ${error}`);
  //       }
  //     }
  //   }

  //   checkUpdates();
  // }, []);
  const { isLoggedIn, isLoading } = useGlobalContext();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#00ff00" />
        </View>
      </SafeAreaView>
    );
  }

  // Redirect to home if user is logged in
  if (isLoggedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <SafeAreaView style={{ backgroundColor: "#7C1F4E", height: "100%" }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className=" mt-10">
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
                position: "absolute", // Absolute positioning
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

          <View className="mt-4 px-6">
            <CustomButton
              title="Continue with email"
              handlePress={() => {
                router.push("/(auth)/signin");
              }}
              containerStyles="w-full mt-7"
              isLoading={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
