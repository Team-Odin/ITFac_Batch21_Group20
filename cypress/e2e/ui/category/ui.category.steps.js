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
let selectedParentFilterName;
let actionsColumnIndex;

const apiLoginAsAdmin = () => categoryPage.constructor.apiLoginAsAdmin();

const ensureCategoryExists = (categoryName) => {
  const name = String(categoryName);

  return apiLoginAsAdmin().then((authHeader) => {
    categoryPage.setAuthHeader(authHeader);
    return categoryPage.ensureMainCategoryExists(name).then((result) => {
      if (result?.created) createdParentCategoryName = name;
    });
  });
};

const ensureParentWithChildForFilter = () => {
  // Pick an existing parent that has at least one child so the filter produces results.
  return apiLoginAsAdmin().then((authHeader) => {
    categoryPage.setAuthHeader(authHeader);
    return cy
      .request({
        method: "GET",
        url: "/api/categories/main",
        headers: { Authorization: authHeader },
        failOnStatusCode: true,
      })
      .then((res) => {
        const parents = Array.isArray(res?.body) ? res.body : [];
        const withChildren = parents.find(
          (p) => Array.isArray(p?.subCategories) && p.subCategories.length > 0,
        );

        if (!withChildren?.name) {
          throw new Error(
            "No parent category with children was found; cannot run TC13 filter test reliably.",
          );
        }

        selectedParentFilterName = String(withChildren.name);
      });
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

  // Cleanup for TC13 (filter precondition creates a parent + child via API)
  const shouldCleanupTC13 =
    scenarioName.includes("UI/TC13") &&
    (Boolean(createdSubCategoryName) || Boolean(createdParentCategoryName));

  if (
    !shouldCleanupTC03 &&
    !shouldCleanupTC04 &&
    !shouldCleanupTC12 &&
    !shouldCleanupTC13
  )
    return;

  apiLoginAsAdmin().then((authHeader) => {
    categoryPage.setAuthHeader(authHeader);
    if (shouldCleanupTC04 || shouldCleanupTC13) {
      // Delete subcategory first (child before parent)
      if (createdSubCategoryName) {
        categoryPage.deleteCategoryIfExists(createdSubCategoryName).then(() => {
          createdSubCategoryName = undefined;

          // Delete parent category after subcategory is deleted
          if (createdParentCategoryName) {
            categoryPage
              .deleteCategoryIfExists(createdParentCategoryName)
              .then(() => {
                createdParentCategoryName = undefined;
              });
          }
        });
      } else if (createdParentCategoryName) {
        // Only parent needs deletion
        categoryPage
          .deleteCategoryIfExists(createdParentCategoryName)
          .then(() => {
            createdParentCategoryName = undefined;
          });
      }
    }

    if (shouldCleanupTC03 && createdMainCategoryName) {
      categoryPage.deleteCategoryIfExists(createdMainCategoryName).then(() => {
        createdMainCategoryName = undefined;
      });
    }

    if (shouldCleanupTC12 && createdParentCategoryName) {
      categoryPage
        .deleteCategoryIfExists(createdParentCategoryName)
        .then(() => {
          createdParentCategoryName = undefined;
        });
    }

    selectedParentFilterName = undefined;
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
  const normalize = (s) =>
    String(s)
      .toLowerCase()
      .replaceAll(/\b(a|an|the)\b/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

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
  const t = String(buttonText).replaceAll(/\s+/g, " ").trim().toLowerCase();

  if (t === "save") {
    addCategoryPage.submitBtn.should("be.visible").click();
    return;
  }

  if (t === "search") {
    categoryPage.searchBtn.should("be.visible").click();
    return;
  }

  if (t === "reset") {
    categoryPage.resetBtn.should("be.visible").click();
    return;
  }

  throw new Error(`Unknown button: ${JSON.stringify(buttonText)}`);
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
    // TC09 has no explicit "more than 10 categories" precondition, but it asserts
    // the default page size is 10. Ensure we have enough data for the pagination
    // layer to actually render 10 rows.
    categoryPage.ensureMinimumCategories("10");
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
      const re = /add\s+category/i;
      const matches = $body
        .find("a,button")
        .filter((_, el) => re.test(String(el?.innerText ?? "")));

      if (matches.length === 0) {
        expect(matches.length, "Add Category control present in DOM").to.eq(0);
        return;
      }

      // If the element exists but access control hides it, assert it's not visible.
      cy.wrap(matches).should("not.be.visible");
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

// =============================================================
// UI/TC13 Verify Filter by Parent
// =============================================================

When("Select a parent from the {string} filter dropdown", (_dropdownLabel) => {
  // Create a known parent+child so the filter always returns results.
  return ensureParentWithChildForFilter().then(() => {
    categoryPage.visitCategoryPage();
    categoryPage.parentCategoryFilterDropdown.should("be.visible");
    categoryPage.parentCategoryFilterDropdown.select(selectedParentFilterName);
  });
});

Then("List updates to show only children of the selected parent", () => {
  expect(
    selectedParentFilterName,
    "selected parent filter name should be set",
  ).to.be.a("string");

  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  cy.get("table tbody tr").then(($rows) => {
    const dataRows = Array.from($rows).filter(
      (row) => Cypress.$(row).find("td[colspan]").length === 0,
    );

    expect(dataRows.length, "data rows after parent filter").to.be.greaterThan(
      0,
    );

    dataRows.forEach((row) => {
      const $tds = Cypress.$(row).find("td");
      const parentCellText = Cypress.$($tds[2])
        .text()
        .replaceAll(/\s+/g, " ")
        .trim();
      expect(parentCellText).to.eq(String(selectedParentFilterName).trim());
    });
  });
});

// =============================================================
// UI/TC14 Verify Edit Action Hidden for Non admin User
// =============================================================

When('Inspect the "Actions" column of the category table', () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  cy.get("table thead tr th").then(($ths) => {
    const headers = Array.from($ths).map((th) =>
      String(th.innerText).replaceAll(/\s+/g, " ").trim().toLowerCase(),
    );

    actionsColumnIndex = headers.indexOf("actions");
    expect(actionsColumnIndex, "Actions column index").to.be.greaterThan(-1);
  });
});

Then("Edit icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  cy.get("table tbody tr").each(($row) => {
    const $tds = Cypress.$($row).find("td");

    // Skip empty-state row
    if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;
    if ($tds.length === 0) return;

    const idx = Number.isInteger(actionsColumnIndex)
      ? actionsColumnIndex
      : $tds.length - 1;
    const $actionsCell = Cypress.$($tds[idx]);

    // The template uses title="Edit"; also keep href fallback for resilience.
    const $editLinks = $actionsCell.find(
      'a[title="Edit"], a[href*="/ui/categories/edit"]',
    );

    // Hidden case: nothing to assert beyond non-existence.
    if ($editLinks.length === 0) return;

    // Disabled case: element exists but should be disabled via attribute/class.
    cy.wrap($editLinks[0]).should(($el) => {
      const $a = Cypress.$($el);
      const hasDisabledAttr =
        $a.is("[disabled]") || $a.attr("aria-disabled") === "true";
      const className = String($a.attr("class") || "");
      const hasDisabledClass = className.split(/\s+/g).includes("disabled");

      expect(
        hasDisabledAttr || hasDisabledClass,
        "Edit action should be hidden or disabled for non-admin",
      ).to.eq(true);
    });
  });
});

// =============================================================
// UI/TC15 Verify Delete Action Hidden for Non admin User
// =============================================================

Then("Delete icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  cy.get("table tbody tr").each(($row) => {
    const $tds = Cypress.$($row).find("td");

    // Skip empty-state row
    if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;
    if ($tds.length === 0) return;

    const idx = Number.isInteger(actionsColumnIndex)
      ? actionsColumnIndex
      : $tds.length - 1;
    const $actionsCell = Cypress.$($tds[idx]);

    // The template uses a <button title="Delete"> inside a <form>.
    const $deleteButtons = $actionsCell.find(
      'button[title="Delete"], form[action*="/ui/categories/delete"] button',
    );

    // Hidden case: nothing to assert beyond non-existence.
    if ($deleteButtons.length === 0) return;

    cy.wrap($deleteButtons[0]).should(($el) => {
      const $btn = Cypress.$($el);
      const hasDisabledAttr =
        $btn.is(":disabled") ||
        $btn.is("[disabled]") ||
        $btn.attr("aria-disabled") === "true";
      const className = String($btn.attr("class") || "");
      const hasDisabledClass = className.split(/\s+/g).includes("disabled");

      expect(
        hasDisabledAttr || hasDisabledClass,
        "Delete action should be hidden or disabled for non-admin",
      ).to.eq(true);
    });
  });
});
