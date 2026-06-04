// Streaming SHA-256 of a file. Ported verbatim from trustabl-vscode (src/hash.ts).
import * as crypto from 'crypto';
import * as fs from 'fs';

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
