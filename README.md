# cloakery
privacy-first email relay service

## Setup

### Domain

Assuming that your domain was not registered and configured through AWS, there are some manual steps:

1. Use AWS Certificate Manager to request and configure SSL certificates for `domain.tld` and `*.domain.tld`, follow the steps.
This must be in `us-east-1` region to play nice with Cloudfront.
2. Copy the certificate ARNs.
3. Paste the ARNs into your GitHub repository variables (see below). I recommend `domain.tld` for prod and `*.domain.tld` for dev (e.g. `dev.domain.tld`).

See https://www.serverless.com/framework/docs/providers/aws/guide/domains#configuration-options-for-third-party-registrars.

### GitHub secrets

The following GitHub variables and secrets must be provisioned:

#### Variables
- `DOMAIN_DEV`
- `DOMAIN_PROD`
- `DOMAIN_DEV_CERTIFICATE_ARN` (must be `us-east-1`)
- `DOMAIN_PROD_CERTIFICATE_ARN` (must be `us-east-1`)

### Secrets

- `AWS_ROLE_ARN` (GitHub Actions will use this to exchange short-lived AWS credentials for automatic deploys)
- `SERVERLESS_ACCESS_KEY` (Serverless framework require authentication when running in GitHub Actions)
- `DB_PASSWORD_DEV` (Database password for the `dev` environment)
- `DB_PASSWORD_PROD` (Database password for the `prod` environment)
- `JWT_SECRET_DEV` (JWT Secret for the `dev` environment)
- `JWT_SECRET_PROD` (JWT Secret for the `prod` environment)

#### Generating a Database Password

The `DB_PASSWORD_*` secrets are passed directly to Amazon RDS to create the master user for the Aurora PostgreSQL instance. AWS RDS enforces specific constraints, and because the password is used in a connection string URI, it should avoid characters that require URL encoding (like `@`, `/`, `#`, `?`, etc.).

You can use the following bash command to generate a secure, 32-character RDS-compliant password containing only alphanumeric characters and safe symbols (`-` and `_`):

```bash
# Generates a 32-character random string using a-z, A-Z, 0-9, -, and _
LC_ALL=C tr -dc 'a-zA-Z0-9-_' < /dev/urandom | fold -w 32 | head -n 1
```

#### Generating a JWT Secret

For the `JWT_SECRET_*` variables, it is recommended to use a cryptographically secure random string with at least 256 bits of entropy. You can easily generate one using `openssl`:

```bash
# Generates a 256-bit secret encoded as a 64-character hex string
openssl rand -hex 32
```