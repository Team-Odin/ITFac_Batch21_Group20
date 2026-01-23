class CategoryPage {
  get addCategoryBtn() {
    return cy.get('a[href="/ui/categories/add"]');
  }

  get searchNameInput() {
    return cy.get('input[name="name"]');
  }

  get searchBtn() {
    return cy.contains('button[type="submit"]', "Search");
  }

  get resetBtn() {
    return cy.get('a[href="/ui/categories"]');
  }

  get parentCategoryFilterDropdown() {
    return cy.get('select[name="parentId"]');
  }

  get nextPageBtn() {
    return cy.contains("a", "Next");
  }

  get categoriesTable() {
    return cy.get("table");
  }

  visit() {
    cy.visit("/ui/categories");
  }

  visitCategoryPage() {
    this.visit();
  }

  openWithMinimumCategories(minCount) {
    this.visitCategoryPage();
    this.ensureMinimumCategories(minCount);
    this.pagination.should("be.visible");
  }

  assertOnCategoriesPage() {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/categories");
  }

  assertCategoryTableHasData() {
    this.assertOnCategoriesPage();
    this.categoriesTable.should("be.visible");

    cy.get("table tbody tr").should("exist");
    cy.get("table tbody tr")
      .first()
      .within(() => {
        cy.get("td").should("not.contain", "No category found");
      });
  }

  getCategoryTableRows() {
    return cy.get("table tbody tr");
  }

  getCategoryRowCount() {
    return this.getCategoryTableRows().then(($rows) => $rows.length);
  }

  assertNextDisabledOrHidden() {
    return cy.get("body").then(($body) => {
      const $pagination = $body.find(".pagination");
      const $next = $pagination.find('a:contains("Next")');

      if ($next.length === 0) {
        // Some UIs hide "Next" on the last page.
        return;
      }

      expect($next.closest(".page-item")).to.have.class("disabled");
    });
  }

  goToLastPage() {
    const clickUntilNextDisabled = () => {
      return cy.get("body").then(($body) => {
        const $pagination = $body.find(".pagination");
        const $next = $pagination.find('a:contains("Next")');

        // If "Next" is hidden, we consider this already the last page.
        if ($next.length === 0) return;

        const isDisabled = $next.closest(".page-item").hasClass("disabled");
        if (isDisabled) return;

        this.scrollToBottom();
        this.clickNextPage();
        this.assertCategoryTableHasData();

        return clickUntilNextDisabled();
      });
    };

    this.pagination.should("be.visible");
    return clickUntilNextDisabled();
  }

  clickNextPage() {
    return this.getNextButton()
      .should("be.visible")
      .parent(".page-item")
      .should("not.have.class", "disabled")
      .find("a")
      .click();
  }

  clickPreviousPage() {
    return this.getPreviousButton()
      .should("be.visible")
      .parent(".page-item")
      .should("not.have.class", "disabled")
      .find("a")
      .click();
  }

  clickPagination(direction) {
    const dir = String(direction).trim().toLowerCase();

    if (dir === "next") return this.clickNextPage();
    if (dir === "previous") return this.clickPreviousPage();

    throw new Error(`Unknown pagination direction: ${direction}`);
  }

  captureTopRowsSnapshot(maxRows = 3) {
    return cy.get("table tbody tr").then(($rows) => {
      const limit = Math.min(Number(maxRows) || 0, $rows.length);
      return Array.from($rows)
        .slice(0, limit)
        .map((r) => String(r.innerText).replaceAll(/\s+/g, " ").trim());
    });
  }

  goToPage(targetPageNumber) {
    const target = Number.parseInt(String(targetPageNumber).trim(), 10);

    if (!Number.isFinite(target) || target < 1) {
      throw new Error(`Invalid page number: ${targetPageNumber}`);
    }

    if (target === 1) {
      this.checkActivePageNumber("1");
      return;
    }

    for (let i = 1; i < target; i++) {
      this.scrollToBottom();
      this.clickNextPage();
      this.checkActivePageNumber(String(i + 1));
    }
  }

  checkCategoryExists(categoryName) {
    const name = String(categoryName);

    return cy.get("body").then(($body) => {
      if ($body.find("table").length === 0) return false;
      return $body.find(`table tbody td:contains("${name}")`).length > 0;
    });
  }

  verifyCategoryInTable(categoryName) {
    cy.get("table").within(() => {
      cy.contains("td", categoryName, { timeout: 10000 }).should("be.visible");
    });
  }

  verifyParentChildRelationship(subCategoryName, parentCategoryName) {
    cy.get("table")
      .should("be.visible")
      .within(() => {
        cy.contains("td", subCategoryName)
          .should("be.visible")
          .parent("tr")
          .within(() => {
            cy.get("td").eq(2).should("contain.text", parentCategoryName);
          });
      });
  }

  get pagination() {
    return cy.get(".pagination");
  }

  scrollToBottom() {
    cy.scrollTo("bottom", { ensureScrollable: false });
  }

  ensureMinimumCategories(minCount) {
    const minimumRequired = Number.parseInt(minCount, 10);

    // Check if pagination exists, which indicates we have enough categories
    return cy.get("body").then(($body) => {
      if ($body.find(".pagination").length === 0) {
        cy.log(`Creating test categories to ensure pagination...`);

        // Create enough categories to trigger pagination (usually 10+ categories)
        for (let i = 0; i < minimumRequired + 2; i++) {
          const categoryName = `AutoTestCat${Date.now()}_${i}`;
          this.addCategoryBtn.should("be.visible").click();
          cy.get('input[id="name"]')
            .should("be.visible")
            .clear()
            .type(categoryName);
          cy.get('button[type="submit"]').should("be.visible").click();
          cy.location("pathname", { timeout: 10000 }).should(
            "eq",
            "/ui/categories",
          );
        }

        // Reload the page to see if pagination now appears
        cy.reload();
      } else {
        cy.log("Pagination already exists - sufficient categories available");
      }
    });
  }

  getPreviousButton() {
    return this.pagination.find('a:contains("Previous")');
  }

  getNextButton() {
    return this.pagination.find('a:contains("Next")');
  }

  getActivePageNumber() {
    return this.pagination.find(".page-item.active .page-link");
  }

  checkPreviousButtonDisabled() {
    return this.getPreviousButton()
      .parent(".page-item")
      .should("have.class", "disabled");
  }

  checkPreviousButtonEnabled() {
    return this.getPreviousButton()
      .parent(".page-item")
      .should("not.have.class", "disabled");
  }

  checkNextButtonEnabled() {
    return this.getNextButton()
      .parent(".page-item")
      .should("not.have.class", "disabled");
  }

  checkActivePageNumber(expectedPageNumber) {
    return this.getActivePageNumber()
      .should("be.visible")
      .should("contain.text", expectedPageNumber);
  }

  // ========================================
  // API Helper Methods
  // ========================================

  static apiLoginAsAdmin() {
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
  }

  static normalizeEndpoint(raw) {
    const cleaned = String(raw).replaceAll(/\s+/g, "").trim();
    if (!cleaned) throw new Error("Endpoint is empty");
    if (cleaned.startsWith("/")) return cleaned;
    if (cleaned.startsWith("api/")) return `/${cleaned}`;
    if (cleaned.startsWith("api")) return `/${cleaned}`;
    return `/${cleaned}`;
  }

  static findCategoryByName(categories, name) {
    const target = String(name).toLowerCase();
    if (!Array.isArray(categories)) return undefined;
    return categories.find((c) => String(c?.name).toLowerCase() === target);
  }

  constructor(authHeader = null) {
    this.authHeader = authHeader;
  }

  deleteCategoryIfExists(nameToDelete) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const name = String(nameToDelete);
    if (!name) return cy.wrap(null);

    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: this.authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const match = CategoryPage.findCategoryByName(res?.body?.content, name);
        if (!match?.id) return;

        return cy.request({
          method: "DELETE",
          url: `/api/categories/${match.id}`,
          headers: { Authorization: this.authHeader },
          failOnStatusCode: false,
        });
      });
  }

  getMainCategoryByName(name) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const target = String(name);
    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: this.authHeader },
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
  }

  ensureMainCategoryExists(name) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const parentName = String(name);
    return this.getMainCategoryByName(parentName).then((match) => {
      if (match?.id) {
        return { id: match.id, created: false };
      }

      return cy
        .request({
          method: "POST",
          url: "/api/categories",
          headers: { Authorization: this.authHeader },
          body: { name: parentName, parent: null },
          failOnStatusCode: false,
        })
        .then((res) => {
          if (![200, 201].includes(res.status)) {
            throw new Error(
              `Failed to create parent category '${parentName}'. Status: ${res.status}`,
            );
          }
          return { id: res?.body?.id, created: true };
        });
    });
  }

  getCategoryById(id) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) return cy.wrap(undefined);

    return cy
      .request({
        method: "GET",
        url: `/api/categories/${categoryId}`,
        headers: { Authorization: this.authHeader },
        failOnStatusCode: false,
      })
      .then((res) => (res.status === 200 ? res.body : undefined));
  }

  setAuthHeader(token) {
    this.authHeader = token;
  }
}

export const categoryPage = new CategoryPage();
