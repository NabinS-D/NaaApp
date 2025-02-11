import { Text, View } from "react-native";
import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { expensesOfCategory } from "../../../lib/APIs/ExpenseApi";

// Memoized Category Header Component
const CategoryHeader = memo(({ title }) => (
  <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 w-full mb-8">
    <Text className="text-3xl text-cyan-100 font-pbold text-center">
      Category: {title}
    </Text>
  </View>
));

// Memoized Expense Item Component
const ExpenseItem = memo(({ expense, formatDate }) => (
  <View className="bg-white p-4 rounded-lg mb-2 w-full flex-row justify-between">
    <View>
      <Text className="font-pmedium">{expense.description}</Text>
      <Text className="text-gray-500">{formatDate(expense.$createdAt)}</Text>
    </View>
    <Text className="text-lg">
      Rs {parseFloat(expense.amount).toFixed(2)}
    </Text>
  </View>
));

// Memoized Expenses List Component
const ExpensesList = memo(({ expenses, formatDate }) => {
  if (expenses.length === 0) {
    return (
      <Text className="text-cyan-100 font-pbold text-lg">
        No expenses found.
      </Text>
    );
  }

  return expenses.map((expense) => (
    <ExpenseItem
      key={expense.$id}
      expense={expense}
      formatDate={formatDate}
    />
  ));
});

const Details = () => {
  const params = useLocalSearchParams();
  
  // Memoize params processing
  const { categoryId, title } = useMemo(() => ({
    categoryId: Array.isArray(params.categoryId)
      ? params.categoryId[0]
      : params.categoryId,
    title: Array.isArray(params.title) ? params.title[0] : params.title
  }), [params.categoryId, params.title]);

  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Memoized date formatter
  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Memoized fetch function
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await expensesOfCategory(categoryId);
      setExpenses(result);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setError("Failed to fetch expenses");
    }
  }, [categoryId]);

  // Memoized refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error("Refresh error:", error);
      setError("Failed to refresh expenses");
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  // Effect for initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl 
      onRefresh={onRefresh} 
      refreshing={refreshing}
      tintColor="#fff"
      titleColor="#fff"
    />
  ), [onRefresh, refreshing]);

  return (
    <SafeAreaView className="flex-1 bg-pink-900 justify-center">
      <ScrollView refreshControl={refreshControl}>
        <View className="flex-1 px-6 items-center">
          <CategoryHeader title={title} />
          
          {error ? (
            <Text className="text-red-400 font-pbold text-lg">{error}</Text>
          ) : (
            <ExpensesList 
              expenses={expenses} 
              formatDate={formatDate}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(Details);