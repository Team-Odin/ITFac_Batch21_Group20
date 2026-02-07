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

  nameInput() {
    return this.plantNameField;
  }

  categorySelect() {
    return this.categoryField;
  }

  priceInput() {
    return this.priceField;
  }

  quantityInput() {
    return this.quantityField;
  }

  saveButton() {
    return this.submitBtn;
  }

  clickSave() {
    return cy
      .contains('button, input[type="submit"], a', /^save$/i, {
        timeout: 10000,
      })
      .should("be.visible")
      .click();
  }

  clickCancel() {
    return cy
      .contains("button, a", /cancel/i, { timeout: 10000 })
      .should("be.visible")
      .click({ force: true });
  }

  createPlantSimple(name, price = "100", quantity = "1", categoryName) {
    this.visitAddPlantPage();
    this.assertOnAddPlantPage();

    this.nameInput().should("be.visible").clear().type(name);
    this.priceInput().should("be.visible").clear().type(String(price));
    this.quantityInput().should("be.visible").clear().type(String(quantity));

    return this.categorySelect()
      .should("be.visible")
      .then(($select) => {
        const options = Array.from($select[0].options || [])
          .map((o) => ({ value: o.value, text: String(o.text || "").trim() }))
          .filter((o) => o.text && o.value);

        const desired = String(categoryName || "")
          .trim()
          .toLowerCase();
        const match = options.find((o) => o.text.toLowerCase() === desired);
        const fallback = options[0];

        const value = match?.value || fallback?.value;
        if (!value) throw new Error("No category option available");

        return cy
          .wrap($select)
          .select(value)
          .then(() => this.clickSave())
          .then(() => {
            cy.location("pathname", { timeout: 10000 }).should(
              "eq",
              "/ui/plants",
            );
          });
      });
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
