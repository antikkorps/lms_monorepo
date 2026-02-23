import { Queue } from 'bullmq';
import { queueConnection } from './connection.js';

export const IMPORT_QUEUE_NAME = 'user-imports';

export interface ImportRowData {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface ImportJobData {
  importId: string;
  tenantId: string | null;
  importedById: string;
  rows: ImportRowData[];
}

export const importQueue = new Queue<ImportJobData>(IMPORT_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 1,
  },
});

export async function addImportJob(data: ImportJobData): Promise<void> {
  await importQueue.add('process-csv-import', data);
}
