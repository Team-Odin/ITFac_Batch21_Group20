class CategoryPage {
  get addCategoryBtn() {
    return cy.get('a[href="/ui/categories/add"]');
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
}

export const categoryPage = new CategoryPage();
