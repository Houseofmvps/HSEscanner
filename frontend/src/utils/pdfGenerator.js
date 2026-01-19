import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Generate PDF for a single photo
export const generateSinglePhotoPDF = (photo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor = [15, 23, 42];
  const accentColor = [249, 115, 22];
  const textColor = [30, 41, 59];
  const mutedColor = [100, 116, 139];

  const { analysisResults, fileName, uploadTime, processingTime } = photo;
  const { violations, riskLevel, safetyScore } = analysisResults;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("AI SAFETY VISION", margin, 20);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Individual Inspection Report", margin, 30);
  
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 40);

  yPos = 60;

  // File Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 35, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 35, 'S');
  
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INSPECTION DETAILS", margin + 5, yPos + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`File: ${fileName}`, margin + 5, yPos + 15);
  doc.text(`Analyzed: ${new Date(uploadTime).toLocaleString()}`, margin + 5, yPos + 22);
  doc.text(`Processing Time: ${processingTime?.toFixed(2)}s`, pageWidth - margin - 50, yPos + 15);

  yPos += 45;

  // Risk Assessment Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("RISK ASSESSMENT", margin, yPos);
  yPos += 10;

  // Risk Level and Safety Score boxes
  const boxWidth = (pageWidth - (margin * 2) - 10) / 2;
  
  // Risk Level Box
  const riskColor = riskLevel === "High" ? [239, 68, 68] : 
                    riskLevel === "Medium" ? [245, 158, 11] : [34, 197, 94];
  doc.setFillColor(...riskColor);
  doc.rect(margin, yPos, boxWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RISK LEVEL", margin + 5, yPos + 10);
  doc.setFontSize(16);
  doc.text(riskLevel.toUpperCase(), margin + 5, yPos + 24);

  // Safety Score Box
  const scoreColor = safetyScore >= 70 ? [34, 197, 94] : 
                     safetyScore >= 40 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...scoreColor);
  doc.rect(margin + boxWidth + 10, yPos, boxWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SAFETY SCORE", margin + boxWidth + 15, yPos + 10);
  doc.setFontSize(16);
  doc.text(`${safetyScore}%`, margin + boxWidth + 15, yPos + 24);

  yPos += 45;

  // Violations Section
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`VIOLATIONS FOUND (${violations.length})`, margin, yPos);
  yPos += 8;

  if (violations.length === 0) {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NO VIOLATIONS DETECTED", margin + 10, yPos + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    yPos += 35;
  } else {
    // Violations table
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Violation', 'Category', 'Location', 'Confidence']],
      body: violations.map((v, idx) => [
        (idx + 1).toString(),
        v.type,
        v.category,
        v.location,
        `${v.confidence}%`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didParseCell: function(data) {
        if (data.column.index === 4 && data.section === 'body') {
          const confidence = parseInt(data.cell.raw);
          if (confidence >= 80) data.cell.styles.textColor = [239, 68, 68];
          else if (confidence >= 60) data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [34, 197, 94];
        }
      }
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Check if we need a new page for recommendations
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }

  // Recommendations Section
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMMENDED ACTIONS", margin, yPos);
  yPos += 8;

  // Group violations by category
  const categoryCounts = {};
  violations.forEach(v => {
    categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
  });

  const recommendations = [];
  
  if (categoryCounts['PPE'] > 0) {
    recommendations.push([
      "PPE Compliance",
      "Immediately ensure all personnel wear proper PPE including hard hats, safety vests, gloves, and eye protection."
    ]);
  }
  
  if (categoryCounts['Equipment'] > 0) {
    recommendations.push([
      "Equipment Safety",
      "Review equipment placement and safety guards. Secure all machinery and cover exposed parts."
    ]);
  }
  
  if (categoryCounts['Environmental'] > 0) {
    recommendations.push([
      "Environmental Hazards",
      "Address spills, exposed wiring, and fire hazards immediately. Ensure proper containment."
    ]);
  }
  
  if (categoryCounts['Housekeeping'] > 0) {
    recommendations.push([
      "Housekeeping",
      "Schedule cleanup to remove debris and organize work areas. Establish regular housekeeping protocols."
    ]);
  }

  if (recommendations.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Action Required']],
      body: recommendations,
      theme: 'striped',
      headStyles: {
        fillColor: accentColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 120 }
      },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("All areas compliant. Continue regular safety monitoring.", margin + 10, yPos + 13);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(...mutedColor);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("AI Safety Vision - AI-Powered Inspection Tool", margin, footerY);
  doc.text("Confidential", pageWidth - margin - 25, footerY);

  // Save
  const safeFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
  const pdfFileName = `Safety_Report_${safeFileName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(pdfFileName);
  
  return pdfFileName;
};

// Generate batch PDF for multiple photos
export const generateBatchPDF = (photos, stats) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPos = margin;

  const primaryColor = [15, 23, 42];
  const accentColor = [249, 115, 22];
  const textColor = [30, 41, 59];
  const mutedColor = [100, 116, 139];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("AI SAFETY VISION - BATCH REPORT", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()} | ${photos.length} Photos Analyzed`, margin, 35);

  yPos = 55;

  // Executive Summary
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", margin, yPos);
  yPos += 10;

  const summaryData = [
    ["Total Photos Analyzed", stats.total.toString()],
    ["High Risk Items", stats.highRisk.toString()],
    ["Medium Risk Items", stats.mediumRisk.toString()],
    ["Low Risk Items", stats.lowRisk.toString()],
    ["Total Violations Found", stats.totalViolations.toString()],
    ["Average Safety Score", `${stats.avgSafetyScore}%`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' }
    },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Individual Photo Results
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INDIVIDUAL INSPECTION RESULTS", margin, yPos);
  yPos += 10;

  photos.forEach((photo, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    const { analysisResults, fileName } = photo;
    const { violations, riskLevel, safetyScore } = analysisResults;

    // Photo header bar
    const riskColor = riskLevel === "High" ? [239, 68, 68] : 
                      riskLevel === "Medium" ? [245, 158, 11] : [34, 197, 94];
    
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');
    doc.setDrawColor(...riskColor);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin, yPos + 25);
    
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${fileName.substring(0, 40)}${fileName.length > 40 ? '...' : ''}`, margin + 5, yPos + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Violations: ${violations.length}`, margin + 5, yPos + 18);
    
    // Risk badge
    doc.setFillColor(...riskColor);
    doc.rect(pageWidth - margin - 45, yPos + 5, 40, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${riskLevel.toUpperCase()} | ${safetyScore}%`, pageWidth - margin - 43, yPos + 15);

    yPos += 30;

    // Top violations for this photo
    if (violations.length > 0) {
      const topViolations = violations.slice(0, 3);
      topViolations.forEach(v => {
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.text(`• ${v.type} (${v.category}) - ${v.confidence}%`, margin + 10, yPos);
        yPos += 6;
      });
      if (violations.length > 3) {
        doc.text(`  + ${violations.length - 3} more violations`, margin + 10, yPos);
        yPos += 6;
      }
    }
    yPos += 5;
  });

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(...mutedColor);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text("AI Safety Vision - AI-Powered Inspection Tool", margin, footerY);
  doc.text("Confidential", pageWidth - margin - 25, footerY);

  const fileName = `AI_Safety_Vision_Batch_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};
