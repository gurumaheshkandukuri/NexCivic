const fs = require('fs');

let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// 1. Replace Category Select with Grid
const categorySelectPattern = /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[10px\] uppercase font-bold text-\[var\(--text-2\)\] tracking-wider">\s*Category\s*<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/;

const categoryGridReplacement = `<div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "Garbage Overflow", 
                  "Drainage Overflow", 
                  "Road Damage", 
                  "Street Light", 
                  "Water Leakage", 
                  "Public Property Damage", 
                  "Traffic Signal", 
                  "Illegal Dumping", 
                  "Dead Animal", 
                  "Others"
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); setErrors(prev => ({...prev, category: ""})); }}
                    className={\`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between \${
                      category === cat
                        ? "bg-[var(--cyan)]/10 border-[var(--cyan)] text-[var(--cyan)] shadow-[0_0_10px_rgba(0,186,220,0.1)]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-gray-800 text-[var(--text-2)] hover:border-slate-300 dark:hover:border-slate-600"
                    }\`}
                  >
                    {cat}
                    {category === cat && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              {errors.category && <span className="text-red-500 text-[10px] font-bold">{errors.category}</span>}
            </div>`;

code = code.replace(categorySelectPattern, categoryGridReplacement);


// 2. Replace District/City inputs with State/District/ULB dropdowns
const locationInputsPattern = /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[10px\] uppercase font-bold text-\[var\(--text-2\)\] tracking-wider">\s*District \/ Area\s*<\/label>\s*<input[\s\S]*?<\/div>\s*<div className="flex flex-col gap-1\.5">\s*<label className="text-\[10px\] uppercase font-bold text-\[var\(--text-2\)\] tracking-wider">\s*City \/ Town\s*<\/label>\s*<input[\s\S]*?<\/div>/;

const locationDropdownsReplacement = `<div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                State
              </label>
              <select
                required
                value={state}
                onChange={(e) => { setState(e.target.value); setErrors(prev => ({...prev, state: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <span className="text-red-500 text-[10px] font-bold">{errors.state}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                District
              </label>
              <select
                required
                value={district}
                onChange={(e) => { setDistrict(e.target.value); setErrors(prev => ({...prev, district: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select District</option>
                {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.district && <span className="text-red-500 text-[10px] font-bold">{errors.district}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-[var(--text-2)] tracking-wider">
                ULB (Urban Local Body)
              </label>
              <select
                required
                value={ulb}
                onChange={(e) => { setUlb(e.target.value); setErrors(prev => ({...prev, ulb: ""})); }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              >
                <option value="">Select ULB</option>
                {ulbsList.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {errors.ulb && <span className="text-red-500 text-[10px] font-bold">{errors.ulb}</span>}
            </div>`;

code = code.replace(locationInputsPattern, locationDropdownsReplacement);

// 3. Make sure the grid wrapper matches 4 columns instead of 3 if needed
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-4">/g, '<div className="grid grid-cols-1 md:grid-cols-2 gap-4">');

// 4. Update the state hooks to have state, district, ulb, and lists!
const stateHooksPattern = /const \[district, setDistrict\] = useState\("Mumbai Suburban"\);\n\s*const \[city, setCity\] = useState\("Mumbai"\);/;
const stateHooksReplacement = `const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [ulb, setUlb] = useState("");

  // Hardcoded for UI demo
  const states = ["Maharashtra", "Telangana", "Delhi", "Karnataka"];
  const districtsList = ["Mumbai Suburban", "Mumbai City", "Hyderabad", "Warangal"];
  const ulbsList = ["BMC", "GHMC", "NDMC"];`;

code = code.replace(stateHooksPattern, stateHooksReplacement);

// 5. Update handleSelectSuggestion
const suggestionPattern = /setDistrict\(item\.district\);\n\s*setCity\(item\.city\);/;
const suggestionReplacement = `setDistrict(item.district);
    setState("Maharashtra");
    setUlb("BMC");`;
code = code.replace(suggestionPattern, suggestionReplacement);

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue UI layout');
