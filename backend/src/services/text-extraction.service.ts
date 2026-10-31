import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';
import { HttpError } from '../errors';

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf'];

/** Returns the plain text of an uploaded file. PDFs must have selectable text (scanned images aren't OCR'd). */
export async function extractText(buffer: Buffer, extension: string): Promise<string> {
  if (extension !== '.pdf') return buffer.toString('utf8');

  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    ({ text } = await extractPdfText(pdf, { mergePages: true }));
  } catch {
    throw new HttpError(400, 'Could not read this PDF. Is the file valid?');
  }
  if (!text.trim()) throw new HttpError(400, 'This PDF has no selectable text (scanned PDFs are not supported)');
  return text;
}
