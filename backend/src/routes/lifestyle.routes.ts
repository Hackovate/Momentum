import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all lifestyle records
router.get('/', async (req: AuthRequest, res) => {
  try {
    const lifestyle = await prisma.lifestyle.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(lifestyle);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching lifestyle records' });
  }
});

// Create lifestyle record
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { date, sleepHours, exerciseMinutes, waterIntake, mealQuality, stressLevel, notes } = req.body;
    const lifestyle = await prisma.lifestyle.create({
      data: {
        userId: req.userId!,
        date: date ? new Date(date) : new Date(),
        sleepHours: sleepHours ? parseFloat(sleepHours) : null,
        exerciseMinutes: exerciseMinutes ? parseInt(exerciseMinutes) : null,
        waterIntake: waterIntake ? parseFloat(waterIntake) : null,
        mealQuality,
        stressLevel: stressLevel ? parseInt(stressLevel) : null,
        notes
      }
    });
    res.status(201).json(lifestyle);
  } catch (error) {
    res.status(500).json({ error: 'Error creating lifestyle record' });
  }
});

// Update lifestyle record
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const lifestyle = await prisma.lifestyle.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(lifestyle);
  } catch (error) {
    res.status(500).json({ error: 'Error updating lifestyle record' });
  }
});

// Delete lifestyle record
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.lifestyle.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Lifestyle record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting lifestyle record' });
  }
});

export default router;
