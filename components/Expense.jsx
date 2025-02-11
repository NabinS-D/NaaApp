import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Alert,
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

// Memoized Header Buttons Component
const HeaderButtons = memo(({ onAddExpense, onAddCategory }) => (
  <View className="flex-row justify-evenly">
    <TouchableOpacity
      onPress={onAddExpense}
      className="bg-blue-500 px-4 py-2 rounded-lg"
    >
      <Text className="text-white">Add Expense</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onAddCategory}
      className="bg-green-500 px-4 py-2 rounded-lg"
    >
      <Text className="text-white">Add Category</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => router.push({ pathname: "categoryList" })}
      className="bg-orange-500 px-4 py-2 rounded-lg"
    >
      <Text className="text-white">List Categories</Text>
    </TouchableOpacity>
  </View>
));

// Memoized Category Item Component
const CategoryItem = memo(({ item, total, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View className="bg-white p-4 rounded-lg mr-2">
      <Text className="font-medium">{item.category_name}</Text>
      <Text className="text-lg">
        Rs {total?.toFixed(2) || "0.00"}
      </Text>
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
          <Text className="text-gray-500">
            {formatDate(item.$createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Memoized Add Expense Modal Component
const AddExpenseModal = memo(({ visible, onClose, onAdd, categories, expense, setExpense }) => (
  <CustomModal
    modalVisible={visible}
    onSecondaryPress={onClose}
    title="Add Expense"
    primaryButtonText="Add"
    secondaryButtonText="Cancel"
    onPrimaryPress={onAdd}
  >
    <View className="w-full">
      <TextInput
        className="border border-gray-300 rounded-lg p-2 mb-2 w-full"
        placeholder="Amount"
        keyboardType="numeric"
        value={expense.amount}
        onChangeText={(text) => setExpense({ ...expense, amount: text })}
      />
      <TextInput
        className="border border-gray-300 rounded-lg p-2 mb-2 w-full"
        placeholder="Description"
        value={expense.description}
        onChangeText={(text) => setExpense({ ...expense, description: text })}
      />
      <View className="border border-gray-300 rounded-lg overflow-hidden mb-4 w-full">
        <Picker
          selectedValue={expense.categoryId}
          onValueChange={(itemValue) =>
            setExpense({ ...expense, categoryId: itemValue })
          }
          style={{ backgroundColor: "white" }}
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
));

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
  const [isExpenseActionModalVisible, setExpenseActionModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      setError(null);
      const [categoriesResponse, expensesResponse] = await Promise.all([
        fetchAllCategories(userdetails.$id),
        fetchAllExpenses(userdetails.$id)
      ]);
      setCategories(categoriesResponse.documents);
      setExpenses(expensesResponse);
    } catch (error) {
      setError("Failed to fetch data");
      Alert.alert("Error", `Error fetching data! - ${error}`);
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
      Alert.alert("Validation Error", "Please enter a category name.");
      return;
    }

    try {
      await addaCategory(newCategory, userdetails.$id);
      setNewCategory({ name: "" });
      setCategoryModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert("Error", `Error adding category! - ${error.message}`);
    }
  }, [newCategory, userdetails.$id, fetchData]);

  const addExpense = useCallback(async () => {
    if (!newExpense.amount || !newExpense.description || !newExpense.categoryId) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      await addExpenses(newExpense, userdetails.$id);
      setNewExpense({ amount: "", description: "", categoryId: "" });
      setExpenseModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert("Error", `Failed to add expense! ${error.message}`);
    }
  }, [newExpense, userdetails.$id, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;

    try {
      await deleteExpenseById(selectedItem.$id);
      await fetchData();
    } catch (error) {
      Alert.alert("Error", "Failed to delete expense");
    } finally {
      setExpenseActionModalVisible(false);
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

  const renderHeader = useCallback(() => (
    <>
      <View className="mb-6">
        <HeaderButtons
          onAddExpense={() => setExpenseModalVisible(true)}
          onAddCategory={() => setCategoryModalVisible(true)}
        />
      </View>

      <View className="mb-6">
        <Text className="text-xl text-cyan-100 font-plight mb-2">Category</Text>
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
  ), [categories, categoryTotals, expenses.length]);

  return (
    <View className="flex-1 p-4">
      {error ? (
        <Text className="text-red-500 text-center">{error}</Text>
      ) : (
        <>
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
              <TextInput
                className="border border-gray-300 rounded-lg p-2 mb-4"
                placeholder="Category Name"
                value={newCategory.name}
                onChangeText={(text) =>
                  setNewCategory({ ...newCategory, name: text })
                }
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
        </>
      )}
    </View>
  );
};

export default memo(ExpenseTracker);