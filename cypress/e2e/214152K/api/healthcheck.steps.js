import { When, Then } from "@badeball/cypress-cucumber-preprocessor";

let response;

When("I send a GET request to {string}", (endpoint) => {
    cy.request({
        method: "GET",
        url: endpoint,
        failOnStatusCode: false,
    }).then((res) => {
        response = res;
    });
});

Then("the response status code should be {int}", (statusCode) => {
    expect(response.status).to.eq(statusCode);
});
