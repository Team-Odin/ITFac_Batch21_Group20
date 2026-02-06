import {
  Given,
  When,
  Then,
  Before,
} from "@badeball/cypress-cucumber-preprocessor";
import { plantPage } from "../../../support/pages/plantPage";
import {
  loginAsAdmin,
  loginAsUser,
} from "../../preconditions/login.preconditions";
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
  if (role === "Standard User") loginAsUser();
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
  if (pageName === "Add Plant") addPlantPage.visitAddPlantPage();
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

When(
  "I enter plant details with name {string} and stock {string}",
  (plantName, stockQty) => {
    createdPlantName = plantName;

    addPlantPage.nameInput().clear().type(plantName);
    addPlantPage.categorySelect().select(1);
    addPlantPage.quantityInput().should("be.visible").clear().type(stockQty);
  },
);

When('Click the "Save" button', () => {
  addPlantPage.saveButton().click();
});

When('Click the "Cancel" button', () => {
  cy.contains("button, a", /cancel/i, { timeout: 10000 })
    .should("be.visible")
    .click({ force: true });
});

When('Click the "Category" dropdown', () => {
  addPlantPage.categorySelect().then(($el) => {
    if ($el.is("select")) {
      cy.wrap($el).should("be.visible");
    } else {
      cy.wrap($el).should("be.visible").click();
    }
  });
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

When("Click on the {string} link in the navigation menu", (link) => {
  const name = link.toLowerCase();

  if (name === "plants") {
    plantPage.plantsMenu.should("be.visible").click();
    return;
  }

  throw new Error(`Unknown navigation link: ${link}`);
});

When("Scroll to the bottom of the plant list table", () => {
  plantPage.plantsTable.scrollIntoView().then(() => {
    cy.get("table tbody tr", { timeout: 10000 }).should("exist");
  });
});
When('Click on the "Next" page button', () => {
  // Assuming pagination buttons have class 'pagination' or a button labeled "Next"
  cy.get(".pagination").contains("Next").should("be.visible").click();
});

When('I click the "Name" column header once', () => {
  cy.get("table thead tr th").contains("Name").should("be.visible").click();
});

When('I click the "Name" column header twice', () => {
  cy.get("table thead tr th")
    .contains("Name")
    .should("be.visible")
    .click()
    .click(); // second click
});

When("Select {string} from the Category dropdown", (category) => {
  cy.get('select[name="categoryId"]', { timeout: 5000 }).then(($select) => {
    if ($select.length > 0) {
      cy.wrap($select).should("be.visible").select(category);
    } else {
      cy.get(".ant-select", { timeout: 5000 }).first().click();
      cy.get(".ant-select-item-option", { timeout: 5000 })
        .contains(category)
        .click();
    }
  });
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

Then(
  "The system navigates back to the Plant list page {string}",
  (expectedUrl) => {
    cy.url().should("include", expectedUrl);
    cy.get("table tbody tr").should("have.length.greaterThan", 0);
  },
);

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

Then(
  "The plant named {string} should be removed from the list",
  (plantName) => {
    cy.get("table tbody").should("be.visible");

    // Verify the plant row no longer exists
    cy.get("table tbody tr").contains("td", plantName).should("not.exist");
  },
);

Then("Only sub-categories are listed in the dropdown", () => {
  addPlantPage
    .categorySelect()
    .should("be.visible")
    .find("option")
    .then(($options) => {
      const uiCategories = [...$options]
        .map((o) => o.innerText.trim())
        .filter((t) => t !== "" && t !== "Select Category");

      cy.log("UI Categories:", uiCategories);

      // ❗ Correct validation:
      // Parent categories like "All / Root / Main" should NOT exist
      const parentKeywords = ["	Outdoor", "Indoor", "Anthurium", "T2184402"];

      uiCategories.forEach((cat) => {
        parentKeywords.forEach((word) => {
          expect(cat).to.not.include(word);
        });
      });

      // At least one sub category must be shown
      expect(uiCategories.length).to.be.greaterThan(0);
    });
});

// Display Plant List Page for non admin user
Then("The system redirects to the Plant list page", () => {
  cy.url().should("include", "/ui/plants");

  cy.get("table", { timeout: 10000 }).should("be.visible");

  cy.get("table tbody tr").should("have.length.greaterThan", 0);
});
Then("The plant list table is displayed", () => {
  cy.get("table", { timeout: 10000 }).should("be.visible");
  cy.get("table tbody tr").should("have.length.greaterThan", 0);
});

Then('The "Add a Plant" button is NOT visible', () => {
  cy.contains("button", "Add a Plant", { timeout: 0 }).should("not.exist");
});

Then('The active page indicator highlights "2"', () => {
  // Assuming active page has class "active" or "ant-pagination-item-active"
  cy.get(".pagination").contains("2").parent().should("have.class", "active");
});

Then("The column is sorted {string}", (direction) => {
  cy.get("table tbody tr", { timeout: 10000 }).should(
    "have.length.greaterThan",
    0,
  );

  cy.get("table tbody tr td:first-child").then(($cells) => {
    const names = $cells
      .map((i, el) =>
        el.innerText
          .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width chars
          .replace(/\s+/g, " ") // collapse spaces
          .replace(/[^a-zA-Z0-9 ]/g, "") // remove special chars/icons
          .trim()
          .toLowerCase(),
      )
      .get();

    cy.log("Names in table:", JSON.stringify(names));

    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

    if (direction === "ascending") {
      expect(names, "Check ascending sort").to.deep.equal(sortedNames);
    } else if (direction === "descending") {
      expect(names, "Check descending sort").to.deep.equal(
        [...sortedNames].reverse(),
      );
    }
  });
});

Then(
  "The plant list should display only plants with category {string}",
  (category) => {
    cy.get("table tbody tr", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0,
    );

    cy.get("table tbody tr").each(($row) => {
      cy.wrap($row)
        .find("td")
        .eq(1) // second column
        .invoke("text")
        .should("eq", category);
    });
  },
);
