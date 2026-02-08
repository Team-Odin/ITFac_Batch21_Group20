class PlantPage {
  get plantsMenu() {
    // Some builds may not keep the exact href attribute, but the visible label is stable.
    return cy.contains("a", "Plants");
  }

  get plantsTable() {
    return cy.get("table");
  }

  get addPlantBtn() {
    // UI text may be "Add Plant" or "Add A Plant".
    return cy.contains("a,button", /add\s+(a\s+)?plant/i);
  }

  visit() {
    cy.visit("/ui/plants");
  }

  visitPlantPage() {
    this.visit();
  }

  assertOnPlantsPage() {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/plants");
  }

  assertPlantTableHasData() {
    this.assertOnPlantsPage();
    this.plantsTable.should("be.visible");

    cy.get("table tbody tr").should("exist");
    cy.get("table tbody tr")
      .first()
      .within(() => {
        cy.get("td").should("not.contain", "No plants found");
      });
  }

  normalizeSpaces(value) {
    return String(value ?? "")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  getAddPlantButton(label) {
    const text = this.normalizeSpaces(label || "Add Plant");
    const pattern = new RegExp(`^${this.escapeRegExp(text)}$`, "i");
    return cy.contains("a,button", pattern);
  }

  clickAddPlantButton(label) {
    return this.getAddPlantButton(label).should("be.visible").click();
  }

  static apiLoginAsNonAdmin() {
    const username = Cypress.env("USER_USER");
    const password = Cypress.env("USER_PASS");

    if (!username || !password) {
      throw new Error(
        "Missing non-admin credentials. Set USER_USER and USER_PASS in your .env (or as CYPRESS_USER_USER/CYPRESS_USER_PASS).",
      );
    }

    return cy
      .request({
        method: "POST",
        url: "/api/auth/login",
        body: { username, password },
        failOnStatusCode: true,
      })
      .its("body")
      .then((body) => {
        const token = body?.token;
        const tokenType = body?.tokenType || "Bearer";
        if (!token) throw new Error("Login response missing token");
        return `${tokenType} ${token}`;
      });
  }

  static normalizeEndpoint(raw) {
    const cleaned = String(raw).replaceAll(/\s+/g, "").trim();
    if (!cleaned) throw new Error("Endpoint is empty");
    if (cleaned.startsWith("/")) return cleaned;
    if (cleaned.startsWith("api/")) return `/${cleaned}`;
    if (cleaned.startsWith("api")) return `/${cleaned}`;
    return `/${cleaned}`;
  }

  constructor(authHeader = null) {
    this.authHeader = authHeader;
    this.authUrl = "http://localhost:8080/api/auth/login";
    this.plantsBaseUrl = "http://localhost:8080/api/plants";
  }

  setAuthHeader(authHeader) {
    this.authHeader = authHeader;
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

  deletePlant(plantId, token) {
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    return cy.request({
      method: "DELETE",
      url: `${this.plantsBaseUrl}/${plantId}`,
      headers: { Authorization: authHeader, Accept: "*/*" },
      failOnStatusCode: false,
    });
  }

  getPlant(plantId, token) {
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    return cy.request({
      method: "GET",
      url: `${this.plantsBaseUrl}/${plantId}`,
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    });
  }

  updatePlantStrictBody(id, token) {
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    return cy.request({
      method: "PUT",
      url: `${this.plantsBaseUrl}/${id}`,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: {
        id: Number(id),
        name: "updateName",
        price: 150,
        quantity: 25,
        category: { id: 1 },
      },
      failOnStatusCode: false,
    });
  }

  searchPlants(name, categoryId, token, page = 0, size = 1) {
    const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
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
      headers: { Authorization: authHeader },
      failOnStatusCode: false,
    });
  }
}

export const plantPage = new PlantPage();
