const fs = require('fs');

// 1. Fix CitizenDashboard.tsx Pie Chart Radius
let dashPath = 'src/components/CitizenDashboard.tsx';
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace(/outerRadius=\{100\}/g, 'outerRadius={80}'); // Gives more room for labels on mobile
fs.writeFileSync(dashPath, dash);
console.log('Fixed CitizenDashboard');

// 2. Fix InteractiveMap.tsx Marker Overload Stutter
let mapPath = 'src/components/InteractiveMap.tsx';
let mapContent = fs.readFileSync(mapPath, 'utf8');

// The original code: `issues.forEach((issue) => {` under `// Now draw standard markers`
// We will replace it with:
// `const maxMarkers = showHeatmap ? 300 : 800;`
// `issues.slice(0, maxMarkers).forEach((issue) => {`
mapContent = mapContent.replace(
  /\/\/ Now draw standard markers\n    issues\.forEach\(\(issue\) => \{/g,
  '// Now draw standard markers (Limit to prevent DOM stutter)\n    const maxMarkers = showHeatmap ? 200 : 600;\n    issues.slice(0, maxMarkers).forEach((issue) => {'
);
fs.writeFileSync(mapPath, mapContent);
console.log('Fixed InteractiveMap');

