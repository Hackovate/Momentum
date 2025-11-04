import { useState } from 'react';
import { Plus, RefreshCw, CheckCircle2, Circle, Clock, Trash2, Edit } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useApp } from '../../lib/AppContext';
import { toast } from 'sonner';

export function DailyPlanner() {
  const { tasks, addTask, updateTask, deleteTask } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    time: '',
    duration: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const schedule = [
    { time: "08:00 AM", activity: "Morning Study - Mathematics", type: "study", done: true },
    { time: "10:00 AM", activity: "Break & Breakfast", type: "break", done: true },
    { time: "11:00 AM", activity: "Data Structures Lecture", type: "class", done: true },
    { time: "12:00 PM", activity: "Team Meeting", type: "meeting", done: false },
    { time: "01:00 PM", activity: "Lunch Break", type: "break", done: false },
    { time: "02:00 PM", activity: "Assignment Work", type: "study", done: false },
    { time: "04:00 PM", activity: "Reading - OS Chapter 7", type: "study", done: false },
    { time: "05:30 PM", activity: "Break", type: "break", done: false },
    { time: "06:00 PM", activity: "Skill Development", type: "skill", done: false },
    { time: "08:00 PM", activity: "Dinner & Relax", type: "break", done: false }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'study': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'class': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      case 'meeting': return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800';
      case 'skill': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
      case 'break': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-primary';
      default: return 'bg-muted-foreground';
    }
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.time || !newTask.duration) {
      toast.error('Please fill in all fields');
      return;
    }

    addTask({
      ...newTask,
      status: 'todo',
      date: new Date().toISOString(),
    });

    setNewTask({ title: '', time: '', duration: '', priority: 'medium' });
    setIsAddDialogOpen(false);
    toast.success('Task added successfully!');
  };

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const statusOrder = ['todo', 'inProgress', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    updateTask(taskId, { status: nextStatus as any });
    toast.success(`Task moved to ${nextStatus === 'inProgress' ? 'In Progress' : nextStatus === 'done' ? 'Completed' : 'To Do'}`);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    toast.success('Task deleted successfully!');
  };

  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    inProgress: tasks.filter(t => t.status === 'inProgress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  const TaskSection = ({ title, tasks: sectionTasks, icon: Icon }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-foreground">{title}</h3>
        <span className="text-muted-foreground text-sm">({sectionTasks.length})</span>
      </div>
      {sectionTasks.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          No tasks here
        </div>
      ) : (
        sectionTasks.map((task: any) => (
          <div key={task.id} className="flex items-start gap-2.5 p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow group">
            <Checkbox 
              checked={task.status === 'done'}
              onCheckedChange={() => handleToggleTask(task.id, task.status)}
              className="mt-1" 
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                <p className={`text-foreground ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.time}
                </span>
                <span>{task.duration}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDeleteTask(task.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Today's Plan</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Rebalance Plan
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2h, 30min"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Task List */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="p-4 border-border bg-card">
            <TaskSection title="To Do" tasks={groupedTasks.todo} icon={Circle} />
          </Card>
          
          <Card className="p-4 border-border bg-accent border-primary/20">
            <TaskSection title="In Progress" tasks={groupedTasks.inProgress} icon={Clock} />
          </Card>
          
          <Card className="p-4 border-border bg-accent border-primary/30">
            <TaskSection title="Completed" tasks={groupedTasks.done} icon={CheckCircle2} />
          </Card>
        </div>

        {/* Schedule Timeline */}
        <div className="lg:col-span-2">
          <Card className="p-4 border-border bg-card sticky top-24">
            <h2 className="text-foreground mb-3">AI Generated Schedule</h2>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {schedule.map((item, index) => (
                <div key={index} className={`p-2 border rounded-lg transition-all ${getTypeColor(item.type)} ${item.done ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs mb-0.5">{item.time}</p>
                      <p className="text-sm">{item.activity}</p>
                    </div>
                    {item.done && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
