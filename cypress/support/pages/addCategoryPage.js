class AddCategoryPage {
  get saveCategoryBtn() {
    return cy.get('button[type="submit"]');
  }

  get categoryNameField() {
    return cy.get('input[id="name"]');
  }

  get parentCategoryField() {
    return cy.get('select[id="parentId"]');
  }

  get submitBtn() {
    return cy.get('button[type="submit"]');
  }

  get cancelBtn() {
    return cy.get('a[href="/ui/categories"]').contains("Cancel");
  }

  addACategory(categoryValue) {
    this.categoryNameField.should("be.visible").clear().type(categoryValue);
  }

  createCategory(categoryName, parentCategory = null) {
    this.categoryNameField.should("be.visible").clear().type(categoryName);

    if (parentCategory) {
      this.parentCategoryField.should("be.visible").select(parentCategory);
    }

    this.submitBtn.should("be.visible").click();
  }

  get categoryNameInput() {
    return cy.get("#name"); // Adjust selector based on your HTML
  }

  get saveButton() {
    return cy.get('button[type="submit"]');
  }

  get errorMessage() {
    // Prefer field-level feedback, but also allow alert-style errors.
    // Exclude nav links like "Logout" that may use .text-danger.
    return cy
      .get("body")
      .find(".invalid-feedback, form .text-danger, .alert-danger")
      .not("a");
  }

  visit() {
    cy.visit("/ui/categories/add");
  }

  visitAddCategoryPage() {
    this.visit();
  }
}

export const addCategoryPage = new AddCategoryPage();
