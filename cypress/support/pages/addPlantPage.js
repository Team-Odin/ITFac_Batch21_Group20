export const addPlantPage = {
  visitAddPlantPage: () => cy.visit("/ui/plants/add"),

  addButton: () => cy.contains("button", "Add a Plant"),
  saveButton: () => cy.contains("button", "Save"),
  cancelButton: () => cy.contains("button, a", /cancel/i),

  nameInput: () => cy.get('input[name="name"]'),
  categorySelect: () => cy.get('select[name="categoryId"]'),
  priceInput: () => cy.get('input[name="price"]'),
  quantityInput: () => cy.get("#quantity"),
};
