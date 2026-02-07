export const expectStatus = (response, expectedStatus, contextMessage) => {
  const expected = Number(expectedStatus);
  if (!Number.isFinite(expected)) {
    throw new TypeError(
      `Expected status must be a number. Got: ${String(expectedStatus)}`,
    );
  }

  // Cypress responses are plain objects with a numeric `.status`.
  // Some steps pass the response directly, others pass aliases.
  if (!response || typeof response !== "object") {
    throw new TypeError(
      `Expected response object with .status. Got: ${String(response)}`,
    );
  }

  const actual = Number(response.status);
  if (!Number.isFinite(actual)) {
    throw new TypeError(
      `Response status is not a number. Got: ${String(response.status)}`,
    );
  }

  const label = contextMessage ? String(contextMessage) : "status";
  expect(actual, label).to.eq(expected);
};

export const expectStatusOneOf = (
  response,
  allowedStatuses,
  contextMessage,
) => {
  if (!Array.isArray(allowedStatuses) || allowedStatuses.length === 0) {
    throw new TypeError("allowedStatuses must be a non-empty array");
  }

  const allowed = allowedStatuses.map((s) => Number(s)).filter(Number.isFinite);
  if (allowed.length === 0) {
    throw new TypeError("allowedStatuses contains no valid numbers");
  }

  if (!response || typeof response !== "object") {
    throw new TypeError(
      `Expected response object with .status. Got: ${String(response)}`,
    );
  }

  const actual = Number(response.status);
  const label = contextMessage ? String(contextMessage) : "status";
  expect(actual, label).to.be.oneOf(allowed);
};
