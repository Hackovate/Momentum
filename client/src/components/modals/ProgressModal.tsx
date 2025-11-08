import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Clock, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface ProgressModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onSave: (progress: number, actualTime: number | null, markComplete: boolean) => Promise<void>;
}

export function ProgressModal({ open, onClose, task, onSave }: ProgressModalProps) {
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task && open) {
      setProgressPercentage(task.progressPercentage || 0);
    }
  }, [task, open]);

  const handleSave = async (markComplete: boolean = false) => {
    setIsSaving(true);
    try {
      // If marking complete, use 100% progress
      const finalProgress = markComplete ? 100 : progressPercentage;
      
      // Update state for UI feedback
      if (markComplete) {
        setProgressPercentage(100);
      }
      
      // Auto-calculate actual time based on progress percentage
      // If 50% progress and 2h total estimated = 1h actual time
      const estimatedHours = task.estimatedHours || (task.estimatedMinutes ? task.estimatedMinutes / 60 : 0);
      const actualTimeValue = estimatedHours > 0 ? (estimatedHours * finalProgress / 100) : null;
      
      await onSave(finalProgress, actualTimeValue, markComplete || finalProgress === 100);
      onClose();
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!task) return null;

  const estimatedHours = task.estimatedHours || (task.estimatedMinutes ? task.estimatedMinutes / 60 : 0);
  const estimatedTimePerDay = task.daysAllocated && task.daysAllocated > 0 
    ? estimatedHours / task.daysAllocated 
    : estimatedHours;
  
  // Auto-calculate actual time based on progress percentage
  // If 50% progress and 2h total = 1h actual time
  const actualTimeValue = estimatedHours > 0 && progressPercentage > 0
    ? (estimatedHours * progressPercentage / 100)
    : 0;
  
  const isAhead = actualTimeValue > 0 && estimatedHours && actualTimeValue < estimatedHours;
  const isBehind = actualTimeValue > 0 && estimatedHours && actualTimeValue > estimatedHours;
  
  // Calculate predicted total time based on current progress rate
  // If user did 50% in 1 day, they're working at 2x speed, so total will be less
  const predictedTotalTime = progressPercentage > 0 && actualTimeValue > 0
    ? (actualTimeValue / progressPercentage) * 100
    : estimatedHours;
  
  const remainingTime = predictedTotalTime - actualTimeValue;
  
  const remainingDays = task.daysAllocated && task.currentDay
    ? task.daysAllocated - task.currentDay
    : (task.daysAllocated || 1);
  
  const adjustedDailyHours = remainingTime > 0 && remainingDays > 0
    ? remainingTime / remainingDays
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Task Progress</DialogTitle>
          <DialogDescription>
            {task.title}
            {task.daysAllocated && task.daysAllocated > 1 && (
              <Badge variant="outline" className="ml-2">
                Day {task.currentDay || 1} of {task.daysAllocated}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="progress">Progress</Label>
              <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Slider
              id="progress"
              value={[progressPercentage]}
              onValueChange={(value: number[]) => setProgressPercentage(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Auto-calculated Actual Time */}
          {estimatedHours > 0 && progressPercentage > 0 && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Calculated Time Spent</Label>
                <span className="text-sm font-semibold text-primary">
                  {actualTimeValue.toFixed(1)}h
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {progressPercentage}% of {estimatedHours}h total = {actualTimeValue.toFixed(1)}h
              </div>
              {actualTimeValue > 0 && estimatedHours && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  {isAhead && actualTimeValue < estimatedHours && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {Math.round((1 - actualTimeValue / estimatedHours) * 100)}% faster than estimated!
                    </Badge>
                  )}
                  {isBehind && actualTimeValue > estimatedHours && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {Math.round((actualTimeValue / estimatedHours - 1) * 100)}% slower than estimated
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Adaptive Learning Insights */}
          {predictedTotalTime && actualTimeValue && progressPercentage > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <div className="font-medium">Adaptive Insights:</div>
              <div className="space-y-1 text-muted-foreground">
                <div>
                  Based on your pace: <span className="font-medium text-foreground">
                    {predictedTotalTime.toFixed(1)}h total
                  </span> (vs {estimatedHours}h estimated)
                </div>
                {remainingTime && remainingDays && remainingDays > 0 && (
                  <div>
                    Remaining: <span className="font-medium text-foreground">
                      {remainingTime.toFixed(1)}h
                    </span> over <span className="font-medium text-foreground">
                      {remainingDays} days
                    </span>
                    {adjustedDailyHours && (
                      <span className="text-xs ml-2">
                        (~{adjustedDailyHours.toFixed(1)}h/day)
                      </span>
                    )}
                  </div>
                )}
                {predictedTotalTime < estimatedHours && (
                  <div className="text-green-600 dark:text-green-400 font-medium">
                    ✓ You're ahead! Can complete in {Math.ceil(predictedTotalTime / estimatedTimePerDay)} days instead of {task.daysAllocated || 1}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Hours Calculation */}
          {task.daysAllocated && task.daysAllocated > 1 && (
            <div className="text-xs text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1" />
              Daily allocation: ~{estimatedTimePerDay.toFixed(1)}h/day
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {progressPercentage < 100 && (
            <Button 
              onClick={() => handleSave(false)} 
              disabled={isSaving}
              variant="secondary"
            >
              Save Progress ({Math.round(progressPercentage)}%)
            </Button>
          )}
          <Button 
            onClick={() => handleSave(true)} 
            disabled={isSaving}
            className="bg-primary"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark 100% Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

