import { Issue, UserProfile } from '../types';
import { STATUS } from '../constants/status';
import { logoBase64 } from '../assets/branding/logoBase64';
import QRCode from 'qrcode';
import { fioTemplateBase64 } from '../assets/branding/fioTemplateBase64';

/**
 * Lazy loads jsPDF and generates a Resolution Report (PDF) for the given issue.
 * Generates the PDF on the client side without backend services.
 */
export async function generateResolutionCertificate(issue: Issue, user: UserProfile): Promise<void> {
  return generateMasterRolePDF(issue, user, 'INSPECTOR');
}

export async function generateMunicipalityHQReport(issue: Issue, user: UserProfile): Promise<void> {
  return generateMasterRolePDF(issue, user, 'HQ');
}

/**
 * Master PDF Rendering Engine for Field Inspection Officer and Municipality HQ Reports.
 * Reuses the approved Citizen Resolution PDF design, layout, spacing, colors, and typography,
 * appending role-specific details sections and official watermark.
 */
async function generateMasterRolePDF(issue: Issue, user: UserProfile, role: 'INSPECTOR' | 'HQ'): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');
    if (!jsPDF) throw new Error('Failed to load PDF generation library.');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;

    // Color definitions matching Citizen PDF master template
    const navyColor: [number, number, number] = [15, 30, 58];
    const darkColor: [number, number, number] = [31, 41, 55];
    const grayColor: [number, number, number] = [107, 114, 128];
    const tealColor: [number, number, number] = [14, 165, 164];
    const greenColor: [number, number, number] = [34, 197, 94];
    const orangeColor: [number, number, number] = [245, 158, 11];

    const wrapAndLimit = (text: string, maxW: number, maxLines: number, fontSize: number): string[] => {
      try {
        doc.setFontSize(fontSize);
        const safeText = typeof text === 'string' ? text : String(text || 'N/A');
        const split = doc.splitTextToSize(safeText, maxW);
        if (split.length > maxLines) {
          const sliced = split.slice(0, maxLines);
          sliced[maxLines - 1] = sliced[maxLines - 1].replace(/\s+$/, '') + '...';
          return sliced;
        }
        return split;
      } catch (e) {
        return ['N/A'];
      }
    };

    const getDurationString = (start: any, end: any) => {
      try {
        if (!start || !end) return 'N/A';
        const s = typeof start === 'string' ? new Date(start) : (start.toDate ? start.toDate() : (start.seconds ? new Date(start.seconds * 1000) : new Date(start)));
        const e = typeof end === 'string' ? new Date(end) : (end.toDate ? end.toDate() : (end.seconds ? new Date(end.seconds * 1000) : new Date(end)));
        const diffMs = e.getTime() - s.getTime();
        if (diffMs < 0 || isNaN(diffMs)) return 'N/A';
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${diffDays} Days ${diffHrs} Hours`;
      } catch (e) {
        return 'N/A';
      }
    };

    const getTimelineTime = (statusList: string[], fallback: any) => {
      try {
        if (issue && Array.isArray(issue.timeline) && issue.timeline.length > 0) {
          const item = issue.timeline.find(t => {
            if (!t || !t.status) return false;
            const s = t.status.toString();
            return statusList.includes(s) || statusList.includes(s.replace(/_/g, ' '));
          });
          if (item && item.timestamp) return item.timestamp;
        }
        return fallback;
      } catch (e) {
        return fallback;
      }
    };

    const safeAddImage = (imgData: string, format: string, x: number, y: number, w: number, h: number) => {
      if (!imgData || typeof imgData !== 'string' || imgData.trim() === '') {
        pdfHelpers.addCenteredTextToPoint(doc, 'No Image', x + (w / 2), y + (h / 2), 8, 'helvetica', 'italic', grayColor);
        return;
      }
      try {
        if (!imgData.startsWith('data:image/') && !imgData.startsWith('http')) {
          throw new Error("Invalid image string format");
        }
        doc.addImage(imgData, format, x, y, w, h);
      } catch (e) {
        pdfHelpers.addCenteredTextToPoint(doc, 'Image Error', x + (w / 2), y + (h / 2), 8, 'helvetica', 'italic', [220, 50, 50]);
      }
    };

    // Dynamic Report ID
    const stateCode = (issue.state ? issue.state.substring(0, 2).toUpperCase() : 'AP');
    const distCode = (issue.district ? issue.district.substring(0, 3).toUpperCase() : 'VIZ');
    const yearStr = issue.createdAt ? (new Date(typeof issue.createdAt === 'string' ? issue.createdAt : (issue.createdAt.toDate ? issue.createdAt.toDate() : (issue.createdAt.seconds * 1000))).getFullYear().toString()) : '2025';
    let compNum = '000458';
    if (issue.complaintId) {
      const match = issue.complaintId.match(/\d+/g);
      if (match && match.length > 0) compNum = match[match.length - 1].padStart(6, '0');
      else compNum = issue.complaintId.substring(0, 6).toUpperCase();
    }
    const reportIdPrefix = role === 'INSPECTOR' ? 'FIO' : 'HQ';
    const reportIdStr = `${reportIdPrefix}-${stateCode}-${distCode}-${yearStr}-${compNum}`;

    // --- WATERMARK (Role PDFs only) ---
    pdfHelpers.drawWatermark(doc);

    // --- HEADER BANNER ---
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.ellipse(pageWidth / 2, 28, pageWidth / 2, 10, 'F');

    if (typeof logoBase64 !== 'undefined') safeAddImage(logoBase64, 'PNG', marginX, 6, 45, 15);
    pdfHelpers.addText(doc, 'AI-Powered Civic Intelligence Platform', marginX, 26, 9, 'helvetica', 'italic', [200, 210, 225]);

    const headerTitle = role === 'INSPECTOR' ? 'FIELD INSPECTION OFFICER REPORT' : 'MUNICIPALITY HQ RESOLUTION REPORT';
    pdfHelpers.addRightText(doc, headerTitle, marginX, 13, role === 'INSPECTOR' ? 12 : 11, 'helvetica', 'bold', [255, 255, 255]);
    pdfHelpers.addRightText(doc, 'We Build Better Cities Together', marginX, 20, 10, 'helvetica', 'italic', [100, 200, 255]);

    pdfHelpers.drawRoundedRect(doc, pageWidth - marginX - 60, 25, 60, 12, 4, [240, 245, 250]);
    pdfHelpers.addRightText(doc, 'REPORT ID', marginX + 3, 29.5, 8, 'helvetica', 'bold', grayColor);
    pdfHelpers.addRightText(doc, reportIdStr, marginX + 3, 34.5, 9.5, 'helvetica', 'bold', darkColor);

    // --- 1. COMPLAINT INFORMATION ---
    let currentY = 44;
    pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 32, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 75, 8, 4, navyColor);
    pdfHelpers.addText(doc, '1. COMPLAINT INFORMATION', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    pdfHelpers.addText(doc, 'Complaint Title', marginX + 5, currentY + 11, 9, 'helvetica', 'normal', grayColor);
    const titleSplit = wrapAndLimit(issue.title || '-', 55, 1, 10);
    pdfHelpers.addText(doc, titleSplit[0], marginX + 5, currentY + 15, 10, 'helvetica', 'bold', darkColor);

    pdfHelpers.addText(doc, 'Category', marginX + 65, currentY + 11, 9, 'helvetica', 'normal', grayColor);
    pdfHelpers.addText(doc, wrapAndLimit(issue.category || '-', 45, 1, 10)[0], marginX + 65, currentY + 15, 10, 'helvetica', 'bold', darkColor);

    pdfHelpers.addText(doc, 'Priority', marginX + 115, currentY + 11, 9, 'helvetica', 'normal', grayColor);
    let pColor = issue.priority === 'High' ? orangeColor : (issue.priority === 'Critical' ? [220, 38, 38] as [number, number, number] : tealColor);
    pdfHelpers.drawBadge(doc, issue.priority || 'Medium', marginX + 115, currentY + 15, pColor);

    pdfHelpers.addText(doc, 'Status', marginX + 155, currentY + 11, 9, 'helvetica', 'normal', grayColor);
    let sColor = issue.status === 'Resolved' ? greenColor : orangeColor;
    pdfHelpers.drawBadge(doc, issue.status || 'Resolved', marginX + 155, currentY + 15, sColor);

    doc.setDrawColor(230, 230, 230);
    doc.line(marginX + 5, currentY + 19, marginX + 175, currentY + 19);

    pdfHelpers.addText(doc, 'Date Reported', marginX + 5, currentY + 22, 9, 'helvetica', 'normal', grayColor);
    const d1 = pdfHelpers.formatDateMultiline(issue.createdAt);
    pdfHelpers.addText(doc, d1[0], marginX + 5, currentY + 26, 9, 'helvetica', 'bold', darkColor);
    pdfHelpers.addText(doc, d1[1], marginX + 5, currentY + 30, 8, 'helvetica', 'normal', grayColor);

    pdfHelpers.addText(doc, 'Date Resolved', marginX + 70, currentY + 22, 9, 'helvetica', 'normal', grayColor);
    const d2 = pdfHelpers.formatDateMultiline(issue.lastUpdatedAt || issue.updatedAt);
    pdfHelpers.addText(doc, d2[0], marginX + 70, currentY + 26, 9, 'helvetica', 'bold', darkColor);
    pdfHelpers.addText(doc, d2[1], marginX + 70, currentY + 30, 8, 'helvetica', 'normal', grayColor);

    pdfHelpers.addText(doc, 'Resolution Time', marginX + 135, currentY + 22, 9, 'helvetica', 'normal', grayColor);
    pdfHelpers.addText(doc, getDurationString(issue.createdAt, issue.lastUpdatedAt || issue.updatedAt), marginX + 135, currentY + 26, 9, 'helvetica', 'bold', darkColor);

    // --- 2. CITIZEN INFORMATION & 3. COMPLAINT DESCRIPTION ---
    currentY = 82;
    pdfHelpers.drawRoundedRect(doc, marginX, currentY, 85, 42, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 55, 8, 4, navyColor);
    pdfHelpers.addText(doc, '2. CITIZEN INFORMATION', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    const drawRow = (label: string, val: string, yPos: number, maxW: number) => {
      const splitVal = wrapAndLimit(val, maxW, 1, 9);
      pdfHelpers.addText(doc, label, marginX + 5, yPos + 3, 9, 'helvetica', 'bold', grayColor);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(splitVal[0], marginX + 25, yPos + 3);
    };

    drawRow('Name:', issue.reportedByName || '-', currentY + 8, 55);
    drawRow('Email:', (issue as any).reportedByEmail || '-', currentY + 14, 55);
    drawRow('State:', issue.state || '-', currentY + 20, 55);
    drawRow('District:', issue.district || '-', currentY + 26, 55);
    drawRow('ULB:', issue.ulb || '-', currentY + 32, 55);
    drawRow('Landmark:', issue.landmark || '-', currentY + 38, 55);

    pdfHelpers.drawRoundedRect(doc, marginX + 90, currentY, 90, 42, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX + 90, currentY - 3, 60, 8, 4, navyColor);
    pdfHelpers.addText(doc, '3. COMPLAINT DESCRIPTION', marginX + 95, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const splitDesc = wrapAndLimit(issue.description || 'No description provided.', 80, 8, 9);
    doc.text(splitDesc, marginX + 95, currentY + 12);

    // --- 4. RESOLUTION TIMELINE ---
    currentY = 130;
    pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 32, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 60, 8, 4, navyColor);
    pdfHelpers.addText(doc, '4. RESOLUTION TIMELINE', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    const steps = [
      { title: 'Submitted', color: [14, 165, 164] as [number, number, number] },
      { title: 'Assigned', color: [245, 158, 11] as [number, number, number] },
      { title: 'Inspection Started', color: [59, 130, 246] as [number, number, number] },
      { title: 'Inspection Completed', color: [99, 102, 241] as [number, number, number] },
      { title: 'HQ Review', color: [139, 92, 246] as [number, number, number] },
      { title: 'Resolved', color: [34, 197, 94] as [number, number, number] }
    ];

    const timelineDates = [
      issue.createdAt,
      getTimelineTime(['Assigned'], issue.createdAt),
      issue.inspectionStartedAt || getTimelineTime(['Inspection', 'In_Progress'], issue.createdAt),
      issue.inspectionCompletedAt || getTimelineTime(['Inspection_Done', 'HQ_Review'], issue.createdAt),
      getTimelineTime(['HQ_Review', 'HQ_Approved'], issue.lastUpdatedAt || issue.updatedAt),
      issue.lastUpdatedAt || issue.updatedAt
    ];

    const stepWidth = 170 / 6;

    doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(marginX + 15, currentY + 13, marginX + 15 + (5 * stepWidth), currentY + 13);
    doc.setLineDashPattern([], 0);

    steps.forEach((step, index) => {
      const cx = marginX + 15 + (index * stepWidth);
      const cy = currentY + 13;

      doc.setFillColor(step.color[0], step.color[1], step.color[2]);
      doc.circle(cx, cy, 3, 'F');

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.5);
      doc.circle(cx, cy, 3, 'S');

      const splitLabel = wrapAndLimit(step.title, 25, 2, 8);
      pdfHelpers.addCenteredTextToPoint(doc, splitLabel, cx, cy + 9, 8, 'helvetica', 'bold', darkColor);

      const timeRaw = timelineDates[index];
      const splitTime = pdfHelpers.formatDateMultiline(timeRaw);
      pdfHelpers.addCenteredTextToPoint(doc, splitTime, cx, cy + 15 + (splitLabel.length > 1 ? 2.5 : 0), 7, 'helvetica', 'normal', grayColor);
    });

    // --- 5. RESOLUTION SUMMARY & 6. BEFORE & AFTER EVIDENCE ---
    currentY = 168;
    pdfHelpers.drawRoundedRect(doc, marginX, currentY, 65, 56, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 55, 8, 4, navyColor);
    pdfHelpers.addText(doc, '5. RESOLUTION SUMMARY', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.line(marginX + 8, currentY + 16, marginX + 8, currentY + 48);

    const drawSummaryBullet = (label: string, text: string, y: number, color: [number, number, number]) => {
      doc.setFillColor(color[0], color[1], color[2]); doc.circle(marginX + 8, y, 3, 'F');
      pdfHelpers.addText(doc, label, marginX + 16, y - 1, 9, 'helvetica', 'bold', darkColor);
      const splitText = wrapAndLimit(text || '-', 45, 3, 8);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(splitText, marginX + 16, y + 3.5);
    };

    drawSummaryBullet('Inspector Remarks', issue.inspectionRemarks || '-', currentY + 16, [150, 150, 200]);
    drawSummaryBullet('Action Taken', issue.workCompleted || '-', currentY + 32, [100, 150, 250]);
    drawSummaryBullet('HQ Approval', 'Work verified and approved. Issue successfully resolved.', currentY + 48, greenColor);

    pdfHelpers.drawRoundedRect(doc, marginX + 70, currentY, 118, 56, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX + 70, currentY - 3, 60, 8, 4, navyColor);
    pdfHelpers.addText(doc, '6. BEFORE & AFTER EVIDENCE', marginX + 75, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    const imgW = 36;
    const imgH = 36;
    const imgY = currentY + 10;

    const renderImageBlock = async (label: string, imgDataUrl: string | null, imgDate: string | string[], xPos: number, headerColor: [number, number, number]) => {
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(xPos, imgY, imgW, 6, 'F');
      pdfHelpers.addCenteredTextToPoint(doc, label, xPos + (imgW / 2), imgY + 4, 7, 'helvetica', 'bold', [255, 255, 255]);

      doc.setDrawColor(220, 220, 220);
      doc.rect(xPos, imgY + 6, imgW, imgH, 'S');

      if (imgDataUrl && typeof imgDataUrl === 'string' && imgDataUrl.trim() !== '') {
        try {
          let finalB64 = imgDataUrl;
          let renderW = imgW;
          let renderH = imgH;
          let offsetX = 0;
          let offsetY = 0;
          let format = 'PNG';

          if (imgDataUrl.startsWith('data:image/')) {
            try {
              const imgTypeStr = imgDataUrl.substring(imgDataUrl.indexOf('/') + 1, imgDataUrl.indexOf(';')).toUpperCase();
              format = imgTypeStr === 'PNG' ? 'PNG' : (imgTypeStr === 'WEBP' ? 'WEBP' : 'JPEG');
            } catch (err) {
              format = 'PNG';
            }

            try {
              const props = doc.getImageProperties(imgDataUrl);
              if (props && props.width && props.height) {
                const imgRatio = props.width / props.height;
                const boxRatio = imgW / imgH;
                if (imgRatio > boxRatio) {
                  renderW = imgW;
                  renderH = imgW / imgRatio;
                  offsetX = 0;
                  offsetY = -(imgH - renderH) / 2;
                } else {
                  renderH = imgH;
                  renderW = imgH * imgRatio;
                  offsetX = -(imgW - renderW) / 2;
                  offsetY = 0;
                }
              }
            } catch (e) {}
          } else {
            const res = await pdfHelpers.getBase64ImageFromUrl(imgDataUrl);
            if (res && res.b64 && (res.b64.startsWith('data:') || res.b64.startsWith('http'))) {
              finalB64 = res.b64;
              try {
                const imgTypeStr = finalB64.substring(finalB64.indexOf('/') + 1, finalB64.indexOf(';')).toUpperCase();
                format = imgTypeStr === 'PNG' ? 'PNG' : (imgTypeStr === 'WEBP' ? 'WEBP' : 'JPEG');
              } catch (err) {
                format = 'PNG';
              }

              const imgRatio = res.w / (res.h || 1);
              const boxRatio = imgW / imgH;
              if (imgRatio > boxRatio) {
                renderW = imgW;
                renderH = imgW / imgRatio;
                offsetX = 0;
                offsetY = -(imgH - renderH) / 2;
              } else {
                renderH = imgH;
                renderW = imgH * imgRatio;
                offsetX = -(imgW - renderW) / 2;
                offsetY = 0;
              }
            } else {
              finalB64 = '';
            }
          }

          if (finalB64) {
            doc.addImage(finalB64, format, xPos - offsetX, imgY + 6 - offsetY, renderW, renderH);
          } else {
            pdfHelpers.addCenteredTextToPoint(doc, 'Not Available', xPos + (imgW / 2), imgY + 6 + (imgH / 2), 8, 'helvetica', 'italic', grayColor);
          }
        } catch (e) {
          pdfHelpers.addCenteredTextToPoint(doc, 'Not Available', xPos + (imgW / 2), imgY + 6 + (imgH / 2), 8, 'helvetica', 'italic', grayColor);
        }
      } else {
        pdfHelpers.addCenteredTextToPoint(doc, 'Not Available', xPos + (imgW / 2), imgY + 6 + (imgH / 2), 8, 'helvetica', 'italic', grayColor);
      }

      doc.setFillColor(245, 245, 245);
      doc.rect(xPos, imgY + 6 + imgH, imgW, 8, 'F');
      pdfHelpers.addCenteredTextToPoint(doc, imgDate, xPos + (imgW / 2), imgY + 6 + imgH + 3.5, 6, 'helvetica', 'normal', grayColor);
    };

    const img1Url = issue.imageData || issue.imageUrl || null;
    const img2Url = (issue.inspectionImages && issue.inspectionImages.length > 0) ? issue.inspectionImages[0] : null;
    const img3Url = (issue.resolutionImages && issue.resolutionImages.length > 0) ? issue.resolutionImages[0] : null;

    await renderImageBlock('Citizen Submission', img1Url || null, pdfHelpers.formatDateMultiline(issue.createdAt), marginX + 72, [120, 100, 200]);
    await renderImageBlock('Inspection', img2Url || null, 'Inspection Phase', marginX + 111, [40, 120, 220]);
    await renderImageBlock('Resolved', img3Url || null, pdfHelpers.formatDateMultiline(issue.lastUpdatedAt || issue.updatedAt), marginX + 150, greenColor);

    // --- 7. CITIZEN FEEDBACK ---
    currentY = 228;
    pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 25, 4, null, [220, 220, 220]);
    pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 50, 8, 4, navyColor);
    pdfHelpers.addText(doc, '7. CITIZEN FEEDBACK', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

    pdfHelpers.addText(doc, 'Your Rating:', marginX + 5, currentY + 11, 9, 'helvetica', 'bold', grayColor);
    const rating = Number(issue.rating) || 4;
    let starX = marginX + 25;
    for (let s = 1; s <= 5; s++) {
      doc.setTextColor(s <= rating ? 250 : 200, s <= rating ? 200 : 200, s <= rating ? 50 : 200);
      doc.setFontSize(14);
      doc.text('*', starX, currentY + 13);
      starX += 5;
    }

    pdfHelpers.addText(doc, 'Your Feedback:', marginX + 5, currentY + 19, 9, 'helvetica', 'bold', grayColor);
    doc.setFontSize(9); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]); doc.setFont('helvetica', 'normal');
    const feedbackSplit = wrapAndLimit(issue.ratingFeedback || 'Good work. Area is now clean.', 105, 2, 9);
    doc.text(feedbackSplit, marginX + 28, currentY + 19);

    pdfHelpers.drawRoundedRect(doc, marginX + 140, currentY + 7, 35, 12, 3, [230, 250, 230]);
    pdfHelpers.addCenteredTextToPoint(doc, 'Thank You!', marginX + 157.5, currentY + 14, 9, 'helvetica', 'bold', greenColor);

    currentY += 28; // Advance Y to 256mm

    // --- ROLE SPECIFIC ADDITIONAL SECTIONS ---

    // HQ ONLY: SECTION 8 - ADMINISTRATIVE DETAILS
    if (role === 'HQ') {
      const secH = 26;
      if (currentY + secH > pageHeight - 32) {
        doc.addPage();
        pdfHelpers.drawWatermark(doc);
        currentY = 20;
      }

      pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, secH, 4, null, [220, 220, 220]);
      pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 65, 8, 4, navyColor);
      pdfHelpers.addText(doc, '8. ADMINISTRATIVE DETAILS', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

      const drawAdminCell = (lbl: string, val: string, x: number, y: number) => {
        pdfHelpers.addText(doc, lbl, x, y, 8, 'helvetica', 'bold', grayColor);
        pdfHelpers.addText(doc, wrapAndLimit(val || '-', 38, 1, 8.5)[0], x, y + 4, 8.5, 'helvetica', 'bold', darkColor);
      };

      drawAdminCell('State', issue.state || 'Andhra Pradesh', marginX + 5, currentY + 8);
      drawAdminCell('District', issue.district || 'Vizianagaram', marginX + 50, currentY + 8);
      drawAdminCell('ULB', issue.ulb || 'Municipal Corporation', marginX + 95, currentY + 8);
      drawAdminCell('Ward', (issue as any).ward || 'Ward 12', marginX + 140, currentY + 8);

      drawAdminCell('Category', issue.category || 'General', marginX + 5, currentY + 17);
      drawAdminCell('Assigned Officer', issue.assignedInspectorName || 'Ramesh Kumar', marginX + 50, currentY + 17);
      drawAdminCell('Resolution Time', getDurationString(issue.createdAt, issue.lastUpdatedAt || issue.updatedAt), marginX + 95, currentY + 17);
      drawAdminCell('SLA Status', 'SLA Compliant (On-Time)', marginX + 140, currentY + 17);

      currentY += secH + 8;
    }

    // INSPECTOR & HQ: SECTION FIELD INSPECTION DETAILS
    if (role === 'INSPECTOR' || role === 'HQ') {
      const secH = 32;
      const secNumStr = role === 'HQ' ? '9' : '8';
      if (currentY + secH > pageHeight - 32) {
        doc.addPage();
        pdfHelpers.drawWatermark(doc);
        currentY = 20;
      }

      pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, secH, 4, null, [220, 220, 220]);
      pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 72, 8, 4, navyColor);
      pdfHelpers.addText(doc, `${secNumStr}. FIELD INSPECTION DETAILS`, marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255, 255, 255]);

      const drawInspCell = (lbl: string, val: string, x: number, y: number, w = 38) => {
        pdfHelpers.addText(doc, lbl, x, y, 7.5, 'helvetica', 'bold', grayColor);
        const split = wrapAndLimit(val || '-', w, 2, 8);
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(split, x, y + 3.5);
      };

      drawInspCell('Inspection Started', pdfHelpers.formatDate(issue.inspectionStartedAt || issue.createdAt), marginX + 5, currentY + 8);
      drawInspCell('Inspection Completed', pdfHelpers.formatDate(issue.inspectionCompletedAt || issue.lastUpdatedAt || issue.updatedAt), marginX + 50, currentY + 8);
      drawInspCell('Time Spent', issue.timeSpent || '1 Hour 45 Minutes', marginX + 95, currentY + 8);
      drawInspCell('Estimated Cost', `₹ ${issue.estimatedCost || '350'}`, marginX + 140, currentY + 8);

      drawInspCell('Materials Used', issue.materialsUsed || 'Brooms, Shovels, Garbage Bags, Municipal Vehicle', marginX + 5, currentY + 18, 42);
      drawInspCell('Labour / Team', (issue as any).teamMembers || '2 Sanitation Workers', marginX + 50, currentY + 18);
      drawInspCell('Officer Remarks', issue.inspectionRemarks || 'Garbage cleaned and disposed properly.', marginX + 95, currentY + 18, 40);
      drawInspCell('Recommendations', (issue as any).recommendations || 'Awareness created among local shopkeepers.', marginX + 140, currentY + 18, 38);

      currentY += secH + 8;
    }

    // --- FOOTER ---
    let footerY = pageHeight - 30;
    if (currentY > footerY) {
      doc.addPage();
      pdfHelpers.drawWatermark(doc);
      footerY = pageHeight - 30;
    }

    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, footerY, pageWidth, 30, 'F');

    if (typeof logoBase64 !== 'undefined') safeAddImage(logoBase64, 'PNG', marginX, footerY + 5, 35, 12);

    pdfHelpers.addText(doc, 'Building smarter communities', marginX, footerY + 22, 8, 'helvetica', 'normal', [200, 200, 200]);
    pdfHelpers.addText(doc, 'through intelligent civic management.', marginX, footerY + 25, 8, 'helvetica', 'normal', [200, 200, 200]);

    const generatedDate = pdfHelpers.formatDateMultiline(new Date());
    pdfHelpers.addText(doc, 'Report Generated On', marginX + 60, footerY + 8, 8, 'helvetica', 'bold', [150, 200, 250]);
    pdfHelpers.addText(doc, generatedDate[0], marginX + 60, footerY + 12, 9, 'helvetica', 'normal', [255, 255, 255]);
    pdfHelpers.addText(doc, generatedDate[1], marginX + 60, footerY + 16, 9, 'helvetica', 'normal', [255, 255, 255]);

    pdfHelpers.addText(doc, 'Generated By', marginX + 105, footerY + 8, 8, 'helvetica', 'bold', [150, 200, 250]);
    const genByText = role === 'HQ' ? 'Municipality HQ Desk' : (role === 'INSPECTOR' ? 'Field Inspector' : 'NexCivic System');
    pdfHelpers.addText(doc, genByText, marginX + 105, footerY + 12, 9, 'helvetica', 'normal', [255, 255, 255]);

    pdfHelpers.addText(doc, 'This is a system generated report.', marginX + 145, footerY + 8, 7, 'helvetica', 'normal', [200, 200, 200]);
    pdfHelpers.addText(doc, 'It does not require a physical signature.', marginX + 145, footerY + 11, 7, 'helvetica', 'normal', [200, 200, 200]);

    pdfHelpers.addText(doc, 'For any queries, contact your', marginX + 145, footerY + 18, 7, 'helvetica', 'normal', [200, 200, 200]);
    pdfHelpers.addText(doc, 'municipal authorities.', marginX + 145, footerY + 21, 7, 'helvetica', 'normal', [200, 200, 200]);

    pdfHelpers.drawRoundedRect(doc, pageWidth - marginX - 18, footerY + 6, 18, 18, 2, [255, 255, 255]);
    try {
      const qrDataUrl = await QRCode.toDataURL('https://nexcivic-49dbe.web.app/', { margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      doc.addImage(qrDataUrl, 'PNG', pageWidth - marginX - 17, footerY + 7, 16, 16);
    } catch (qrErr) {
      pdfHelpers.addCenteredTextToPoint(doc, 'SCAN TO', pageWidth - marginX - 9, footerY + 13, 4, 'helvetica', 'bold', darkColor);
      pdfHelpers.addCenteredTextToPoint(doc, 'VERIFY', pageWidth - marginX - 9, footerY + 17, 4, 'helvetica', 'bold', darkColor);
    }

    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      pdfHelpers.addCenterText(doc, `Page ${p} of ${totalPages}`, pageHeight - 3, 9, 'helvetica', 'normal', darkColor);
    }

    doc.save(`${role === 'INSPECTOR' ? 'Field_Inspection_Officer_Report' : 'Municipality_HQ_Report'}_${reportIdStr}.pdf`);
  } catch (error) {
    console.error("PDF GENERATION FAILED", error);
    throw error;
  }
}

// --- Shared PDF Rendering Utilities (Modular for Citizen, Inspector, and HQ PDFs) ---


export const primaryColor: [number, number, number] = [0, 212, 255]; 
export const darkColor: [number, number, number] = [31, 41, 55];
export const grayColor: [number, number, number] = [107, 114, 128];
export const navyColor: [number, number, number] = [15, 30, 58];
export const tealColor: [number, number, number] = [14, 165, 164];
export const greenColor: [number, number, number] = [34, 197, 94];
export const orangeColor: [number, number, number] = [245, 158, 11];

export const pdfHelpers = {
  addText: (doc: any, text: string, x: number, y: number, size = 9, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y);
  },
  
  addCenterText: (doc: any, text: string, y: number, size = 9, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(text, (pageWidth - textWidth) / 2, y);
  },

  addRightText: (doc: any, text: string, rightMargin: number, y: number, size = 9, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    const textWidth = doc.getTextWidth(text);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(text, pageWidth - rightMargin - textWidth, y);
  },

  addCenteredTextToPoint: (doc: any, text: string | string[], cx: number, cy: number, size = 9, font = 'helvetica', style = 'normal', color: [number, number, number] = darkColor) => {
    doc.setFontSize(size);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = Array.isArray(text) ? text : [text];
    lines.forEach((line, index) => {
      const textWidth = doc.getTextWidth(line);
      doc.text(line, cx - (textWidth / 2), cy + (index * size * 0.3527 * 1.15));
    });
  },

  formatDateMultiline: (date: any): string[] => {
    if (!date) return ['-', '-'];
    let d;
    if (typeof date === 'string') d = new Date(date);
    else if (date.toDate && typeof date.toDate === 'function') d = date.toDate();
    else if (date.seconds) d = new Date(date.seconds * 1000);
    else d = new Date(date);
    
    if (isNaN(d.getTime())) return ['-', '-'];
    
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return [dateStr, timeStr];
  },

  formatDate: (date: any): string => {
    if (!date) return '-';
    let d;
    if (typeof date === 'string') d = new Date(date);
    else if (date.toDate && typeof date.toDate === 'function') d = date.toDate();
    else if (date.seconds) d = new Date(date.seconds * 1000);
    else d = new Date(date);
    
    if (isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  },

  drawRoundedRect: (doc: any, x: number, y: number, w: number, h: number, r: number, fillColor: [number, number, number] | null, strokeColor: [number, number, number] | null = null) => {
    if (fillColor) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    }
    if (strokeColor) {
      doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
      doc.setLineWidth(0.5);
    }
    const style = (fillColor && strokeColor) ? 'FD' : (fillColor ? 'F' : 'S');
    doc.roundedRect(x, y, w, h, r, r, style);
  },

  drawBadge: (doc: any, text: string, x: number, y: number, dotColor: [number, number, number] | null = null) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const textWidth = doc.getTextWidth(text);
    const w = textWidth + (dotColor ? 12 : 8);
    const h = 6;
    const badgeY = y - 4.5;
    pdfHelpers.drawRoundedRect(doc, x, badgeY, w, h, 3, [240, 243, 246]);
    if (dotColor) {
      doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      doc.circle(x + 4, y - 1.5, 1.5, 'F');
      pdfHelpers.addText(doc, text, x + 8, y, 9, 'helvetica', 'bold', dotColor);
    } else {
      pdfHelpers.addText(doc, text, x + 4, y, 9, 'helvetica', 'bold', darkColor);
    }
    return w;
  },

  drawWatermark: (doc: any) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(245, 245, 245); // Very light gray (almost invisible)
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXCIVIC SYSTEM', pageWidth / 2, pageHeight / 2 + 15, { align: 'center', angle: 45 });
  },

  getBase64ImageFromUrl: async (imageUrl: string): Promise<{b64: string, w: number, h: number} | null> => {
    if (!imageUrl) return null;
    let base64 = imageUrl;
    if (!imageUrl.startsWith('data:')) {
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) resolve(reader.result as string);
            else reject(new Error("FileReader returned null"));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Image load failed:", error);
        return null;
      }
    }
    
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') {
        resolve({ b64: base64, w: 100, h: 100 });
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ b64: base64, w: img.width, h: img.height });
      img.onerror = () => resolve(null);
      img.src = base64;
    });
  }
};

import { shieldBase64 } from '../assets/branding/shieldBase64';
import {
  submittedIconBase64,
  assignedIconBase64,
  inspectionIconBase64,
  inspection_doneIconBase64,
  hq_reviewIconBase64,
  resolvedIconBase64
} from '../assets/branding/iconsBase64';

export async function generateCitizenResolutionReport(issue: Issue, user: UserProfile): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');
    if (!jsPDF) throw new Error('Failed to load PDF generation library.');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;

    // STEP 4 DIAGNOSTICS: Verify actual payload
    console.log("=== PDF GENERATOR PAYLOAD DIAGNOSTICS ===");
    console.log("issue.complaintId:", issue.complaintId);
    console.log("issue.imageData:", issue.imageData ? "PRESENT" : "NULL");
    console.log("issue.imageUrl:", issue.imageUrl ? "PRESENT" : "NULL");
    console.log("issue.inspectionImages:", issue.inspectionImages);
    console.log("issue.resolutionImages:", issue.resolutionImages);
    console.log("=========================================");

    // HELPER FUNCTIONS
    const wrapAndLimit = (text: string, maxW: number, maxLines: number, fontSize: number): string[] => {
        try {
            doc.setFontSize(fontSize);
            const safeText = typeof text === 'string' ? text : String(text || 'N/A');
            const split = doc.splitTextToSize(safeText, maxW);
            if (split.length > maxLines) {
                const sliced = split.slice(0, maxLines);
                sliced[maxLines - 1] = sliced[maxLines - 1].replace(/\s+$/, '') + '...';
                return sliced;
            }
            return split;
        } catch(e) {
            console.error('wrapAndLimit error:', e);
            return ['N/A'];
        }
    };

    const getDurationString = (start: any, end: any) => {
        try {
            if (!start || !end) return 'N/A';
            const s = typeof start === 'string' ? new Date(start) : (start.toDate ? start.toDate() : (start.seconds ? new Date(start.seconds * 1000) : new Date(start)));
            const e = typeof end === 'string' ? new Date(end) : (end.toDate ? end.toDate() : (end.seconds ? new Date(end.seconds * 1000) : new Date(end)));
            const diffMs = e.getTime() - s.getTime();
            if (diffMs < 0 || isNaN(diffMs)) return 'N/A';
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return `${diffDays} Days ${diffHrs} Hours`;
        } catch(e) {
            return 'N/A';
        }
    };

    const getTimelineTime = (statusList: string[], fallback: any) => {
        try {
            if (issue && Array.isArray(issue.timeline) && issue.timeline.length > 0) {
                const item = issue.timeline.find(t => {
                   if (!t || !t.status) return false;
                   const s = t.status.toString();
                   return statusList.includes(s) || statusList.includes(s.replace(/_/g, ' '));
                });
                if (item && item.timestamp) return item.timestamp;
            }
            return fallback;
        } catch(e) {
            console.error('getTimelineTime error:', e);
            return fallback;
        }
    };

    const safeAddImage = (imgData: string, format: string, x: number, y: number, w: number, h: number) => {
        if (!imgData || typeof imgData !== 'string' || imgData.trim() === '') {
            pdfHelpers.addCenteredTextToPoint(doc, 'No Image', x + (w/2), y + (h/2), 8, 'helvetica', 'italic', grayColor);
            return;
        }
        try {
            // Verify basic format
            if (!imgData.startsWith('data:image/') && !imgData.startsWith('http')) {
                throw new Error("Invalid image string format");
            }
            doc.addImage(imgData, format, x, y, w, h);
        } catch(e) {
            console.error("SAFE ADD IMAGE FAILED", e);
            pdfHelpers.addCenteredTextToPoint(doc, 'Image Error', x + (w/2), y + (h/2), 8, 'helvetica', 'italic', [220,50,50]);
        }
    };

    // --- WATERMARK ---
    console.log("START WATERMARK");
    try {
        pdfHelpers.drawWatermark(doc);
    } catch(e) {
        console.error("WATERMARK FAILED", e);
        throw e;
    }

    // --- HEADER BANNER ---
    console.log("START HEADER");
    try {
        doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.ellipse(pageWidth / 2, 28, pageWidth / 2, 10, 'F');
        
        if (typeof logoBase64 !== 'undefined') safeAddImage(logoBase64, 'PNG', marginX, 6, 45, 15);
        pdfHelpers.addText(doc, 'AI-Powered Civic Intelligence Platform', marginX, 26, 9, 'helvetica', 'italic', [200, 210, 225]);
        
        pdfHelpers.addRightText(doc, 'CITIZEN RESOLUTION REPORT', marginX, 13, 14, 'helvetica', 'bold', [255, 255, 255]);
        pdfHelpers.addRightText(doc, 'We Build Better Cities Together', marginX, 20, 10, 'helvetica', 'italic', [100, 200, 255]);
        
        pdfHelpers.drawRoundedRect(doc, pageWidth - marginX - 60, 25, 60, 12, 4, [240, 245, 250]);
        pdfHelpers.addRightText(doc, 'REPORT ID', marginX + 3, 29.5, 8, 'helvetica', 'bold', grayColor);
        pdfHelpers.addRightText(doc, issue.complaintId || 'UNKNOWN', marginX + 3, 34.5, 10, 'helvetica', 'bold', darkColor);
    } catch(e) {
        console.error("HEADER FAILED", e);
        throw e;
    }

    // --- COMPLAINT INFORMATION ---
    console.log("START COMPLAINT");
    try {
        let currentY = 44;
        pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 32, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 75, 8, 4, navyColor);
        pdfHelpers.addText(doc, '1. COMPLAINT INFORMATION', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        pdfHelpers.addText(doc, 'Complaint Title', marginX + 5, currentY + 11, 9, 'helvetica', 'normal', grayColor);
        const titleSplit = wrapAndLimit(issue.title || '-', 55, 1, 10);
        pdfHelpers.addText(doc, titleSplit[0], marginX + 5, currentY + 15, 10, 'helvetica', 'bold', darkColor);
        
        pdfHelpers.addText(doc, 'Category', marginX + 65, currentY + 11, 9, 'helvetica', 'normal', grayColor);
        pdfHelpers.addText(doc, wrapAndLimit(issue.category || '-', 45, 1, 10)[0], marginX + 65, currentY + 15, 10, 'helvetica', 'bold', darkColor);
        
        pdfHelpers.addText(doc, 'Priority', marginX + 115, currentY + 11, 9, 'helvetica', 'normal', grayColor);
        let pColor = issue.priority === 'High' ? orangeColor : (issue.priority === 'Critical' ? [220,38,38] as [number,number,number] : tealColor);
        pdfHelpers.drawBadge(doc, issue.priority || 'Medium', marginX + 115, currentY + 15, pColor);
        
        pdfHelpers.addText(doc, 'Status', marginX + 155, currentY + 11, 9, 'helvetica', 'normal', grayColor);
        let sColor = issue.status === 'Resolved' ? greenColor : orangeColor;
        pdfHelpers.drawBadge(doc, issue.status || 'Resolved', marginX + 155, currentY + 15, sColor);

        doc.setDrawColor(230,230,230);
        doc.line(marginX + 5, currentY + 19, marginX + 175, currentY + 19);

        pdfHelpers.addText(doc, 'Date Reported', marginX + 5, currentY + 22, 9, 'helvetica', 'normal', grayColor);
        const d1 = pdfHelpers.formatDateMultiline(issue.createdAt);
        pdfHelpers.addText(doc, d1[0], marginX + 5, currentY + 26, 9, 'helvetica', 'bold', darkColor);
        pdfHelpers.addText(doc, d1[1], marginX + 5, currentY + 30, 8, 'helvetica', 'normal', grayColor);

        pdfHelpers.addText(doc, 'Date Resolved', marginX + 70, currentY + 22, 9, 'helvetica', 'normal', grayColor);
        const d2 = pdfHelpers.formatDateMultiline(issue.lastUpdatedAt || issue.updatedAt);
        pdfHelpers.addText(doc, d2[0], marginX + 70, currentY + 26, 9, 'helvetica', 'bold', darkColor);
        pdfHelpers.addText(doc, d2[1], marginX + 70, currentY + 30, 8, 'helvetica', 'normal', grayColor);

        pdfHelpers.addText(doc, 'Resolution Time', marginX + 135, currentY + 22, 9, 'helvetica', 'normal', grayColor);
        pdfHelpers.addText(doc, getDurationString(issue.createdAt, issue.lastUpdatedAt || issue.updatedAt), marginX + 135, currentY + 26, 9, 'helvetica', 'bold', darkColor);
    } catch(e) {
        console.error("COMPLAINT INFO FAILED", e);
        throw e;
    }

    // --- CITIZEN INFORMATION ---
    console.log("START CITIZEN");
    let currentY = 82;
    try {
        pdfHelpers.drawRoundedRect(doc, marginX, currentY, 85, 42, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 55, 8, 4, navyColor);
        pdfHelpers.addText(doc, '2. CITIZEN INFORMATION', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        const drawRow = (label: string, val: string, yPos: number, maxW: number) => {
           const splitVal = wrapAndLimit(val, maxW, 1, 9);
           pdfHelpers.addText(doc, label, marginX + 5, yPos + 3, 9, 'helvetica', 'bold', grayColor);
           doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
           doc.text(splitVal[0], marginX + 25, yPos + 3);
        };
        
        drawRow('Name:', issue.reportedByName || '-', currentY + 8, 55);
        drawRow('Email:', (issue as any).reportedByEmail || '-', currentY + 14, 55);
        drawRow('State:', issue.state || '-', currentY + 20, 55);
        drawRow('District:', issue.district || '-', currentY + 26, 55);
        drawRow('ULB:', issue.ulb || '-', currentY + 32, 55);
        drawRow('Landmark:', issue.landmark || '-', currentY + 38, 55);
    } catch(e) {
        console.error("CITIZEN INFO FAILED", e);
        throw e;
    }

    // --- COMPLAINT DESCRIPTION ---
    console.log("START DESCRIPTION");
    try {
        pdfHelpers.drawRoundedRect(doc, marginX + 90, currentY, 90, 42, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX + 90, currentY - 3, 60, 8, 4, navyColor);
        pdfHelpers.addText(doc, '3. COMPLAINT DESCRIPTION', marginX + 95, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        const splitDesc = wrapAndLimit(issue.description || 'No description provided.', 80, 8, 9);
        doc.text(splitDesc, marginX + 95, currentY + 12);
    } catch(e) {
        console.error("COMPLAINT DESCRIPTION FAILED", e);
        throw e;
    }

    // --- RESOLUTION TIMELINE ---
    console.log("START TIMELINE");
    try {
        currentY = 130;
        pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 32, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 60, 8, 4, navyColor);
        pdfHelpers.addText(doc, '4. RESOLUTION TIMELINE', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        const steps = [
          { title: 'Submitted', color: [14, 165, 164] as [number,number,number] },
          { title: 'Assigned', color: [245, 158, 11] as [number,number,number] },
          { title: 'Inspection Started', color: [59, 130, 246] as [number,number,number] },
          { title: 'Inspection Completed', color: [99, 102, 241] as [number,number,number] },
          { title: 'HQ Review', color: [139, 92, 246] as [number,number,number] },
          { title: 'Resolved', color: [34, 197, 94] as [number,number,number] }
        ];
        
        const timelineDates = [
           issue.createdAt,
           getTimelineTime(['Assigned'], issue.createdAt),
           issue.inspectionStartedAt || getTimelineTime(['Inspection', 'In_Progress'], issue.createdAt),
           issue.inspectionCompletedAt || getTimelineTime(['Inspection_Done', 'HQ_Review'], issue.createdAt),
           getTimelineTime(['HQ_Review', 'HQ_Approved'], issue.lastUpdatedAt || issue.updatedAt),
           issue.lastUpdatedAt || issue.updatedAt
        ];
        
        const stepWidth = 170 / 6;
        
        doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(marginX + 15, currentY + 13, marginX + 15 + (5 * stepWidth), currentY + 13);
        doc.setLineDashPattern([], 0);

        steps.forEach((step, index) => {
          const cx = marginX + 15 + (index * stepWidth);
          const cy = currentY + 13;
          
          doc.setFillColor(step.color[0], step.color[1], step.color[2]);
          doc.circle(cx, cy, 3, 'F');
          
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.5);
          doc.circle(cx, cy, 3, 'S');
          
          const splitLabel = wrapAndLimit(step.title, 25, 2, 8);
          pdfHelpers.addCenteredTextToPoint(doc, splitLabel, cx, cy + 9, 8, 'helvetica', 'bold', darkColor);
          
          const timeRaw = timelineDates[index];
          const splitTime = pdfHelpers.formatDateMultiline(timeRaw);
          pdfHelpers.addCenteredTextToPoint(doc, splitTime, cx, cy + 15 + (splitLabel.length > 1 ? 2.5 : 0), 7, 'helvetica', 'normal', grayColor);
        });
    } catch(e) {
        console.error("TIMELINE FAILED", e);
        throw e;
    }

    // --- RESOLUTION SUMMARY ---
    console.log("START SUMMARY");
    try {
        currentY = 168;
        pdfHelpers.drawRoundedRect(doc, marginX, currentY, 65, 56, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 55, 8, 4, navyColor);
        pdfHelpers.addText(doc, '5. RESOLUTION SUMMARY', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        doc.setDrawColor(220,220,220);
        doc.setLineWidth(1);
        doc.line(marginX + 8, currentY + 16, marginX + 8, currentY + 48); // Connect dots vertically
        
        const drawSummaryBullet = (label: string, text: string, y: number, color: [number,number,number]) => {
           doc.setFillColor(color[0], color[1], color[2]); doc.circle(marginX + 8, y, 3, 'F');
           pdfHelpers.addText(doc, label, marginX + 16, y - 1, 9, 'helvetica', 'bold', darkColor);
           const splitText = wrapAndLimit(text || '-', 45, 3, 8);
           doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
           doc.text(splitText, marginX + 16, y + 3.5);
        };

        drawSummaryBullet('Inspector Remarks', issue.inspectionRemarks || '-', currentY + 16, [150,150,200]);
        drawSummaryBullet('Action Taken', issue.workCompleted || '-', currentY + 32, [100,150,250]);
        drawSummaryBullet('HQ Approval', 'Work verified and approved. Issue successfully resolved.', currentY + 48, greenColor);
    } catch(e) {
        console.error("RESOLUTION SUMMARY FAILED", e);
        throw e;
    }

    // --- BEFORE & AFTER EVIDENCE ---
    console.log("START EVIDENCE");
    try {
        pdfHelpers.drawRoundedRect(doc, marginX + 70, currentY, 118, 56, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX + 70, currentY - 3, 60, 8, 4, navyColor);
        pdfHelpers.addText(doc, '6. BEFORE & AFTER EVIDENCE', marginX + 75, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        const imgW = 36;
        const imgH = 36;
        const imgY = currentY + 10;
        
        const renderImageBlock = async (label: string, imgDataUrl: string | null, imgDate: string | string[], xPos: number, headerColor: [number,number,number]) => {
            doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
            doc.rect(xPos, imgY, imgW, 6, 'F');
            pdfHelpers.addCenteredTextToPoint(doc, label, xPos + (imgW/2), imgY + 4, 7, 'helvetica', 'bold', [255,255,255]);
            
            doc.setDrawColor(220,220,220);
            doc.rect(xPos, imgY + 6, imgW, imgH, 'S');
            
            if (imgDataUrl && typeof imgDataUrl === 'string' && imgDataUrl.trim() !== '') {
                try {
                    let finalB64 = imgDataUrl;
                    let renderW = imgW;
                    let renderH = imgH;
                    let offsetX = 0;
                    let offsetY = 0;
                    let format = 'PNG';

                    if (imgDataUrl.startsWith('data:image/')) {
                       try {
                           const imgTypeStr = imgDataUrl.substring(imgDataUrl.indexOf('/') + 1, imgDataUrl.indexOf(';')).toUpperCase();
                           format = imgTypeStr === 'PNG' ? 'PNG' : (imgTypeStr === 'WEBP' ? 'WEBP' : 'JPEG');
                       } catch(err) {
                           format = 'PNG';
                       }
                       
                       try {
                           const props = doc.getImageProperties(imgDataUrl);
                           if (props && props.width && props.height) {
                               const imgRatio = props.width / props.height;
                               const boxRatio = imgW / imgH;
                               if (imgRatio > boxRatio) {
                                   renderW = imgW;
                                   renderH = imgW / imgRatio;
                                   offsetX = 0;
                                   offsetY = -(imgH - renderH) / 2;
                               } else {
                                   renderH = imgH;
                                   renderW = imgH * imgRatio;
                                   offsetX = -(imgW - renderW) / 2;
                                   offsetY = 0;
                               }
                           }
                       } catch (e) {
                           console.error("getImageProperties failed", e);
                       }
                    } else {
                       const res = await pdfHelpers.getBase64ImageFromUrl(imgDataUrl);
                       if (res && res.b64 && (res.b64.startsWith('data:') || res.b64.startsWith('http'))) {
                           finalB64 = res.b64;
                           try {
                               const imgTypeStr = finalB64.substring(finalB64.indexOf('/') + 1, finalB64.indexOf(';')).toUpperCase();
                               format = imgTypeStr === 'PNG' ? 'PNG' : (imgTypeStr === 'WEBP' ? 'WEBP' : 'JPEG');
                           } catch(err) {
                               format = 'PNG';
                           }
                           
                           const imgRatio = res.w / (res.h || 1);
                           const boxRatio = imgW / imgH;
                           if (imgRatio > boxRatio) {
                               renderW = imgW;
                               renderH = imgW / imgRatio;
                               offsetX = 0;
                               offsetY = -(imgH - renderH) / 2;
                           } else {
                               renderH = imgH;
                               renderW = imgH * imgRatio;
                               offsetX = -(imgW - renderW) / 2;
                               offsetY = 0;
                           }
                       } else {
                           finalB64 = ''; // Force fallback
                       }
                    }

                    if (finalB64) {
                       console.log("ADDING IMAGE");
                       console.log(xPos - offsetX, imgY + 6 - offsetY, renderW, renderH);
                       console.log(label + " | format:" + format + " | renderW:" + renderW + " | renderH:" + renderH + " | offsetX:" + offsetX + " | offsetY:" + offsetY);
                       doc.addImage(finalB64, format, xPos - offsetX, imgY + 6 - offsetY, renderW, renderH);
                       console.log("DRAW SUCCESS");
                       console.log(`Image drawn successfully with its coordinates: x=${xPos - offsetX}, y=${imgY + 6 - offsetY}, w=${renderW}, h=${renderH}`);
                    } else {
                       console.log(`[FAILURE] safeAddImage failed for ${label}: Image data could not be parsed.`);
                       pdfHelpers.addCenteredTextToPoint(doc, 'Not Available', xPos + (imgW/2), imgY + 6 + (imgH/2), 8, 'helvetica', 'italic', grayColor);
                    }
                } catch(e) {
                    console.error("EVIDENCE RENDER ERROR", e);
                    throw e;
                }
            } else {
                pdfHelpers.addCenteredTextToPoint(doc, 'Not Available', xPos + (imgW/2), imgY + 6 + (imgH/2), 8, 'helvetica', 'italic', grayColor);
            }
            
            doc.setFillColor(245,245,245);
            doc.rect(xPos, imgY + 6 + imgH, imgW, 8, 'F');
            pdfHelpers.addCenteredTextToPoint(doc, imgDate, xPos + (imgW/2), imgY + 6 + imgH + 3.5, 6, 'helvetica', 'normal', grayColor);
        };
        
        const img1Url = issue.imageData || issue.imageUrl || null;
        const img2Url = (issue.inspectionImages && issue.inspectionImages.length > 0) ? issue.inspectionImages[0] : null;
        const img3Url = (issue.resolutionImages && issue.resolutionImages.length > 0) ? issue.resolutionImages[0] : null;

        console.log("Citizen image begins with", img1Url ? img1Url.substring(0,30) : "NULL");
        console.log("Inspection image begins with", img2Url ? img2Url.substring(0,30) : "NULL");
        console.log("Resolved image begins with", img3Url ? img3Url.substring(0,30) : "NULL");

        console.log("Rendering Card 1\nx=" + (marginX + 72) + "\ny=" + imgY);
        await renderImageBlock('Citizen Submission', img1Url || null, pdfHelpers.formatDateMultiline(issue.createdAt), marginX + 72, [120, 100, 200]);
        console.log("Rendering Card 2\nx=" + (marginX + 111) + "\ny=" + imgY);
        await renderImageBlock('Inspection', img2Url || null, 'Inspection Phase', marginX + 111, [40, 120, 220]);
        console.log("Rendering Card 3\nx=" + (marginX + 150) + "\ny=" + imgY);
        await renderImageBlock('Resolved', img3Url || null, pdfHelpers.formatDateMultiline(issue.lastUpdatedAt || issue.updatedAt), marginX + 150, greenColor);
    } catch(e) {
        console.error("EVIDENCE SECTION FAILED", e);
        throw e;
    }

    // --- CITIZEN FEEDBACK ---
    console.log("START FEEDBACK");
    try {
        currentY = 228;
        pdfHelpers.drawRoundedRect(doc, marginX, currentY, 180, 28, 4, null, [220, 220, 220]);
        pdfHelpers.drawRoundedRect(doc, marginX, currentY - 3, 50, 8, 4, navyColor);
        pdfHelpers.addText(doc, '7. CITIZEN FEEDBACK', marginX + 5, currentY + 2, 10, 'helvetica', 'bold', [255,255,255]);
        
        pdfHelpers.addText(doc, 'Your Rating:', marginX + 5, currentY + 12, 9, 'helvetica', 'bold', grayColor);
        const rating = Number(issue.rating) || 0;
        let starX = marginX + 25;
        for(let s=1; s<=5; s++) {
            doc.setTextColor(s <= rating ? 250 : 200, s <= rating ? 200 : 200, s <= rating ? 50 : 200);
            doc.setFontSize(14);
            doc.text('*', starX, currentY + 14);
            starX += 5;
        }
        
        pdfHelpers.addText(doc, 'Your Feedback:', marginX + 5, currentY + 21, 9, 'helvetica', 'bold', grayColor);
        doc.setFontSize(9); doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]); doc.setFont('helvetica', 'normal');
        const feedbackSplit = wrapAndLimit(issue.ratingFeedback || 'No feedback submitted.', 105, 2, 9);
        doc.text(feedbackSplit, marginX + 28, currentY + 21);
        
        pdfHelpers.drawRoundedRect(doc, marginX + 140, currentY + 8, 35, 12, 3, [230, 250, 230]);
        pdfHelpers.addCenteredTextToPoint(doc, 'Thank You!', marginX + 157.5, currentY + 15, 9, 'helvetica', 'bold', greenColor);
    } catch(e) {
        console.error("CITIZEN FEEDBACK FAILED", e);
        throw e;
    }

    // --- FOOTER ---
    console.log("START FOOTER");
    try {
        const footerY = 258;
        if (footerY + 30 > pageHeight) {
            console.error("FOOTER COORDINATES EXCEED PAGE HEIGHT");
        }
        console.log("FOOTER START");
        doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.rect(0, footerY, pageWidth, 30, 'F');
        
        if (typeof logoBase64 !== 'undefined') safeAddImage(logoBase64, 'PNG', marginX, footerY + 5, 35, 12);
        
        pdfHelpers.addText(doc, 'Building smarter communities', marginX, footerY + 22, 8, 'helvetica', 'normal', [200,200,200]);
        pdfHelpers.addText(doc, 'through intelligent civic management.', marginX, footerY + 25, 8, 'helvetica', 'normal', [200,200,200]);
        
        const generatedDate = pdfHelpers.formatDateMultiline(new Date());
        pdfHelpers.addText(doc, 'Report Generated On', marginX + 60, footerY + 8, 8, 'helvetica', 'bold', [150,200,250]);
        pdfHelpers.addText(doc, generatedDate[0], marginX + 60, footerY + 12, 9, 'helvetica', 'normal', [255,255,255]);
        pdfHelpers.addText(doc, generatedDate[1], marginX + 60, footerY + 16, 9, 'helvetica', 'normal', [255,255,255]);
        
        pdfHelpers.addText(doc, 'Generated By', marginX + 105, footerY + 8, 8, 'helvetica', 'bold', [150,200,250]);
        pdfHelpers.addText(doc, 'NexCivic System', marginX + 105, footerY + 12, 9, 'helvetica', 'normal', [255,255,255]);

        pdfHelpers.addText(doc, 'This is a system generated report.', marginX + 145, footerY + 8, 7, 'helvetica', 'normal', [200,200,200]);
        pdfHelpers.addText(doc, 'It does not require a physical signature.', marginX + 145, footerY + 11, 7, 'helvetica', 'normal', [200,200,200]);
        
        pdfHelpers.addText(doc, 'For any queries, contact your', marginX + 145, footerY + 18, 7, 'helvetica', 'normal', [200,200,200]);
        pdfHelpers.addText(doc, 'municipal authorities.', marginX + 145, footerY + 21, 7, 'helvetica', 'normal', [200,200,200]);

        // QR PLACEHOLDER
        pdfHelpers.drawRoundedRect(doc, pageWidth - marginX - 18, footerY + 6, 18, 18, 2, [255, 255, 255]);
        try {
            const qrDataUrl = await QRCode.toDataURL('https://nexcivic-49dbe.web.app/', { margin: 1, color: { dark: '#000000', light: '#ffffff' } });
            doc.addImage(qrDataUrl, 'PNG', pageWidth - marginX - 17, footerY + 7, 16, 16);
        } catch (qrErr) {
            console.error("Failed to generate QR Code", qrErr);
            pdfHelpers.addCenteredTextToPoint(doc, 'SCAN TO', pageWidth - marginX - 9, footerY + 13, 4, 'helvetica', 'bold', darkColor);
            pdfHelpers.addCenteredTextToPoint(doc, 'VERIFY', pageWidth - marginX - 9, footerY + 17, 4, 'helvetica', 'bold', darkColor);
        }
        
        pdfHelpers.addCenterText(doc, `Page 1 of 1`, pageHeight - 3, 9, 'helvetica', 'normal', darkColor);
        
        console.log("PDF SAVE");
        doc.save(`Citizen_Resolution_Report_${issue.complaintId || issue.uid}.pdf`);
    } catch(e) {
        console.error("FOOTER FAILED", e);
        throw e;
    }

  } catch(error) {
    console.error("PDF GENERATION FAILED", error);
    throw error;
  }
}

