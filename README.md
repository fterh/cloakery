# cloakery
privacy-first email relay service

## Architecture
- **Backend Compute**: AWS Lambda (Node.js 24)
- **Database**: Supabase Postgres (managed)
- **KV Store**: DynamoDB
- **Storage**: S3
- **Frontend**: React (TypeScript) + Vite
- **CDN**: CloudFront

## Setup

### Domain

Assuming that your domain was not registered and configured through AWS, there are some manual steps:

1. Use AWS Certificate Manager to request and configure SSL certificates for `domain.tld` and `*.domain.tld`.
   - **Note**: This must be in the `us-east-1` region to work with CloudFront.
2. Copy the certificate ARNs.
3. Paste the ARNs into your GitHub repository variables (see below). We recommend `domain.tld` for prod and `dev.domain.tld` for dev.

See [Serverless Domain Guide](https://www.serverless.com/framework/docs/providers/aws/guide/domains#configuration-options-for-third-party-registrars).

### GitHub Secrets & Variables

The following GitHub variables and secrets must be provisioned:

#### Variables
- `DOMAIN_DEV`
- `DOMAIN_PROD`
- `DOMAIN_DEV_CERTIFICATE_ARN` (must be `us-east-1`)
- `DOMAIN_PROD_CERTIFICATE_ARN` (must be `us-east-1`)

#### Secrets
- `AWS_ROLE_ARN`: IAM Role for GitHub Actions OIDC authentication.
- `SERVERLESS_ACCESS_KEY`: Required for Serverless Framework authentication in CI/CD.
- `DATABASE_URL_DEV`: Supabase connection string for the `dev` stage.
- `DATABASE_URL_PROD`: Supabase connection string for the `prod` stage.
- `JWT_SECRET_DEV`: JWT Secret for the `dev` environment.
- `JWT_SECRET_PROD`: JWT Secret for the `prod` environment.
- `SUPABASE_ACCESS_TOKEN`: Required for Supabase CLI migrations in CI/CD.
- `SUPABASE_PROJECT_ID_DEV`: Project ID for the dev Supabase project.
- `SUPABASE_PROJECT_ID_PROD`: Project ID for the prod Supabase project.
- `SUPABASE_DB_PASSWORD_DEV`: Database password for the dev Supabase project (required for CLI migrations).
- `SUPABASE_DB_PASSWORD_PROD`: Database password for the prod Supabase project (required for CLI migrations).

### Database (Supabase)

We use Supabase for Postgres.
To ensure optimal performance with AWS Lambda, use the **Transaction Pooler** connection string (typically port `6543`).

### Generating Secrets

#### JWT Secret
For the `JWT_SECRET_*` variables, use a cryptographically secure random string:
```bash
# Generates a 256-bit secret encoded as a 64-character hex string
openssl rand -hex 32
```

## Deployment

Deployment is handled automatically via GitHub Actions upon pushing to `main` (for prod) or creating a PR (for dev).

Migrations are managed via the Supabase CLI in the pipeline:
```bash
# Locally, you can push migrations using:
npx supabase link --project-ref <project-id> --password <db-password>
npx supabase db push
```
