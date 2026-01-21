import { useState, useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
import { UploadZone } from "@/components/UploadZone";
import { AnalysisGallery } from "@/components/AnalysisGallery";
import { PhotoDetailModal } from "@/components/PhotoDetailModal";
import { ReportGenerator } from "@/components/ReportGenerator";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle2, Clock, ArrowLeft, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export const InspectionTool = () => {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFilesSelected = useCallback(async (files) => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    const newPhotos = [];
    
    const initialProgress = {};
    files.forEach((file, index) => {
      initialProgress[file.name] = { status: 'uploading', progress: 0 };
    });
    setUploadProgress(initialProgress);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'converting', progress: 25 }
        }));

        const base64 = await convertToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'analyzing', progress: 50 }
        }));

        const response = await axios.post(`${API}/analyze`, {
          image_base64: base64,
          file_name: file.name
        });

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'complete', progress: 100 }
        }));

        const photoData = {
          ...response.data,
          previewUrl,
          base64,
          userNotes: '',
          flaggedForFollowUp: response.data.analysisResults.riskLevel === 'High'
        };

        newPhotos.push(photoData);
        
        toast.success(`Analyzed: ${file.name}`, {
          description: `Risk Level: ${response.data.analysisResults.riskLevel}`
        });

      } catch (error) {
        console.error(`Error analyzing ${file.name}:`, error);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'error', progress: 0 }
        }));
        toast.error(`Failed to analyze: ${file.name}`, {
          description: error.response?.data?.detail || 'Unknown error'
        });
      }
    }

    setPhotos(prev => [...prev, ...newPhotos]);
    setIsAnalyzing(false);
    
    setTimeout(() => setUploadProgress({}), 2000);
  }, []);

  const handleUpdateNotes = useCallback((photoId, notes) => {
    setPhotos(prev => prev.map(p => 
      p.photoId === photoId ? { ...p, userNotes: notes } : p
    ));
  }, []);

  const handleToggleFlag = useCallback((photoId) => {
    setPhotos(prev => prev.map(p => 
      p.photoId === photoId ? { ...p, flaggedForFollowUp: !p.flaggedForFollowUp } : p
    ));
  }, []);

  const handleDeletePhoto = useCallback((photoId) => {
    setPhotos(prev => prev.filter(p => p.photoId !== photoId));
    setSelectedPhoto(null);
    toast.success('Photo removed from analysis');
  }, []);

  const stats = {
    total: photos.length,
    highRisk: photos.filter(p => p.analysisResults.riskLevel === 'High').length,
    mediumRisk: photos.filter(p => p.analysisResults.riskLevel === 'Medium').length,
    lowRisk: photos.filter(p => p.analysisResults.riskLevel === 'Low').length,
    totalViolations: photos.reduce((acc, p) => acc + p.analysisResults.violations.length, 0),
    avgSafetyScore: photos.length > 0 
      ? Math.round(photos.reduce((acc, p) => acc + p.analysisResults.safetyScore, 0) / photos.length)
      : 0
  };

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <div className="p-1.5 sm:p-2 bg-primary rounded-sm">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-heading font-bold uppercase tracking-tight">
                  AI Safety Vision
                </h1>
                <p className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest hidden sm:block">
                  Inspection Tool
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Stats Dashboard - Responsive grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <div className="bg-card border border-border rounded-sm p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-sm">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">Photos</p>
                  <p className="text-lg sm:text-2xl font-heading font-bold">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-sm p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-sm">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">High Risk</p>
                  <p className="text-lg sm:text-2xl font-heading font-bold text-red-500">{stats.highRisk}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-sm p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-sm">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">Violations</p>
                  <p className="text-lg sm:text-2xl font-heading font-bold text-amber-500">{stats.totalViolations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-sm p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground">Avg Score</p>
                  <p className="text-lg sm:text-2xl font-heading font-bold text-emerald-500">{stats.avgSafetyScore}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <UploadZone 
          onFilesSelected={handleFilesSelected}
          isAnalyzing={isAnalyzing}
          uploadProgress={uploadProgress}
        />

        {/* Analysis Gallery */}
        {photos.length > 0 && (
          <div className="mt-4 sm:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-tight">
                Analysis Results
              </h2>
              <ReportGenerator photos={photos} stats={stats} />
            </div>
            
            <AnalysisGallery 
              photos={photos}
              onSelectPhoto={setSelectedPhoto}
              onToggleFlag={handleToggleFlag}
            />
          </div>
        )}

        {/* Photo Detail Modal */}
        <PhotoDetailModal
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdateNotes={handleUpdateNotes}
          onToggleFlag={handleToggleFlag}
          onDelete={handleDeletePhoto}
        />
      </main>
    </div>
  );
};
