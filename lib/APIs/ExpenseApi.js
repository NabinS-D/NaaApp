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
      createdAt: newExpense.date ?? new Date().toISOString(),
    }
  );
  return response;
};

export const fetchAllExpenses = async (userId) => {
  let allExpenses = [];
  let offset = 0;
  const limit = 100; // Appwrite default limit

  while (true) {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.expenseCollectionId,
        [
          Query.equal("users", userId),
          Query.orderDesc("createdAt"),
          Query.limit(limit),
          Query.offset(offset),
        ]
      );

      const documents = response.documents;
      allExpenses = [...allExpenses, ...documents];

      // If we got fewer documents than the limit, we've reached the end
      if (documents.length < limit) {
        break;
      }

      offset += limit;
    } catch (error) {
      console.error("Error fetching expenses:", error);
      break;
    }
  }

  return allExpenses;
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

export const deleteAllExpensesById = async (ids) => {
  // Setup a batch operation
  const promises = [];

  // Create delete promises for each document
  ids.forEach((id) => {
    promises.push(
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.expenseCollectionId,
        id
      )
    );
  });

  // Execute all operations in parallel
  return Promise.all(promises)
    .then(() => {
      return true;
    })
    .catch((error) => {
      throw error; // Re-throw to handle in the calling function
    });
};
