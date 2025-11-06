import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Start onboarding conversation
export const startOnboarding = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Get user's first name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true }
    });

    // Call AI service to start onboarding
    const response = await axios.post(`${AI_SERVICE_URL}/onboarding/start`, {
      user_id: userId,
      user_name: user?.firstName || 'there'
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error: any) {
    console.error('Start onboarding error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start onboarding'
    });
  }
};

// Submit answer to onboarding question
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

    // Call AI service to process answer
    const response = await axios.post(`${AI_SERVICE_URL}/onboarding/answer`, {
      user_id: userId,
      answer
    });

    const aiResponse = response.data;

    // If onboarding is complete, save data to database
    if (aiResponse.completed && aiResponse.structured_data) {
      await saveOnboardingData(userId, aiResponse.structured_data);
    }

    res.json({
      success: true,
      data: aiResponse
    });
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
    // Update user with education info
    await prisma.user.update({
      where: { id: userId },
      data: {
        educationLevel: data.education_level,
        institution: data.institution,
        class: data.class,
        group: data.group,
        year: data.year,
        major: data.major,
        board: data.board
      }
    });

    // Create courses
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        await prisma.course.create({
          data: {
            userId,
            name: course.name,
            code: course.code || `COURSE-${Date.now()}`,
            credits: course.credits || 3,
            instructor: course.instructor || 'TBD',
            schedule: course.schedule || 'TBD'
          }
        });
      }
    }

    // Create skills
    if (data.skill_goals && Array.isArray(data.skill_goals)) {
      for (const skill of data.skill_goals) {
        await prisma.skill.create({
          data: {
            userId,
            name: skill.name,
            category: skill.category || 'General',
            currentLevel: skill.current_level || 'Beginner',
            targetLevel: skill.target_level || 'Intermediate',
            priority: skill.priority || 'Medium'
          }
        });
      }
    }

    // Create finance record
    if (data.financial_situation) {
      await prisma.finance.create({
        data: {
          userId,
          monthlyBudget: data.financial_situation.monthly_budget || 0,
          monthlyIncome: data.financial_situation.monthly_income || 0
        }
      });
    }

    // Save conversation to AIMemory for future reference
    await prisma.aIMemory.create({
      data: {
        userId,
        chromaId: `onboarding-${userId}-${Date.now()}`,
        contextType: 'onboarding',
        metadata: JSON.stringify(data)
      }
    });

    console.log('Onboarding data saved successfully for user:', userId);
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
}
