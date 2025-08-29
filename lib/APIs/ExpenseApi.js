import { ID, Query } from "react-native-appwrite";
import { databases, storage, appwriteConfig } from "../appwrite";

// Helper function to upload receipt image to storage
const uploadReceiptImage = async (imageAsset) => {
  if (!imageAsset) return null;

  try {
    // Handle both old format (string URI) and new format (asset object)
    const isAssetObject = typeof imageAsset === 'object' && imageAsset.uri;
    const imageUri = isAssetObject ? imageAsset.uri : imageAsset;

    // Create file ID
    const fileId = ID.unique();

    // Create file object using React Native format
    const file = {
      name: isAssetObject && imageAsset.fileName ? imageAsset.fileName : `receipt_${Date.now()}.jpg`,
      type: isAssetObject && imageAsset.mimeType ? imageAsset.mimeType : 'image/jpeg',
      size: isAssetObject && imageAsset.fileSize ? imageAsset.fileSize : undefined,
      uri: imageUri,
    };

    // Upload to storage bucket
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      fileId,
      file
    );

    if (!uploadedFile || !uploadedFile.$id) {
      throw new Error('Upload failed - no file ID returned');
    }

    return uploadedFile.$id;
  } catch (error) {
    throw new Error(`Failed to upload receipt image: ${error.message}`);
  }
};

export const addExpenses = async (newExpense, userId) => {
  let receiptImageId = null;

  // Upload receipt image if provided
  if (newExpense.receiptImage) {
    receiptImageId = await uploadReceiptImage(newExpense.receiptImage);
  }

  const response = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.expenseCollectionId,
    ID.unique(),
    {
      amount: newExpense.amount,
      description: newExpense.description,
      category: newExpense.categoryId,
      users: userId,
      receiptImage: receiptImageId,
      createdAt: new Date().toISOString(), // Use current timestamp for sorting
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

// Helper function to get receipt image URL from storage
export const getReceiptImageUrl = (fileId) => {
  if (!fileId) return null;

  try {
    const result = storage.getFileView(appwriteConfig.storageId, fileId);
    return result.toString();
  } catch (error) {
    console.error('Error getting receipt image URL:', error);
    return null;
  }
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
  const batchSize = 10; // Delete 10 items at a time
  const delayBetweenBatches = 1000; // 1 second delay between batches
  let deletedCount = 0;
  let failedCount = 0;
  
  // Helper function to delay execution
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Process items in batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    
    try {
      // Create promises for current batch
      const batchPromises = batch.map(id => 
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.expenseCollectionId,
          id
        )
      );
      
      // Execute current batch
      await Promise.all(batchPromises);
      deletedCount += batch.length;
      
      // Add delay between batches (except for the last batch)
      if (i + batchSize < ids.length) {
        await delay(delayBetweenBatches);
      }
      
    } catch (error) {
      failedCount += batch.length;
      
      // If rate limited, wait longer and retry
      if (error.message?.includes('rate') || error.code === 429) {
        await delay(3000);
        
        // Retry the failed batch one by one
        for (const id of batch) {
          try {
            await databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.expenseCollectionId,
              id
            );
            deletedCount++;
            failedCount--;
            await delay(500); // Small delay between individual retries
          } catch (retryError) {
            // Silent fail for individual items
          }
        }
      }
    }
  }
  
  if (failedCount > 0) {
    throw new Error(`Deleted ${deletedCount} items, but ${failedCount} failed`);
  }
  
  return true;
};
