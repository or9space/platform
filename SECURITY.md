# Security

## Reporting a vulnerability

Please email security disclosures to **security@or9.space** rather than filing a public issue.

Provide:
- Description of the vulnerability.
- Steps to reproduce.
- Impact assessment.
- Any suggested mitigation.

We will respond within 72 hours and aim to ship a fix within 14 days for critical issues, 30 days for high-severity, and 90 days for moderate.

## Tenant isolation

This platform uses row-level multi-tenancy with `tenant_id` columns + Postgres RLS policies + an ESLint custom rule (`no-untenanted-query`) as defense in depth. Any vulnerability that allows one tenant to read or modify another tenant's data is treated as critical-severity regardless of practical exploit difficulty.
