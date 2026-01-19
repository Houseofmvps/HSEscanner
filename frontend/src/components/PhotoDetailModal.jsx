import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Shield, 
  Flag, 
  Trash2, 
  Clock,
  MapPin,
  Save
} from "lucide-react";

const getRiskBadgeClass = (riskLevel) => {
  switch (riskLevel) {
    case 'High':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'Medium':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'Low':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'PPE':
      return 'text-red-500';
    case 'Equipment':
      return 'text-amber-500';
    case 'Environmental':
      return 'text-blue-500';
    case 'Housekeeping':
      return 'text-purple-500';
    default:
      return 'text-muted-foreground';
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
  const [notes, setNotes] = useState(photo?.userNotes || '');
  const [hasChanges, setHasChanges] = useState(false);

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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 rounded-sm overflow-hidden" data-testid="photo-detail-modal" aria-describedby="photo-analysis-description">
        <div className="grid md:grid-cols-2 h-full">
          {/* Image Section */}
          <div className="relative bg-black">
            <img 
              src={previewUrl} 
              alt={fileName}
              className="w-full h-full object-contain"
            />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-safety-cyan/60" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-safety-cyan/60" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-safety-cyan/60" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-safety-cyan/60" />
              
              {/* Scan Line */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-safety-cyan/80 to-transparent animate-scan-line" />
              </div>
            </div>

            {/* Risk Badge */}
            <Badge 
              className={`absolute top-4 right-12 rounded-none px-3 py-1 text-xs font-bold uppercase tracking-widest border ${getRiskBadgeClass(riskLevel)}`}
            >
              {riskLevel} RISK
            </Badge>

            {/* Safety Score */}
            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-sm border border-safety-cyan/30">
              <p className="text-xs font-mono text-safety-cyan uppercase tracking-widest">Safety Score</p>
              <p className={`text-2xl font-heading font-bold ${
                safetyScore >= 70 ? 'text-emerald-400' : 
                safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {safetyScore}%
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="flex flex-col bg-card">
            <DialogHeader className="p-4 border-b border-border">
              <DialogTitle className="font-heading text-lg uppercase tracking-tight">
                Analysis Details
              </DialogTitle>
              <p id="photo-analysis-description" className="sr-only">
                Safety analysis details for {fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Clock className="w-3 h-3" />
                <span>Processed in {processingTime?.toFixed(2)}s</span>
                <span className="mx-2">|</span>
                <span>{new Date(uploadTime).toLocaleString()}</span>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-4">
              {/* File Info */}
              <div className="mb-4">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">File Name</p>
                <p className="text-sm font-mono truncate">{fileName}</p>
              </div>

              <Separator className="my-4" />

              {/* Violations */}
              <div className="mb-4">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Violations Detected ({violations.length})
                </p>
                
                {violations.length === 0 ? (
                  <div className="text-center py-6">
                    <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-emerald-500 font-medium">No violations detected</p>
                    <p className="text-xs text-muted-foreground">This area appears to be compliant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedViolations).map(([category, categoryViolations]) => (
                      <div key={category}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${getCategoryColor(category)}`}>
                          {category}
                        </p>
                        <div className="space-y-2">
                          {categoryViolations.map((violation, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-3 p-3 bg-muted/50 rounded-sm border border-border"
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
                              <div className="text-right">
                                <span className={`text-sm font-mono font-bold ${
                                  violation.confidence >= 80 ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                  {violation.confidence}%
                                </span>
                                <p className="text-xs text-muted-foreground">confidence</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Notes */}
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Inspector Notes
                </p>
                <Textarea
                  placeholder="Add notes about this inspection..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-[100px] rounded-sm resize-none"
                  data-testid="inspector-notes"
                />
                {hasChanges && (
                  <Button 
                    size="sm" 
                    className="mt-2 rounded-sm uppercase tracking-wider"
                    onClick={handleSaveNotes}
                    data-testid="save-notes-button"
                  >
                    <Save className="w-3 h-3 mr-2" />
                    Save Notes
                  </Button>
                )}
              </div>
            </ScrollArea>

            {/* Actions Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between">
              <Button
                variant={flaggedForFollowUp ? "default" : "outline"}
                size="sm"
                className="rounded-sm uppercase tracking-wider"
                onClick={() => onToggleFlag(photo.photoId)}
                data-testid="toggle-flag-button"
              >
                <Flag className="w-4 h-4 mr-2" fill={flaggedForFollowUp ? 'currentColor' : 'none'} />
                {flaggedForFollowUp ? 'Flagged' : 'Flag for Follow-up'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive rounded-sm uppercase tracking-wider"
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
