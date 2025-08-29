import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import CustomButton from './CustomButton';

const CSVUploader = ({
  visible,
  onClose,
  onUploadComplete,
  categories,
  userId
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('select'); // select, preview, mapping, confirm

  // Column mapping options
  const fieldOptions = [
    { key: 'amount', label: 'Amount', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'date', label: 'Date', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'ignore', label: 'Ignore Column', required: false }
  ];

  // Common column name variations
  const columnVariations = {
    amount: ['amount', 'cost', 'price', 'total', 'value', 'expense'],
    description: ['description', 'details', 'item', 'expense', 'note', 'title'],
    category: ['category', 'type', 'group', 'classification'],
    date: ['date', 'transaction date', 'created', 'when', 'timestamp'],
    notes: ['notes', 'memo', 'comment', 'remarks']
  };

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        await parseFile(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file: ' + error.message);
    }
  };

  const parseFile = async (file) => {
    setIsProcessing(true);
    try {
      const response = await fetch(file.uri);
      const fileContent = await response.text();

      let parsedResult;

      if (file.name.toLowerCase().endsWith('.csv')) {
        // Parse CSV
        parsedResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase()
        });

        if (parsedResult.errors.length > 0) {
          Alert.alert('Parse Error', 'CSV parsing failed: ' + parsedResult.errors[0].message);
          return;
        }

        setParsedData(parsedResult.data);
      } else {
        // Parse Excel
        const workbook = XLSX.read(fileContent, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        });

        if (jsonData.length < 2) {
          Alert.alert('Error', 'Excel file must have at least a header row and one data row');
          return;
        }

        // Convert to Papa Parse format
        const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
        const rows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        setParsedData(rows);
      }

      // Auto-detect column mapping
      autoDetectColumns(Object.keys(parsedData[0] || {}));
      setCurrentStep('preview');

    } catch (error) {
      Alert.alert('Error', 'Failed to parse file: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const autoDetectColumns = (headers) => {
    const mapping = {};

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();

      // Find best match for each field
      for (const [field, variations] of Object.entries(columnVariations)) {
        if (variations.some(variation => normalizedHeader.includes(variation))) {
          if (!mapping[field]) { // Only assign if not already mapped
            mapping[header] = field;
            break;
          }
        }
      }

      // If no match found, default to ignore
      if (!mapping[header]) {
        mapping[header] = 'ignore';
      }
    });

    setColumnMapping(mapping);
  };

  const validateMapping = () => {
    const requiredFields = fieldOptions.filter(f => f.required).map(f => f.key);
    const mappedFields = Object.values(columnMapping);

    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please map the following required fields: ${missingFields.join(', ')}`
      );
      return false;
    }

    return true;
  };

  const processData = async () => {
    if (!validateMapping()) return;

    setIsProcessing(true);
    try {
      const processedExpenses = [];
      const errors = [];

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const expense = {};

        // Map columns to expense fields
        Object.entries(columnMapping).forEach(([csvColumn, expenseField]) => {
          if (expenseField !== 'ignore') {
            expense[expenseField] = row[csvColumn];
          }
        });

        // Validate and process each expense
        try {
          // Validate amount
          const amount = parseFloat(expense.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 1}: Invalid amount "${expense.amount}"`);
            continue;
          }

          // Validate description
          if (!expense.description || expense.description.trim() === '') {
            errors.push(`Row ${i + 1}: Description is required`);
            continue;
          }

          // Process category
          let categoryId = null;
          if (expense.category) {
            const matchedCategory = categories.find(cat =>
              cat.category_name.toLowerCase() === expense.category.toLowerCase()
            );
            categoryId = matchedCategory ? matchedCategory.$id : null;
          }

          // Process date
          let processedDate = new Date().toISOString();
          if (expense.date) {
            const parsedDate = new Date(expense.date);
            if (!isNaN(parsedDate.getTime())) {
              processedDate = parsedDate.toISOString();
            }
          }

          processedExpenses.push({
            amount: amount,
            description: expense.description.trim(),
            categoryId: categoryId,
            notes: expense.notes || '',
            createdAt: processedDate
          });

        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        Alert.alert(
          'Processing Errors',
          `${errors.length} rows had errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`
        );
      }

      if (processedExpenses.length === 0) {
        Alert.alert('Error', 'No valid expenses found to import');
        return;
      }

      // Pass processed data back to parent
      onUploadComplete(processedExpenses);
      resetState();
      onClose();

    } catch (error) {
      Alert.alert('Error', 'Failed to process data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setParsedData([]);
    setColumnMapping({});
    setCurrentStep('select');
  };

  const renderFileSelection = () => (
    <View className="items-center py-8">
      <MaterialIcons name="cloud-upload" size={64} color="#6B7280" />
      <Text className="text-lg font-pmedium text-gray-700 mt-4 mb-2">
        Upload CSV or Excel File
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        Select a file containing your expense data
      </Text>
      <CustomButton
        title="Select File"
        handlePress={selectFile}
        containerStyles="px-8 py-3 rounded-xl"
        buttoncolor="bg-blue-600"
        textStyles="text-white font-psemibold"
      />
    </View>
  );

  const renderPreview = () => (
    <View>
      <Text className="text-lg font-pmedium text-gray-700 mb-4">
        File Preview: {selectedFile?.name}
      </Text>
      <Text className="text-sm text-gray-600 mb-4">
        Found {parsedData.length} rows. First 3 rows:
      </Text>

      <ScrollView horizontal className="mb-4">
        <View className="bg-gray-50 p-3 rounded-lg">
          {parsedData.slice(0, 3).map((row, index) => (
            <View key={index} className="mb-2">
              <Text className="font-pmedium text-xs text-gray-600">Row {index + 1}:</Text>
              <Text className="text-xs text-gray-800">
                {JSON.stringify(row, null, 2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="flex-row gap-3">
        <CustomButton
          title="Back"
          handlePress={() => setCurrentStep('select')}
          containerStyles="flex-1 py-3 rounded-xl"
          buttoncolor="bg-gray-500"
          textStyles="text-white font-pmedium"
        />
        <CustomButton
          title="Next: Map Columns"
          handlePress={() => setCurrentStep('mapping')}
          containerStyles="flex-1 py-3 rounded-xl"
          buttoncolor="bg-blue-600"
          textStyles="text-white font-pmedium"
        />
      </View>
    </View>
  );

  const renderColumnMapping = () => (
    <View>
      <Text className="text-lg font-pmedium text-gray-700 mb-4">
        Map CSV Columns to Expense Fields
      </Text>

      <ScrollView className="max-h-80 mb-4">
        {Object.keys(parsedData[0] || {}).map(csvColumn => (
          <View key={csvColumn} className="flex-row items-center justify-between py-2 border-b border-gray-200">
            <Text className="flex-1 text-sm font-pmedium text-gray-700">
              {csvColumn}
            </Text>
            <View className="flex-1">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {fieldOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setColumnMapping(prev => ({
                        ...prev,
                        [csvColumn]: option.key
                      }))}
                      className={`px-3 py-1 rounded-full ${columnMapping[csvColumn] === option.key
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                        }`}
                    >
                      <Text className={`text-xs ${columnMapping[csvColumn] === option.key
                          ? 'text-white font-pmedium'
                          : 'text-gray-600'
                        }`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row gap-3">
        <CustomButton
          title="Back"
          handlePress={() => setCurrentStep('preview')}
          containerStyles="flex-1 py-3 rounded-xl"
          buttoncolor="bg-gray-500"
          textStyles="text-white font-pmedium"
        />
        <CustomButton
          title="Import Expenses"
          handlePress={processData}
          containerStyles="flex-1 py-3 rounded-xl"
          buttoncolor="bg-green-600"
          textStyles="text-white font-pmedium"
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-lg p-6 w-11/12 max-h-5/6">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-psemibold text-gray-800">
              Import Expenses
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isProcessing && (
            <View className="absolute inset-0 bg-white/90 rounded-lg flex-1 justify-center items-center z-10">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="mt-2 text-gray-600">Processing...</Text>
            </View>
          )}

          {/* Content based on current step */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {currentStep === 'select' && renderFileSelection()}
            {currentStep === 'preview' && renderPreview()}
            {currentStep === 'mapping' && renderColumnMapping()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default CSVUploader;
