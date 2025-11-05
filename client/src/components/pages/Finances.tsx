import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, ShoppingBag, Home, Utensils, GraduationCap, Heart, Trash2, Briefcase } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useApp } from '../../lib/AppContext';
import { toast } from 'sonner';

export function Finances() {
  const { expenses, addExpense, deleteExpense, monthlyBudget, savingsGoal, updateBudget, updateSavings } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    category: 'Food',
    amount: '',
    type: 'expense' as 'expense' | 'income',
  });

  const expenseCategories = [
    { name: 'Food', icon: Utensils, color: 'from-orange-500 to-red-500' },
    { name: 'Education', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
    { name: 'Shopping', icon: ShoppingBag, color: 'from-violet-500 to-purple-500' },
    { name: 'Housing', icon: Home, color: 'from-green-500 to-emerald-500' },
    { name: 'Health', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { name: 'Other', icon: Wallet, color: 'from-gray-500 to-slate-500' },
  ];

  const incomeCategories = [
    { name: 'Salary', icon: Wallet, color: 'from-green-500 to-emerald-500' },
    { name: 'Freelance', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
    { name: 'Scholarship', icon: GraduationCap, color: 'from-violet-500 to-purple-500' },
    { name: 'Investment', icon: TrendingUp, color: 'from-indigo-500 to-blue-500' },
    { name: 'Gift', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { name: 'Other', icon: Wallet, color: 'from-gray-500 to-slate-500' },
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];
  const currentCategories = newExpense.type === 'income' ? incomeCategories : expenseCategories;

  // Calculate dynamic values based on actual transactions
  const totalExpenses = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = expenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  // Available balance = Total Income - Total Expenses
  const actualBalance = totalIncome - totalExpenses;

  // Net savings (actual money saved)
  const netSavings = Math.max(0, actualBalance);
  const currentSavings = netSavings;

  // Savings progress
  const savingsProgress = savingsGoal > 0 ? (currentSavings / savingsGoal) * 100 : 0;

  // Budget progress (spending vs budget)
  const budgetProgress = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0;

  // Calculate category breakdown
  const categoryBreakdown = expenseCategories.map(cat => {
    const total = expenses
      .filter(e => e.category === cat.name && e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      category: cat.name,
      amount: total,
      percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      icon: cat.icon,
      color: cat.color,
    };
  }).filter(c => c.amount > 0);

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    addExpense({
      ...newExpense,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString(),
    });

    setNewExpense({ name: '', category: 'Food', amount: '', type: 'expense' });
    setIsAddDialogOpen(false);
    toast.success(`${newExpense.type === 'income' ? 'Income' : 'Expense'} added successfully!`);
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpense(id);
    toast.success('Transaction deleted!');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Expense & Savings Tracker</h1>
          <p className="text-muted-foreground">Manage your finances and reach your savings goals</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={newExpense.type} 
                  onValueChange={(value: 'expense' | 'income') => {
                    // Reset category to first option when type changes
                    const newCategory = value === 'income' ? 'Salary' : 'Food';
                    setNewExpense({ ...newExpense, type: value, category: newCategory });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Description</Label>
                <Input
                  id="name"
                  placeholder="e.g., Groceries, Salary"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newExpense.category} onValueChange={(value: string) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategories.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpense}>Add Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Total Income</p>
              <p className="text-foreground text-3xl">${totalIncome.toFixed(0)}</p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-0.5">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Total Expenses</p>
              <p className="text-foreground text-3xl">${totalExpenses.toFixed(0)}</p>
              <p className="text-muted-foreground text-sm mt-0.5">of ${monthlyBudget} budget</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <Progress value={budgetProgress} className="h-2" />
            <p className={`text-sm mt-1 ${budgetProgress > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {budgetProgress > 100 ? 'Over budget!' : `${Math.round(budgetProgress)}% used`}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Available Balance</p>
              <p className="text-foreground text-3xl">${actualBalance.toFixed(0)}</p>
              <div className={`flex items-center gap-1 text-sm mt-0.5 ${
                actualBalance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {actualBalance >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>Remaining</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>Deficit</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary text-sm mb-0.5">Savings Goal</p>
              <p className="text-foreground text-3xl">${currentSavings}</p>
              <p className="text-muted-foreground text-sm mt-0.5">of ${savingsGoal} goal</p>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-primary/20" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - savingsProgress / 100)}`}
                  className="text-primary"
                />
              </svg>
            </div>
          </div>
          <Progress value={savingsProgress} className="h-2 mt-3" />
          <p className="text-primary text-sm mt-1">{Math.round(savingsProgress)}% complete</p>
        </Card>
      </div>

      {/* Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Spending by Category */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Monthly Spending by Category</h2>
          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses this month</p>
            ) : (
              categoryBreakdown.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-foreground">{item.category}</span>
                      </div>
                      <span className="text-foreground">${item.amount} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Recent Transactions</h2>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              expenses.slice(0, 10).map((transaction) => {
                const category = allCategories.find(c => c.name === transaction.category);
                const Icon = category?.icon || Wallet;
                const color = category?.color || 'from-gray-500 to-slate-500';
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg hover:bg-accent transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-foreground">{transaction.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`${
                        transaction.type === 'income' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-foreground'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleDeleteExpense(transaction.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Financial Tips */}
      <Card className="p-4 border-border bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h3 className="text-foreground mb-1.5">Smart Financial Insight</h3>
            <p className="text-foreground/80 mb-2 text-sm">
              {(() => {
                if (actualBalance < 0) {
                  return "⚠️ Your expenses exceed your income. Consider reducing spending or finding additional income sources.";
                } else if (budgetProgress > 80) {
                  return "You're close to your budget limit. Review your spending categories to identify areas where you can cut back.";
                } else if (netSavings > savingsGoal * 0.5) {
                  return `🎉 Excellent progress! You're ${Math.round(savingsProgress)}% toward your savings goal. Keep up the great work!`;
                } else if (totalIncome > 0 && totalExpenses === 0) {
                  return "Great start! Now track your expenses to understand where your money goes.";
                } else if (totalIncome === 0 && totalExpenses > 0) {
                  return "Add your income sources to get a complete picture of your finances.";
                } else {
                  return "Great job managing your finances! Keep tracking both income and expenses to maintain this healthy financial habit.";
                }
              })()}
            </p>
            <Button variant="link" className="p-0 h-auto text-primary">Learn more →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
