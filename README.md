# Website Checker - Excel URL Validator 📊

A modern web application that allows you to upload Excel files, automatically extract URLs from all cells, validate their accessibility, and download organized results with separate tabs for valid and invalid URLs.

## Features ✨

- **📁 Easy File Upload**: Drag & drop or click to upload Excel files (.xlsx, .xls)
- **🔍 Automatic URL Detection**: Scans all cells in your Excel file to find URLs
- **🌐 Website Validation**: Checks if each URL is accessible and returns status codes
- **📊 Organized Results**: Creates a new Excel file with two separate tabs:
  - **Valid URLs**: All accessible websites with status codes
  - **Invalid URLs**: Unreachable websites with error details
- **💅 Modern UI**: Beautiful, responsive interface with real-time progress tracking
- **⚡ Fast Processing**: Concurrent URL checking for optimal performance

## Tech Stack 🛠️

**Backend:**
- Node.js & Express
- Multer (file uploads)
- XLSX (Excel processing)
- Axios (HTTP requests)
- CORS support

**Frontend:**
- React 18
- React Dropzone
- Modern CSS with gradients and animations
- Responsive design

## Installation & Setup 🚀

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/mgrunwaldt/website_checker.git
   cd website_checker
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

### Manual Setup

If you prefer to set up each part separately:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## Usage 📋

1. **Open the application** in your browser at `http://localhost:3000`

2. **Upload your Excel file**:
   - Drag and drop an Excel file into the upload area, or
   - Click the upload area to select a file

3. **Process the file**:
   - Click "🚀 Process File" button
   - Wait for the processing to complete (this may take a few minutes depending on the number of URLs)

4. **Download results**:
   - Once processing is complete, you'll see statistics about valid/invalid URLs
   - Click "📥 Download Results" to get your processed Excel file

5. **Review the results**:
   - The downloaded Excel file contains two tabs:
     - **Valid URLs**: Accessible websites with their HTTP status codes
     - **Invalid URLs**: Inaccessible websites with error details

## Excel File Format 📄

The application works with any Excel file (.xlsx or .xls) format. It will:

- Scan **all cells** in the first worksheet
- Extract URLs using pattern matching (http:// and https://)
- Handle URLs in any column or row
- Preserve original data alongside validation results

### Example Input
Your Excel file can contain URLs in any cells:
```
Company Name    | Website              | Email
Example Corp    | https://example.com  | contact@example.com
Test Company    | http://test.com      | info@test.com
```

### Example Output
The processed file will have two tabs:

**Valid URLs Tab:**
```
Row Number | URL                  | Status Code | Error | Original Data...
2          | https://example.com  | 200         |       | Example Corp | https://example.com | contact@example.com
```

**Invalid URLs Tab:**
```
Row Number | URL              | Status Code | Error           | Original Data...
3          | http://test.com  | N/A         | ENOTFOUND      | Test Company | http://test.com | info@test.com
```

## API Endpoints 🔌

### POST `/api/process-excel`
Upload and process an Excel file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Excel file (form field: `excel`)

**Response:**
```json
{
  "success": true,
  "message": "File processed successfully",
  "results": {
    "totalUrls": 10,
    "validUrls": 7,
    "invalidUrls": 3,
    "downloadUrl": "/api/download/processed-1234567890.xlsx"
  }
}
```

### GET `/api/download/:filename`
Download the processed Excel file.

### GET `/api/health`
Health check endpoint.

## Configuration ⚙️

### Environment Variables

You can customize the backend by setting these environment variables:

```bash
PORT=5000  # Backend server port
```

### URL Validation Settings

The application considers a URL valid if:
- HTTP status code is between 200-399
- The request completes within 10 seconds
- No network errors occur

Invalid URLs include:
- Network timeouts
- DNS resolution failures
- HTTP 4xx/5xx errors
- Malformed URLs

## Error Handling 🛡️

The application includes comprehensive error handling:

- **File upload errors**: Invalid file types, size limits
- **Processing errors**: Corrupted Excel files, parsing issues
- **Network errors**: URL validation timeouts, connection failures
- **Server errors**: Internal server issues, disk space problems

All errors are displayed to the user with helpful messages and retry options.

## Performance Considerations ⚡

- URLs are validated concurrently for faster processing
- Files are automatically cleaned up after processing
- Large files may take several minutes to process
- Each URL request has a 10-second timeout

## Browser Support 🌐

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📝

This project is licensed under the MIT License.

## Support 💬

If you encounter any issues or have questions:

1. Check the browser console for error messages
2. Ensure your Excel file is not corrupted
3. Verify that URLs in your file are properly formatted
4. Make sure you have a stable internet connection

For technical support, please create an issue in the repository with:
- Steps to reproduce the problem
- Error messages (if any)
- Sample Excel file (if possible)

---

**Happy URL validating!** 🎉 