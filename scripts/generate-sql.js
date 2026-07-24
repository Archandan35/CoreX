import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import SqlGenerator from '../src/services/setup/SqlGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '..', 'generated_sql.sql');

const sql = SqlGenerator.generateFull();
writeFileSync(outputPath, sql, 'utf-8');
console.log(`Generated: ${outputPath}`);
