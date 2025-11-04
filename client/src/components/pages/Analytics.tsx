import { TrendingUp, Calendar, Target, Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function Analytics() {
  const monthlyStats = {
    tasksCompleted: 156,
    studyHours: 142,
    savingsRate: 87,
    wellnessScore: 82,
    skillProgress: 15
  };

  const weeklyTaskCompletion = [
    { week: "Week 1", completed: 32, total: 35 },
    { week: "Week 2", completed: 38, total: 40 },
    { week: "Week 3", completed: 42, total: 45 },
    { week: "Week 4", completed: 44, total: 48 }
  ];

  const balanceData = [
    { category: "Study", value: 35, color: "bg-blue-500" },
    { category: "Skills", value: 25, color: "bg-violet-500" },
    { category: "Lifestyle", value: 20, color: "bg-green-500" },
    { category: "Social", value: 12, color: "bg-orange-500" },
    { category: "Rest", value: 8, color: "bg-gray-400" }
  ];

  const subjectPerformance = [
    { subject: "Data Structures", score: 92, trend: "up" },
    { subject: "Databases", score: 85, trend: "up" },
    { subject: "Operating Systems", score: 88, trend: "neutral" },
    { subject: "Software Eng", score: 78, trend: "down" }
  ];

  const expenseCategories = [
    { category: "Rent", amount: 600, percentage: 51 },
    { category: "Food", amount: 310, percentage: 26 },
    { category: "Transport", amount: 150, percentage: 13 },
    { category: "Other", amount: 120, percentage: 10 }
  ];

  const achievements = [
    { id: 1, title: "12 Day Streak", description: "Maintained all habits for 12 days", icon: "🔥" },
    { id: 2, title: "100 Tasks Done", description: "Completed 100 tasks this month", icon: "✅" },
    { id: 3, title: "Savings Goal Hit", description: "Reached 80% of savings target", icon: "💰" },
    { id: 4, title: "Perfect Week", description: "100% task completion last week", icon: "⭐" }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">Analytics Dashboard</h1>
          <p className="text-gray-600">Your comprehensive performance overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </Button>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Monthly Summary */}
      <Card className="p-4 border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-gray-900">Your Monthly Summary</h2>
          <Badge className="ml-auto bg-violet-500">November 2025</Badge>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-white rounded-lg border border-violet-200">
            <p className="text-violet-600 text-sm mb-1">Tasks Completed</p>
            <p className="text-gray-900">{monthlyStats.tasksCompleted}</p>
            <p className="text-green-600 text-xs mt-1">↑ 23% from last month</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-violet-200">
            <p className="text-violet-600 text-sm mb-1">Study Hours</p>
            <p className="text-gray-900">{monthlyStats.studyHours}h</p>
            <p className="text-green-600 text-xs mt-1">↑ 15% from last month</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-violet-200">
            <p className="text-violet-600 text-sm mb-1">Savings Rate</p>
            <p className="text-gray-900">{monthlyStats.savingsRate}%</p>
            <p className="text-green-600 text-xs mt-1">↑ 8% from last month</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-violet-200">
            <p className="text-violet-600 text-sm mb-1">Wellness Score</p>
            <p className="text-gray-900">{monthlyStats.wellnessScore}</p>
            <p className="text-green-600 text-xs mt-1">↑ 5 points</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-violet-200">
            <p className="text-violet-600 text-sm mb-1">Skill Progress</p>
            <p className="text-gray-900">+{monthlyStats.skillProgress}%</p>
            <p className="text-green-600 text-xs mt-1">Great momentum!</p>
          </div>
        </div>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Task Completion Over Time */}
        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900">Task Completion Over Time</h2>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-3">
            {weeklyTaskCompletion.map((week, index) => {
              const percentage = (week.completed / week.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-700">{week.week}</span>
                    <span className="text-gray-900">{week.completed}/{week.total} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">
              📈 Your completion rate improved by 12% this month!
            </p>
          </div>
        </Card>

        {/* Study vs Skill vs Lifestyle Balance */}
        <Card className="p-4 border-gray-200">
          <h2 className="text-gray-900 mb-3">Time Balance Analysis</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 transform -rotate-90">
                {balanceData.map((item, index) => {
                  const total = balanceData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = (item.value / total) * 100;
                  const circumference = 2 * Math.PI * 60;
                  const offset = balanceData.slice(0, index).reduce((sum, d) => sum + (d.value / total) * circumference, 0);
                  
                  return (
                    <circle
                      key={index}
                      cx="80"
                      cy="80"
                      r="60"
                      stroke={item.color.replace('bg-', '#')}
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
                      strokeDashoffset={-offset}
                      className={item.color}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-900">100%</p>
                  <p className="text-gray-600 text-xs">Time Used</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {balanceData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-gray-700 text-sm">{item.category}</span>
                </div>
                <span className="text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Academic Performance */}
        <Card className="p-4 border-gray-200">
          <h2 className="text-gray-900 mb-3">Subject Performance Trends</h2>
          <div className="space-y-3">
            {subjectPerformance.map((subject, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900">{subject.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{subject.score}%</span>
                    {subject.trend === 'up' && <span className="text-green-500">↑</span>}
                    {subject.trend === 'down' && <span className="text-red-500">↓</span>}
                    {subject.trend === 'neutral' && <span className="text-gray-400">→</span>}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      subject.score >= 90 ? 'bg-green-500' :
                      subject.score >= 80 ? 'bg-blue-500' :
                      subject.score >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${subject.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Expense Insights */}
        <Card className="p-4 border-gray-200">
          <h2 className="text-gray-900 mb-3">Expense Insights</h2>
          <div className="space-y-3 mb-3">
            {expenseCategories.map((expense, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700">{expense.category}</span>
                  <span className="text-gray-900">${expense.amount} ({expense.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${expense.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm mb-1">💡 Spending Insight</p>
            <p className="text-gray-700 text-sm">
              You're spending 26% on food. By meal prepping, you could save $100-150/month.
            </p>
          </div>
        </Card>
      </div>

      {/* AI Summary & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* AI Summary */}
        <Card className="lg:col-span-2 p-4 border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-gray-900">AI Analysis: How Your Balance Looks</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <p className="text-green-700 mb-1">🎯 Great Balance Achieved!</p>
              <p className="text-gray-700 text-sm">
                Your time allocation this month is well-balanced. You're dedicating 35% to studies, 25% to skill development, 
                and maintaining 20% for lifestyle activities. This is an ideal distribution for sustainable growth.
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 mb-1">📚 Academic Excellence</p>
              <p className="text-gray-700 text-sm">
                Your academic performance is strong with an average of 85.75%. Data Structures is your strongest subject. 
                Consider allocating more time to Software Engineering to bring it up to par.
              </p>
            </div>
            <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
              <p className="text-violet-700 mb-1">💪 Consistency is Key</p>
              <p className="text-gray-700 text-sm">
                Your 12-day habit streak and 82 wellness score show excellent self-discipline. Keep maintaining this momentum 
                to see even better results in the coming weeks.
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Achievements */}
        <Card className="p-4 border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-violet-600" />
            <h2 className="text-gray-900">Recent Achievements</h2>
          </div>
          <div className="space-y-2">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xl">{achievement.icon}</span>
                  <div>
                    <p className="text-gray-900 text-sm mb-1">{achievement.title}</p>
                    <p className="text-gray-600 text-xs">{achievement.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
