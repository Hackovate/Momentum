import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOnboardingAI, answerOnboardingAI, ingestDocs } from '../services/ai.service';

const prisma = new PrismaClient();

// Start onboarding conversation (for AI - kept for future use)
export const startOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Get user's first name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true }
    });

    // Call AI service onboarding start
    const aiResp = await startOnboardingAI({
      user_id: userId,
      first_name: user?.firstName || undefined
    });

    res.json({ success: true, data: aiResp });
  } catch (error: any) {
    console.error('Start onboarding error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start onboarding'
    });
  }
};

// Submit complete onboarding data (form-based, no AI)
export const submitOnboardingData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = req.body;

    // Save onboarding data directly
    await saveOnboardingData(userId, data);

    res.json({
      success: true,
      message: 'Onboarding completed successfully'
    });
  } catch (error: any) {
    console.error('Submit onboarding data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save onboarding data'
    });
  }
};

// Submit answer to onboarding question (for AI - kept for future use)
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'Answer is required'
      });
    }

    // Forward to AI service
    const aiResp = await answerOnboardingAI({
      user_id: userId,
      answer
    });

    // If onboarding is completed, persist structured_data to PostgreSQL
    if (aiResp.completed && aiResp.structured_data) {
      try {
        await saveOnboardingData(userId, aiResp.structured_data);
        console.log('AI onboarding structured_data persisted to PostgreSQL');
      } catch (error) {
        console.error('Error persisting AI onboarding data:', error);
        // Continue even if persistence fails - return the response anyway
      }
    }

    res.json({ success: true, data: aiResp });
  } catch (error: any) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit answer'
    });
  }
};

// Get onboarding status
export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Check if user has completed onboarding by checking if educationLevel is set
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        educationLevel: true,
        institution: true,
        firstName: true,
        lastName: true
      }
    });

    const completed = !!user?.educationLevel;

    res.json({
      success: true,
      data: {
        completed,
        userData: user
      }
    });
  } catch (error: any) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get onboarding status'
    });
  }
};

// Helper function to save onboarding data
async function saveOnboardingData(userId: string, data: any) {
  try {
    // Update user with education info (handle both snake_case and camelCase)
    const updateData: any = {
      educationLevel: data.education_level || data.educationLevel,
      institution: data.institution || null,
      board: data.board || null,
      expectedGraduation: data.expectedGraduation ? new Date(data.expectedGraduation) : null
    };

    // School-specific
    if (data.class) updateData.class = data.class.toString();
    if (data.group) updateData.group = data.group;
    
    // College/University-specific
    if (data.year) updateData.year = parseInt(data.year.toString());
    if (data.major) updateData.major = data.major;
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Store additional education fields in AIMemory metadata
    const additionalFields: any = {};
    if (data.medium) additionalFields.medium = data.medium;
    if (data.department) additionalFields.department = data.department;
    if (data.semester) additionalFields.semester = data.semester;
    if (data.researchArea) additionalFields.researchArea = data.researchArea;
    if (data.program) additionalFields.program = data.program;

    if (Object.keys(additionalFields).length > 0) {
      // Store in AIMemory as onboarding metadata
      await prisma.aIMemory.create({
        data: {
          userId,
          type: 'onboarding',
          chromaId: `onboarding-${userId}-${Date.now()}`,
          metadata: {
            source: 'onboarding',
            educationDetails: additionalFields
          }
        }
      });
    }

    // Create courses (for university/graduate)
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        await prisma.course.create({
          data: {
            userId,
            courseName: course.name || course.courseName,
            courseCode: course.code || course.courseCode || `COURSE-${Date.now()}`,
            credits: course.credits ? parseInt(course.credits.toString()) : 3
          }
        });
      }
    }

    // Create subjects as courses (for school/college)
    // Store subjects as courses with a special tag or in description
    if (data.subjects && Array.isArray(data.subjects)) {
      for (const subject of data.subjects) {
        await prisma.course.create({
          data: {
            userId,
            courseName: subject,
            courseCode: `SUBJECT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            credits: null,
            description: 'Subject from onboarding'
          }
        });
      }
    }

    // Create skills
    const skills = data.skill_goals || data.skills || [];
    if (Array.isArray(skills) && skills.length > 0) {
      for (const skill of skills) {
        await prisma.skill.create({
          data: {
            userId,
            name: skill.name,
            category: skill.category || 'General',
            level: (skill.current_level || skill.level || 'beginner').toLowerCase()
          }
        });
      }
    }

    // Create monthly budget record (Finance model is for transactions, not budgets)
    const financialData = data.financial_situation || data.financial || {};
    if (financialData.monthly_budget || financialData.monthlyBudget) {
      const now = new Date();
      const monthlyBudget = financialData.monthly_budget || financialData.monthlyBudget || 0;
      
      if (monthlyBudget > 0) {
        await prisma.monthlyBudget.create({
          data: {
            userId,
            title: 'General Monthly Budget',
            targetAmount: parseFloat(monthlyBudget.toString()),
            currentAmount: 0,
            category: 'general',
            month: now.getMonth() + 1,
            year: now.getFullYear()
          }
        });
      }
    }

    // Get user's name for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    // Create comprehensive summary text for ChromaDB
    const summaryParts: string[] = [];
    
    // User name
    if (user?.firstName || user?.lastName) {
      summaryParts.push(`User: ${user.firstName || ''} ${user.lastName || ''}`.trim());
    }

    // Education info
    if (updateData.educationLevel) {
      summaryParts.push(`Education Level: ${updateData.educationLevel}`);
    }
    if (updateData.institution) {
      summaryParts.push(`Institution: ${updateData.institution}`);
    }
    if (updateData.class) {
      summaryParts.push(`Class: ${updateData.class}`);
    }
    if (updateData.group) {
      summaryParts.push(`Group: ${updateData.group}`);
    }
    if (updateData.year) {
      summaryParts.push(`Year: ${updateData.year}`);
    }
    if (updateData.major) {
      summaryParts.push(`Major: ${updateData.major}`);
    }
    if (updateData.board) {
      summaryParts.push(`Board: ${updateData.board}`);
    }

    // Courses/Subjects
    const allCourses = [
      ...(data.courses || []).map((c: any) => c.name || c.courseName || ''),
      ...(data.subjects || [])
    ];
    if (allCourses.length > 0) {
      summaryParts.push(`Courses/Subjects: ${allCourses.join(', ')}`);
    }

    // Skills
    const skillNames = (data.skill_goals || data.skills || []).map((s: any) => s.name || '').filter(Boolean);
    if (skillNames.length > 0) {
      summaryParts.push(`Skills: ${skillNames.join(', ')}`);
    }

    // Financial situation
    if (financialData.monthly_budget || financialData.monthlyBudget) {
      const budget = financialData.monthly_budget || financialData.monthlyBudget;
      summaryParts.push(`Monthly Budget: ${budget}`);
    }

    // Additional fields
    if (Object.keys(additionalFields).length > 0) {
      summaryParts.push(`Additional Info: ${JSON.stringify(additionalFields)}`);
    }

    const summaryText = summaryParts.join('\n');

    // Save to ChromaDB via AI service
    let chromaDocId = `onboarding-${userId}-${Date.now()}`;
    try {
      const ingestResult = await ingestDocs({
        user_id: userId,
        docs: [{
          id: chromaDocId,
          text: summaryText,
          meta: {
            type: 'onboarding',
            source: 'form',
            timestamp: new Date().toISOString()
          }
        }]
      });
      console.log('Onboarding data saved to ChromaDB:', ingestResult);
    } catch (error) {
      console.error('Error saving to ChromaDB:', error);
      // Continue even if ChromaDB save fails
    }

    // Save conversation to AIMemory for future reference
    await prisma.aIMemory.create({
      data: {
        userId,
        chromaId: chromaDocId,
        type: 'onboarding',
        metadata: {
          source: 'onboarding',
          topic: 'user_setup',
          data: data
        }
      }
    });

    console.log('Onboarding data saved successfully for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
}
