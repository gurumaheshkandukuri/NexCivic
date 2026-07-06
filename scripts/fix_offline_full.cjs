const fs = require('fs');

let reportPath = 'src/components/ReportIssue.tsx';
let reportContent = fs.readFileSync(reportPath, 'utf8');

// First replace the createIssue call
reportContent = reportContent.replace(
  /const id = await createIssue\(\{([\s\S]*?)\} as any\);\n\n      setCreatedId\(id\);\n      setSuccess\(true\);/m,
  `const res = await createIssue({\$1} as any);\n\n      if (!res) {\n        // Handled offline transaction failure with granular feedback\n        alert('Queued for sync: The network is currently unavailable. Your complaint will be synchronized once the connection is restored.');\n        // Mock success to keep flow\n        setCreatedId('offline-queued');\n        setSuccess(true);\n      } else {\n        setCreatedId(res.id);\n        setSuccess(true);\n      }`
);

// Then replace the success header text
reportContent = reportContent.replace(
  /<h2 className="font-display font-extrabold text-3xl md:text-4xl text-\[var\(--text-1\)\]">\n          Civic Issue Logged!\n        <\/h2>/m,
  '<h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--text-1)]">\n          {createdId === \\\'offline-queued\\\' ? \\\'Issue Queued for Sync\\\' : \\\'Civic Issue Logged!\\\'}\n        </h2>'
);

fs.writeFileSync(reportPath, reportContent);
console.log('Fixed ReportIssue offline handling and success screen text');
