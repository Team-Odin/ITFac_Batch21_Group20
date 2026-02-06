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
        "name": null,
        "parent": null
      }
      """
    Then Status Code: 400 Bad Request
    And Error message: "Category name is required"

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

  @API/TC21
  Scenario: API/TC21 Verify Basic Pagination
    Given Admin has valid JWT token
    And "10"+ Categories exist
    When Send GET request: "/api/categories/page?page=0&size=5"
    Then Status Code: 200 OK
    And Response contains exactly 5 category records

  @API/TC22
  Scenario: API/TC22 Verify Search by Name
    Given Admin has valid JWT token
    And Category "Anthurium" exists
    When Search categories by name "Anthurium"
    Then Status Code: 200 OK
    And Response list contains only categories matching "Anthurium"

  @API/TC23
  Scenario: API/TC23 Verify Filter by Parent ID
    Given Admin has valid JWT token
    And Parent ID "5" exists with children
    When Send GET request: "/api/categories/page?page=0&size=50&parentId=5"
    Then Status Code: 200 OK
    And All returned items have parent or parentId associated with ID 5

  @API/TC24
  Scenario: API/TC24 Verify Sorting by Name (ASC)
    Given Admin or User has valid JWT token
    When Request categories sorted by name ascending
    Then Status Code: 200 OK
    And Response list is sorted A-Z by name

  @API/TC25
  Scenario: API/TC25 Verify Sorting by Name (DESC)
    Given Admin or User has valid JWT token
    When Request categories sorted by name descending
    Then Status Code: 200 OK
    And Response list is sorted Z-A by name

  @API/TC26
  Scenario: API/TC26 Verify Combined Search & Sort
    Given Admin or User has valid JWT token
    When Search categories by name "a" sorted by name ascending
    Then Status Code: 200 OK
    And Response list contains only categories matching "a"
    And Response list is sorted A-Z by name

  @API/TC27
  Scenario: API/TC27 Verify Invalid Page Index
    Given Admin or User has valid JWT token
    When Send GET request: "/api/categories/page?page=-1&size=5"
    Then Status Code: 400 Bad Request
    And Error message regarding invalid page index

  @API/TC28
  Scenario: API/TC28 Verify Unauthorized Access
    Given No Authorization Header provided
    When Send GET request: "/api/categories/page?page=0&size=10"
    Then Status Code: 401 Unauthorized
    And Response message indicates authentication failure

  @API/TC29
  Scenario: API/TC29 Verify Empty Search Result
    Given Admin or User has valid JWT token
    When Send GET request: "/api/categories/page?name=NonExistent123"
    Then Status Code: 200 OK
    And Response body is an empty list (or valid empty page object)

  @API/TC30
  Scenario: API/TC30 Verify Invalid Sort Field
    Given Admin or User has valid JWT token
    When Send GET request:"/api/categories/page?sortField=xyz"
    Then Status Code: 400 Bad Request or 200 OK

  @API/TC31
  Scenario: API/TC31 Verify Update Category fails without ID and Request Body
    Given Admin or User has valid JWT token
    When Send PUT request to: "/api/categories" with no body
    Then Status Code: 405 Method Not Allowed
    And Response message indicates that the method or path is invalid

  @API/TC32
  Scenario: API/TC32 Verify Regular User cannot update a category
    Given User has valid JWT token
    And Category with ID "3" exists
    When I send a PUT request to "/api/categories/3" with body:
      """
      {
        "name": "flowers02",
        "parent": {
          "id": 1
        }
      }
      """
    Then Status Code: 403 Forbidden
    And Response message indicates authentication failure
