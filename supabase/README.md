# CourseForge — Supabase

## Layout

```
supabase/
├── config.toml          # CLI config (project link, ports, paths)
├── README.md            # this file
└── migrations/
    ├── 20260328000000_initial_schema.sql      (was: migration.sql,    v1 demo schema)
    ├── 20260415000000_multi_tenant_rls.sql    (was: migration_v2.sql, real org RLS + assessments + comments)
    └── 20260502000000_rate_limit.sql          (was: migration_v3_*.sql, ai_request_log + ai_rate_limit_check RPC)
```

## Apply to a project

```bash
# Install once
brew install supabase/tap/supabase

# Link this directory to the live project
supabase link --project-ref rbyvyecizlfbkukevsci

# Apply any pending migrations
supabase db push
```

## Add a new migration

```bash
supabase migration new <slug>
# Edit supabase/migrations/<timestamp>_<slug>.sql, then:
supabase db push
```

## Why timestamped files

Raw `migration.sql` + `migration_v2.sql` were impossible to track:
no record of which envs had been migrated, no canonical ordering,
no rollback story. The CLI layout fixes all three.
