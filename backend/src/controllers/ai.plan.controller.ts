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

    // Call AI service to generate plan
    const aiPlan = await planDay({
      user_id: userId,
      date_iso,
      available_times: available_times || [],
      tasks: tasks || [],
      classes: classes || [],
      preferences: preferences || {}
    });

    // Save plan to PostgreSQL
    const planDate = new Date(date_iso);
    const planData = {
      summary: aiPlan.summary || '',
      schedule: aiPlan.schedule || [],
      suggestions: aiPlan.suggestions || [],
      rebalanced_tasks: aiPlan.rebalanced_tasks || [],
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
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate plan'
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

    // Call AI service to rebalance plan
    const aiPlan = await rebalanceDay({
      user_id: userId,
      date_iso,
      incomplete_tasks: incomplete_tasks || [],
      completion_history: completion_history || {},
      preferences: preferences || {},
      existing_plan: existingPlan ? (existingPlan.planJson as any) : null
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

