import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all skills
router.get('/', async (req: AuthRequest, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching skills' });
  }
});

// Create skill
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, category, level, description } = req.body;
    const skill = await prisma.skill.create({
      data: {
        userId: req.userId!,
        name,
        category,
        level,
        description
      }
    });
    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Error creating skill' });
  }
});

// Update skill
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const skill = await prisma.skill.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Error updating skill' });
  }
});

// Delete skill
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.skill.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Skill deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting skill' });
  }
});

export default router;
