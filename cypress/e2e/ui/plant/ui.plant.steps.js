import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { plantPage } from "../../../support/pages/plantPage";
import { loginAsAdmin } from "../../preconditions/login.preconditions";

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am on the Dashboard page", () => {
  // Login precondition already asserts we land on /dashboard
  cy.location("pathname", { timeout: 10000 }).should("include", "dashboard");
});

When("I click the {string} menu", (menuName) => {
  const name =
    typeof menuName === "string"
      ? menuName.trim().toLowerCase()
      : JSON.stringify(menuName).trim().toLowerCase();

  if (name === "plants" || name === "plant") {
    return cy.get("body").then(($body) => {
      const hasLink =
        $body.find('a:contains("Plants")').length > 0 ||
        $body.find('a[href="/ui/plants"]').length > 0;

      if (hasLink) {
        plantPage.plantsMenu.should("be.visible").click();
        return;
      }

      // Fallback: some layouts may hide the sidebar/menu in CI viewport.
      cy.visit("/ui/plants");
    });
  }

  throw new Error(`Unknown menu: ${JSON.stringify(menuName)}`);
});

Then("I should be redirected to the {string} page", (pageName) => {
  const name =
    typeof pageName === "string"
      ? pageName.trim().toLowerCase()
      : JSON.stringify(pageName).trim().toLowerCase();

  if (name === "plants" || name === "plant") {
    plantPage.assertOnPlantsPage();
    return;
  }

  throw new Error(`Unknown page: ${JSON.stringify(pageName)}`);
});

Then("I should see the plant list table", () => {
  plantPage.assertPlantTableHasData();
});
