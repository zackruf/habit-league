# Security Policy

## Status

Rivl is an actively developed proprietary project. Security issues should be reported privately to the project owner and should not be disclosed publicly before a fix is available.

## Reporting

If you discover a vulnerability, report it privately to the repository owner with:

- a clear description
- affected area
- reproduction details
- impact summary
- suggested mitigation if available

Do not open public issues for undisclosed vulnerabilities.

## Secrets and Credentials

- Do not commit `.env`
- Do not commit secrets, keys, tokens, or keystores
- Keep `.env.example` free of secrets

## Firebase / API Key Handling

- Firebase public app configuration may exist in environment variables, but secret-bearing configuration must still be handled carefully
- Review Firestore rules and Auth setup before production release
- Limit access to production Firebase projects

## Coordinated Disclosure

- Give the owner reasonable time to investigate and fix the issue
- Avoid public disclosure before remediation is complete
- Share fixes only with authorized collaborators until the owner approves wider communication
