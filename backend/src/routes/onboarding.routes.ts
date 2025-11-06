import { Router } from 'express';
import { startOnboarding, submitAnswer, getOnboardingStatus } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Start onboarding conversation
router.post('/start', authenticate, startOnboarding);

// Submit answer to continue onboarding
router.post('/answer', authenticate, submitAnswer);

// Get current onboarding status
router.get('/status', authenticate, getOnboardingStatus);

export default router;
