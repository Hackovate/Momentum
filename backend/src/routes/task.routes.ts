import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all tasks
router.get('/', async (req: AuthRequest, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Create task
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

export default router;
