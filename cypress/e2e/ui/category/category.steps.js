import {
  Given,
  When,
  Then,
  Before,
} from "@badeball/cypress-cucumber-preprocessor";
import { loginAsAdmin } from "../../preconditions/login.preconditions";
import { categoryPage } from "../../../support/pages/categoryPage";

Before((info) => {
  cy.log(`Running Scenario: ${info.pickle.name}`);
  console.log(`Running Scenario: ${info.pickle.name}`);
});

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am on the {string} page", (url) => {
  categoryPage.visitCategoryPage();
});

Then("I should see the {string} button", (buttonText) => {
  const normalize = (s) => s.replaceAll(/\s+/g, " ").trim();

  categoryPage.addCategoryBtn
    .should("be.visible")
    .invoke("text")
    .then((t) => {
      expect(normalize(t)).to.eq(normalize(buttonText));
    });
});

When("Click the {string} button", (_buttonText) => {
  categoryPage.addCategoryBtn.should("be.visible").click();
});

Then("System redirect to {string}", (path) => {
  cy.location("pathname").should("eq", path);
});
