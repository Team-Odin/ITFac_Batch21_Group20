@api @category
Feature: Category Management Module
    As an admin or user
    I want to manage categories
    So that I can organize plants in the system

    @API/TC16
    Scenario: API/TC16 Verify Create Main Category API
        Given Admin has valid JWT token
        And Endpoint: "/api/categories"
        When Send POST request with body:
            """
            {
                "name": "API_Main",
                "parent": null
            }
            """
        Then Status Code: 201 Created
        And Response contains "name": "API_Main"

    @API/TC17
    Scenario: API/TC17 Verify Create Sub Category API
        Given Admin has valid JWT token
        And parent "Fruits" exists
        And Endpoint: "/api/categories"
        When Send POST request with body:
            """
            {
                "name": "API_Sub",
                "parent": "Fruits"
            }
            """
        Then Status Code: 201 Created
        And Response contains "name": "API_Sub" and "parent": "Fruits"

