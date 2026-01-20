import {
  Given,
  When,
  Then,
  Before,
  After,
} from "@badeball/cypress-cucumber-preprocessor";
import { loginAsAdmin } from "../../preconditions/login.preconditions";
import { categoryPage } from "../../../support/pages/categoryPage";
import { addCategoryPage } from "../../../support/pages/addCategoryPage";

let createdMainCategoryName;

const apiLoginAsAdmin = () => {
  const username = Cypress.env("ADMIN_USER");
  const password = Cypress.env("ADMIN_PASS");

  if (!username || !password) {
    throw new Error(
      "Missing admin credentials. Set ADMIN_USER and ADMIN_PASS in your .env (or as CYPRESS_ADMIN_USER/CYPRESS_ADMIN_PASS).",
    );
  }

  return cy
    .request({
      method: "POST",
      url: "/api/auth/login",
      body: { username, password },
      failOnStatusCode: true,
    })
    .its("body")
    .then((body) => {
      const token = body?.token;
      const tokenType = body?.tokenType || "Bearer";
      if (!token) throw new Error("Login response missing token");
      return `${tokenType} ${token}`;
    });
};

Before((info) => {
  cy.log(`Running Scenario: ${info.pickle.name}`);
  console.log(`Running Scenario: ${info.pickle.name}`);
});

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanup =
    scenarioName.includes("UI/TC03") && Boolean(createdMainCategoryName);

  if (!shouldCleanup) return;

  const nameToDelete = createdMainCategoryName;
  createdMainCategoryName = undefined;

  apiLoginAsAdmin().then((authHeader) => {
    cy.request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    }).then((res) => {
      const content = res?.body?.content;
      const match = Array.isArray(content)
        ? content.find(
            (c) =>
              String(c?.name).toLowerCase() ===
              String(nameToDelete).toLowerCase(),
          )
        : undefined;

      if (!match?.id) {
        cy.log(
          `Cleanup: category '${nameToDelete}' not found; skipping delete`,
        );
        return;
      }

      cy.request({
        method: "DELETE",
        url: `/api/categories/${match.id}`,
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      }).then((delRes) => {
        if (![200, 202, 204].includes(delRes.status)) {
          cy.log(
            `Cleanup: delete returned ${delRes.status} for '${nameToDelete}' (id=${match.id})`,
          );
        }
      });
    });
  });
});

// =============================================================
// UI/TC01 Verify Add Category button visibility
// =============================================================

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am on the {string} page", (url) => {
  const page = String(JSON.stringify(url)).trim().toLowerCase();

  if (
    page === "categories" ||
    page === "category" ||
    page.includes("categories")
  ) {
    categoryPage.visitCategoryPage();
    return;
  }

  if (
    page === "add category" ||
    page.includes("add category") ||
    page.includes("add")
  ) {
    addCategoryPage.visitAddCategoryPage();
    return;
  }

  if (page.startsWith("/")) {
    cy.visit(page);
    return;
  }

  throw new Error(`Unknown page name/path: ${JSON.stringify(url)}`);
});

// =============================================================
// UI/TC02 Verify "Add Category" Page Navigation
// =============================================================

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

// =============================================================
// UI/TC03 Verify Creating a Main Category
// =============================================================

When("Enter {string} in {string}", (categoryValue, _categoryField) => {
  createdMainCategoryName = categoryValue;
  addCategoryPage.categoryNameField
    .should("be.visible")
    .clear()
    .type(categoryValue);
});

When("Leave {string} empty", (_parentCategory) => {});

When("Click {string}", (_saveBtnText) => {
  addCategoryPage.submitBtn.should("be.visible").click();
});

Then(
  "System redirects to the list {string} appears in the category table",
  (enteredCategoryValue) => {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/categories");

    cy.get("body").then(($body) => {
      if ($body.find("table").length > 0) {
        cy.get("table").within(() => {
          cy.contains("td", enteredCategoryValue, { timeout: 10000 }).should(
            "be.visible",
          );
        });
        return;
      }

      cy.contains(enteredCategoryValue, { timeout: 10000 }).should(
        "be.visible",
      );
    });
  },
);

Then("Show {string} message", (successMessage) => {
  cy.contains(successMessage, { timeout: 10000 }).should("be.visible");
});
