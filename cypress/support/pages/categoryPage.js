class CategoryPage {
  get addCategoryBtn() {
    return cy.get('a[href="/ui/categories/add"]');
  }

  get nextPageBtn() {
    return cy.contains("a", "Next");
  }

  visit() {
    cy.visit("/ui/categories");
  }

  visitCategoryPage() {
    this.visit();
  }

  checkCategoryExists(categoryName) {
    return cy.get("body").then(($body) => {
      if ($body.find("table").length > 0) {
        return cy.get("table tbody").then(($tbody) => {
          return $tbody.find(`td:contains("${categoryName}")`).length > 0;
        });
      }
      return false;
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
    cy.scrollTo("bottom");
  }

  ensureMinimumCategories(minCount) {
    const minimumRequired = parseInt(minCount);

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
}

export const categoryPage = new CategoryPage();
