import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import CustomButton from './CustomButton';

const ExpenseFilter = memo(({ 
  visible, 
  onClose, 
  onApplyFilters, 
  categories, 
  currentFilters 
}) => {
  const [filters, setFilters] = useState({
    category: '',
    dateFrom: null,
    dateTo: null,
    amountMin: '',
    amountMax: '',
    ...currentFilters
  });


  // Reset filters to current when modal opens
  useEffect(() => {
    if (visible) {
      setFilters({
        category: '',
        dateFrom: null,
        dateTo: null,
        amountMin: '',
        amountMax: '',
        ...currentFilters
      });
    }
  }, [visible, currentFilters]);

  const handleApplyFilters = () => {
    // Validate date range
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      alert('Start date cannot be after end date');
      return;
    }

    // Validate amount range
    const minAmount = parseFloat(filters.amountMin);
    const maxAmount = parseFloat(filters.amountMax);
    
    if (filters.amountMin && filters.amountMax && minAmount > maxAmount) {
      alert('Minimum amount cannot be greater than maximum amount');
      return;
    }

    onApplyFilters(filters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      category: '',
      dateFrom: null,
      dateTo: null,
      amountMin: '',
      amountMax: '',
    };
    setFilters(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateFromChange = (dateString) => {
    const date = dateString ? new Date(dateString) : null;
    setFilters(prev => ({ ...prev, dateFrom: date }));
  };

  const handleDateToChange = (dateString) => {
    const date = dateString ? new Date(dateString) : null;
    setFilters(prev => ({ ...prev, dateTo: date }));
  };

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
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-psemibold text-gray-800">Filter Expenses</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Filter */}
            <View className="mb-4">
              <Text className="text-base font-pmedium text-gray-700 mb-2">Category</Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <Picker
                  selectedValue={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  style={{ backgroundColor: '#F9FAFB' }}
                >
                  <Picker.Item label="All Categories" value="" />
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.$id}
                      label={category.category_name}
                      value={category.$id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Date Range Filter */}
            <View className="mb-4">
              <Text className="text-base font-pmedium text-gray-700 mb-2">Date Range</Text>
              
              {/* Date From */}
              <View className="mb-2">
                <Text className="text-sm text-gray-600 mb-1">From</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={formatDateForInput(filters.dateFrom)}
                  onChangeText={handleDateFromChange}
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                />
              </View>

              {/* Date To */}
              <View className="mb-2">
                <Text className="text-sm text-gray-600 mb-1">To</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={formatDateForInput(filters.dateTo)}
                  onChangeText={handleDateToChange}
                  className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                />
              </View>

              {/* Clear Date Range */}
              {(filters.dateFrom || filters.dateTo) && (
                <TouchableOpacity
                  onPress={() => setFilters(prev => ({ ...prev, dateFrom: null, dateTo: null }))}
                  className="flex-row items-center justify-center mt-1"
                >
                  <MaterialIcons name="clear" size={16} color="#EF4444" />
                  <Text className="text-red-500 text-sm ml-1">Clear Date Range</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Amount Range Filter */}
            <View className="mb-6">
              <Text className="text-base font-pmedium text-gray-700 mb-2">Amount Range (Rs)</Text>
              
              <View className="flex-row gap-2">
                {/* Min Amount */}
                <View className="flex-1">
                  <Text className="text-sm text-gray-600 mb-1">Minimum</Text>
                  <TextInput
                    placeholder="0"
                    value={filters.amountMin}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, amountMin: text }))}
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                  />
                </View>

                {/* Max Amount */}
                <View className="flex-1">
                  <Text className="text-sm text-gray-600 mb-1">Maximum</Text>
                  <TextInput
                    placeholder="∞"
                    value={filters.amountMax}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, amountMax: text }))}
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700"
                  />
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <CustomButton
                title="Clear All"
                handlePress={handleClearFilters}
                containerStyles="flex-1 py-3"
                buttoncolor="bg-gray-500"
                textStyles="text-white font-pmedium"
              />
              <CustomButton
                title="Apply Filters"
                handlePress={handleApplyFilters}
                containerStyles="flex-1 py-3"
                buttoncolor="bg-blue-500"
                textStyles="text-white font-pmedium"
              />
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
});

export default ExpenseFilter;
