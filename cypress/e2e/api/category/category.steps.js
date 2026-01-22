import {
  Given,
  When,
  Then,
  After,
} from "@badeball/cypress-cucumber-preprocessor";

let authHeader;
let endpoint;
let lastResponse;
let createdCategoryId;
let createdCategoryName;
let createdParentCategoryId;
let createdParentCategoryName;
let createdParentByTest;

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

const normalizeEndpoint = (raw) => {
  const cleaned = String(raw).replaceAll(/\s+/g, "").trim();
  if (!cleaned) throw new Error("Endpoint is empty");
  if (cleaned.startsWith("/")) return cleaned;
  if (cleaned.startsWith("api/")) return `/${cleaned}`;
  if (cleaned.startsWith("api")) return `/${cleaned}`;
  return `/${cleaned}`;
};

const findCategoryByName = (categories, name) => {
  const target = String(name).toLowerCase();
  if (!Array.isArray(categories)) return undefined;
  return categories.find((c) => String(c?.name).toLowerCase() === target);
};

const deleteCategoryIfExists = (nameToDelete) => {
  const name = String(nameToDelete);
  if (!name) return cy.wrap(null);

  return cy
    .request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      const match = findCategoryByName(res?.body?.content, name);
      if (!match?.id) return;

      return cy.request({
        method: "DELETE",
        url: `/api/categories/${match.id}`,
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      });
    });
};

const getMainCategoryByName = (name) => {
  const target = String(name);
  return cy
    .request({
      method: "GET",
      url: "/api/categories/page?page=0&size=200&sort=id,desc",
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => {
      const match = Array.isArray(res?.body?.content)
        ? res.body.content.find(
            (c) =>
              String(c?.name).toLowerCase() === target.toLowerCase() &&
              (c?.parentName === "-" || c?.parentName == null),
          )
        : undefined;
      return match;
    });
};

const ensureMainCategoryExists = (name) => {
  const parentName = String(name);
  return getMainCategoryByName(parentName).then((match) => {
    if (match?.id) {
      createdParentByTest = false;
      createdParentCategoryId = match.id;
      createdParentCategoryName = parentName;
      return;
    }

    createdParentByTest = true;
    createdParentCategoryName = parentName;

    return cy
      .request({
        method: "POST",
        url: "/api/categories",
        headers: { Authorization: authHeader },
        body: { name: parentName, parent: null },
        failOnStatusCode: false,
      })
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Failed to create parent category '${parentName}'. Status: ${res.status}`,
          );
        }
        createdParentCategoryId = res?.body?.id;
      });
  });
};

const getCategoryById = (id) => {
  const categoryId = Number(id);
  if (!Number.isFinite(categoryId)) return cy.wrap(undefined);

  return cy
    .request({
      method: "GET",
      url: `/api/categories/${categoryId}`,
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    })
    .then((res) => (res.status === 200 ? res.body : undefined));
};

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanup =
    (scenarioName.includes("API/TC16") || scenarioName.includes("API/TC17")) &&
    Boolean(createdCategoryId);

  if (!shouldCleanup) return;
  if (!authHeader) return;

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

// =============================================================
// API/TC16 Verify Create Main Category API
// =============================================================

Given("Admin has valid JWT token", () => {
  return apiLoginAsAdmin().then((header) => {
    authHeader = header;
  });
});

Given("Endpoint: {string}", (rawEndpoint) => {
  endpoint = normalizeEndpoint(rawEndpoint);
});

Given("parent {string} exists", (parentName) => {
  if (!authHeader) {
    throw new Error("Missing authHeader; run JWT token step first");
  }

  return ensureMainCategoryExists(parentName);
});

When("Send POST request with body:", (docString) => {
  if (!authHeader)
    throw new Error("Missing authHeader; run JWT token step first");
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
    return ensureMainCategoryExists(parentName).then(() => {
      const parentId = createdParentCategoryId;
      if (!parentId) {
        throw new Error(`Unable to resolve parentId for '${parentName}'`);
      }

      const normalizedBody = {
        ...body,
        parent: { id: parentId },
      };
      delete normalizedBody.parentId;

      // Ensure idempotent runs: delete existing category with the same name first.
      return deleteCategoryIfExists(createdCategoryName).then(() => {
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
  return deleteCategoryIfExists(createdCategoryName).then(() => {
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

Then("Status Code: {int} Created", (expectedStatus) => {
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
        return getCategoryById(createdCategoryId).then((detail) => {
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
