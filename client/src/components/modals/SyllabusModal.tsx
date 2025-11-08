import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAuth } from '@/lib/useAuth';
import { coursesAPI } from '@/lib/api';

interface SyllabusModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (syllabus: string) => void;
  onDelete?: () => void;
  onGenerate?: (months: number) => void;
  courseName: string;
  existingSyllabus?: string | null;
  courseId?: string;
  loading?: boolean;
}

export function SyllabusModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  onGenerate,
  courseName, 
  existingSyllabus,
  courseId,
  loading = false
}: SyllabusModalProps) {
  const { user } = useAuth();
  const [syllabus, setSyllabus] = useState(existingSyllabus || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [months, setMonths] = useState('6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ found: boolean; message: string; chunk_count: number } | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  
  // Check if user is school or college level
  const isSchoolOrCollege = user?.educationLevel === 'school' || user?.educationLevel === 'college';

  useEffect(() => {
    // Update syllabus when existingSyllabus changes
    setSyllabus(existingSyllabus || '');
    // Reset AI status when modal opens
    if (open) {
      setAiStatus(null);
    }
  }, [existingSyllabus, open]);

  const handleCheckAI = async () => {
    if (!courseId) return;
    setIsCheckingAI(true);
    try {
      const result = await coursesAPI.verifySyllabus(courseId);
      setAiStatus({
        found: result.found,
        message: result.message,
        chunk_count: result.chunk_count
      });
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiStatus({
        found: false,
        message: 'Error checking AI status',
        chunk_count: 0
      });
    } finally {
      setIsCheckingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(syllabus);
      onClose();
    } catch (error) {
      console.error('Error saving syllabus:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this syllabus? This will also remove it from AI context.')) {
      return;
    }
    setIsSaving(true);
    try {
      await onDelete();
      setSyllabus('');
      onClose();
    } catch (error) {
      console.error('Error deleting syllabus:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    const monthsNum = parseInt(months);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
      alert('Please enter a valid number of months (1-24)');
      return;
    }
    setIsGenerating(true);
    try {
      await onGenerate(monthsNum);
      setShowGenerateDialog(false);
      setMonths('6');
    } catch (error) {
      console.error('Error generating study plan:', error);
      alert('Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const characterCount = syllabus.length;
  const wordCount = syllabus.trim() ? syllabus.trim().split(/\s+/).length : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Syllabus - {courseName}</span>
              {courseId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAI}
                  disabled={isCheckingAI}
                  className="ml-2"
                >
                  {isCheckingAI ? 'Checking...' : 'Check AI Status'}
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Add or edit the syllabus for this course. The AI will use this content to help you prepare for exams and generate study tasks.
              {aiStatus && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={aiStatus.found ? 'default' : 'destructive'}>
                    {aiStatus.found ? '✓ AI Knows Syllabus' : '✗ Not in AI Memory'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {aiStatus.message} {aiStatus.found && `(${aiStatus.chunk_count} chunks)`}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 flex flex-col space-y-2 mb-4">
              <Label htmlFor="syllabus">Syllabus Content</Label>
              <Textarea
                id="syllabus"
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                placeholder="Enter the syllabus content here. You can include chapters, topics, learning objectives, etc. The AI will use this to generate personalized study tasks."
                className="flex-1 min-h-[400px] resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount} words, {characterCount} characters</span>
                <span>This content will be stored and used by AI for context</span>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <div className="flex gap-2">
                {existingSyllabus && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isSaving || loading}
                  >
                    Delete
                  </Button>
                )}
                {existingSyllabus && onGenerate && isSchoolOrCollege && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setShowGenerateDialog(true)}
                    disabled={isSaving || loading}
                  >
                    Generate Study Plan
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || loading}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving || loading}
                >
                  {isSaving || loading ? 'Saving...' : existingSyllabus ? 'Update' : 'Save'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Study Plan Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Study Plan</DialogTitle>
            <DialogDescription>
              How many months do you want to complete this course?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="months">Number of Months</Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="24"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="e.g., 6"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a number between 1 and 24 months
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
