import React, { createContext, useContext, useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  time: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'inProgress' | 'done';
  date: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  progress: number;
  grade: string;
  color: string;
  nextClass: string;
  assignments: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  progress: number;
  gradient: string;
  milestones: { name: string; completed: boolean }[];
  nextTask: string;
  resources: number;
  timeSpent: string;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
}

interface Habit {
  id: string;
  name: string;
  target: string;
  time: string;
  streak: number;
  completed: boolean;
  color: string;
  icon: string;
}

interface JournalEntry {
  id: string;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'bad';
  title: string;
  content: string;
  tags: string[];
}

interface AppContextType {
  tasks: Task[];
  subjects: Subject[];
  skills: Skill[];
  expenses: Expense[];
  habits: Habit[];
  journalEntries: JournalEntry[];
  monthlyBudget: number;
  savingsGoal: number;
  currentSavings: number;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addSkill: (skill: Omit<Skill, 'id'>) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  toggleHabit: (id: string) => void;
  addHabit: (habit: Omit<Habit, 'id'>) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  updateBudget: (budget: number) => void;
  updateSavings: (savings: number, goal: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(2000);
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [currentSavings, setCurrentSavings] = useState(2840);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('studentLifeData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setTasks(data.tasks || []);
      setSubjects(data.subjects || []);
      setSkills(data.skills || []);
      setExpenses(data.expenses || []);
      setHabits(data.habits || []);
      setJournalEntries(data.journalEntries || []);
      setMonthlyBudget(data.monthlyBudget || 2000);
      setSavingsGoal(data.savingsGoal || 5000);
      setCurrentSavings(data.currentSavings || 2840);
    } else {
      // Initialize with default data
      initializeDefaultData();
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const data = {
      tasks,
      subjects,
      skills,
      expenses,
      habits,
      journalEntries,
      monthlyBudget,
      savingsGoal,
      currentSavings,
    };
    localStorage.setItem('studentLifeData', JSON.stringify(data));
  }, [tasks, subjects, skills, expenses, habits, journalEntries, monthlyBudget, savingsGoal, currentSavings]);

  const initializeDefaultData = () => {
    // Initialize default tasks
    setTasks([
      { id: '1', title: "Complete Data Structures Assignment", time: "2:00 PM", duration: "2h", priority: "high", status: "todo", date: new Date().toISOString() },
      { id: '2', title: "Read Chapter 7 - Operating Systems", time: "4:30 PM", duration: "1h", priority: "medium", status: "todo", date: new Date().toISOString() },
      { id: '3', title: "Team Meeting for Web Dev Project", time: "12:00 PM", duration: "1h", priority: "high", status: "inProgress", date: new Date().toISOString() },
      { id: '4', title: "Morning Study Session - Mathematics", time: "8:00 AM", duration: "2h", priority: "high", status: "done", date: new Date().toISOString() },
    ]);

    // Initialize default subjects
    setSubjects([
      { id: '1', name: "Data Structures & Algorithms", code: "CS201", progress: 75, grade: "A", color: "from-blue-500 to-cyan-500", nextClass: "Mon 11:00 AM", assignments: 2 },
      { id: '2', name: "Database Management Systems", code: "CS301", progress: 60, grade: "B+", color: "from-violet-500 to-purple-500", nextClass: "Tue 2:00 PM", assignments: 1 },
      { id: '3', name: "Operating Systems", code: "CS202", progress: 82, grade: "A", color: "from-green-500 to-emerald-500", nextClass: "Wed 10:00 AM", assignments: 0 },
    ]);

    // Initialize default skills
    setSkills([
      {
        id: '1',
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
      }
    ]);

    // Initialize default expenses
    setExpenses([
      { id: '1', name: "Campus Meal Plan", category: "Food", amount: 450, date: new Date().toISOString(), type: 'expense' },
      { id: '2', name: "Textbooks", category: "Education", amount: 280, date: new Date().toISOString(), type: 'expense' },
      { id: '3', name: "Part-time Job", category: "Income", amount: 800, date: new Date().toISOString(), type: 'income' },
    ]);

    // Initialize default habits
    setHabits([
      { id: '1', name: "Morning Meditation", target: "15 minutes", time: "7:00 AM", streak: 12, completed: true, color: "from-blue-500 to-cyan-500", icon: "🧘" },
      { id: '2', name: "Daily Exercise", target: "30 minutes", time: "6:30 AM", streak: 8, completed: true, color: "from-green-500 to-emerald-500", icon: "💪" },
      { id: '3', name: "Reading Time", target: "30 minutes", time: "9:00 PM", streak: 15, completed: false, color: "from-violet-500 to-purple-500", icon: "📚" },
    ]);
  };

  // Task operations
  const addTask = (task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: Date.now().toString() };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, ...updates } : task));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // Subject operations
  const addSubject = (subject: Omit<Subject, 'id'>) => {
    const newSubject = { ...subject, id: Date.now().toString() };
    setSubjects([...subjects, newSubject]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(subject => subject.id === id ? { ...subject, ...updates } : subject));
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
  };

  // Skill operations
  const addSkill = (skill: Omit<Skill, 'id'>) => {
    const newSkill = { ...skill, id: Date.now().toString() };
    setSkills([...skills, newSkill]);
  };

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    setSkills(skills.map(skill => skill.id === id ? { ...skill, ...updates } : skill));
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(skill => skill.id !== id));
  };

  // Expense operations
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(expenses.map(expense => expense.id === id ? { ...expense, ...updates } : expense));
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  // Habit operations
  const toggleHabit = (id: string) => {
    setHabits(habits.map(habit => {
      if (habit.id === id) {
        const newCompleted = !habit.completed;
        return {
          ...habit,
          completed: newCompleted,
          streak: newCompleted ? habit.streak + 1 : habit.streak
        };
      }
      return habit;
    }));
  };

  const addHabit = (habit: Omit<Habit, 'id'>) => {
    const newHabit = { ...habit, id: Date.now().toString() };
    setHabits([...habits, newHabit]);
  };

  // Journal operations
  const addJournalEntry = (entry: Omit<JournalEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() };
    setJournalEntries([newEntry, ...journalEntries]);
  };

  const updateJournalEntry = (id: string, updates: Partial<JournalEntry>) => {
    setJournalEntries(journalEntries.map(entry => entry.id === id ? { ...entry, ...updates } : entry));
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(journalEntries.filter(entry => entry.id !== id));
  };

  // Budget operations
  const updateBudget = (budget: number) => {
    setMonthlyBudget(budget);
  };

  const updateSavings = (savings: number, goal: number) => {
    setCurrentSavings(savings);
    setSavingsGoal(goal);
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        subjects,
        skills,
        expenses,
        habits,
        journalEntries,
        monthlyBudget,
        savingsGoal,
        currentSavings,
        addTask,
        updateTask,
        deleteTask,
        addSubject,
        updateSubject,
        deleteSubject,
        addSkill,
        updateSkill,
        deleteSkill,
        addExpense,
        updateExpense,
        deleteExpense,
        toggleHabit,
        addHabit,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        updateBudget,
        updateSavings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
