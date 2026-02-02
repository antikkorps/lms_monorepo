/**
 * Tenant Invoices Controller
 * Manages invoice listing and PDF download for B2B tenants
 */

import type { Context } from 'koa';
import { Tenant } from '../database/models/index.js';
import { UserRole } from '../database/models/enums.js';
import { AppError } from '../utils/app-error.js';
import { invoiceProvider } from '../services/invoices/index.js';
import { logger } from '../utils/logger.js';
import type { InvoiceStatus } from '@shared/types';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

function getAuthenticatedTenantUser(ctx: Context): AuthenticatedUser {
  const user = ctx.state.user as AuthenticatedUser | undefined;
  if (!user) {
    throw AppError.unauthorized('Authentication required');
  }
  if (!user.tenantId) {
    throw AppError.forbidden('Tenant access required');
  }
  return user;
}

async function getTenantStripeCustomerId(tenantId: string): Promise<string> {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    throw AppError.notFound('Tenant not found');
  }
  if (!tenant.stripeCustomerId) {
    throw AppError.badRequest('No billing account configured for this organization');
  }
  return tenant.stripeCustomerId;
}

/**
 * List tenant invoices
 * GET /tenant/invoices
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function listInvoices(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantUser(ctx);
  const {
    limit = '20',
    status,
    startDate,
    endDate,
  } = ctx.query as {
    limit?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };

  const stripeCustomerId = await getTenantStripeCustomerId(user.tenantId);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const validStatuses: InvoiceStatus[] = ['draft', 'open', 'paid', 'uncollectible', 'void'];
  const parsedStatus = status && validStatuses.includes(status as InvoiceStatus)
    ? (status as InvoiceStatus)
    : undefined;

  const result = await invoiceProvider.listInvoices(stripeCustomerId, {
    limit: parsedLimit,
    status: parsedStatus,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  logger.debug(
    { tenantId: user.tenantId, invoiceCount: result.invoices.length },
    'Invoices listed'
  );

  ctx.body = {
    data: {
      invoices: result.invoices,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
      },
    },
  };
}

/**
 * Get invoice details
 * GET /tenant/invoices/:id
 */
export async function getInvoice(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantUser(ctx);
  const { id } = ctx.params;

  if (!id) {
    throw AppError.badRequest('Invoice ID is required');
  }

  const stripeCustomerId = await getTenantStripeCustomerId(user.tenantId);

  // Verify ownership before fetching full details
  const isOwner = await invoiceProvider.verifyInvoiceOwnership(id, stripeCustomerId);
  if (!isOwner) {
    throw AppError.forbidden('Invoice does not belong to your organization');
  }

  const invoice = await invoiceProvider.getInvoice(id);

  logger.debug(
    { tenantId: user.tenantId, invoiceId: id },
    'Invoice retrieved'
  );

  ctx.body = {
    data: invoice,
  };
}

/**
 * Get invoice PDF URL
 * GET /tenant/invoices/:id/pdf
 *
 * Returns a redirect to the PDF URL or the URL in response body
 */
export async function getInvoicePdf(ctx: Context): Promise<void> {
  const user = getAuthenticatedTenantUser(ctx);
  const { id } = ctx.params;
  const { redirect } = ctx.query as { redirect?: string };

  if (!id) {
    throw AppError.badRequest('Invoice ID is required');
  }

  const stripeCustomerId = await getTenantStripeCustomerId(user.tenantId);

  // Verify ownership
  const isOwner = await invoiceProvider.verifyInvoiceOwnership(id, stripeCustomerId);
  if (!isOwner) {
    throw AppError.forbidden('Invoice does not belong to your organization');
  }

  const pdfUrl = await invoiceProvider.getInvoicePdfUrl(id);

  if (!pdfUrl) {
    throw AppError.notFound('PDF not available for this invoice');
  }

  logger.debug(
    { tenantId: user.tenantId, invoiceId: id },
    'Invoice PDF requested'
  );

  // If redirect=true, redirect to the PDF URL
  if (redirect === 'true') {
    ctx.redirect(pdfUrl);
    return;
  }

  // Otherwise return the URL
  ctx.body = {
    data: {
      url: pdfUrl,
    },
  };
}
