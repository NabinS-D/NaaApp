import React, { memo } from "react";
import { TouchableOpacity, Text, View, ActivityIndicator } from "react-native";

// Fixed CustomButton Component
const CustomButton = ({
  title,
  handlePress,
  containerStyles = "",
  textStyles = "",
  isLoading = false,
  fullWidth = false,
  buttoncolor = "bg-secondary-200",
  ...props
}) => {
  return (
    <View
      className={`mt-2 justify-center items-center ${
        fullWidth ? "w-full" : "w-auto"
      }`}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className={` ${buttoncolor} rounded-xl min-h-[40px] justify-center items-center ${
          fullWidth ? "w-full" : "w-auto"
        } ${containerStyles}`}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text
            className={`text-primary text-lg font-pregular text-center ${textStyles}`}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CustomButton;
