import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all finance records
router.get('/', async (req: AuthRequest, res) => {
  try {
    const finances = await prisma.finance.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching finance records' });
  }
});

// Create finance record
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const finance = await prisma.finance.create({
      data: {
        userId: req.userId!,
        category,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date()
      }
    });
    res.status(201).json(finance);
  } catch (error) {
    res.status(500).json({ error: 'Error creating finance record' });
  }
});

// Update finance record
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const finance = await prisma.finance.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(finance);
  } catch (error) {
    res.status(500).json({ error: 'Error updating finance record' });
  }
});

// Delete finance record
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.finance.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Finance record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting finance record' });
  }
});

export default router;
