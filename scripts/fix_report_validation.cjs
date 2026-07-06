const fs = require('fs');
let code = fs.readFileSync('src/components/ReportIssue.tsx', 'utf8');

// 1. Add errors state
code = code.replace(
  'const [success, setSuccess] = useState(false);',
  'const [success, setSuccess] = useState(false);\n  const [errors, setErrors] = useState<Record<string, string>>({});'
);

// 2. Add validation in handleSubmit
const newHandleSubmit = `  // Submit Issue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!category.trim()) newErrors.category = "Category is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!priority.trim()) newErrors.priority = "Priority is required";
    if (!landmark.trim()) newErrors.landmark = "Landmark/Location is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!district.trim()) newErrors.district = "District is required";
    if (ulbsList.length > 0 && !ulb.trim()) newErrors.ulb = "ULB is required";
    if (!image) newErrors.image = "An image of the issue is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});

    if (similarIssue && !showDuplicateModal) {`;

code = code.replace(
  `  // Submit Issue\n  const handleSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!title) return;\n\n    if (similarIssue && !showDuplicateModal) {`,
  newHandleSubmit
);

// 3. Inject error displays for fields
// Title
code = code.replace(
  'onChange={(e) => setTitle(e.target.value)}',
  'onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({...prev, title: ""})); }}'
);
code = code.replace(
  'placeholder="e.g., Massive Pothole on Main Street"\n              className="text-2xl md:text-3xl font-display font-black text-[var(--text-1)] w-full outline-none bg-transparent placeholder-slate-300 dark:placeholder-gray-700 resize-none overflow-hidden"\n            />',
  'placeholder="e.g., Massive Pothole on Main Street"\n              className="text-2xl md:text-3xl font-display font-black text-[var(--text-1)] w-full outline-none bg-transparent placeholder-slate-300 dark:placeholder-gray-700 resize-none overflow-hidden"\n            />\n            {errors.title && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.title}</span>}'
);

// Category
code = code.replace(
  'onChange={(e) => setCategory(e.target.value as CategoryType)}',
  'onChange={(e) => { setCategory(e.target.value as CategoryType); setErrors(prev => ({...prev, category: ""})); }}'
);
code = code.replace(
  '                <option value="Other">Other</option>\n              </select>',
  '                <option value="Other">Other</option>\n              </select>\n              {errors.category && <span className="text-red-500 text-[10px] font-bold">{errors.category}</span>}'
);

// Priority
code = code.replace(
  'onClick={() => setPriority(pri as PriorityType)}',
  'onClick={() => { setPriority(pri as PriorityType); setErrors(prev => ({...prev, priority: ""})); }}'
);
code = code.replace(
  '                ))} // wait where does priority end\n              </div>',
  '                ))} // wait\n              </div>'
); // Actually I'll use regex for priority
code = code.replace(
  /(\{\(\["Low", "Medium", "High", "Critical"\] as const\)\.map\(\(pri\) => \([\s\S]*?\}\)\}[\s\S]*?<\/div>)/,
  `$1\n              {errors.priority && <span className="text-red-500 text-[10px] font-bold">{errors.priority}</span>}`
);
code = code.replace(
  /onClick=\{\(\) => setPriority\(pri\)\}/g,
  `onClick={() => { setPriority(pri as any); setErrors(prev => ({...prev, priority: ""})); }}`
);

// Landmark
code = code.replace(
  'onChange={(e) => handleLandmarkChange(e.target.value)}',
  'onChange={(e) => { handleLandmarkChange(e.target.value); setErrors(prev => ({...prev, landmark: ""})); }}'
);
code = code.replace(
  'className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"\n              />',
  'className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"\n              />\n              {errors.landmark && <span className="text-red-500 text-[10px] font-bold">{errors.landmark}</span>}'
);

// State
code = code.replace(
  'onChange={(e) => setState(e.target.value)}',
  'onChange={(e) => { setState(e.target.value); setErrors(prev => ({...prev, state: ""})); }}'
);
code = code.replace(
  '{states.map(s => <option key={s} value={s}>{s}</option>)}\n              </select>',
  '{states.map(s => <option key={s} value={s}>{s}</option>)}\n              </select>\n              {errors.state && <span className="text-red-500 text-[10px] font-bold">{errors.state}</span>}'
);

// District
code = code.replace(
  'onChange={(e) => setDistrict(e.target.value)}',
  'onChange={(e) => { setDistrict(e.target.value); setErrors(prev => ({...prev, district: ""})); }}'
);
code = code.replace(
  '{districtsList.map(d => <option key={d} value={d}>{d}</option>)}\n              </select>',
  '{districtsList.map(d => <option key={d} value={d}>{d}</option>)}\n              </select>\n              {errors.district && <span className="text-red-500 text-[10px] font-bold">{errors.district}</span>}'
);

// ULB
code = code.replace(
  'onChange={(e) => setUlb(e.target.value)}',
  'onChange={(e) => { setUlb(e.target.value); setErrors(prev => ({...prev, ulb: ""})); }}'
);
code = code.replace(
  '{ulbsList.map(u => <option key={u} value={u}>{u}</option>)}\n              </select>',
  '{ulbsList.map(u => <option key={u} value={u}>{u}</option>)}\n              </select>\n              {errors.ulb && <span className="text-red-500 text-[10px] font-bold">{errors.ulb}</span>}'
);

// Description
code = code.replace(
  'onChange={(e) => setDescription(e.target.value)}',
  'onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({...prev, description: ""})); }}'
);
code = code.replace(
  'className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all resize-none"\n            />',
  'className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[var(--cyan)] dark:focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all resize-none"\n            />\n            {errors.description && <span className="text-red-500 text-[10px] font-bold">{errors.description}</span>}'
);

// Image Error Display
code = code.replace(
  '<Camera className="w-3.5 h-3.5" /> Use Camera Lens\n            </button>\n          </div>',
  '<Camera className="w-3.5 h-3.5" /> Use Camera Lens\n            </button>\n          </div>\n          {errors.image && <span className="text-red-500 text-[10px] font-bold">{errors.image}</span>}'
);

// Process Image file success mapping
code = code.replace(
  'setImage(reader.result as string);\n      setUploading(false);',
  'setImage(reader.result as string);\n      setUploading(false);\n      setErrors(prev => ({...prev, image: ""}));'
);
code = code.replace(
  'setImage(dataUrl);\n        stopCamera();',
  'setImage(dataUrl);\n        setErrors(prev => ({...prev, image: ""}));\n        stopCamera();'
);

fs.writeFileSync('src/components/ReportIssue.tsx', code);
console.log('Fixed ReportIssue validation');
