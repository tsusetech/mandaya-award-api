const ExcelJS = require('exceljs');

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  // Add headers
  worksheet.addRow(['email', 'username', 'password', 'name', 'role', 'groupId']);

  // Add test data
  worksheet.addRow(['test1@example.com', 'testuser1', 'password123', 'Test User 1', 'USER', '1']);
  worksheet.addRow(['test2@example.com', 'testuser2', 'password123', 'Test User 2', 'ADMIN', '2']);
  worksheet.addRow(['test3@example.com', 'testuser3', 'password123', 'Test User 3', 'PESERTA', '']);

  // Save the file
  await workbook.xlsx.writeFile('test-users-debug.xlsx');
  console.log('Test Excel file created: test-users-debug.xlsx');
  
  // Also create a CSV version for comparison
  const csvContent = `email,username,password,name,role,groupId
test1@example.com,testuser1,password123,Test User 1,USER,1
test2@example.com,testuser2,password123,Test User 2,ADMIN,2
test3@example.com,testuser3,password123,Test User 3,PESERTA,`;
  
  const fs = require('fs');
  fs.writeFileSync('test-users-debug.csv', csvContent);
  console.log('Test CSV file created: test-users-debug.csv');
}

createTestExcel().catch(console.error);
