import type { Context } from 'koa';
import { csvUploadSchema } from './import.schemas.js';
import { UserImport } from '../database/models/UserImport.js';
import { User } from '../database/models/User.js';
import { ImportStatus } from '../database/models/enums.js';
import { addImportJob } from '../queue/import.queue.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

/**
 * POST /admin/import/csv — Super admin: upload CSV rows for bulk user import
 * POST /tenant/import/csv — Tenant admin: same, scoped to tenant
 */
export async function uploadCsvImport(ctx: Context): Promise<void> {
  const userId = ctx.state.user!.userId;
  const tenantId = ctx.state.user!.tenantId || null;

  const body = ctx.request.body as Record<string, unknown>;

  const parsed = csvUploadSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validationError('Invalid CSV data', {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { rows } = parsed.data;
  const fileName = (body.fileName as string) || 'import.csv';

  // Create import record
  const importRecord = await UserImport.create({
    tenantId,
    importedById: userId,
    status: ImportStatus.PENDING,
    totalRows: rows.length,
    fileName,
  });

  // Enqueue the import job
  await addImportJob({
    importId: importRecord.id,
    tenantId,
    importedById: userId,
    rows,
  });

  logger.info(
    { importId: importRecord.id, totalRows: rows.length, userId },
    'CSV import job enqueued'
  );

  ctx.status = 201;
  ctx.body = {
    success: true,
    data: {
      importId: importRecord.id,
      status: importRecord.status,
      totalRows: rows.length,
    },
  };
}

/**
 * GET /admin/import/:importId — Get import status and results
 */
export async function getImportStatus(ctx: Context): Promise<void> {
  const { importId } = ctx.params;
  const tenantId = ctx.state.user!.tenantId || null;

  const where: Record<string, unknown> = { id: importId };
  // Tenant admins can only see their own tenant's imports
  if (tenantId) {
    where.tenantId = tenantId;
  }

  const importRecord = await UserImport.findOne({
    where,
    include: [
      {
        model: User,
        as: 'importedBy',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!importRecord) {
    throw AppError.notFound('Import not found');
  }

  ctx.body = {
    success: true,
    data: {
      id: importRecord.id,
      status: importRecord.status,
      totalRows: importRecord.totalRows,
      successCount: importRecord.successCount,
      errorCount: importRecord.errorCount,
      errors: importRecord.errors,
      fileName: importRecord.fileName,
      importedBy: importRecord.importedBy,
      createdAt: importRecord.createdAt,
      updatedAt: importRecord.updatedAt,
    },
  };
}

/**
 * GET /admin/import/csv/template — Download CSV template
 */
export async function getCsvTemplate(ctx: Context): Promise<void> {
  const csvContent = 'email,firstName,lastName,role\njohn@example.com,John,Doe,learner\njane@example.com,Jane,Smith,instructor\n';

  ctx.set('Content-Type', 'text/csv');
  ctx.set('Content-Disposition', 'attachment; filename="user-import-template.csv"');
  ctx.body = csvContent;
}
