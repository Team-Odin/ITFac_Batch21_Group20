class PlantPage {
  get plantsMenu() {
    // Some builds may not keep the exact href attribute, but the visible label is stable.
    return cy.contains("a", "Plants");
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
