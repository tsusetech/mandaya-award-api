const ExcelJS = require('exceljs');
const fs = require('fs');

async function testExcelParsing() {
  try {
    // Read the test Excel file
    const fileBuffer = fs.readFileSync('test-users-debug.xlsx');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return;
    }

    console.log(`Total rows in worksheet: ${worksheet.rowCount}`);
    
    const users = [];
    const headers = [];
    
    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString().toLowerCase().trim() || '';
    });
    console.log('Detected headers:', headers);

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      console.log(`Processing row ${rowNumber}:`, row.values);
      
      // Check if row has any data
      const rowValues = row.values.filter(val => val !== undefined && val !== null && val !== '');
      console.log(`Row ${rowNumber} has ${rowValues.length} non-empty values:`, rowValues);
      
      if (rowValues.length === 0) {
        console.log(`Skipping empty row ${rowNumber}`);
        return;
      }
      
      const userData = {};
      
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        const value = cell.value?.toString().trim();
        console.log(`Row ${rowNumber}, Col ${colNumber}, Header: "${header}", Value: "${value}", Raw:`, cell.value);
        
        if (header.includes('email')) {
          userData.email = value;
        } else if (header.includes('username')) {
          userData.username = value;
        } else if (header.includes('name')) {
          userData.name = value;
        } else if (header.includes('password')) {
          userData.password = value;
        } else if (header.includes('role')) {
          userData.role = value;
        } else if (header.includes('group') || header.includes('groupid')) {
          if (value && value !== '') {
            const groupId = parseInt(value);
            if (!isNaN(groupId)) {
              userData.groupId = groupId;
            }
          }
        }
      });

      console.log(`Row ${rowNumber} userData:`, userData);
      
      // Check if all required fields are present
      if (userData.email && userData.username && userData.password) {
        users.push(userData);
        console.log(`Added user from row ${rowNumber}:`, userData);
      } else {
        console.log(`Skipped user from row ${rowNumber} - missing required fields`);
      }
    });

    console.log(`Final users array length: ${users.length}`);
    console.log('Final users:', users);
    
  } catch (error) {
    console.error('Error testing Excel parsing:', error);
  }
}

testExcelParsing();
