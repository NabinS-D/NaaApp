import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useGlobalContext } from "../../context/GlobalProvider";
import useAlertContext from "@/context/AlertProvider";
import { PieChart, BarChart } from "react-native-gifted-charts";
import { fetchAllExpenses } from "@/lib/APIs/ExpenseApi";
import { Picker } from "@react-native-picker/picker";
import Modal from "react-native-modal";

export default function Dashboard() {
  const { user, userdetails } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user?.$id]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const expensesResponse = await fetchAllExpenses(userdetails.$id);
      setExpenses(expensesResponse);
    } catch (error) {
      showAlert("Error", `Error fetching data! - ${error}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [userdetails.$id, showAlert]);

  // Calculate category totals and total expenses for the selected month
  const { categoryTotals, totalExpenses } = useMemo(() => {
    const totals = expenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.createdAt);
      if (expenseDate.getMonth() === selectedMonth) {
        const category_name = expense.category?.category_name;
        if (category_name) {
          acc[category_name] =
            (acc[category_name] || 0) + parseFloat(expense.amount);
        }
      }
      return acc;
    }, {});
    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
    return { categoryTotals: totals, totalExpenses: total };
  }, [expenses, selectedMonth]);

  // Transform category totals into PieChart data with percentages and onPress
  const pieChartData = useMemo(() => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#E91E63",
      "#00C4B4",
      "#FF5722",
      "#8BC34A",
      "#3F51B5",
      "#FFC107",
      "#607D8B",
      "#9C27B0",
      "#CDDC39",
    ];
    const data = Object.entries(categoryTotals).map(
      ([category, total], index) => {
        const percentage =
          totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
        return {
          value: percentage,
          color: colors[index % colors.length],
          text: category,
          rawTotal: total,
          onPress: () => {
            setSelectedCategory({ category, total, percentage });
            setIsModalVisible(true);
          },
        };
      }
    );

    // Adjust percentages to ensure they sum to 100 (handle rounding errors)
    const totalPercentage = data.reduce((sum, item) => sum + item.value, 0);
    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) < 1) {
      const largest = data.reduce(
        (max, item, i) => (item.value > data[max].value ? i : max),
        0
      );
      data[largest].value += 100 - totalPercentage;
    }

    return data;
  }, [categoryTotals, totalExpenses]);

  // Transform category totals into BarChart data with totals and onPress
  const barChartData = useMemo(() => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#E91E63",
      "#00C4B4",
      "#FF5722",
      "#8BC34A",
      "#3F51B5",
      "#FFC107",
      "#607D8B",
      "#9C27B0",
      "#CDDC39",
    ];
    return Object.entries(categoryTotals).map(([category, total], index) => {
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
      return {
        value: total,
        label: category,
        frontColor: colors[index % colors.length],
        onPress: () => {
          setSelectedCategory({ category, total, percentage });
          setIsModalVisible(true);
        },
      };
    });
  }, [categoryTotals, totalExpenses]);

  // Calculate dynamic width for BarChart based on number of categories
  const barChartWidth = useMemo(() => {
    const barWidth = 35;
    const spacing = 10;
    const minWidth = 300; // Minimum width for small datasets
    const calculatedWidth = barChartData.length * (barWidth + spacing) + spacing + 20; // Extra padding
    return Math.max(minWidth, calculatedWidth);
  }, [barChartData.length]);

  // Month options for the dropdown
  const months = [
    { label: "January", value: 0 },
    { label: "February", value: 1 },
    { label: "March", value: 2 },
    { label: "April", value: 3 },
    { label: "May", value: 4 },
    { label: "June", value: 5 },
    { label: "July", value: 6 },
    { label: "August", value: 7 },
    { label: "September", value: 8 },
    { label: "October", value: 9 },
    { label: "November", value: 10 },
    { label: "December", value: 11 },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C94C8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-14 mb-2">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">Expense Dashboard</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.totalCard}>
            <Text style={styles.totalCardTitle} className="text-primary text-lg font-pregular">
              Total Expenses for {months[selectedMonth].label}
            </Text>
            <Text style={styles.totalCardAmount}>
              Rs {totalExpenses.toFixed(2)}
            </Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(itemValue) => setSelectedMonth(itemValue)}
              style={styles.picker}
            >
              {months.map((month) => (
                <Picker.Item
                  key={month.value}
                  label={month.label}
                  value={month.value}
                />
              ))}
            </Picker>
          </View>
          {pieChartData.length > 0 ? (
            <>
              <Text style={styles.chartTitle} className="text-primary text-lg font-pregular">Category Distribution</Text>
              <PieChart
                data={pieChartData}
                textColor="black"
                textSize={14}
                radius={150}
                donut
                innerRadius={60}
                showValuesAsLabels
                showTextBackground
                textBackgroundColor="#fff"
                textBackgroundRadius={20}
                animationDuration={800}
              />
              <Text style={styles.chartTitle} className="text-primary text-lg font-pregular">Category Totals</Text>
              <View style={styles.barChartContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.barChartScrollContent}
                >
                  <BarChart
                    data={barChartData}
                    width={barChartWidth}
                    height={200}
                    barWidth={35}
                    spacing={10}
                    noOfSections={5}
                    showValuesAsTopLabel
                    topLabelTextStyle={styles.barLabelText}
                    yAxisTextStyle={styles.barAxisText}
                    xAxisLabelTextStyle={styles.barAxisText}
                    yAxisColor="#F5F5F5"
                    xAxisColor="#F5F5F5"
                    animationDuration={800}
                  />
                </ScrollView>
              </View>
              <View style={styles.legendContainer}>
                {pieChartData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColor,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {item.text}: {item.value.toFixed(1)}% (Rs{" "}
                      {item.rawTotal.toFixed(2)})
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noDataText} className="text-primary text-lg font-pregular">No expenses for this month.</Text>
          )}
        </View>
      </ScrollView>
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Category Details</Text>
          {selectedCategory && (
            <>
              <Text style={styles.modalText}>
                Category: {selectedCategory.category}
              </Text>
              <Text style={styles.modalText}>
                Total: Rs {selectedCategory.total.toFixed(2)}
              </Text>
              <Text style={styles.modalText}>
                Percentage: {selectedCategory.percentage.toFixed(1)}%
              </Text>
            </>
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7C1F4E",
  },
  scrollContent: {
    paddingBottom: 32, // Extra padding to ensure legend is fully visible
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  totalCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: "90%",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 12
  },
  totalCardTitle: {
    fontSize: 18,
    color: "#333",
    marginBottom: 8,
  },
  totalCardAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#C71585",
  },
  pickerContainer: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    width: "100%",
  },
  chartTitle: {
    fontSize: 20,
    color: "#F5F5F5",
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 15
  },
  noDataText: {
    fontSize: 18,
    color: "#F5F5F5",
    marginTop: 20,
    marginBottom: 32,
  },
  legendContainer: {
    marginTop: 16,
    width: "90%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  legendColor: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    fontSize: 16,
    color: "#F5F5F5",
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#C71585",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 18,
    color: "#333",
    marginVertical: 5,
  },
  closeButton: {
    backgroundColor: "#C71585",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#F5F5F5",
    fontWeight: "bold",
  },
  // New styles for BarChart
  barChartContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "90%",
    marginTop: 50
  },
  barChartScrollContent: {
    paddingRight: 20, // Extra padding to ensure last bar is fully visible
  },
  barLabelText: {
    color: "#F5F5F5",
    fontSize: 12,
  },
  barAxisText: {
    color: "#F5F5F5",
    fontSize: 12,
  },
});