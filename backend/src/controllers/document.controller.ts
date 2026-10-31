import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { HttpError } from '../errors';
import { currentUser, requireAuth } from '../middleware/auth';
import { analyzeDocument, ingestDocument, listDocuments } from '../services/document.service';
import { extractText, SUPPORTED_EXTENSIONS } from '../services/text-extraction.service';
import { idSchema } from '../validation';

export const documentRouter = Router();
documentRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const uploadSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
  docType: z.enum(['AUTO', 'GENERAL', 'STATEMENT']).default('AUTO'),
});

documentRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded (field name: "file")');

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new HttpError(400, `Only ${SUPPORTED_EXTENSIONS.join(', ')} files are supported`);
  }

  const { visibility, docType } = uploadSchema.parse(req.body);
  const doc = await ingestDocument({
    fileName: req.file.originalname,
    fileType: extension.slice(1),
    text: await extractText(req.file.buffer, extension),
    visibility,
    docType,
    uploadedById: currentUser(req).id,
  });
  res.status(201).json(doc);
});

documentRouter.get('/', async (req, res) => {
  res.json(await listDocuments(currentUser(req)));
});

// Statement analysis (cached; ?refresh=true re-runs it)
documentRouter.post('/:id/analyze', async (req, res) => {
  const refresh = req.query.refresh === 'true';
  res.json(await analyzeDocument(currentUser(req), idSchema.parse(req.params.id), refresh));
});
