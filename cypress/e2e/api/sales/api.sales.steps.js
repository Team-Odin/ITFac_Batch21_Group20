import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import SalesPage from "../../../support/pages/apiSalesPage";

let authToken;
let apiResponse;
let nonAdminToken;

Given("the admin user is authenticated", () => {
  SalesPage.getAuthToken().then((token) => {
    authToken = token;
  });
});

When("I send a GET request to retrieve all sales", () => {
  SalesPage.getAllSales(authToken).then((response) => {
    apiResponse = response;
  });
});

Then("the response should contain a list of sales records", () => {
  expect(apiResponse.body).to.be.an("array");

  const sale = apiResponse.body[0];
  expect(sale).to.have.all.keys(
    "id",
    "plant",
    "quantity",
    "totalPrice",
    "soldAt",
  );
});

When("I send a GET request to retrieve sale with ID {int}", (saleId) => {
  SalesPage.getSaleById(authToken, saleId).then((response) => {
    apiResponse = response;
  });
});

Then(
  "the response should contain the sale record with ID {int}",
  (expectedId) => {
    expect(apiResponse.body.id).to.eq(expectedId);
  },
);

Then("the sale record should contain the correct plant details", () => {
  const sale = apiResponse.body;
  expect(sale).to.have.property("plant");
  expect(sale.plant).to.have.property("name");
  expect(sale.plant).to.have.property("price");
  expect(sale).to.have.property("totalPrice");
});

Then("the response status should be {int}", (statusCode) => {
  expect(apiResponse.status).to.eq(statusCode);
});

Then(
  "the response should contain an error message {string}",
  (expectedMessage) => {
    expect(apiResponse.body.message).to.contain(expectedMessage);
  },
);

When("I send a DELETE request for sale with ID {int}", (saleId) => {
  SalesPage.deleteSale(authToken, saleId).then((response) => {
    apiResponse = response;
  });
});

Then(
  "the sale record with ID {int} should no longer exist in the system",
  (saleId) => {
    SalesPage.getSaleById(authToken, saleId).then((response) => {
      expect(response.status).to.eq(404);
    });
  },
);

When("I send a POST request to sell a plant with an empty body", () => {
  SalesPage.sellPlant(authToken, undefined, undefined).then((response) => {
    apiResponse = response;
  });
});

Then("the response should indicate that {string}", (expectedErrorMessage) => {
  const bodyString = JSON.stringify(apiResponse.body);
  expect(bodyString).to.contain(expectedErrorMessage);
});

Then(
  "the response should contain the validation error {string}",
  (errorMessage) => {
    cy.log("Validation Response:", JSON.stringify(apiResponse.body));

    const bodyString = JSON.stringify(apiResponse.body);
    expect(bodyString).to.contain(errorMessage);
  },
);

When(
  "I send a POST request to sell a plant with missing plant field and quantity {int}",
  (qty) => {
    SalesPage.sellPlant(authToken, undefined, qty).then((response) => {
      apiResponse = response;
    });
  },
);

When(
  "I send a POST request to sell plant ID {int} without providing a quantity",
  (plantId) => {
    SalesPage.sellPlant(authToken, plantId, undefined).then((response) => {
      apiResponse = response;

      cy.log("Full Response:", JSON.stringify(apiResponse.body));
    });
  },
);

When(
  "I send a POST request to sell plant ID {int} with quantity {int}",
  (plantId, qty) => {
    SalesPage.sellPlant(authToken, plantId, qty).then((response) => {
      apiResponse = response;
    });
  },
);

Then(
  "the response should contain the sale details for plant {string}",
  (plantName) => {
    expect(apiResponse.body.plant.name).to.eq(plantName);
    expect(apiResponse.body.plant.id).to.eq(1);
  },
);

Then(
  "the sale record should show the correct quantity {int}",
  (expectedQty) => {
    expect(apiResponse.body.quantity).to.eq(expectedQty);
    expect(apiResponse.body).to.have.property("totalPrice");
    expect(apiResponse.body).to.have.property("soldAt");
  },
);

Then(
  "the total price should be calculated correctly at {int}",
  (expectedTotal) => {
    expect(apiResponse.body.totalPrice).to.eq(expectedTotal);

    expect(apiResponse.body.id).to.be.a("number");
  },
);

Given("a non-admin user is authenticated", () => {
  SalesPage.getAuthTokenNonAdmin().then((token) => {
    nonAdminToken = token;
  });
});

When("I request sales with page {int} and size {int}", (page, size) => {
  SalesPage.getPaginatedSales(authToken, page, size).then((response) => {
    apiResponse = response;
  });
});

Then("the response should contain the correct paginated data", () => {
  expect(apiResponse.body.content).to.be.an("array");
  expect(apiResponse.body.pageable.pageNumber).to.eq(0);

  SalesPage.getAuthTokenNonAdmin().then((token) => {
    SalesPage.getAllSales(token).then((allSalesResponse) => {
      const actualTotal = allSalesResponse.body.length;

      expect(apiResponse.body.totalElements).to.eq(actualTotal);
      cy.log(
        `Verified: Paginated totalElements (${apiResponse.body.totalElements}) matches actual count (${actualTotal})`,
      );
    });
  });
});

When(
  "I send a POST request to sell plant ID {int} with quantity {int} as a non-admin",
  (plantId, qty) => {
    SalesPage.sellPlant(nonAdminToken, plantId, qty).then((response) => {
      apiResponse = response;
    });
  },
);

When("I send a DELETE request for sale ID {int} as a non-admin", (saleId) => {
  SalesPage.deleteSale(nonAdminToken, saleId).then((response) => {
    apiResponse = response;
  });
});

When("I send a GET request to retrieve all sales as a non-admin", () => {
  SalesPage.getAllSales(nonAdminToken).then((response) => {
    apiResponse = response;
  });
});

When("I send a GET request for sale ID {int} as a non-admin", (saleId) => {
  SalesPage.getSaleById(nonAdminToken, saleId).then((response) => {
    apiResponse = response;
  });
});

When(
  "I request sales with page {int}, size {int}, and sort by {string}",
  (page, size, sortField) => {
    SalesPage.getPaginatedSales(nonAdminToken, page, size, sortField).then(
      (response) => {
        apiResponse = response;
      },
    );
  },
);

Then("the response should be sorted by {string}", (sortField) => {
  expect(apiResponse.body.pageable.sort.sorted).to.be.true;

  cy.log(`Sorting by: ${sortField}`);
});
