import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag, AlertTriangle, Shield, Eye, CheckCircle, FileDown } from "lucide-react";
import { generateSinglePhotoPDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";

const getRiskBadgeClass = (riskLevel) => {
  switch (riskLevel) {
    case 'High':
      return 'bg-red-500 text-white border-red-600';
    case 'Medium':
      return 'bg-amber-500 text-white border-amber-600';
    case 'Low':
      return 'bg-emerald-500 text-white border-emerald-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const PhotoCard = ({ photo, onSelect, onToggleFlag }) => {
  const { analysisResults, previewUrl, fileName, flaggedForFollowUp } = photo;
  const { riskLevel, safetyScore, violations } = analysisResults;
  
  const topViolations = violations.slice(0, 2);
  const hasMoreViolations = violations.length > 2;

  const handleDownloadPDF = (e) => {
    e.stopPropagation();
    try {
      const pdfFileName = generateSinglePhotoPDF(photo);
      toast.success("Report Downloaded", {
        description: pdfFileName
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate report");
    }
  };

  return (
    <Card 
      data-testid={`photo-card-${photo.photoId}`}
      className="group overflow-hidden rounded-sm border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onSelect(photo)}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] sm:aspect-video bg-slate-900 overflow-hidden">
        <img 
          src={previewUrl} 
          alt={fileName}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        
        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-l-2 border-t-2 border-cyan-400/60" />
          <div className="absolute top-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-r-2 border-t-2 border-cyan-400/60" />
          <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-l-2 border-b-2 border-cyan-400/60" />
          <div className="absolute bottom-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-r-2 border-b-2 border-cyan-400/60" />
        </div>
        
        {/* Risk Badge */}
        <Badge 
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 rounded-none px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${getRiskBadgeClass(riskLevel)} ${riskLevel === 'High' ? 'animate-pulse' : ''}`}
        >
          {riskLevel}
        </Badge>

        {/* Flag Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-2 left-2 sm:top-3 sm:left-3 h-6 w-6 sm:h-8 sm:w-8 bg-black/50 backdrop-blur-sm ${flaggedForFollowUp ? 'text-amber-500' : 'text-white/70 hover:text-white'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag(photo.photoId);
          }}
          data-testid={`flag-button-${photo.photoId}`}
        >
          <Flag className="w-3 h-3 sm:w-4 sm:h-4" fill={flaggedForFollowUp ? 'currentColor' : 'none'} />
        </Button>

        {/* Safety Score Overlay */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/70 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
            <span className={`text-sm sm:text-lg font-mono font-bold ${
              safetyScore >= 70 ? 'text-emerald-400' : 
              safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {safetyScore}%
            </span>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" className="rounded-sm uppercase tracking-wider font-bold text-xs">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-sm uppercase tracking-wider font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleDownloadPDF}
          >
            <FileDown className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-3 sm:p-4 bg-card">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <p className="text-xs sm:text-sm font-mono truncate flex-1 text-foreground" title={fileName}>
            {fileName}
          </p>
          {/* Mobile PDF Download Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:hidden ml-2 text-primary hover:text-primary/80"
            onClick={handleDownloadPDF}
            data-testid={`download-pdf-${photo.photoId}`}
          >
            <FileDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Violations Summary */}
        {violations.length > 0 ? (
          <div className="space-y-1.5 sm:space-y-2">
            {topViolations.map((violation, idx) => (
              <div key={idx} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${
                  violation.confidence >= 80 ? 'text-red-500' : 'text-amber-500'
                }`} />
                <span className="truncate flex-1 text-muted-foreground">{violation.type}</span>
                <span className="font-mono text-muted-foreground">
                  {violation.confidence}%
                </span>
              </div>
            ))}
            {hasMoreViolations && (
              <p className="text-[10px] sm:text-xs text-primary font-mono">
                +{violations.length - 2} more
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            <span className="font-mono">No violations</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AnalysisGallery = ({ photos, onSelectPhoto, onToggleFlag }) => {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div 
      data-testid="analysis-gallery"
      className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
    >
      {photos.map((photo, index) => (
        <div 
          key={photo.photoId} 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <PhotoCard
            photo={photo}
            onSelect={onSelectPhoto}
            onToggleFlag={onToggleFlag}
          />
        </div>
      ))}
    </div>
  );
};
