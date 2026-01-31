import type { EmailTemplate } from '../../email.types.js';
import { SupportedLocale } from '../../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../../i18n/index.js';

export interface CourseCompletedEmailData {
  to: string;
  firstName: string;
  courseName: string;
  certificateUrl?: string;
  dashboardUrl: string;
  locale?: SupportedLocale;
}

export function courseCompletedEmailTemplate(data: CourseCompletedEmailData): EmailTemplate {
  const { firstName, courseName, certificateUrl, dashboardUrl, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const subject = interpolate(t.courseCompleted.subject, { courseName });
  const headline = interpolate(t.courseCompleted.headline, { firstName });

  const certificateSection = certificateUrl
    ? `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${certificateUrl}"
       style="background-color: #7c3aed; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.courseCompleted.viewCertificate}
    </a>
  </div>
  `
    : '';

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <span style="font-size: 64px;">🎉</span>
  </div>

  <h1 style="color: #7c3aed; margin-bottom: 24px; text-align: center;">${headline}</h1>

  <p style="text-align: center; font-size: 18px;">${t.courseCompleted.completed}</p>

  <div style="background-color: #f5f3ff; border: 2px solid #7c3aed; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
    <h2 style="margin: 0; color: #5b21b6;">${courseName}</h2>
  </div>

  <p>${t.courseCompleted.achievement}</p>

  ${certificateSection}

  <div style="text-align: center; margin: 32px 0;">
    <a href="${dashboardUrl}"
       style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.courseCompleted.cta}
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="color: #999; font-size: 12px;">
    ${t.common.receivingBecause}
    <a href="%SETTINGS_URL%" style="color: #999;">${t.common.managePreferences}</a>
  </p>
</body>
</html>
    `.trim(),
    text: `
${headline}

${t.courseCompleted.completed}: ${courseName}

${t.courseCompleted.achievement}

${certificateUrl ? `${t.courseCompleted.viewCertificate}: ${certificateUrl}` : ''}

${t.courseCompleted.cta}: ${dashboardUrl}

---
${t.common.receivingBecause}
    `.trim(),
  };
}
