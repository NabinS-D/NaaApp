const API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY;
const API_ENDPOINT = process.env.EXPO_PUBLIC_OCR_API_ENDPOINT;

// ============================================================================
// STEP 1: OCR API CALL - Send image to OCR.space for text extraction
// ============================================================================
export const processImageWithOCR = async (base64Image) => {
  console.log('=== OCR PROCESSING FUNCTION CALLED ===');
  if (!API_KEY) {
    console.error('OCR API KEY MISSING!');
    throw new Error('OCR API key is missing. Please add EXPO_PUBLIC_OCR_API_KEY to your .env file');
  }

  // Prepare OCR.space API request with optimized settings for receipts
  const formData = new FormData();
  formData.append('apikey', API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
  formData.append('scale', 'true'); // Auto-scale image
  formData.append('isTable', 'true'); // Better for structured text like receipts
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);

  console.log('FormData created, making API request...');

  try {
    // Send image to OCR.space API for text extraction
    console.log('Sending request to OCR.space API...');
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse OCR API response and extract text
    const data = await response.json();
    console.log('=== OCR API FULL RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));

    if (data.IsErroredOnProcessing) {
      console.error('OCR API returned error:', data.ErrorMessage);
      throw new Error(data.ErrorMessage[0] || 'OCR processing failed');
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      console.error('No parsed results in OCR response');
      throw new Error('No text could be extracted from the image');
    }

    // Extract the raw text from OCR response
    const parsedText = data.ParsedResults[0].ParsedText;
    console.log('=== EXTRACTED TEXT FROM OCR ===');
    console.log('Text content:', parsedText);
    console.log('=== END EXTRACTED TEXT ===');

    return parsedText;
  } catch (error) {
    console.error('=== OCR ERROR DETAILS ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END OCR ERROR ===');
    throw error;
  }
};

// ============================================================================
// STEP 2: TEXT PARSING - Extract amount and date from OCR text
// ============================================================================
export const parseOCRText = (text) => {
  console.log('=== PARSING OCR TEXT ===');
  console.log('Input text:', text);

  if (!text) {
    console.log('No text provided for parsing');
    return {};
  }

  const parsedData = {};
  const lines = text.split('\n');
  console.log('Number of lines to process:', lines.length);

  // Define regex patterns for extracting key information
  // Amount regex: looks for keywords like "TOTAL", "AMOUNT" followed by currency and numbers
  const amountRegex = /(?:total|amount|subtotal|balance|due|net|\bSAR\b|\bRS\b)[\s:]*\$?[\s]*([\d,]+\.?\s*\d{0,2})/i;
  // Date regex: matches various date formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
  const dateRegex = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/;
  // Store name regex: looks for common store/business name patterns
  const storeNameRegex = /^([A-Z\s&'.-]+(?:MARKET|STORE|SHOP|MART|SUPERMARKET|RESTAURANT|CAFE|PHARMACY|MALL|CENTER|STATION|COMPANY|INC|LLC|LTD))$/i;

  // Process each line of OCR text to find amount, date, and description
  console.log('Processing lines for amount, date, and description...');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    console.log(`Line ${i + 1}: "${line}"`);

    // Skip empty lines
    if (!line) continue;

    // AMOUNT DETECTION: Look for total amount in current line
    if (!parsedData.amount) {
      const amountMatch = line.match(amountRegex);
      if (amountMatch && amountMatch[1]) {
        // Clean up the matched amount by removing spaces and commas
        const cleanAmount = amountMatch[1].replace(/[\s,]/g, '');
        const amount = parseFloat(cleanAmount);
        console.log(`Found amount on line ${i + 1}: ${amount} (matched: "${amountMatch[0]}", cleaned: "${cleanAmount}")`);
        parsedData.amount = amount;
      }
    }

    // DATE DETECTION: Look for date in current line
    if (!parsedData.date) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch && (dateMatch[1] || dateMatch[2])) {
        const dateStr = dateMatch[1] || dateMatch[2];
        try {
          const date = new Date(dateStr).toISOString().split('T')[0];
          console.log(`Found date on line ${i + 1}: ${date} (matched: "${dateStr}")`);
          parsedData.date = date;
        } catch (dateError) {
          console.log(`Invalid date format on line ${i + 1}: "${dateStr}"`);
        }
      }
    }

    // DESCRIPTION DETECTION: Look for store/business name (usually in first few lines)
    if (!parsedData.description && i < 5) {
      // Check for store name pattern
      const storeMatch = line.match(storeNameRegex);
      if (storeMatch && storeMatch[1]) {
        const storeName = storeMatch[1].trim();
        console.log(`Found store name on line ${i + 1}: "${storeName}"`);
        parsedData.description = `Purchase from ${storeName}`;
      }
      // Fallback: if line looks like a business name (all caps, reasonable length)
      else if (line.length > 3 && line.length < 50 && line === line.toUpperCase() && 
               !line.match(/\d/) && !line.includes('$') && 
               !line.match(/total|amount|subtotal|balance|due|net|thank|receipt/i)) {
        console.log(`Found potential business name on line ${i + 1}: "${line}"`);
        parsedData.description = `Purchase from ${line}`;
      }
    }
  }

  // Return extracted data (amount and date) or empty fields for manual entry
  console.log('=== PARSING RESULT ===');
  console.log('Final parsed data:', JSON.stringify(parsedData, null, 2));
  console.log('=== END PARSING ===');

  return parsedData;
};
