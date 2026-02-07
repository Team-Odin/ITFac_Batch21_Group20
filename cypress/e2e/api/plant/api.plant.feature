@api @plant
Feature: Plant Management Module
    As an admin or user
    I want to manage plants
    So that I can organize and retrieve plant information in the system

    @API/TC146
    Scenario: API/TC146 Verify that admin can retrieve the plant list
        Given Admin has valid JWT token
        And Endpoint: "/api/plants"
        When Send GET request
        Then Status Code: 200 OK
        And Response contains a paginated list of plant records

    @API/TC147
    Scenario: API/TC147 Verify admin can add a valid plant
        Given Admin has valid JWT token
        And Endpoint: "/api/plants/category/4"
        When Send POST request with body:
            """
            {
                "name": "orchid",
                "description": "Beautiful purple orchid",
                "price": 25.00,
                "quantity": 100
            }
            """
        Then Status Code: 201 Created
        And Response contains "name": "Ravindu"
        And The plant is persisted in the database
    
    @API/TC148
    Scenario: API/TC148 Verify validation errors when adding an invalid plant
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

    @API/TC149
    Scenario: API/TC149 Verify plant list pagination API
        Given Admin has valid JWT token
        And Plants exist in the system
        When I call GET plants paged with parameters:
            | page | size | sort |
            | 0    | 5   | name |
        Then The response should contain paginated results
        And The response should include pagination metadata
        And The results should be sorted by the specified field
    
    @API/TC150
    Scenario: API/TC150 Verify filter plants by category
        Given Admin has valid JWT token
        And Plants with different categories exist in the system
        And Endpoint: "/api/plants/category/1"
        When Send GET request
        Then Status Code: 200 OK
        And Only plants belonging to the selected category are returned
        And Plants from other categories are excluded

    @API/TC151
    Scenario: API/TC151 Verify search plant by name by user as a non admin
        Given User account exists and is active
        And User is authenticated with a valid access token
        And Plant record "Rose" exists in system
        And Endpoint: "/api/plants?name=Rose"
        When Send GET request
        Then Status Code: 200 OK
        And The response body contains an array of plant objects where the name matches the query


    @API/TC152
    Scenario: API/TC152 Verify non-admin user cannot delete a plant
        Given a non-admin user is authenticated
        When the user attempts to delete a plant with ID "9"
        Then the API should return a 403 Forbidden status
        And the delete action should be blocked at the server level

    @API/TC153
    Scenario: API/TC153 Verify non-admin user cannot edit a plant
        Given a non-admin user is authenticated
        When the user attempts to update plant "9" with the specific string body
        Then the API returns HTTP 403 Forbidden for the update
        And the update is blocked at the server level

    @API/TC154
    Scenario: API/TC154 Verify "No plants found" returns empty list and valid pagination metadata
        Given a non-admin user is authenticated
        When the user searches for plants with name "cactus" and category "10"
        Then the API returns HTTP 200 OK for the search
        And the response should be a valid empty paginated object

    @API/TC155
    Scenario: API/TC155 Verify system handles requests for non-existent plant IDs
        Given a non-admin user is authenticated
        When the user attempts to get a plant with invalid ID "1000"
        Then the API should return a 404 Not Found status