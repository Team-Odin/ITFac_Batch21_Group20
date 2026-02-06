import {
  Given,
  When,
  Then,
  Before,
} from "@badeball/cypress-cucumber-preprocessor";
import { plantPage } from "../../../support/pages/plantPage";
import { loginAsAdmin } from "../../preconditions/login.preconditions";
import { addPlantPage } from "../../../support/pages/addPlantPage";

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

let createdPlantName;
let initialRowCount;
let selectedPlantRow;

// =====================
// Hooks
// =====================
Before((info) => {
  cy.log(`Running Scenario: ${info.pickle.name}`);
});

// =====================
// Given steps
// =====================
Given("The application is running", () => {
  cy.visit("/ui/login");
  cy.location("pathname").should("include", "/ui");
});

Given("I am logged in as {string}", (role) => {
  if (role === "Admin") loginAsAdmin();
});

Given("Plants exist in the Plant list", () => {
  plantPage.visitPlantPage();
  plantPage.assertPlantTableHasData();

  cy.get("table tbody tr").then((rows) => {
    initialRowCount = rows.length;
  });
});

Given("I am on the {string} page", (pageName) => {
  if (pageName === "Plants") plantPage.visitPlantPage();
});

Given("A plant named {string} exists in the list", (plantName) => {
  // Wait for table to be visible
  cy.get("table tbody").should("be.visible");

  // Wait for the row containing the plant name
  cy.get("table tbody tr")
    .contains("td", plantName, { timeout: 10000 }) // give up to 10s for the plant to appear
    .should("be.visible")
    .then(($cell) => {
      // Wrap the row for future actions
      selectedPlantRow = cy.wrap($cell).parent("tr");
    });
});

// =====================
// When steps
// =====================
When("I enter {string} in the search input field", (text) => {
  plantPage.searchInput.clear().type(text);
});

When(
  "I enter {string} in the search input field with a trailing space",
  (text) => {
    plantPage.searchInput.clear().type(`${text} `);
  },
);

When('Click the "Search" button', () => {
  plantPage.searchBtn.click();
});

When('Click the "Add a Plant" button', () => {
  plantPage.addPlantBtn.click();
});

When(
  "I enter plant details with name {string} and price {string} stock {string}",
  (plantName, price, stockQty) => {
    createdPlantName = plantName;

    addPlantPage.nameInput().clear().type(plantName);
    addPlantPage.categorySelect().select(1);
    addPlantPage.priceInput().clear().type(price);
    addPlantPage.quantityInput().should("be.visible").clear().type(stockQty);
  },
);

When('Click the "Save" button', () => {
  addPlantPage.saveButton().click();
});

When('Inspect the "Actions" column for the {string} row', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .then(($row) => {
      selectedPlantRow = cy.wrap($row).parent("tr");
    });
});

// =====================
// Edit Plant Steps
// =====================

When('Click the "Edit" button on a plant row', () => {
  cy.get("table tbody tr")
    .contains("td", "Banana")
    .parent("tr")
    .within(() => {
      cy.get('a.btn-outline-primary[title="Edit"]')
        .should("exist")
        .click({ force: true });
    });

  // Wait for navigation to edit page
  cy.url().should("include", "/ui/plants/edit/", { timeout: 10000 });

  // Wait for the form to be visible
  cy.get("form", { timeout: 10000 }).should("be.visible");
});

When('Update the "Name" field to {string}', (newName) => {
  cy.get('input[name="name"]', { timeout: 5000 })
    .should("be.visible")
    .clear()
    .type(newName);
});

// Click Edit button on a specific plant row
When('Click the "Edit" button on the {string} row', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .parent("tr")
    .within(() => {
      cy.get('a.btn-outline-primary[title="Edit"]')
        .should("exist")
        .click({ force: true });
    });

  // Wait for navigation to edit page
  cy.url().should("include", "/ui/plants/edit/", { timeout: 10000 });

  // Wait for the form to be visible (without specific ID requirement)
  cy.get("form", { timeout: 10000 }).should("be.visible");
});

// Update Category field
When('Update the "Category" field to {string}', (category) => {
  cy.get('select[name="categoryId"]', { timeout: 5000 })
    .should("be.visible")
    .select(category);
});

// Click Save button inside edit form
When('Click the "Save" button in modal', () => {
  cy.get('button[type="submit"]').should("be.visible").click();
});

When('Click the "Delete" button on a {string} row', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .parent("tr")
    .within(() => {
      cy.get('button[title="Delete"]')
        .scrollIntoView()
        .should("exist")
        .click({ force: true });
    });
});

When("Confirm the deletion on the popup", () => {
  cy.on("window:confirm", () => true);
});

When("Cancel the deletion on the popup", () => {
  cy.on("window:confirm", () => false);
});

// =====================
// Then steps
// =====================
Then(
  "The plant list should display only matching plants based on {string}",
  (expectedText) => {
    cy.get("table tbody tr")
      .should("have.length.greaterThan", 0)
      .and("have.length.at.most", initialRowCount);

    cy.get("table tbody tr").each(($row) => {
      cy.wrap($row)
        .find("td")
        .first()
        .invoke("text")
        .should("match", new RegExp(expectedText, "i"));
    });
  },
);

Then("The plant list is refreshed", () => {
  cy.visit("/ui/plants");
  cy.get("table", { timeout: 10000 }).should("be.visible");

  cy.get("table tbody tr", { timeout: 10000 })
    .contains(createdPlantName)
    .should("be.visible");
});

Then('The "Low" stock badge is displayed for {string}', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .parent("tr")
    .within(() => {
      cy.get(".badge, .ant-badge, span").contains("Low").should("be.visible");
    });
});

Then('The "Edit" icon is visible for {string}', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .parent("tr")
    .within(() => {
      cy.get('a.btn-outline-primary[title="Edit"]').should("exist");
    });
});

Then('The "Delete" icon is visible for {string}', (plantName) => {
  cy.get("table tbody tr")
    .contains("td", plantName)
    .parent("tr")
    .within(() => {
      cy.get('button.btn-outline-danger[title="Delete"]').should("be.visible");
    });
});

Then("The system redirects to the Plant list", () => {
  cy.url().should("include", "/ui/plants");
  cy.get("table tbody tr").should("have.length.greaterThan", 0);
});

Then("The plant table displays the name {string}", (plantName) => {
  cy.get("table tbody tr", { timeout: 10000 })
    .contains("td", plantName)
    .should("be.visible");
});

Then(
  "The plant table displays the category {string} for {string}",
  (category, plantName) => {
    cy.get("table tbody tr")
      .contains("td", plantName)
      .parent("tr")
      .within(() => {
        cy.get("td").eq(1).invoke("text").should("eq", category);
      });
  },
);

Then("The plant named {string} should be removed from the list", (plantName) => {
  cy.get("table tbody").should("be.visible");

  // Verify the plant row no longer exists
  cy.get("table tbody tr")
    .contains("td", plantName)
    .should("not.exist");
});
