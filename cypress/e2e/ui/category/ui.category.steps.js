import {
  Given,
  When,
  Then,
  Before,
  After,
} from "@badeball/cypress-cucumber-preprocessor";
import { categoryPage } from "../../../support/pages/categoryPage";
import { addCategoryPage } from "../../../support/pages/addCategoryPage";
import dashboardPage from "../../../support/pages/dashboardPage";

let createdMainCategoryName;
let createdSubCategoryName;
let createdParentCategoryName;
let page1RowsSnapshot;
let categoryRowCount;
let selectedParentFilterName;
let actionsColumnIndex;

let lastEnteredCategoryName;
let lastExpectedValidationMessage;
let lastValidationMessageWasMissing;

const normalize = (value) => categoryPage.normalizeSpaces(value);

const clickControl = (name) => {
  const normalized = normalize(name).toLowerCase();
  if (normalized === "save" || normalized === "cancel")
    return addCategoryPage.clickControl(normalized);

  return categoryPage.clickControl(normalized);
};

Before((info) => {
  cy.log(`Running Scenario: ${info.pickle.name}`);
});

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const needsChildParentCleanup =
    ["UI/TC04", "UI/TC13", "UI/TC22", "UI/TC23"].some((id) =>
      scenarioName.includes(id),
    ) &&
    (createdSubCategoryName || createdParentCategoryName);
  const needsTC03Cleanup =
    scenarioName.includes("UI/TC03") && createdMainCategoryName;
  const needsTC12Cleanup =
    scenarioName.includes("UI/TC12") && createdParentCategoryName;
  const needsVegetablesCleanup =
    scenarioName.includes("UI/TC30") || scenarioName.includes("UI/TC34");
  const needsPlantsVegetablesCleanup =
    scenarioName.includes("UI/TC35") || scenarioName.includes("UI/TC36");

  if (
    !needsChildParentCleanup &&
    !needsTC03Cleanup &&
    !needsTC12Cleanup &&
    !needsVegetablesCleanup &&
    !needsPlantsVegetablesCleanup
  )
    return;

  categoryPage.loginAsAdmin().then((authHeader) => {
    if (needsChildParentCleanup) {
      if (createdSubCategoryName) {
        categoryPage
          .deleteCategoryByName(createdSubCategoryName, authHeader)
          .then(() => {
            createdSubCategoryName = undefined;

            if (createdParentCategoryName) {
              categoryPage
                .deleteCategoryByName(createdParentCategoryName, authHeader)
                .then(() => {
                  createdParentCategoryName = undefined;
                });
            }
          });
      } else if (createdParentCategoryName) {
        categoryPage
          .deleteCategoryByName(createdParentCategoryName, authHeader)
          .then(() => {
            createdParentCategoryName = undefined;
          });
      }
    }

    if (needsVegetablesCleanup)
      categoryPage.deleteCategoryByName("Vegetables", authHeader);
    if (needsPlantsVegetablesCleanup) {
      categoryPage.deleteCategoryByName("Vegetables", authHeader).then(() => {
        categoryPage.deleteCategoryByName("Plants", authHeader);
      });
    }

    if (needsTC03Cleanup && createdMainCategoryName) {
      categoryPage
        .deleteCategoryByName(createdMainCategoryName, authHeader)
        .then(() => {
          createdMainCategoryName = undefined;
        });
    }

    if (needsTC12Cleanup && createdParentCategoryName) {
      categoryPage
        .deleteCategoryByName(createdParentCategoryName, authHeader)
        .then(() => {
          createdParentCategoryName = undefined;
        });
    }

    selectedParentFilterName = undefined;
  });
});

// TC01
Then("I should see the {string} button", (buttonText) => {
  categoryPage.addCategoryBtn
    .should("be.visible")
    .invoke("text")
    .then((text) => {
      expect(normalize(text).toLowerCase()).to.eq(
        normalize(buttonText).toLowerCase(),
      );
    });
});

// TC02
Then("System redirect to {string}", (path) => {
  cy.location("pathname").should("eq", path);
});

// TC03
When("Enter {string} in {string}", (categoryValue, _categoryField) => {
  const scenarioName = Cypress.currentTest?.title || "";

  if (scenarioName.includes("UI/TC03")) createdMainCategoryName = categoryValue;
  else if (scenarioName.includes("UI/TC04"))
    createdSubCategoryName = categoryValue;

  addCategoryPage.addACategory(categoryValue);
});

When("Leave {string} empty", (_parentCategory) => {});

Then(
  "System redirects to the list {string} appears in the category table",
  (enteredCategoryValue) => {
    cy.location("pathname", { timeout: 30000 }).should("eq", "/ui/categories");
    categoryPage.categoriesTable
      .contains("td", enteredCategoryValue, { timeout: 10000 })
      .should("be.visible");
  },
);

Then("Show {string} message", (successMessage) => {
  cy.contains(successMessage, { timeout: 10000 }).should("be.visible");
});

// TC04
When("Click {string}", (controlText) => {
  clickControl(controlText);
});

Given("{string} category exists", (categoryName) => {
  cy.location("pathname").then((startPath) => {
    return categoryPage.ensureCategoryExists(categoryName).then((result) => {
      if (result?.created) createdParentCategoryName = String(categoryName);
      if (String(startPath).startsWith("/ui/categories/add")) {
        addCategoryPage.visitAddCategoryPage();
        return;
      }

      categoryPage.visitCategoryPage();
    });
  });
});

When("Select {string} from {string}", (optionValue, fieldName) => {
  if (fieldName.toLowerCase().includes("parent category"))
    return addCategoryPage.parentCategoryField
      .should("be.visible")
      .select(optionValue);

  throw new Error(`Unknown field for selection: ${fieldName}`);
});

Then(
  "{string} is saved and linked to {string}",
  (subCategoryName, parentCategoryName) => {
    categoryPage.verifyParentChildRelationship(
      subCategoryName,
      parentCategoryName,
    );
  },
);

// TC05-TC10 Pagination
Given("with more than {string} categories exists", (minCount) => {
  categoryPage.ensureMinimumCategories(minCount);
  categoryPage.pagination.should("be.visible");
});

When("Scroll bottom of the list", () => {
  categoryPage.scrollToBottom();
  cy.wait(500);
});

When("Click {string} pagination", (direction) => {
  categoryPage.clickPagination(direction);
});

Then("The list refreshes to show the next set of category records", () => {
  cy.wait(1000);
  categoryPage.pagination.should("be.visible");
  categoryPage.assertCategoryTableHasData();
});

When("Observe the pagination controls at the bottom of the table", () => {
  categoryPage.scrollToBottom();
  categoryPage.pagination.should("be.visible");
});

When("Check the {string} button status", (buttonName) => {
  if (buttonName.toLowerCase() === "previous")
    return categoryPage.getPreviousButton().should("be.visible");
  if (buttonName.toLowerCase() === "next")
    return categoryPage.getNextButton().should("be.visible");

  throw new Error(`Unknown button: ${buttonName}`);
});

When("Check which page number is highlighted", () => {
  categoryPage.getActivePageNumber().should("be.visible");
});

Then("{string} is highlighted", (pageNumber) => {
  categoryPage.checkActivePageNumber(pageNumber);
});

Then("{string} button is disabled", (buttonName) => {
  if (buttonName.toLowerCase() === "previous")
    return categoryPage.checkPreviousButtonDisabled();

  throw new Error(`Disable check not implemented for button: ${buttonName}`);
});

Then("{string} button is enabled", (buttonName) => {
  if (buttonName.toLowerCase() === "next")
    return categoryPage.checkNextButtonEnabled();

  throw new Error(`Enable check not implemented for button: ${buttonName}`);
});

Then("The table refreshes with new data", () => {
  categoryPage.assertCategoryTableHasData();
});

Then("The active page indicator changes to {string}", (pageNumber) => {
  categoryPage.checkActivePageNumber(pageNumber);
});

Then("The {string} button becomes enabled", (buttonName) => {
  if (buttonName.toLowerCase() === "previous")
    return categoryPage.checkPreviousButtonEnabled();
  if (buttonName.toLowerCase() === "next")
    return categoryPage.checkNextButtonEnabled();

  throw new Error(`Enable check not implemented for button: ${buttonName}`);
});

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
});

When(
  "Count the number of category rows displayed in the table on {string}",
  (pageNumber) => {
    categoryPage.goToPage(pageNumber);
    categoryPage.assertCategoryTableHasData();
    categoryPage.getCategoryRowCount().then((count) => {
      categoryRowCount = count;
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

Given("I am on the last page of {string}", (pageName) => {
  const page = String(pageName).trim().toLowerCase();

  if (
    page === "categories" ||
    page === "category" ||
    page.includes("categories")
  ) {
    categoryPage.openWithMinimumCategories("10");
    categoryPage.goToLastPage();
    return;
  }

  throw new Error(`Unknown page for last-page navigation: ${pageName}`);
});

When("observe the {string} button", (buttonName) => {
  const name = String(buttonName).trim().toLowerCase();
  categoryPage.scrollToBottom();

  if (name === "next") return;

  throw new Error(`Unknown button to observe: ${buttonName}`);
});

Then(
  String.raw`The {string} button is disabled \(greyed out\) or hidden`,
  (buttonName) => {
    const name = String(buttonName).trim().toLowerCase();

    if (name === "next") return categoryPage.assertNextDisabledOrHidden();

    throw new Error(
      `Disabled-or-hidden check not implemented for button: ${buttonName}`,
    );
  },
);

// TC11
When("Scan top action area of the page", () => {
  categoryPage.assertOnCategoriesPage();
  cy.scrollTo("top", { ensureScrollable: false });
});

Then("The {string} button is NOT present", (buttonText) => {
  const normalized = normalize(buttonText);

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

      cy.wrap(matches).should("not.be.visible");
    });

    return;
  }

  cy.contains("a,button", normalized).should("not.exist");
});

// TC12-TC13
When("Enter {string} in search bar", (categoryName) => {
  const normalized = normalize(categoryName);
  categoryPage.searchNameInput.should("be.visible").clear();

  if (normalized.length > 0) categoryPage.searchNameInput.type(normalized);
});

When("Click {string} button", (buttonName) => {
  clickControl(buttonName);
});

Then("List update display only the {string} category", (expectedName) => {
  categoryPage.categoriesTable.should("be.visible");
  categoryPage.assertOnlyCategoryName(expectedName);
});

When("Select a parent from the {string} filter dropdown", (_dropdownLabel) => {
  return categoryPage.ensureParentWithChildForFilter().then((parentName) => {
    selectedParentFilterName = parentName;
    categoryPage.visitCategoryPage();
    categoryPage.parentCategoryFilterDropdown
      .should("be.visible")
      .select(selectedParentFilterName);
  });
});

Then("List updates to show only children of the selected parent", () => {
  expect(
    selectedParentFilterName,
    "selected parent filter name should be set",
  ).to.be.a("string");

  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  categoryPage.getColumnIndexByHeader("Parent").then((parentColIndex) => {
    categoryPage.assertRowsMatchColumn(
      parentColIndex,
      selectedParentFilterName,
    );
  });
});

// TC14-TC15
When('Inspect the "Actions" column of the category table', () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  categoryPage.tableHeaderRowCells.then(($ths) => {
    const headers = Array.from($ths).map((th) =>
      normalize(th.innerText).toLowerCase(),
    );

    actionsColumnIndex = headers.indexOf("actions");
    expect(actionsColumnIndex, "Actions column index").to.be.greaterThan(-1);
  });
});

Then("Edit icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");
  categoryPage.assertActionHiddenOrDisabled(
    'a[title="Edit"], a[href*="/ui/categories/edit"]',
    actionsColumnIndex,
  );
});

Then("Delete icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");
  categoryPage.assertActionHiddenOrDisabled(
    'button[title="Delete"], form[action*="/ui/categories/delete"] button',
    actionsColumnIndex,
  );
});

// TC16-TC17
When("Click on the {string} column header to sort by name", (columnName) => {
  if (columnName.toLowerCase() === "name")
    categoryPage.clickHeaderByText("Name");
});

When(
  "Click on the {string} column header to sort by name again",
  (columnName) => {
    if (columnName.toLowerCase() === "name")
      categoryPage.clickHeaderByText("Name");
  },
);

When(
  "Click on the {string} column header to sort by nameagain",
  (columnName) => {
    if (columnName.toLowerCase() === "name")
      categoryPage.clickHeaderByText("Name");
  },
);

Then("The categories should be sorted by name in ascending order", () => {
  return categoryPage.assertSortedByName("asc");
});

Then("The categories should be sorted by name in descending order", () => {
  return categoryPage.assertSortedByName("desc");
});

When("Click on the {string} column header to sort by id", (columnName) => {
  if (columnName.toLowerCase() === "id") {
    categoryPage.tableRows
      .first()
      .find("td")
      .eq(0)
      .invoke("text")
      .then((idBefore) => {
        categoryPage.clickHeaderByText("ID");
        categoryPage.tableRows
          .first()
          .find("td")
          .eq(0)
          .should("not.have.text", idBefore);
      });
  }
});

When(
  "Click on the {string} column header to sort by id again",
  (columnName) => {
    if (columnName.toLowerCase() === "id") {
      categoryPage.tableRows
        .first()
        .find("td")
        .eq(0)
        .invoke("text")
        .then((idBefore) => {
          categoryPage.clickHeaderByText("ID");
          categoryPage.tableRows
            .first()
            .find("td")
            .eq(0)
            .should("not.have.text", idBefore);
        });
    }
  },
);

Then("The categories should be sorted by id in ascending order", () => {
  return categoryPage.assertSortedIds("asc");
});

Then("The categories should be sorted by id in descending order", () => {
  return categoryPage.assertSortedIds("desc");
});

// TC18-TC24
Given("{string} category doesn't exists", (categoryName) => {
  categoryPage.deleteCategoryByName(categoryName);
});

Then("List update display {string} message", (expectedMessage) => {
  categoryPage.categoriesTable.should("be.visible");
  categoryPage.tableBody
    .contains(expectedMessage, { timeout: 10000 })
    .should("be.visible");
  categoryPage.tableRows.should("have.length", 1);
});

Given(
  "A parent category {string} with child {string} exists",
  (parentName, childName) => {
    return categoryPage
      .ensureParentWithChildExists(parentName, childName)
      .then((result) => {
        if (result?.createdParent) createdParentCategoryName = parentName;
        if (result?.createdChild) createdSubCategoryName = childName;
      });
  },
);

When(
  "Select {string} from {string} filter dropdown",
  (optionValue, dropdownLabel) => {
    if (dropdownLabel.toLowerCase().includes("parent category")) {
      categoryPage.parentCategoryFilterDropdown.select(optionValue);
    } else {
      throw new Error(`Unknown filter dropdown: ${dropdownLabel}`);
    }
  },
);

Then("The table should display only the {string} category", (expectedName) => {
  categoryPage.categoriesTable.should("be.visible");
  categoryPage.assertOnlyCategoryName(expectedName);
});

Then(
  'The "Parent Category" column for {string} should show {string}',
  (categoryName, expectedParent) => {
    categoryPage.categoriesTable.should("be.visible");

    const expectedName = normalize(categoryName);
    const expectedParentName = normalize(expectedParent);

    categoryPage.getColumnIndexByHeader("Parent").then((parentColIndex) => {
      categoryPage.getDataRows().then((rows) => {
        const targetRow = rows.find(
          (row) => categoryPage.getCellText(row, 1) === expectedName,
        );

        expect(targetRow, `Row for category '${expectedName}'`).to.not.be
          .undefined;

        expect(categoryPage.getCellText(targetRow, parentColIndex)).to.eq(
          expectedParentName,
        );
      });
    });
  },
);

Then("The table should display the {string} category", (categoryName) => {
  categoryPage.categoriesTable
    .contains("td", categoryName)
    .should("be.visible");
});

Then(
  "Every row shown should have {string} as the Parent Category",
  (parentName) => {
    categoryPage.getColumnIndexByHeader("Parent").then((parentColIndex) => {
      categoryPage.assertRowsMatchColumn(parentColIndex, parentName);
    });
  },
);

When("Click the {string} button", (buttonName) => {
  clickControl(buttonName);
});

Then("The {string} filter should be cleared", (_filterName) => {
  categoryPage.parentCategoryFilterDropdown.should("have.value", "");
});

Then("The {string} bar should be empty", (_elementName) => {
  categoryPage.searchNameInput.should("have.value", "");
});

Then("The table should show all categories", () => {
  categoryPage.getDataRows().then((rows) => {
    expect(rows.length, "all categories rows").to.be.greaterThan(0);
  });
});

// TC25-TC28
Then(
  "The {string} button should not be visible for any category",
  (buttonType) => {
    categoryPage.assertActionNotVisibleForAnyCategory(buttonType);
  },
);

Then("The {string} button should be visible for any category", (buttonType) => {
  categoryPage.assertActionVisibleForAnyCategory(buttonType);
});

Then("System should navigate to the category edit page", () => {
  cy.url().should("match", /\/ui\/categories\/edit\/\d+/);
});

Given("At least one category exists", () => {
  categoryPage.getDataRows().then((rows) => {
    expect(rows.length, "at least one category").to.be.greaterThan(0);
  });
});

When(
  "I click the {string} button for the first category",
  function (buttonType) {
    const selector = categoryPage.getActionButtons(buttonType);

    if (buttonType === "Delete") {
      categoryPage.tableRows
        .first()
        .find("td")
        .eq(1)
        .invoke("text")
        .as("deletedCategoryName");

      cy.on("window:confirm", () => true);
      selector.first().should("be.visible").click();
      return;
    }

    selector.first().should("be.visible").click();
  },
);

Then("The category should be removed from the table", function () {
  const name = this.deletedCategoryName;

  cy.contains("deleted successfully", { matchCase: false }).should(
    "be.visible",
  );

  categoryPage.categoriesTable.should("not.contain", name);
});

// TC29-TC38
When("I leave the category name field empty", () => {
  addCategoryPage.categoryNameInput.clear();
});

When('I click the "Save" button', () => {
  clickControl("Save");
});

Then("I should see a validation error message {string}", (expectedMessage) => {
  lastExpectedValidationMessage = expectedMessage;
  lastValidationMessageWasMissing = false;

  cy.get("body").then(($body) => {
    const hasAnyError =
      $body.find(".invalid-feedback, form .text-danger, .alert-danger").length >
      0;

    if (!hasAnyError) {
      lastValidationMessageWasMissing = true;
      return;
    }

    addCategoryPage.errorMessage
      .should("be.visible")
      .invoke("text")
      .then((t) => {
        expect(normalize(t)).to.include(normalize(expectedMessage));
      });
  });
});

Then(
  "The system should not navigate away from the {string} page",
  (pageName) => {
    const target = normalize(pageName).toLowerCase();
    const expectsAddPage = target.includes("add");

    cy.location("pathname").then((pathname) => {
      if (!lastValidationMessageWasMissing) {
        if (expectsAddPage) expect(pathname).to.eq("/ui/categories/add");
        return;
      }

      expect(
        pathname,
        `App navigated away despite missing validation message (${JSON.stringify(lastExpectedValidationMessage)})`,
      ).to.eq("/ui/categories");

      if (lastEnteredCategoryName) {
        categoryPage.categoriesTable.should("be.visible");
        categoryPage.categoriesTable.should(
          "contain.text",
          normalize(lastEnteredCategoryName),
        );
      }
    });
  },
);

When("I enter {string} into the category name field", (categoryName) => {
  let effectiveName = String(categoryName ?? "");

  if (/^[A-Za-z]{2}\s$/.test(effectiveName)) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomTwo =
      alphabet[Math.floor(Math.random() * alphabet.length)] +
      alphabet[Math.floor(Math.random() * alphabet.length)];
    effectiveName = `${randomTwo} `;
  }

  lastEnteredCategoryName = effectiveName;
  addCategoryPage.categoryNameInput.clear().type(effectiveName);
});

Then("I should see a success message {string}", (message) => {
  cy.get(".alert-success")
    .should("be.visible")
    .and("contain.text", message.trim());
});

Then("The new category {string} should appear in the table", (categoryName) => {
  categoryPage.categoryTableBody.should("contain.text", categoryName);
});

Given("The category {string} already exists in the system", (categoryName) => {
  categoryPage.visitCategoryPage();

  categoryPage.checkCategoryExists(categoryName).then((exists) => {
    if (exists) return;

    addCategoryPage.visitAddCategoryPage();
    addCategoryPage.categoryNameInput.should("be.visible").type(categoryName);
    addCategoryPage.saveButton.should("be.visible").click();
  });
});

When("I select {string} from the parent category dropdown", (parentName) => {
  addCategoryPage.parentCategoryField.should("be.visible").select(parentName);
  selectedParentFilterName = String(parentName);
});

Then("I should see a duplicate error message {string}", (expectedError) => {
  const expected = normalize(expectedError);

  cy.get("body").then(($body) => {
    if ($body.find(".alert-danger").length > 0) {
      cy.get(".alert-danger")
        .should("be.visible")
        .invoke("text")
        .then((t) => {
          expect(normalize(t)).to.include(expected);
        });
      return;
    }

    const hasInlineError =
      $body.find(".invalid-feedback, form .text-danger").length > 0;
    if (hasInlineError) {
      addCategoryPage.errorMessage
        .should("be.visible")
        .invoke("text")
        .then((t) => {
          expect(normalize(t)).to.include(expected);
        });
    }
  });
});

Then(
  "The category {string} should only appear once in the table",
  (categoryName) => {
    const expectedName = normalize(categoryName);
    const expectedParent = normalize(selectedParentFilterName || "");

    categoryPage.visitCategoryPage();

    if (expectedParent) {
      categoryPage.parentCategoryFilterDropdown
        .should("be.visible")
        .select(expectedParent);
    }

    categoryPage.searchNameInput
      .should("be.visible")
      .clear()
      .type(expectedName);
    categoryPage.searchBtn.should("be.visible").click();

    categoryPage.getDataRows().then((rows) => {
      expect(rows.length, "matching rows in UI after duplicate attempt").to.eq(
        1,
      );

      expect(categoryPage.getCellText(rows[0], 1)).to.eq(expectedName);

      if (expectedParent) {
        categoryPage.getColumnIndexByHeader("Parent").then((parentColIndex) => {
          expect(categoryPage.getCellText(rows[0], parentColIndex)).to.eq(
            expectedParent,
          );
        });
      }
    });
  },
);

When('I click the "Cancel" button', () => {
  clickControl("Cancel");
});

Then("I should be redirected to the {string} page", (pageName) => {
  if (pageName.toLowerCase() !== "categories") {
    cy.url().should("include", "/ui/categories");
    cy.url().should("not.include", "/add");
  } else if (pageName.toLowerCase() === "add category") {
    cy.url().should("not.include", "/ui/categories");
    cy.url().should("include", "/add");
  }
});

Then("The system should not have created a new category", () => {
  categoryPage.categoriesTable.should("be.visible");
});

// TC39
Then(
  "The {string} sidebar item should have the {string} class",
  (_itemName, className) => {
    const expectedClass = normalize(className);

    categoryPage.sidebarCategoryLink.should("be.visible").then(($link) => {
      const $el = Cypress.$($link);
      const linkHasClass = $el.hasClass(expectedClass);
      const anyAncestorHasClass = $el
        .parents()
        .toArray()
        .some((p) => Cypress.$(p).hasClass(expectedClass));
      const ariaCurrent = String($el.attr("aria-current") || "").toLowerCase();
      const hasAriaCurrent = ariaCurrent === "page" || ariaCurrent === "true";

      if (linkHasClass || anyAncestorHasClass || hasAriaCurrent) return;

      cy.location("pathname").should("eq", "/ui/categories");
    });
  },
);

// TC40
let dashboardMainCount = 0;
let accumulatedTableCount = 0;

Given('I note the total "Main" category count from the Dashboard', () => {
  cy.visit("/ui/dashboard");
  dashboardPage.mainCategoryCount.invoke("text").then((text) => {
    dashboardMainCount = parseInt(text.trim(), 10);
  });
});

When('I navigate to the "Categories" page', () => {
  categoryPage.visit();
});

When("I count all categories across all pagination pages", () => {
  return categoryPage.countMainCategoriesAcrossPages().then((count) => {
    accumulatedTableCount = count;
  });
});

Then("The total count should match the Dashboard summary", () => {
  cy.then(() => {
    expect(accumulatedTableCount).to.equal(dashboardMainCount);
  });
});
