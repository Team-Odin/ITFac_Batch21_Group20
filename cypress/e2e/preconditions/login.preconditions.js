import { loginPage } from "../../support/pages/loginPage";

/**
 * Precondition: Login as Admin
 * This step should NOT be used as a test case, only as a precondition
 */
export function loginAsAdmin() {
  const adminUser = Cypress.env("ADMIN_USER");
  const adminPass = Cypress.env("ADMIN_PASS");
  if (!adminUser || !adminPass) {
    throw new Error(
      "Missing admin credentials. Set ADMIN_USER and ADMIN_PASS in your .env (or as CYPRESS_ADMIN_USER/CYPRESS_ADMIN_PASS).",
    );
  }

  loginPage.visit();
  loginPage.login(adminUser, adminPass);
  cy.url().should("include", "/dashboard");
}

/**
 * Precondition: Login as User
 * This step should NOT be used as a test case, only as a precondition
 */
export function loginAsUser() {
  const userUser = Cypress.env("USER_USER");
  const userPass = Cypress.env("USER_PASS");
  if (!userUser || !userPass) {
    throw new Error(
      "Missing user credentials. Set USER_USER and USER_PASS in your .env (or as CYPRESS_USER_USER/CYPRESS_USER_PASS).",
    );
  }

  loginPage.visit();
  loginPage.login(userUser, userPass);
  cy.url().should("include", "/dashboard");
}

/**
 * Fetches JWT token for a regular user via API using Basic Auth
 */
export function apiLoginAsUser() {
  const userUser = Cypress.env("USER_USER") || "testuser";
  const userPass = Cypress.env("USER_PASS") || "test123";

  return cy.request({
    method: "POST",
    url: "/api/login",
    // This sends the Authorization: Basic header required by your server
    auth: {
      username: userUser,
      password: userPass
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status !== 200) {
      throw new Error(`Login failed for user ${userUser}. Status: ${response.status}`);
    }
    // Return the token (ensure the path matches your API's JSON response)
    return `Bearer ${response.body.token}`;
  });
}
