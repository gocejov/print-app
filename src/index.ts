import { initApp } from './app';
import { Application } from 'express';
import dotenv from 'dotenv';

const startServer = async () => {
  dotenv.config();
  const port = process.env.PORT || 3000
  const app: Application = await initApp()
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer()
