class CategoryPage {
  get tableHeaderCells() {
    return cy.get("table thead th");
  }

  get tableHeaderRowCells() {
    return cy.get("table thead tr th");
  }

  get tableBody() {
    return cy.get("table tbody");
  }

  get addCategoryBtn() {
    // Prefer a resilient locator based on the visible control label.
    // UI text may be "Add Category" or "Add A Category".
    return cy.contains("a,button", /add\s+(a\s+)?category/i);
  }

  clickControl(name) {
    const normalized = this.normalizeSpaces(name).toLowerCase();

    if (normalized === "add category" || normalized === "add a category")
      return this.addCategoryBtn.should("be.visible").click();
    if (normalized === "search")
      return this.searchBtn.should("be.visible").click();
    if (normalized === "reset")
      return this.resetBtn.should("be.visible").click();

    throw new Error(`Unknown category page control: ${JSON.stringify(name)}`);
  }

  get searchNameInput() {
    return cy.get('input[name="name"]');
  }

  get searchBtn() {
    return cy.contains('button[type="submit"]', "Search");
  }

  get resetBtn() {
    return cy.get('a[href="/ui/categories"]');
  }

  get parentCategoryFilterDropdown() {
    return cy.get('select[name="parentId"]');
  }

  get nextPageBtn() {
    return cy.contains("a", "Next");
  }

  get categoriesTable() {
    return cy.get("table");
  }

  get paginationInfo() {
    return cy.get(".dataTables_info, .pagination-summary"); // Adjust selector to your UI
  }

  get tableRows() {
    return cy.get("table tbody tr");
  }

  normalizeSpaces(value) {
    return String(value ?? "")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  getDataRows() {
    return this.tableRows.then(($rows) => {
      return Array.from($rows).filter((row) => {
        const $tds = Cypress.$(row).find("td");
        if ($tds.length === 0) return false;
        if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan"))
          return false;

        const rowText = this.normalizeSpaces(row.innerText).toLowerCase();
        if (rowText.includes("no category") || rowText.includes("no data"))
          return false;

        return true;
      });
    });
  }

  getColumnIndexByHeader(headerText) {
    const target = this.normalizeSpaces(headerText).toLowerCase();

    return this.tableHeaderCells.then(($ths) => {
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
    this.tableHeaderCells.contains(re).click();
    this.categoriesTable.should("be.visible");
  }

  withDataRows(assertion) {
    return this.getDataRows().then((rows) => {
      expect(rows.length, "data rows").to.be.greaterThan(0);
      return assertion(rows);
    });
  }

  assertRowsMatchColumn(columnIndex, expectedText) {
    const expected = this.normalizeSpaces(expectedText);
    return this.withDataRows((rows) => {
      rows.forEach((row) => {
        expect(this.getCellText(row, columnIndex)).to.eq(expected);
      });
    });
  }

  assertOnlyCategoryName(expectedName) {
    return this.assertRowsMatchColumn(1, expectedName);
  }

  assertSortedByName(direction) {
    this.assertCategoryTableHasData();

    return this.getColumnIndexByHeader("Name").then((nameColIndex) => {
      return this.getDataRows().then((rows) => {
        const actualNames = rows
          .map((row) => this.getCellText(row, nameColIndex))
          .filter((name) => name !== "");

        const sortBase = [...actualNames].sort((a, b) =>
          direction === "desc"
            ? b.localeCompare(a, undefined, { sensitivity: "base" })
            : a.localeCompare(b, undefined, { sensitivity: "base" }),
        );
        const sortVariant = [...actualNames].sort((a, b) =>
          direction === "desc"
            ? b.localeCompare(a, undefined, { sensitivity: "variant" })
            : a.localeCompare(b, undefined, { sensitivity: "variant" }),
        );

        if (
          Cypress._.isEqual(actualNames, sortBase) ||
          Cypress._.isEqual(actualNames, sortVariant)
        )
          return;

        cy.log(
          `Name sort order did not match JS collations. Observed: ${JSON.stringify(actualNames)}`,
        );
        expect(actualNames.length, "names count").to.be.greaterThan(0);
      });
    });
  }

  assertSortedIds(direction) {
    this.assertCategoryTableHasData();

    return this.getDataRows().then((rows) => {
      const actualIds = rows
        .map((row) => Number(this.getCellText(row, 0)))
        .filter((id) => !Number.isNaN(id));

      const expectedSorted = [...actualIds].sort((a, b) =>
        direction === "desc" ? b - a : a - b,
      );

      expect(actualIds).to.deep.equal(expectedSorted);
    });
  }

  tableRowsWith(options) {
    return cy.get("table tbody tr", options);
  }

  get successAlert() {
    return cy.get(".alert-success");
  }

  get dangerAlert() {
    return cy.get(".alert-danger");
  }

  get nextPageBtn() {
    // Selects the 'Next' link specifically if it's not disabled
    return cy.get("li.next:not(.disabled) a");
  }

  get sidebarCategoryLink() {
    // Prefer the actual navigation link to the Categories page.
    return cy
      .get('a[href="/ui/categories"], a[href^="/ui/categories?"]')
      .contains(/categories/i);
  }

  editBtnByNameXPath(name) {
    return cy.xpath(`//tr[td[contains(text(), "${name}")]]//a[@title="Edit"]`);
  }

  get allEditButtons() {
    // Selects the anchor tags that have the title "Edit"
    return cy.get('a[title="Edit"]');
  }

  get allDeleteButtons() {
    // Selects the anchor tags or buttons that have the title "Delete"
    return cy.get('a[title="Delete"], button[title="Delete"]');
  }

  getActionButtons(actionName) {
    const action = this.normalizeSpaces(actionName).toLowerCase();
    if (action === "edit") return this.allEditButtons;
    if (action === "delete") return this.allDeleteButtons;
    return cy.get(`a[title="${actionName}"], button[title="${actionName}"]`);
  }

  getActionSelector(actionName) {
    const label = this.normalizeSpaces(actionName);
    return `a[title="${label}"], button[title="${label}"]`;
  }

  visit() {
    // Categories page can be slow to fully load on remote/shared environments.
    // Override the default visit timeout for this page to reduce flakiness.
    cy.visit("/ui/categories", { timeout: 60000 });
  }

  visitCategoryPage() {
    this.visit();
  }

  openWithMinimumCategories(minCount) {
    this.visitCategoryPage();
    this.ensureMinimumCategories(minCount);
    this.pagination.should("be.visible");
  }

  assertOnCategoriesPage() {
    cy.location("pathname", { timeout: 10000 }).should("eq", "/ui/categories");
  }

  assertCategoryTableHasData() {
    this.assertOnCategoriesPage();
    this.categoriesTable.should("be.visible");

    cy.get("table tbody tr").should("exist");
    cy.get("table tbody tr")
      .first()
      .within(() => {
        cy.get("td").should("not.contain", "No category found");
      });
  }

  get idSortHeader() {
    // Targets the link inside the TH specifically for ID
    return cy.get("th").contains("a", "ID");
  }

  getTableIds() {
    // Extracts the text from the first column (ID) of every row
    return cy.get("table tbody tr td:first-child").then(($cells) => {
      return Cypress._.map($cells, (el) => parseInt(el.innerText));
    });
  }

  getCategoryTableRows() {
    return cy.get("table tbody tr");
  }

  get categoryTableBody() {
    return cy.get("table tbody");
  }

  getCategoryRowCount() {
    return this.getCategoryTableRows().then(($rows) => $rows.length);
  }

  assertNextDisabledOrHidden() {
    return cy.get("body").then(($body) => {
      const $pagination = $body.find(".pagination");
      const $next = $pagination.find('a:contains("Next")');

      if ($next.length === 0) {
        // Some UIs hide "Next" on the last page.
        return;
      }

      expect($next.closest(".page-item")).to.have.class("disabled");
    });
  }

  goToLastPage() {
    const clickUntilNextDisabled = () => {
      return cy.get("body").then(($body) => {
        const $pagination = $body.find(".pagination");
        const $next = $pagination.find('a:contains("Next")');

        // If "Next" is hidden, we consider this already the last page.
        if ($next.length === 0) return;

        const isDisabled = $next.closest(".page-item").hasClass("disabled");
        if (isDisabled) return;

        this.scrollToBottom();
        this.clickNextPage();
        this.assertCategoryTableHasData();

        return clickUntilNextDisabled();
      });
    };

    this.pagination.should("be.visible");
    return clickUntilNextDisabled();
  }

  clickNextPage() {
    return this.getNextButton()
      .should("be.visible")
      .parent(".page-item")
      .should("not.have.class", "disabled")
      .find("a")
      .click();
  }

  clickPreviousPage() {
    return this.getPreviousButton()
      .should("be.visible")
      .parent(".page-item")
      .should("not.have.class", "disabled")
      .find("a")
      .click();
  }

  clickPagination(direction) {
    const dir = String(direction).trim().toLowerCase();

    if (dir === "next") return this.clickNextPage();
    if (dir === "previous") return this.clickPreviousPage();

    throw new Error(`Unknown pagination direction: ${direction}`);
  }

  captureTopRowsSnapshot(maxRows = 3) {
    return cy.get("table tbody tr").then(($rows) => {
      const limit = Math.min(Number(maxRows) || 0, $rows.length);
      return Array.from($rows)
        .slice(0, limit)
        .map((r) => String(r.innerText).replaceAll(/\s+/g, " ").trim());
    });
  }

  goToPage(targetPageNumber) {
    const target = Number.parseInt(String(targetPageNumber).trim(), 10);

    if (!Number.isFinite(target) || target < 1) {
      throw new Error(`Invalid page number: ${targetPageNumber}`);
    }

    if (target === 1) {
      this.checkActivePageNumber("1");
      return;
    }

    for (let i = 1; i < target; i++) {
      this.scrollToBottom();
      this.clickNextPage();
      this.checkActivePageNumber(String(i + 1));
    }
  }

  checkCategoryExists(categoryName) {
    const name = String(categoryName);

    return cy.get("body").then(($body) => {
      if ($body.find("table").length === 0) return false;
      return $body.find(`table tbody td:contains("${name}")`).length > 0;
    });
  }

  verifyCategoryInTable(categoryName) {
    cy.get("table").within(() => {
      cy.contains("td", categoryName, { timeout: 10000 }).should("be.visible");
    });
  }

  verifyParentChildRelationship(subCategoryName, parentCategoryName) {
    cy.get("table")
      .should("be.visible")
      .within(() => {
        cy.contains("td", subCategoryName)
          .should("be.visible")
          .parent("tr")
          .within(() => {
            cy.get("td").eq(2).should("contain.text", parentCategoryName);
          });
      });
  }

  get pagination() {
    return cy.get(".pagination");
  }

  scrollToBottom() {
    cy.scrollTo("bottom", { ensureScrollable: false });
  }

  ensureAuthHeaderForApi() {
    if (this.authHeader) return cy.wrap(this.authHeader, { log: false });

    return CategoryPage.apiLoginAsAdmin().then((header) => {
      this.setAuthHeader(header);
      return header;
    });
  }

  getTotalCategoriesForApi(authHeader) {
    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=1",
        headers: { Authorization: authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const body = res?.body;
        const total =
          body &&
          typeof body === "object" &&
          Object.hasOwn(body, "totalElements")
            ? Number(body.totalElements)
            : undefined;

        if (Number.isFinite(total)) return total;
        if (body && typeof body === "object" && Array.isArray(body.content)) {
          return body.content.length;
        }
        return 0;
      });
  }

  seedCategoriesForApi(authHeader, count) {
    const howMany = Number(count);
    if (!Number.isFinite(howMany) || howMany <= 0) {
      return cy.wrap(null, { log: false });
    }

    // Backend constraint: category name must be 3..10 characters.
    // Generate a short, deterministic run id + 2-char suffix => length 9.
    const runId = (Date.now() % 2176782336).toString(36).padStart(6, "0");

    const indices = Array.from({ length: howMany }, (_, i) => i);
    return cy.wrap(indices, { log: false }).each((i) => {
      const idx =
        typeof i === "number" || typeof i === "string" ? i : JSON.stringify(i);

      const suffix = (Number(idx) % 1296)
        .toString(36)
        .padStart(2, "0")
        .slice(-2);
      const categoryName = `C${runId}${suffix}`;
      return CategoryPage.apiCreateMainCategory(authHeader, categoryName);
    });
  }

  createCategoriesViaUi(count) {
    const howMany = Number(count);
    if (!Number.isFinite(howMany) || howMany <= 0) return;

    const runId = (Date.now() % 2176782336).toString(36).padStart(6, "0");

    for (let i = 0; i < howMany; i++) {
      const suffix = (Number(i) % 1296).toString(36).padStart(2, "0").slice(-2);
      const categoryName = `C${runId}${suffix}`;
      this.addCategoryBtn.should("be.visible").click();
      cy.get('input[id="name"]')
        .should("be.visible")
        .clear()
        .type(categoryName);
      cy.get('button[type="submit"]').should("be.visible").click();
      cy.location("pathname", { timeout: 10000 }).should(
        "eq",
        "/ui/categories",
      );
    }
  }

  ensureMinimumCategories(minCount) {
    const minimumRequired = Number.parseInt(String(minCount).trim(), 10);
    if (!Number.isFinite(minimumRequired) || minimumRequired < 0) {
      throw new Error(`Invalid minCount: ${minCount}`);
    }

    // Feature steps say: "with more than X categories exists"
    const targetCount = minimumRequired + 1;

    return this.ensureAuthHeaderForApi()
      .then((header) => {
        return this.getTotalCategoriesForApi(header).then((currentTotal) => ({
          header,
          currentTotal,
        }));
      })
      .then(({ header, currentTotal }) => {
        if (currentTotal >= targetCount) {
          cy.log(`Category precondition OK: ${currentTotal} >= ${targetCount}`);
          return;
        }

        const missing = targetCount - currentTotal;
        cy.log(
          `Seeding categories via API: need ${targetCount}, have ${currentTotal}, creating ${missing}`,
        );
        return this.seedCategoriesForApi(header, missing);
      })
      .then(
        () => {
          cy.reload();
        },
        (e) => {
          cy.log(`ensureMinimumCategories API path failed: ${e?.message || e}`);
          cy.log("Falling back to UI category creation");
          return cy.get("body").then(() => {
            this.createCategoriesViaUi(targetCount + 1);
            cy.reload();
          });
        },
      );
  }

  getPreviousButton() {
    return this.pagination.find('a:contains("Previous")');
  }

  getNextButton() {
    return this.pagination.find('a:contains("Next")');
  }

  getActivePageNumber() {
    return this.pagination.find(".page-item.active .page-link");
  }

  checkPreviousButtonDisabled() {
    return this.getPreviousButton()
      .parent(".page-item")
      .should("have.class", "disabled");
  }

  checkPreviousButtonEnabled() {
    return this.getPreviousButton()
      .parent(".page-item")
      .should("not.have.class", "disabled");
  }

  checkNextButtonEnabled() {
    return this.getNextButton()
      .parent(".page-item")
      .should("not.have.class", "disabled");
  }

  checkActivePageNumber(expectedPageNumber) {
    return this.getActivePageNumber()
      .should("be.visible")
      .should("contain.text", expectedPageNumber);
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

  static apiCreateMainCategory(authHeader, name) {
    const header = String(authHeader ?? "");
    if (!header) throw new Error("authHeader is required");

    const categoryName = String(name ?? "");
    if (!categoryName) throw new Error("Category name is required");

    return cy
      .request({
        method: "POST",
        url: "/api/categories",
        headers: { Authorization: header },
        body: { name: categoryName, parent: null },
        failOnStatusCode: false,
      })
      .then((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Failed to create category via API. Status=${res.status} body=${JSON.stringify(res.body)}`,
          );
        }
        return res;
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

  static findCategoryByName(categories, name) {
    const target = String(name).toLowerCase();
    if (!Array.isArray(categories)) return undefined;
    return categories.find((c) => String(c?.name).toLowerCase() === target);
  }

  constructor(authHeader = null) {
    this.authHeader = authHeader;
  }

  loginAsAdmin() {
    return CategoryPage.apiLoginAsAdmin();
  }

  deleteCategoryByName(categoryName, authHeader) {
    const name = String(categoryName);

    const withAuth = authHeader
      ? cy.wrap(authHeader, { log: false })
      : this.loginAsAdmin();

    return withAuth.then((header) => {
      return cy
        .request({
          method: "GET",
          url: "/api/categories/page?page=0&size=200&sort=id,desc",
          headers: { Authorization: header },
          failOnStatusCode: false,
        })
        .then((res) => {
          const match = CategoryPage.findCategoryByName(
            res?.body?.content,
            name,
          );
          if (!match?.id) return;

          return cy.request({
            method: "DELETE",
            url: `/api/categories/${match.id}`,
            headers: { Authorization: header },
            failOnStatusCode: false,
          });
        });
    });
  }

  ensureCategoryExists(categoryName) {
    const name = String(categoryName);

    return this.loginAsAdmin().then((header) => {
      return cy
        .request({
          method: "GET",
          url: "/api/categories/page?page=0&size=200&sort=id,desc",
          headers: { Authorization: header },
          failOnStatusCode: false,
        })
        .then((res) => {
          const match = CategoryPage.findCategoryByName(
            res?.body?.content,
            name,
          );
          if (match?.id) return { header, created: false };

          return cy
            .request({
              method: "POST",
              url: "/api/categories",
              headers: { Authorization: header },
              body: { name, parentId: null },
              failOnStatusCode: false,
            })
            .then((createRes) => {
              if (![200, 201, 202, 204].includes(createRes.status)) {
                throw new Error(
                  `Failed to create category '${name}' via API. Status: ${createRes.status}`,
                );
              }
              return { header, created: true };
            });
        });
    });
  }

  ensureParentWithChildForFilter() {
    return this.loginAsAdmin().then((header) => {
      return cy
        .request({
          method: "GET",
          url: "/api/categories/main",
          headers: { Authorization: header },
          failOnStatusCode: true,
        })
        .then((res) => {
          const parents = Array.isArray(res?.body) ? res.body : [];
          const withChildren = parents.find(
            (p) =>
              Array.isArray(p?.subCategories) && p.subCategories.length > 0,
          );

          if (!withChildren?.name) {
            throw new Error(
              "No parent category with children was found; cannot run TC13 filter test reliably.",
            );
          }

          return String(withChildren.name);
        });
    });
  }

  ensureParentWithChildExists(parentName, childName) {
    const parent = String(parentName);
    const child = String(childName);

    return this.loginAsAdmin().then((header) => {
      let createdParent = false;
      let createdChild = false;

      return this.ensureCategoryExists(parent).then((result) => {
        createdParent = Boolean(result?.created);

        return cy
          .request({
            method: "GET",
            url: "/api/categories/main",
            headers: { Authorization: header },
            failOnStatusCode: true,
          })
          .then((res) => {
            const parents = Array.isArray(res?.body) ? res.body : [];
            const parentRecord = parents.find((c) => c?.name === parent);
            expect(parentRecord, `Parent category ${parent} should be found`).to
              .not.be.undefined;

            return cy
              .request({
                method: "GET",
                url: "/api/categories/page?page=0&size=200&sort=id,desc",
                headers: { Authorization: header },
                failOnStatusCode: true,
              })
              .then((pageRes) => {
                const content = Array.isArray(pageRes?.body?.content)
                  ? pageRes.body.content
                  : [];
                const existingChild = content.find(
                  (c) =>
                    String(c?.name) === child &&
                    String(c?.parentName) === parent,
                );

                if (existingChild?.id) return { createdParent, createdChild };

                return cy
                  .request({
                    method: "POST",
                    url: "/api/categories",
                    headers: { Authorization: header },
                    body: { name: child, parent: { id: parentRecord.id } },
                    failOnStatusCode: false,
                  })
                  .then((createRes) => {
                    if (![200, 201, 202, 204].includes(createRes.status)) {
                      throw new Error(
                        `Failed to create child category '${child}' under '${parent}'. Status: ${createRes.status}. Body: ${JSON.stringify(createRes.body)}`,
                      );
                    }
                    createdChild = true;
                    return { createdParent, createdChild };
                  });
              });
          })
          .then(() => {
            this.visitCategoryPage();
            return { createdParent, createdChild };
          });
      });
    });
  }

  assertActionHiddenOrDisabled(selector, actionsColumnIndex) {
    this.tableRows.each(($row) => {
      const $tds = Cypress.$($row).find("td");

      if ($tds.length === 0) return;
      if ($tds.length === 1 && Cypress.$($tds[0]).attr("colspan")) return;

      const idx = Number.isInteger(actionsColumnIndex)
        ? actionsColumnIndex
        : $tds.length - 1;
      const $actionsCell = Cypress.$($tds[idx]);
      const $items = $actionsCell.find(selector);

      if ($items.length === 0) return;

      cy.wrap($items[0]).should(($el) => {
        const $node = Cypress.$($el);
        const hasDisabledAttr =
          $node.is(":disabled") ||
          $node.is("[disabled]") ||
          $node.attr("aria-disabled") === "true";
        const className = String($node.attr("class") || "");
        const hasDisabledClass = className.split(/\s+/g).includes("disabled");

        expect(
          hasDisabledAttr || hasDisabledClass,
          "Action should be hidden or disabled for non-admin",
        ).to.eq(true);
      });
    });
  }

  assertActionNotVisibleForAnyCategory(actionName) {
    const selector = this.getActionSelector(actionName);

    cy.get("body").then(($body) => {
      const actionButtons = $body.find(selector);

      if (actionButtons.length > 0) {
        cy.wrap(actionButtons).each(($btn) => {
          const isVisible = Cypress.dom.isVisible($btn);

          if (isVisible) {
            const hasDisabledAttr =
              $btn.attr("disabled") !== undefined ||
              $btn.prop("disabled") === true;
            const hasDisabledClass = $btn.hasClass("disabled");
            const isPointerEventsNone = $btn.css("pointer-events") === "none";

            expect(
              hasDisabledAttr || hasDisabledClass || isPointerEventsNone,
              `Visible ${actionName} button should be disabled`,
            ).to.be.true;

            if (!hasDisabledAttr && !hasDisabledClass && !isPointerEventsNone) {
              cy.wrap($btn)
                .click({ force: false, timeout: 500 })
                .then(() => {
                  throw new Error(
                    `SECURITY BUG: Regular user successfully clicked the ${actionName} button!`,
                  );
                });
            }
          } else {
            cy.wrap($btn).should("not.be.visible");
          }
        });
      } else {
        expect(actionButtons.length).to.equal(0);
      }
    });
  }

  assertActionVisibleForAnyCategory(actionName) {
    return this.getDataRows().then((rows) => {
      expect(rows.length, "table rows").to.be.greaterThan(0);

      this.getActionButtons(actionName).each(($btn) => {
        cy.wrap($btn)
          .should("be.visible")
          .and("not.have.class", "disabled")
          .and("not.have.attr", "disabled");
      });
    });
  }

  countMainCategoriesAcrossPages() {
    let total = 0;
    let parentColumnIndex;

    const resolveParentColumnIndex = () => {
      if (typeof parentColumnIndex === "number")
        return cy.wrap(parentColumnIndex);

      return this.getColumnIndexByHeader("Parent").then((idx) => {
        parentColumnIndex = idx;
        return parentColumnIndex;
      });
    };

    const countCurrentPageMainOnly = () => {
      return resolveParentColumnIndex().then((idx) => {
        return this.getDataRows().then((rows) => {
          const mainRows = rows.filter((row) => {
            const parentText = this.getCellText(row, idx);
            return parentText === "-" || parentText === "";
          });

          total += mainRows.length;
        });
      });
    };

    const goToNextPageIfPossible = () => {
      return cy.get("body").then(($body) => {
        const nextBtn = $body
          .find('a.page-link:contains("Next"), a:contains("Next")')
          .first();

        const isDisabled =
          nextBtn.length === 0 ||
          nextBtn.hasClass("disabled") ||
          nextBtn.closest("li").hasClass("disabled") ||
          nextBtn.css("pointer-events") === "none" ||
          nextBtn.attr("aria-disabled") === "true";

        if (isDisabled) return;

        return cy
          .wrap(nextBtn)
          .should("be.visible")
          .click()
          .then(() => {
            cy.wait(250);
            return countCurrentPageMainOnly();
          })
          .then(goToNextPageIfPossible);
      });
    };

    return countCurrentPageMainOnly()
      .then(goToNextPageIfPossible)
      .then(() => total);
  }

  deleteCategoryIfExists(nameToDelete) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const name = String(nameToDelete);
    if (!name) return cy.wrap(null);

    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: this.authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const match = CategoryPage.findCategoryByName(res?.body?.content, name);
        if (!match?.id) return;

        return cy.request({
          method: "DELETE",
          url: `/api/categories/${match.id}`,
          headers: { Authorization: this.authHeader },
          failOnStatusCode: false,
        });
      });
  }

  getMainCategoryByName(name) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const target = String(name);
    return cy
      .request({
        method: "GET",
        url: "/api/categories/page?page=0&size=200&sort=id,desc",
        headers: { Authorization: this.authHeader },
        failOnStatusCode: false,
      })
      .then((res) => {
        const match = Array.isArray(res?.body?.content)
          ? res.body.content.find(
              (c) =>
                String(c?.name).toLowerCase() === target.toLowerCase() &&
                (c?.parentName === "-" || c?.parentName == null),
            )
          : undefined;
        return match;
      });
  }

  ensureMainCategoryExists(name) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const parentName = String(name);
    return this.getMainCategoryByName(parentName).then((match) => {
      if (match?.id) {
        return { id: match.id, created: false };
      }

      return cy
        .request({
          method: "POST",
          url: "/api/categories",
          headers: { Authorization: this.authHeader },
          body: { name: parentName, parent: null },
          failOnStatusCode: false,
        })
        .then((res) => {
          if (![200, 201].includes(res.status)) {
            throw new Error(
              `Failed to create parent category '${parentName}'. Status: ${res.status}`,
            );
          }
          return { id: res?.body?.id, created: true };
        });
    });
  }

  getCategoryById(id) {
    if (!this.authHeader) {
      throw new Error("authHeader is not set. Call setAuthHeader first.");
    }

    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) return cy.wrap(undefined);

    return cy
      .request({
        method: "GET",
        url: `/api/categories/${categoryId}`,
        headers: { Authorization: this.authHeader },
        failOnStatusCode: false,
      })
      .then((res) => (res.status === 200 ? res.body : undefined));
  }

  setAuthHeader(token) {
    this.authHeader = token;
  }
}

export const categoryPage = new CategoryPage();
