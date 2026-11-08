import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5000;

const app = express();

app.use(cors());
app.use(express.json());

// REST API Routen
app.use('/api', apiRouter);

// Statische Bereitstellung des Frontends (PWA)
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'ProjektBox Server aktiv' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ ProjektBox Server läuft auf Port ${PORT}`);
});
