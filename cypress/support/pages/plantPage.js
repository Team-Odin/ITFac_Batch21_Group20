class PlantPage {
  get plantsMenu() {
    // Some builds may not keep the exact href attribute, but the visible label is stable.
    return cy.contains("a", "Plants");
  }

  get plantsTable() {
    return cy.get("table");
  }

  get searchInput() {
    return cy.get('input[placeholder="Search plant"]', { timeout: 10000 });
  }

  get searchBtn() {
    return cy.contains("button", "Search");
  }

  get addPlantBtn() {
    return cy.contains("Add a Plant", { timeout: 10000 }).should("be.visible");
  }

  visitPlantPage() {
    cy.visit("/ui/plants");
    this.assertOnPlantsPage();
  }

  assertOnPlantsPage() {
    cy.location("pathname").should("eq", "/ui/plants");
    this.plantsTable.should("be.visible");
  }

  assertPlantTableHasData() {
    cy.get("table tbody tr").should("exist").and("have.length.greaterThan", 0);
  }

  deletePlantIfExists(plantName) {
    cy.get("table tbody tr").then((rows) => {
      const row = [...rows].find((r) => r.innerText.includes(plantName));
      if (row) {
        cy.wrap(row).find(".delete-btn").click();
        cy.on("window:confirm", () => true);
      }
    });
  }
}

export const plantPage = new PlantPage();
