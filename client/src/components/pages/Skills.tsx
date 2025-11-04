import { Plus, Target, TrendingUp, Sparkles, ExternalLink } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

export function Skills() {
  const skills = [
    {
      id: 1,
      name: "Full Stack Web Development",
      category: "Technical",
      progress: 68,
      gradient: "from-blue-500 to-cyan-500",
      milestones: [
        { name: "React Fundamentals", completed: true },
        { name: "Node.js & Express", completed: true },
        { name: "Database Design", completed: true },
        { name: "Authentication & Security", completed: false },
        { name: "Deployment & DevOps", completed: false }
      ],
      nextTask: "Build a MERN stack e-commerce app",
      resources: 12,
      timeSpent: "45h"
    },
    {
      id: 2,
      name: "UI/UX Design",
      category: "Creative",
      progress: 42,
      gradient: "from-violet-500 to-purple-500",
      milestones: [
        { name: "Design Principles", completed: true },
        { name: "Figma Basics", completed: true },
        { name: "User Research", completed: false },
        { name: "Prototyping", completed: false },
        { name: "Design Systems", completed: false }
      ],
      nextTask: "Complete a mobile app redesign project",
      resources: 8,
      timeSpent: "28h"
    },
    {
      id: 3,
      name: "Data Science & ML",
      category: "Technical",
      progress: 35,
      gradient: "from-green-500 to-emerald-500",
      milestones: [
        { name: "Python Basics", completed: true },
        { name: "Data Analysis with Pandas", completed: true },
        { name: "Machine Learning Algorithms", completed: false },
        { name: "Deep Learning", completed: false },
        { name: "Model Deployment", completed: false }
      ],
      nextTask: "Complete a kaggle competition project",
      resources: 15,
      timeSpent: "22h"
    },
    {
      id: 4,
      name: "Public Speaking",
      category: "Soft Skills",
      progress: 55,
      gradient: "from-orange-500 to-red-500",
      milestones: [
        { name: "Overcome Stage Fear", completed: true },
        { name: "Voice Modulation", completed: true },
        { name: "Body Language", completed: true },
        { name: "Storytelling Techniques", completed: false },
        { name: "Q&A Handling", completed: false }
      ],
      nextTask: "Present at next tech meetup",
      resources: 5,
      timeSpent: "18h"
    }
  ];

  const aiRecommendations = [
    {
      id: 1,
      title: "Complete Authentication Module",
      skill: "Full Stack Development",
      priority: "high",
      estimatedTime: "3-4 hours",
      reason: "You're 68% through the roadmap. This is the next logical step."
    },
    {
      id: 2,
      title: "Practice Figma UI Kit Creation",
      skill: "UI/UX Design",
      priority: "medium",
      estimatedTime: "2 hours",
      reason: "Hands-on practice will solidify your design principles knowledge."
    },
    {
      id: 3,
      title: "Join Toastmasters Club",
      skill: "Public Speaking",
      priority: "low",
      estimatedTime: "Ongoing",
      reason: "Regular practice with a community will accelerate your progress."
    }
  ];

  const completedMilestones = skills.reduce((acc, skill) => 
    acc + skill.milestones.filter(m => m.completed).length, 0
  );
  const totalMilestones = skills.reduce((acc, skill) => acc + skill.milestones.length, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 text-3xl mb-1">Skill Development Tracker</h1>
          <p className="text-gray-600">Track your learning journey and build your expertise</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add New Skill
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-0.5">Active Skills</p>
              <p className="text-gray-900 text-3xl">{skills.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-0.5">Milestones Completed</p>
              <p className="text-gray-900 text-3xl">{completedMilestones}/{totalMilestones}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-0.5">Total Learning Hours</p>
              <p className="text-gray-900 text-3xl">113h</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="p-4 border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-gray-900">AI Recommended Tasks</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiRecommendations.map((rec) => (
            <Card key={rec.id} className="p-3 bg-white border-gray-200">
              <div className="flex items-start gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(rec.priority)} mt-1.5`}></div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-0.5">{rec.title}</h3>
                  <Badge variant="secondary" className="text-xs">{rec.skill}</Badge>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1.5">{rec.reason}</p>
              <p className="text-violet-600 text-xs">⏱️ {rec.estimatedTime}</p>
            </Card>
          ))}
        </div>
      </Card>

      {/* Skill Roadmap Cards */}
      <div>
        <h2 className="text-gray-900 mb-3">Your Learning Roadmaps</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {skills.map((skill) => (
            <Card key={skill.id} className="p-4 border-gray-200 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-0.5">{skill.name}</h3>
                  <Badge variant="outline">{skill.category}</Badge>
                </div>
                <div className={`px-3 py-1 bg-gradient-to-r ${skill.gradient} rounded-lg`}>
                  <p className="text-white">{skill.progress}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <Progress value={skill.progress} className="h-2" />
              </div>

              {/* Milestones */}
              <div className="mb-3">
                <p className="text-gray-700 text-sm mb-2">Milestones</p>
                <div className="space-y-1.5">
                  {skill.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        milestone.completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-white border-gray-300'
                      }`}>
                        {milestone.completed && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${milestone.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {milestone.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Task */}
              <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg mb-3">
                <p className="text-violet-600 text-xs mb-0.5">Next Task</p>
                <p className="text-gray-900 text-sm">{skill.nextTask}</p>
              </div>

              {/* Footer Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>📚 {skill.resources} resources</span>
                  <span>⏱️ {skill.timeSpent}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-violet-600 hover:text-violet-700 gap-1">
                  View
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
