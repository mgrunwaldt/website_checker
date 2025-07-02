const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const XLSX = require('xlsx');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Ensure uploads directory exists
fs.ensureDirSync('uploads');
fs.ensureDirSync('processed');

// Function to extract URLs from text
function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

// Function to check if URL is valid/accessible
async function checkUrl(url) {
  try {
    // Clean the URL - remove any trailing characters that might not be part of URL
    const cleanUrl = url.replace(/[,;.\s]+$/, '');
    
    const response = await axios.get(cleanUrl, {
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept anything less than 500 as valid
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return {
      url: cleanUrl,
      status: response.status,
      valid: response.status >= 200 && response.status < 400,
      error: null
    };
  } catch (error) {
    return {
      url: url,
      status: null,
      valid: false,
      error: error.code || error.message
    };
  }
}

// Store processing progress
const processingProgress = new Map();

// Progress endpoint
app.get('/api/progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const progress = processingProgress.get(sessionId) || { current: 0, total: 0, message: 'Starting...' };
  res.json(progress);
});

// Process Excel file in background
async function processExcelFile(sessionId, filePath) {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`Found ${jsonData.length} rows in Excel file`);

    const validRows = [];
    const invalidRows = [];
    let processedCount = 0;

    // Find the "url principal" column
    const excelHeaders = arrayData[0] || [];
    const urlColumnIndex = excelHeaders.findIndex(header => 
      header && header.toString().toLowerCase().includes('url principal')
    );
    
    console.log(`Headers found: ${excelHeaders.join(', ')}`);
    console.log(`URL Principal column index: ${urlColumnIndex}`);

    // Add Status column to headers
    const newHeaders = [...excelHeaders, 'Status'];

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const rowData = jsonData[i];
      const rowArray = arrayData[i + 1]; // +1 because jsonData excludes headers
      
      // Update progress
      processingProgress.set(sessionId, {
        current: i + 1,
        total: jsonData.length,
        message: `Processing row ${i + 1}/${jsonData.length}`,
        status: 'processing'
      });
      
      console.log(`Processing row ${i + 1}/${jsonData.length}`);
      
      let urlFound = false;
      let isValid = false;
      
      // If we found the "url principal" column, use it specifically
      if (urlColumnIndex >= 0 && rowArray && rowArray[urlColumnIndex]) {
        const cellValue = rowArray[urlColumnIndex];
        if (cellValue) {
          const urls = extractUrls(cellValue.toString());
          if (urls.length > 0) {
            urlFound = true;
            // Check the first URL found in the row
            const result = await checkUrl(urls[0]);
            isValid = result.valid;
            processedCount++;
            console.log(`URL ${urls[0]}: ${isValid ? 'VALID' : 'INVALID'} (Status: ${result.status || 'Error'})`);
          }
        }
      }

      // Create the row with original data + status
      const newRow = [...rowArray, urlFound ? (isValid ? 'Valid' : 'Invalid') : 'No URL'];

      if (urlFound) {
        if (isValid) {
          validRows.push(newRow);
        } else {
          invalidRows.push(newRow);
        }
      }
    }

    // Create new workbook with results
    const newWorkbook = XLSX.utils.book_new();
    
    // Valid URLs sheet
    if (validRows.length > 0) {
      const validSheet = XLSX.utils.aoa_to_sheet([newHeaders, ...validRows]);
      XLSX.utils.book_append_sheet(newWorkbook, validSheet, 'Valid URLs');
    }
    
    // Invalid URLs sheet  
    if (invalidRows.length > 0) {
      const invalidSheet = XLSX.utils.aoa_to_sheet([newHeaders, ...invalidRows]);
      XLSX.utils.book_append_sheet(newWorkbook, invalidSheet, 'Invalid URLs');
    }

    // Save the processed file
    const outputFileName = `processed-${sessionId}.xlsx`;
    const outputPath = path.join('processed', outputFileName);
    XLSX.writeFile(newWorkbook, outputPath);

    // Clean up uploaded file
    fs.removeSync(filePath);

    console.log(`Processing complete. Valid: ${validRows.length}, Invalid: ${invalidRows.length}`);

    // Update progress with completion
    processingProgress.set(sessionId, {
      current: jsonData.length,
      total: jsonData.length,
      message: 'Processing complete!',
      status: 'completed',
      results: {
        totalUrls: processedCount,
        validUrls: validRows.length,
        invalidUrls: invalidRows.length,
        downloadUrl: `/api/download/${outputFileName}`
      }
    });

  } catch (error) {
    console.error('Error processing file:', error);
    processingProgress.set(sessionId, {
      current: 0,
      total: 0,
      message: 'Error processing file: ' + error.message,
      status: 'error',
      error: error.message
    });
  }
}

// Main processing endpoint
app.post('/api/process-excel', upload.single('excel'), async (req, res) => {
  const sessionId = Date.now().toString();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.filename);

    // Initialize progress
    processingProgress.set(sessionId, {
      current: 0,
      total: 0,
      message: 'Starting processing...',
      status: 'starting'
    });

    // Start processing in background
    setImmediate(() => processExcelFile(sessionId, req.file.path));

    // Return session ID immediately
    res.json({
      success: true,
      sessionId: sessionId,
      message: 'Processing started. Use the sessionId to check progress.'
    });

  } catch (error) {
    console.error('Error starting file processing:', error);
    processingProgress.delete(sessionId);
    res.status(500).json({ error: 'Error starting file processing: ' + error.message });
  }
});

// Download endpoint
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'processed', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        // Clean up file after download
        setTimeout(() => {
          fs.removeSync(filePath);
        }, 5000);
      }
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 