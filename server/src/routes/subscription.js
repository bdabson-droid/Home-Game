import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../utils/auth.js';
import {
  publicSubscription,
  startSubscription,
  cancelSubscription,
} from '../services/subscription.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  res.json({ subscription: publicSubscription(req.user.id) });
});

router.post('/subscribe', authRequired, async (req, res) => {
  const schema = z.object({
    successUrl: z.string().optional(),
    cancelUrl: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body || {});
  const { successUrl, cancelUrl } = parsed.success ? parsed.data : {};
  try {
    const result = await startSubscription(req.user, successUrl, cancelUrl);
    res.json({
      ...result,
      subscription: publicSubscription(req.user.id),
    });
  } catch (err) {
    console.error('Subscription error:', err.message);
    res.status(502).json({ error: 'Unable to start subscription' });
  }
});

router.post('/cancel', authRequired, (req, res) => {
  cancelSubscription(req.user.id);
  res.json({ subscription: publicSubscription(req.user.id) });
});

export default router;
