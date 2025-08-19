import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useGlobalContext } from "../context/GlobalProvider.js";
import CustomModal from "./CustomModal.jsx";
import {
  addExpenses,
  deleteAllExpensesById,
  deleteExpenseById,
  fetchAllExpenses,
} from "../lib/APIs/ExpenseApi.js";
import { addCategory, fetchAllCategories } from "../lib/APIs/CategoryApi.js";
import CustomButton from "./CustomButton.jsx";
import FormFields from "./FormFields.jsx";
import FancyAlert from "./CustomAlert.jsx";
import useAlertContext from "../context/AlertProvider.js";
import { processImageWithOCR, parseOCRText } from "../lib/ocr.js";
import QRScanner from "./QRScanner.jsx";
import icons from "../constants/icons.js";

// Memoized Header Buttons Component
const HeaderButtons = memo(({ onAddExpense, onAddCategory, onListCategories, onScanReceipt, onScanQR }) => (
  <View className="mb-6">
    <View className="flex-row justify-center items-center gap-2 flex-wrap mb-3">
      <CustomButton
        title="Add Expense"
        handlePress={onAddExpense}
        containerStyles="px-3 py-2 rounded-lg flex-1 min-w-[80px]"
        buttoncolor="bg-blue-500"
        textStyles="text-white text-xs text-center"
      />
      <CustomButton
        title="Add Category"
        handlePress={onAddCategory}
        containerStyles="px-3 py-2 rounded-lg flex-1 min-w-[80px]"
        buttoncolor="bg-green-500"
        textStyles="text-white text-xs text-center"
      />
      <CustomButton
        title="List Categories"
        handlePress={onListCategories}
        containerStyles="px-3 py-2 rounded-lg flex-1 min-w-[80px]"
        buttoncolor="bg-orange-500"
        textStyles="text-white text-xs text-center"
      />
    </View>
    
    {/* Scan Actions */}
    <View className="flex-row justify-center items-center gap-4">
      <TouchableOpacity 
        onPress={onScanReceipt}
        className="flex-row items-center gap-1 bg-cyan-100 px-3 py-2 rounded-lg"
      >
        <MaterialIcons name="camera-alt" size={18} color="#0891b2" />
        <Text className="text-cyan-700 text-xs font-pmedium">Scan Receipt</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={onScanQR}
        className="flex-row items-center gap-1 bg-purple-100 px-3 py-2 rounded-lg"
      >
        <MaterialIcons name="qr-code-scanner" size={18} color="#7c3aed" />
        <Text className="text-purple-700 text-xs font-pmedium">Scan QR</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// Memoized Category Item Component
const CategoryItem = memo(({ item, total, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View className="bg-white p-4 rounded-lg mr-2">
      <Text className="font-medium">{item.category_name}</Text>
      <Text className="text-lg">Rs {total?.toFixed(2) || "0.00"}</Text>
    </View>
  </TouchableOpacity>
));

// Memoized Categories List Component
const CategoriesList = memo(({ categories, categoryTotals }) => {
  if (categories.length === 0) {
    return (
      <Text className="text-xl text-cyan-100 font-psemibold mb-2">
        No Categories found.
      </Text>
    );
  }

  return (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <CategoryItem
          item={item}
          total={categoryTotals[item.$id]}
          onPress={() =>
            router.push({
              pathname: "details",
              params: {
                categoryId: item?.$id,
                title: item.category_name,
              },
            })
          }
        />
      )}
      keyExtractor={(item) => item?.$id}
    />
  );
});

// Memoized Expense Item Component
const ExpenseItem = memo(({ item, onLongPress, isSelected, onSelect, onDelete }) => {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(item)}
      onPress={() => onSelect(item)}
    >
      <View className="bg-white p-4 rounded-lg mb-2 flex-row justify-between items-center">
        <View className="flex-1 flex-row gap-2 items-center mr-2">
          <MaterialIcons
            name={isSelected ? "check-box" : "check-box-outline-blank"}
            size={24}
            color="#4630EB"
          />
          <Text className="font-pmedium flex-shrink-1">{item.description}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-lg font-psemibold">
              Rs {parseFloat(item.amount).toFixed(2)}
            </Text>
            <Text className="text-gray-500 text-xs">{formatDate(item.$createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(item)}>
            <MaterialIcons name="delete" size={20} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Memoized Add Expense Modal Component
const AddExpenseModal = memo(
  ({
    visible,
    onClose,
    onAdd,
    categories,
    expense,
    setExpense,
    scannedImage,
  }) => (
    <CustomModal
      modalVisible={visible}
      onSecondaryPress={onClose}
      title="Add Expense"
      primaryButtonText="Add"
      secondaryButtonText="Cancel"
      onPrimaryPress={onAdd}
    >
      <View className="w-full">
        <FormFields
          placeholder="Amount"
          value={expense.amount}
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) => setExpense({ ...expense, amount: text })}
          otherStyles="mb-4"
        />

        <FormFields
          placeholder="Description"
          value={expense.description}
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) =>
            setExpense({ ...expense, description: text })
          }
          otherStyles="mb-4"
        />

        <View
          className={`border rounded-2xl overflow-hidden mb-4 w-full border-gray-400`}
        >
          <Picker
            useNativeAndroidPickerStyle={false}
            selectedValue={expense.categoryId}
            onValueChange={(itemValue) =>
              setExpense({ ...expense, categoryId: itemValue })
            }
            style={{
              backgroundColor: "#E5E7EB",
              color: "gray-800",
            }}
            mode="dropdown"
          >
            <Picker.Item label="Select Category" value="" />
            {categories.map((category) => (
              <Picker.Item
                key={category?.$id}
                label={category.category_name}
                value={category?.$id}
              />
            ))}
          </Picker>
        </View>

        <FormFields
          placeholder="Date"
          value={expense.date || new Date().toISOString().split("T")[0]} // Default to today
          inputfieldcolor="bg-gray-200" // Light gray background
          textcolor="text-gray-800" // Darker text
          bordercolor="border-gray-400" // Gray border
          handleChangeText={(text) => setExpense({ ...expense, date: text })}
          otherStyles="mb-4"
          inputProps={{ type: "date" }} // HTML5 date picker
        />

        {scannedImage && (
          <Image
            source={{ uri: scannedImage }}
            style={{ width: "100%", height: 200, resizeMode: "contain" }}
          />
        )}
      </View>
    </CustomModal>
  )
);

const ExpenseTracker = () => {
  const { userdetails } = useGlobalContext();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0], // Default to today
  });
  const [isExpenseActionModalVisible, setExpenseActionModalVisible] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, alert } = useAlertContext();

  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [isQRScannerVisible, setQRScannerVisible] = useState(false);

  // Memoized category totals calculation
  const categoryTotals = React.useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const categoryId = expense.category?.$id;
      acc[categoryId] = (acc[categoryId] || 0) + parseFloat(expense.amount);
      return acc;
    }, {});
  }, [expenses]);

  const TotalExpenseForMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return expenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.createdAt);
      if (expenseDate.getMonth() === currentMonth) {
        return acc + parseFloat(expense.amount);
      }
      return acc;
    }, 0);
  }, [expenses]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.$id),
        fetchAllExpenses(userdetails.$id),
      ]);
      setCategories(categoriesResponse.documents);
      setExpenses(expensesResponse);
    } catch (error) {
      showAlert("Error", `Error fetching data! - ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [userdetails.$id, showAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.$id),
        fetchAllExpenses(userdetails.$id),
      ]);
      setCategories(categoriesResponse.documents);
      setExpenses(expensesResponse);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const addCategory = useCallback(async () => {
    if (!newCategory.name.trim()) {
      showAlert("Validation Error", "Category name cannot be empty.", "error");
      return;
    }

    try {
      await addCategory(newCategory, userdetails.$id);
      setNewCategory({ name: "" });
      showAlert("Success", "Category added successfully!");
      setCategoryModalVisible(false);
      fetchData();
    } catch (error) {
      showAlert("Error", `Failed to add category! ${error.message}`, "error");
    }
  }, [newCategory, userdetails.$id, fetchData, showAlert]);

  const addExpense = useCallback(async () => {
    // Validate required fields
    if (
      !newExpense.amount ||
      !newExpense.description ||
      !newExpense.categoryId
    ) {
      showAlert(
        "Validation Error",
        "Please fill in all required fields.",
        "error"
      );
      return;
    }

    // Validate amount is a valid number
    const amountValue = parseFloat(newExpense.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      showAlert(
        "Validation Error",
        "Please enter a valid amount greater than 0.",
        "error"
      );
      return;
    }
    const expenseDate = new Date(newExpense.date);
    const today = new Date();
    const expenseDateOnly = new Date(
      expenseDate.getFullYear(),
      expenseDate.getMonth(),
      expenseDate.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (expenseDateOnly > todayOnly) {
      showAlert(
        "Validation Error",
        "Date cannot be greater than today's date",
        "error"
      );
      return;
    }

    try {
      // Prepare expense data with proper amount conversion
      const expenseToAdd = {
        ...newExpense,
        amount: amountValue // Use the validated numeric value (float)
      };
      
      await addExpenses(expenseToAdd, userdetails.$id);
      setNewExpense({ amount: "", description: "", categoryId: "", date: "" });
      showAlert("Success", "Expense added successfully!", "success");
      setExpenseModalVisible(false);
      await fetchData();
    } catch (error) {
      console.log(`Failed to add expense! ${error.message}`)
      showAlert("Error", `Failed to add expense! ${error.message}`, "error");
    }
  }, [newExpense, userdetails.$id, fetchData, showAlert]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;

    try {
      await deleteExpenseById(selectedItem.$id);
      showAlert("Success", "Expense deleted successfully!", "success");
      setExpenseActionModalVisible(false);
      await fetchData();
    } catch (error) {
      showAlert("Error", "Failed to delete expense!", "error");
    } finally {
      setSelectedItem(null);
    }
  }, [selectedItem, fetchData, showAlert]);

  const handleDeleteAllAction = useCallback(async () => {
    // Check if selectedItems is empty (either null, undefined, empty array, or not an array)
    console.log(selectedItems)
    if (
      !selectedItems ||
      !Array.isArray(selectedItems) ||
      selectedItems.length === 0
    ) {
      showAlert("Error", "Please select an entry to delete!", "error");
      setDeleteModalVisible(false);
      return;
    }

    try {
      await deleteAllExpensesById(selectedItems);
      showAlert("Success", "Expenses deleted successfully!", "success");
      setDeleteModalVisible(false);
      await fetchData();
    } catch (error) {
      showAlert("Error", "Failed to delete all expenses!", "error");
    } finally {
      setDeleteModalVisible(false);
    }
  }, [fetchData, showAlert, selectedItems]);

  const handleLongPress = useCallback((item) => {
    setSelectedItem(item);
    setExpenseActionModalVisible(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle select all functionality
  const toggleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedItems([]); // Deselect all
    } else {
      setSelectedItems(expenses.map((expense) => expense.$id)); // Select all expenses
    }
    setSelectAll(!selectAll);
  }, [selectAll, expenses]);

  const handleSelectItem = useCallback((item) => {
    setSelectedItems((prevSelectedItems) => {
      const index = prevSelectedItems.indexOf(item.$id);
      if (index === -1) {
        return [...prevSelectedItems, item.$id]; // Add item to selection
      } else {
        return prevSelectedItems.filter((id) => id !== item.$id); // Remove item from selection
      }
    });
  }, []);

  const handleDeleteAllExpenses = () => {
    if (selectedItems) {
      setDeleteAll(true);
      setDeleteModalVisible(true);
    }
  };

  const handleScanReceipt = async () => {
    console.log('=== RECEIPT SCAN STARTED ===');
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      if (status !== 'granted') {
        console.log('Camera permission denied');
        showAlert('Permission Denied', 'Camera access is required to scan receipts.');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) {
        console.log('Camera canceled by user');
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('Image captured successfully:', imageUri);
      console.log('Image size:', result.assets[0].fileSize || 'Unknown');
      setScannedImage(imageUri);
      setIsLoading(true);

      console.log('=== IMAGE PROCESSING STARTED ===');
      console.log('Resizing and enhancing image for OCR...');
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [
          { resize: { width: 1200 } }, // Increased resolution for better OCR
          { flip: ImageManipulator.FlipType.Vertical }, // Sometimes helps with orientation
          { flip: ImageManipulator.FlipType.Vertical }, // Flip back to original
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      console.log('Image manipulation completed');

      console.log('=== OCR PROCESSING STARTED ===');
      let parsedData = {};
      try {
        console.log('Calling processImageWithOCR...');
        const ocrText = await processImageWithOCR(manipResult.base64);
        console.log('=== OCR RESPONSE ===');
        console.log('Full OCR Text:', ocrText);
        console.log('OCR text length:', ocrText?.length || 0);

        console.log('=== PARSING OCR TEXT ===');
        parsedData = parseOCRText(ocrText);
        console.log('Parsed data result:', JSON.stringify(parsedData, null, 2));
      } catch (ocrError) {
        console.error('=== OCR PROCESS ERROR ===');
        console.error('Error type:', ocrError.name);
        console.error('Error message:', ocrError.message);
        console.error('Full error:', ocrError);
        // Don't throw error, continue with manual entry
        parsedData = {};
      }

      console.log('=== SETTING UP EXPENSE FORM ===');
      // Set up the form with OCR data or defaults
      const expenseData = {
        amount: parsedData.amount ? parseFloat(parsedData.amount).toString() : '',
        description: parsedData.description || (parsedData.amount ? 'Scanned Receipt' : 'Receipt (Manual Entry)'),
        date: parsedData.date || new Date().toISOString().split('T')[0],
      };
      console.log('Setting expense data:', expenseData);
      
      setNewExpense(prev => ({
        ...prev,
        ...expenseData
      }));

      setExpenseModalVisible(true);
      
      if (parsedData.amount) {
        console.log('OCR SUCCESS: Amount detected');
        showAlert('Success', `Receipt scanned successfully! Amount detected: Rs ${parsedData.amount}`);
      } else {
        console.log('OCR PARTIAL: No amount detected');
        showAlert('Info', 'Receipt captured. Please enter the amount manually.');
      }
    } catch (error) {
      console.error('=== RECEIPT SCAN ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      showAlert('OCR Error', `Failed to scan receipt: ${error.message}`);
    } finally {
      console.log('=== RECEIPT SCAN COMPLETED ===');
      setIsLoading(false);
    }
  };

  const handleQRScan = (data, type) => {
    console.log('=== QR SCAN RESULT ===');
    console.log('QR Scan Data:', JSON.stringify(data, null, 2));
    console.log('QR Scan Type:', type);
    console.log('Raw data available:', !!data.rawData);
    console.log('Amount available:', !!data.amount);
    
    setQRScannerVisible(false);
    
    if (type === 'qr' && data.amount) {
      console.log('Processing expense QR code...');
      // Handle expense QR code
      const expenseData = {
        amount: String(data.amount),
        description: data.description || 'QR Code Expense',
        date: data.date || new Date().toISOString().split('T')[0],
      };
      console.log('Setting QR expense data:', expenseData);
      
      setNewExpense(prev => ({
        ...prev,
        ...expenseData
      }));
      
      setExpenseModalVisible(true);
      showAlert('Success', `QR code scanned successfully! Amount: Rs ${data.amount}`);
    } else {
      console.log('Processing generic QR code...');
      // Handle other QR codes or text
      const content = data.rawData || JSON.stringify(data);
      console.log('Generic QR content:', content);
      showAlert('Info', `QR Code Content: ${content}`);
    }
    console.log('=== QR SCAN PROCESSING COMPLETED ===');
  };

  const handleScanQRPress = () => {
    console.log('=== QR SCAN INITIATED ===');
    console.log('Opening QR scanner...');
    setQRScannerVisible(true);
  };

  const handleListCategories = () => {
    router.push('/(tabs)/(tracker)/categoryList');
  };

  const renderHeader = useCallback(
    () => (
      <>
        <View className="mb-6">
          <HeaderButtons
            onAddExpense={() => setExpenseModalVisible(true)}
            onAddCategory={() => setCategoryModalVisible(true)}
            onListCategories={handleListCategories}
            onScanReceipt={handleScanReceipt}
            onScanQR={handleScanQRPress}
          />
        </View>
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-xl text-cyan-100 font-plight mb-2">
            This month total Expense
          </Text>
          <Text className="text-xl text-cyan-100 font-psemibold mb-2">
            Rs {TotalExpenseForMonth.toFixed(2)}
          </Text>
        </View>
        <View className="mb-6">
          <Text className="text-xl text-cyan-100 font-plight mb-2">
            Category
          </Text>
          <CategoriesList
            categories={categories}
            categoryTotals={categoryTotals}
          />
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl text-cyan-100 font-plight">
            Recent Expenses
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={toggleSelectAll}>
              <MaterialIcons
                name={selectAll ? "check-box" : "check-box-outline-blank"}
                size={24}
                color="#e0f2fe"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteAllExpenses}>
              <MaterialIcons name="delete" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {expenses.length === 0 && (
          <Text className="text-xl text-cyan-100 font-psemibold mb-2">
            No expenses found.
          </Text>
        )}
      </>
    ),
    [categories, categoryTotals, expenses.length, selectAll, toggleSelectAll]
  );

  // Memoized Search Input Component
  const SearchInput = memo(({ value, onChange }) => (
    <TextInput
      placeholder="Filter expenses by month..."
      value={value}
      onChangeText={onChange}
      style={{ padding: 10, borderWidth: 1, margin: 10 }}
    />
  ));

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  const tenMostRecent = [...expenses]
    .sort((a, b) => {
      // Use Appwrite's $createdAt for accurate document creation time
      const dateA = new Date(a.$createdAt);
      const dateB = new Date(b.$createdAt);
      return dateB - dateA;
    })
    .slice(0, 10);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-pink-900">
        <ActivityIndicator size="large" color="#5C94C8" />
        <Text className="text-white mt-4">Loading expenses...</Text>
      </View>
    );
  }
  return (
    <View className="flex-1 p-4">

      {alert && (
        <FancyAlert
          isVisible={alert.visible}
          onClose={() => showAlert((prev) => ({ ...prev, visible: false }))}
          title={alert.title}
          message={alert.message}
          variant={alert.type}
          autoClose={true}
          autoCloseTime={3000}
        />
      )}

      <FlatList
        data={tenMostRecent}
        renderItem={({ item }) => (
          <ExpenseItem
            item={item}
            onLongPress={handleLongPress}
            isSelected={selectedItems.includes(item.$id)}
            onSelect={handleSelectItem}
            onDelete={(item) => {
              setSelectedItem(item);
              setExpenseActionModalVisible(true);
            }}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyExtractor={(item) => item?.$id}
      />

      <AddExpenseModal
        visible={isExpenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onAdd={addExpense}
        categories={categories}
        expense={newExpense}
        setExpense={setNewExpense}
        scannedImage={scannedImage}
      />


      <CustomModal
        modalVisible={isCategoryModalVisible}
        onSecondaryPress={() => setCategoryModalVisible(false)}
        title="Add Category"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        onPrimaryPress={addCategory}
      >
        <View className="w-full">
          <FormFields
            placeholder="Category Name"
            value={newCategory.name || ""}
            inputfieldcolor="bg-gray-200"
            textcolor="text-gray-800"
            bordercolor="border-gray-400"
            handleChangeText={(text) =>
              setNewCategory({ ...newCategory, name: text })
            }
            otherStyles="mb-4"
          />
        </View>
      </CustomModal>

      <CustomModal
        title="Are you sure you want to delete this entry?"
        modalVisible={isExpenseActionModalVisible}
        primaryButtonText="Delete"
        onPrimaryPress={handleDelete}
        onSecondaryPress={() => setExpenseActionModalVisible(false)}
      />
      <CustomModal
        title="Are you sure you want to delete the selected entries?"
        modalVisible={isDeleteModalVisible}
        primaryButtonText="Delete"
        onPrimaryPress={handleDeleteAllAction}
        onSecondaryPress={() => setDeleteModalVisible(false)}
      />

      <QRScanner
        visible={isQRScannerVisible}
        onClose={() => setQRScannerVisible(false)}
        onScan={handleQRScan}
      />
    </View>
  );
};

export default memo(ExpenseTracker);
