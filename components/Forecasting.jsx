import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useGlobalContext } from '../context/GlobalProvider';
import { fetchAllExpenses } from '../lib/APIs/ExpenseApi';

const Forecasting = () => {
  const { userdetails } = useGlobalContext();
  const [forecast, setForecast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userdetails) {
      generateForecast();
    }
  }, [userdetails]);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const expenses = await fetchAllExpenses(userdetails.$id);

      if (expenses.length < 3) { // Need sufficient data for a meaningful forecast
        setForecast('Add a few more expenses to generate a forecast!');
        return;
      }

      const now = new Date();
      const monthlySpending = {};

      // Aggregate spending by month for the last 3 months
      for (let i = 0; i < 3; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();
        monthlySpending[`${year}-${month}`] = 0;
      }

      expenses.forEach(expense => {
        const expenseDate = new Date(expense.createdAt);
        const year = expenseDate.getUTCFullYear();
        const month = expenseDate.getUTCMonth();
        const key = `${year}-${month}`;
        if (monthlySpending.hasOwnProperty(key)) {
          monthlySpending[key] += expense.amount;
        }
      });

      const spendingValues = Object.values(monthlySpending).filter(amount => amount > 0);
      if (spendingValues.length === 0) {
        setForecast('No recent spending data to generate a forecast.');
        return;
      }

      const averageSpending = spendingValues.reduce((sum, amount) => sum + amount, 0) / spendingValues.length;

      setForecast(`Based on your recent activity, you're on track to spend around Rs ${averageSpending.toFixed(2)} next month.`);

    } catch (error) {
      console.error('Error generating forecast:', error);
      setForecast('Could not generate a forecast at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-purple-800 p-4 rounded-lg my-4 mx-2">
      <Text className="text-white font-pbold text-lg mb-2">Spending Forecast</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text className="text-purple-200 font-pregular">{forecast}</Text>
      )}
    </View>
  );
};

export default Forecasting;
