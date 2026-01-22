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

    @API/TC18
    Scenario: API/TC18 Verify Get Category By ID
        Given Admin has valid JWT token
        And Category ID "1" exists
        When Send GET request to: "/api/categories/1"
        Then Status Code: 200 OK
        And Response contains correct id and name for that category

    @API/TC19
    Scenario: API/TC19 Verify Create Validation: Empty Name
        Given Admin has valid JWT token
        And Endpoint: "/api/categories"
        When Send POST request with body:
            """
            {
                "name": "",
                "parent": null
            }
            """
        Then Status Code: 400 Bad Request
        And Error message: "Category name is mandatory"

    @API/TC20
    Scenario: API/TC20 Verify Create Validation: Name Too Long
        Given Admin has valid JWT token
        And Endpoint: "/api/categories"
        When Send POST request with body:
            """
            {
                "name": "SuperMarket",
                "parent": null
            }
            """
        Then Status Code: 400 Bad Request
        And Error message: "Category name must be between 3 and 10 characters"

