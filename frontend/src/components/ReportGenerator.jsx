import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";

export const ReportGenerator = ({ photos, stats }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (photos.length === 0) {
      toast.error("No photos to generate report");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPos = margin;

      // Colors
      const primaryColor = [15, 23, 42]; // NESR Blue
      const accentColor = [249, 115, 22]; // Safety Orange
      const textColor = [30, 41, 59];
      const mutedColor = [100, 116, 139];

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("AI SAFETY VISION - INSPECTION REPORT", margin, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);

      yPos = 55;

      // Summary Section
      doc.setTextColor(...textColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", margin, yPos);
      yPos += 10;

      // Summary Stats Table
      const summaryData = [
        ["Total Photos Analyzed", stats.total.toString()],
        ["High Risk Items", stats.highRisk.toString()],
        ["Medium Risk Items", stats.mediumRisk.toString()],
        ["Low Risk Items", stats.lowRisk.toString()],
        ["Total Violations Found", stats.totalViolations.toString()],
        ["Average Safety Score", `${stats.avgSafetyScore}%`],
      ];

      doc.autoTable({
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right' }
        },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Risk Assessment
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RISK ASSESSMENT", margin, yPos);
      yPos += 8;

      // Calculate overall risk
      let overallRisk = "Low";
      if (stats.highRisk > 0) overallRisk = "High";
      else if (stats.mediumRisk > 0) overallRisk = "Medium";

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(`Overall Site Risk Level: `, margin, yPos);
      
      const riskColor = overallRisk === "High" ? [239, 68, 68] : 
                        overallRisk === "Medium" ? [245, 158, 11] : [34, 197, 94];
      doc.setTextColor(...riskColor);
      doc.setFont("helvetica", "bold");
      doc.text(overallRisk.toUpperCase(), margin + 45, yPos);
      
      yPos += 15;

      // Violations Detail Section
      doc.setTextColor(...textColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED FINDINGS", margin, yPos);
      yPos += 10;

      // Collect all violations
      const allViolations = [];
      photos.forEach(photo => {
        photo.analysisResults.violations.forEach(v => {
          allViolations.push({
            file: photo.fileName,
            type: v.type,
            category: v.category,
            location: v.location,
            confidence: `${v.confidence}%`,
            risk: photo.analysisResults.riskLevel
          });
        });
      });

      if (allViolations.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['File', 'Violation', 'Category', 'Location', 'Confidence', 'Risk']],
          body: allViolations.map(v => [
            v.file.substring(0, 15) + (v.file.length > 15 ? '...' : ''),
            v.type,
            v.category,
            v.location,
            v.confidence,
            v.risk
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
            5: { cellWidth: 15 }
          },
          margin: { left: margin, right: margin },
          didParseCell: function(data) {
            if (data.column.index === 5) {
              const risk = data.cell.raw;
              if (risk === 'High') data.cell.styles.textColor = [239, 68, 68];
              else if (risk === 'Medium') data.cell.styles.textColor = [245, 158, 11];
              else data.cell.styles.textColor = [34, 197, 94];
            }
          }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(...mutedColor);
        doc.text("No violations detected in any of the analyzed photos.", margin, yPos);
        yPos += 15;
      }

      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      // Recommended Actions
      doc.setTextColor(...textColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RECOMMENDED ACTIONS", margin, yPos);
      yPos += 10;

      // Group violations by category for recommendations
      const categoryCounts = {};
      allViolations.forEach(v => {
        categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
      });

      const recommendations = [];
      
      if (categoryCounts['PPE'] > 0) {
        recommendations.push([
          "PPE Compliance",
          `${categoryCounts['PPE']} violation(s) found`,
          "Conduct immediate PPE inspection. Ensure all personnel have proper hard hats, safety vests, gloves, and eye protection."
        ]);
      }
      
      if (categoryCounts['Equipment'] > 0) {
        recommendations.push([
          "Equipment Safety",
          `${categoryCounts['Equipment']} violation(s) found`,
          "Review equipment placement and guarding. Ensure all machinery has proper safety guards and is correctly positioned."
        ]);
      }
      
      if (categoryCounts['Environmental'] > 0) {
        recommendations.push([
          "Environmental Hazards",
          `${categoryCounts['Environmental']} violation(s) found`,
          "Address spills, exposed wiring, and fire hazards immediately. Ensure proper containment and signage."
        ]);
      }
      
      if (categoryCounts['Housekeeping'] > 0) {
        recommendations.push([
          "Housekeeping",
          `${categoryCounts['Housekeeping']} violation(s) found`,
          "Schedule immediate cleanup. Remove debris, organize work areas, and establish regular housekeeping protocols."
        ]);
      }

      if (recommendations.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Category', 'Issues', 'Recommended Action']],
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
            cellPadding: 4,
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 30 },
            2: { cellWidth: 100 }
          },
          margin: { left: margin, right: margin },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(34, 197, 94);
        doc.text("All areas inspected are compliant. Continue regular safety monitoring.", margin, yPos);
      }

      // Footer
      const footerY = pageHeight - 15;
      doc.setDrawColor(...mutedColor);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      doc.text("AI Safety Vision - AI-Powered Inspection Tool", margin, footerY);
      doc.text("Confidential", pageWidth - margin - 25, footerY);

      // Save the PDF
      const fileName = `AI_Safety_Vision_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Report generated successfully", {
        description: `Saved as ${fileName}`
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report", {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      data-testid="generate-report-button"
      onClick={generatePDF}
      disabled={isGenerating || photos.length === 0}
      className="rounded-sm font-bold uppercase tracking-wider"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          Export PDF Report
        </>
      )}
    </Button>
  );
};
