import { Given } from "@badeball/cypress-cucumber-preprocessor";
import { loginPage } from "../../../support/pages/loginPage";

/**
 * Precondition: Login as Admin
 * This step should NOT be used as a test case, only as a precondition
 */
Given("I am logged in as admin", () => {
  loginPage.visit();
  loginPage.login("admin", "admin123");
  cy.url().should("include", "/dashboard"); // Verify successful login
});

/**
 * Precondition: Login as User
 * This step should NOT be used as a test case, only as a precondition
 */
Given("I am logged in as user", () => {
  loginPage.visit();
  loginPage.login("testuser", "test123");
  cy.url().should("include", "/dashboard"); // Verify successful login
});
