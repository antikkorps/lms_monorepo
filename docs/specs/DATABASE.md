# Database Specification

## Modified: 2026-01-14

## 1. Technology Stack

- **Primary Database**: PostgreSQL 16+
- **Extension**: pgvector (for future AI/embedding features)
- **ORM**: Sequelize with strict TypeScript typing
- **Migrations**: Sequelize CLI

## 2. Connection Configuration

### Development
```
DATABASE_URL=postgres://lms:lms@localhost:5432/lms
```

### Production
- Hosted on Hetzner Cloud (managed PostgreSQL or self-managed)
- Block storage for data volumes
- Automated backups to Cloudflare R2 (7-day retention)

## 3. Schema Overview

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'learner',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
```

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'trial',
  isolation_strategy VARCHAR(20) NOT NULL DEFAULT 'SHARED',
  connection_string TEXT,
  seats_purchased INTEGER NOT NULL DEFAULT 1,
  seats_used INTEGER NOT NULL DEFAULT 0,
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  logo_url TEXT,
  domain VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);
```

### Groups Table
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_groups_tenant_id ON groups(tenant_id);
```

### User Groups (Many-to-Many)
```sql
CREATE TABLE user_groups (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);
```

### Courses Table
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  instructor_id UUID NOT NULL REFERENCES users(id),
  duration INTEGER NOT NULL DEFAULT 0, -- Total seconds
  chapters_count INTEGER NOT NULL DEFAULT 0,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
```

### Chapters Table
```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapters_course_id ON chapters(course_id);
```

### Lessons Table
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'video',
  video_url TEXT,
  video_id VARCHAR(255), -- External video service ID
  duration INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  requires_previous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_chapter_id ON lessons(chapter_id);
```

### Quiz Questions Table
```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'single_choice',
  options JSONB NOT NULL DEFAULT '[]',
  points INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_lesson_id ON quiz_questions(lesson_id);
```

### Purchases Table
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  tenant_id UUID REFERENCES tenants(id), -- NULL for B2C
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_course_id ON purchases(course_id);
CREATE INDEX idx_purchases_tenant_id ON purchases(tenant_id);
CREATE UNIQUE INDEX idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);
```

### User Progress Table
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  progress_seconds INTEGER NOT NULL DEFAULT 0, -- For video progress
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
```

### Quiz Results Table
```sql
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_user_lesson ON quiz_results(user_id, lesson_id);
```

### Badges Table
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL, -- Stored on Cloudflare R2
  criteria JSONB NOT NULL, -- Conditions for earning
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### User Badges Table
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id), -- Optional, if badge is course-specific
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id, course_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
```

## 4. Backup Strategy

### Automated Backups
- Daily full backup to Cloudflare R2
- 7-day retention policy
- Backup logs integrated into Pino logging system

### Backup Script (Cron)
```bash
#!/bin/bash
# Run daily at 2:00 AM
0 2 * * * /opt/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

## 5. Indexes Strategy

### Primary Keys
- All tables use UUID primary keys
- Generated server-side with `gen_random_uuid()`

### Query Optimization
- Indexes on foreign keys
- Indexes on frequently filtered columns (status, slug)
- Composite indexes for common queries

## 6. Soft Deletes

Enabled for:
- Users
- Tenants
- Groups
- Courses

All soft-delete enabled tables have `deleted_at` column and use Sequelize `paranoid: true`.
