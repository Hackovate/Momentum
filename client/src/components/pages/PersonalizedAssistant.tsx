import { useState } from 'react';
import { Send, Paperclip, Sparkles, CheckCircle2, Calendar, GraduationCap, Wallet, BookOpen, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  linkedItems?: LinkedItem[];
}

interface LinkedItem {
  id: string;
  type: 'task' | 'note' | 'class' | 'expense';
  title: string;
  section: string;
  action: string;
}

export function PersonalizedAssistant() {
  const [message, setMessage] = useState('');
  const [showLinkedItems, setShowLinkedItems] = useState(true);

  const initialMessages: Message[] = [
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
      timestamp: '10:00 AM'
    },
    {
      id: 2,
      type: 'user',
      content: 'Add this note: finish AI assignment by Friday.',
      timestamp: '10:02 AM'
    },
    {
      id: 3,
      type: 'ai',
      content: "Got it! I've added 'Finish AI assignment' to your Academics > Assignments with a deadline of Friday, November 7th. Would you like me to block out study time in your daily planner as well?",
      timestamp: '10:02 AM',
      linkedItems: [
        {
          id: '1',
          type: 'task',
          title: 'Finish AI assignment',
          section: 'Academics > Assignments',
          action: 'Added'
        }
      ]
    },
    {
      id: 4,
      type: 'user',
      content: 'Yes please, schedule 3 hours tomorrow afternoon.',
      timestamp: '10:03 AM'
    },
    {
      id: 5,
      type: 'ai',
      content: "Perfect! I've scheduled 3 hours for your AI assignment tomorrow (Tuesday) from 2:00 PM to 5:00 PM. I've also moved your skill development session to the evening to accommodate this.",
      timestamp: '10:03 AM',
      linkedItems: [
        {
          id: '2',
          type: 'task',
          title: 'AI Assignment - Study Session',
          section: 'Daily Planner',
          action: 'Scheduled for Nov 4, 2:00 PM'
        }
      ]
    },
    {
      id: 6,
      type: 'user',
      content: 'My class got canceled, what should I do?',
      timestamp: '10:15 AM'
    },
    {
      id: 7,
      type: 'ai',
      content: "I'll rebalance your daily plan for you! Since your class is canceled, I suggest using that time for:\n\n1. Working on your Data Structures assignment (high priority)\n2. Reviewing Chapter 7 - Operating Systems\n3. Taking a 30-minute study break\n\nI've also updated your schedule to reflect these changes. You now have an extra hour of productive time today!",
      timestamp: '10:15 AM',
      linkedItems: [
        {
          id: '3',
          type: 'class',
          title: 'Database Systems Lecture',
          section: 'Academics',
          action: 'Canceled'
        },
        {
          id: '4',
          type: 'task',
          title: 'Data Structures Assignment',
          section: 'Daily Planner',
          action: 'Rescheduled to 11:00 AM'
        }
      ]
    }
  ];

  const [messages] = useState<Message[]>(initialMessages);

  const allLinkedItems = messages
    .filter(msg => msg.linkedItems && msg.linkedItems.length > 0)
    .flatMap(msg => msg.linkedItems || []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2;
      case 'note':
        return BookOpen;
      case 'class':
        return GraduationCap;
      case 'expense':
        return Wallet;
      default:
        return Calendar;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'from-green-500 to-emerald-500';
      case 'note':
        return 'from-blue-500 to-cyan-500';
      case 'class':
        return 'from-violet-500 to-purple-500';
      case 'expense':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('added') || action.toLowerCase().includes('scheduled')) {
      return 'bg-green-100 text-green-700';
    } else if (action.toLowerCase().includes('canceled') || action.toLowerCase().includes('removed')) {
      return 'bg-red-100 text-red-700';
    } else if (action.toLowerCase().includes('rescheduled') || action.toLowerCase().includes('updated')) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-gray-900">Personalized Assistant</h1>
          </div>
          <p className="text-gray-600">Your AI-powered companion for managing student life</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowLinkedItems(!showLinkedItems)}
          className="gap-2"
        >
          {showLinkedItems ? 'Hide' : 'Show'} Linked Items
        </Button>
      </div>

      {/* Main Chat Interface */}
      <div className={`grid gap-3 ${showLinkedItems ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Chat Area */}
        <Card className={`${showLinkedItems ? 'lg:col-span-2' : ''} p-0 border-gray-200 flex flex-col`} style={{ height: '550px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%]`}>
                      {msg.type === 'ai' && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs text-gray-500">AI Assistant</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          msg.type === 'user'
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-line text-sm">{msg.content}</p>
                      </div>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-9 w-9 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything... I can help with tasks, schedules, expenses, and more!"
                  className="resize-none min-h-[70px] max-h-[110px] border-gray-300 focus:border-violet-500 focus:ring-violet-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      // Handle send message
                    }
                  }}
                />
              </div>
              <Button
                className="flex-shrink-0 h-9 px-5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-11">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </Card>

        {/* Linked Items Panel */}
        {showLinkedItems && (
          <Card className="p-4 border-gray-200 flex flex-col" style={{ height: '550px' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900">Linked Items</h2>
              <Badge variant="secondary">{allLinkedItems.length}</Badge>
            </div>

            {allLinkedItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No linked items yet</p>
                  <p className="text-xs mt-1">Items modified by AI will appear here</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-3 space-y-2">
                    {allLinkedItems.map((item) => {
                      const Icon = getItemIcon(item.type);
                      const gradient = getItemColor(item.type);
                      const actionColor = getActionColor(item.action);

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 mb-1 text-sm truncate">{item.title}</p>
                              <p className="text-gray-500 text-xs mb-2">{item.section}</p>
                              <Badge variant="secondary" className={`text-xs ${actionColor}`}>
                                {item.action}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-600 mb-2">Quick Actions</p>
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300"
                >
                  Generate daily plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                >
                  Review my week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                >
                  Optimize schedule
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Capabilities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 border-gray-200 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Smart Planning</h3>
              <p className="text-gray-600 text-sm">
                I can create, adjust, and optimize your daily schedule based on your priorities and habits.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 border-gray-200 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Academic Support</h3>
              <p className="text-gray-600 text-sm">
                Track assignments, manage study sessions, and get personalized academic insights.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Holistic Management</h3>
              <p className="text-gray-600 text-sm">
                Connect all aspects of student life - from finances to habits, all in one conversation.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
