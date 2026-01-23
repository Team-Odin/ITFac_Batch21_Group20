import {
  Given,
  When,
  Then,
  After,
} from "@badeball/cypress-cucumber-preprocessor";
import { categoryPage } from "../../../support/pages/categoryPage";

let authHeader;
let endpoint;
let lastResponse;
let createdCategoryId;
let createdCategoryName;
let createdParentCategoryId;
let createdParentCategoryName;
let createdParentByTest;
let expectedCategoryId;
let expectedCategoryName;
let createdCategoryIdsForTc21;
let createdCategoryIdForTc22;
let createdCategoryNameForTc22;
let createdCategoryByTestForTc22;

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanup =
    (scenarioName.includes("API/TC16") || scenarioName.includes("API/TC17")) &&
    Boolean(createdCategoryId);

  if (!shouldCleanup) return;
  if (!categoryPage) return;

  cy.request({
    method: "DELETE",
    url: `/api/categories/${createdCategoryId}`,
    headers: { Authorization: authHeader },
    failOnStatusCode: false,
  }).then(() => {
    createdCategoryId = undefined;
    createdCategoryName = undefined;

    if (
      scenarioName.includes("API/TC17") &&
      createdParentByTest &&
      createdParentCategoryId
    ) {
      cy.request({
        method: "DELETE",
        url: `/api/categories/${createdParentCategoryId}`,
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      }).then(() => {
        createdParentCategoryId = undefined;
        createdParentCategoryName = undefined;
        createdParentByTest = undefined;
      });
    }
  });
});

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanupTc21 =
    scenarioName.includes("API/TC21") &&
    Array.isArray(createdCategoryIdsForTc21) &&
    createdCategoryIdsForTc21.length > 0;

  if (!shouldCleanupTc21) return;
  if (!authHeader) return;

  const ids = [...createdCategoryIdsForTc21];
  createdCategoryIdsForTc21 = undefined;

  return cy.wrap(ids, { log: false }).each((id) => {
    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) return;
    return cy.request({
      method: "DELETE",
      url: `/api/categories/${categoryId}`,
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    });
  });
});

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanupTc22 =
    scenarioName.includes("API/TC22") &&
    Boolean(createdCategoryIdForTc22) &&
    Boolean(createdCategoryByTestForTc22) &&
    Boolean(authHeader);

  if (!shouldCleanupTc22) return;

  const id = createdCategoryIdForTc22;
  createdCategoryIdForTc22 = undefined;
  createdCategoryNameForTc22 = undefined;
  createdCategoryByTestForTc22 = undefined;

  return cy.request({
    method: "DELETE",
    url: `/api/categories/${id}`,
    headers: { Authorization: authHeader },
    failOnStatusCode: false,
  });
});

// =============================================================
// API/TC16 Verify Create Main Category API
// =============================================================

Given("Admin has valid JWT token", () => {
  return categoryPage.constructor.apiLoginAsAdmin().then((header) => {
    authHeader = header;
    categoryPage.setAuthHeader(header);
  });
});

Given("Endpoint: {string}", (rawEndpoint) => {
  endpoint = categoryPage.constructor.normalizeEndpoint(rawEndpoint);
});

// =============================================================
// API/TC17 Verify Create Sub Category API
// =============================================================

Given("parent {string} exists", (parentName) => {
  if (!categoryPage) {
    throw new Error("Missing categoryPage; run JWT token step first");
  }

  return categoryPage.ensureMainCategoryExists(parentName).then((result) => {
    createdParentByTest = result.created;
    createdParentCategoryId = result.id;
    createdParentCategoryName = parentName;
  });
});

// =============================================================
// API/TC18 Verify Get Category By ID
// =============================================================

Given("Category ID {string} exists", (id) => {
  if (!categoryPage) {
    throw new Error("Missing categoryPage; run JWT token step first");
  }

  const idString = typeof id === "string" ? id : JSON.stringify(id);
  const categoryId = Number(id);
  if (!Number.isFinite(categoryId)) {
    throw new TypeError(`Invalid category id '${idString}'`);
  }

  return categoryPage.getCategoryById(categoryId).then((category) => {
    if (!category) {
      throw new Error(
        `Category id '${categoryId}' does not exist or is not accessible`,
      );
    }

    expectedCategoryId = categoryId;
    expectedCategoryName = category?.name;
    if (!expectedCategoryName) {
      throw new Error(
        `Category id '${categoryId}' exists but has no name in response body`,
      );
    }
  });
});

When("Send POST request with body:", (docString) => {
  if (!categoryPage)
    throw new Error("Missing categoryPage; run JWT token step first");
  if (!endpoint) endpoint = "/api/categories";

  const raw =
    typeof docString === "string"
      ? docString.trim()
      : JSON.stringify(docString ?? "").trim();
  if (!raw) throw new Error("Request body docstring is empty");

  let body;
  try {
    body = JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Invalid JSON body. ${message}`);
  }

  createdCategoryName = body?.name ? String(body.name) : undefined;

  // Support feature files that use a parent NAME, but API expects parentId.
  // If body.parent is present, resolve it to a main category id and map to parentId.
  const parentName =
    typeof body?.parent === "string" ? String(body.parent).trim() : "";
  if (parentName) {
    return categoryPage.ensureMainCategoryExists(parentName).then((result) => {
      createdParentCategoryId = result.id;
      const normalizedBody = {
        ...body,
        parent: { id: result.id },
      };
      delete normalizedBody.parentId;

      // Ensure idempotent runs: delete existing category with the same name first.
      return categoryPage
        .deleteCategoryIfExists(createdCategoryName)
        .then(() => {
          return cy
            .request({
              method: "POST",
              url: endpoint,
              headers: { Authorization: authHeader },
              body: normalizedBody,
              failOnStatusCode: false,
            })
            .then((res) => {
              lastResponse = res;
              createdCategoryId = res?.body?.id;
            });
        });
    });
  }

  // Support callers that provide parentId directly (convert into parent object).
  if (body?.parentId != null) {
    const parentId = Number(body.parentId);
    if (Number.isFinite(parentId)) {
      const normalizedBody = { ...body, parent: { id: parentId } };
      delete normalizedBody.parentId;
      body = normalizedBody;
    }
  }

  // Ensure idempotent runs: delete existing category with the same name first.
  return categoryPage.deleteCategoryIfExists(createdCategoryName).then(() => {
    return cy
      .request({
        method: "POST",
        url: endpoint,
        headers: { Authorization: authHeader },
        body,
        failOnStatusCode: false,
      })
      .then((res) => {
        lastResponse = res;
        createdCategoryId = res?.body?.id;
      });
  });
});

When("Send GET request to: {string}", (rawEndpoint) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  endpoint = categoryPage.constructor.normalizeEndpoint(rawEndpoint);

  return cy
    .request({
      method: "GET",
      url: endpoint,
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      lastResponse = res;
    });
});

Then("Status Code: {int} Created", (expectedStatus) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.status).to.eq(Number(expectedStatus));
});

Then("Status Code: {int} OK", (expectedStatus) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.status).to.eq(Number(expectedStatus));
});

Then("Response contains {string}: {string}", (key, expectedValue) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  if (typeof key !== "string") {
    throw new TypeError(
      `Expected response key to be a string, got: ${typeof key}`,
    );
  }
  if (typeof expectedValue !== "string") {
    throw new TypeError(
      `Expected response value to be a string, got: ${typeof expectedValue}`,
    );
  }

  const k = key.trim();
  const expected = expectedValue;

  expect(lastResponse.body).to.have.property(k);
  expect(String(lastResponse.body[k])).to.eq(expected);
});

Then(
  "Response contains {string}: {string} and {string}: {string}",
  (key1, value1, key2, value2) => {
    // For TC17, API create response may not include parent name, so we verify the link via list API.
    if (typeof key1 !== "string" || typeof value1 !== "string") {
      throw new TypeError("Expected first key/value to be strings");
    }
    if (typeof key2 !== "string" || typeof value2 !== "string") {
      throw new TypeError("Expected second key/value to be strings");
    }

    const k1 = key1.trim();
    const expected1 = value1;
    const k2 = key2.trim();
    const expected2 = value2;

    expect(lastResponse, "lastResponse should exist").to.exist;
    expect(lastResponse.body, "response body").to.exist;
    expect(lastResponse.body).to.have.property(k1);
    expect(String(lastResponse.body[k1])).to.eq(expected1);

    // parent relationship verification
    if (!createdCategoryId) {
      throw new Error(
        "Missing createdCategoryId; cannot verify parent relationship",
      );
    }

    expect(k2.toLowerCase(), "second key").to.eq("parent");

    if (!createdParentCategoryId) {
      throw new Error(
        "Missing createdParentCategoryId; ensure you used parent name resolution before creating the sub-category",
      );
    }

    // Prefer verifying relationship directly from create response if possible.
    const responseParentId =
      Object.hasOwn(lastResponse.body, "parentId") &&
      lastResponse.body.parentId != null
        ? Number(lastResponse.body.parentId)
        : undefined;

    const responseParentObjId =
      lastResponse.body?.parent &&
      typeof lastResponse.body.parent === "object" &&
      Object.hasOwn(lastResponse.body.parent, "id")
        ? Number(lastResponse.body.parent.id)
        : undefined;

    const expectedParentId = Number(createdParentCategoryId);

    if (Number.isFinite(responseParentId)) {
      expect(responseParentId).to.eq(expectedParentId);
      return;
    }
    if (Number.isFinite(responseParentObjId)) {
      expect(responseParentObjId).to.eq(expectedParentId);
      return;
    }

    // Fallback: verify relationship via list API (and use parentId if present).
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
        const row = content.find(
          (c) => Number(c?.id) === Number(createdCategoryId),
        );
        expect(row, "created category row from list api").to.exist;

        const rowParentId =
          row && Object.hasOwn(row, "parentId") && row.parentId != null
            ? Number(row.parentId)
            : undefined;

        if (Number.isFinite(rowParentId)) {
          expect(rowParentId).to.eq(expectedParentId);
          return;
        }

        // Some projections only include parentName; use it if it's meaningful.
        const rowParentName =
          row && Object.hasOwn(row, "parentName")
            ? String(row.parentName ?? "")
            : "";
        if (rowParentName && rowParentName !== "-") {
          expect(rowParentName).to.eq(expected2);
          return;
        }

        // Final fallback: attempt GET by id (if supported) and check parentId.
        return categoryPage
          .getCategoryById(createdCategoryId)
          .then((detail) => {
            const detailParentId =
              detail &&
              Object.hasOwn(detail, "parentId") &&
              detail.parentId != null
                ? Number(detail.parentId)
                : undefined;

            if (Number.isFinite(detailParentId)) {
              expect(detailParentId).to.eq(expectedParentId);
              return;
            }

            const detailParentName =
              detail && Object.hasOwn(detail, "parentName")
                ? String(detail.parentName ?? "")
                : "";
            if (detailParentName && detailParentName !== "-") {
              expect(detailParentName).to.eq(expected2);
              return;
            }

            throw new Error(
              `Unable to verify parent relationship for created category id=${createdCategoryId}. Expected parent '${expected2}' (id=${expectedParentId}), but no parentId/parentName was available from response, list, or detail endpoints.`,
            );
          });
      });
  },
);

Then("Response contains correct id and name for that category", () => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  if (!Number.isFinite(expectedCategoryId)) {
    throw new TypeError(
      "expectedCategoryId was not set; ensure precondition step ran",
    );
  }
  if (!expectedCategoryName) {
    throw new TypeError(
      "expectedCategoryName was not captured; ensure precondition step ran",
    );
  }

  expect(Number(lastResponse.body.id)).to.eq(Number(expectedCategoryId));
  expect(String(lastResponse.body.name)).to.eq(String(expectedCategoryName));
});

// =============================================================
// API/TC19 Verify Create Validation: Empty Name
// =============================================================

Then("Status Code: {int} Bad Request", (expectedStatus) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.status).to.eq(Number(expectedStatus));
});

function collectErrorMessages(body) {
  if (body == null) return [];
  if (typeof body === "string") return [body];

  const messages = [];

  // Nested validation details (current backend shape)
  if (
    typeof body === "object" &&
    Object.hasOwn(body, "details") &&
    body.details &&
    typeof body.details === "object"
  ) {
    for (const value of Object.values(body.details)) {
      if (value != null) messages.push(String(value));
    }
  }

  const directKeys = ["message", "error", "detail", "title"]; // common API error shapes
  for (const key of directKeys) {
    if (Object.hasOwn(body, key) && body[key] != null) {
      messages.push(String(body[key]));
    }
  }

  const arrays = ["errors", "violations", "fieldErrors"];
  for (const key of arrays) {
    const arr = Object.hasOwn(body, key) ? body[key] : undefined;
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item == null) continue;
        if (typeof item === "string") {
          messages.push(item);
          continue;
        }
        if (typeof item === "object") {
          for (const k of [
            "defaultMessage",
            "message",
            "error",
            "reason",
            "field",
          ]) {
            if (Object.hasOwn(item, k) && item[k] != null) {
              messages.push(String(item[k]));
            }
          }
        }
      }
    }
  }

  // fallback: stringify object (avoid huge circulars)
  try {
    messages.push(JSON.stringify(body));
  } catch {
    // ignore
  }

  return messages.filter(Boolean);
}

Then("Error message: {string}", (expectedMessage) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  const expected = String(expectedMessage);
  const messages = collectErrorMessages(lastResponse.body);
  const haystack = messages.join("\n");

  expect(
    haystack,
    `Expected validation message to include: '${expected}'. Actual error payload: ${haystack}`,
  ).to.include(expected);
});

// =============================================================
// API/TC20 Verify Create Validation: Name Too Long
// =============================================================

Then("Field error {string}: {string}", (fieldName, expectedMessage) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  const field = String(fieldName).trim();
  const expected = String(expectedMessage);

  const details =
    lastResponse.body &&
    typeof lastResponse.body === "object" &&
    Object.hasOwn(lastResponse.body, "details")
      ? lastResponse.body.details
      : undefined;

  if (details && typeof details === "object" && Object.hasOwn(details, field)) {
    expect(String(details[field])).to.include(expected);
    return;
  }

  // Fallback to generic message search (covers alternate error shapes)
  const messages = collectErrorMessages(lastResponse.body);
  expect(messages.join("\n")).to.include(expected);
});

// =============================================================
// API/TC21 Verify Basic Pagination
// =============================================================

Given(/"(\d+)"\+\s*Categories exist/, (count) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) {
    throw new TypeError(`Invalid category count: '${String(count)}'`);
  }

  createdCategoryIdsForTc21 = [];
  // Category name validation is 3..10 chars (backend constraint).
  // Keep names short but unique enough for the test run.
  const runId = String(Date.now() % 10000).padStart(4, "0");

  // Create N main categories (parent null) so pagination has enough records.
  return cy.wrap(Array.from({ length: n }), { log: false }).each((_, idx) => {
    const name = `T21${runId}${idx}`; // e.g. T2101230
    return cy
      .request({
        method: "POST",
        url: "/api/categories",
        headers: { Authorization: authHeader },
        body: { name, parent: null },
        failOnStatusCode: false,
      })
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Failed to create category '${name}'. Status: ${res.status} Body: ${JSON.stringify(res.body)}`,
          );
        }
        if (res?.body?.id != null) createdCategoryIdsForTc21.push(res.body.id);
      });
  });
});

When("Send GET request: {string}", (rawEndpoint) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  endpoint = categoryPage.constructor.normalizeEndpoint(rawEndpoint);

  return cy
    .request({
      method: "GET",
      url: endpoint,
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      lastResponse = res;
    });
});

Then("Response contains exactly {int} category records", (expectedCount) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  const n = Number(expectedCount);
  let content;
  if (Array.isArray(lastResponse?.body?.content)) {
    content = lastResponse.body.content;
  } else if (Array.isArray(lastResponse.body)) {
    content = lastResponse.body;
  }

  if (!content) {
    throw new Error(
      `Expected a paged response with 'content' array, got: ${JSON.stringify(lastResponse.body)}`,
    );
  }

  expect(content.length).to.eq(n);
});

// =============================================================
// API/TC22 Verify Search by Name
// =============================================================

Given("Category {string} exists", (name) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  const categoryName = String(name).trim();
  if (!categoryName) throw new Error("Category name is empty");

  createdCategoryNameForTc22 = categoryName;
  createdCategoryByTestForTc22 = false;

  return cy
    .request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      const existing = categoryPage.constructor.findCategoryByName(
        res?.body?.content,
        categoryName,
      );

      if (existing?.id) {
        createdCategoryIdForTc22 = existing.id;
        return;
      }

      return cy
        .request({
          method: "POST",
          url: "/api/categories",
          headers: { Authorization: authHeader },
          body: { name: categoryName, parent: null },
          failOnStatusCode: false,
        })
        .then((createRes) => {
          if (![200, 201].includes(createRes.status)) {
            throw new Error(
              `Failed to create category '${categoryName}'. Status: ${createRes.status} Body: ${JSON.stringify(createRes.body)}`,
            );
          }
          createdCategoryIdForTc22 = createRes?.body?.id;
          createdCategoryByTestForTc22 = true;
        });
    });
});

When("Search categories by name {string}", (name) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  const term = String(name).trim();
  if (!term) throw new Error("Search term is empty");

  lastResponse = undefined;

  // Backend implementations vary. Try common query parameter names.
  const queryKeys = ["name", "keyword", "search", "q"];
  const encoded = encodeURIComponent(term);

  const attempts = [];
  const matchesOnly = (res) => {
    const content = Array.isArray(res?.body?.content)
      ? res.body.content
      : Array.isArray(res?.body)
        ? res.body
        : [];

    if (content.length === 0) return false;
    const nonMatches = content
      .map((c) => String(c?.name ?? ""))
      .filter((n) => !n.toLowerCase().includes(term.toLowerCase()));
    return nonMatches.length === 0;
  };

  const tryKey = (idx) => {
    if (idx >= queryKeys.length) {
      throw new Error(
        `No working search query param found. Attempts: ${JSON.stringify(attempts)}`,
      );
    }

    const key = queryKeys[idx];
    const url = `/api/categories/page?page=0&size=50&${key}=${encoded}`;

    return cy
      .request({
        method: "GET",
        url,
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        attempts.push({ key, status: res.status });

        if (res.status === 200 && matchesOnly(res)) {
          lastResponse = res;
          return;
        }

        return tryKey(idx + 1);
      });
  };

  return tryKey(0);
});

Then("Response list contains only categories matching {string}", (expected) => {
  expect(lastResponse, "lastResponse should exist").to.exist;
  expect(lastResponse.body, "response body").to.exist;

  const term = String(expected).toLowerCase();
  const content = Array.isArray(lastResponse?.body?.content)
    ? lastResponse.body.content
    : Array.isArray(lastResponse.body)
      ? lastResponse.body
      : [];

  expect(content.length, "search result count").to.be.greaterThan(0);

  const names = content.map((c) => String(c?.name ?? ""));
  const nonMatches = names.filter((n) => !n.toLowerCase().includes(term));

  expect(
    nonMatches,
    `Expected all returned category names to include '${expected}', but these did not: ${JSON.stringify(nonMatches)}`,
  ).to.have.length(0);
});
