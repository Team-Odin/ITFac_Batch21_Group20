// Cypress e2e support file
// Use this space for global configuration, hooks, or custom commands.
import "@shelex/cypress-allure-plugin";

// Clear cookies and local storage before each test
beforeEach(() => {
  cy.clearCookies();
  cy.window().then((win) => {
    win.sessionStorage.clear();
    win.localStorage.clear();
  });
});
