import { Plus, TrendingUp, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

export function Academics() {
  const subjects = [
    { 
      id: 1, 
      name: "Data Structures & Algorithms", 
      code: "CS201",
      progress: 75, 
      grade: "A",
      color: "from-blue-500 to-cyan-500",
      nextClass: "Mon 11:00 AM",
      assignments: 2
    },
    { 
      id: 2, 
      name: "Database Management Systems", 
      code: "CS301",
      progress: 60, 
      grade: "B+",
      color: "from-violet-500 to-purple-500",
      nextClass: "Tue 2:00 PM",
      assignments: 1
    },
    { 
      id: 3, 
      name: "Operating Systems", 
      code: "CS202",
      progress: 82, 
      grade: "A",
      color: "from-green-500 to-emerald-500",
      nextClass: "Wed 10:00 AM",
      assignments: 0
    },
    { 
      id: 4, 
      name: "Software Engineering", 
      code: "CS302",
      progress: 55, 
      grade: "B",
      color: "from-orange-500 to-red-500",
      nextClass: "Thu 3:00 PM",
      assignments: 3
    }
  ];

  const upcomingExams = [
    { id: 1, subject: "Data Structures", date: "Nov 15, 2025", type: "Midterm", daysLeft: 12 },
    { id: 2, subject: "Database Systems", date: "Nov 20, 2025", type: "Quiz", daysLeft: 17 },
    { id: 3, subject: "Operating Systems", date: "Nov 25, 2025", type: "Final", daysLeft: 22 }
  ];

  const weekSchedule = [
    { day: "Mon", classes: [
      { time: "09:00", subject: "Data Structures", type: "Lecture" },
      { time: "14:00", subject: "Software Engineering", type: "Lab" }
    ]},
    { day: "Tue", classes: [
      { time: "11:00", subject: "Database Systems", type: "Lecture" },
      { time: "15:00", subject: "Operating Systems", type: "Lecture" }
    ]},
    { day: "Wed", classes: [
      { time: "10:00", subject: "Data Structures", type: "Lab" }
    ]},
    { day: "Thu", classes: [
      { time: "09:00", subject: "Software Engineering", type: "Lecture" },
      { time: "14:00", subject: "Database Systems", type: "Lab" }
    ]},
    { day: "Fri", classes: [
      { time: "11:00", subject: "Operating Systems", type: "Lab" }
    ]}
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Academic Tracker</h1>
          <p className="text-muted-foreground">Track your classes, assignments, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Notes
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            Add Assessment
          </Button>
        </div>
      </div>

      {/* Week Schedule */}
      <Card className="p-4 border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground">This Week's Schedule</h2>
          <Button variant="ghost" size="sm" className="gap-2">
            <Calendar className="w-4 h-4" />
            View Full Calendar
          </Button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {weekSchedule.map((day, index) => (
            <div key={index} className="space-y-1.5">
              <div className="text-center pb-1.5 border-b border-border">
                <p className="text-foreground">{day.day}</p>
              </div>
              <div className="space-y-1.5">
                {day.classes.map((cls, clsIndex) => (
                  <div key={clsIndex} className="p-2 bg-accent border border-primary/20 rounded-lg">
                    <p className="text-primary text-xs mb-0.5">{cls.time}</p>
                    <p className="text-foreground text-sm mb-1">{cls.subject}</p>
                    <Badge variant="secondary" className="text-xs">{cls.type}</Badge>
                  </div>
                ))}
                {day.classes.length === 0 && (
                  <div className="p-2 bg-muted rounded-lg text-center">
                    <p className="text-muted-foreground text-sm">No classes</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Subject Cards */}
      <div>
        <h2 className="text-foreground mb-3">Your Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-4 border-border bg-card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-foreground">{subject.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">{subject.code}</p>
                </div>
                <div className={`px-2.5 py-0.5 bg-gradient-to-r ${subject.color} rounded-lg`}>
                  <p className="text-white">{subject.grade}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{subject.nextClass}</span>
                  </div>
                  {subject.assignments > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      {subject.assignments} pending
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Exams & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Upcoming Exams */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h2 className="text-foreground">Upcoming Exams</h2>
          </div>
          <div className="space-y-2">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div>
                  <p className="text-foreground mb-0.5">{exam.subject}</p>
                  <p className="text-muted-foreground text-sm">{exam.date}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${exam.daysLeft <= 7 ? 'bg-red-500' : 'bg-orange-500'}`}>
                    {exam.type}
                  </Badge>
                  <p className="text-muted-foreground text-xs mt-0.5">{exam.daysLeft} days left</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Performance Trends */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-foreground">Performance Summary</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 mb-1">Overall GPA</p>
              <p className="text-green-900 dark:text-green-100 text-3xl">3.72</p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-0.5">↑ 0.15 from last semester</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-0.5">Attendance</p>
                <p className="text-blue-900 dark:text-blue-100 text-2xl">94%</p>
              </div>
              <div className="p-3 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg">
                <p className="text-violet-700 dark:text-violet-300 text-sm mb-0.5">Assignments</p>
                <p className="text-violet-900 dark:text-violet-100 text-2xl">89%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
