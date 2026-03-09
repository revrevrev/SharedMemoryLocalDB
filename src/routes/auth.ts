import { Router, Request, Response } from 'express';
import { config } from '../config';
import { issueToken } from '../services/tokenService';
import { generateCode, consumeCode } from '../services/authCodeService';

const router = Router();

// Authorization Code flow — auto-approves and redirects back with a code.
// No login page needed; this is a single-user personal tool.
router.get('/authorize', (req: Request, res: Response) => {
  const { client_id, redirect_uri, state } = req.query as Record<string, string>;

  if (client_id !== config.OAUTH_CLIENT_ID) {
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  if (!redirect_uri) {
    res.status(400).json({ error: 'missing redirect_uri' });
    return;
  }

  const code = generateCode(redirect_uri);
  const location = new URL(redirect_uri);
  location.searchParams.set('code', code);
  if (state) location.searchParams.set('state', state);

  res.redirect(location.toString());
});

router.post('/token', (req: Request, res: Response) => {
  const { grant_type, client_id, client_secret, code, redirect_uri } =
    req.body as Record<string, string>;

  if (grant_type === 'authorization_code') {
    if (client_id !== config.OAUTH_CLIENT_ID || client_secret !== config.OAUTH_CLIENT_SECRET) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }
    if (!code || !redirect_uri || !consumeCode(code, redirect_uri)) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }
    const token = issueToken(client_id);
    res.json({ access_token: token, token_type: 'Bearer', expires_in: config.JWT_EXPIRES_IN });
    return;
  }

  if (grant_type === 'client_credentials') {
    if (client_id !== config.OAUTH_CLIENT_ID || client_secret !== config.OAUTH_CLIENT_SECRET) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }
    const token = issueToken(client_id);
    res.json({ access_token: token, token_type: 'Bearer', expires_in: config.JWT_EXPIRES_IN });
    return;
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
});

export default router;
