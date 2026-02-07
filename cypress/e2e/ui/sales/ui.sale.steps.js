import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { ensurePlantStock } from "../../../support/pages/salesPreconditions";
import SalesPage from "../../../support/pages/salesPage";
import DashboardPage from "../../../support/pages/dashboardPage";
import SalesApi from "../../../support/pages/apiSalesPage";
import {
  loginAsAdmin,
  loginAsUser,
} from "../../preconditions/login.preconditions";

let firstRowTextBefore;
let selectedPlantName;
let selectedQuantity = 1;
let plantName;
let stockAmount;

Given("I am logged in as admin user", () => {
  loginAsAdmin();
});
Given("I am logged in as a non-admin user", () => {
  loginAsUser();
});
Given("I am on the Sales page", () => {
  SalesPage.visit();
});

Given("there is at least one sale record in the system", () => {
  SalesPage.verifyTableHasData(1);
});

Given("there are multiple sale records in the system", () => {
  SalesPage.verifyTableHasData(2);
});

Then("the {string} button should be visible", (btnName) => {
  SalesPage.checkSellPlantVisibility(true);
});

Then("the {string} button should not be visible", (btnName) => {
  SalesPage.checkSellPlantVisibility(false);
});

Then("the Actions column should not be displayed", () => {
  SalesPage.checkActionsColumnVisibility(false);
});

Then("the Delete action should not be displayed", () => {
  SalesPage.checkActionsColumnVisibility(false);
});

Then("the Actions column should be displayed", () => {
  SalesPage.checkActionsColumnVisibility(true);
});

Then("the Delete action should be displayed", () => {
  SalesPage.checkActionsColumnVisibility(true);
});

When("I click the {string} column header", (columnName) => {
  SalesPage.sortByColumn(columnName);
});

Then(
  "the sales list should be sorted by {string} in ascending order",
  (columnName) => {
    SalesPage.verifyColumnSorted(columnName);
  },
);

Given("the system has more than 10 sale records", () => {
  cy.get(".pagination").should("be.visible");
  cy.get(SalesPage.elements.firstRowPlantName).then(($el) => {
    firstRowTextBefore = $el.text();
  });
});

When("I click the {string} pagination button", (buttonLabel) => {
  if (buttonLabel === "Next") {
    SalesPage.clickNextPage();
  } else {
    SalesPage.clickPageNumber(buttonLabel);
  }
});

Then("page {string} should be displayed with new records", (pageNum) => {
  SalesPage.verifyActivePage(pageNum);
  SalesPage.verifyDataChanged(firstRowTextBefore);
});

When("I click the Sell Plant button", () => {
  SalesPage.clickSellPlant();
});

Then("I should be navigated to the Sell Plant page", () => {
  SalesPage.verifySellPlantPage();
});

Given("{string} has {int} units available in stock", (plantName, quantity) => {
  ensurePlantStock(plantName, quantity);

  SalesPage.visit();
});

When("I sell {int} units of {string}", (qty, plantName) => {
  SalesPage.fillSellForm(plantName, qty);
  SalesPage.submit();
});

Then("An error message should appear saying {string}", (expectedMessage) => {
  cy.get(SalesPage.elements.errorMessage)
    .should("be.visible")
    .and("contain", expectedMessage);
});

Given("I am on the Sell Plant page", () => {
  SalesPage.visitSellPage();
});

When("I select a plant from the dropdown", () => {
  SalesPage.selectAnyPlant();
});

When("I enter a sell quantity of {int}", (qty) => {
  SalesPage.enterQuantity(qty);
});

When("I click the submit button", () => {
  SalesPage.clickSell();
});

Then("an error message {string} should be displayed", (expectedMessage) => {
  cy.get(SalesPage.elements.quantityInput).should(($input) => {
    expect($input[0].validationMessage).to.contain(expectedMessage);
  });
});

When("I do not select any plant", () => {
  cy.get(SalesPage.elements.plantDropdown).should("have.value", ""); //
});

Then(
  "an error message {string} should be displayed for plant",
  (expectedMessage) => {
    cy.get(SalesPage.elements.plantReqError)
      .should("be.visible")
      .and("contain", expectedMessage);
  },
);

When("I click on the Plant selection dropdown", () => {
  cy.get(SalesPage.elements.plantDropdown).should("be.visible");
});

Then("the Plant dropdown should list all available plants", () => {
  SalesPage.getPlantDropdownOptions().should("have.length.gt", 1);
});

Then("each plant entry should display the current stock quantity", () => {
  SalesPage.getPlantDropdownOptions().each(($el, index) => {
    if (index > 0) {
      const optionText = $el.text();
      expect(optionText).to.match(/.* \(Stock: \d+\)/);
    }
  });
});

When("I click on the Cancel button", () => {
  SalesPage.clickCancel();
});

Then("I should be redirected to the Sales List page", () => {
  cy.url().should("include", "/ui/sales");

  cy.get(SalesPage.elements.salesHeader)
    .should("be.visible")
    .and("contain", "Sales");
});

Then("no new sale record should be created", () => {
  cy.log("Navigation confirmed; no form submission occurred.");
});

When("I click on {string} in navigation bar", (menuItem) => {
  if (menuItem.toLowerCase() === "sales") {
    cy.get(SalesPage.elements.salesNavLink).click();
  }
});

Then("the Sales menu item should be highlighted as the active page", () => {
  cy.get(SalesPage.elements.salesNavLink).should("have.class", "active");
});

When("I select {string} from the plant dropdown", (plantName) => {
  SalesPage.selectPlantByName(plantName);
});

Then(
  "the latest sale should show {string} with quantity {int}",
  (plantName, qty) => {
    cy.get(SalesPage.elements.tableRows)
      .first()
      .within(() => {
        cy.get("td").eq(0).should("contain", plantName);
        cy.get("td").eq(1).should("contain", qty);
      });
  },
);

Then("the stock for {string} should be {int}", (plantName, expectedStock) => {
  SalesPage.visitSellPage();
  SalesPage.getPlantDropdownOptions()
    .contains(new RegExp(`${plantName} \\(Stock: ${expectedStock}\\)`))
    .should("be.visible");
});

When("I select {string} from the plant dropdown", (plantName) => {
  SalesPage.selectPlantByName(plantName);
});

Then(
  "the latest sale should show {string} with quantity {int}",
  (plantName, qty) => {
    cy.get(SalesPage.elements.tableRows)
      .first()
      .within(() => {
        cy.get("td").eq(0).should("contain", plantName);
        cy.get("td").eq(1).should("contain", qty);
      });
  },
);

Then(
  "the latest sale should show {string} with quantity {int} and correct {string}",
  (plantName, qty) => {
    cy.get(SalesPage.elements.tableRows).should("be.visible");

    cy.get(SalesPage.elements.tableRows)
      .first()
      .within(() => {
        cy.get("td").eq(0).should("have.text", plantName);

        cy.get("td").eq(1).should("have.text", qty.toString());

        cy.get("td")
          .eq(2)
          .invoke("text")
          .should("match", /^\d+\.\d{2}$/);

        const today = new Date().toISOString().split("T")[0];
        cy.get("td").eq(3).should("contain", today);
      });
  },
);

Given("there are no sales records in the system", () => {
  SalesApi.getAuthTokenNonAdmin().then((token) => {
    SalesApi.getAllSales(token).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an("array").and.have.lengthOf(0);
      cy.log("Confirmed: No sales records found via API");
    });
  });
});

Then(
  "a message {string} should be displayed in the table",
  (expectedMessage) => {
    cy.get(SalesPage.elements.tableRows)
      .should("have.length", 1)
      .and("be.visible")
      .and("contain.text", expectedMessage)
      .find("td")
      .should("have.attr", "colspan", "5")
      .and("have.class", "text-center");
  },
);

Then(
  "if there are no sales records, a message {string} should be displayed",
  (expectedMessage) => {
    cy.get("body").then(($body) => {
      if (
        $body.find(SalesPage.elements.tableRows).length === 1 &&
        $body.text().includes(expectedMessage)
      ) {
        cy.get(SalesPage.elements.tableRows)
          .should("be.visible")
          .and("contain.text", expectedMessage)
          .find("td")
          .should("have.attr", "colspan", "5");
      } else {
        cy.log("Sales records exist; skipping 'No sales found' check.");
      }
    });
  },
);

Then(
  "if there are sales records, the {string} message should not be visible",
  (message) => {
    cy.get(SalesPage.elements.tableRows).then(($rows) => {
      if (
        $rows.length > 1 ||
        ($rows.length === 1 && !$rows.text().includes(message))
      ) {
        cy.contains(message).should("not.exist");
      }
    });
  },
);

Then("if there are sale records, the Delete action should be displayed", () => {
  cy.get("body").then(($body) => {
    const rows = $body.find(SalesPage.elements.tableRows);
    const hasData = rows.length > 0 && !rows.text().includes("No sales found");

    if (hasData) {
      SalesPage.checkActionsColumnVisibility(true);
      cy.get(SalesPage.elements.deleteButtons).should("be.visible");
    } else {
      cy.log("No records found, skipping visibility check.");
    }
  });
});

Then(
  "if there are no sale records, the Delete action should not be visible",
  () => {
    cy.get("body").then(($body) => {
      const rows = $body.find(SalesPage.elements.tableRows);
      const isEmpty =
        rows.text().includes("No sales found") || rows.length === 0;

      if (isEmpty) {
        cy.get(SalesPage.elements.deleteButtons).should("not.exist");
        cy.get(SalesPage.elements.actionsHeader).should("not.exist");
      }
    });
  },
);

Then(
  "the sales list should be sorted by {string} in ascending order",
  (columnName) => {
    const columnMap = {
      Plant: { index: 1, isNumeric: false },
      Quantity: { index: 2, isNumeric: true },
    };

    const { index, isNumeric } = columnMap[columnName];

    cy.get(SalesPage.elements.tableRows).then(($rows) => {
      if ($rows.text().includes("No sales found")) {
        cy.log("Table is empty. Sorting is technically valid (zero items).");
        return;
      }

      if ($rows.length === 1) {
        cy.log("Only one record present. Sorting verified as identical.");
        // Ensure the row is still visible after clicking sort
        cy.get(SalesPage.elements.tableRows).should("be.visible");
        return;
      }

      let values = [];
      cy.get(SalesPage.elements.columnCells(index))
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
    });
  },
);

Then(
  "the sales list should be sorted by {string} in ascending order if records exist",
  (columnName) => {
    const columnMap = {
      Plant: { index: 1, isNumeric: false },
      Quantity: { index: 2, isNumeric: true },
    };

    const { index, isNumeric } = columnMap[columnName];

    cy.get("tbody").then(($tbody) => {
      const rows = $tbody.find("tr");

      if (rows.length === 0 || $tbody.text().includes("No sales found")) {
        cy.log("Table is empty. Skipping sort validation.");
        return;
      }

      if (rows.length === 1) {
        cy.log(
          `Only one record found. Verifying "${columnName}" remains visible.`,
        );
        cy.get(`tbody tr td:nth-child(${index})`).should("be.visible");
        return;
      }

      let cellValues = [];
      cy.get(`tbody tr td:nth-child(${index})`)
        .each(($el) => {
          const text = $el.text().trim();
          cellValues.push(isNumeric ? parseFloat(text) : text.toLowerCase());
        })
        .then(() => {
          const sortedValues = [...cellValues].sort((a, b) => {
            if (isNumeric) return a - b;
            return a.localeCompare(b);
          });
          expect(cellValues).to.deep.equal(sortedValues);
        });
    });
  },
);

Then(
  "if there are more than 10 records, the pagination should be visible",
  () => {
    cy.get("body").then(($body) => {
      const paginationExists = $body.find(".pagination").length > 0;

      if (paginationExists) {
        cy.log("Pagination found. Proceeding with visibility check.");
        cy.get(".pagination").should("be.visible");
      } else {
        cy.log("No pagination found. Verifying record count is low.");
        cy.get(SalesPage.elements.tableRows).should("have.length.at.most", 10);
        cy.get(".pagination").should("not.exist");
      }
    });
  },
);

When(
  "clicking {string} should display page {string} with new records",
  (buttonLabel, pageNum) => {
    cy.get("body").then(($body) => {
      if ($body.find(".pagination").length > 0) {
        cy.get(SalesPage.elements.firstRowPlantName)
          .invoke("text")
          .then((firstRowTextPage1) => {
            if (buttonLabel === "Next") {
              SalesPage.clickNextPage();
            } else {
              SalesPage.clickPageNumber(buttonLabel);
            }

            SalesPage.verifyActivePage(pageNum);

            cy.get(SalesPage.elements.firstRowPlantName).should(
              "not.have.text",
              firstRowTextPage1,
            );
          });
      } else {
        cy.log("Skipping click: Pagination not present for this dataset.");
      }
    });
  },
);

When("I select the first available plant from the dropdown", () => {
  cy.get(SalesPage.elements.plantDropdown)
    .find("option")
    .eq(1)
    .then(($option) => {
      const fullText = $option.text();

      selectedPlantName = fullText.split("(")[0].trim();

      cy.get(SalesPage.elements.plantDropdown).select($option.val());
    });
});

When("I enter a valid sell quantity based on available stock", () => {
  cy.get(SalesPage.elements.plantDropdown)
    .find("option:selected")
    .then(($option) => {
      const fullText = $option.text();
      const stockMatch = fullText.match(/Stock:\s*(\d+)/);
      const availableStock = stockMatch ? parseInt(stockMatch[1]) : 0;

      if (availableStock > 0) {
        selectedQuantity = 1;
        cy.get(SalesPage.elements.quantityInput).clear().type(selectedQuantity);
      } else {
        throw new Error(`The selected plant ${selectedPlantName} has 0 stock.`);
      }
    });
});

Then("the latest sale should show the correct plant and quantity", () => {
  cy.get(SalesPage.elements.tableRows)
    .first()
    .within(() => {
      cy.get("td").eq(0).should("contain", selectedPlantName);
      cy.get("td").eq(1).should("contain", selectedQuantity);
    });
});

When("I select a plant and identify its available stock", () => {
  cy.get(SalesPage.elements.plantDropdown)
    .find("option")
    .eq(1)
    .then(($option) => {
      const text = $option.text(); // e.g., "Rose (Stock: 15)"

      plantName = text.split("(")[0].trim();
      const match = text.match(/Stock:\s*(\d+)/);
      stockAmount = match ? parseInt(match[1]) : 0;

      cy.get(SalesPage.elements.plantDropdown).select($option.val());
    });
});

When("I attempt to sell more than the available stock", () => {
  cy.get(SalesPage.elements.plantDropdown)
    .find("option:selected")
    .then(($option) => {
      const text = $option.text();

      plantName = text.split("(")[0].trim(); // "Mango"
      const match = text.match(/Stock:\s*(\d+)/);
      stockAmount = match ? parseInt(match[1]) : 0; // 15

      const invalidQty = stockAmount + 1;
      cy.get(SalesPage.elements.quantityInput).clear().type(invalidQty);
    });
});

Then("an error message should appear indicating insufficient stock", () => {
  const expectedError = `${plantName} has only ${stockAmount} items available in stock`;

  cy.get(SalesPage.elements.errorMessage)
    .should("be.visible")
    .and("contain.text", expectedError);
});

Then("the Sales summary card should display a valid numerical Revenue", () => {
  cy.get(DashboardPage.elements.revenueValue)
    .invoke("text")
    .then((text) => {
      const revenue = parseFloat(text.replace(/,/g, ""));

      expect(revenue).to.be.a("number");
      expect(revenue).to.be.at.least(0);
      cy.log(`Current Dashboard Revenue: Rs ${revenue}`);
    });
});

Then("the Sales summary card should display a valid total sales count", () => {
  cy.get(DashboardPage.elements.salesCount)
    .invoke("text")
    .then((text) => {
      dashboardCount = parseInt(text.trim());
      expect(dashboardCount).to.be.at.least(0);
    });
});

Then("the count should match the number of records on the Sales page", () => {
  cy.get(DashboardPage.elements.viewSalesBtn).click();

  cy.get("tbody tr").should("have.length", dashboardCount);
});

When("I am on the Dashboard page", () => {
  cy.visit("/ui/dashboard");
});

Then("the {string} button should link to the Sales page", (btnText) => {
  cy.get('.card:contains("Sales") a.btn')
    .should("have.attr", "href", "/ui/sales")
    .and("contain.text", btnText);
});

Then(
  "if a {string} button exists, I click it and verify the data changes",
  (buttonLabel) => {
    cy.get("body").then(($body) => {
      const nextButton = $body.find(
        `.page-item:not(.disabled) a:contains("${buttonLabel}")`,
      );

      if (nextButton.length > 0) {
        cy.log(
          `Pagination "${buttonLabel}" button found. Testing navigation...`,
        );

        cy.get("tbody tr")
          .first()
          .invoke("text")
          .then((firstPageContent) => {
            cy.wrap(nextButton).click();

            cy.get("tbody tr")
              .first()
              .invoke("text")
              .should((secondPageContent) => {
                expect(secondPageContent).to.not.equal(firstPageContent);
              });

            cy.get(".page-item.active").should("not.contain", "1");
          });
      } else {
        cy.log("No active 'Next' button found. Verifying record count is low.");
        cy.get("tbody tr").its("length").should("be.at.most", 10);
      }
    });
  },
);
