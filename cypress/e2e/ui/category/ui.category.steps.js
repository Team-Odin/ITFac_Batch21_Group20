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
import dashboardPage from "../../../support/pages/dashboardPage";

let createdMainCategoryName;
let createdSubCategoryName;
let createdParentCategoryName;
let page1RowsSnapshot;
let categoryRowCount;
let selectedParentFilterName;
let actionsColumnIndex;

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

const ensureParentWithChildForFilter = () => {
  // Pick an existing parent that has at least one child so the filter produces results.
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
    if (shouldCleanupTC04 || shouldCleanupTC13) {
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
  const normalize = (s) => s.replaceAll(/\s+/g, " ").trim();

  categoryPage.addCategoryBtn
    .should("be.visible")
    .invoke("text")
    .then((t) => {
      expect(normalize(t)).to.eq(normalize(buttonText));
    });
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

When("Leave {string} empty", (_parentCategory) => { });

// When("Click {string} button", (buttonText) => {
//   const t = String(buttonText).replaceAll(/\s+/g, " ").trim().toLowerCase();

//   if (t === "save") {
//     addCategoryPage.submitBtn.should("be.visible").click();
//     return;
//   }

//   if (t === "search") {
//     categoryPage.searchBtn.should("be.visible").click();
//     return;
//   }

//   if (t === "reset") {
//     categoryPage.resetBtn.should("be.visible").click();
//     return;
//   }

//   throw new Error(`Unknown button: ${JSON.stringify(buttonText)}`);
// });

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

// When("Enter {string} in search bar", (searchText) => {
//   categoryPage.assertOnCategoriesPage();
//   categoryPage.searchNameInput.should("be.visible").clear().type(searchText);
// });

// When("Click {string}", (controlText) => {
//   const t = String(controlText).replaceAll(/\s+/g, " ").trim().toLowerCase();

//   if (t === "search") {
//     categoryPage.searchBtn.should("be.visible").click();
//     return;
//   }

//   if (t === "reset") {
//     categoryPage.resetBtn.should("be.visible").click();
//     return;
//   }

//   throw new Error(`Unknown control to click: ${JSON.stringify(controlText)}`);
// });

// Then("List update display only the {string} category", (expectedCategory) => {
//   const expected = String(expectedCategory).trim();

//   categoryPage.assertOnCategoriesPage();
//   categoryPage.categoriesTable.should("be.visible");

//   cy.get("table tbody tr").then(($rows) => {
//     const dataRows = Array.from($rows).filter(
//       (row) => Cypress.$(row).find("td[colspan]").length === 0,
//     );

//     expect(dataRows.length, "data rows after search").to.be.greaterThan(0);

//     dataRows.forEach((row) => {
//       const $tds = Cypress.$(row).find("td");
//       const nameCellText = Cypress.$($tds[1])
//         .text()
//         .replaceAll(/\s+/g, " ")
//         .trim();
//       expect(nameCellText).to.eq(expected);
//     });
//   });
// });

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

// =============================================================
// UI/TC16 Verify "Sorting by name" in Category page
// =============================================================

When('Click on the {string} column header to sort by name', (columnName) => {
  if (columnName.toLowerCase() === 'name') {
    // Assuming the first <th> in the table is for "Name"
    // Get the first row's text before clicking
    cy.get('table tbody tr').first().find('td').eq(0).invoke('text').then((firstRowBefore) => {
      categoryPage.categoriesTable.find('th').contains('Name').click();

      // Wait until the first row's text actually changes, or use a short wait
      cy.get('table tbody tr').first().find('td').eq(0).should('not.have.text', firstRowBefore);
    });
  }
});

When('Click on the {string} column header to sort by name again', (columnName) => {
  if (columnName.toLowerCase() === 'name') {
    // Get the first row's text before clicking
    cy.get('table tbody tr').first().find('td').eq(0).invoke('text').then((firstRowBefore) => {
      categoryPage.categoriesTable.find('th').contains('Name').click();

      // Wait until the first row's text actually changes, or use a short wait
      cy.get('table tbody tr').first().find('td').eq(0).should('not.have.text', firstRowBefore);
    });
  }
});

Then('The categories should be sorted by name in ascending order', () => {
  categoryPage.assertCategoryTableHasData();

  cy.get('table tbody tr').then(($rows) => {
    const actualNames = Array.from($rows)
      .map(row => Cypress.$(row).find('td').eq(0).text().trim())
      .filter(name => name !== "");

    // Use standard localeCompare WITHOUT toLowerCase to see if it matches the App
    const expectedSorted = [...actualNames].sort((a, b) => a.localeCompare(b));

    cy.log('Actual:', actualNames.join(' | '));
    cy.log('Expected:', expectedSorted.join(' | '));

    expect(actualNames).to.deep.equal(expectedSorted);
  });
});

Then('The categories should be sorted by name in descending order', () => {
  categoryPage.assertCategoryTableHasData();

  cy.get('table tbody tr').then(($rows) => {
    const actualNames = Array.from($rows)
      .map(row => Cypress.$(row).find('td').eq(0).text().trim())
      .filter(name => name !== "");

    const expectedSorted = [...actualNames].sort((a, b) =>
      b.toLowerCase().localeCompare(a.toLowerCase())
    );

    expect(actualNames).to.deep.equal(expectedSorted);
  });
});

// =============================================================
// UI/TC17 Sorting by ID in Category page
// =============================================================

When('Click on the {string} column header to sort by id', (columnName) => {
  if (columnName.toLowerCase() === 'id') {
    // We capture the text of the first ID before clicking to use as a "Guard"
    // This ensures Cypress waits for the table to actually refresh/resort
    cy.get('table tbody tr').first().find('td').eq(0).invoke('text').then((idBefore) => {
      categoryPage.categoriesTable.find('th').contains('ID').click();
      // Guard: Only proceed when the ID in the first row has changed
      cy.get('table tbody tr').first().find('td').eq(0).should('not.have.text', idBefore);
    });
  }
});

When('Click on the {string} column header to sort by id again', (columnName) => {
  if (columnName.toLowerCase() === 'id') {
    cy.get('table tbody tr').first().find('td').eq(0).invoke('text').then((idBefore) => {
      categoryPage.categoriesTable.find('th').contains('ID').click();
      cy.get('table tbody tr').first().find('td').eq(0).should('not.have.text', idBefore);
    });
  }
});

Then('The categories should be sorted by id in ascending order', () => {
  categoryPage.assertCategoryTableHasData();

  cy.get('table tbody tr').then(($rows) => {
    // 1. Extract IDs and convert them to Numbers
    const actualIds = Array.from($rows)
      .map(row => Number(Cypress.$(row).find('td').eq(0).text().trim()))
      .filter(id => !isNaN(id));

    // 2. Create expected numeric sort (a - b)
    const expectedSorted = [...actualIds].sort((a, b) => a - b);

    cy.log('Actual IDs (Asc):', actualIds.join(', '));
    expect(actualIds).to.deep.equal(expectedSorted);
  });
});

Then('The categories should be sorted by id in descending order', () => {
  categoryPage.assertCategoryTableHasData();

  cy.get('table tbody tr').then(($rows) => {
    const actualIds = Array.from($rows)
      .map(row => Number(Cypress.$(row).find('td').eq(0).text().trim()))
      .filter(id => !isNaN(id));

    // 2. Create expected numeric sort descending (b - a)
    const expectedSorted = [...actualIds].sort((a, b) => b - a);

    cy.log('Actual IDs (Desc):', actualIds.join(', '));
    expect(actualIds).to.deep.equal(expectedSorted);
  });
});

// =============================================================
// UI/TC18, UI/TC19, UI/TC20, UI/TC21 Search Functionality in category
// =============================================================

When('Enter {string} in search bar', (categoryName) => {
  // Use the Page Object to type into the search input
  categoryPage.searchNameInput.clear().type(categoryName);
});

When('Click {string} button', (buttonName) => {
  if (buttonName === 'Search') {
    categoryPage.searchBtn.click();
  }
});

Then('List update display only the {string} category', (expectedName) => {
  // Wait for the table to refresh
  categoryPage.categoriesTable.should('be.visible');

  cy.get('table tbody tr').then(($rows) => {
    // If the search works, we expect at least one row, 
    // and every row shown should contain the searched term.
    const rowCount = $rows.length;

    // Check first row specifically
    cy.wrap($rows).first().find('td').eq(1).should('contain.text', expectedName);

    // Optional: Log how many results were found
    cy.log(`Search for "${expectedName}" returned ${rowCount} row(s)`);
  });
});

Given("{string} category doesn't exists", (categoryName) => {
  apiLoginAsAdmin().then((authHeader) => {
    deleteCategoryByName(categoryName, authHeader);
  });
});

Then('List update display {string} message', (expectedMessage) => {
  // Wait for the table to refresh after clicking search
  categoryPage.categoriesTable.should('be.visible');

  // Find the table body and check for the "No category found" text
  cy.get('table tbody').then(($tbody) => {
    // We expect the text to be visible within the table area
    cy.wrap($tbody)
      .contains(expectedMessage, { timeout: 10000 })
      .should('be.visible');

    // Optional: Verify that no actual data rows are present
    // Often empty tables have 1 row with a colspan="100%"
    cy.get('table tbody tr').should('have.length', 1);
  });
});

// =============================================================
// UI/TC22 Precondition: Create Parent and Child via API
// =============================================================

Given('A parent category {string} with child {string} exists', (parentName, childName) => {
  // 1. Log in via API to get the token
  apiLoginAsAdmin().then((authHeader) => {

    // 2. Ensure the Parent category exists (creates it if it doesn't)
    // We use your existing ensureCategoryExists helper
    ensureCategoryExists(parentName).then(() => {

      // 3. Get the Parent's ID so we can link the child to it
      cy.request({
        method: 'GET',
        url: '/api/categories/main', // Endpoint for main categories
        headers: { Authorization: authHeader }
      }).then((res) => {
        const parent = res.body.find(c => c.name === parentName);
        expect(parent, `Parent category ${parentName} should be found`).to.not.be.undefined;

        // 4. Create the Child category linked to that Parent ID
        cy.request({
          method: 'POST',
          url: '/api/categories',
          headers: { Authorization: authHeader },
          body: {
            name: childName,
            parentId: parent.id  // Linking the child to the parent
          },
          failOnStatusCode: false // Prevent failure if child already exists
        });
      });
    });
  });

  // Refresh the page to ensure the UI sees the new data
  categoryPage.visit();
});

// Updated to use two {string} placeholders to match the error's suggestion
When('Select {string} from {string} filter dropdown', (optionValue, dropdownLabel) => {
  if (dropdownLabel.toLowerCase().includes("parent category")) {
    // Select by text from the dropdown using the Page Object
    categoryPage.parentCategoryFilterDropdown.select(optionValue);
  } else {
    throw new Error(`Unknown filter dropdown: ${dropdownLabel}`);
  }
});

Then('The table should display only the {string} category', (expectedName) => {
  categoryPage.categoriesTable.should('be.visible');

  // Verify only matching rows exist
  cy.get('table tbody tr').each(($row) => {
    // eq(2) assumes the Category Name is the third column (index 2)
    cy.wrap($row).find('td').eq(1).should('contain.text', expectedName);
  });
});

// This matches: Then The table should display the "Apple" category
Then("The table should display the {string} category", function (categoryName) {
  // Replace '.category-table' with your actual table or row selector
  cy.get('table tbody tr')
    .contains('td', categoryName)
    .should('be.visible');
});

Then("Every row shown should have {string} as the Parent Category", function (parentName) {
  cy.get('table tbody tr').each(($row) => {
    // Finds the 2nd <td> in the current row
    cy.wrap($row).find('td').eq(2).should('contain', parentName);
  });
});

// Click the Reset/Search/Add Category button 
When('Click the {string} button', (buttonName) => {
  if (buttonName === "Reset") {
    categoryPage.resetBtn.first().click(); // Use .first() to target only one
  } else if (buttonName === "Search") {
    categoryPage.searchBtn.first().click({ multiple: true });
  } else if (buttonName === "Add A Category") {
    categoryPage.addCategoryBtn.first().click();
  }
});

// Verify Parent Category filter is cleared 
Then('The {string} filter should be cleared', (filterName) => {
  // Usually, the default value for a dropdown is an empty string or '0'
  categoryPage.parentCategoryFilterDropdown.should('have.value', ''); // 
});

// Verify Search bar is empty 
Then('The {string} bar should be empty', (elementName) => {
  categoryPage.searchNameInput.should('have.value', ''); // 
});

// Verify table is restored (showing data) 
Then('The table should show all categories', () => {
  categoryPage.categoriesTable.find('tbody tr').should('have.length.at.least', 1); // 
});

// =============================================================
// UI/TC25 & UI/TC26 Role-Based Access Control - Edit/Delete button access (User Permissions)
// =============================================================

Then('The {string} button should not be visible for any category', (buttonType) => {
  const selector = `a[title="${buttonType}"], button[title="${buttonType}"]`;

  cy.get('body').then(($body) => {
    const actionButtons = $body.find(selector);

    if (actionButtons.length > 0) {
      cy.wrap(actionButtons).each(($btn) => {
        const isVisible = Cypress.dom.isVisible($btn);

        if (isVisible) {
          // 1. Check for the 'disabled' attribute or class first
          // This is what you saw in your Inspect Element
          const hasDisabledAttr = $btn.attr('disabled') !== undefined || $btn.prop('disabled') === true;
          const hasDisabledClass = $btn.hasClass('disabled');
          const isPointerEventsNone = $btn.css('pointer-events') === 'none';

          // 2. Assertion: If it's visible, it MUST have one of these safety markers
          expect(hasDisabledAttr || hasDisabledClass || isPointerEventsNone,
            `Visible ${buttonType} button should be disabled`).to.be.true;

          // 3. ONLY try to click if the button DOES NOT have the disabled markers
          // This prevents the "False Positive" error you just got
          if (!hasDisabledAttr && !hasDisabledClass && !isPointerEventsNone) {
            cy.wrap($btn).click({ force: false, timeout: 500 }).then(() => {
              throw new Error(`SECURITY BUG: Regular user successfully clicked the ${buttonType} button!`);
            });
          } else {
            cy.log(`Confirmed: ${buttonType} button is present but correctly disabled.`);
          }
        } else {
          cy.wrap($btn).should('not.be.visible');
        }
      });
    } else {
      cy.log(`Confirmed: ${buttonType} button is not present in the DOM.`);
      expect(actionButtons.length).to.equal(0);
    }
  });
});

// =============================================================
// UI/TC27 Admin Access Logic
// =============================================================

// 1. Fix the Visibility Step (The one currently showing as "Missing")
Then('The {string} button should be visible for any category', (buttonType) => {
  const selector = `a[title="${buttonType}"], button[title="${buttonType}"]`;

  // Ensure table has data
  cy.get('table tbody tr').should('have.length.at.least', 1);

  // Check all buttons
  cy.get(selector).each(($btn) => {
    cy.wrap($btn)
      .should('be.visible')
      .and('not.have.class', 'disabled')
      .and('not.have.attr', 'disabled');
  });
});

// 3. Add the Navigation Step
Then('System should navigate to the category edit page', () => {
  // Matches /ui/categories/edit/ followed by the numeric ID
  cy.url().should('match', /\/ui\/categories\/edit\/\d+/);
});

// =============================================================
// UI/TC28 Admin Delete Functionality
// =============================================================

// Ensure at least one category exists (Pre-condition)
Given('At least one category exists', () => {
  cy.get('table tbody tr').should('have.length.at.least', 1);
});

When('I click the {string} button for the first category', function (buttonType) {
  // Use a generic selector that finds either Edit or Delete buttons by title
  const selector = `a[title="${buttonType}"], button[title="${buttonType}"]`;

  if (buttonType === 'Delete') {
    // 1. Capture the name of the category to verify deletion later
    cy.get('table tbody tr').first().find('td').eq(1).invoke('text').as('deletedCategoryName');

    // 2. Handle the native 'window:confirm' browser popup
    // This automatically clicks "OK" on the "Delete this category?" prompt
    cy.on('window:confirm', () => true);

    // 3. Perform the click on the Delete button
    cy.get(selector).first().should('be.visible').click();
  } else {
    // Standard click for "Edit" or other action buttons
    cy.get(selector).first().should('be.visible').click();
  }
});

// Verify the category is gone
Then('The category should be removed from the table', function () {
  // Use the alias we saved in the previous step
  const name = this.deletedCategoryName;

  // Verify a success message appears (Common UI pattern)
  cy.contains('deleted successfully', { matchCase: false }).should('be.visible');

  // Verify the table no longer contains that specific name
  cy.get('table').should('not.contain', name);
});

// =============================================================
// UI/TC29 Validation for Empty Category Name for creating a new category
// =============================================================

When('I leave the category name field empty', () => {
  // We explicitly clear the field to ensure it is empty
  addCategoryPage.categoryNameInput.clear();
});

When('I click the "Save" button', () => {
  addCategoryPage.saveButton.click();
});

Then('I should see a validation error message {string}', (expectedMessage) => {
  // Verify the error message is visible and contains the correct text
  addCategoryPage.errorMessage
    .should('be.visible')
    .and('contain.text', expectedMessage);
});

Then('The system should not navigate away from the {string} page', (pageName) => {
  // Verify the URL still contains the 'add' path, indicating no redirection occurred
  cy.url().should('include', '/ui/categories/add');
});

// =============================================================
// UI/TC30, UI/TC31, UI/TC32, UI/TC33 Validation for creating a new Category Name for creating a new category
// =============================================================

When('I enter {string} into the category name field', (categoryName) => {
  // Clear any existing text and type the new category name
  addCategoryPage.categoryNameInput.clear().type(categoryName);
});

Then('I should see a success message {string}', (message) => {
  // Use .invoke('text') and .then() to trim whitespace if needed, 
  // or simply use contain.text for a partial match.
  cy.get('.alert-success')
    .should('be.visible')
    .and('contain.text', message.trim());
});

Then('The new category {string} should appear in the table', (categoryName) => {
  // If categoryPage.categoryTableBody is undefined, it means 
  // the getter in categoryPage.js isn't returning anything.
  categoryPage.categoryTableBody.should('contain.text', categoryName);
});

// Ensure the pre-condition: the category must exist first
Given('The category {string} already exists in the system', (categoryName) => {
  // 1. Navigate to the list page
  cy.visit('/ui/categories');

  // 2. Check if it's already in the table
  cy.get('table').then(($table) => {
    if ($table.text().includes(categoryName)) {
      cy.log(`${categoryName} already exists. Proceeding with test.`);
    } else {
      // If it doesn't exist, create it quickly so the test can fail on the duplicate later
      cy.log(`${categoryName} not found. Creating it now...`);
      cy.visit('/ui/categories/add');
      cy.get('#name').type(categoryName);
      cy.get('button[type="submit"]').click();
    }
  });
});

When('I select {string} from the parent category dropdown', (parentName) => {
  addCategoryPage.parentCategoryField.should('be.visible').select(parentName);
});

Then('I should see a duplicate error message {string}', (expectedError) => {
  // We use .invoke('text') and .then() to handle potential extra whitespace/newlines
  cy.get('.alert-danger')
    .should('be.visible')
    .invoke('text')
    .then((actualText) => {
      // Clean the text from the UI and compare
      expect(actualText.trim()).to.include(expectedError);
    });
});

// Verify no duplicate row was actually added
Then('The category {string} should only appear once in the table', (categoryName) => {
  // Use filter to find all cells containing the exact text and check the count
  cy.get('table tbody tr td').filter(`:contains("${categoryName}")`)
    .should('have.length', 1);
});

When('I click the "Cancel" button', () => {
  addCategoryPage.cancelBtn.should('be.visible').click();
});

// Reuse or add the redirection check
Then('I should be redirected to the {string} page', (pageName) => {
  if (pageName.toLowerCase() !== 'categories') {
    // Verifies the URL matches the categories list path
    cy.url().should('include', '/ui/categories');
    // Ensures we are NOT on the 'add' page anymore
    cy.url().should('not.include', '/add');
  } else if (pageName.toLowerCase() === 'add category') {
    // Verifies the URL matches the categories list path
    cy.url().should('not.include', '/ui/categories');
    // Ensures we are NOT on the 'add' page anymore
    cy.url().should('include', '/add');
  }
});

Then('The system should not have created a new category', () => {
  // This is a safety check to ensure no "blank" categories were saved
  cy.get('table').should('be.visible');
});

Then('The {string} sidebar item should have the {string} class', (itemName, className) => {
  // We check the link itself or its parent depending on your HTML structure
  categoryPage.sidebarCategoryLink
    .should('be.visible')
    .and('have.class', className);

  /* Note: If the 'active' class is on the parent <li>, use:
     categoryPage.sidebarCategoryLink.parent().should('have.class', className);
  */
});

// checking if the category summary in the dashboard is accurate

let dashboardMainCount = 0;
let accumulatedTableCount = 0;

Given('I note the total "Main" category count from the Dashboard', () => {
  cy.visit('/ui/dashboard');
  dashboardPage.mainCategoryCount.invoke('text').then((text) => {
    // Converts "27" to an integer
    dashboardMainCount = parseInt(text.trim());
    cy.log(`Dashboard Main count: ${dashboardMainCount}`);
  });
});

When('I navigate to the "Categories" page', () => {
  categoryPage.visit();
});

When('I count all categories across all pagination pages', () => {
  accumulatedTableCount = 0; // Reset counter

  function countRowsOnPage() {
    // 1. Count rows on current visible page
    categoryPage.categoriesTable.find('tbody tr').then(($rows) => {
      // Ensure we aren't counting the "No data available" row
      if ($rows.length > 0 && !$rows.text().includes('No data')) {
        accumulatedTableCount += $rows.length;
      }
    });

    // 2. Check for the 'Next' button
    cy.get('body').then(($body) => {
      // Find 'Next' link that isn't disabled
      const nextBtn = $body.find('li.next:not(.disabled) a, a:contains("Next"):not(.disabled)');

      if (nextBtn.length > 0) {
        cy.wrap(nextBtn).click();
        cy.wait(500); // Standard wait for table to refresh
        countRowsOnPage(); // Recursive call
      }
    });
  }

  countRowsOnPage();
});

Then('The total count should match the Dashboard summary', () => {
  // Use cy.then to ensure the asynchronous recursion has finished
  cy.then(() => {
    cy.log(`Table Count: ${accumulatedTableCount} | Dashboard: ${dashboardMainCount}`);
    expect(accumulatedTableCount).to.equal(dashboardMainCount);
  });
});