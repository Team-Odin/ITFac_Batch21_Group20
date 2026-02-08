class PlantPage {
  get plantsMenu() {
    // Some builds may not keep the exact href attribute, but the visible label is stable.
    return cy.contains("a", "Plants");
  }

  get plantsTable() {
    return cy.get("table");
  }

  get searchInput() {
    return cy.get('input[placeholder="Search plant"]', { timeout: 10000 });
  }

  get searchBtn() {
    return cy.contains("button", "Search");
  }

  get addPlantBtn() {
    // UI text may be "Add Plant" or "Add A Plant".
    return cy.contains("a,button", /add\s+(a\s+)?plant/i);
  }

  assertPlantsTableVisible() {
    this.plantsTable.should("be.visible");
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

  searchByName(text) {
    const value = this.normalizeSpaces(text);
    this.searchInput.should("be.visible").clear();
    if (value) this.searchInput.type(value);
    return this.searchBtn.should("be.visible").click();
  }

  getDataRows() {
    return cy.get("table tbody tr").then(($rows) => {
      return Array.from($rows).filter((row) => {
        const $tds = Cypress.$(row).find("td");
        if ($tds.length === 0) return false;
        if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan"))
          return false;

        const rowText = this.normalizeSpaces(row.innerText).toLowerCase();
        if (rowText.includes("no plants found") || rowText.includes("no data"))
          return false;

        return true;
      });
    });
  }

  getColumnIndexByHeader(headerText) {
    const target = this.normalizeSpaces(headerText).toLowerCase();

    return cy.get("table thead th").then(($ths) => {
      const headers = Array.from($ths).map((th) =>
        this.normalizeSpaces(Cypress.$(th).text()).toLowerCase(),
      );
      const index = headers.findIndex(
        (h) => h === target || h.includes(target),
      );

      if (index < 0) {
        throw new Error(
          `Could not find table header '${headerText}'. Headers: ${headers.join(" | ")}`,
        );
      }

      return index;
    });
  }

  getCellText(row, index) {
    return this.normalizeSpaces(Cypress.$(row).find("td").eq(index).text());
  }

  captureTopRowsSnapshot(maxRows = 3) {
    return cy.get("table tbody tr").then(($rows) => {
      const limit = Math.min(Number(maxRows) || 0, $rows.length);
      return Array.from($rows)
        .slice(0, limit)
        .map((r) => this.normalizeSpaces(r.innerText));
    });
  }

  selectCategoryFilter(optionText) {
    const desired = this.normalizeSpaces(optionText).toLowerCase();

    return cy.get("select").then(($selects) => {
      const selects = $selects.toArray();
      if (selects.length === 0)
        throw new Error("No category filter dropdown found");

      const findValue = (sel) => {
        const options = Array.from(sel.options || []).map((o) => ({
          value: o.value,
          text: this.normalizeSpaces(o.text),
        }));
        return options.find((o) => o.text.toLowerCase() === desired)?.value;
      };

      const chosen =
        selects.find((sel) => Boolean(findValue(sel))) ?? selects[0];
      const value = findValue(chosen);
      if (!value) {
        throw new Error(
          `Category filter does not contain option '${optionText}'`,
        );
      }

      return cy.wrap(chosen).select(value, { force: true });
    });
  }

  assertOnlyRowsContainText(expectedText) {
    const expected = this.normalizeSpaces(expectedText).toLowerCase();

    return this.getDataRows().then((rows) => {
      const list = Array.isArray(rows) ? rows : Array.from(rows || []);
      expect(list.length, "rows after search").to.be.greaterThan(0);
      if (!expected) return;

      list.forEach((row) => {
        const rowText = this.normalizeSpaces(row.innerText).toLowerCase();
        expect(rowText).to.include(expected);
      });
    });
  }

  assertOnlyRowsMatchCategory(expectedCategory) {
    const expected = this.normalizeSpaces(expectedCategory);

    return this.getColumnIndexByHeader("Category").then((colIndex) => {
      return this.getDataRows().then((rows) => {
        const list = Array.isArray(rows) ? rows : Array.from(rows || []);
        expect(list.length, "rows after filtering").to.be.greaterThan(0);
        list.forEach((row) => {
          expect(this.getCellText(row, colIndex)).to.include(expected);
        });
      });
    });
  }

  assertNoPlantsFoundMessage(message) {
    this.assertPlantsTableVisible();
    this.plantsTable.should("contain.text", message);
  }

  assertActionsHiddenForNonAdmin(editLabel = "Edit", deleteLabel = "Delete") {
    this.assertPlantsTableVisible();

    cy.get("table thead tr th").then(($ths) => {
      const headers = Array.from($ths).map((th) =>
        this.normalizeSpaces(th.innerText).toLowerCase(),
      );
      const actionsIdx = headers.findIndex((h) => h.includes("actions"));

      cy.get("table tbody tr").each(($row) => {
        const $tds = Cypress.$($row).find("td");
        if ($tds.length === 0) return;
        if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;

        const idx = actionsIdx >= 0 ? actionsIdx : $tds.length - 1;
        const $cell = Cypress.$($tds[idx]);

        const $edit = $cell.find(
          'a[title="Edit"], a[href*="/ui/plants/edit"], button[title="Edit"]',
        );
        const $del = $cell.find(
          'button[title="Delete"], a[title="Delete"], form[action*="/ui/plants/delete"] button',
        );

        if (String(editLabel).toLowerCase().includes("edit")) {
          this.assertHiddenOrDisabled($edit, "Edit");
        }
        if (String(deleteLabel).toLowerCase().includes("delete")) {
          this.assertHiddenOrDisabled($del, "Delete");
        }
      });
    });
  }

  assertHiddenOrDisabled($el, label) {
    if (!$el || $el.length === 0) return;

    cy.wrap($el[0]).should(($node) => {
      const $n = Cypress.$($node);
      const disabledAttr =
        $n.is(":disabled") ||
        $n.is("[disabled]") ||
        $n.attr("aria-disabled") === "true";
      const className = String($n.attr("class") || "");
      const disabledClass = className.split(/\s+/g).includes("disabled");

      expect(
        disabledAttr || disabledClass,
        `${label} action should be hidden or disabled for non-admin`,
      ).to.eq(true);
    });
  }

  assertBadgeVisible(badgeText) {
    const expected = this.normalizeSpaces(badgeText);
    const isLowStock = /low\s*stock|low/i.test(expected.toLowerCase());
    const regex = isLowStock ? /low\s*stock|low/i : new RegExp(expected, "i");
    this.assertPlantsTableVisible();
    cy.contains("table", regex).should("be.visible");
  }

  assertSortedByName(direction) {
    const normalizedDirection = String(direction || "").toLowerCase();

    return this.getColumnIndexByHeader("Name").then((nameColIndex) => {
      return cy.get("table tbody tr").should(($rows) => {
        const rows = Array.from($rows).filter((row) => {
          const $tds = Cypress.$(row).find("td");
          if ($tds.length === 0) return false;
          if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan"))
            return false;

          const rowText = this.normalizeSpaces(row.innerText).toLowerCase();
          if (
            rowText.includes("no plants found") ||
            rowText.includes("no data")
          )
            return false;

          return true;
        });

        const names = rows.map((row) =>
          this.getCellText(row, nameColIndex).toLowerCase(),
        );
        const sorted = [...names].sort((a, b) => a.localeCompare(b));
        const isAscending = Cypress._.isEqual(names, sorted);
        const isDescending = Cypress._.isEqual(names, [...sorted].reverse());

        if (normalizedDirection.includes("desc")) {
          expect(isDescending, "descending sort by name").to.eq(true);
          return;
        }

        expect(isAscending, "ascending sort by name").to.eq(true);
      });
    });
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
