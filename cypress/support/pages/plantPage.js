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
    return cy
      .contains(/add\s+(a\s+)?plant/i, { timeout: 10000 })
      .should("be.visible");
  }

  normalizeSpaces(value) {
    return String(value ?? "")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  assertPlantsTableVisible() {
    this.plantsTable.should("be.visible");
  }

  clickAddPlantButton() {
    return this.addPlantBtn.should("be.visible").click();
  }

  assertAddPlantButtonVisible() {
    return this.addPlantBtn.should("be.visible");
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

  clickHeaderByText(headerText) {
    const label = this.normalizeSpaces(headerText);
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^\\s*${escaped}\\s*$`, "i");
    cy.get("table thead th").contains(re).click();
    this.assertPlantsTableVisible();
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

  assertActionVisibleForPlant(plantName, action) {
    const selector =
      action.toLowerCase() === "edit"
        ? 'a[title="Edit"], a[href*="/ui/plants/edit"], button[title="Edit"], .btn-outline-primary'
        : 'button[title="Delete"], a[title="Delete"], form[action*="/ui/plants/delete"] button, .btn-outline-danger';

    cy.get("table tbody tr")
      .contains("td", plantName)
      .parent("tr")
      .within(() => {
        cy.get(selector).should("be.visible");
      });
  }

  clickEditForPlant(plantName) {
    return cy
      .get("table tbody tr")
      .contains("td", plantName)
      .parent("tr")
      .within(() => {
        cy.get(
          'a[title="Edit"], a[href*="/ui/plants/edit"], button[title="Edit"], .btn-outline-primary',
        )
          .should("exist")
          .click({ force: true });
      });
  }

  clickDeleteForPlant(plantName) {
    return cy
      .get("table tbody tr")
      .contains("td", plantName)
      .parent("tr")
      .within(() => {
        cy.get(
          'button[title="Delete"], a[title="Delete"], form[action*="/ui/plants/delete"] button, .btn-outline-danger',
        )
          .scrollIntoView()
          .should("exist")
          .click({ force: true });
      });
  }

  assertBadgeForPlant(plantName, badgeText) {
    const expected = this.normalizeSpaces(badgeText);
    const badgeRegex = /low\s*stock|low/i;

    cy.get("table tbody tr")
      .contains("td", plantName)
      .parent("tr")
      .within(() => {
        if (badgeRegex.test(expected.toLowerCase())) {
          cy.contains(".badge, .ant-badge, span", badgeRegex).should(
            "be.visible",
          );
          return;
        }

        cy.contains(".badge, .ant-badge, span", expected).should("be.visible");
      });
  }

  assertBadgeVisible(badgeText) {
    const expected = this.normalizeSpaces(badgeText);
    const isLowStock = /low\s*stock|low/i.test(expected.toLowerCase());
    const regex = isLowStock ? /low\s*stock|low/i : new RegExp(expected, "i");
    this.assertPlantsTableVisible();
    cy.contains("table", regex).should("be.visible");
  }

  assertAddPlantButtonHidden() {
    cy.contains("button, a", /add\s+a\s+plant/i).should("not.exist");
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

  visitPlantPage() {
    cy.visit("/ui/plants");
    this.assertOnPlantsPage();
  }

  assertOnPlantsPage() {
    cy.location("pathname").should("eq", "/ui/plants");
    this.plantsTable.should("be.visible");
  }

  assertPlantTableHasData() {
    cy.get("table tbody tr").should("exist").and("have.length.greaterThan", 0);
  }

  deletePlantIfExists(plantName) {
    cy.get("table tbody tr").then((rows) => {
      const row = [...rows].find((r) => r.innerText.includes(plantName));
      if (row) {
        cy.wrap(row).find(".delete-btn").click();
        cy.on("window:confirm", () => true);
      }
    });
  }

  // ========================================
  // API Helper Methods
  // ========================================

  static apiLoginAsAdmin() {
    const username = Cypress.env("ADMIN_USER");
    const password = Cypress.env("ADMIN_PASS");

    if (!username || !password) {
      throw new Error(
        "Missing admin credentials. Set ADMIN_USER and ADMIN_PASS in your .env (or as CYPRESS_ADMIN_USER/CYPRESS_ADMIN_PASS).",
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
  }

  setAuthHeader(authHeader) {
    this.authHeader = authHeader;
  }
}

export const plantPage = new PlantPage();
export default PlantPage;
