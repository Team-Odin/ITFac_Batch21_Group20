class DashboardPage {
  get categorySummaryCount() {
    // Targets the h3 inside the card that has the "Category" text
    return cy
      .get(".small-box")
      .contains("Category")
      .parents(".small-box")
      .find("h3");
  }
  get mainCategoryCount() {
    // Finds the 'Main' text and gets the bold number div above it
    return cy.contains(".small", "Main").siblings(".fw-bold.fs-5");
  }

  elements = {
    // We use the card title to distinguish between the 4 cards on your dashboard
    categoriesCard: '.card:contains("Categories")',
    plantsCard: '.card:contains("Plants")',
    salesCard: '.card:contains("Sales")',
    inventoryCard: '.card:contains("Inventory")',

    // Specific values inside the Sales card
    revenueValue: '.card:contains("Sales") .fw-bold.fs-5 span',
    salesCount: '.card:contains("Sales") .text-end .fw-bold.fs-5',
    viewSalesBtn: '.card:contains("Sales") a.btn',

    // Values inside the Plants card
    totalPlants: '.card:contains("Plants") .fw-bold.fs-5',
    lowStockCount: '.card:contains("Plants") .text-end .fw-bold.fs-5',
  };

  visit() {
    cy.visit("/ui/dashboard");
  }

  verifySalesRevenue(expectedAmount) {
    cy.get(this.elements.revenueValue).should("contain", expectedAmount);
  }
}

export default new DashboardPage();
