const fs = require('fs');

let reportPath = 'src/components/ReportIssue.tsx';
let reportContent = fs.readFileSync(reportPath, 'utf8');

reportContent = reportContent.replace(
  /if \(success\) \{\n          <span className="block text-sm font-bold/g,
  `if (success) {\n    return (\n      <div className="max-w-xl mx-auto py-12 md:py-24 text-center flex flex-col items-center gap-6" data-aos="zoom-in">\n        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center animate-bounce text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.3)]">\n          <CheckCircle2 className="w-10 h-10" />\n        </div>\n        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--text-1)]">\n          {createdId === 'offline-queued' ? 'Issue Queued for Sync' : 'Civic Issue Logged!'}\n        </h2>\n        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 max-w-sm">\n          <span className="block font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest">\n            Achievement Unlock\n          </span>\n          <span className="block text-sm font-bold`
);

fs.writeFileSync(reportPath, reportContent);
console.log('Restored success screen');
