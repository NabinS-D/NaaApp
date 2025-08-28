import { useState, useCallback, useMemo } from "react";
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
import useAlertContext from "../../context/AlertProvider";
import { PieChart, BarChart } from "react-native-gifted-charts";
import { fetchAllExpenses } from "../../lib/APIs/ExpenseApi";
import { Picker } from "@react-native-picker/picker";
import Modal from "react-native-modal";
import { useFocusEffect } from "@react-navigation/native";
import DatePicker from "react-native-date-picker";
import RNFS from "react-native-fs";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import { openDocumentTree, writeFile } from "react-native-saf-x";
import Entypo from "react-native-vector-icons/Entypo";

export default function Dashboard() {
  const { userdetails } = useGlobalContext();
  const { showAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [filterMode, setFilterMode] = useState("month"); // "month" or "range"
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [fileFormat, setFileFormat] = useState("pdf"); // "csv" or "pdf"
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerType, setDatePickerType] = useState(null); // "start" or "end"

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.createdAt);
      if (filterMode === "month") {
        return expenseDate.getMonth() === selectedMonth;
      } else {
        return expenseDate >= startDate && expenseDate <= endDate;
      }
    });
  }, [expenses, filterMode, selectedMonth, startDate, endDate]);

  // Calculate category totals and total expenses for the filtered data
  const { categoryTotals, totalExpenses } = useMemo(() => {
    // Use filteredExpenses instead of expenses
    const totals = filteredExpenses.reduce((acc, expense) => {
      const category_name = expense.category?.category_name;
      if (category_name) {
        acc[category_name] =
          (acc[category_name] || 0) + parseFloat(expense.amount);
      }
      return acc;
    }, {});
    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
    return { categoryTotals: totals, totalExpenses: total };
  }, [filteredExpenses]);

  // Function to save file using SAF
  const saveFileWithSAF = async (
    content,
    fileName,
    mimeType,
    encoding = "utf8"
  ) => {
    try {
      // Open document tree picker to let user select directory
      const directoryResult = await openDocumentTree(true);

      // Check if the result is null (user canceled)
      if (!directoryResult) {
        return {
          success: false,
          canceled: true,
          message: "Directory selection was canceled",
        };
      }

      //check for uri instead of granted
      const { uri } = directoryResult;

      if (!uri) {
        return {
          success: false,
          canceled: true,
          message: "Directory access not granted - no URI returned",
        };
      }

      // Create the file path in the selected directory
      const filePath = `${uri}/${fileName}`;

      // Write content to the file (this will create the file if it doesn't exist)
      await writeFile(filePath, content, {
        encoding: encoding,
        mimeType: mimeType,
      });

      return {
        success: true,
        uri: filePath,
        message: `File saved successfully: ${fileName}`,
      };
    } catch (error) {
      console.error("SAF Save Error:", error);
      return {
        success: false,
        error: error.message,
        message: `Failed to save file: ${error.message}`,
      };
    }
  };
  // Function to generate and save CSV using SAF
  const generateCSVFile = async () => {
    try {
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split("T")[0];
      const randomNumber = Math.floor(Math.random() * 10);
      const fileName = `NaaApp_Expenses_${timestamp}_${randomNumber}.csv`;

      // Define CSV content
      const header = "Date,Category,Amount,Description\n";
      const rows = filteredExpenses
        .map((expense) => {
          const date = new Date(expense.createdAt).toISOString().split("T")[0];
          const escapeCsv = (str) =>
            str ? `"${str.replace(/"/g, '""')}"` : "N/A";
          return `${date},${escapeCsv(expense.category?.category_name)},${
            expense.amount
          },${escapeCsv(expense.description)}`;
        })
        .join("\n");
      const csvContent = header + rows;

      // Save using SAF
      const result = await saveFileWithSAF(csvContent, fileName, "text/csv");

      if (result.success) {
        showAlert("Success", result.message, "success");
      } else if (result.canceled) {
        showAlert("Info", "Save location selection canceled.", "info");
      } else {
        showAlert("Error", result.message, "error");
      }
    } catch (error) {
      console.error("CSV Generation Error:", error);
      showAlert("Error", `Failed to generate CSV: ${error.message}`, "error");
    }
  };

  // Function to generate and save PDF using SAF
  const generatePDF = async () => {
    try {
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split("T")[0];
      const randomNumber = Math.floor(Math.random() * 100000);
      const fileName = `NaaApp_Expenses_${timestamp}_${randomNumber}.pdf`;

      // Generate HTML for PDF
      const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #C71585; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #C71585; color: white; }
            tr:nth-child(even) { background-color: #F5F5F5; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>NaaApp Expenses Report</h1>
          <p>Generated on: ${timestamp}</p>
          <p>Period: ${
            filterMode === "month"
              ? months[selectedMonth].label
              : `${startDate.toISOString().split("T")[0]} to ${
                  endDate.toISOString().split("T")[0]
                }`
          }</p>
          <table>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Amount (Rs)</th>
              <th>Description</th>
            </tr>
            ${filteredExpenses
              .map(
                (expense) => `
                  <tr>
                    <td>${
                      new Date(expense.createdAt).toISOString().split("T")[0]
                    }</td>
                    <td>${expense.category?.category_name || "N/A"}</td>
                    <td>${parseFloat(expense.amount).toFixed(1)}</td>
                    <td>${expense.description || "N/A"}</td>
                  </tr>
                `
              )
              .join("")}
            <tr class="total">
              <td colspan="2">Total</td>
              <td>${totalExpenses.toFixed(1)}</td>
              <td></td>
            </tr>
          </table>
        </body>
      </html>
    `;

      // Create temporary PDF file
      const tempFileName = fileName.replace(".pdf", "");
      const options = {
        html: htmlContent,
        fileName: tempFileName,
        directory: RNFS.CachesDirectoryPath, // Use cache directory for temp files
      };

      const pdf = await RNHTMLtoPDF.convert(options);

      // Read the PDF file as base64
      const pdfContent = await RNFS.readFile(pdf.filePath, "base64");

      // Save using SAF
      const result = await saveFileWithSAF(
        pdfContent,
        fileName,
        "application/pdf",
        "base64"
      );

      // Clean up temporary file
      try {
        await RNFS.unlink(pdf.filePath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp PDF file:", cleanupError);
      }

      if (result.success) {
        showAlert("Success", result.message, "success");
      } else if (result.canceled) {
        // Save location selection canceled
      } else {
        showAlert("Error", result.message, "error");
      }
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showAlert("Error", `Failed to generate PDF: ${error.message}`, "error");
    }
  };

  // Function to handle download with validation
  const handleDownload = async () => {
    // Validate that there are expenses to export
    if (filteredExpenses.length === 0) {
      showAlert(
        "Error",
        "No expenses to export for the selected period.",
        "error"
      );
      return;
    }

    // Validate date range if using custom range
    if (filterMode === "range" && startDate > endDate) {
      showAlert("Error", "Start date cannot be after end date.", "error");
      return;
    }

    try {
      if (fileFormat === "csv") {
        await generateCSVFile();
      } else if (fileFormat === "pdf") {
        await generatePDF();
      }
    } catch (error) {
      console.error("Download Error:", error);
      showAlert("Error", `Download failed: ${error.message}`, "error");
    }
  };

  // Transform category totals into PieChart data with percentages and labels
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
        
        // Create shortened category name for display
        const shortName = category.length > 8 ? category.substring(0, 8) + '...' : category;
        
        return {
          value: total, // Use actual value instead of percentage for better label visibility
          color: colors[index % colors.length],
          text: `${shortName}\n${percentage.toFixed(1)}%`,
          labelText: `${category}: ${percentage.toFixed(1)}%`,
          rawTotal: total,
          categoryName: category,
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
      // Update the text with corrected percentage
      const correctedPercentage = data[largest].value;
      const shortName = data[largest].categoryName.length > 8 ? 
        data[largest].categoryName.substring(0, 8) + '...' : 
        data[largest].categoryName;
      data[largest].text = `${shortName}\n${correctedPercentage.toFixed(1)}%`;
      data[largest].labelText = `${data[largest].categoryName}: ${correctedPercentage.toFixed(1)}%`;
    }

    return data;
  }, [categoryTotals, totalExpenses]);

  // Function to show detailed modal (only called from legend)
  const showDetailedModal = (item) => {
    const categoryExpenses = filteredExpenses.filter(
      (expense) => expense.category?.category_name?.trim() === item.categoryName.trim()
    );
    setSelectedCategory({
      category: item.text,
      total: item.rawTotal,
      percentage: item.value,
      expenses: categoryExpenses,
      color: item.color,
    });
    setIsModalVisible(true);
  };

  // Map categories to icons (customize as needed)
  const categoryIcons = {
    Food: "fast-food-outline",
    Travel: "car-outline",
    Shopping: "cart-outline",
    Bills: "cash-outline",
    Other: "wallet-outline",
    // Add more mappings for your categories
  };

  // Transform category totals into BarChart data (no onPress for bar chart)
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
      return {
        value: total,
        label: category,
        frontColor: colors[index % colors.length],
        // Removed onPress from bar chart data
      };
    });
  }, [categoryTotals, totalExpenses]);

  // Calculate dynamic width for BarChart based on number of categories
  const barChartWidth = useMemo(() => {
    const barWidth = 35;
    const spacing = 10;
    const minWidth = 300; // Minimum width for small datasets
    const calculatedWidth =
      barChartData.length * (barWidth + spacing) + spacing + 20; // Extra padding
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
    <SafeAreaView style={styles.container}>
      <View className="py-4 px-4 bg-pink-700 rounded-lg mx-4 mt-14 mb-2">
        <Text className="text-2xl text-cyan-100 font-pbold text-center">
          Expense Dashboard
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View className="w-full mb-4 bg-white rounded-lg p-4 shadow-md mt-4 flex items-center justify-center">
            <Text
              style={styles.totalCardTitle}
              className="text-primary text-lg font-pregular"
            >
              Total Expenses for{" "}
              {filterMode === "month"
                ? months[selectedMonth].label
                : "the selected range"}
            </Text>
            <Text style={styles.totalCardAmount}>
              Rs {totalExpenses.toFixed(2)}
            </Text>
          </View>
          <View className="w-full mb-4 bg-slate-50 rounded-lg p-4">
            <Text className="text-primary text-xl font-pregular mb-4 text-center">
              Filter by {filterMode === "month" ? "Month" : "Date Range"}
            </Text>

            {/* Filter toggle for Month vs. Custom Range */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  filterMode === "month" && styles.toggleButtonActive,
                ]}
                onPress={() => setFilterMode("month")}
              >
                <Text style={styles.toggleButtonText}>Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  filterMode === "range" && styles.toggleButtonActive,
                ]}
                onPress={() => setFilterMode("range")}
              >
                <Text style={styles.toggleButtonText}>Custom Range</Text>
              </TouchableOpacity>
            </View>

            {/* Conditionally render month picker or date range picker */}
            {filterMode === "month" ? (
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(itemValue) => setSelectedMonth(itemValue)}
              >
                {months.map((month) => (
                  <Picker.Item
                    key={month.value}
                    label={month.label}
                    value={month.value}
                    style={styles.formatPicker}
                  />
                ))}
              </Picker>
            ) : (
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    setDatePickerType("start");
                    setIsDatePickerOpen(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>
                    {startDate.toISOString().split("T")[0]}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    setDatePickerType("end");
                    setIsDatePickerOpen(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>
                    {endDate.toISOString().split("T")[0]}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Download UI: File format selector and download button */}
            <View>
              <View className="flex-row items-center justify-between">
                <Picker
                  selectedValue={fileFormat}
                  onValueChange={(itemValue) => setFileFormat(itemValue)}
                  style={styles.formatPicker}
                >
                  <Picker.Item label="CSV" value="csv" />
                  <Picker.Item label="PDF" value="pdf" />
                </Picker>
                <TouchableOpacity onPress={handleDownload}>
                  <Entypo name="download" color="#000" size={24} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {pieChartData.length > 0 ? (
            <>
              <Text
                style={styles.chartTitle}
                className="text-primary text-lg font-pregular"
              >
                Category Distribution
              </Text>
              <PieChart
                data={pieChartData}
                radius={120}
                donut
                innerRadius={50}
                animationDuration={800}
                strokeColor="white"
                strokeWidth={2}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                      Total
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      Rs {totalExpenses.toFixed(0)}
                    </Text>
                  </View>
                )}
              />
              <Text
                style={styles.chartTitle}
                className="text-primary text-lg font-pregular"
              >
                Category Totals
              </Text>
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
                    <TouchableOpacity onPress={() => showDetailedModal(item)}>
                      <Text style={styles.legendText}>
                        {item.categoryName}: {item.value.toFixed(1)}% (Rs{" "}
                        {item.rawTotal.toFixed(2)})
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text
              style={styles.noDataText}
              className="text-primary text-lg font-pregular"
            >
              No expenses for this{" "}
              {filterMode === "month" ? "month" : "date range"}.
            </Text>
          )}
        </View>
      </ScrollView>
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modal}
        backdropOpacity={0.5}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: selectedCategory?.color || "#C71585" },
                ]}
              >
                <Text style={styles.categoryIconText}>
                  {selectedCategory?.category?.charAt(0) || "C"}
                </Text>
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Category Details</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedCategory?.category}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Entypo name="cross" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Category Summary Cards */}
          {selectedCategory && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.summaryValue}>
                  Rs {selectedCategory.total.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Percentage</Text>
                <Text style={styles.summaryValue}>
                  {selectedCategory.percentage.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Transactions</Text>
                <Text style={styles.summaryValue}>
                  {selectedCategory.expenses?.length || 0}
                </Text>
              </View>
            </View>
          )}

          {/* Expenses List */}
          {selectedCategory &&
          selectedCategory.expenses &&
          selectedCategory.expenses.length > 0 ? (
            <View style={styles.expenseSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Transactions</Text>
                <View style={styles.transactionBadge}>
                  <Text style={styles.transactionBadgeText}>
                    {selectedCategory.expenses.length}
                  </Text>
                </View>
              </View>
              <ScrollView
                style={styles.expenseList}
                contentContainerStyle={styles.expenseListContent}
              >
                {selectedCategory.expenses.map((expense) => (
                  <View
                    key={expense.$id}
                    className="flex-row justify-between items-center bg-white p-4 mb-4 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <Text 
                      className="font-pmedium text-base text-gray-800 text-left flex-1 pr-2"
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {expense.description || "No description"}
                    </Text>
                    <View className="flex-col">
                      <Text className="text-sm text-gray-600 mb-1">
                        Amount: Rs {expense.amount}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {formatDate(expense.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Quick Stats Footer */}
              <View style={styles.quickStatsContainer}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>
                    Rs{" "}
                    {(
                      selectedCategory.total / selectedCategory.expenses.length
                    ).toFixed(2)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Avg per transaction</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>
                    Rs{" "}
                    {Math.max(
                      ...selectedCategory.expenses.map((e) =>
                        parseFloat(e.amount)
                      )
                    ).toFixed(2)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Highest amount</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Entypo name="folder" size={48} color="#DDD" />
              <Text style={styles.noDataText}>
                {selectedCategory
                  ? "No transactions found for this category"
                  : "No category selected"}
              </Text>
              <Text style={styles.noDataSubtext}>
                Start adding expenses to see them here
              </Text>
            </View>
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* DatePicker modal for selecting start and end dates */}
      <DatePicker
        modal
        open={isDatePickerOpen}
        date={datePickerType === "start" ? startDate : endDate}
        onConfirm={(date) => {
          if (datePickerType === "start") {
            setStartDate(date);
          } else {
            setEndDate(date);
          }
          setIsDatePickerOpen(false);
        }}
        onCancel={() => setIsDatePickerOpen(false)}
        mode="date"
      />
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
  picker: {
    width: "100%",
  },
  chartTitle: {
    fontSize: 20,
    color: "#F5F5F5",
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 15,
  },
  noDataText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  legendContainer: {
    marginTop: 16,
    width: "100%",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#C71585",
  },
  modalText: {
    fontSize: 18,
    color: "#333",
    marginVertical: 5,
  },
  closeIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  expenseSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  transactionBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1976D2",
  },
  expenseList: {
    width: "100%",
    marginTop: 10,
    minHeight: 100, // Ensure visibility
  },
  expenseCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 60, // Ensure cards have a minimum height
    borderWidth: 1, // Add a border to debug visibility
    borderColor: "#ccc",
  },
  expenseMainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  expenseLeftContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  expenseMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseDate: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  expenseTime: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expenseRightContent: {
    alignItems: "flex-end",
  },
  expenseAmountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  expenseAmountIndicator: {
    alignItems: "center",
  },
  expenseAmountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expenseFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  expenseStats: {
    alignItems: "flex-start",
  },
  expenseStatsText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  quickStatsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  quickStat: {
    flex: 1,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 4,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#C71585",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "600",
  },
  barChartContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "90%",
    marginTop: 50,
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
  toggleButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "grey",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: "#C71585",
  },
  toggleButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  dateButton: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  formatPicker: {
    height: 50,
    width: "85%",
    color: "#333",
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginVertical: 10,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    flex: 1, // Ensure modal content uses available space
  },
  expenseSection: {
    flex: 1,
    marginBottom: 20,
    width: "100%", // Ensure it takes full width
  },
  expenseList: {
    width: "100%",
    marginTop: 10,
    maxHeight: 250, // Constrain height to leave space for button
    zIndex: 1, // Ensure list is above other elements
  },
  expenseListContent: {
    paddingBottom: 20, // Add padding to ensure last item is visible
  },
  closeButton: {
    backgroundColor: "#C71585",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16, // Increase margin to separate from ScrollView
    width: "100%", // Ensure button takes full width
    zIndex: 2, // Ensure button is above ScrollView
  },
});
