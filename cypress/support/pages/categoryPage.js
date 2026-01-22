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
}

export const categoryPage = new CategoryPage();
