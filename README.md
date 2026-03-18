# cloakery
privacy-first email relay service

## Setup

### GitHub secrets

The following GitHub secrets must be provisioned:
- `AWS_ROLE_ARN` (GitHub Actions will use this to exchange short-lived AWS credentials for automatic deploys)
- `SERVERLESS_ACCESS_KEY` (Serverless framework require authentication when running in GitHub Actions)