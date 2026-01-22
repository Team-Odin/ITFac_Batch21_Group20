import {
  Given,
  When,
  Then,
  Before,
  After,
} from "@badeball/cypress-cucumber-preprocessor";
import {
  loginAsAdmin,
  loginAsUser,
} from "../../preconditions/login.preconditions";
import { categoryPage } from "../../../support/pages/categoryPage";
import { addCategoryPage } from "../../../support/pages/addCategoryPage";

let createdMainCategoryName;
let createdSubCategoryName;
let createdParentCategoryName;
let page1RowsSnapshot;
let categoryRowCount;

const findCategoryByName = (categories, categoryName) => {
  const target = String(categoryName).toLowerCase();
  if (!Array.isArray(categories)) return undefined;
  return categories.find(
    (c) => String(c?.name).toLowerCase() === String(target),
  );
};

const ensureCategoryExists = (categoryName) => {
  const name = String(categoryName);

  return apiLoginAsAdmin().then((authHeader) => {
    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const match = findCategoryByName(res?.body?.content, name);
        if (match?.id) {
          cy.log(`Category '${name}' already exists (id=${match.id})`);
          return;
        }

        cy.log(`Category '${name}' not found; creating via API as Admin`);
        createdParentCategoryName = name;

        return cy
          .request({
            method: "POST",
            url: "/api/categories",
            headers: { Authorization: authHeader },
            body: { name, parentId: null },
            failOnStatusCode: false,
          })
          .then((createRes) => {
            if (![200, 201, 202, 204].includes(createRes.status)) {
              throw new Error(
                `Failed to create category '${name}' via API. Status: ${createRes.status}`,
              );
            }
          });
      });
  });
};

// Utility function to delete category by name
const deleteCategoryByName = (categoryName, authHeader) => {
  return cy
    .request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      const content = res?.body?.content;
      const match = Array.isArray(content)
        ? content.find(
            (c) =>
              String(c?.name).toLowerCase() ===
              String(categoryName).toLowerCase(),
          )
        : undefined;

      if (!match?.id) {
        cy.log(
          `Cleanup: category '${categoryName}' not found; skipping delete`,
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
            `Cleanup: delete returned ${delRes.status} for '${categoryName}' (id=${match.id})`,
          );
        } else {
          cy.log(`Successfully cleaned up category: ${categoryName}`);
        }
      });
    });
};

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

  // Cleanup for TC03 (main category)
  const shouldCleanupTC03 =
    scenarioName.includes("UI/TC03") && Boolean(createdMainCategoryName);

  // Cleanup for TC04 (subcategory and parent)
  const shouldCleanupTC04 =
    scenarioName.includes("UI/TC04") &&
    (Boolean(createdSubCategoryName) || Boolean(createdParentCategoryName));

  // Cleanup for TC12 (search precondition may create a category via API)
  const shouldCleanupTC12 =
    scenarioName.includes("UI/TC12") && Boolean(createdParentCategoryName);

  if (!shouldCleanupTC03 && !shouldCleanupTC04 && !shouldCleanupTC12) return;

  apiLoginAsAdmin().then((authHeader) => {
    if (shouldCleanupTC04) {
      // Delete subcategory first (child before parent)
      if (createdSubCategoryName) {
        deleteCategoryByName(createdSubCategoryName, authHeader).then(() => {
          createdSubCategoryName = undefined;

          // Delete parent category after subcategory is deleted
          if (createdParentCategoryName) {
            deleteCategoryByName(createdParentCategoryName, authHeader).then(
              () => {
                createdParentCategoryName = undefined;
              },
            );
          }
        });
      } else if (createdParentCategoryName) {
        // Only parent needs deletion
        deleteCategoryByName(createdParentCategoryName, authHeader).then(() => {
          createdParentCategoryName = undefined;
        });
      }
    }

    if (shouldCleanupTC03 && createdMainCategoryName) {
      deleteCategoryByName(createdMainCategoryName, authHeader).then(() => {
        createdMainCategoryName = undefined;
      });
    }

    if (shouldCleanupTC12 && createdParentCategoryName) {
      deleteCategoryByName(createdParentCategoryName, authHeader).then(() => {
        createdParentCategoryName = undefined;
      });
    }
  });
});

// =============================================================
// UI/TC01 Verify Add Category button visibility
// =============================================================

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am logged in as User", () => {
  loginAsUser();
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
  const scenarioName = Cypress.currentTest?.title || "";

  if (scenarioName.includes("UI/TC03")) {
    // This is for TC03 main category
    createdMainCategoryName = categoryValue;
  } else if (scenarioName.includes("UI/TC04")) {
    // This is for TC04 subcategory
    createdSubCategoryName = categoryValue;
  }

  addCategoryPage.addACategory(categoryValue);
});

When("Leave {string} empty", (_parentCategory) => {});

When("Click {string} button", (buttonText) => {
  if (buttonText.toLowerCase() === "save") {
    addCategoryPage.submitBtn.should("be.visible").click();
  } else {
    throw new Error(`Unknown button: ${buttonText}`);
  }
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

// =============================================================
// UI/TC04 Verify Creating a Sub-Category
// =============================================================

Given("{string} category exists", (categoryName) => {
  cy.location("pathname").then((startPath) => {
    return ensureCategoryExists(categoryName).then(() => {
      // Preserve calling test context:
      // - TC04 calls this from Add Category page and expects to return there.
      // - TC12 calls this from Categories page and should stay there.
      if (String(startPath).startsWith("/ui/categories/add")) {
        addCategoryPage.visitAddCategoryPage();
        return;
      }

      categoryPage.visitCategoryPage();
    });
  });
});

When("Select {string} from {string}", (optionValue, fieldName) => {
  if (fieldName.toLowerCase().includes("parent category")) {
    // Interact with the parent category dropdown/select field
    addCategoryPage.parentCategoryField
      .should("be.visible")
      .select(optionValue);
  } else {
    throw new Error(`Unknown field for selection: ${fieldName}`);
  }
});

Then(
  "{string} is saved and linked to {string}",
  (subCategoryName, parentCategoryName) => {
    categoryPage.verifyParentChildRelationship(
      subCategoryName,
      parentCategoryName,
    );
    cy.log(
      `Verified in UI: '${subCategoryName}' is linked to '${parentCategoryName}'`,
    );
  },
);

// =============================================================
// UI/TC05 Verify Pagination Functionality
// =============================================================

Given("with more than {string} categories exists", (minCount) => {
  categoryPage.ensureMinimumCategories(minCount);

  // Verify pagination is visible after ensuring minimum categories
  categoryPage.pagination.should("be.visible");
  cy.log("Pagination is available - sufficient categories exist");
});

When("Scroll bottom of the list", () => {
  categoryPage.scrollToBottom();
  cy.wait(500); // Allow time for any lazy loading or rendering
});

When("Click {string} pagination", (direction) => {
  categoryPage.clickPagination(direction);
});

Then("The list refreshes to show the next set of category records", () => {
  cy.wait(1000);
  categoryPage.pagination.should("be.visible");
  categoryPage.assertCategoryTableHasData();

  cy.log("Successfully navigated to next page of categories");
});

// =============================================================
// UI/TC06 Verify Default Pagination State
// =============================================================

When("Observe the pagination controls at the bottom of the table", () => {
  // Scroll to bottom to ensure pagination is visible
  categoryPage.scrollToBottom();

  // Verify pagination controls are visible
  categoryPage.pagination.should("be.visible");
  cy.log("Pagination controls are visible and ready for inspection");
});

When("Check the {string} button status", (buttonName) => {
  if (buttonName.toLowerCase() === "previous") {
    categoryPage.getPreviousButton().should("be.visible");
    cy.log("Previous button visibility confirmed");
  } else if (buttonName.toLowerCase() === "next") {
    categoryPage.getNextButton().should("be.visible");
    cy.log("Next button visibility confirmed");
  } else {
    throw new Error(`Unknown button: ${buttonName}`);
  }
});

When("Check which page number is highlighted", () => {
  categoryPage.getActivePageNumber().should("be.visible");
  cy.log("Active page number element is visible and highlighted");
});

Then("{string} is highlighted", (pageNumber) => {
  categoryPage.checkActivePageNumber(pageNumber);
  cy.log(`Verified that page ${pageNumber} is highlighted/active`);
});

Then("{string} button is disabled", (buttonName) => {
  if (buttonName.toLowerCase() === "previous") {
    categoryPage.checkPreviousButtonDisabled();
    cy.log("Verified that Previous button is disabled");
  } else {
    throw new Error(`Disable check not implemented for button: ${buttonName}`);
  }
});

Then("{string} button is enabled", (buttonName) => {
  if (buttonName.toLowerCase() === "next") {
    categoryPage.checkNextButtonEnabled();
    cy.log("Verified that Next button is enabled");
  } else {
    throw new Error(`Enable check not implemented for button: ${buttonName}`);
  }
});

// =============================================================
// UI/TC07 Verify "Next" Button Navigation
// =============================================================

Then("The table refreshes with new data", () => {
  categoryPage.assertCategoryTableHasData();

  cy.log("Verified category table refreshed with data");
});

Then("The active page indicator changes to {string}", (pageNumber) => {
  categoryPage.checkActivePageNumber(pageNumber);
  cy.log(`Verified active page indicator is ${pageNumber}`);
});

Then("The {string} button becomes enabled", (buttonName) => {
  if (buttonName.toLowerCase() === "previous") {
    categoryPage.checkPreviousButtonEnabled();
    cy.log("Verified that Previous button is enabled");
    return;
  }

  if (buttonName.toLowerCase() === "next") {
    categoryPage.checkNextButtonEnabled();
    cy.log("Verified that Next button is enabled");
    return;
  }

  throw new Error(`Enable check not implemented for button: ${buttonName}`);
});

// =============================================================
// UI/TC08 Verify "Previous" Button Navigation
// =============================================================

Given("I am on the {string} page {string}", (pageName, pageNumber) => {
  const page = String(pageName).trim().toLowerCase();
  const targetPageNumber = String(pageNumber).trim();

  if (
    page === "categories" ||
    page === "category" ||
    page.includes("categories")
  ) {
    categoryPage.openWithMinimumCategories("10");
    categoryPage.goToPage("1");

    categoryPage.captureTopRowsSnapshot(3).then((snapshot) => {
      page1RowsSnapshot = snapshot;
    });

    categoryPage.goToPage(targetPageNumber);

    return;
  }

  throw new Error(
    `Unknown page name/path for numbered navigation: ${pageName}`,
  );
});

Then("The table refreshes with original data", () => {
  expect(page1RowsSnapshot, "page 1 snapshot should be set").to.exist;

  categoryPage.assertCategoryTableHasData();
  categoryPage.captureTopRowsSnapshot(3).then((current) => {
    expect(current).to.deep.equal(page1RowsSnapshot);
  });

  cy.log("Verified table returned to original page-1 data");
});

// =============================================================
// UI/TC09 Verify Row Count Per Page
// =============================================================

When(
  "Count the number of category rows displayed in the table on {string}",
  (pageNumber) => {
    categoryPage.goToPage(pageNumber);
    categoryPage.assertCategoryTableHasData();
    categoryPage.getCategoryRowCount().then((count) => {
      categoryRowCount = count;
      cy.log(`Row count on page ${String(pageNumber)}: ${count}`);
    });
  },
);

Then(
  String.raw`The count matches the system default \(e.g., exactly {string} rows\)`,
  (expectedCount) => {
    expect(categoryRowCount, "row count should be captured").to.be.a("number");

    const expected = Number.parseInt(String(expectedCount).trim(), 10);
    expect(categoryRowCount).to.eq(expected);
  },
);

// =============================================================
// UI/TC10 Verify Last Page State
// =============================================================

Given("I am on the last page of {string}", (pageName) => {
  const page = String(pageName).trim().toLowerCase();
  const pageDisplay = JSON.stringify(pageName);

  if (
    page === "categories" ||
    page === "category" ||
    page.includes("categories")
  ) {
    categoryPage.openWithMinimumCategories("10");
    categoryPage.goToLastPage();
    return;
  }

  throw new Error(`Unknown page for last-page navigation: ${pageDisplay}`);
});

When("observe the {string} button", (buttonName) => {
  const name = String(buttonName).trim().toLowerCase();
  const buttonDisplay = JSON.stringify(buttonName);
  categoryPage.scrollToBottom();

  if (name === "next") {
    // Observation step; assertion happens in the Then.
    cy.log('Observing the "Next" button on last page');
    return;
  }

  throw new Error(`Unknown button to observe: ${buttonDisplay}`);
});

Then(
  String.raw`The {string} button is disabled \(greyed out\) or hidden`,
  (buttonName) => {
    const name = String(buttonName).trim().toLowerCase();
    const buttonDisplay = JSON.stringify(buttonName);

    if (name === "next") {
      categoryPage.assertNextDisabledOrHidden();
      return;
    }

    throw new Error(
      `Disabled-or-hidden check not implemented for button: ${buttonDisplay}`,
    );
  },
);

// =============================================================
// UI/TC11 Verify "Add Category" Button Hidden
// =============================================================

When("Scan top action area of the page", () => {
  // Ensure we're on the Categories page and at the top where action buttons usually live.
  categoryPage.assertOnCategoriesPage();
  cy.scrollTo("top", { ensureScrollable: false });
});

Then("The {string} button is NOT present", (buttonText) => {
  const normalized = String(buttonText).replaceAll(/\s+/g, " ").trim();

  // TC11 specifically targets "Add Category"; we keep a generic step text for reuse.
  if (normalized.toLowerCase() === "add category") {
    cy.get("body").then(($body) => {
      const selector = 'a[href="/ui/categories/add"]';
      const matches = $body.find(selector);

      if (matches.length === 0) {
        expect(matches.length, "Add Category control present in DOM").to.eq(0);
        return;
      }

      // If the element exists but access control hides it, assert it's not visible.
      cy.get(selector).should("not.be.visible");
    });

    return;
  }

  // Fallback: if a different button text is used, try a simple text lookup.
  cy.contains("a,button", normalized).should("not.exist");
});

// =============================================================
// UI/TC12 Verify Search by Name
// =============================================================

When("Enter {string} in search bar", (searchText) => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.searchNameInput.should("be.visible").clear().type(searchText);
});

When("Click {string}", (controlText) => {
  const t = String(controlText).replaceAll(/\s+/g, " ").trim().toLowerCase();

  if (t === "search") {
    categoryPage.searchBtn.should("be.visible").click();
    return;
  }

  if (t === "reset") {
    categoryPage.resetBtn.should("be.visible").click();
    return;
  }

  throw new Error(`Unknown control to click: ${JSON.stringify(controlText)}`);
});

Then("List update display only the {string} category", (expectedCategory) => {
  const expected = String(expectedCategory).trim();

  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  cy.get("table tbody tr").then(($rows) => {
    const dataRows = Array.from($rows).filter(
      (row) => Cypress.$(row).find("td[colspan]").length === 0,
    );

    expect(dataRows.length, "data rows after search").to.be.greaterThan(0);

    dataRows.forEach((row) => {
      const $tds = Cypress.$(row).find("td");
      const nameCellText = Cypress.$($tds[1])
        .text()
        .replaceAll(/\s+/g, " ")
        .trim();
      expect(nameCellText).to.eq(expected);
    });
  });
});
