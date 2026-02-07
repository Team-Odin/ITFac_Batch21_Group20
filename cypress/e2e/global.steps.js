import { Given, Before, After } from "@badeball/cypress-cucumber-preprocessor";

import { loginAsAdmin, loginAsUser } from "./preconditions/login.preconditions";

import { categoryPage } from "../support/pages/categoryPage";
import { addCategoryPage } from "../support/pages/addCategoryPage";
import { plantPage } from "../support/pages/plantPage";
import { addPlantPage } from "../support/pages/addPlantPage";

// -------------------------------------------------------------
// DB cleanup hooks for API scenarios
// -------------------------------------------------------------

const resetDbBestEffort = () => {
  // Uses SQL reset when allowed (local DB by default).
  // If DB reset is skipped (e.g., non-local DB without opt-in), scenarios still run.
  return cy.task("db:reset", null, { log: false });
};

const scenarioHasTag = (info, tagName) => {
  const tags = info?.pickle?.tags;
  if (!Array.isArray(tags)) return false;
  return tags.some((t) => t?.name === tagName);
};

Before((info) => {
  if (!scenarioHasTag(info, "@api")) return;
  return resetDbBestEffort();
});

After((info) => {
  if (!scenarioHasTag(info, "@api")) return;
  return resetDbBestEffort();
});

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am logged in as User", () => {
  loginAsUser();
});

Given("I am on the {string} page", (/** @type {string} */ pageName) => {
  const page = String(pageName).trim().toLowerCase();

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
    (page.includes("add") && page.includes("category"))
  ) {
    addCategoryPage.visitAddCategoryPage();
    return;
  }

  if (page === "plants" || page === "plant" || page.includes("plants")) {
    plantPage.visitPlantPage();
    plantPage.assertOnPlantsPage();
    return;
  }

  if (
    page === "add plant" ||
    page === "add a plant" ||
    page.includes("add plant")
  ) {
    addPlantPage.visitAddPlantPage();
    addPlantPage.assertOnAddPlantPage();
    return;
  }

  if (page.startsWith("/")) {
    cy.visit(page);
    return;
  }

  throw new Error(`Unknown page name/path: ${JSON.stringify(pageName)}`);
});
