const fs = require('fs');

function fixAdminPanel() {
  let c = fs.readFileSync('src/components/AdminPanel.tsx','utf8');
  c = c.replace(/zone: user.zone === "All Zones" \|\| !user.zone \? "Zone A" : user.zone,/g, 'state: user.assignedState || "Delhi", district: user.assignedDistrict || "Central", ulb: user.assignedULBs?.[0] || "NDMC",');
  c = c.replace(/status: "Open",/g, 'status: "Submitted",');
  fs.writeFileSync('src/components/AdminPanel.tsx', c);
  console.log('Fixed AdminPanel');
}

function fixCitizenDashboard() {
  let c = fs.readFileSync('src/components/CitizenDashboard.tsx','utf8');
  c = c.replace(/user\.id/g, 'user.uid');
  c = c.replace(/user\.points/g, 'user.xp');
  c = c.replace(/issue\.id/g, 'issue.uid');
  c = c.replace(/issue\.reportedBy\b/g, 'issue.reportedByUID');
  c = c.replace(/issue\.imageUrl/g, 'issue.inspectionImages?.[0]');
  c = c.replace(/issue\.address/g, '(issue.landmark || issue.district)');
  c = c.replace(/issue\.confirmCount/g, 'issue.communitySupportCount');
  c = c.replace(/status === "Open"/g, 'status === "Submitted"');
  fs.writeFileSync('src/components/CitizenDashboard.tsx', c);
  console.log('Fixed CitizenDashboard basic props');
}

fixAdminPanel();
fixCitizenDashboard();
