import {
  Given,
  When,
  Before,
  After,
} from "@badeball/cypress-cucumber-preprocessor";

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

  if (page === "dashboard" || page.includes("dashboard")) {
    cy.visit("/ui/dashboard");
    cy.location("pathname", { timeout: 10000 }).should("include", "/dashboard");
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

Given("A plant named {string} exists in the list", (plantName) => {
  const name = String(plantName ?? "").trim();
  if (!name) throw new Error("Plant name is required");

  plantPage.visitPlantPage();
  return cy.get("table tbody").then(($tbody) => {
    if ($tbody.text().includes(name)) return;
    return addPlantPage.createPlantSimple(name, "100", "5");
  }).then(() => {
    plantPage.visitPlantPage();
    cy.get("table tbody tr")
      .contains("td", name, { timeout: 10000 })
      .should("be.visible");
  });
});

const normalizeButton = (value) =>
  String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();

const clickCategoryButton = (label) => {
  if (label === "save" || label === "cancel")
    return addCategoryPage.clickControl(label);

  return categoryPage.clickControl(label);
};

const clickPlantButton = (label) => {
  if (label === "save") return addPlantPage.clickSave();
  if (label === "cancel") return addPlantPage.clickCancel();
  if (label === "search")
    return plantPage.searchBtn.should("be.visible").click();
  if (label.includes("add") && label.includes("plant"))
    return plantPage.clickAddPlantButton();

  return cy
    .contains("button, a", new RegExp(`^${label}$`, "i"))
    .should("be.visible")
    .click();
};

const clickButtonByContext = (buttonText) => {
  const label = normalizeButton(buttonText);

  return cy.location("pathname").then((pathname) => {
    if (pathname.startsWith("/ui/categories"))
      return clickCategoryButton(label);
    if (pathname.startsWith("/ui/plants")) return clickPlantButton(label);

    return cy
      .contains("button, a", new RegExp(`^${label}$`, "i"))
      .should("be.visible")
      .click();
  });
};

When("Click the {string} button", (buttonText) => {
  return clickButtonByContext(buttonText);
});

When("Click {string} button", (buttonText) => {
  return clickButtonByContext(buttonText);
});
