import { useState } from 'react';
import { Plus, TrendingUp, Moon, Dumbbell, Book, Droplets, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useApp } from '../../lib/AppContext';
import { toast } from 'sonner';

export function Lifestyle() {
  const { habits, toggleHabit, addHabit } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    target: '',
    time: '',
    color: 'from-blue-500 to-cyan-500',
    icon: '💪',
  });

  const weeklyProgress = [
    { day: "Mon", completed: 4, total: 5 },
    { day: "Tue", completed: 5, total: 5 },
    { day: "Wed", completed: 3, total: 5 },
    { day: "Thu", completed: 4, total: 5 },
    { day: "Fri", completed: 5, total: 5 },
    { day: "Sat", completed: 4, total: 5 },
    { day: "Sun", completed: 3, total: 5 }
  ];

  const completedHabits = habits.filter(h => h.completed).length;
  const wellnessScore = Math.round((completedHabits / habits.length) * 100) || 0;

  const handleToggleHabit = (id: string) => {
    toggleHabit(id);
    toast.success('Habit updated!');
  };

  const handleAddHabit = () => {
    if (!newHabit.name || !newHabit.target || !newHabit.time) {
      toast.error('Please fill in all fields');
      return;
    }

    addHabit({
      ...newHabit,
      streak: 0,
      completed: false,
    });

    setNewHabit({ name: '', target: '', time: '', color: 'from-blue-500 to-cyan-500', icon: '💪' });
    setIsAddDialogOpen(false);
    toast.success('Habit added successfully!');
  };

  const iconOptions = [
    { value: '💪', label: 'Workout' },
    { value: '🧘', label: 'Meditation' },
    { value: '📚', label: 'Reading' },
    { value: '💧', label: 'Water' },
    { value: '🌙', label: 'Sleep' },
    { value: '🥗', label: 'Healthy Eating' },
    { value: '🚶', label: 'Walking' },
    { value: '✍️', label: 'Writing' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Lifestyle & Habit Tracker</h1>
          <p className="text-muted-foreground">Build better habits and maintain a healthy lifestyle</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="habit-name">Habit Name</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g., Morning Workout"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  placeholder="e.g., 30 minutes daily"
                  value={newHabit.target}
                  onChange={(e) => setNewHabit({ ...newHabit, target: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  placeholder="e.g., 7:00 AM"
                  value={newHabit.time}
                  onChange={(e) => setNewHabit({ ...newHabit, time: e.target.value })}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {iconOptions.map((icon) => (
                    <Button
                      key={icon.value}
                      type="button"
                      variant={newHabit.icon === icon.value ? 'default' : 'outline'}
                      className="text-2xl h-12"
                      onClick={() => setNewHabit({ ...newHabit, icon: icon.value })}
                    >
                      {icon.value}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddHabit}>Add Habit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wellness Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 border-border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm mb-0.5">Overall Wellness Score</p>
              <p className="text-foreground text-4xl mb-0.5">{wellnessScore}</p>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <TrendingUp className="w-3 h-3" />
                <span>Keep it up!</span>
              </div>
            </div>
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-green-200 dark:text-green-900"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - wellnessScore / 100)}`}
                  className="text-green-600 dark:text-green-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300">{wellnessScore}%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Current Streak</p>
              <p className="text-foreground text-4xl mb-0.5">{Math.max(...habits.map(h => h.streak))}</p>
              <p className="text-muted-foreground text-sm">days</p>
            </div>
            <div className="text-4xl">🔥</div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Today's Progress</p>
              <p className="text-foreground text-4xl mb-0.5">{completedHabits}/{habits.length}</p>
              <p className="text-muted-foreground text-sm">habits completed</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </Card>
      </div>

      {/* Habit Grid */}
      <div>
        <h2 className="text-foreground mb-3">Today's Habits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {habits.length === 0 ? (
            <Card className="p-8 border-border bg-card col-span-full text-center">
              <p className="text-muted-foreground">No habits yet. Add your first habit to get started!</p>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card 
                key={habit.id} 
                className={`p-3 border-border bg-card hover:shadow-lg transition-all ${
                  habit.completed ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/30' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${habit.color} flex items-center justify-center text-white text-xl`}>
                    {habit.icon}
                  </div>
                  <Switch 
                    checked={habit.completed} 
                    onCheckedChange={() => handleToggleHabit(habit.id)}
                  />
                </div>
                <h3 className="text-foreground mb-0.5">{habit.name}</h3>
                <p className="text-muted-foreground text-sm mb-2">{habit.target} • {habit.time}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500 text-sm">🔥</span>
                    <span className="text-sm text-muted-foreground">{habit.streak} day streak</span>
                  </div>
                  {habit.completed && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Done
                    </Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Weekly Overview */}
      <Card className="p-4 border-border bg-card">
        <h2 className="text-foreground mb-3">Weekly Progress</h2>
        <div className="grid grid-cols-7 gap-2">
          {weeklyProgress.map((day, index) => (
            <div key={index} className="text-center">
              <p className="text-muted-foreground text-sm mb-2">{day.day}</p>
              <div className="h-24 bg-muted rounded-lg flex flex-col justify-end overflow-hidden">
                <div 
                  className="bg-primary transition-all"
                  style={{ height: `${(day.completed / day.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-foreground text-sm mt-1">{day.completed}/{day.total}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
