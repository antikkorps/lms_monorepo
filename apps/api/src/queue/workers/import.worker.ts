import crypto from 'node:crypto';
import { Worker, type Job } from 'bullmq';
import { queueConnection } from '../connection.js';
import { IMPORT_QUEUE_NAME, type ImportJobData, type ImportRowData } from '../import.queue.js';
import { User } from '../../database/models/User.js';
import { UserImport, type ImportError } from '../../database/models/UserImport.js';
import { Invitation } from '../../database/models/Invitation.js';
import { Tenant } from '../../database/models/Tenant.js';
import { UserRole, UserStatus, ImportStatus, InvitationStatus, SupportedLocale } from '../../database/models/enums.js';
import { hashPassword } from '../../auth/password.js';
import { emailService } from '../../services/email/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const INVITATION_EXPIRY_DAYS = 7;

const VALID_ROLES = new Set([
  UserRole.LEARNER,
  UserRole.INSTRUCTOR,
  UserRole.MANAGER,
]);

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function processImportJob(job: Job<ImportJobData>): Promise<void> {
  const { importId, tenantId, importedById, rows } = job.data;

  logger.info({ jobId: job.id, importId, totalRows: rows.length }, 'Processing user import job');

  const importRecord = await UserImport.findByPk(importId);
  if (!importRecord) {
    logger.error({ importId }, 'Import record not found');
    return;
  }

  await importRecord.update({ status: ImportStatus.PROCESSING });

  // Fetch importer name for invitation emails
  const importer = await User.findByPk(importedById, { attributes: ['firstName', 'lastName'] });
  const inviterName = importer ? `${importer.firstName} ${importer.lastName}` : 'Admin';

  const errors: ImportError[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row

    try {
      await processRow(row, rowNum, tenantId, importedById, inviterName, errors);
      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ row: rowNum, email: row.email, message });
    }

    // Update progress every 10 rows
    if ((i + 1) % 10 === 0 || i === rows.length - 1) {
      await importRecord.update({
        successCount,
        errorCount: errors.length,
        errors,
      });
    }
  }

  await importRecord.update({
    status: ImportStatus.COMPLETED,
    successCount,
    errorCount: errors.length,
    errors,
  });

  logger.info(
    { importId, successCount, errorCount: errors.length },
    'User import job completed'
  );
}

async function processRow(
  row: ImportRowData,
  rowNum: number,
  tenantId: string | null,
  importedById: string,
  inviterName: string,
  errors: ImportError[]
): Promise<void> {
  const { email, firstName, lastName } = row;
  const role = (row.role as UserRole) || UserRole.LEARNER;

  // Validate email
  if (!email || !isValidEmail(email)) {
    throw new Error('Invalid email address');
  }

  // Validate name
  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }

  // Validate role
  if (row.role && !VALID_ROLES.has(role)) {
    throw new Error(`Invalid role: ${row.role}. Allowed: learner, instructor, manager`);
  }

  // Check for duplicate user
  const existingUser = await User.findOne({
    where: { email: email.toLowerCase().trim() },
    paranoid: false,
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Check for existing pending invitation
  const existingInvitation = await Invitation.findOne({
    where: {
      email: email.toLowerCase().trim(),
      status: InvitationStatus.PENDING,
      ...(tenantId ? { tenantId } : {}),
    },
  });

  if (existingInvitation) {
    throw new Error('A pending invitation already exists for this email');
  }

  // Create invitation with token (user sets their own password via setup link)
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  if (tenantId) {
    // B2B flow: create invitation for tenant
    await Invitation.create({
      tenantId,
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      token,
      status: InvitationStatus.PENDING,
      invitedById: importedById,
      expiresAt,
    });

    // Send invitation email
    try {
      const tenant = await Tenant.findByPk(tenantId, { attributes: ['name'] });
      const setupUrl = `${config.frontendUrl}/invitations/accept?token=${token}`;

      await emailService.sendInvitationEmail({
        to: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        tenantName: tenant?.name || 'your organization',
        inviterName,
        inviteUrl: setupUrl,
        role,
        locale: SupportedLocale.EN,
      });
    } catch (emailError) {
      logger.warn(
        { email, err: emailError },
        'Failed to send import invitation email — invitation created'
      );
    }
  } else {
    // B2C / Super Admin flow: create user directly with temp password
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      status: UserStatus.PENDING,
    });

    // TODO: Send account setup email when template is ready
  }
}

let worker: Worker | null = null;

export function startImportWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker<ImportJobData>(IMPORT_QUEUE_NAME, processImportJob, {
    connection: queueConnection,
    concurrency: 2,
  });

  worker.on('completed', (job: Job<ImportJobData>) => {
    logger.debug({ jobId: job.id }, 'Import job completed');
  });

  worker.on('failed', (job: Job<ImportJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Import job failed'
    );
  });

  logger.info('Import worker started');

  return worker;
}

export async function stopImportWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('Import worker stopped');
  }
}
