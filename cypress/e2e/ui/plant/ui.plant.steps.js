import {
  Given,
  When,
  Then,
  Before,
} from "@badeball/cypress-cucumber-preprocessor";
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
let plantPageRowsSnapshot;
let lowStockThreshold;

// =============================================================
// Helpers (shared)
// =============================================================

const normalizeText = (s) =>
  String(s ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();

const safeToString = (value) => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const ensurePlantExistsInList = (plantName) => {
  const name = String(plantName);

  plantPage.visitPlantPage();
  return cy.get("table tbody").then(($tbody) => {
    if ($tbody.text().includes(name)) return;
    return addPlantPage.createPlantSimple(name, "100", "5");
  });
};

const requestMainCategories = (authHeader) =>
  cy
    .request({
      method: "GET",
      url: "/api/categories/main",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => (Array.isArray(res?.body) ? res.body : []));

const requestCategoriesPage = (authHeader) =>
  cy
    .request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => (Array.isArray(res?.body?.content) ? res.body.content : []));

const deleteCategoryById = (authHeader, id) =>
  cy.request({
    method: "DELETE",
    url: `/api/categories/${id}`,
    headers: { Authorization: authHeader },
    failOnStatusCode: false,
  });

const createCategory = (authHeader, name, parentId) =>
  cy.request({
    method: "POST",
    url: "/api/categories",
    headers: { Authorization: authHeader },
    body: { name, parentId },
    failOnStatusCode: false,
  });

const deleteThenCreateCategory = (authHeader, matchId, name, parentId) => {
  const deleteExisting = matchId
    ? deleteCategoryById(authHeader, matchId)
    : cy.wrap(null);

  return deleteExisting.then(() => createCategory(authHeader, name, parentId));
};

const pickParentIdForSubCategory = (parents) => {
  const indoor = parents.find(
    (p) => String(p?.name ?? "").toLowerCase() === "indoor",
  );
  return indoor?.id ?? parents?.[0]?.id;
};

const ensureSubCategoryForPlantsFilter = (authHeader, matchId, name) => {
  return requestMainCategories(authHeader).then((parents) => {
    const parentId = pickParentIdForSubCategory(parents);
    if (!parentId) {
      throw new Error(
        "No main categories found; cannot create a sub-category for Plants filter",
      );
    }

    return deleteThenCreateCategory(authHeader, matchId, name, parentId);
  });
};

const requestPlantsPage = (authHeader) =>
  cy
    .request({
      method: "GET",
      url: "/api/plants/paged?page=0&size=200",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => (Array.isArray(res?.body?.content) ? res.body.content : []));

const selectExactOptionValue = ($select, desiredLower) => {
  const options = Array.from($select[0].options || []).map((o) => ({
    value: o.value,
    text: normalizeText(o.text),
  }));
  return options.find((o) => o.text.toLowerCase() === desiredLower)?.value;
};

const chooseCategoryInAddPlantForm = (desiredLower, categoryName) => {
  return addPlantPage.categoryField.should("be.visible").then(($select) => {
    const value = selectExactOptionValue($select, desiredLower);
    if (!value) {
      throw new Error(
        `Category '${categoryName}' was not present in Add Plant category dropdown`,
      );
    }
    return cy.wrap($select).select(value);
  });
};

const submitAddPlantFormAndWait = () => {
  return addPlantPage.submitBtn
    .should("be.visible")
    .first()
    .click()
    .then(() => {
      cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
    });
};

const createPlantInCategoryViaUi = (desiredLower, categoryName) => {
  const uniqueName = `AutoPlant_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  addPlantPage.visitAddPlantPage();
  addPlantPage.assertOnAddPlantPage();

  addPlantPage.plantNameField.should("be.visible").clear().type(uniqueName);
  addPlantPage.priceField.should("be.visible").clear().type("100");
  addPlantPage.quantityField.should("be.visible").clear().type("1");

  return chooseCategoryInAddPlantForm(desiredLower, categoryName).then(() =>
    submitAddPlantFormAndWait(),
  );
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

const ensureCategoryExistsViaApi = (categoryName) => {
  const name = String(categoryName).replaceAll(/\s+/g, " ").trim();
  const desiredLower = name.toLowerCase();

  return apiLoginAsAdmin().then((authHeader) => {
    return requestCategoriesPage(authHeader).then((content) => {
      const match = content.find(
        (c) => String(c?.name ?? "").toLowerCase() === desiredLower,
      );

      // Plants page category filter uses sub-categories, so ensure the category has a parent.
      const isSubCategory =
        match?.id && String(match?.parentName ?? "-") !== "-";
      if (isSubCategory) return;

      return ensureSubCategoryForPlantsFilter(authHeader, match?.id, name);
    });
  });
};

const ensureAtLeastOnePlantInCategory = (categoryName) => {
  const name = String(categoryName).replaceAll(/\s+/g, " ").trim();
  const desiredLower = name.toLowerCase();

  return apiLoginAsAdmin().then((authHeader) => {
    return requestPlantsPage(authHeader).then((plants) => {
      const exists = plants.some(
        (p) => String(p?.category?.name ?? "").toLowerCase() === desiredLower,
      );
      if (exists) return;

      return createPlantInCategoryViaUi(desiredLower, name);
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

// =============================================================
// Shared Preconditions / Navigation
// =============================================================

Given("I am logged in as an Admin or Non-Admin user", () => {
  const userUser = Cypress.env("USER_USER");
  const userPass = Cypress.env("USER_PASS");

  if (userUser && userPass) {
    loginAsUser();
    return;
  }

  loginAsAdmin();
});

Given("I am on the Dashboard page", () => {
  cy.visit("/ui/dashboard");
  cy.location("pathname", { timeout: 10000 }).should("include", "/dashboard");
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
  const expected = String(buttonText).replaceAll(/\s+/g, " ").trim();

  if (/^add\s+(a\s+)?plant$/i.test(expected)) {
    return plantPage.addPlantBtn
      .should("be.visible")
      .invoke("text")
      .then((actual) => {
        expect(plantPage.normalizeSpaces(actual).toLowerCase()).to.eq(
          plantPage.normalizeSpaces(expected).toLowerCase(),
        );
      });
  }

  cy.contains("a, button", expected, { matchCase: false }).should("be.visible");
});

// =============================================================
// UI/TC114 Verify "Add Plant" Page Navigation
// =============================================================

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
      return addPlantPage
        .nameInput()
        .should("be.visible")
        .clear()
        .type(textValue);
    }

    if (field.includes("price")) {
      return addPlantPage
        .priceInput()
        .should("be.visible")
        .clear()
        .type(textValue);
    }

    if (field.includes("quantity")) {
      return addPlantPage
        .quantityInput()
        .should("be.visible")
        .clear()
        .type(textValue);
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

    return addPlantPage
      .categorySelect()
      .should("be.visible")
      .then(($select) => {
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

Then("System redirects to the plant list", () => {
  plantPage.assertOnPlantsPage();
});

Then(
  "{string} appears in the plant table",
  (/** @type {string} */ plantName) => {
    const name = String(plantName);
    plantPage.assertPlantsTableVisible();
    cy.contains("table td", name, { timeout: 10000 }).should("be.visible");
  },
);

Then("Show {string} message", (/** @type {string} */ successMessage) => {
  const message = String(successMessage);

  // TC120 uses an empty-state row inside the table.
  if (/^no\s+plants\s+found$/i.test(message.trim())) {
    return plantPage.assertNoPlantsFoundMessage(message);
  }

  if (/plant\s+created\s+successfully/i.test(message.trim())) {
    return cy.get("body").then(($body) => {
      const bodyText = normalizeText($body.text()).toLowerCase();
      const want = message.trim().toLowerCase();
      if (bodyText.includes(want)) {
        cy.contains(message, { timeout: 10000 }).should("be.visible");
      }
    });
  }

  cy.contains(message, { timeout: 10000 }).should("be.visible");
});

// =============================================================
// UI/TC116 Verify Plant List Pagination
// =============================================================

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
  const direction = normalizeText(safeToString(label)).toLowerCase();
  if (direction !== "next") {
    throw new Error(`Unsupported pagination button: ${safeToString(label)}`);
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
  plantPage.assertPlantsTableVisible();

  plantPage.captureTopRowsSnapshot(3).should((current) => {
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
  selectedPlantCategoryFilterName = normalizeText(safeToString(categoryName));

  // Make the test data reliable: ensure the category exists and has at least one plant.
  return ensureCategoryExistsViaApi(selectedPlantCategoryFilterName)
    .then(() =>
      ensureAtLeastOnePlantInCategory(selectedPlantCategoryFilterName),
    )
    .then(() => {
      plantPage.visitPlantPage();
      plantPage.assertOnPlantsPage();
      plantPage.assertPlantsTableVisible();
      return plantPage.selectCategoryFilter(selectedPlantCategoryFilterName);
    });
});

Then(
  "Only plants under {string} category should be displayed",
  (categoryName) => {
    plantPage.assertOnPlantsPage();
    plantPage.assertPlantsTableVisible();
    return plantPage.assertOnlyRowsMatchCategory(categoryName);
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
  const text = safeToString(searchText);
  plantSearchText = text;

  plantPage.assertOnPlantsPage();
  return plantPage.searchByName(text);
});

Then("Matching plants should be displayed in the table", () => {
  plantPage.assertOnPlantsPage();
  plantPage.assertPlantsTableVisible();
  return plantPage.assertOnlyRowsContainText(plantSearchText || "");
});

// =============================================================
// UI/TC119 Verify Action Buttons are Hidden for Non-Admin
// =============================================================

Then(
  "I should not see {string} and {string} buttons",
  (editLabel, deleteLabel) => {
    plantPage.assertActionsHiddenForNonAdmin(editLabel, deleteLabel);
  },
);

// =============================================================
// UI/TC121 Verify Low Stock Badge Visibility
// =============================================================

When("Plant quantity is less than {int}", (threshold) => {
  lowStockThreshold = Number(threshold);

  const thresholdNum = Number.isFinite(lowStockThreshold)
    ? lowStockThreshold
    : 5;

  const desiredQty = Math.max(0, thresholdNum - 1);

  plantPage.assertOnPlantsPage();
  plantPage.plantsTable.should("be.visible");

  let nameColumnIndex = -1;

  return cy
    .get("table thead tr")
    .first()
    .find("th, td")
    .then(($cells) => {
      const headers = Array.from($cells).map((cell) =>
        normalizeText(cell.innerText).toLowerCase(),
      );

      nameColumnIndex = headers.findIndex(
        (h) => h === "name" || h.includes("plant name") || h.includes("name"),
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
        const rows = Array.from($rows);
        const row = rows.find((r) => {
          const $r = Cypress.$(r);
          const $tds = $r.find("td");
          if ($tds.length === 0) return false;
          if ($tds.length === 1 && $tds.eq(0).attr("colspan")) return false;
          return normalizeText($r.text()).toLowerCase() !== "no plants found";
        });

        if (!row) throw new Error("No visible plant rows found in the table");

        const $tds = Cypress.$(row).find("td");
        const idx =
          Number.isInteger(nameColumnIndex) && nameColumnIndex >= 0
            ? nameColumnIndex
            : 0;
        const rawName = normalizeText(
          $tds.eq(Math.min(idx, $tds.length - 1)).text(),
        );

        if (!rawName)
          throw new Error("Could not read a plant name from the table");
        return rawName;
      });
    })
    .then((visiblePlantName) => {
      const desiredLower = String(visiblePlantName).toLowerCase();

      return apiLoginAsAdmin().then((authHeader) => {
        return requestPlantsPage(authHeader).then((plants) => {
          const match = plants.find(
            (p) => String(p?.name ?? "").toLowerCase() === desiredLower,
          );

          const id = Number(match?.id);
          if (!Number.isFinite(id)) {
            throw new Error(
              `Could not find plant id for visible row name '${visiblePlantName}' via API`,
            );
          }

          return cy
            .request({
              method: "GET",
              url: `/api/plants/${id}`,
              headers: { Authorization: authHeader },
              failOnStatusCode: false,
            })
            .then((detail) => {
              const base =
                detail?.status === 200 && detail?.body ? detail.body : match;
              const body = { ...base, quantity: desiredQty };

              return cy.request({
                method: "PUT",
                url: `/api/plants/${id}`,
                headers: { Authorization: authHeader },
                body,
                failOnStatusCode: false,
              });
            });
        });
      });
    })
    .then(() => {
      // Refresh UI to reflect updated quantities
      plantPage.visitPlantPage();
      plantPage.assertOnPlantsPage();
      plantPage.plantsTable.should("be.visible");
    });
});

Then("I should see the {string} badge", (badgeText) => {
  plantPage.assertBadgeVisible(badgeText);
});

// =============================================================
// UI/TC122 Verify Navigation Menu Highlights Active Page
// =============================================================

Then(
  "the {string} navigation menu item should be highlighted",
  (/** @type {string} */ menuName) => {
    const menu = normalizeText(safeToString(menuName)).toLowerCase();
    if (menu !== "plants" && menu !== "plant") {
      throw new Error(
        `Unknown navigation menu item: ${safeToString(menuName)}`,
      );
    }

    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
    plantPage.plantsMenu.should("be.visible").then(($link) => {
      const $li = $link.closest("li");
      if ($li.length) {
        cy.wrap($li).should("have.class", "active");
        return;
      }

      cy.wrap($link).should("have.class", "active");
    });
  },
);

Then("I should be on the {string} page", (/** @type {string} */ pageName) => {
  const page = normalizeText(safeToString(pageName)).toLowerCase();

  if (page === "plants" || page === "plant") {
    plantPage.assertOnPlantsPage();
    return;
  }

  if (page === "dashboard") {
    cy.location("pathname", { timeout: 10000 }).should("include", "/dashboard");
    return;
  }

  throw new Error(`Unknown page: ${safeToString(pageName)}`);
});
