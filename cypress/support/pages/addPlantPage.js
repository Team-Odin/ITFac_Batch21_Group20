class AddPlantPage {
  get plantNameField() {
    return cy.get('input#name, input[name="name"], input[id*="name" i]');
  }

  get categoryField() {
    return cy.get(
      'select#categoryId, select[name="categoryId"], select[id*="category" i], select[name*="category" i]',
    );
  }

  get priceField() {
    return cy.get(
      'input#price, input[name="price"], input[id*="price" i], input[name*="price" i]',
    );
  }

  get quantityField() {
    return cy.get(
      'input#quantity, input[name="quantity"], input[id*="quantity" i], input[name*="quantity" i]',
    );
  }

  get submitBtn() {
    return cy.get('button[type="submit"], input[type="submit"]');
  }

  visit() {
    cy.visit("/ui/plants/add");
  }

  visitAddPlantPage() {
    this.visit();
  }

  assertOnAddPlantPage() {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants/add");
  }
}

export const addPlantPage = new AddPlantPage();
