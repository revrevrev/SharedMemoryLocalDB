import './config'; // validates env vars at startup
import { config } from './config';
import app from './app';

app.listen(config.PORT, () => {
  console.log(`SharedMemoryLocalDB running on http://localhost:${config.PORT}`);
});
