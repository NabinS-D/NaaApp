import { Image, Text, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { images } from "../../constants";
import FormFields from "../../components/FormFields";
import CustomButton from "../../components/CustomButton";
import { Link, router } from "expo-router";
import { signIn } from "../../lib/APIs/UserApi.js";
import { useGlobalContext } from "../../context/GlobalProvider.js";
import useAlertContext from "@/context/AlertProvider";

const SignIn = () => {
  const { checkAuth } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setisSubmitting] = useState(false);

  const submit = async ({ email, password }) => {
    if (email === "") {
      showAlert("Error", "Email cannot be empty!", "error");
      return;
    }
    if (password === "") {
      showAlert("Error", "Password cannot be empty!", "error");
      return;
    }

    setisSubmitting(true);

    try {
      await signIn(email, password);
      await checkAuth(); // Wait for context to update
      router.replace("/(tabs)/home");
    } catch (error) {
      showAlert(
        "SignIn Error",
        `Something went wrong! ${error.message}`,
        "error"
      );
    } finally {
      setisSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-[#7C1F4E] h-full">
      <ScrollView>
        <View className="w-full justify-center  h-full px-4 my-20">
          {/* Logo Image */}
          <Image
            source={images.NaaApp}
            resizeMode="contain"
            className="w-[60px] h-[60px] max-w-full max-h-full mx-auto"
          />

          {/* Text below Image */}
          <Text className="text-white text-3xl font-semibold mt-8 font-psemibold text-center">
            Log in to NaaApp
          </Text>
          <FormFields
            title="Email"
            value={form.email}
            handleChangeText={(text) => setForm({ ...form, email: text })}
            otherStyles="mt-7"
            keyboardType="email-address"
            placeholder="Enter your email"
            textcolor="text-white"
            titlecolor="text-gray-100"
          />

          <FormFields
            title="Password"
            value={form.password}
            handleChangeText={(text) => setForm({ ...form, password: text })}
            otherStyles="mt-7"
            placeholder="Enter your password"
            textcolor="text-white"
            titlecolor="text-gray-100"
          />
          <CustomButton
            title="Sign-In"
            containerStyles="mt-4 mb-4"
            handlePress={() => submit(form)}
            isLoading={isSubmitting}
            fullWidth={true}
          />

          <View className="flex-1 justify-center pt-0 flex-row">
            <Text className=" text-gray-100 font-psemibold text-base text-center">
              Don't have an account?{" "}
              <Link
                className="text-secondary-200 font-psemibold"
                href="/(auth)/signup"
              >
                Sign Up
              </Link>
            </Text>
          </View>
        </View>
        <View className="px-4">
          <CustomButton
            fullWidth={true}
            title="Go to Homescreen"
            containerStyles="mb-2"
            handlePress={() => {
              router.replace("/");
            }}
            buttoncolor="bg-blue-500"
            textStyles="text-white"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
