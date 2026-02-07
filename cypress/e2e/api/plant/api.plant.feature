@api @plant
Feature: Plant Management Module
	As an admin or user
	I want to retrieve plant data via APIs
	So that I can view plants in the system

	@API/TC12
	Scenario: API/TC12 Verify Plant List Retrieval (Non-Admin User)
		Given Admin or User has valid JWT token
		When Send GET request to: "/api/plants/paged?page=0&size=10"
		Then Status Code: 200 OK
		And Plant response contains a non-empty plant list

	@API/TC13
	Scenario: API/TC13 Verify Plant Details Retrieval by ID
		Given Admin or User has valid JWT token
		And Plant ID "1" exists
		When Send GET request to: "/api/plants/1"
		Then Status Code: 200 OK
		And Plant response contains correct details for Plant ID 1

	@API/TC14
	Scenario: API/TC14 Verify Plant List Pagination (Non-Admin User)
		Given Admin or User has valid JWT token
		When Plant API request plants page 0 size 10
		And Plant API request plants page 1 size 10
		Then Plant API page responses have status 200
		And Plant API responses contain unique Plant IDs across pages

	@API/TC15
	Scenario: API/TC15 Verify Search By Name (Admin)
		Given Admin has valid JWT token
		And Plant named "Cactus" exists
		When Search plants by name "Cac"
		Then Status Code: 200 OK
		And Plant search results contain only plants matching "Cac"
		And Plant search results include "Cactus"

	@API/TC16
	Scenario: API/TC16 Verify Search No Results (Admin)
		Given Admin has valid JWT token
		When Search plants by name "NoPlantFound123"
		Then Status Code: 200 OK
		And Plant response body is an empty list (or valid empty page object)

	@API/TC17
	Scenario: API/TC17 Verify Filter by Category ID (Admin)
		Given Admin has valid JWT token
		When Request plants filtered by Category ID 5
		Then Status Code: 200 OK
		And All returned plants have category association with ID 5

	@API/TC18
	Scenario: API/TC18 Verify Filter by Non-Existing Category ID (Admin)
		Given Admin has valid JWT token
		When Request plants filtered by Category ID 9999
		Then Status Code: 404 Not Found
		And Error message indicates category not found

	@API/TC19
	Scenario: API/TC19 Verify Edit Plant Details
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

	@API/TC20
	Scenario: API/TC20 Verify Edit Plant Validation (Invalid Input)
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
			Plant name must be between 3 and 25 characters
			"""

	@API/TC21
	Scenario: API/TC21 Verify Plant Summary Data Retrieval
		Given Admin has valid JWT token
		When Send GET request to: "/api/plants/summary"
		Then Status Code: 200 OK
		And Plant summary response contains totalPlants and lowStockPlants
