import { initApp } from './app';
import { Application } from 'express';
import dotenv from 'dotenv';

const startServer = async () => {
  dotenv.config();
  const port = parseInt(process.env.PORT || "3000", 10);
  const hostname = process.env.HOSTNAME || "127.0.0.1";
  const app: Application = await initApp()
  app.listen(port, hostname, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer()
