import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Shield, 
  Flag, 
  Trash2, 
  Clock,
  MapPin,
  Save,
  X,
  ChevronDown
} from "lucide-react";

const getRiskBadgeClass = (riskLevel) => {
  switch (riskLevel) {
    case 'High':
      return 'bg-red-500 text-white';
    case 'Medium':
      return 'bg-amber-500 text-white';
    case 'Low':
      return 'bg-emerald-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'PPE':
      return 'text-red-500 bg-red-500/10';
    case 'Equipment':
      return 'text-amber-500 bg-amber-500/10';
    case 'Environmental':
      return 'text-blue-500 bg-blue-500/10';
    case 'Housekeeping':
      return 'text-purple-500 bg-purple-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export const PhotoDetailModal = ({ 
  photo, 
  isOpen, 
  onClose, 
  onUpdateNotes, 
  onToggleFlag,
  onDelete 
}) => {
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (photo) {
      setNotes(photo.userNotes || '');
      setHasChanges(false);
    }
  }, [photo]);

  if (!photo) return null;

  const { analysisResults, previewUrl, fileName, uploadTime, flaggedForFollowUp, processingTime } = photo;
  const { riskLevel, safetyScore, violations } = analysisResults;

  const handleNotesChange = (value) => {
    setNotes(value);
    setHasChanges(value !== photo.userNotes);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(photo.photoId, notes);
    setHasChanges(false);
  };

  // Group violations by category
  const groupedViolations = violations.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] max-h-[90vh] p-0 rounded-sm overflow-hidden flex flex-col" 
        data-testid="photo-detail-modal"
        aria-describedby="photo-analysis-description"
      >
        {/* Mobile-first layout - stack on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-hidden">
          
          {/* Image Section - Fixed height on mobile, flexible on desktop */}
          <div className="relative bg-black md:w-1/2 flex-shrink-0">
            <div className="relative h-48 sm:h-64 md:h-full md:min-h-[400px]">
              <img 
                src={previewUrl} 
                alt={fileName}
                className="w-full h-full object-contain"
              />
              
              {/* HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60" />
                <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60" />
              </div>

              {/* Risk Badge */}
              <Badge 
                className={`absolute top-3 right-12 rounded-none px-2 py-1 text-xs font-bold uppercase tracking-widest ${getRiskBadgeClass(riskLevel)}`}
              >
                {riskLevel} RISK
              </Badge>

              {/* Safety Score */}
              <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-sm border border-cyan-500/30">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Safety Score</p>
                <p className={`text-xl font-heading font-bold ${
                  safetyScore >= 70 ? 'text-emerald-400' : 
                  safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {safetyScore}%
                </p>
              </div>
            </div>
          </div>

          {/* Details Section - Scrollable */}
          <div className="flex flex-col md:w-1/2 bg-card overflow-hidden">
            <DialogHeader className="p-4 border-b border-border flex-shrink-0">
              <DialogTitle className="font-heading text-lg uppercase tracking-tight">
                Analysis Details
              </DialogTitle>
              <p id="photo-analysis-description" className="sr-only">
                Safety analysis details for {fileName}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{processingTime?.toFixed(2)}s</span>
                </div>
                <span className="hidden sm:inline">|</span>
                <span className="text-[10px] sm:text-xs">{new Date(uploadTime).toLocaleString()}</span>
              </div>
            </DialogHeader>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              {/* File Info */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">File Name</p>
                <p className="text-sm font-mono truncate">{fileName}</p>
              </div>

              <Separator />

              {/* Violations */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Violations Detected ({violations.length})
                </p>
                
                {violations.length === 0 ? (
                  <div className="text-center py-6 bg-emerald-500/10 rounded-sm">
                    <Shield className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-emerald-500 font-medium">No violations detected</p>
                    <p className="text-xs text-muted-foreground">This area appears to be compliant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedViolations).map(([category, categoryViolations]) => (
                      <div key={category}>
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider mb-2 ${getCategoryColor(category)}`}>
                          {category}
                        </div>
                        <div className="space-y-2">
                          {categoryViolations.map((violation, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-2 p-3 bg-muted/50 rounded-sm border border-border"
                            >
                              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                violation.confidence >= 80 ? 'text-red-500' : 'text-amber-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{violation.type}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {violation.location}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`text-sm font-mono font-bold ${
                                  violation.confidence >= 80 ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                  {violation.confidence}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Inspector Notes
                </p>
                <Textarea
                  placeholder="Add notes about this inspection..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-[80px] rounded-sm resize-none text-sm"
                  data-testid="inspector-notes"
                />
                {hasChanges && (
                  <Button 
                    size="sm" 
                    className="mt-2 rounded-sm uppercase tracking-wider text-xs"
                    onClick={handleSaveNotes}
                    data-testid="save-notes-button"
                  >
                    <Save className="w-3 h-3 mr-2" />
                    Save Notes
                  </Button>
                )}
              </div>
            </div>

            {/* Actions Footer - Fixed at bottom */}
            <div className="p-3 sm:p-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-shrink-0 bg-card">
              <Button
                variant={flaggedForFollowUp ? "default" : "outline"}
                size="sm"
                className="rounded-sm uppercase tracking-wider text-xs w-full sm:w-auto"
                onClick={() => onToggleFlag(photo.photoId)}
                data-testid="toggle-flag-button"
              >
                <Flag className="w-4 h-4 mr-2" fill={flaggedForFollowUp ? 'currentColor' : 'none'} />
                {flaggedForFollowUp ? 'Flagged' : 'Flag for Follow-up'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive rounded-sm uppercase tracking-wider text-xs w-full sm:w-auto"
                onClick={() => onDelete(photo.photoId)}
                data-testid="delete-photo-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
