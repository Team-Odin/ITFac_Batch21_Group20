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
}

export const categoryPage = new CategoryPage();
