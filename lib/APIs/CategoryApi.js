import { Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "../appwrite";
import { expensesOfCategory, deleteAllExpensesById } from "./ExpenseApi";

export const fetchAllCategories = async (userId) => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.categoryCollectionId,
    [Query.equal("users", userId)]
  );
  return response;
};

export const addaCategory = async (newCategory, userId) => {
  const response = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.categoryCollectionId,
    "unique()",
    {
      category_name: newCategory.name,
      users: userId,
      createdAt: new Date().toISOString()
    }
  );
  return response;
};

export const categoryByID = async (categoryId) => {
  const response = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.categoryCollectionId,
    categoryId // No need for Query.equal()
  );
  return response; // Directly return the document
};

export const handleEditCategory = async (categoryId, newCategoryName) => {
  const response = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.categoryCollectionId,
    categoryId,
    { category_name: newCategoryName }
  );
  return response;
};

export const deleteCategoryByID = async (categoryId) => {
  const response = await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.categoryCollectionId,
    categoryId
  );
  return response;
};

// New function: Delete category and all its related expenses (cascade delete)
export const deleteCategoryWithExpenses = async (categoryId) => {
  try {
    // Step 1: Get all expenses for this category
    const categoryExpenses = await expensesOfCategory(categoryId);
    
    // Step 2: If there are expenses, delete them first
    if (categoryExpenses && categoryExpenses.length > 0) {
      const expenseIds = categoryExpenses.map(expense => expense.$id);
      await deleteAllExpensesById(expenseIds);
    }
    
    // Step 3: Delete the category itself
    const response = await deleteCategoryByID(categoryId);
    
    return {
      success: true,
      deletedExpenses: categoryExpenses ? categoryExpenses.length : 0,
      categoryResponse: response
    };
  } catch (error) {
    throw new Error(`Failed to delete category and expenses: ${error.message}`);
  }
};
