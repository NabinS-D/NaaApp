import React from "react";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";

export default function CustomButton({
  title,
  handlePress,
  containerStyles = "",
  textStyles = "",
  isLoading = false,
  ...props
}) {
  return (
    <View className="mt-2 justify-center items-center w-full">
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className={`bg-secondary-200 rounded-xl min-h-[40px] justify-center items-center w-full ${containerStyles}`}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className={`text-primary text-lg font-pregular ${textStyles}`}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
