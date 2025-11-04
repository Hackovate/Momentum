import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Add user-specific routes here as needed

export default router;
