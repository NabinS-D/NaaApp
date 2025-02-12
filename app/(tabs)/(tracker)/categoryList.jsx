import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "../../../context/GlobalProvider.js";
import CustomButton from "../../../components/CustomButton.jsx";
import CustomModal from "../../../components/CustomModal.jsx";
import FormFields from "../../../components/FormFields.jsx";
import {
  categoryByID,
  deleteCategoryByID,
  fetchAllCategories,
  handleEditCategory,
} from "../../../lib/APIs/CategoryApi.js";

// Memoized Header Component
const Header = memo(() => (
  <View className="px-4">
    <View className="bg-pink-700 rounded-lg py-4">
      <Text className="text-2xl text-cyan-100 font-pbold text-center">
        Available Categories
      </Text>
    </View>
  </View>
));

// Memoized Category Item Component
const CategoryItem = memo(({ category, onEdit, onDelete }) => {
  if (!category) return null;

  return (
    <View className="flex-row items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
      <Text
        className="flex-1 text-gray-800 text-lg font-medium pr-2"
        numberOfLines={1}
      >
        {category.category_name}
      </Text>

      <View className="flex-row gap-x-2">
        <CustomButton
          title="Edit"
          containerStyles="rounded-md bg-blue-500 px-3 w-[60px]"
          textStyles="text-white text-sm font-medium"
          handlePress={() => onEdit(category.$id)}
          buttoncolor="bg-blue-500"
          fullWidth={false}
        />
        <CustomButton
          title="Delete"
          containerStyles="rounded-md bg-red-500 px-3 w-[60px]"
          textStyles="text-white text-sm font-medium"
          handlePress={() => onDelete(category.$id)}
          buttoncolor="bg-red-500"
          fullWidth={false}
        />
      </View>
    </View>
  );
});

// Memoized Edit Modal Component
const EditModal = memo(
  ({ visible, onClose, onEdit, category, onCategoryChange }) => {
    return (
      <CustomModal
        modalVisible={visible}
        onSecondaryPress={onClose}
        title="Edit Category"
        primaryButtonText="Edit"
        secondaryButtonText="Cancel"
        onPrimaryPress={onEdit}
      >
        <View className="w-full">
          <FormFields
            title="Category Name"
            placeholder="Category Name"
            value={category.categoryname}
            inputfieldcolor="bg-gray-200" // Light gray background
            textcolor="text-gray-800" // Darker text
            bordercolor="border-gray-400" // Gray border
            handleChangeText={(text) =>
              onCategoryChange((prev) => ({
                ...prev,
                categoryname: text,
              }))
            }
          />
        </View>
      </CustomModal>
    );
  }
);

// Memoized Delete Modal Component
const DeleteModal = memo(({ visible, onClose, onDelete }) => (
  <CustomModal
    modalVisible={visible}
    onSecondaryPress={onClose}
    title="Delete Category"
    primaryButtonText="Delete"
    secondaryButtonText="Cancel"
    onPrimaryPress={onDelete}
  >
    <Text className="font-pmedium">
      Are you sure you want to delete this category?
    </Text>
  </CustomModal>
));

const CategoryList = () => {
  const { userdetails } = useGlobalContext();
  const [categories, setCategories] = useState([]);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [newCategory, setNewCategory] = useState({
    categoryId: "",
    categoryname: "",
  });
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Memoized fetch categories function
  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchAllCategories(userdetails.$id);
      setCategories(result.documents);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to fetch categories");
      setCategories([]);
    }
  }, [userdetails.$id]);

  // Memoized refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchCategories();
    } catch (error) {
      console.error("Refresh error:", error);
      setError("Failed to refresh categories");
    } finally {
      setRefreshing(false);
    }
  }, [fetchCategories]);

  // Memoized edit handler
  const handleEdit = useCallback(async (categoryId) => {
    try {
      setIsEditVisible(true);
      const data = await categoryByID(categoryId);
      if (data) {
        setNewCategory({
          categoryId: categoryId,
          categoryname: data.category_name,
        });
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
      setError("Failed to fetch category details");
    }
  }, []);

  // Memoized edit submission handler
  const editCategory = useCallback(async () => {
    if (!newCategory.categoryname || newCategory.categoryname.trim() === "") {
      Alert.alert("Error", "Category cannot be empty");
      return null;
    }
    try {
      const response = await handleEditCategory(
        newCategory.categoryId,
        newCategory.categoryname
      );
      if (response) {
        await fetchCategories();
        setIsEditVisible(false);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      setError("Failed to update category");
    }
  }, [newCategory, fetchCategories]);

  // Memoized delete handler
  const handleDelete = useCallback(
    async (categoryId) => {
      try {
        const response = await deleteCategoryByID(categoryId);
        if (response) {
          await fetchCategories();
          setIsDeleteVisible(false);
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        setError("Failed to delete category");
      }
    },
    [fetchCategories]
  );

  // Effect for initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoized refresh control
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#fff"
        titleColor="#fff"
      />
    ),
    [refreshing, onRefresh]
  );

  return (
    <SafeAreaView className="flex-1 bg-pink-900">
      <ScrollView className="flex-1" refreshControl={refreshControl}>
        <Header />

        <View className="px-4 mt-4">
          {error ? (
            <Text className="text-red-400 font-pbold text-lg text-center mt-4">
              {error}
            </Text>
          ) : categories?.length > 0 ? (
            categories.map((category) => (
              <CategoryItem
                key={category.$id}
                category={category}
                onEdit={handleEdit}
                onDelete={(id) => {
                  setCurrentCategoryId(id);
                  setIsDeleteVisible(true);
                }}
              />
            ))
          ) : (
            <Text className="text-cyan-100 font-pbold text-lg text-center mt-4">
              No categories found.
            </Text>
          )}
        </View>

        <EditModal
          visible={isEditVisible}
          onClose={() => setIsEditVisible(false)}
          onEdit={editCategory}
          category={newCategory}
          onCategoryChange={setNewCategory}
        />

        <DeleteModal
          visible={isDeleteVisible}
          onClose={() => setIsDeleteVisible(false)}
          onDelete={() => handleDelete(currentCategoryId)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default memo(CategoryList);
