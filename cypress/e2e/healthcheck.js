const { When, Then } = require("@badeball/cypress-cucumber-preprocessor");

let lastResponse;

When("I GET {string}", (path) => {
  cy.request({ url: path, failOnStatusCode: false }).then((res) => {
    lastResponse = res;
  });
});

Then("the response status should be {int}", (statusCode) => {
  expect(lastResponse && lastResponse.status).to.eq(statusCode);
});
