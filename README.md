# qa-training-app-tests

Simple steps to set up and run the Cypress+Cucumber tests.

## Prerequisites

- Node.js 18+ installed
- Java 17+ installed and available on PATH (Cypress will auto-start the bundled app JAR if not already running)

## Setup

Before running tests, create your environment file from the example and update values as needed:

```powershell
Copy-Item .env.example .env
```

Then install dependencies:

```bash
npm install
```

## Run Tests

- Headless (CI-friendly):

```bash
npm test
```

- Interactive Test Runner:

```bash
npm run open
```

## Run a Single Test

- Run only the healthcheck feature:

```bash
npx cypress run --spec cypress/e2e/healthcheck.feature
```

## Environment Variables

The `.env.example` lists all supported variables. Typical values:

```env
API_BASE_URL=http://localhost:8080
DB_PASSWORD=changeme
```

## App URLs

- http://localhost:8080/ui/login
- http://localhost:8080/swagger-ui/index.html
