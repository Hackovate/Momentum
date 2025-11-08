import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { coursesAPI } from '@/lib/api';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onEdit: (assignment: any) => void;
  onDelete: (assignmentId: string) => void;
  assignments: any[];
  courseId: string;
  courseName: string;
  editingAssignment?: any;
}

export function AssignmentDialog({ 
  open, 
  onClose, 
  onSave, 
  onEdit, 
  onDelete, 
  assignments, 
  courseId, 
  courseName,
  editingAssignment 
}: AssignmentDialogProps) {
  const [localAssignments, setLocalAssignments] = useState(assignments);
  
  // Update local assignments when prop changes
  useEffect(() => {
    setLocalAssignments(assignments);
  }, [assignments]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    daysAllocated: '',
    status: 'pending',
  });

  const [activeTab, setActiveTab] = useState('add');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'exam-prep' | 'study-plan'>('all');

  // Helper function to format date for input field
  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Helper function to populate form from assignment
  const populateFormFromAssignment = (assignment: any) => {
    setFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      startDate: formatDateForInput(assignment.startDate),
      dueDate: formatDateForInput(assignment.dueDate),
      estimatedHours: assignment.estimatedHours?.toString() || '',
      daysAllocated: assignment.daysAllocated?.toString() || '',
      status: assignment.status || 'pending',
    });
    setActiveTab('add');
  };

  useEffect(() => {
    // Reset form when dialog closes
    if (!open) {
      setFormData({
        title: '',
        description: '',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        daysAllocated: '',
        status: 'pending',
      });
      setActiveTab('add');
    } else if (open && editingAssignment) {
      // If editing assignment is passed from parent, populate form
      populateFormFromAssignment(editingAssignment);
    }
  }, [open, editingAssignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data for submission - always include all fields explicitly
    // Convert empty strings to null for optional fields
    const estimatedHoursStr = String(formData.estimatedHours || '').trim();
    let estimatedHoursValue: number | null = null;
    if (estimatedHoursStr !== '') {
      const parsed = parseFloat(estimatedHoursStr);
      if (!isNaN(parsed)) {
        estimatedHoursValue = parsed;
      }
    }
    
    const startDateValue = formData.startDate && formData.startDate.trim() !== '' 
      ? formData.startDate.trim() 
      : null;
    const dueDateValue = formData.dueDate && formData.dueDate.trim() !== '' 
      ? formData.dueDate.trim() 
      : null;
    
    // Auto-calculate daysAllocated from start date to due date
    let daysAllocatedValue: number | null = null;
    if (startDateValue && dueDateValue) {
      const start = new Date(startDateValue);
      const due = new Date(dueDateValue);
      if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
        // Calculate days including both start and end dates
        const diffTime = due.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
        daysAllocatedValue = diffDays > 0 ? diffDays : null;
      }
    }
    
    // If manual daysAllocated is provided and no dates, use it
    if (!daysAllocatedValue) {
      const daysAllocatedStr = String(formData.daysAllocated || '').trim();
      if (daysAllocatedStr !== '') {
        const parsed = parseInt(daysAllocatedStr);
        if (!isNaN(parsed) && parsed > 0) {
          daysAllocatedValue = parsed;
        }
      }
    }
    
    // Always include all fields in the request, even if null
    const submitData: any = {
      title: formData.title,
      description: formData.description && formData.description.trim() !== '' ? formData.description.trim() : null,
      startDate: startDateValue,
      dueDate: dueDateValue,
      estimatedHours: estimatedHoursValue,
      daysAllocated: daysAllocatedValue,
      status: formData.status,
    };
    
    console.log('Submitting assignment data:', JSON.stringify(submitData, null, 2));
    onSave(submitData);
    // Reset form after save
    setFormData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      daysAllocated: '',
      status: 'pending',
    });
    // Switch to assignments tab to see the new/updated assignment
    setActiveTab('list');
  };

  const handleEditClick = (assignment: any) => {
    // Immediately populate the form with assignment data
    populateFormFromAssignment(assignment);
    // Notify parent to set this assignment for editing
    onEdit(assignment);
    setActiveTab('add');
  };

  const handleDeleteClick = (assignmentId: string) => {
    if (confirm('Delete this assignment?')) {
      onDelete(assignmentId);
    }
  };

  // Helper function to get next status in cycle: pending → in-progress → completed → pending
  const getNextStatus = (current: string): string => {
    const normalized = current?.toLowerCase() || 'pending';
    if (normalized === 'pending') return 'in-progress';
    if (normalized === 'in-progress') return 'completed';
    return 'pending'; // completed → pending
  };

  const handleToggleComplete = async (assignment: any) => {
    // Cycle through 3 states: pending → in-progress → completed → pending
    const currentStatus = assignment.status?.toLowerCase() || 'pending';
    const newStatus = getNextStatus(currentStatus);
    
    // Optimistically update local state for immediate UI feedback
    setLocalAssignments(prev => 
      prev.map(a => 
        a.id === assignment.id 
          ? { ...a, status: newStatus }
          : a
      )
    );
    
    try {
      // Directly update the assignment status via API
      const updateData = {
        title: assignment.title,
        description: assignment.description || null,
        startDate: assignment.startDate || null,
        dueDate: assignment.dueDate || null,
        estimatedHours: assignment.estimatedHours || null,
        status: newStatus,
        points: assignment.points || null
      };
      
      await coursesAPI.updateAssignment(assignment.id, updateData);
      
      // Notify parent to reload data (mark as toggle to avoid opening edit modal)
      onEdit({ ...assignment, status: newStatus, _isToggle: true });
    } catch (error) {
      console.error('Error toggling assignment status:', error);
      // Revert optimistic update on error
      setLocalAssignments(prev => 
        prev.map(a => 
          a.id === assignment.id 
            ? { ...a, status: currentStatus }
            : a
        )
      );
      alert('Failed to update assignment status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            Assignments & Tasks
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage assignments and tasks for {courseName}
          </DialogDescription>
          <p className="text-sm text-muted-foreground">{courseName}</p>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Add Assignment/Task</TabsTrigger>
            <TabsTrigger value="list">
              Assignments {assignments.length > 0 && `(${assignments.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="flex-1 overflow-y-auto mt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm">Assignment Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Homework 1 - Arrays"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assignment details..."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <Label htmlFor="dueDate" className="text-sm">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Estimated Time, Days Allocated, and Status */}
              <div className="grid grid-cols-3 gap-3">
                {/* Estimated Time */}
                <div>
                  <Label htmlFor="estimatedHours" className="text-sm">Est. Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    placeholder="e.g., 5"
                    className="mt-1"
                  />
                </div>

                {/* Days Allocated - Auto-calculated from dates or manual entry */}
                <div>
                  <Label htmlFor="daysAllocated" className="text-sm">
                    Days Allocated
                    {formData.startDate && formData.dueDate && (
                      <span className="text-xs text-muted-foreground ml-1">(auto)</span>
                    )}
                  </Label>
                  <Input
                    id="daysAllocated"
                    type="number"
                    min="1"
                    step="1"
                    value={(() => {
                      // Auto-calculate if both dates are present
                      if (formData.startDate && formData.dueDate) {
                        const start = new Date(formData.startDate);
                        const due = new Date(formData.dueDate);
                        if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
                          const diffTime = due.getTime() - start.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return diffDays > 0 ? diffDays.toString() : '';
                        }
                      }
                      return formData.daysAllocated;
                    })()}
                    onChange={(e) => setFormData({ ...formData, daysAllocated: e.target.value })}
                    placeholder="Auto from dates"
                    className="mt-1"
                    disabled={!!(formData.startDate && formData.dueDate)}
                  />
                  {(() => {
                    const days = formData.startDate && formData.dueDate
                      ? (() => {
                          const start = new Date(formData.startDate);
                          const due = new Date(formData.dueDate);
                          if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
                            const diffTime = due.getTime() - start.getTime();
                            return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          }
                          return parseInt(formData.daysAllocated) || 0;
                        })()
                      : parseInt(formData.daysAllocated) || 0;
                    return days > 0 && formData.estimatedHours && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{Math.round((parseFloat(formData.estimatedHours) || 0) / days * 10) / 10}h/day
                      </p>
                    );
                  })()}
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-9">
                  Cancel
                </Button>
                <Button type="submit" className="h-9">
                  {editingAssignment ? 'Save Changes' : 'Create'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="list" className="flex-1 overflow-y-auto mt-4 flex flex-col">
            {/* Sub-tabs for filtering */}
            <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'all' | 'exam-prep' | 'study-plan')} className="mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="exam-prep">Exam Prep</TabsTrigger>
                <TabsTrigger value="study-plan">Study Plan</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter assignments based on sub-tab */}
            {(() => {
              let filteredAssignments = localAssignments;
              
              if (activeSubTab === 'exam-prep') {
                // Show assignments linked to exams
                filteredAssignments = localAssignments.filter((a: any) => a.examId != null);
              } else if (activeSubTab === 'study-plan') {
                // Show syllabus-generated or AI-generated without examId
                filteredAssignments = localAssignments.filter((a: any) => 
                  a.syllabusGenerated === true || (a.aiGenerated === true && !a.examId)
                );
              }
              
              // Sort assignments: in-progress at top, pending with near due dates next, completed at bottom
              filteredAssignments = [...filteredAssignments].sort((a: any, b: any) => {
                const statusA = a.status?.toLowerCase() || 'pending';
                const statusB = b.status?.toLowerCase() || 'pending';
                
                // Helper to check if due date is near (within 7 days)
                const isDueDateNear = (dueDate: string | null | undefined): boolean => {
                  if (!dueDate) return false;
                  const due = new Date(dueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffTime = due.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays >= 0 && diffDays <= 7;
                };
                
                // Priority order: in-progress > pending (with near due) > pending (other) > completed
                const getPriority = (assignment: any): number => {
                  const status = assignment.status?.toLowerCase() || 'pending';
                  if (status === 'in-progress') return 1;
                  if (status === 'pending' && isDueDateNear(assignment.dueDate)) return 2;
                  if (status === 'pending') return 3;
                  return 4; // completed
                };
                
                const priorityA = getPriority(a);
                const priorityB = getPriority(b);
                
                if (priorityA !== priorityB) {
                  return priorityA - priorityB;
                }
                
                // If same priority, sort by due date (earlier first) for pending items
                if (priorityA === 2 || priorityA === 3) {
                  const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                  const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                  return dueA - dueB;
                }
                
                // For completed items, maintain original order
                return 0;
              });
              
              return filteredAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    {activeSubTab === 'all' 
                      ? 'No assignments yet'
                      : activeSubTab === 'exam-prep'
                      ? 'No exam preparation tasks yet'
                      : 'No study plan tasks yet'}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {activeSubTab === 'all'
                      ? 'Create your first assignment in the "Add Assignment/Task" tab'
                      : activeSubTab === 'exam-prep'
                      ? 'Exam prep tasks are created when you ask AI to prepare for an exam'
                      : 'Study plan tasks are generated from syllabus or created via AI chat'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="rounded-lg border border-border/60 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Checkbox for completion - 3 states: pending (gray), in-progress (yellow), completed (green) */}
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(assignment)}
                          className="mt-0.5 flex-shrink-0"
                          aria-label={
                            assignment.status?.toLowerCase() === 'completed' 
                              ? 'Mark as pending' 
                              : assignment.status?.toLowerCase() === 'in-progress'
                              ? 'Mark as completed'
                              : 'Mark as in progress'
                          }
                        >
                          {(() => {
                            const status = assignment.status?.toLowerCase() || 'pending';
                            if (status === 'completed') {
                              return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
                            } else if (status === 'in-progress') {
                              return <Circle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
                            } else {
                              return <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />;
                            }
                          })()}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className={`text-sm font-semibold truncate ${
                              assignment.status?.toLowerCase() === 'completed' ? 'line-through opacity-60' : 'text-foreground'
                            }`}>
                              {assignment.title}
                            </h4>
                          <Badge
                            variant={assignment.status?.toLowerCase() === 'completed' ? 'default' : 'secondary'}
                            className="text-[0.65rem] capitalize shrink-0"
                          >
                            {assignment.status}
                          </Badge>
                          {assignment.aiGenerated && (
                            <Badge
                              variant="outline"
                              className="text-[0.65rem] shrink-0 bg-primary/10 text-primary border-primary/20"
                            >
                              AI Generated
                            </Badge>
                          )}
                          </div>
                          {assignment.description && (
                            <p className={`text-xs mb-2 line-clamp-2 ${
                              assignment.status?.toLowerCase() === 'completed' ? 'line-through opacity-60 text-muted-foreground' : 'text-muted-foreground'
                            }`}>
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {assignment.startDate && (
                              <span>
                                Start: {new Date(assignment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {assignment.dueDate && (
                              <span>
                                Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {assignment.estimatedHours && (
                              <span>Est. {assignment.estimatedHours}h</span>
                            )}
                            {assignment.points && (
                              <span>{assignment.points} points</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(assignment)}
                          aria-label="Edit assignment"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(assignment.id)}
                          aria-label="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

