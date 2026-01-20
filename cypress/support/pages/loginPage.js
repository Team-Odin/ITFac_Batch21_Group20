class LoginPage {
  get usernameInput() {
    return cy.get('input[name="username"]');
  }

  get passwordInput() {
    return cy.get('input[name="password"]');
  }

  get loginBtn() {
    return cy.get('button[type="submit"]');
  }

  // 2. Define Action (methods)
  visit() {
    cy.visit("/ui/login");
  }

  visitLoginPage() {
    this.visit();
  }

  login(username, password) {
    this.usernameInput.type(username);
    this.passwordInput.type(password);
    this.loginBtn.click();
  }

  isTokenResponse(json) {
    return (
      json &&
      typeof json === "object" &&
      Object.hasOwn(json, "token") &&
      Object.hasOwn(json, "tokenType")
    );
  }

  validateTokenResponse(json) {
    expect(json.token, "token should be present").to.be.a("string").and.not.be
      .empty;
    expect(json.tokenType, "tokenType should be present").to.be.a("string").and
      .not.be.empty;
  }

  validateTextMessage(bodyText, expectedMessage) {
    expect(bodyText).to.include(expectedMessage);
  }

  verifyMessage(expectedMessage) {
    cy.document().then((doc) => {
      const bodyText = doc.body.innerText;
      this.validateTextMessage(bodyText, expectedMessage);
    });
  }
}

export const loginPage = new LoginPage();
