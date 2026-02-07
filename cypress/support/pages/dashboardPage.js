class DashboardPage {
    get categorySummaryCount() {
        // Targets the h3 inside the card that has the "Category" text
        return cy.get('.small-box')
            .contains('Category')
            .parents('.small-box')
            .find('h3');
    }
    get mainCategoryCount() {
        // Finds the 'Main' text and gets the bold number div above it
        return cy.contains('.small', 'Main')
            .siblings('.fw-bold.fs-5');
    }
}
export default new DashboardPage();