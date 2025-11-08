import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Save user task pattern for adaptive learning
router.post('/patterns', async (req: AuthRequest, res) => {
  try {
    const { taskType, estimatedHours, actualHours, estimatedDays, actualDays, completionRate, progressRate } = req.body;
    
    if (!taskType || !estimatedHours || !actualHours || !estimatedDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const patternData: any = {
      userId: req.userId!,
      taskType,
      estimatedHours: parseFloat(estimatedHours),
      actualHours: parseFloat(actualHours),
      estimatedDays: parseInt(estimatedDays),
      completionRate: completionRate ? parseFloat(completionRate) : (parseFloat(actualHours) / parseFloat(estimatedHours)),
    };
    
    // Only include actualDays if it's provided (not null)
    if (actualDays !== null && actualDays !== undefined) {
      patternData.actualDays = parseInt(actualDays);
    }
    
    // Only include progressRate if it's provided
    if (progressRate !== null && progressRate !== undefined) {
      patternData.progressRate = parseFloat(progressRate);
    }
    
    const pattern = await prisma.userTaskPattern.create({
      data: patternData
    });

    res.status(201).json(pattern);
  } catch (error: any) {
    console.error('Error saving task pattern:', error);
    res.status(500).json({ error: error.message || 'Error saving task pattern' });
  }
});

// Get user's task patterns for predictions
router.get('/patterns', async (req: AuthRequest, res) => {
  try {
    const { taskType } = req.query;
    
    const where: any = { userId: req.userId };
    if (taskType) {
      where.taskType = taskType;
    }

    const patterns = await prisma.userTaskPattern.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50 // Get last 50 patterns for analysis
    });

    // Calculate average completion rate
    const avgCompletionRate = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.completionRate, 0) / patterns.length
      : 1.0; // Default to 1.0 if no patterns

    // Calculate average day accuracy
    const completedPatterns = patterns.filter(p => p.actualDays !== null);
    const avgDayAccuracy = completedPatterns.length > 0
      ? completedPatterns.reduce((sum, p) => sum + (p.actualDays! / p.estimatedDays), 0) / completedPatterns.length
      : 1.0;

    res.json({
      patterns,
      averages: {
        completionRate: avgCompletionRate,
        dayAccuracy: avgDayAccuracy,
        sampleSize: patterns.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching task patterns:', error);
    res.status(500).json({ error: error.message || 'Error fetching task patterns' });
  }
});

// Get predictions for a new task based on learned patterns
router.post('/predict', async (req: AuthRequest, res) => {
  try {
    const { taskType, estimatedHours, estimatedDays } = req.body;
    
    if (!taskType || !estimatedHours || !estimatedDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's patterns for this task type
    const patterns = await prisma.userTaskPattern.findMany({
      where: {
        userId: req.userId,
        taskType
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Use last 20 patterns
    });

    if (patterns.length === 0) {
      // No patterns yet, return original estimates
      return res.json({
        predictedHours: parseFloat(estimatedHours),
        predictedDays: parseInt(estimatedDays),
        confidence: 0,
        message: 'No learning data yet. Using original estimates.'
      });
    }

    // Calculate average completion rate
    const avgCompletionRate = patterns.reduce((sum, p) => sum + p.completionRate, 0) / patterns.length;
    
    // Calculate average day accuracy
    const completedPatterns = patterns.filter(p => p.actualDays !== null);
    const avgDayAccuracy = completedPatterns.length > 0
      ? completedPatterns.reduce((sum, p) => sum + (p.actualDays! / p.estimatedDays), 0) / completedPatterns.length
      : 1.0;

    // Predict based on learned patterns
    const predictedHours = parseFloat(estimatedHours) * avgCompletionRate;
    const predictedDays = Math.ceil(parseInt(estimatedDays) * avgDayAccuracy);

    res.json({
      predictedHours: Math.round(predictedHours * 10) / 10,
      predictedDays,
      confidence: Math.min(patterns.length / 10, 1.0), // Confidence based on sample size
      averages: {
        completionRate: avgCompletionRate,
        dayAccuracy: avgDayAccuracy
      },
      message: `Based on ${patterns.length} similar tasks, you typically complete in ${(avgCompletionRate * 100).toFixed(0)}% of estimated time.`
    });
  } catch (error: any) {
    console.error('Error predicting task timeline:', error);
    res.status(500).json({ error: error.message || 'Error predicting task timeline' });
  }
});

export default router;

