import React, { useState } from "react";
import { TextInput, Text, View, TouchableOpacity, Image } from "react-native";
import { icons } from "../constants";

const FormFields = ({
  title,
  value,
  handleChangeText,
  otherStyles,
  placeholder,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="font-pmedium text-base text-gray-100">{title}</Text>
      <View className="border-2 border-black-100 px-4 bg-black-100 rounded-2xl focus:border-secondary flex-row ">
        <TextInput
          className="text-white font-psemibold text-base py-4 flex-1"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7b7b8e"
          onChangeText={handleChangeText}
          secureTextEntry={title.toLowerCase() === "password" && !showPassword}
          {...props}
        />
        {title.toLowerCase() === "password" && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="ml-2 justify-center"
          >
            <Image
              className="w-6 h-6"
              source={showPassword ? icons.eyeHide : icons.eye}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormFields;
