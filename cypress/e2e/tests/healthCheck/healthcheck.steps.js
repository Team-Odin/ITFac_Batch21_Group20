import { When, Then } from "@badeball/cypress-cucumber-preprocessor";

let response;

const doGet = (endpoint) => {
  return cy
    .request({
      method: "GET",
      url: endpoint,
      failOnStatusCode: false,
    })
    .then((res) => {
      response = res;
    });
};

When("I GET {string}", (endpoint) => {
  return doGet(endpoint);
});

When("I send a GET request to {string}", (endpoint) => {
  return doGet(endpoint);
});

Then("the response status should be {int}", (statusCode) => {
  expect(response, "response should be set by the previous step").to.exist;
  expect(response.status).to.eq(statusCode);
});

Then("the response status code should be {int}", (statusCode) => {
  expect(response, "response should be set by the previous step").to.exist;
  expect(response.status).to.eq(statusCode);
});
