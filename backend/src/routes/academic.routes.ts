import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import * as crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper function to calculate syllabus hash
function calculateSyllabusHash(syllabus: string): string {
  if (!syllabus || syllabus.trim().length === 0) {
    return '';
  }
  // Use a combination of length and content hash for better change detection
  const normalized = syllabus.trim();
  const hash = crypto.createHash('md5').update(normalized).digest('hex');
  // Include length in hash to catch additions/deletions
  return `${normalized.length}_${hash.substring(0, 16)}`;
}

// All routes require authentication
router.use(authenticate);

// Courses CRUD (replaces academics)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.userId },
      include: { assignments: true, exams: true, classSchedule: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching courses' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { courseName, courseCode, description, credits, semester, year, status, progress, attendance } = req.body;
    const course = await prisma.course.create({
      data: {
        userId: req.userId!,
        courseName,
        courseCode: courseCode || null,
        description: description !== undefined && description !== '' ? description : null,
        credits: credits ? parseInt(credits) : null,
        semester: semester || null,
        year: year ? parseInt(year) : null,
        status: status || 'ongoing',
        progress: progress ? parseInt(progress) : 0,
        attendance: attendance ? parseFloat(attendance) : 0,
      }
    });
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Error creating course' });
  }
});

// Syllabus endpoints (must come before /:id route to avoid route matching conflicts)
router.put('/:id/syllabus', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { syllabus } = req.body;
    
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Calculate new hash if syllabus is being updated
    const newHash = syllabus !== undefined && syllabus !== null 
      ? calculateSyllabusHash(syllabus) 
      : null;
    
    // Check if syllabus changed
    const syllabusChanged = existing.syllabusHash && 
      existing.syllabusHash !== newHash;

    // Update syllabus in database
    // If syllabus changed or was deleted, clear generation metadata to force regeneration
    const course = await prisma.course.update({
      where: { id },
      data: { 
        syllabus: syllabus !== undefined ? syllabus : null,
        // Clear generation metadata if syllabus changed or was deleted
        ...(syllabusChanged || (syllabus === null && existing.syllabusHash) ? {
          syllabusHash: null,
          lastGeneratedMonths: null,
          lastGeneratedAt: null
        } : {})
      }
    });

    // Sync to ChromaDB via AI service
    const { syncSyllabusToChromaDB, deleteSyllabusFromChromaDB } = await import('../services/ai.service');
    try {
      if (syllabus && syllabus.trim()) {
        await syncSyllabusToChromaDB(req.userId!, id, syllabus);
      } else {
        // Delete from ChromaDB if syllabus is empty
        await deleteSyllabusFromChromaDB(req.userId!, id);
      }
    } catch (aiError) {
      console.error('Error syncing syllabus to ChromaDB:', aiError);
      // Continue even if ChromaDB sync fails - syllabus is saved in DB
    }

    res.json(course);
  } catch (error) {
    console.error('Error updating syllabus:', error);
    res.status(500).json({ error: 'Error updating syllabus' });
  }
});

router.delete('/:id/syllabus', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete syllabus from database
    const course = await prisma.course.update({
      where: { id },
      data: { syllabus: null }
    });

    // Delete from ChromaDB
    const { deleteSyllabusFromChromaDB } = await import('../services/ai.service');
    try {
      await deleteSyllabusFromChromaDB(req.userId!, id);
    } catch (aiError) {
      console.error('Error deleting syllabus from ChromaDB:', aiError);
      // Continue even if ChromaDB deletion fails
    }

    res.json({ message: 'Syllabus deleted', course });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ error: 'Error deleting syllabus' });
  }
});

// Generate syllabus-based study plan
router.post('/:id/syllabus/generate', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { months } = req.body;
    
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!existing.syllabus || !existing.syllabus.trim()) {
      return res.status(400).json({ error: 'No syllabus found for this course' });
    }

    if (!months || months < 1 || months > 24) {
      return res.status(400).json({ error: 'Invalid months value. Must be between 1 and 24' });
    }

    // Calculate current syllabus hash
    const currentHash = calculateSyllabusHash(existing.syllabus);
    
    // Check if syllabus or months have changed
    const syllabusChanged = existing.syllabusHash !== currentHash;
    const monthsChanged = existing.lastGeneratedMonths !== months;
    
    // If nothing changed, return existing tasks
    if (!syllabusChanged && !monthsChanged && existing.lastGeneratedAt) {
      // Get existing syllabus-generated tasks
      const existingTasks = await prisma.assignment.findMany({
        where: {
          courseId: id,
          syllabusGenerated: true
        },
        orderBy: { dueDate: 'asc' }
      });
      
      return res.json({
        message: 'Tasks already exist for this syllabus and time period',
        existing: true,
        assignments: existingTasks,
        count: existingTasks.length
      });
    }

    // If changed, delete old syllabus-generated tasks
    if (syllabusChanged || monthsChanged) {
      const deleteResult = await prisma.assignment.deleteMany({
        where: {
          courseId: id,
          syllabusGenerated: true
        }
      });
      console.log(`Deleted ${deleteResult.count} old syllabus-generated tasks`);
    }

    // Call AI service to generate tasks
    const { generateSyllabusTasks } = await import('../services/ai.service');
    const tasks = await generateSyllabusTasks(req.userId!, id, existing.syllabus, months);

    // Create assignments from generated tasks
    const assignments = [];
    for (const task of tasks) {
      const assignment = await prisma.assignment.create({
        data: {
          courseId: id,
          title: task.title,
          description: task.description || null,
          startDate: task.startDate ? new Date(task.startDate) : null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          estimatedHours: task.estimatedHours || null,
          status: 'pending',
          aiGenerated: true,
          syllabusGenerated: true,
        }
      });
      assignments.push(assignment);
    }

    // Update course metadata
    await prisma.course.update({
      where: { id },
      data: {
        syllabusHash: currentHash,
        lastGeneratedMonths: months,
        lastGeneratedAt: new Date()
      }
    });

    res.json({ 
      message: `Generated ${assignments.length} tasks for ${months} month study plan`,
      assignments,
      existing: false
    });
  } catch (error) {
    console.error('Error generating syllabus tasks:', error);
    res.status(500).json({ error: 'Error generating study plan' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const { courseName, courseCode, description, credits, semester, year, status, progress, attendance, syllabus } = req.body;
    const course = await prisma.course.update({ 
      where: { id }, 
      data: {
        courseName,
        courseCode: courseCode || null,
        description: description !== undefined && description !== '' ? description : null,
        credits: credits ? parseInt(credits) : null,
        semester: semester || null,
        year: year ? parseInt(year) : null,
        status: status || 'ongoing',
        progress: progress ? parseInt(progress) : 0,
        attendance: attendance ? parseFloat(attendance) : 0,
        syllabus: syllabus !== undefined ? syllabus : null,
      }
    });
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Error updating course' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    await prisma.course.delete({ where: { id } });
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting course' });
  }
});

// Class schedule endpoints
router.get('/:courseId/schedule', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const schedule = await prisma.classSchedule.findMany({ where: { courseId } });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching schedule' });
  }
});

router.post('/:courseId/schedule', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { day, time, type, location } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.classSchedule.create({ data: { courseId, day, time, type, location } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating schedule item' });
  }
});

router.put('/schedule/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.classSchedule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Schedule item not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.classSchedule.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating schedule item' });
  }
});

router.delete('/schedule/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.classSchedule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Schedule item not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.classSchedule.delete({ where: { id } });
    res.json({ message: 'Schedule item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting schedule item' });
  }
});

// Assignments endpoints
router.get('/:courseId/assignments', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const items = await prisma.assignment.findMany({ where: { courseId }, orderBy: { dueDate: 'asc' } });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assignments' });
  }
});

router.post('/:courseId/assignments', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, dueDate, points } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.assignment.create({ data: { courseId, title, description, dueDate: dueDate ? new Date(dueDate) : undefined, points } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating assignment' });
  }
});

router.put('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.assignment.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating assignment' });
  }
});

router.delete('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.assignment.delete({ where: { id } });
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting assignment' });
  }
});

// Exams endpoints
router.get('/:courseId/exams', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const items = await prisma.exam.findMany({ where: { courseId }, orderBy: { date: 'asc' } });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching exams' });
  }
});

router.post('/:courseId/exams', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { title, date, type } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.exam.create({ data: { courseId, title, date: new Date(date), type } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating exam' });
  }
});

router.put('/exams/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Exam not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.exam.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating exam' });
  }
});

router.delete('/exams/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Exam not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.exam.delete({ where: { id } });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting exam' });
  }
});

// Verify syllabus in ChromaDB
router.get('/:id/syllabus/verify', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Call AI service to verify syllabus in ChromaDB
    const { verifySyllabusInChromaDB } = await import('../services/ai.service');
    const verification = await verifySyllabusInChromaDB(req.userId!, id);

    res.json(verification);
  } catch (error) {
    console.error('Error verifying syllabus:', error);
    res.status(500).json({ error: 'Error verifying syllabus in ChromaDB' });
  }
});

export default router;
