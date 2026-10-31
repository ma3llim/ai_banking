import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { HttpError } from '../errors';
import { currentUser, requireAuth } from '../middleware/auth';
import { ingestDocument, listDocuments } from '../services/document.service';

export const documentRouter = Router();
documentRouter.use(requireAuth);

const ALLOWED_EXTENSIONS = ['.txt', '.md'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

documentRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded (field name: "file")');

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new HttpError(400, `Only ${ALLOWED_EXTENSIONS.join(', ')} files are supported`);
  }

  const { visibility } = z.object({ visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE') }).parse(req.body);
  const doc = await ingestDocument({
    fileName: req.file.originalname,
    fileType: extension.slice(1),
    text: req.file.buffer.toString('utf8'),
    visibility,
    uploadedById: currentUser(req).id,
  });
  res.status(201).json(doc);
});

documentRouter.get('/', async (req, res) => {
  res.json(await listDocuments(currentUser(req)));
});
