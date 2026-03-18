# cloakery
privacy-first email relay service

## Setup

### Domain

Assuming that your domain was not registered and configured through AWS, there are some manual steps:

1. Use AWS Certificate Manager to request and configure SSL certificates for `domain.tld` and `*.domain.tld`, follow the steps.
2. Copy the certificate ARNs.
3. Paste the ARNs into your GitHub repository variables (see below). I recommend `domain.tld` for prod and `*.domain.tld` for dev (e.g. `dev.domain.tld`).

See https://www.serverless.com/framework/docs/providers/aws/guide/domains#configuration-options-for-third-party-registrars.

### GitHub secrets

The following GitHub variables and secrets must be provisioned:

#### Variables
- `DOMAIN_DEV`
- `DOMAIN_PROD`
- `DOMAIN_DEV_CERTIFICATE_ARN`
- `DOMAIN_PROD_CERTIFICATE_ARN`

### Secrets

- `AWS_ROLE_ARN` (GitHub Actions will use this to exchange short-lived AWS credentials for automatic deploys)
- `SERVERLESS_ACCESS_KEY` (Serverless framework require authentication when running in GitHub Actions)