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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useGlobalContext } from "../context/GlobalProvider.js";
import CustomModal from "./CustomModal.jsx";
import {
  addExpenses,
  deleteAllExpensesById,
  deleteExpenseById,
  fetchAllExpenses,
} from "../lib/APIs/ExpenseApi.js";
import { addaCategory, fetchAllCategories } from "../lib/APIs/CategoryApi.js";
import CustomButton from "./CustomButton.jsx";
import FormFields from "./FormFields.jsx";
import FancyAlert from "./CustomAlert.jsx";
import useAlertContext from "@/context/AlertProvider.js";

// Memoized Header Buttons Component
const HeaderButtons = memo(({ onAddExpense, onAddCategory }) => (
  <View className="flex-row justify-evenly">
    <CustomButton
      title="Add Expense"
      handlePress={onAddExpense}
      fullWidth={false}
      containerStyles="px-4 py-2 rounded-lg w-[100px]"
      buttoncolor="bg-blue-500"
      textStyles="text-white"
    />
    <CustomButton
      title="Add Category"
      handlePress={onAddCategory}
      fullWidth={false}
      containerStyles="px-4 py-2 rounded-lg w-[100px]"
      buttoncolor="bg-green-500"
      textStyles="text-white"
    />
    <CustomButton
      title="List Categories"
      handlePress={() => router.push({ pathname: "categoryList" })}
      fullWidth={false}
      containerStyles="px-4 py-2 rounded-lg w-[100px]"
      buttoncolor="bg-orange-500"
      textStyles="text-white"
    />
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
const ExpenseItem = memo(({ item, onLongPress, isSelected, onSelect }) => {
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
      <View className="bg-white p-4 rounded-lg mb-2 flex-row justify-between">
        <View className="flex-row gap-2 items-center">
          <MaterialIcons
            name={isSelected ? "check-box" : "check-box-outline-blank"}
            size={24}
            color="#4630EB"
          />
          <Text className="font-pmedium">{item.description}</Text>
        </View>
        <View>
          <Text className="text-lg">
            Rs {parseFloat(item.amount).toFixed(2)}
          </Text>
          <Text className="text-gray-500">{formatDate(item.$createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Memoized Add Expense Modal Component
const AddExpenseModal = memo(
  ({ visible, onClose, onAdd, categories, expense, setExpense }) => (
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
  const [searchQuery, setSearchQuery] = useState("");

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
  
const categoryTotalsForMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return expenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.createdAt);
      if (expenseDate.getMonth() === currentMonth) {
        const category_name = expense.category?.category_name;
        acc[category_name] = (acc[category_name] || 0) + parseFloat(expense.amount);
      }
      return acc;
    }, {});
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
      await addaCategory(newCategory, userdetails.$id);
      setNewCategory({ name: "" });
      showAlert("Success", "Category added successfully!");
      setCategoryModalVisible(false);
      fetchData();
    } catch (error) {
      showAlert("Error", `Failed to add category! ${error.message}`, "error");
    }
  }, [newCategory, userdetails.$id, fetchData, showAlert]);

  const addExpense = useCallback(async () => {
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

    try {
      await addExpenses(newExpense, userdetails.$id);
      setNewExpense({ amount: "", description: "", categoryId: "", date: "" });
      showAlert("Success", "Expense added successfully!", "success");
      setExpenseModalVisible(false);
      fetchData();
    } catch (error) {
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
  }, [fetchData]);

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

  const renderHeader = useCallback(
    () => (
      <>
        <View className="mb-6">
          <HeaderButtons
            onAddExpense={() => setExpenseModalVisible(true)}
            onAddCategory={() => setCategoryModalVisible(true)}
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

  const fiveMostRecent = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

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
        data={fiveMostRecent}
        renderItem={({ item }) => (
          <ExpenseItem
            item={item}
            onLongPress={handleLongPress}
            isSelected={selectedItems.includes(item.$id)}
            onSelect={handleSelectItem}
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
        title="Are you sure you want to delete all the entries?"
        modalVisible={isDeleteModalVisible}
        primaryButtonText="Delete"
        onPrimaryPress={handleDeleteAllAction}
        onSecondaryPress={() => setDeleteModalVisible(false)}
      />
    </View>
  );
};

export default memo(ExpenseTracker);
