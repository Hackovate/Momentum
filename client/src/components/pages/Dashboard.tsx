import { CheckCircle2, Clock, Wallet, Flame, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { StatCard } from '../StatCard';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useApp } from '../../lib/AppContext';

export function Dashboard() {
  const { tasks, habits, expenses, subjects, monthlyBudget, currentSavings, savingsGoal } = useApp();
  
  const userName = "Alex";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  // Calculate stats from real data
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedHabits = habits.filter(h => h.completed).length;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  const currentSpending = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const stats = [
    {
      title: "Task Completion",
      value: `${taskCompletionRate}%`,
      icon: CheckCircle2,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
      subtext: `${completedTasks} of ${totalTasks} tasks completed`
    },
    {
      title: "Active Habits",
      value: `${completedHabits}/${habits.length}`,
      icon: Clock,
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
      subtext: "habits completed today"
    },
    {
      title: "Savings Balance",
      value: `$${currentSavings}`,
      icon: Wallet,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
      subtext: `${Math.round((currentSavings / savingsGoal) * 100)}% of goal`
    },
    {
      title: "Streak Days",
      value: maxStreak.toString(),
      icon: Flame,
      gradient: "bg-gradient-to-br from-orange-500 to-red-500",
      subtext: "Keep it going!"
    }
  ];

  // Get upcoming tasks (not done)
  const upcomingTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // AI Insights based on actual data
  const aiInsights = [];
  
  if (taskCompletionRate >= 80) {
    aiInsights.push("🎉 Excellent work! You're crushing your tasks this week.");
  } else if (taskCompletionRate < 50) {
    aiInsights.push("💡 Try breaking down large tasks into smaller, manageable steps.");
  }

  if (completedHabits === habits.length && habits.length > 0) {
    aiInsights.push("✨ Perfect day! All habits completed. You're building great routines.");
  }

  if (currentSpending > monthlyBudget * 0.8) {
    aiInsights.push("⚠️ You've used 80% of your budget. Consider reviewing your expenses.");
  }

  if (maxStreak >= 7) {
    aiInsights.push(`🔥 Amazing ${maxStreak}-day streak! Consistency is key to success.`);
  }

  if (subjects.length > 0) {
    const avgProgress = Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length);
    aiInsights.push(`📚 Your average academic progress is ${avgProgress}%. Keep up the momentum!`);
  }

  // If no insights, add default ones
  if (aiInsights.length === 0) {
    aiInsights.push("👋 Welcome! Start adding tasks, habits, and expenses to get personalized insights.");
    aiInsights.push("💡 Tip: Consistency is more important than intensity. Small daily actions lead to big results.");
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-foreground text-3xl mb-1">{greeting}, {userName} ☀️</h1>
        <p className="text-muted-foreground">Here's what's happening with your student life today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* AI Insights & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* AI Insights */}
        <Card className="lg:col-span-2 p-4 border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-foreground">AI Insights & Suggestions</h2>
          </div>
          <div className="space-y-2">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 p-2.5 bg-accent rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                <p className="text-foreground text-sm flex-1">{insight}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="w-4 h-4" />
              Log Expense
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="w-4 h-4" />
              New Journal Entry
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <TrendingUp className="w-4 h-4" />
              View Analytics
            </Button>
          </div>
        </Card>
      </div>

      {/* Upcoming Tasks & Academic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Upcoming Tasks */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Upcoming Tasks</h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No tasks scheduled</p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2.5 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
                  <div className="flex-1">
                    <p className="text-foreground text-sm mb-0.5">{task.title}</p>
                    <p className="text-muted-foreground text-xs">{task.time} • {task.duration}</p>
                  </div>
                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Academic Progress */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Academic Progress</h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          {subjects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No subjects tracked yet</p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.slice(0, 4).map((subject) => (
                <div key={subject.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground">{subject.name}</span>
                    <span className="text-muted-foreground">{subject.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Today's Habits Overview */}
      <Card className="p-4 border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground mb-1">Today's Habits</h2>
            <p className="text-muted-foreground text-sm">
              {habits.length > 0 
                ? `${completedHabits} of ${habits.length} completed` 
                : 'No habits tracked yet'}
            </p>
          </div>
          <div className="flex gap-2">
            {habits.slice(0, 5).map((habit) => (
              <div
                key={habit.id}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  habit.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {habit.icon}
              </div>
            ))}
            {habits.length === 0 && (
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Habits
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
