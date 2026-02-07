@api @plant
Feature: Plant Management Module
	As an admin or user
	I want to retrieve plant data via APIs
	So that I can view plants in the system

	@API/TC123
	Scenario: API/TC123 Verify Plant List Retrieval (Non-Admin User)
		Given Admin or User has valid JWT token
		When Send GET request to: "/api/plants/paged?page=0&size=10"
		Then Status Code: 200 OK
		And Plant response contains a non-empty plant list

	@API/TC124
	Scenario: API/TC124 Verify Plant Details Retrieval by ID
		Given Admin or User has valid JWT token
		And Plant ID "1" exists
		When Send GET request to: "/api/plants/1"
		Then Status Code: 200 OK
		And Plant response contains correct details for Plant ID 1

	@API/TC125
	Scenario: API/TC125 Verify Plant List Pagination (Non-Admin User)
		Given Admin or User has valid JWT token
		When Plant API request plants page 0 size 10
		And Plant API request plants page 1 size 10
		Then Plant API page responses have status 200
		And Plant API responses contain unique Plant IDs across pages

	@API/TC126
	Scenario: API/TC126 Verify Search By Name (Admin)
		Given Admin has valid JWT token
		And Plant named "Cactus" exists
		When Search plants by name "Cac"
		Then Status Code: 200 OK
		And Plant search results contain only plants matching "Cac"
		And Plant search results include "Cactus"

	@API/TC127
	Scenario: API/TC127 Verify Search No Results (Admin)
		Given Admin has valid JWT token
		When Search plants by name "NoPlantFound123"
		Then Status Code: 200 OK
		And Plant response body is an empty list (or valid empty page object)

	@API/TC128
	Scenario: API/TC128 Verify Filter by Category ID (Admin)
		Given Admin has valid JWT token
		When Request plants filtered by Category ID 5
		Then Status Code: 200 OK
		And All returned plants have category association with ID 5

	@API/TC129
	Scenario: API/TC129 Verify Filter by Non-Existing Category ID (Admin)
		Given Admin has valid JWT token
		When Request plants filtered by Category ID 9999
		Then Status Code: 404 Not Found
		And Error message indicates category not found

	@API/TC130
	Scenario: API/TC130 Verify Edit Plant Details
		Given Admin has valid JWT token
		And Any Plant exists
		When Send PUT request to that Plant with body:
			"""
			{
				"price": 99.99
			}
			"""
		Then Status Code: 200 OK
		And Plant details retrieved subsequently show price 99.99

	@API/TC131
	Scenario: API/TC131 Verify Edit Plant Validation (Invalid Input)
		Given Admin has valid JWT token
		And Any Plant exists
		When Send PUT request to that Plant with body:
			"""
			{
				"name": "",
				"price": -50
			}
			"""
		Then Status Code: 400 Bad Request
		And Plant validation errors include:
			"""
			Price must be greater than 0
			Name is required
			"""
 
	@API/TC132
	Scenario: API/TC132 Verify Plant Summary Data Retrieval
		Given Admin has valid JWT token
		When Send GET request to: "/api/plants/summary"
		Then Status Code: 200 OK
		And Plant summary response contains totalPlants and lowStockPlants

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
