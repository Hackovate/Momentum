import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatAI } from '../services/ai.service';

const prisma = new PrismaClient();

export const chat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { message, conversation_history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get user's first and last name from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        firstName: true, 
        lastName: true,
        educationLevel: true,
        institution: true,
        major: true,
        unstructuredContext: true
      }
    });

    const userName = user 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : undefined;

    // Get structured context summary for AI
    const courses = await prisma.course.findMany({
      where: { userId },
      select: { courseName: true },
      take: 5
    });

    const skills = await prisma.skill.findMany({
      where: { userId },
      select: { name: true },
      take: 5
    });

    // Get recent daily plans (last 7 days)
    const recentPlans = await prisma.aIPlan.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 3,
      select: {
        date: true,
        summary: true,
        planJson: true
      }
    });

    // Build structured context summary
    const structuredContextParts: string[] = [];
    if (user?.educationLevel) structuredContextParts.push(`Education: ${user.educationLevel}`);
    if (user?.institution) structuredContextParts.push(`Institution: ${user.institution}`);
    if (user?.major) structuredContextParts.push(`Major: ${user.major}`);
    if (courses.length > 0) {
      structuredContextParts.push(`Courses: ${courses.map(c => c.courseName).join(', ')}`);
    }
    if (skills.length > 0) {
      structuredContextParts.push(`Skills: ${skills.map(s => s.name).join(', ')}`);
    }
    
    // Add recent plans context
    if (recentPlans.length > 0) {
      const planSummaries = recentPlans.map(plan => {
        const planDate = new Date(plan.date).toLocaleDateString();
        const schedule = (plan.planJson as any)?.schedule || [];
        const tasks = schedule.map((s: any) => s.title).filter(Boolean).slice(0, 5);
        return `Plan for ${planDate}: ${plan.summary || 'Daily schedule'} - Tasks: ${tasks.join(', ')}`;
      });
      structuredContextParts.push(`Recent Plans:\n${planSummaries.join('\n')}`);
    }

    // Add unstructured context from PostgreSQL (user-editable context)
    // This ensures the AI always has the latest unstructured context
    if (user?.unstructuredContext && user.unstructuredContext.trim()) {
      structuredContextParts.push(`\nUser Notes and Preferences:\n${user.unstructuredContext}`);
    }

    // Forward to AI service with structured context
    // The AI service will also retrieve additional context from ChromaDB
    const aiResp = await chatAI({
      user_id: userId,
      user_name: userName,
      message,
      conversation_history: conversation_history || [],
      structured_context: structuredContextParts.join('; ') // Pass as string for now
    });

    // Process actions returned by AI (e.g., update user data)
    if (aiResp.actions && aiResp.actions.length > 0) {
      for (const action of aiResp.actions) {
        try {
          if (action.type === 'update_user') {
            await prisma.user.update({
              where: { id: userId },
              data: action.data
            });
            console.log('User data updated via AI:', action.data);
          } else if (action.type === 'add_course') {
            await prisma.course.create({
              data: {
                userId,
                courseName: action.data.name || action.data.courseName,
                courseCode: action.data.code || action.data.courseCode || null,
                credits: action.data.credits || null
              }
            });
            console.log('Course added via AI:', action.data);
          } else if (action.type === 'add_skill') {
            await prisma.skill.create({
              data: {
                userId,
                name: action.data.name,
                category: action.data.category || 'General',
                level: action.data.level || action.data.currentLevel || 'beginner'
              }
            });
            console.log('Skill added via AI:', action.data);
          }
        } catch (error) {
          console.error(`Error processing action ${action.type}:`, error);
          // Continue processing other actions even if one fails
        }
      }
    }

    res.json({ success: true, data: aiResp });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
};

