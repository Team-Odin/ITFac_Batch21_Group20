Feature: API health
    As a tester
    I want to verify the API is reachable
    So that end-to-end tests can run against it

    Scenario: API responds on api-docs
        When I GET "/v3/api-docs"
        Then the response status should be 200
