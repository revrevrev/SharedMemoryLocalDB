import { Router, Request, Response } from 'express';
import { config } from '../config';
import { issueToken } from '../services/tokenService';

const router = Router();

router.post('/token', (req: Request, res: Response) => {
  const { grant_type, client_id, client_secret } = req.body as Record<string, string>;

  if (grant_type !== 'client_credentials') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }

  if (client_id !== config.OAUTH_CLIENT_ID || client_secret !== config.OAUTH_CLIENT_SECRET) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  const token = issueToken(client_id);
  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: config.JWT_EXPIRES_IN,
  });
});

export default router;
