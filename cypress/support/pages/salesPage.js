class SalesPage {
  elements = {
    sellPlantButton: 'a[href="/ui/sales/new"]',
    actionsHeader: 'th:contains("Actions")',
    deleteButtons: ".btn-outline-danger",
    tableRows: "tbody tr",

    columnHeader: (name) => `th a:contains("${name}")`,
    columnCells: (index) => `tbody tr td:nth-child(${index})`,
    paginationNext: '.page-item:not(.disabled) a:contains("Next")',
    paginationPage2: '.page-item:not(.disabled) a:contains("2")',
    activePage: ".page-item.active",
    firstRowPlantName: "tbody tr:first-child td:first-child",
    sellPlantHeading: "h3",
    plantDropdown: "#plantId",
    quantityInput: "#quantity",
    submitBtn: "button.btn-primary",
    errorMessage: ".alert-danger",
    plantReqError: ".text-danger",
    cancelBtn: "a.btn-secondary",
    salesHeader: "h3",
    salesNavLink: '.sidebar .nav-link[href="/ui/sales"]',
    tableRows: "tbody tr",
  };

  visit() {
    cy.visit("/ui/sales");
  }

  checkSellPlantVisibility(shouldBeVisible) {
    if (shouldBeVisible) {
      cy.get(this.elements.sellPlantButton).should("be.visible");
    } else {
      cy.get(this.elements.sellPlantButton).should("not.exist");
    }
  }

  verifyTableHasData(minCount = 1) {
    cy.get(this.elements.tableRows).should("have.length.at.least", minCount);
  }

  checkActionsColumnVisibility(shouldBeVisible) {
    const state = shouldBeVisible ? "be.visible" : "not.exist";
    cy.get(this.elements.actionsHeader).should(state);
    if (!shouldBeVisible) {
      cy.get(this.elements.deleteButtons).should("not.exist");
    } else {
      cy.get(this.elements.deleteButtons).should("be.visible");
    }
  }

  sortByColumn(columnName) {
    cy.get(this.elements.columnHeader(columnName)).click();
  }

  verifyColumnSorted(columnName) {
    const columnMap = {
      Plant: { index: 1, isNumeric: false },
      Quantity: { index: 2, isNumeric: true },
      "Total Price": { index: 3, isNumeric: true },
    };

    const { index, isNumeric } = columnMap[columnName];
    const values = [];

    cy.get(this.elements.columnCells(index))
      .each(($el) => {
        const text = $el.text().trim();
        values.push(isNumeric ? parseFloat(text) : text.toLowerCase());
      })
      .then(() => {
        const sorted = [...values].sort((a, b) => {
          if (isNumeric) return a - b;
          return a.localeCompare(b);
        });
        expect(values).to.deep.equal(sorted);
      });
  }

  clickNextPage() {
    cy.get(this.elements.paginationNext).click();
  }

  clickPageNumber(num) {
    cy.get(`.page-item a:contains("${num}")`).click();
  }

  verifyActivePage(num) {
    cy.get(this.elements.activePage).should("contain", num);
  }

  verifyDataChanged(previousFirstRowText) {
    cy.get(this.elements.firstRowPlantName).should(
      "not.have.text",
      previousFirstRowText,
    );
  }

  clickSellPlant() {
    cy.get(this.elements.sellPlantButton).click();
  }

  verifySellPlantPage() {
    cy.url().should("include", "/ui/sales/new");

    cy.title().should("eq", "QA Training App | Sell Plant");

    cy.get(this.elements.sellPlantHeading)
      .should("be.visible")
      .and("contain", "Sell Plant");
  }

  visitSellPage() {
    cy.visit("/ui/sales/new");
  }

  selectAnyPlant() {
    cy.get(this.elements.plantDropdown).select(1);
  }

  enterQuantity(qty) {
    cy.get(this.elements.quantityInput).clear().type(qty);
  }

  clickSell() {
    cy.get(this.elements.submitBtn).click();
  }

  getPlantDropdownOptions() {
    return cy.get(this.elements.plantDropdown).find("option");
  }

  clickCancel() {
    cy.get(this.elements.cancelBtn).click();
  }

  selectPlantByName(name) {
    cy.get(this.elements.plantDropdown).then(($select) => {
      const option = $select
        .find("option")
        .toArray()
        .find((opt) => opt.text.includes(name));
      if (option) {
        cy.get(this.elements.plantDropdown).select(option.value);
      } else {
        throw new Error(`Plant "${name}" not found in dropdown options.`);
      }
    });
  }
}

export default new SalesPage();
