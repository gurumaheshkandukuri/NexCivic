import { Issue, UserProfile } from '../types';
import { STATUS } from '../constants/status';

/**
 * Lazy loads jsPDF and generates a Resolution Report (PDF) for the given issue.
 * Generates the PDF on the client side without backend services.
 */
export async function generateResolutionCertificate(issue: Issue, user: UserProfile): Promise<void> {
  // Dynamically import jsPDF and autoTable to avoid increasing the initial bundle size
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  
  // jspdf-autotable attaches itself to jsPDF instance or can be imported as a plugin
  // We'll use the default export if available, otherwise just use the imported module
  const autoTable = autoTableModule.default || (autoTableModule as any).autoTable;
  
  if (!jsPDF) {
    throw new Error('Failed to load PDF generation library.');
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helpers
  const primaryColor: [number, number, number] = [0, 212, 255]; // NexCivic Cyan
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];
  
  const addText = (text: string, x: number, y: number, size = 10, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y);
  };
  
  const addCenterText = (text: string, y: number, size = 10, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (typeof date === 'string') return new Date(date).toLocaleString();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate().toLocaleString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    return new Date(date).toLocaleString();
  };

  let currentY = 20;

  // Header
  addCenterText('NexCivic', currentY, 24, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  addCenterText('AI Powered Civic Intelligence Platform', currentY, 12, 'helvetica', 'italic', grayColor);
  currentY += 15;
  
  addCenterText('COMPLAINT RESOLUTION REPORT', currentY, 18, 'helvetica', 'bold', darkColor);
  currentY += 15;
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 10;

  // Complaint Information
  addText('COMPLAINT INFORMATION', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  
  const complaintInfo = [
    ['Complaint ID:', issue.complaintId || issue.uid || 'N/A'],
    ['Title:', issue.title || 'N/A'],
    ['Category:', issue.category || 'N/A'],
    ['Priority:', issue.priority || 'Medium'],
    ['Date Submitted:', formatDate(issue.createdAt)],
    ['Resolution Date:', formatDate((issue as any).resolvedAt || (issue.timeline && issue.timeline.length > 0 ? issue.timeline[issue.timeline.length - 1].timestamp : issue.updatedAt))],
  ];
  
  autoTable(doc, {
    startY: currentY,
    body: complaintInfo,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 10, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 20 }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Location
  addText('LOCATION', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  
  const locationInfo = [
    ['Landmark:', issue.landmark || 'N/A'],
    ['Area:', issue.area || 'N/A'],
    ['ULB:', issue.ulb || 'N/A'],
    ['District:', issue.district || 'N/A'],
    ['State:', issue.state || 'N/A'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: locationInfo,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 10, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 20 }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Resolution Details
  addText('RESOLUTION DETAILS', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  
  const resolutionDetails = [
    ['Work Completed:', issue.workCompleted || 'N/A'],
    ['Inspector Remarks:', issue.inspectionRemarks || 'N/A'],
    ['Resolution Summary:', (issue as any).aiSummary || issue.workCompleted || 'N/A'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: resolutionDetails,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 10, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 20 }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Authority Details
  addText('AUTHORITY DETAILS', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  
  const authorityDetails = [
    ['Assigned Inspector:', issue.assignedInspectorName || 'N/A'],
    ['Municipality HQ:', issue.ulb || 'N/A'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: authorityDetails,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 10, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 20 }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Citizen Feedback
  if (issue.rating) {
    addText('CITIZEN FEEDBACK', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
    currentY += 8;
    
    const feedbackDetails = [
      ['Citizen Rating:', `${issue.rating} / 5 Stars`],
      ['Citizen Feedback:', issue.ratingFeedback || 'None provided'],
    ];

    autoTable(doc, {
      startY: currentY,
      body: feedbackDetails,
      theme: 'plain',
      styles: { cellPadding: 1, fontSize: 10, textColor: darkColor },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 20 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Check if we need a new page for Timeline
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  // Timeline Summary
  addText('TIMELINE SUMMARY', 20, currentY, 12, 'helvetica', 'bold', primaryColor);
  currentY += 8;
  
  const timelineData = issue.timeline ? issue.timeline.map((event: any) => [
    formatDate(event.timestamp),
    event.status || event.title || 'Event',
    event.message || event.description || ''
  ]) : [];

  if (timelineData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Status / Event', 'Details']],
      body: timelineData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 20, right: 20 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  } else {
    addText('No timeline data available.', 20, currentY, 10, 'helvetica', 'italic', grayColor);
    currentY += 15;
  }
  
  // Footer
  // Check if we need a new page for footer
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(20, currentY, pageWidth - 20, currentY);
  currentY += 8;
  
  const certificateId = `REP-${issue.uid?.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  
  addCenterText('This report is generated for informational purposes.', currentY, 9, 'helvetica', 'italic', grayColor);
  currentY += 6;
  addCenterText(`Generated digitally by NexCivic • Generated Date: ${new Date().toLocaleString()} • Document Version: 1.0 • ID: ${certificateId}`, currentY, 8, 'helvetica', 'normal', grayColor);
  
  // Trigger download
  doc.save(`NexCivic_Resolution_Report_${issue.complaintId || issue.uid}.pdf`);
}
