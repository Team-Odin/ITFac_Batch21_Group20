class SalesPage {
  constructor() {
    this.authUrl = "http://localhost:8080/api/auth/login";
    this.salesUrl = "http://localhost:8080/api/sales";
    this.sellPlantUrl = "http://localhost:8080/api/sales/plant";
    this.paginatedSalesUrl = "http://localhost:8080/api/sales/page";
  }

  getAuthToken() {
    return cy
      .request({
        method: "POST",
        url: this.authUrl,
        body: {
          username: Cypress.env("ADMIN_USER"),
          password: Cypress.env("ADMIN_PASS"),
        },
      })
      .then((response) => response.body.token);
  }

  getAuthTokenNonAdmin() {
    return cy
      .request({
        method: "POST",
        url: this.authUrl,
        body: {
          username: Cypress.env("USER_USER"),
          password: Cypress.env("USER_PASS"),
        },
      })
      .then((response) => response.body.token);
  }

  getAllSales(token) {
    return cy.request({
      method: "GET",
      url: this.salesUrl,
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      failOnStatusCode: false,
    });
  }

  getSaleById(token, id) {
    return cy.request({
      method: "GET",
      url: `${this.salesUrl}/${id}`,
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      failOnStatusCode: false,
    });
  }

  deleteSale(token, id) {
    return cy.request({
      method: "DELETE",
      url: `${this.salesUrl}/${id}`,
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      failOnStatusCode: false,
    });
  }

  sellPlant(token, plantId, quantity) {
    return cy.request({
      method: "POST",
      url: `${this.sellPlantUrl}/${plantId}?quantity=${quantity}`,
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      failOnStatusCode: false,
    });
  }

  getPaginatedSales(token, page, size, sortField = "") {
    return cy.request({
      method: "GET",
      url: `${this.paginatedSalesUrl}?page=${page}&size=${size}&sort=${sortField}`,
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`,
      },
      failOnStatusCode: false,
    });
  }

  searchPlants(name, categoryId, page = 0, size = 1) {
    return cy.request({
      method: "GET",
      url: `${this.plantsBaseUrl}/paged`,
      qs: {
        name: name,
        categoryId: categoryId,
        page: page,
        size: size,
        sort: "name",
      },
      headers: {
        Authorization: `Bearer ${Cypress.env("USER_TOKEN")}`,
      },
    });
  }
}

export default new SalesPage();
