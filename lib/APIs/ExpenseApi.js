import { ID, Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "../appwrite";

export const addExpenses = async (newExpense, userId) => {
  const response = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.expenseCollectionId,
    ID.unique(),
    {
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      category: newExpense.categoryId,
      users: userId,
      createdAt: new Date().toISOString(),
    }
  );
  return response;
};
export const fetchAllExpenses = async (userId) => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.expenseCollectionId,
    [Query.equal("users", userId), Query.orderDesc("createdAt")]
  );
  return response.documents;
};
export const deleteExpenseById = async (expenseId) => {
  const response = await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.expenseCollectionId,
    expenseId
  );
  return response;
};
export const expensesOfCategory = async (categoryId) => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.expenseCollectionId,
    [Query.equal("category", categoryId), Query.orderDesc("createdAt")]
  );
  return response.documents;
};
