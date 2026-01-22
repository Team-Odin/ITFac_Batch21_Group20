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

After((info) => {
  const scenarioName = info?.pickle?.name ?? "";
  const shouldCleanup =
    scenarioName.includes("API/TC16") && Boolean(createdCategoryId);

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

When("Send POST request with body:", (docString) => {
  if (!authHeader)
    throw new Error("Missing authHeader; run JWT token step first");
  if (!endpoint) throw new Error("Missing endpoint; run Endpoint step first");

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
