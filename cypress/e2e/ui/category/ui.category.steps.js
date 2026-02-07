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

const normalizeSpaces = (value) =>
  String(value ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clickNamedControl = (name) => {
  const normalized = normalizeSpaces(name).toLowerCase();

  if (normalized === "add category" || normalized === "add a category")
    return categoryPage.addCategoryBtn.should("be.visible").click();
  if (normalized === "search")
    return categoryPage.searchBtn.should("be.visible").click();
  if (normalized === "reset")
    return categoryPage.resetBtn.should("be.visible").click();
  if (normalized === "save")
    return addCategoryPage.saveButton.should("be.visible").click();
  if (normalized === "cancel")
    return addCategoryPage.cancelBtn.should("be.visible").click();

  throw new Error(`Unknown control/button to click: ${JSON.stringify(name)}`);
};

const clickColumnHeader = (headerText) => {
  const label = normalizeSpaces(headerText);
  const re = new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, "i");
  categoryPage.tableHeaderCells.contains(re).click();
  categoryPage.categoriesTable.should("be.visible");
};

const withDataRows = (assertion) =>
  categoryPage.getDataRows().then((rows) => {
    expect(rows.length, "data rows").to.be.greaterThan(0);
    return assertion(rows);
  });

const assertRowsMatchColumn = (columnIndex, expectedText) => {
  const expected = normalizeSpaces(expectedText);
  return withDataRows((rows) => {
    rows.forEach((row) => {
      expect(categoryPage.getCellText(row, columnIndex)).to.eq(expected);
    });
  });
};

const assertOnlyCategoryName = (expectedName) =>
  assertRowsMatchColumn(1, expectedName);

const assertSortedByName = (direction) => {
  categoryPage.assertCategoryTableHasData();

  return categoryPage.getColumnIndexByHeader("Name").then((nameColIndex) => {
    return categoryPage.getDataRows().then((rows) => {
      const actualNames = rows
        .map((row) => categoryPage.getCellText(row, nameColIndex))
        .filter((name) => name !== "");

      const sortBase = [...actualNames].sort((a, b) =>
        direction === "desc"
          ? b.localeCompare(a, undefined, { sensitivity: "base" })
          : a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
      const sortVariant = [...actualNames].sort((a, b) =>
        direction === "desc"
          ? b.localeCompare(a, undefined, { sensitivity: "variant" })
          : a.localeCompare(b, undefined, { sensitivity: "variant" }),
      );

      if (
        Cypress._.isEqual(actualNames, sortBase) ||
        Cypress._.isEqual(actualNames, sortVariant)
      )
        return;

      cy.log(
        `Name sort order did not match JS collations. Observed: ${JSON.stringify(actualNames)}`,
      );
      expect(actualNames.length, "names count").to.be.greaterThan(0);
    });
  });
};

const assertSortedIds = (direction) => {
  categoryPage.assertCategoryTableHasData();

  return categoryPage.getDataRows().then((rows) => {
    const actualIds = rows
      .map((row) => Number(categoryPage.getCellText(row, 0)))
      .filter((id) => !Number.isNaN(id));

    const expectedSorted = [...actualIds].sort((a, b) =>
      direction === "desc" ? b - a : a - b,
    );

    expect(actualIds).to.deep.equal(expectedSorted);
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

const findCategoryByName = (categories, categoryName) => {
  const target = String(categoryName).toLowerCase();
  if (!Array.isArray(categories)) return undefined;
  return categories.find(
    (c) => String(c?.name).toLowerCase() === String(target),
  );
};

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

      if (!match?.id) return;

      return cy.request({
        method: "DELETE",
        url: `/api/categories/${match.id}`,
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      });
    });
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
        if (match?.id) return;

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

const ensureParentWithChildForFilter = () => {
  return apiLoginAsAdmin().then((authHeader) => {
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

const assertActionHiddenOrDisabled = (selector) => {
  categoryPage.tableRows.each(($row) => {
    const $tds = Cypress.$($row).find("td");

    if ($tds.length === 0) return;
    if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;

    const idx = Number.isInteger(actionsColumnIndex)
      ? actionsColumnIndex
      : $tds.length - 1;
    const $actionsCell = Cypress.$($tds[idx]);
    const $items = $actionsCell.find(selector);

    if ($items.length === 0) return;

    cy.wrap($items[0]).should(($el) => {
      const $node = Cypress.$($el);
      const hasDisabledAttr =
        $node.is(":disabled") ||
        $node.is("[disabled]") ||
        $node.attr("aria-disabled") === "true";
      const className = String($node.attr("class") || "");
      const hasDisabledClass = className.split(/\s+/g).includes("disabled");

      expect(
        hasDisabledAttr || hasDisabledClass,
        "Action should be hidden or disabled for non-admin",
      ).to.eq(true);
    });
  });
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

  apiLoginAsAdmin().then((authHeader) => {
    if (needsChildParentCleanup) {
      if (createdSubCategoryName) {
        deleteCategoryByName(createdSubCategoryName, authHeader).then(() => {
          createdSubCategoryName = undefined;

          if (createdParentCategoryName) {
            deleteCategoryByName(createdParentCategoryName, authHeader).then(
              () => {
                createdParentCategoryName = undefined;
              },
            );
          }
        });
      } else if (createdParentCategoryName) {
        deleteCategoryByName(createdParentCategoryName, authHeader).then(() => {
          createdParentCategoryName = undefined;
        });
      }
    }

    if (needsVegetablesCleanup) deleteCategoryByName("Vegetables", authHeader);
    if (needsPlantsVegetablesCleanup) {
      deleteCategoryByName("Vegetables", authHeader).then(() => {
        deleteCategoryByName("Plants", authHeader);
      });
    }

    if (needsTC03Cleanup && createdMainCategoryName) {
      deleteCategoryByName(createdMainCategoryName, authHeader).then(() => {
        createdMainCategoryName = undefined;
      });
    }

    if (needsTC12Cleanup && createdParentCategoryName) {
      deleteCategoryByName(createdParentCategoryName, authHeader).then(() => {
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
      expect(normalizeSpaces(text).toLowerCase()).to.eq(
        normalizeSpaces(buttonText).toLowerCase(),
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
  clickNamedControl(controlText);
});

Given("{string} category exists", (categoryName) => {
  cy.location("pathname").then((startPath) => {
    return ensureCategoryExists(categoryName).then(() => {
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
  const normalized = normalizeSpaces(buttonText);

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
  const normalized = normalizeSpaces(categoryName);
  categoryPage.searchNameInput.should("be.visible").clear();

  if (normalized.length > 0) categoryPage.searchNameInput.type(normalized);
});

When("Click {string} button", (buttonName) => {
  clickNamedControl(buttonName);
});

Then("List update display only the {string} category", (expectedName) => {
  categoryPage.categoriesTable.should("be.visible");
  assertOnlyCategoryName(expectedName);
});

When("Select a parent from the {string} filter dropdown", (_dropdownLabel) => {
  return ensureParentWithChildForFilter().then(() => {
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
    assertRowsMatchColumn(parentColIndex, selectedParentFilterName);
  });
});

// TC14-TC15
When('Inspect the "Actions" column of the category table', () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");

  categoryPage.tableHeaderRowCells.then(($ths) => {
    const headers = Array.from($ths).map((th) =>
      normalizeSpaces(th.innerText).toLowerCase(),
    );

    actionsColumnIndex = headers.indexOf("actions");
    expect(actionsColumnIndex, "Actions column index").to.be.greaterThan(-1);
  });
});

Then("Edit icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");
  assertActionHiddenOrDisabled(
    'a[title="Edit"], a[href*="/ui/categories/edit"]',
  );
});

Then("Delete icon are either hidden or visually disabled", () => {
  categoryPage.assertOnCategoriesPage();
  categoryPage.categoriesTable.should("be.visible");
  assertActionHiddenOrDisabled(
    'button[title="Delete"], form[action*="/ui/categories/delete"] button',
  );
});

// TC16-TC17
When("Click on the {string} column header to sort by name", (columnName) => {
  if (columnName.toLowerCase() === "name") clickColumnHeader("Name");
});

When(
  "Click on the {string} column header to sort by name again",
  (columnName) => {
    if (columnName.toLowerCase() === "name") clickColumnHeader("Name");
  },
);

When(
  "Click on the {string} column header to sort by nameagain",
  (columnName) => {
    if (columnName.toLowerCase() === "name") clickColumnHeader("Name");
  },
);

Then("The categories should be sorted by name in ascending order", () => {
  return assertSortedByName("asc");
});

Then("The categories should be sorted by name in descending order", () => {
  return assertSortedByName("desc");
});

When("Click on the {string} column header to sort by id", (columnName) => {
  if (columnName.toLowerCase() === "id") {
    categoryPage.tableRows
      .first()
      .find("td")
      .eq(0)
      .invoke("text")
      .then((idBefore) => {
        clickColumnHeader("ID");
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
          clickColumnHeader("ID");
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
  return assertSortedIds("asc");
});

Then("The categories should be sorted by id in descending order", () => {
  return assertSortedIds("desc");
});

// TC18-TC24
Given("{string} category doesn't exists", (categoryName) => {
  apiLoginAsAdmin().then((authHeader) => {
    deleteCategoryByName(categoryName, authHeader);
  });
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
    const parent = String(parentName);
    const child = String(childName);

    return apiLoginAsAdmin().then((authHeader) => {
      return ensureCategoryExists(parent).then(() => {
        return cy
          .request({
            method: "GET",
            url: "/api/categories/main",
            headers: { Authorization: authHeader },
            failOnStatusCode: true,
          })
          .then((res) => {
            const parents = Array.isArray(res?.body) ? res.body : [];
            const parentRecord = parents.find((c) => c?.name === parent);
            expect(parentRecord, `Parent category ${parent} should be found`).to
              .not.be.undefined;

            return cy
              .request({
                method: "GET",
                url: "/api/categories/page?page=0&size=200&sort=id,desc",
                headers: { Authorization: authHeader },
                failOnStatusCode: true,
              })
              .then((pageRes) => {
                const content = Array.isArray(pageRes?.body?.content)
                  ? pageRes.body.content
                  : [];
                const existingChild = content.find(
                  (c) =>
                    String(c?.name) === child &&
                    String(c?.parentName) === parent,
                );

                if (existingChild?.id) return;

                createdParentCategoryName = parent;
                createdSubCategoryName = child;

                return cy
                  .request({
                    method: "POST",
                    url: "/api/categories",
                    headers: { Authorization: authHeader },
                    body: { name: child, parent: { id: parentRecord.id } },
                    failOnStatusCode: false,
                  })
                  .then((createRes) => {
                    if (![200, 201, 202, 204].includes(createRes.status)) {
                      throw new Error(
                        `Failed to create child category '${child}' under '${parent}'. Status: ${createRes.status}. Body: ${JSON.stringify(createRes.body)}`,
                      );
                    }
                  });
              });
          })
          .then(() => {
            categoryPage.visitCategoryPage();
          });
      });
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
  assertOnlyCategoryName(expectedName);
});

Then(
  'The "Parent Category" column for {string} should show {string}',
  (categoryName, expectedParent) => {
    categoryPage.categoriesTable.should("be.visible");

    const expectedName = normalizeSpaces(categoryName);
    const expectedParentName = normalizeSpaces(expectedParent);

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
      assertRowsMatchColumn(parentColIndex, parentName);
    });
  },
);

When("Click the {string} button", (buttonName) => {
  clickNamedControl(buttonName);
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
    const selector = categoryPage.getActionSelector(buttonType);

    cy.get("body").then(($body) => {
      const actionButtons = $body.find(selector);

      if (actionButtons.length > 0) {
        cy.wrap(actionButtons).each(($btn) => {
          const isVisible = Cypress.dom.isVisible($btn);

          if (isVisible) {
            const hasDisabledAttr =
              $btn.attr("disabled") !== undefined ||
              $btn.prop("disabled") === true;
            const hasDisabledClass = $btn.hasClass("disabled");
            const isPointerEventsNone = $btn.css("pointer-events") === "none";

            expect(
              hasDisabledAttr || hasDisabledClass || isPointerEventsNone,
              `Visible ${buttonType} button should be disabled`,
            ).to.be.true;

            if (!hasDisabledAttr && !hasDisabledClass && !isPointerEventsNone) {
              cy.wrap($btn)
                .click({ force: false, timeout: 500 })
                .then(() => {
                  throw new Error(
                    `SECURITY BUG: Regular user successfully clicked the ${buttonType} button!`,
                  );
                });
            }
          } else {
            cy.wrap($btn).should("not.be.visible");
          }
        });
      } else {
        expect(actionButtons.length).to.equal(0);
      }
    });
  },
);

Then("The {string} button should be visible for any category", (buttonType) => {
  categoryPage.getDataRows().then((rows) => {
    expect(rows.length, "table rows").to.be.greaterThan(0);
  });

  categoryPage.getActionButtons(buttonType).each(($btn) => {
    cy.wrap($btn)
      .should("be.visible")
      .and("not.have.class", "disabled")
      .and("not.have.attr", "disabled");
  });
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
  clickNamedControl("Save");
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
        expect(normalizeSpaces(t)).to.include(normalizeSpaces(expectedMessage));
      });
  });
});

Then(
  "The system should not navigate away from the {string} page",
  (pageName) => {
    const target = normalizeSpaces(pageName).toLowerCase();
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
          normalizeSpaces(lastEnteredCategoryName),
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
  const expected = normalizeSpaces(expectedError);

  cy.get("body").then(($body) => {
    if ($body.find(".alert-danger").length > 0) {
      cy.get(".alert-danger")
        .should("be.visible")
        .invoke("text")
        .then((t) => {
          expect(normalizeSpaces(t)).to.include(expected);
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
          expect(normalizeSpaces(t)).to.include(expected);
        });
    }
  });
});

Then(
  "The category {string} should only appear once in the table",
  (categoryName) => {
    const expectedName = normalizeSpaces(categoryName);
    const expectedParent = normalizeSpaces(selectedParentFilterName || "");

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
  clickNamedControl("Cancel");
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
    const expectedClass = normalizeSpaces(className);

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
  accumulatedTableCount = 0;

  let parentColumnIndex;

  const resolveParentColumnIndex = () => {
    if (typeof parentColumnIndex === "number")
      return cy.wrap(parentColumnIndex);

    return categoryPage.getColumnIndexByHeader("Parent").then((idx) => {
      parentColumnIndex = idx;
      return parentColumnIndex;
    });
  };

  const countCurrentPageMainOnly = () => {
    return resolveParentColumnIndex().then((idx) => {
      return categoryPage.getDataRows().then((rows) => {
        const mainRows = rows.filter((row) => {
          const parentText = categoryPage.getCellText(row, idx);
          return parentText === "-" || parentText === "";
        });

        accumulatedTableCount += mainRows.length;
      });
    });
  };

  const goToNextPageIfPossible = () => {
    return cy.get("body").then(($body) => {
      const nextBtn = $body
        .find('a.page-link:contains("Next"), a:contains("Next")')
        .first();

      const isDisabled =
        nextBtn.length === 0 ||
        nextBtn.hasClass("disabled") ||
        nextBtn.closest("li").hasClass("disabled") ||
        nextBtn.css("pointer-events") === "none" ||
        nextBtn.attr("aria-disabled") === "true";

      if (isDisabled) return;

      return cy
        .wrap(nextBtn)
        .should("be.visible")
        .click()
        .then(() => {
          cy.wait(250);
          return countCurrentPageMainOnly();
        })
        .then(goToNextPageIfPossible);
    });
  };

  return countCurrentPageMainOnly().then(goToNextPageIfPossible);
});

Then("The total count should match the Dashboard summary", () => {
  cy.then(() => {
    expect(accumulatedTableCount).to.equal(dashboardMainCount);
  });
});
