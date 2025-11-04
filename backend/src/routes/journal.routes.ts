import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all journal entries
router.get('/', async (req: AuthRequest, res) => {
  try {
    const journals = await prisma.journal.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(journals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching journal entries' });
  }
});

// Get single journal entry
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const journal = await prisma.journal.findFirst({
      where: { id, userId: req.userId }
    });
    if (!journal) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching journal entry' });
  }
});

// Create journal entry
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, content, mood, tags, date } = req.body;
    const journal = await prisma.journal.create({
      data: {
        userId: req.userId!,
        title,
        content,
        mood,
        tags: tags || [],
        date: date ? new Date(date) : new Date()
      }
    });
    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Error creating journal entry' });
  }
});

// Update journal entry
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const journal = await prisma.journal.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(journal);
  } catch (error) {
    res.status(500).json({ error: 'Error updating journal entry' });
  }
});

// Delete journal entry
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.journal.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Journal entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting journal entry' });
  }
});

export default router;
