import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { planDay, rebalanceDay, ingestDocs } from '../services/ai.service';

const prisma = new PrismaClient();

export const generatePlan = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date_iso, available_times, tasks, classes, preferences } = req.body;

    if (!date_iso) {
      return res.status(400).json({
        success: false,
        error: 'date_iso is required'
      });
    }

    // Fetch user profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        educationLevel: true,
        institution: true,
        class: true,
        group: true,
        year: true,
        major: true,
        board: true,
        expectedGraduation: true,
        unstructuredContext: true
      }
    });

    // Fetch user task patterns for completion history
    const taskPatterns = await prisma.userTaskPattern.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Get recent patterns
    });

    // Calculate completion history from patterns
    const completionHistory: any = {
      averageDailyCompletion: 0.7,
      preferredStudyTimes: [],
      typicalCapacity: tasks?.length ? Math.round(tasks.length * 0.6) : 0
    };

    if (taskPatterns.length > 0) {
      const completionRates = taskPatterns
        .filter(p => p.completionRate !== null && p.completionRate !== undefined)
        .map(p => p.completionRate!);
      
      if (completionRates.length > 0) {
        completionHistory.averageDailyCompletion = 
          completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
      }

      // Calculate typical capacity based on actual vs estimated time
      const timeRatios = taskPatterns
        .filter(p => p.estimatedHours && p.actualHours)
        .map(p => p.actualHours! / p.estimatedHours!);
      
      if (timeRatios.length > 0) {
        const avgTimeRatio = timeRatios.reduce((a, b) => a + b, 0) / timeRatios.length;
        completionHistory.typicalCapacity = tasks?.length 
          ? Math.round(tasks.length * avgTimeRatio) 
          : 0;
      }
    }

    // Serialize Prisma objects to plain JSON (convert Date objects to strings, BigInt to numbers)
    const serializedTaskPatterns = taskPatterns.map(pattern => ({
      userId: pattern.userId,
      taskType: pattern.taskType,
      estimatedHours: pattern.estimatedHours ? Number(pattern.estimatedHours) : null,
      actualHours: pattern.actualHours ? Number(pattern.actualHours) : null,
      estimatedDays: pattern.estimatedDays ? Number(pattern.estimatedDays) : null,
      actualDays: pattern.actualDays ? Number(pattern.actualDays) : null,
      completionRate: pattern.completionRate ? Number(pattern.completionRate) : null,
      progressRate: pattern.progressRate ? Number(pattern.progressRate) : null,
      createdAt: pattern.createdAt ? pattern.createdAt.toISOString() : null
    }));

    // Prepare user profile for AI
    const userProfile = user ? {
      educationLevel: user.educationLevel,
      institution: user.institution,
      major: user.major,
      year: user.year,
      unstructuredContext: user.unstructuredContext
    } : {};

    // Call AI service to generate plan with completion history
    const aiPlan = await planDay({
      user_id: userId,
      date_iso,
      available_times: available_times || [],
      tasks: tasks || [],
      classes: classes || [],
      preferences: preferences || {},
      user_profile: userProfile,
      completion_history: completionHistory,
      task_patterns: serializedTaskPatterns
    });

    // Handle task shifts - update dates in database
    if (aiPlan.shifted_tasks && aiPlan.shifted_tasks.length > 0) {
      for (const shiftedTask of aiPlan.shifted_tasks) {
        try {
          if (shiftedTask.type === 'assignment' && shiftedTask.task_id) {
            // Find assignment by task_id through course relation
            const assignment = await prisma.assignment.findFirst({
              where: {
                id: shiftedTask.task_id,
                course: {
                  userId
                }
              }
            });
            
            if (assignment && shiftedTask.newDueDate) {
              await prisma.assignment.update({
                where: { id: assignment.id },
                data: {
                  dueDate: new Date(shiftedTask.newDueDate),
                  startDate: shiftedTask.newStartDate ? new Date(shiftedTask.newStartDate) : undefined
                }
              });
            }
          } else if (shiftedTask.type === 'milestone' && shiftedTask.task_id) {
            // Find milestone by task_id
            const milestone = await prisma.milestone.findFirst({
              where: {
                id: shiftedTask.task_id,
                userId
              }
            });
            
            if (milestone && shiftedTask.newDueDate) {
              await prisma.milestone.update({
                where: { id: milestone.id },
                data: {
                  dueDate: new Date(shiftedTask.newDueDate),
                  startDate: shiftedTask.newStartDate ? new Date(shiftedTask.newStartDate) : undefined
                }
              });
            }
          } else if (shiftedTask.type === 'task' && shiftedTask.task_id) {
            // Find personal task by task_id
            const task = await prisma.task.findFirst({
              where: {
                id: shiftedTask.task_id,
                userId
              }
            });
            
            if (task && shiftedTask.newDueDate) {
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  dueDate: new Date(shiftedTask.newDueDate)
                  // Note: Task model doesn't have startDate field in schema
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error updating shifted task ${shiftedTask.task_id}:`, error);
        }
      }
    }

    // Save plan to PostgreSQL
    const planDate = new Date(date_iso);
    const planData = {
      summary: aiPlan.summary || '',
      schedule: aiPlan.schedule || [],
      suggestions: aiPlan.suggestions || [],
      rebalanced_tasks: aiPlan.rebalanced_tasks || [],
      shifted_tasks: aiPlan.shifted_tasks || [],
      metadata: aiPlan.metadata || {}
    };

    const savedPlan = await prisma.aIPlan.create({
      data: {
        userId,
        date: planDate,
        planJson: planData,
        summary: aiPlan.summary || null,
        source: 'daily'
      }
    });

    // Store plan summary in ChromaDB for semantic search
    try {
      const schedule = aiPlan.schedule || [];
      const taskTitles = schedule.map((s: any) => s.title).filter(Boolean);
      const suggestions = aiPlan.suggestions || [];
      
      const planSummaryText = `Daily Plan for ${planDate.toLocaleDateString()}:
Summary: ${aiPlan.summary || 'Daily schedule'}
Tasks: ${taskTitles.join(', ')}
Suggestions: ${suggestions.join('; ')}
Schedule: ${schedule.map((s: any) => `${s.title} from ${s.start} to ${s.end}`).join('; ')}`;

      const chromaDocId = `plan_${userId}_${Date.now()}`;
      await ingestDocs({
        user_id: userId,
        docs: [{
          id: chromaDocId,
          text: planSummaryText,
          meta: {
            type: 'plan',
            source: 'daily_planner',
            date: date_iso,
            timestamp: new Date().toISOString()
          }
        }]
      });

      // Store ChromaDB link in AIMemory
      await prisma.aIMemory.create({
        data: {
          userId,
          chromaId: chromaDocId,
          type: 'plan',
          metadata: {
            source: 'daily_planner',
            date: date_iso,
            plan_id: savedPlan.id
          }
        }
      });

      console.log('Plan summary saved to ChromaDB:', chromaDocId);
    } catch (error) {
      console.error('Error saving plan summary to ChromaDB:', error);
      // Continue even if ChromaDB save fails
    }

    res.json({
      success: true,
      data: {
        plan: aiPlan,
        plan_id: savedPlan.id
      }
    });
  } catch (error: any) {
    console.error('Generate plan error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate plan',
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
};

export const rebalancePlan = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date_iso, incomplete_tasks, completion_history, preferences } = req.body;

    if (!date_iso) {
      return res.status(400).json({
        success: false,
        error: 'date_iso is required'
      });
    }

    // Fetch user profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        educationLevel: true,
        institution: true,
        class: true,
        group: true,
        year: true,
        major: true,
        board: true,
        expectedGraduation: true,
        unstructuredContext: true
      }
    });

    // Fetch user task patterns for completion history
    const taskPatterns = await prisma.userTaskPattern.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Get recent patterns
    });

    // Enhance completion history with real data if not provided or incomplete
    let enhancedCompletionHistory = completion_history || {};
    if (taskPatterns.length > 0) {
      const completionRates = taskPatterns
        .filter(p => p.completionRate !== null && p.completionRate !== undefined)
        .map(p => p.completionRate!);
      
      if (completionRates.length > 0 && !enhancedCompletionHistory.averageDailyCompletion) {
        enhancedCompletionHistory.averageDailyCompletion = 
          completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
      }

      // Calculate typical capacity based on actual vs estimated time
      const timeRatios = taskPatterns
        .filter(p => p.estimatedHours && p.actualHours)
        .map(p => p.actualHours! / p.estimatedHours!);
      
      if (timeRatios.length > 0 && !enhancedCompletionHistory.typicalCapacity) {
        const avgTimeRatio = timeRatios.reduce((a, b) => a + b, 0) / timeRatios.length;
        enhancedCompletionHistory.typicalCapacity = incomplete_tasks?.length 
          ? Math.round(incomplete_tasks.length * avgTimeRatio) 
          : 0;
      }
    }

    // Get existing plan for the date
    const planDate = new Date(date_iso);
    const startOfDay = new Date(planDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(planDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingPlan = await prisma.aIPlan.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: endOfDay
        },
        source: 'daily'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Serialize Prisma objects to plain JSON (convert Date objects to strings, BigInt to numbers)
    const serializedTaskPatterns = taskPatterns.map(pattern => ({
      userId: pattern.userId,
      taskType: pattern.taskType,
      estimatedHours: pattern.estimatedHours ? Number(pattern.estimatedHours) : null,
      actualHours: pattern.actualHours ? Number(pattern.actualHours) : null,
      estimatedDays: pattern.estimatedDays ? Number(pattern.estimatedDays) : null,
      actualDays: pattern.actualDays ? Number(pattern.actualDays) : null,
      completionRate: pattern.completionRate ? Number(pattern.completionRate) : null,
      progressRate: pattern.progressRate ? Number(pattern.progressRate) : null,
      createdAt: pattern.createdAt ? pattern.createdAt.toISOString() : null
    }));

    // Call AI service to rebalance plan
    const aiPlan = await rebalanceDay({
      user_id: userId,
      date_iso,
      incomplete_tasks: incomplete_tasks || [],
      completion_history: enhancedCompletionHistory,
      preferences: preferences || {},
      existing_plan: existingPlan ? (existingPlan.planJson as any) : null,
      user_profile: user ? {
        ...user,
        expectedGraduation: user.expectedGraduation ? user.expectedGraduation.toISOString() : null
      } : {},
      task_patterns: serializedTaskPatterns
    });

    // Update or create plan
    const planData = {
      summary: aiPlan.summary || existingPlan?.summary || '',
      schedule: aiPlan.schedule || [],
      suggestions: aiPlan.suggestions || [],
      rebalanced_tasks: aiPlan.rebalanced_tasks || [],
      shifted_tasks: aiPlan.shifted_tasks || [],
      metadata: {
        ...(existingPlan ? (existingPlan.planJson as any)?.metadata : {}),
        ...(aiPlan.metadata || {}),
        isRebalanced: true,
        rebalancedAt: new Date().toISOString()
      }
    };

    let savedPlan;
    if (existingPlan) {
      savedPlan = await prisma.aIPlan.update({
        where: { id: existingPlan.id },
        data: {
          planJson: planData,
          summary: planData.summary
        }
      });
    } else {
      savedPlan = await prisma.aIPlan.create({
        data: {
          userId,
          date: planDate,
          planJson: planData,
          summary: planData.summary,
          source: 'rebalance'
        }
      });
    }

    // Handle task shifts (update due dates if needed)
    if (aiPlan.shifted_tasks && aiPlan.shifted_tasks.length > 0) {
      for (const shiftedTask of aiPlan.shifted_tasks) {
        try {
          if (shiftedTask.type === 'assignment' && shiftedTask.task_id) {
            // Find assignment by task_id, checking userId through course relation
            const assignment = await prisma.assignment.findFirst({
              where: {
                id: shiftedTask.task_id,
                course: {
                  userId
                }
              }
            });
            
            if (assignment && shiftedTask.newDueDate) {
              await prisma.assignment.update({
                where: { id: assignment.id },
                data: {
                  dueDate: new Date(shiftedTask.newDueDate)
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error updating task ${shiftedTask.task_id}:`, error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        plan: aiPlan,
        plan_id: savedPlan.id
      }
    });
  } catch (error: any) {
    console.error('Rebalance plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rebalance plan'
    });
  }
};

