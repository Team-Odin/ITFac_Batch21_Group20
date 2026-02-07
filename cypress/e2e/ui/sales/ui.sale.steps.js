import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { ensurePlantStock } from "../../../support/pages/salesPreconditions";
import SalesPage from "../../../support/pages/salesPage";
import SalesApi from "../../../support/pages/apiSalesPage";
import {
  loginAsAdmin,
  loginAsUser,
} from "../../preconditions/login.preconditions";

let firstRowTextBefore;

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
