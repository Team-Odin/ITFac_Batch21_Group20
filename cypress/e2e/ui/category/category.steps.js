import { Given, Then } from "@badeball/cypress-cucumber-preprocessor";
import { loginAsAdmin } from "../../preconditions/login.preconditions";
import { categoryPage } from "../../../support/pages/categoryPage";

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
