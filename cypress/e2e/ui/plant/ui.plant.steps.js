import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import {
  loginAsAdmin,
  loginAsUser,
} from "../../preconditions/login.preconditions";
import { plantPage } from "../../../support/pages/plantPage";
import { addPlantPage } from "../../../support/pages/addPlantPage";

let selectedPlantCategoryFilterName;
let plantCategoryColumnIndex;
let plantSearchText;
let plantStockColumnIndex;
let lowStockRowIndex;

// =============================================================
// Shared Preconditions / Navigation
// =============================================================

Given("I am logged in as Admin", () => {
  loginAsAdmin();
});

Given("I am logged in as User", () => {
  loginAsUser();
});

Given("I am on the Dashboard page", () => {
  cy.location("pathname", { timeout: 10000 }).should("include", "/dashboard");
});

Given("I am on the {string} page", (/** @type {string} */ pageName) => {
  const page = String(pageName).trim().toLowerCase();

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

  if (page === "dashboard" || page.includes("dashboard")) {
    cy.location("pathname", { timeout: 10000 }).should("include", "/dashboard");
    return;
  }

  if (page.startsWith("/")) {
    cy.visit(page);
    return;
  }

  throw new Error(`Unknown page name/path: ${pageName}`);
});

When("I click the {string} menu", (/** @type {string} */ menuName) => {
  const menu = String(menuName).trim().toLowerCase();

  if (menu === "plants" || menu === "plant") {
    plantPage.plantsMenu.should("be.visible").click();
    return;
  }

  throw new Error(`Unknown menu: ${menuName}`);
});

// =============================================================
// UI/TC112 Verify Plant List page visibility
// =============================================================

Then(
  "I should be redirected to the {string} page",
  (/** @type {string} */ pageName) => {
    const page = String(pageName).trim().toLowerCase();

    if (page === "plants" || page === "plant") {
      plantPage.assertOnPlantsPage();
      return;
    }

    if (page === "dashboard") {
      cy.location("pathname", { timeout: 10000 }).should(
        "include",
        "/dashboard",
      );
      return;
    }

    throw new Error(`Unknown page: ${pageName}`);
  },
);

Then("I should see the plant list table", () => {
  plantPage.plantsTable.should("be.visible");
});

// =============================================================
// UI/TC113 Verify Add Plant button visibility
// =============================================================

Then("I should see the {string} button", (/** @type {string} */ buttonText) => {
  const text = String(buttonText).replaceAll(/\s+/g, " ").trim();

  // TC113 expects "Add Plant".
  if (/^add\s+(a\s+)?plant$/i.test(text)) {
    plantPage.addPlantBtn.should("be.visible");
    return;
  }

  cy.contains("a, button", text, { matchCase: false }).should("be.visible");
});

// =============================================================
// UI/TC114 Verify "Add Plant" Page Navigation
// =============================================================

When("Click the {string} button", (/** @type {string} */ buttonText) => {
  const text = String(buttonText).replaceAll(/\s+/g, " ").trim();

  // TC114 uses "Add a Plant".
  if (/^add\s+(a\s+)?plant$/i.test(text)) {
    plantPage.addPlantBtn.should("be.visible").click();
    return;
  }

  cy.contains("a, button", text, { matchCase: false })
    .should("be.visible")
    .click();
});

Then("System redirect to {string}", (/** @type {string} */ path) => {
  cy.location("pathname", { timeout: 10000 }).should("eq", path);
});

// =============================================================
// UI/TC115 Verify Creating a New Plant
// =============================================================

When(
  "Enter {string} in {string}",
  (/** @type {string} */ value, /** @type {string} */ fieldName) => {
    const field = String(fieldName)
      .replaceAll(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const textValue = String(value);

    if (field.includes("plant") && field.includes("name")) {
      addPlantPage.plantNameField.should("be.visible").clear().type(textValue);
      return;
    }

    if (field.includes("price")) {
      addPlantPage.priceField.should("be.visible").clear().type(textValue);
      return;
    }

    if (field.includes("quantity")) {
      addPlantPage.quantityField.should("be.visible").clear().type(textValue);
      return;
    }

    throw new Error(`Unknown input field: ${fieldName}`);
  },
);

When(
  "Select {string} from {string}",
  (/** @type {string} */ optionValue, /** @type {string} */ fieldName) => {
    const field = String(fieldName)
      .replaceAll(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const optionText = String(optionValue).replaceAll(/\s+/g, " ").trim();

    if (!field.includes("category")) {
      throw new Error(`Unknown select field: ${fieldName}`);
    }

    const desired = optionText.toLowerCase();

    return addPlantPage.categoryField.should("be.visible").then(($select) => {
      const options = Array.from($select[0].options || []).map((o) => ({
        value: o.value,
        text: String(o.text ?? "")
          .replaceAll(/\s+/g, " ")
          .trim(),
      }));

      const match = options.find((o) => o.text.toLowerCase() === desired);
      const fallback = options.find((o) => o.value && o.text);
      const toSelect = match?.value || fallback?.value;

      if (!toSelect) {
        throw new Error(
          `No selectable Category option found for '${optionText}'`,
        );
      }

      return cy.wrap($select).select(toSelect);
    });
  },
);

When("Click {string} button", (/** @type {string} */ buttonText) => {
  const requested = String(buttonText)
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (requested === "save") {
    // Add Plant form uses a submit button.
    return addPlantPage.submitBtn.should("be.visible").first().click();
  }

  return cy
    .contains("button, a", requested, { matchCase: false })
    .should("be.visible")
    .click();
});

Then("System redirects to the plant list", () => {
  cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
});

Then(
  "{string} appears in the plant table",
  (/** @type {string} */ plantName) => {
    const name = String(plantName);
    plantPage.plantsTable.should("be.visible");
    cy.get("table").within(() => {
      cy.contains("td", name, { timeout: 10000 }).should("be.visible");
    });
  },
);

Then("Show {string} message", (/** @type {string} */ successMessage) => {
  const message = String(successMessage);

  // TC120 uses an empty-state row inside the table.
  if (/^no\s+plants\s+found$/i.test(message.trim())) {
    plantPage.plantsTable.should("be.visible").should("contain.text", message);
    return;
  }

  cy.contains(message, { timeout: 10000 }).should("be.visible");
});

// =============================================================
// UI/TC116 Verify Plant List Pagination
// =============================================================

let plantPageRowsSnapshot;

const normalizeText = (s) =>
  String(s ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

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

const ensureCategoryExistsViaApi = (categoryName) => {
  const name = String(categoryName).replaceAll(/\s+/g, " ").trim();
  const desiredLower = name.toLowerCase();

  return apiLoginAsAdmin().then((authHeader) => {
    const getParentIdForSubCategory = () => {
      return cy
        .request({
          method: "GET",
          url: "/api/categories/main",
          headers: { Authorization: authHeader },
          failOnStatusCode: false,
        })
        .then((res) => {
          const parents = Array.isArray(res?.body) ? res.body : [];
          const indoor = parents.find(
            (p) => String(p?.name ?? "").toLowerCase() === "indoor",
          );
          const parentId = indoor?.id ?? parents?.[0]?.id;
          if (!parentId) {
            throw new Error(
              "No main categories found; cannot create a sub-category for Plants filter",
            );
          }
          return parentId;
        });
    };

    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const content = Array.isArray(res?.body?.content)
          ? res.body.content
          : [];
        const match = content.find(
          (c) => String(c?.name ?? "").toLowerCase() === desiredLower,
        );

        // Plants page category filter uses sub-categories, so ensure the category has a parent.
        const isSubCategory =
          match?.id && String(match?.parentName ?? "-") !== "-";

        if (isSubCategory) return;

        return getParentIdForSubCategory().then((parentId) => {
          // If an existing main-category match exists, remove it first.
          const deleteExisting = match?.id
            ? cy.request({
                method: "DELETE",
                url: `/api/categories/${match.id}`,
                headers: { Authorization: authHeader },
                failOnStatusCode: false,
              })
            : cy.wrap(null);

          return deleteExisting.then(() => {
            return cy.request({
              method: "POST",
              url: "/api/categories",
              headers: { Authorization: authHeader },
              body: { name, parentId },
              failOnStatusCode: false,
            });
          });
        });
      });
  });
};

const ensureAtLeastOnePlantInCategory = (categoryName) => {
  const name = String(categoryName).replaceAll(/\s+/g, " ").trim();
  const desiredLower = name.toLowerCase();

  return apiLoginAsAdmin().then((authHeader) => {
    return cy
      .request({
        method: "GET",
        url: "/api/plants/paged?page=0&size=200",
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const plants = Array.isArray(res?.body?.content)
          ? res.body.content
          : [];
        const exists = plants.some(
          (p) => String(p?.category?.name ?? "").toLowerCase() === desiredLower,
        );
        if (exists) return;

        const uniqueName = `AutoPlant_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        addPlantPage.visitAddPlantPage();
        addPlantPage.assertOnAddPlantPage();

        addPlantPage.plantNameField
          .should("be.visible")
          .clear()
          .type(uniqueName);
        addPlantPage.priceField.should("be.visible").clear().type("100");
        addPlantPage.quantityField.should("be.visible").clear().type("1");

        return addPlantPage.categoryField
          .should("be.visible")
          .then(($select) => {
            const options = Array.from($select[0].options || []).map((o) => ({
              value: o.value,
              text: normalizeText(o.text),
            }));

            const exact = options.find(
              (o) => o.text.toLowerCase() === desiredLower,
            );
            if (!exact?.value) {
              throw new Error(
                `Category '${name}' was not present in Add Plant category dropdown`,
              );
            }

            return cy
              .wrap($select)
              .select(exact.value)
              .then(() =>
                addPlantPage.submitBtn.should("be.visible").first().click(),
              )
              .then(() => {
                cy.location("pathname", { timeout: 10000 }).should(
                  "eq",
                  "/ui/plants",
                );
              });
          });
      });
  });
};

const captureTopRowsSnapshot = (maxRows = 3) => {
  return cy.get("table tbody tr").then(($rows) => {
    const limit = Math.min(Number(maxRows) || 0, $rows.length);
    return Array.from($rows)
      .slice(0, limit)
      .map((r) => normalizeText(r.innerText));
  });
};

const isNextEnabled = () => {
  return cy.get("body").then(($body) => {
    const $pagination = $body.find(".pagination");
    if ($pagination.length === 0) return false;

    const $next = $pagination.find('a:contains("Next")');
    if ($next.length === 0) return false;

    return !$next.closest(".page-item").hasClass("disabled");
  });
};

const createPlantViaUI = (index) => {
  const uniqueName = `AutoPlant_${Date.now()}_${index}`;

  addPlantPage.visitAddPlantPage();
  addPlantPage.assertOnAddPlantPage();

  addPlantPage.plantNameField.should("be.visible").clear().type(uniqueName);
  addPlantPage.priceField.should("be.visible").clear().type("100");
  addPlantPage.quantityField.should("be.visible").clear().type("1");

  // Keep category selection simple: prefer "Indoor" if present, otherwise choose the first real option.
  const selectCategory = () => {
    return addPlantPage.categoryField.should("be.visible").then(($select) => {
      const options = Array.from($select[0].options || []).map((o) => ({
        value: o.value,
        text: normalizeText(o.text),
      }));

      const preferred = options.find((o) => o.text.toLowerCase() === "indoor");
      const fallback = options.find((o) => o.value && o.text);
      const toSelect = preferred?.value || fallback?.value;
      if (!toSelect) return;

      return cy.wrap($select).select(toSelect);
    });
  };

  const clickSave = () => {
    return cy.get("body").then(($body) => {
      const submitSelector = 'button[type="submit"], input[type="submit"]';
      if ($body.find(submitSelector).length > 0) {
        return cy.get(submitSelector).first().should("be.visible").click();
      }

      return cy
        .contains("button", /^save$/i)
        .should("be.visible")
        .click();
    });
  };

  return selectCategory()
    .then(() => clickSave())
    .then(() => {
      cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
      plantPage.plantsTable.should("be.visible");
    });
};

Given("More than 10 plants exist", () => {
  plantPage.assertOnPlantsPage();
  plantPage.plantsTable.should("be.visible");

  const maxCreates = 25;

  const ensurePagination = (created = 0) => {
    return isNextEnabled().then((enabled) => {
      if (enabled) return;
      if (created >= maxCreates) {
        throw new Error(
          `Could not enable pagination after creating ${created} plants.`,
        );
      }

      return createPlantViaUI(created)
        .then(() => {
          cy.reload();
          plantPage.assertOnPlantsPage();
          plantPage.plantsTable.should("be.visible");
        })
        .then(() => ensurePagination(created + 1));
    });
  };

  return ensurePagination(0);
});

When("Click the {string} pagination button", (label) => {
  const direction = String(label).trim().toLowerCase();
  if (direction !== "next") {
    throw new Error(`Unsupported pagination button: ${label}`);
  }

  plantPage.plantsTable.should("be.visible");

  return captureTopRowsSnapshot(3).then((snapshot) => {
    plantPageRowsSnapshot = snapshot;

    cy.scrollTo("bottom", { ensureScrollable: false });
    cy.get(".pagination")
      .should("be.visible")
      .find('a:contains("Next")')
      .should("be.visible")
      .closest(".page-item")
      .should("not.have.class", "disabled")
      .find("a")
      .click();
  });
});

Then("The next set of plants should be displayed", () => {
  expect(plantPageRowsSnapshot, "initial rows snapshot").to.exist;
  plantPage.plantsTable.should("be.visible");

  captureTopRowsSnapshot(3).should((current) => {
    expect(
      current,
      "rows snapshot changed after clicking Next",
    ).to.not.deep.equal(plantPageRowsSnapshot);
  });
});

// =============================================================
// UI/TC117 Verify Filter Plant by Category
// =============================================================

When("Select {string} from category filter", (categoryName) => {
  selectedPlantCategoryFilterName = String(categoryName)
    .replaceAll(/\s+/g, " ")
    .trim();

  // Make the test data reliable: ensure the category exists and has at least one plant.
  return ensureCategoryExistsViaApi(selectedPlantCategoryFilterName)
    .then(() =>
      ensureAtLeastOnePlantInCategory(selectedPlantCategoryFilterName),
    )
    .then(() => {
      plantPage.visitPlantPage();
      plantPage.assertOnPlantsPage();
      plantPage.plantsTable.should("be.visible");

      // Find a category filter dropdown on the Plants page.
      return cy.get("select").then(($selects) => {
        const desired = selectedPlantCategoryFilterName.toLowerCase();

        const candidates = $selects.toArray().filter((sel) => {
          const id = String(sel.getAttribute("id") || "").toLowerCase();
          const name = String(sel.getAttribute("name") || "").toLowerCase();
          return id.includes("category") || name.includes("category");
        });

        const pool = candidates.length > 0 ? candidates : $selects.toArray();
        if (pool.length === 0) throw new Error("No select dropdown found");

        // Prefer a dropdown that contains the desired option text.
        const match = pool.find((sel) => {
          const options = Array.from(sel.options || []);
          return options.some(
            (o) => normalizeText(o.text).toLowerCase() === String(desired),
          );
        });

        const chosen = match ?? pool[0];
        const options = Array.from(chosen.options || []).map((o) => ({
          value: o.value,
          text: normalizeText(o.text),
        }));

        const exact = options.find((o) => o.text.toLowerCase() === desired);

        if (!exact?.value) {
          throw new Error(
            `Category filter does not contain option '${selectedPlantCategoryFilterName}'`,
          );
        }

        const chosenIndex = $selects.toArray().indexOf(chosen);
        if (chosenIndex < 0) {
          throw new Error("Unable to resolve category filter dropdown index");
        }

        // Re-query by index so Cypress has a real <select> subject.
        return cy
          .get("select")
          .eq(chosenIndex)
          .should("be.visible")
          .select(String(exact.value), { force: true });
      });
    });
});

Then(
  "Only plants under {string} category should be displayed",
  (categoryName) => {
    const expected = String(categoryName).replaceAll(/\s+/g, " ").trim();
    const expectedLower = expected.toLowerCase();

    plantPage.assertOnPlantsPage();
    plantPage.plantsTable.should("be.visible");

    // Determine which column is "Category" then assert rows (retryable).
    cy.get("table thead tr th")
      .then(($ths) => {
        const headers = Array.from($ths).map((th) =>
          normalizeText(th.innerText).toLowerCase(),
        );
        plantCategoryColumnIndex = headers.findIndex((h) =>
          h.includes("category"),
        );
      })
      .then(() => {
        return cy.get("table tbody tr").should(($rows) => {
          const dataRows = Array.from($rows).filter(
            (row) => Cypress.$(row).find("td[colspan]").length === 0,
          );

          expect(dataRows.length, "rows after filtering").to.be.greaterThan(0);

          dataRows.forEach((row) => {
            const $tds = Cypress.$(row).find("td");
            if ($tds.length === 0) return;

            const idx = Number.isInteger(plantCategoryColumnIndex)
              ? plantCategoryColumnIndex
              : -1;

            // If we can't locate the category column, fall back to checking the whole row text.
            if (idx < 0 || idx >= $tds.length) {
              const rowText = normalizeText(
                Cypress.$(row).text(),
              ).toLowerCase();
              expect(rowText).to.include(expectedLower);
              return;
            }

            const cellText = normalizeText(
              Cypress.$($tds[idx]).text(),
            ).toLowerCase();
            expect(cellText).to.include(expectedLower);
          });
        });
      });
  },
);

// =============================================================
// UI/TC118 Verify Plant Search by Name
// =============================================================

Given("I am logged in as Non-Admin", () => {
  // Non-admin user has the same permissions as a regular User in this suite.
  loginAsUser();
});

When("Enter {string} in search field", (searchText) => {
  const text = String(searchText);
  plantSearchText = text;

  plantPage.assertOnPlantsPage();

  // Keep it minimal + robust: only target clearable visible text/search inputs.
  return cy
    .get(
      'input:not([type]), input[type="text"], input[type="search"], textarea',
    )
    .filter(":visible")
    .first()
    .should("be.visible")
    .clear({ force: true })
    .type(text, { force: true });
});

Then("Matching plants should be displayed in the table", () => {
  plantPage.assertOnPlantsPage();
  plantPage.plantsTable.should("be.visible");

  const expected = normalizeText(plantSearchText || "");

  cy.get("table tbody tr").should(($rows) => {
    const dataRows = Array.from($rows).filter(
      (row) => Cypress.$(row).find("td[colspan]").length === 0,
    );

    expect(dataRows.length, "rows after search").to.be.greaterThan(0);

    if (expected) {
      const expectedLower = expected.toLowerCase();
      dataRows.forEach((row) => {
        const rowText = normalizeText(Cypress.$(row).text()).toLowerCase();
        expect(rowText).to.include(expectedLower);
      });
    }
  });
});

// =============================================================
// UI/TC119 Verify Action Buttons are Hidden for Non-Admin
// =============================================================

Then(
  "I should not see {string} and {string} buttons",
  (editLabel, deleteLabel) => {
    const wantEdit = String(editLabel || "edit")
      .trim()
      .toLowerCase();
    const wantDelete = String(deleteLabel || "delete")
      .trim()
      .toLowerCase();

    plantPage.assertOnPlantsPage();
    plantPage.plantsTable.should("be.visible");

    cy.get("table thead tr th").then(($ths) => {
      const headers = Array.from($ths).map((th) =>
        normalizeText(th.innerText).toLowerCase(),
      );
      const actionsIdx = headers.findIndex((h) => h.includes("actions"));

      cy.get("table tbody tr").each(($row) => {
        const $tds = Cypress.$($row).find("td");
        if ($tds.length === 0) return;
        if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;

        const idx = actionsIdx >= 0 ? actionsIdx : $tds.length - 1;
        const $cell = Cypress.$($tds[idx]);

        const $edit = $cell.find(
          'a[title="Edit"], a[href*="/ui/plants/edit"], button[title="Edit"]',
        );
        const $del = $cell.find(
          'button[title="Delete"], a[title="Delete"], form[action*="/ui/plants/delete"] button',
        );

        const assertHiddenOrDisabled = ($el, label) => {
          if ($el.length === 0) return;

          cy.wrap($el[0]).should(($node) => {
            const $n = Cypress.$($node);
            const disabledAttr =
              $n.is(":disabled") ||
              $n.is("[disabled]") ||
              $n.attr("aria-disabled") === "true";
            const className = String($n.attr("class") || "");
            const disabledClass = className.split(/\s+/g).includes("disabled");

            expect(
              disabledAttr || disabledClass,
              `${label} action should be hidden or disabled for non-admin`,
            ).to.eq(true);
          });
        };

        if (wantEdit.includes("edit")) assertHiddenOrDisabled($edit, "Edit");
        if (wantDelete.includes("delete"))
          assertHiddenOrDisabled($del, "Delete");
      });
    });
  },
);

// =============================================================
// UI/TC121 Verify Low Stock Badge Visibility
// =============================================================

When("Plant quantity is less than 5", () => {
  plantPage.assertOnPlantsPage();
  plantPage.plantsTable.should("be.visible");

  // Identify the "Stock" column index.
  return cy
    .get("table thead tr th")
    .then(($ths) => {
      const headers = Array.from($ths).map((th) =>
        normalizeText(th.innerText).toLowerCase(),
      );
      plantStockColumnIndex = headers.findIndex(
        (h) =>
          h === "stock" ||
          h.includes("stock") ||
          h.includes("quantity") ||
          h.includes("qty") ||
          h.includes("available"),
      );
    })
    .then(() => {
      return cy.get("table tbody tr").then(($rows) => {
        const dataRows = Array.from($rows).filter(
          (row) => Cypress.$(row).find("td[colspan]").length === 0,
        );

        const idx = Number.isInteger(plantStockColumnIndex)
          ? plantStockColumnIndex
          : -1;

        const findByBadgeText = () => {
          return dataRows.findIndex((row) => {
            const rowText = normalizeText(Cypress.$(row).text()).toLowerCase();
            return rowText.includes("low stock");
          });
        };

        const findByNumericStock = () => {
          if (idx < 0) return -1;

          return dataRows.findIndex((row) => {
            const $tds = Cypress.$(row).find("td");
            if ($tds.length === 0) return false;
            if (idx >= $tds.length) return false;

            const raw = normalizeText(Cypress.$($tds[idx]).text());
            const n = Number.parseInt(raw.replaceAll(/[^0-9-]/g, ""), 10);
            return Number.isFinite(n) && n < 5;
          });
        };

        const foundIndex = findByNumericStock();
        const fallbackIndex = foundIndex >= 0 ? foundIndex : findByBadgeText();

        if (fallbackIndex < 0) {
          throw new Error(
            "No low-stock row found (stock/quantity < 5, or a 'Low Stock' badge). Seed a low-stock plant or reset DB.",
          );
        }

        lowStockRowIndex = fallbackIndex;
      });
    });
});

Then("I should see the {string} badge", (badgeText) => {
  expect(lowStockRowIndex, "low-stock row index").to.be.a("number");

  const expected = String(badgeText).replaceAll(/\s+/g, " ").trim();
  const expectedLower = expected.toLowerCase();

  plantPage.assertOnPlantsPage();
  plantPage.plantsTable.should("be.visible");

  cy.get("table tbody tr")
    .then(($rows) => {
      const dataRows = Array.from($rows).filter(
        (row) => Cypress.$(row).find("td[colspan]").length === 0,
      );
      const row = dataRows[lowStockRowIndex];
      if (!row) throw new Error("Low-stock row was not found in the table");
      return cy.wrap(row);
    })
    .should(($row) => {
      const rowText = normalizeText($row.text()).toLowerCase();
      if (rowText.includes(expectedLower)) return;

      // Fallback: some UIs show a badge as an icon with accessible text.
      const attrNodes = $row.find("[title], [aria-label]").toArray();
      const hasMatchingAttr = attrNodes.some((el) => {
        const title = String(el.getAttribute("title") ?? "").toLowerCase();
        const aria = String(el.getAttribute("aria-label") ?? "").toLowerCase();
        return title.includes(expectedLower) || aria.includes(expectedLower);
      });

      expect(
        hasMatchingAttr,
        `Expected to find badge '${expected}' in the low-stock row`,
      ).to.eq(true);
    });
});
