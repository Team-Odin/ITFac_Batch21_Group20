@api @plant
Feature: Plant Management Module
    As an admin or user
    I want to manage plants
    So that I can organize and retrieve plant information in the system

    @API/TC14
    Scenario: API/TC14 Verify that admin can retrieve the plant list
        Given Admin has valid JWT token
        And Endpoint: "/api/plants"
        When Send GET request
        Then Status Code: 200 OK
        And Response contains a paginated list of plant records

    @API/TC15
    Scenario: API/TC15 Verify admin can add a valid plant
        Given Admin has valid JWT token
        And Endpoint: "/api/plants/category/4"
        When Send POST request with body:
            """
            {
                "name": "Ravindu",
                "description": "Beautiful purple orchid",
                "price": 25.00,
                "quantity": 100
            }
            """
        Then Status Code: 201 Created
        And Response contains "name": "Ravindu"
        And The plant is persisted in the database
    
    @API/TC16
    Scenario: API/TC16 Verify validation errors when adding an invalid plant
        Given Admin has valid JWT token
        And Endpoint: "/api/plants/category/35"
        When Send POST request with body:
            """
            {
                "name": "Invalid Plant",
                "description": "Invalid plant test",
                "price": -10.00,
                "quantity": -5
            }
            """
        Then Status Code: 400 Bad Request
        And Response contains "Price must be greater than 0"
        And Response contains "Quantity cannot be negative"

    @API/TC17
    Scenario: API/TC17 Verify plant list pagination API
        Given Admin has valid JWT token
        And Plants exist in the system
        When I call GET plants paged with parameters:
            | page | size | sort |
            | 0    | 5   | name |
        Then The response should contain paginated results
        And The response should include pagination metadata
        And The results should be sorted by the specified field
    
    @API/TC18
    Scenario: API/TC18 Verify filter plants by category
        Given Admin has valid JWT token
        And Plants with different categories exist in the system
        And Endpoint: "/api/plants/category/1"
        When Send GET request
        Then Status Code: 200 OK
        And Only plants belonging to the selected category are returned
        And Plants from other categories are excluded

    @API/TC19
    Scenario: API/TC19 Verify search plant by name by user as a non admin
        Given User account exists and is active
        And User is authenticated with a valid access token
        And Plant record "Rose" exists in system
        And Endpoint: "/api/plants?name=Rose"
        When Send GET request
        Then Status Code: 200 OK
        And The response body contains an array of plant objects where the name matches the query