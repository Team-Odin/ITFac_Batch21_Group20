class AddCategoryPage {
  get saveCategoryBtn() {
    return cy.get('button[type="submit"]');
  }

  get categoryNameField() {
    return cy.get('input[id="name"]');
  }

  get submitBtn() {
    return cy.get('button[type="submit"]');
  }

  visit() {
    cy.visit("/ui/categories/add");
  }

  visitAddCategoryPage() {
    this.visit();
  }
}

export const addCategoryPage = new AddCategoryPage();
