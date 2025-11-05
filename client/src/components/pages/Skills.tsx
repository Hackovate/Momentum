import { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Sparkles, Pencil, Trash2, Check } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { SkillModal } from '../modals/SkillModal';
import { skillsAPI } from '@/lib/api';

export function Skills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [skillsData, recommendationsData] = await Promise.all([
        skillsAPI.getAll(),
        skillsAPI.getRecommendations()
      ]);
      setSkills(skillsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error loading skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    setSelectedSkill(null);
    setModalMode('create');
    setSkillModalOpen(true);
  };

  const handleEditSkill = (skill: any) => {
    setSelectedSkill(skill);
    setModalMode('edit');
    setSkillModalOpen(true);
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Delete this skill? All milestones and resources will be removed.')) return;
    
    try {
      await skillsAPI.delete(skillId);
      await loadData();
    } catch (error) {
      console.error('Error deleting skill:', error);
      alert('Failed to delete skill');
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      await skillsAPI.generateRecommendations();
      await loadData();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations');
    }
  };

  const completedMilestones = skills.reduce((acc, skill) => 
    acc + (skill.milestones?.filter((m: any) => m.completed).length || 0), 0
  );
  const totalMilestones = skills.reduce((acc, skill) => 
    acc + (skill.milestones?.length || 0), 0
  );
  const totalHours = skills.reduce((acc, skill) => {
    const hours = parseInt(skill.timeSpent?.replace('h', '') || '0');
    return acc + hours;
  }, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading skills...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Skill Modal */}
      <SkillModal
        open={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        onSave={loadData}
        skill={selectedSkill}
        mode={modalMode}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-3xl mb-1">Skill Development Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your learning journey and build your expertise</p>
        </div>
        <Button 
          onClick={handleAddSkill}
          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Skill
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-0.5">Active Skills</p>
              <p className="text-gray-900 dark:text-gray-100 text-3xl">{skills.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-0.5">Milestones Completed</p>
              <p className="text-gray-900 dark:text-gray-100 text-3xl">{completedMilestones}/{totalMilestones}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-0.5">Total Learning Hours</p>
              <p className="text-gray-900 dark:text-gray-100 text-3xl">{totalHours}h</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="p-4 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-gray-900 dark:text-gray-100">AI Recommended Tasks</h2>
          </div>
          <Button 
            onClick={handleGenerateRecommendations}
            size="sm" 
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="w-3 h-3" />
            Generate
          </Button>
        </div>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No recommendations yet</p>
            <p className="text-xs mt-1">Click Generate to get AI-powered learning suggestions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((rec: any) => (
              <Card key={rec.id} className="p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(rec.priority)} mt-1.5`}></div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-gray-100 mb-0.5 text-sm">{rec.title}</h3>
                    <Badge variant="secondary" className="text-xs">{rec.skill?.name || 'General'}</Badge>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1.5">{rec.reason}</p>
                <p className="text-violet-600 dark:text-violet-400 text-xs">⏱️ {rec.estimatedTime}</p>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Skill Roadmap Cards */}
      <div>
        <h2 className="text-gray-900 dark:text-gray-100 mb-3">Your Learning Roadmaps</h2>
        {skills.length === 0 ? (
          <Card className="p-12 text-center border-gray-200 dark:border-gray-700">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Skills Yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking your learning journey by adding your first skill</p>
            <Button onClick={handleAddSkill} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Skill
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {skills.map((skill) => {
              const completedMilestonesCount = skill.milestones?.filter((m: any) => m.completed).length || 0;
              const totalMilestonesCount = skill.milestones?.length || 0;
              const calculatedProgress = totalMilestonesCount > 0 
                ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) 
                : 0;

              return (
                <Card 
                  key={skill.id} 
                  className="p-4 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleEditSkill(skill)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-1.5 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {skill.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{skill.level}</Badge>
                        {skill.aiGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEditSkill(skill);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDeleteSkill(skill.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Goal Statement */}
                  {skill.goalStatement && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{skill.goalStatement}</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-semibold text-foreground">{calculatedProgress}%</span>
                    </div>
                    <Progress value={calculatedProgress} className="h-2" />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      {totalMilestonesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {completedMilestonesCount}/{totalMilestonesCount}
                        </span>
                      )}
                      {skill.learningResources?.length > 0 && (
                        <span className="flex items-center gap-1">
                          📚 {skill.learningResources.length}
                        </span>
                      )}
                    </div>
                    {skill.timeSpent && skill.timeSpent !== '0h' && (
                      <span className="flex items-center gap-1">
                        ⏱️ {skill.timeSpent}
                      </span>
                    )}
                  </div>

                  {/* Timeline Info - Compact */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {skill.durationMonths && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        📅 {skill.durationMonths}mo
                      </span>
                    )}
                    {skill.estimatedHours && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        ⏱️ {skill.estimatedHours}h
                      </span>
                    )}
                    {skill.startDate && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        � {new Date(skill.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {skill.endDate && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        🎯 {new Date(skill.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
