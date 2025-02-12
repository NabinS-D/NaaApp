import { Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "../appwrite";

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
      createdAt: new Date().toISOString
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
