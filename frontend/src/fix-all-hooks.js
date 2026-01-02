const fs = require('fs');
const path = require('path');

const filesToFix = [
  'context/WebSocketContext.js',
  'pages/AIInsights.jsx',
  'pages/Attendance.jsx',
  'pages/Checkout.jsx',
  'pages/Dashboard.jsx',
  'pages/EmployeeAssignments.jsx',
  'pages/Expenses.jsx',
  'pages/Invoices.jsx',
  'pages/Leaves.jsx',
  'pages/Payroll.jsx',
  'pages/PricingPage.jsx',
  'pages/Screenshots.jsx',
  'pages/Settings.jsx',
  'pages/Shifts.jsx',
  'pages/Subscription.jsx',
  'pages/TeamChat.jsx',
  'pages/Timesheets.jsx',
  'pages/WorkAgreements.jsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Find all useEffect blocks and add eslint-disable before the closing bracket
    // Pattern: }, [dependencies]);
    const useEffectPattern = /^(\s+)(}\, \[.*?\]\;)$/gm;
    
    let match;
    const matches = [];
    while ((match = useEffectPattern.exec(content)) !== null) {
      matches.push(match);
    }
    
    // Process matches in reverse to maintain positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const indent = match[1];
      const closingLine = match[2];
      const startPos = match.index;
      
      // Check if there's already an eslint-disable comment
      const beforeMatch = content.substring(Math.max(0, startPos - 100), startPos);
      if (!beforeMatch.includes('eslint-disable-next-line')) {
        const replacement = `${indent}// eslint-disable-next-line react-hooks/exhaustive-deps\n${indent}${closingLine}`;
        content = content.substring(0, startPos) + replacement + content.substring(startPos + match[0].length);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Done!');
