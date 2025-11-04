import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all academics for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const academics = await prisma.academic.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(academics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching academics' });
  }
});

// Create academic record
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { courseName, grade, credits, semester, year, status } = req.body;
    const academic = await prisma.academic.create({
      data: {
        userId: req.userId!,
        courseName,
        grade,
        credits,
        semester,
        year,
        status
      }
    });
    res.status(201).json(academic);
  } catch (error) {
    res.status(500).json({ error: 'Error creating academic record' });
  }
});

// Update academic record
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const academic = await prisma.academic.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(academic);
  } catch (error) {
    res.status(500).json({ error: 'Error updating academic record' });
  }
});

// Delete academic record
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.academic.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Academic record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting academic record' });
  }
});

export default router;
