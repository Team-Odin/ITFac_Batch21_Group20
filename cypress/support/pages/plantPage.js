class PlantPage {
  get plantsMenu() {
    return cy.contains('a[href="/ui/plants"]', "Plants");
  }

  get plantsTable() {
    return cy.get("table");
  }

  visit() {
    cy.visit("/ui/plants");
  }

  visitPlantPage() {
    this.visit();
  }

  assertOnPlantsPage() {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
  }

  assertPlantTableHasData() {
    this.assertOnPlantsPage();
    this.plantsTable.should("be.visible");

    cy.get("table tbody tr").should("exist");
    cy.get("table tbody tr")
      .first()
      .within(() => {
        cy.get("td").should("not.contain", "No plants found");
      });
  }
}

export const plantPage = new PlantPage();
