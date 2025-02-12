import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useGlobalContext } from "../context/GlobalProvider.js";
import CustomModal from "./CustomModal.jsx";
import {
  addExpenses,
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
const ExpenseItem = memo(({ item, onLongPress }) => {
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
    <TouchableOpacity onLongPress={() => onLongPress(item)}>
      <View className="bg-white p-4 rounded-lg mb-2 flex-row justify-between">
        <View className="flex-row gap-2 items-center">
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
  });
  const [isExpenseActionModalVisible, setExpenseActionModalVisible] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlertContext();
  // Memoized category totals calculation
  const categoryTotals = React.useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const categoryId = expense.category?.$id;
      acc[categoryId] = (acc[categoryId] || 0) + parseFloat(expense.amount);
      return acc;
    }, {});
  }, [expenses]);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.$id),
        fetchAllExpenses(userdetails.$id),
      ]);
      setCategories(categoriesResponse.documents);
      setExpenses(expensesResponse);
    } catch (error) {
      showAlert("Error", `Error fetching data! - ${error}`, "error");
    }
  }, [userdetails.$id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
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
  }, [newCategory, userdetails.$id, fetchData]);

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
      setNewExpense({ amount: "", description: "", categoryId: "" });
      showAlert("Success", "Expense added successfully!", "success");
      setExpenseModalVisible(false);
      fetchData();
    } catch (error) {
      showAlert("Error", `Failed to add expense! ${error.message}`, "error");
    }
  }, [newExpense, userdetails.$id, fetchData]);

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
  }, [selectedItem, fetchData]);

  const handleLongPress = useCallback((item) => {
    setSelectedItem(item);
    setExpenseActionModalVisible(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderHeader = useCallback(
    () => (
      <>
        <View className="mb-6">
          <HeaderButtons
            onAddExpense={() => setExpenseModalVisible(true)}
            onAddCategory={() => setCategoryModalVisible(true)}
          />
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

        <Text className="text-xl text-cyan-100 font-plight mb-2">
          Recent Expenses
        </Text>

        {expenses.length === 0 && (
          <Text className="text-xl text-cyan-100 font-psemibold mb-2">
            No expenses found.
          </Text>
        )}
      </>
    ),
    [categories, categoryTotals, expenses.length]
  );

  return (
    <View className="flex-1 p-4">
      <FancyAlert
        isVisible={alert?.visible}
        onClose={() => showAlert((prev) => ({ ...prev, visible: false }))}
        title={alert?.title}
        message={alert?.message}
        variant={alert?.type}
        autoClose={true}
        autoCloseTime={3000}
      />

      <FlatList
        data={expenses}
        renderItem={({ item }) => (
          <ExpenseItem item={item} onLongPress={handleLongPress} />
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
            value={newCategory.name}
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
    </View>
  );
};

export default memo(ExpenseTracker);
