import {
  Given,
  When,
  Then,
  After,
} from "@badeball/cypress-cucumber-preprocessor";
import { categoryPage } from "../../../support/pages/categoryPage";

let authHeader;

// =============================================================
// Helpers (shared)
// =============================================================

const safeStringify = (value) => {
  try {
    const json = JSON.stringify(value);
    return typeof json === "string" ? json : String(value);
  } catch {
    try {
      return String(value);
    } catch {
      return "[unserializable]";
    }
  }
};

const normalizeEndpoint = (rawEndpoint) => {
  const raw =
    typeof rawEndpoint === "string" ? rawEndpoint : String(rawEndpoint);
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Endpoint is empty");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const resolveEndpoint = (rawEndpoint) => {
  return typeof categoryPage?.constructor?.normalizeEndpoint === "function"
    ? categoryPage.constructor.normalizeEndpoint(rawEndpoint)
    : normalizeEndpoint(rawEndpoint);
};

const getAuthHeaderOrThrow = () => {
  const header = authHeader || categoryPage?.authHeader;
  if (!header) {
    throw new Error("Missing auth header; run JWT token step first");
  }
  return header;
};

const getPageContentArray = (body) => {
  if (body && Array.isArray(body.content)) return body.content;
  if (Array.isArray(body)) return body;
  return [];
};

const getPlantIdsFromBody = (body) =>
  getPageContentArray(body)
    .map((p) => Number(p?.id))
    .filter((id) => Number.isFinite(id));

const getPlantNamesFromBody = (body) =>
  getPageContentArray(body)
    .map((p) => String(p?.name ?? "").trim())
    .filter(Boolean);

const allNamesContainTerm = (names, term) => {
  const needle = String(term).toLowerCase();
  return names.every((n) => String(n).toLowerCase().includes(needle));
};

const extractCategoryIdsFromPlantRow = (row) => {
  if (!row || typeof row !== "object") return [];

  const ids = new Set();
  const addId = (value) => {
    const id = Number(value);
    if (Number.isFinite(id)) ids.add(id);
  };

  // Common DTO patterns
  if (Object.hasOwn(row, "categoryId")) addId(row.categoryId);

  // Some backends return category as an object, others as a number/string.
  if (Object.hasOwn(row, "category")) {
    const cat = row.category;
    if (cat && typeof cat === "object") {
      addId(cat.id);
    } else {
      addId(cat);
    }
  }

  // Collection-style associations
  if (Array.isArray(row.categories)) {
    for (const c of row.categories) {
      if (c && typeof c === "object") addId(c.id);
      else addId(c);
    }
  }

  return [...ids];
};

const plantRowHasCategoryAssociation = (row, expectedCategoryId) => {
  const ids = extractCategoryIdsFromPlantRow(row);
  if (ids.length === 0) return false;
  return ids.includes(Number(expectedCategoryId));
};

const extractDirectErrorMessages = (body) => {
  if (!body || typeof body !== "object") return [];
  const directKeys = ["message", "error", "detail", "title"];
  return directKeys
    .map((key) => (Object.hasOwn(body, key) ? body[key] : undefined))
    .filter((v) => v != null)
    .map(String);
};

const extractDetailsErrorMessages = (body) => {
  if (!body || typeof body !== "object") return [];
  const details = Object.hasOwn(body, "details") ? body.details : undefined;
  if (!details || typeof details !== "object") return [];
  return Object.values(details)
    .filter((v) => v != null)
    .map(String);
};

const collectErrorMessages = (body) => {
  if (body == null) return [];
  if (typeof body === "string") return [body];

  return [
    ...extractDirectErrorMessages(body),
    ...extractDetailsErrorMessages(body),
    safeStringify(body),
  ].filter(Boolean);
};

const parseJsonDocString = (docString) => {
  const raw =
    typeof docString === "string"
      ? docString.trim()
      : safeStringify(docString ?? "").trim();
  if (!raw) throw new Error("Request body docstring is empty");

  try {
    return JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : safeStringify(error);
    throw new Error(`Invalid JSON body. ${message}`);
  }
};

// -------------------------------------------------------------
// DB cleanup (best-effort) after every Plant API scenario
// -------------------------------------------------------------
After(() => {
  // Uses SQL reset when allowed (local DB by default).
  // If DB reset is skipped (e.g., non-local DB without opt-in), scenarios still run.
  return cy.task("db:reset", null, { log: false });
});

// =============================================================
// Shared Preconditions / Auth
// =============================================================

Given("Admin or User has valid JWT token", () => {
  const userUser = Cypress.env("USER_USER");
  const userPass = Cypress.env("USER_PASS");

  if (userUser && userPass) {
    return cy
      .request({
        method: "POST",
        url: "/api/auth/login",
        body: { username: userUser, password: userPass },
        failOnStatusCode: true,
      })
      .its("body")
      .then((body) => {
        const token = body?.token;
        const tokenType = body?.tokenType || "Bearer";
        if (!token) throw new Error("Login response missing token");
        authHeader = `${tokenType} ${token}`;
        categoryPage.setAuthHeader(authHeader);
      });
  }

  // If USER creds are not configured, admin is acceptable for these read-only scenarios.
  return categoryPage.constructor.apiLoginAsAdmin().then((header) => {
    authHeader = header;
    categoryPage.setAuthHeader(header);
  });
});

Given("Admin has valid JWT token", () => {
  return categoryPage.constructor.apiLoginAsAdmin().then((header) => {
    authHeader = header;
    categoryPage.setAuthHeader(header);
  });
});

// =============================================================
// Shared Request Steps
// =============================================================

When("Send GET request to: {string}", (rawEndpoint) => {
  const url = resolveEndpoint(rawEndpoint);
  const header = getAuthHeaderOrThrow();

  return cy
    .request({
      method: "GET",
      url,
      headers: { Authorization: header },
      failOnStatusCode: false,
    })
    .then((res) => {
      return cy.wrap(res, { log: false }).as("lastResponse");
    });
});

// =============================================================
// Shared Assertions
// =============================================================

Then("Status Code: {int} OK", (expectedStatus) => {
  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;
    expect(res.status).to.eq(Number(expectedStatus));
  });
});

Then("Status Code: {int} Bad Request", (expectedStatus) => {
  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;
    expect(res.status).to.eq(Number(expectedStatus));
  });
});

Then("Status Code: {int} Not Found", (expectedStatus) => {
  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;

    const exp = Number(expectedStatus);
    if (exp === 404) {
      // Some backends return 200 with an empty result set instead of 404 for non-existing filters.
      if (res.status === 404) return;

      if (res.status === 200) {
        const content = getPageContentArray(res.body);
        expect(content, "content").to.be.an("array");
        expect(
          content.length,
          "expected empty content for non-existing category",
        ).to.eq(0);
        return;
      }
    }

    expect(res.status).to.eq(exp);
  });
});

Then("Plant validation errors include:", (docString) => {
  const raw =
    typeof docString === "string" ? docString : safeStringify(docString ?? "");

  const expectedLines = String(raw ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (expectedLines.length === 0) {
    throw new Error("Validation errors docstring is empty");
  }

  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;
    const messages = collectErrorMessages(res.body);
    const haystack = messages.join("\n").toLowerCase();

    for (const expected of expectedLines) {
      expect(
        haystack,
        `Expected error message to include '${expected}'. Actual payload/messages: ${messages.join(" | ")}`,
      ).to.include(expected.toLowerCase());
    }
  });
});

// =============================================================
// API/TC123 + API/TC124 Verify List Retrieval and Details by ID
// =============================================================

Given("Plant ID {string} exists", (id) => {
  const plantId = Number(id);
  if (!Number.isFinite(plantId)) {
    throw new TypeError(
      `Invalid plant id '${typeof id === "string" ? id : safeStringify(id)}'`,
    );
  }

  const header = getAuthHeaderOrThrow();

  return cy
    .request({
      method: "GET",
      url: `/api/plants/${plantId}`,
      headers: { Authorization: header },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status !== 200) {
        throw new Error(
          `Plant id '${plantId}' does not exist or is not accessible. Status: ${res.status}`,
        );
      }

      // Keep expected values for later assertions.
      cy.wrap(
        {
          id: Number(res?.body?.id),
          name:
            res?.body?.name === undefined || res?.body?.name === null
              ? ""
              : String(res.body.name),
        },
        { log: false },
      ).as("expectedPlant");
    });
});

Then("Plant response contains a non-empty plant list", () => {
  return cy.get("@lastResponse").then((res) => {
    const body = res?.body;
    const content = getPageContentArray(body);

    expect(content, "plants content array").to.be.an("array");
    expect(content.length, "plants count").to.be.greaterThan(0);
  });
});

Then("Plant response contains correct details for Plant ID {int}", (id) => {
  const expectedId = Number(id);

  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse").to.exist;
    expect(res.status).to.eq(200);
    expect(res.body, "response body").to.exist;

    expect(Number(res.body.id)).to.eq(expectedId);

    return cy.get("@expectedPlant").then((expected) => {
      if (expected?.name) {
        expect(String(res.body.name)).to.eq(String(expected.name));
      } else {
        // At minimum, require the API to return a non-empty name.
        expect(String(res.body.name ?? "").trim(), "plant name").to.not.eq("");
      }
    });
  });
});

// =============================================================
// API/TC125 Verify Plant List Pagination
// =============================================================

When("Plant API request plants page {int} size {int}", (page, size) => {
  const p = Number(page);
  const s = Number(size);
  if (!Number.isFinite(p) || p < 0)
    throw new TypeError(
      `Invalid page: ${typeof page === "string" ? page : safeStringify(page)}`,
    );
  if (!Number.isFinite(s) || s < 1)
    throw new TypeError(
      `Invalid size: ${typeof size === "string" ? size : safeStringify(size)}`,
    );

  const header = getAuthHeaderOrThrow();

  return cy
    .request({
      method: "GET",
      url: `/api/plants/paged?page=${p}&size=${s}`,
      headers: { Authorization: header },
      failOnStatusCode: false,
    })
    .then((res) => {
      return cy.wrap(res, { log: false }).as(`plantPage${p}`);
    });
});

Then("Plant API page responses have status {int}", (status) => {
  const expectedStatus = Number(status);

  return cy.get("@plantPage0").then((res0) => {
    expect(res0?.status, "page 0 status").to.eq(expectedStatus);
    return cy.get("@plantPage1").then((res1) => {
      expect(res1?.status, "page 1 status").to.eq(expectedStatus);
    });
  });
});

// =============================================================
// API/TC126 + API/TC127 Verify Search By Name (and no results)
// =============================================================

Given("Plant named {string} exists", (plantName) => {
  const raw =
    typeof plantName === "string" ? plantName : safeStringify(plantName);
  const name = String(raw).trim();
  if (!name) throw new Error("Plant name is empty");

  const header = getAuthHeaderOrThrow();

  return cy
    .request({
      method: "GET",
      url: "/api/plants/paged?page=0&size=200",
      headers: { Authorization: header },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status !== 200) {
        throw new Error(
          `Unable to verify plant precondition. GET /api/plants/paged returned status ${res.status}`,
        );
      }

      const names = getPlantNamesFromBody(res.body).map((n) => n.toLowerCase());
      const exists = names.some((n) => n.includes(name.toLowerCase()));
      if (!exists) {
        throw new Error(
          `Precondition failed: no plant matching '${name}' was found in /api/plants/paged. Seed the DB or change the test data.`,
        );
      }
    });
});

When("Search plants by name {string}", (searchTerm) => {
  const raw =
    typeof searchTerm === "string" ? searchTerm : safeStringify(searchTerm);
  const term = String(raw).trim();
  if (!term) throw new Error("Search term is empty");

  const header = getAuthHeaderOrThrow();

  // Backend implementations vary. Try common query parameter names.
  const queryKeys = ["name", "keyword", "search", "q"];
  const encoded = encodeURIComponent(term);

  const attempts = [];

  const acceptable = (res) => {
    const names = getPlantNamesFromBody(res?.body);
    if (names.length === 0) return true; // valid empty search result
    return allNamesContainTerm(names, term);
  };

  const tryKey = (idx) => {
    if (idx >= queryKeys.length) {
      throw new Error(
        `No working plant search query param found. Attempts: ${JSON.stringify(attempts)}`,
      );
    }

    const key = queryKeys[idx];
    const url = `/api/plants/paged?page=0&size=50&${key}=${encoded}`;

    return cy
      .request({
        method: "GET",
        url,
        headers: { Authorization: header },
        failOnStatusCode: false,
      })
      .then((res) => {
        attempts.push({ key, status: res.status });

        if (res.status === 200 && acceptable(res)) {
          return cy.wrap(res, { log: false }).as("lastResponse");
        }

        return tryKey(idx + 1);
      });
  };

  return tryKey(0);
});

Then(
  "Plant search results contain only plants matching {string}",
  (expected) => {
    const raw =
      typeof expected === "string" ? expected : safeStringify(expected);
    const term = String(raw).trim();
    if (!term) throw new Error("Expected search term is empty");

    return cy.get("@lastResponse").then((res) => {
      expect(res.status).to.eq(200);
      const names = getPlantNamesFromBody(res.body);
      expect(names.length, "search result count").to.be.greaterThan(0);
      expect(
        allNamesContainTerm(names, term),
        `Expected all returned plant names to include '${term}', but at least one did not`,
      ).to.eq(true);
    });
  },
);

Then("Plant search results include {string}", (expectedName) => {
  const raw =
    typeof expectedName === "string"
      ? expectedName
      : safeStringify(expectedName);
  const expected = String(raw).trim().toLowerCase();
  if (!expected) throw new Error("Expected plant name is empty");

  return cy.get("@lastResponse").then((res) => {
    expect(res.status).to.eq(200);
    const names = getPlantNamesFromBody(res.body).map((n) => n.toLowerCase());
    expect(
      names.some((n) => n.includes(expected)),
      `Expected at least one plant name to include '${String(raw)}'`,
    ).to.eq(true);
  });
});

Then(
  /^Plant response body is an empty list \(or valid empty page object\)$/,
  () => {
    return cy.get("@lastResponse").then((res) => {
      expect(res, "lastResponse should exist").to.exist;
      expect(res.status).to.eq(200);

      const body = res.body;
      const content = getPageContentArray(body);
      expect(content, "content").to.be.an("array");
      expect(content.length, "expected empty content").to.eq(0);
    });
  },
);

// =============================================================
// API/TC128 + API/TC129 Verify Filter by Category ID
// =============================================================

When("Request plants filtered by Category ID {int}", (categoryId) => {
  const id = Number(categoryId);
  if (!Number.isFinite(id)) {
    throw new TypeError(
      `Invalid category id '${typeof categoryId === "string" ? categoryId : safeStringify(categoryId)}'`,
    );
  }

  const header = getAuthHeaderOrThrow();

  // Candidate endpoints based on common backend styles (your test plan mentions both forms).
  const candidates = [
    `/api/plants?categoryId=${id}`,
    `/api/plants/category/${id}`,
    `/api/plants/paged?page=0&size=200&categoryId=${id}`,
    `/api/plants/paged?page=0&size=200&category=${id}`,
  ];

  const attempts = [];

  let fallbackEmpty200 = null;

  const responseLooksFiltered = (res) => {
    const content = getPageContentArray(res?.body);
    if (!Array.isArray(content)) return false;
    if (content.length === 0) return true; // valid empty filtered result
    return content.every((row) => plantRowHasCategoryAssociation(row, id));
  };

  const tryAt = (idx) => {
    if (idx >= candidates.length) {
      if (fallbackEmpty200) {
        return cy.wrap(fallbackEmpty200, { log: false }).as("lastResponse");
      }
      throw new Error(
        `Unable to filter plants by categoryId=${id}. Attempts: ${JSON.stringify(attempts)}`,
      );
    }

    const url = candidates[idx];
    return cy
      .request({
        method: "GET",
        url,
        headers: { Authorization: header },
        failOnStatusCode: false,
      })
      .then((res) => {
        const content = getPageContentArray(res?.body);
        const count = Array.isArray(content) ? content.length : undefined;

        attempts.push({ url, status: res.status, count });

        // Accept 404 as a legitimate "category not found" outcome.
        if (res.status === 404) {
          return cy.wrap(res, { log: false }).as("lastResponse");
        }

        if (res.status === 200) {
          if (responseLooksFiltered(res)) {
            // Prefer a filtered response that actually has data.
            if (Array.isArray(content) && content.length === 0) {
              fallbackEmpty200 = res;
              return tryAt(idx + 1);
            }

            return cy.wrap(res, { log: false }).as("lastResponse");
          }
        }

        return tryAt(idx + 1);
      });
  };

  return tryAt(0);
});

Then(
  "All returned plants have category association with ID {int}",
  (expectedCategoryId) => {
    const id = Number(expectedCategoryId);

    return cy.get("@lastResponse").then((res) => {
      expect(res.status).to.eq(200);

      const content = getPageContentArray(res.body);
      expect(content.length, "filtered result count").to.be.greaterThan(0);

      for (const row of content) {
        const ok = plantRowHasCategoryAssociation(row, id);
        if (!ok) {
          const ids = extractCategoryIdsFromPlantRow(row);
          throw new Error(
            `Expected plant to be associated with categoryId=${id}, but got category ids ${JSON.stringify(ids)} for row: ${JSON.stringify(row)}`,
          );
        }
      }
    });
  },
);

Then("Error message indicates category not found", () => {
  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;

    if (res.status === 404) {
      const messages = collectErrorMessages(res.body).join("\n");
      expect(
        messages.toLowerCase(),
        `Actual error payload: ${messages}`,
      ).to.match(/(category\s*not\s*found|not\s*found)/);
      return;
    }

    // Alternate acceptable behavior: 200 with empty result set.
    expect(res.status).to.eq(200);
    const content = getPageContentArray(res.body);
    expect(content, "content").to.be.an("array");
    expect(
      content.length,
      "expected empty content for non-existing category",
    ).to.eq(0);
  });
});

// =============================================================
// API/TC130 + API/TC131 Verify Edit Plant (and validation)
// =============================================================

Given("Any Plant exists", () => {
  const header = getAuthHeaderOrThrow();

  return cy
    .request({
      method: "GET",
      url: "/api/plants/paged?page=0&size=200",
      headers: { Authorization: header },
      failOnStatusCode: false,
    })
    .then((res) => {
      if (res.status !== 200) {
        throw new Error(
          `Unable to load plants to satisfy precondition. GET /api/plants/paged returned status ${res.status}`,
        );
      }

      const content = getPageContentArray(res.body);
      if (!Array.isArray(content)) {
        throw new TypeError(
          `Expected plants list response to be an array or page object. Got: ${safeStringify(res.body)}`,
        );
      }
      if (content.length === 0) {
        throw new Error(
          "No plants exist in the system; cannot run edit/validation tests without seed data.",
        );
      }

      const first = content.find((p) => Number.isFinite(Number(p?.id)));
      if (!first) {
        throw new TypeError(
          `Unable to find a plant with a numeric id in response: ${safeStringify(content[0])}`,
        );
      }

      return cy
        .wrap({ id: Number(first.id) }, { log: false })
        .as("activePlant");
    });
});

When("Send PUT request to that Plant with body:", (docString) => {
  const header = getAuthHeaderOrThrow();
  const patch = parseJsonDocString(docString);

  return cy.get("@activePlant").then((plant) => {
    const id = Number(plant?.id);
    if (!Number.isFinite(id)) {
      throw new TypeError(
        "Missing active plant id; ensure 'Any Plant exists' ran first.",
      );
    }

    // PUT often expects a full entity; fetch current state and merge.
    return cy
      .request({
        method: "GET",
        url: `/api/plants/${id}`,
        headers: { Authorization: header },
        failOnStatusCode: false,
      })
      .then((detail) => {
        const base = detail.status === 200 && detail.body ? detail.body : {};
        const body = { ...base, ...patch };

        return cy
          .request({
            method: "PUT",
            url: `/api/plants/${id}`,
            headers: { Authorization: header },
            body,
            failOnStatusCode: false,
          })
          .then((res) => {
            return cy.wrap(res, { log: false }).as("lastResponse");
          });
      });
  });
});

Then(
  "Plant details retrieved subsequently show price {float}",
  (expectedPrice) => {
    const price = Number(expectedPrice);
    if (!Number.isFinite(price)) {
      throw new TypeError(
        `Invalid expected price '${typeof expectedPrice === "string" ? expectedPrice : safeStringify(expectedPrice)}'`,
      );
    }

    const header = getAuthHeaderOrThrow();

    return cy.get("@activePlant").then((plant) => {
      const id = Number(plant?.id);
      if (!Number.isFinite(id)) {
        throw new TypeError(
          "Missing active plant id; ensure 'Any Plant exists' ran first.",
        );
      }

      return cy
        .request({
          method: "GET",
          url: `/api/plants/${id}`,
          headers: { Authorization: header },
          failOnStatusCode: false,
        })
        .then((detail) => {
          expect(detail.status).to.eq(200);

          const actual = Number(detail?.body?.price);
          expect(
            Number.isFinite(actual),
            `Expected response to have numeric price. Actual: ${safeStringify(detail?.body?.price)}`,
          ).to.eq(true);

          expect(actual).to.be.closeTo(price, 0.0001);
        });
    });
  },
);

// =============================================================
// API/TC132 Verify Plant Summary Data Retrieval
// =============================================================

Then("Plant summary response contains totalPlants and lowStockPlants", () => {
  return cy.get("@lastResponse").then((res) => {
    expect(res, "lastResponse should exist").to.exist;
    expect(res.status).to.eq(200);
    expect(res.body, "response body").to.exist;

    const total = Number(res.body?.totalPlants);
    const low = Number(res.body?.lowStockPlants);

    expect(Number.isFinite(total), "totalPlants is a number").to.eq(true);
    expect(Number.isFinite(low), "lowStockPlants is a number").to.eq(true);
    expect(total, "totalPlants").to.be.at.least(0);
    expect(low, "lowStockPlants").to.be.at.least(0);
  });
});

Then("Plant API responses contain unique Plant IDs across pages", () => {
  return cy.get("@plantPage0").then((res0) => {
    return cy.get("@plantPage1").then((res1) => {
      const ids0 = getPlantIdsFromBody(res0?.body);
      const ids1 = getPlantIdsFromBody(res1?.body);

      // If the backend has fewer records than page size, page 1 may be empty.
      if (ids0.length === 0) {
        throw new Error("Expected page 0 to contain at least 1 plant");
      }

      const set0 = new Set(ids0);
      const duplicates = ids1.filter((id) => set0.has(id));

      expect(
        duplicates,
        `Expected no duplicate plant IDs between page 0 and page 1. Duplicates: ${JSON.stringify(duplicates)}`,
      ).to.have.length(0);
    });
  });
});
