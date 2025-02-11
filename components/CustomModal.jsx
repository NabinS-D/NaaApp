import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CustomModal = ({
  title,
  modalVisible,
  children,
  primaryButtonText = "Confirm",
  secondaryButtonText = "Cancel",
  onPrimaryPress,
  onSecondaryPress,
}) => {
  const [loading, setLoading] = useState(false); // Track loading state

  const handlePrimaryPress = async () => {
    setLoading(true);
    await onPrimaryPress();
    setLoading(false);
  };

  if (!modalVisible) return null;

  return (
    <SafeAreaView style={styles.centeredView}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={onSecondaryPress}
      >
        {/* Background Overlay */}
        <View style={styles.overlay} />

        {/* Modal Content */}
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            {title && <Text style={styles.modalText}>{title}</Text>}
            {children}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  loading && styles.disabledButton, // Apply disabled styling
                ]}
                onPress={handlePrimaryPress}
                activeOpacity={0.7}
                disabled={loading} // Disable button while loading
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {primaryButtonText}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onSecondaryPress}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 40,
    padding: 20,
    alignItems: "center",
    shadowColor: "#fff",
    elevation: 5,
    width: "80%",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flex: 1,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#2196F3",
  },
  buttonSecondary: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  secondaryButtonText: {
    color: "#212529",
    fontWeight: "bold",
    textAlign: "center",
  },
  disabledButton: {
    backgroundColor: "#A9A9A9", // Gray out button when disabled
  },
});

export default CustomModal;
