import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { readNamespace, appendEntry, validateNamespaceName } from '../services/namespaceService';

const router = Router();
router.use(authenticate);

router.get('/:name', (req: Request, res: Response) => {
  const name = (req.params as { name: string }).name.replace(/ /g, '_');
  try {
    validateNamespaceName(name);
  } catch {
    res.status(400).json({ error: 'Invalid namespace name' });
    return;
  }

  const entries = readNamespace(name);
  res.json({ namespace: name, entries });
});

router.post('/:name', (req: Request, res: Response) => {
  const name = (req.params as { name: string }).name.replace(/ /g, '_');
  try {
    validateNamespaceName(name);
  } catch {
    res.status(400).json({ error: 'Invalid namespace name' });
    return;
  }

  const payload = req.body as Record<string, unknown>;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return;
  }

  const entry = appendEntry(name, payload);
  res.status(201).json(entry);
});

export default router;
