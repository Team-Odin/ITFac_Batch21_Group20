# qa-training-app-tests

A test automation framework built with Cypress and Cucumber for UI and API testing. This project includes the Spring Boot application JAR and automated tests.

## Prerequisites

- **Node.js 18+** installed
- **Java 17+** installed and available on PATH
- **MySQL Server** running on localhost:3306 with database `qa_training`

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/Team-Odin/qa-training-app-tests.git
cd qa-training-app-tests
```

### 2. Configure environment variables

Create your `.env` file from the example:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```

Edit `.env` and update the values:

```env
API_BASE_URL=http://localhost:8080
DB_PASSWORD=YourActualDatabasePassword
```

### 3. Install dependencies

```bash
npm install
```

### 4. Database setup

Ensure MySQL is running and create the database if it doesn't exist:

```sql
CREATE DATABASE IF NOT EXISTS qa_training;
```

The application will auto-create tables on first run using JPA.

## Running the Application

Start the Spring Boot application (without tests):

```bash
npm start
```

This will:

- Load database credentials from `.env`
- Start the application on port 8080
- Initialize the database schema

**Access the application:**

- **UI Login**: http://localhost:8080/ui/login
- **Swagger API**: http://localhost:8080/swagger-ui/index.html
- **Health Check**: http://localhost:8080/actuator/health

To stop the application, press `Ctrl+C` in the terminal.

## Running Tests

Make sure the application is running before executing tests.

### Run all tests (headless):

```bash
npm test
```

### Open interactive test runner:

```bash
npm run open
```

### Run a specific test:

```bash
npx cypress run --spec cypress/e2e/healthcheck.feature
```

## Environment Variables

Th# Clean test artifacts:

```bash
npm run clean
```

## Project Structure

```
qa-training-app-tests/
├── bin/
│   └── qa-training-app.jar          # Spring Boot application
├── config/
│   └── application.properties       # Application configuration
├── cypress/
│   ├── e2e/                         # Test features and step definitions
│   ├── screenshots/                 # Test failure screenshots
│   └── support/                     # Cypress support files
├── .env                             # Environment variables (create from .env.example)
├── .env.example                     # Environment variables template
├── cypress.config.js                # Cypress configuration
├── package.json                     # NPM dependencies and scripts
├── run-app.js                       # Application launcher script
└── README.md                        # This file
```

## Available Scripts

| Command         | Description                            |
| --------------- | -------------------------------------- |
| `npm start`     | Start the Spring Boot application      |
| `npm test`      | Run all Cypress tests in headless mode |
| `npm run open`  | Open Cypress interactive test runner   |
| `npm run clean` | Remove test screenshots and videos     |

## Troubleshooting

### Application won't start

- Verify Java is installed: `java --version`
- Check MySQL is running and accessible
- Verify database credentials in `.env`
- Ensure port 8080 is not already in use

### Tests failing

- Confirm the application is running on http://localhost:8080
- Check `.env` has correct `API_BASE_URL`
- Review test logs in the terminal
- Check screenshots in `cypress/screenshots/` for visual failures

### Database connection errors

- Verify MySQL service is running
- Check database `qa_training` exists
- Confirm credentials in `.env` match MySQL user
- Test connection: `mysql -u root -p -e "SHOW DATABASES;"`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests to ensure nothing breaks
4. Submit a pull request

## License

ISC
