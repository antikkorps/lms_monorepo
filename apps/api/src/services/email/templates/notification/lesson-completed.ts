import type { EmailTemplate } from '../../email.types.js';
import { SupportedLocale } from '../../../../database/models/enums.js';
import { getEmailTranslations, interpolate } from '../../../../i18n/index.js';

export interface LessonCompletedEmailData {
  to: string;
  firstName: string;
  lessonName: string;
  courseName: string;
  courseUrl: string;
  locale?: SupportedLocale;
}

export function lessonCompletedEmailTemplate(data: LessonCompletedEmailData): EmailTemplate {
  const { firstName, lessonName, courseName, courseUrl, locale = SupportedLocale.EN } = data;
  const t = getEmailTranslations(locale);

  const subject = interpolate(t.lessonCompleted.subject, { lessonName });
  const headline = interpolate(t.lessonCompleted.headline, { firstName });
  const inCourse = interpolate(t.lessonCompleted.inCourse, { courseName });

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
  <h1 style="color: #10b981; margin-bottom: 24px;">${headline}</h1>

  <p>${t.lessonCompleted.body}</p>

  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
    <h2 style="margin: 0 0 8px 0; color: #166534;">${lessonName}</h2>
    <p style="margin: 0; color: #15803d;">${inCourse}</p>
  </div>

  <p>${t.lessonCompleted.keepUp}</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${courseUrl}"
       style="background-color: #10b981; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      ${t.lessonCompleted.cta}
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

${t.lessonCompleted.body} ${lessonName}
${inCourse}

${t.lessonCompleted.keepUp}

${t.lessonCompleted.cta}: ${courseUrl}

---
${t.common.receivingBecause}
    `.trim(),
  };
}
