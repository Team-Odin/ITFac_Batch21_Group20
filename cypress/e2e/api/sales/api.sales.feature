Feature: Sales Management

  Scenario: TC93 Verify that the admin can retrieve all sales
    Given the admin user is authenticated
    When I send a GET request to retrieve all sales
    Then the response status should be 200
    And the response should contain a list of sales records

@api @TC94
  Scenario: Verify that the admin can retrieve an available sale record by ID
    Given the admin user is authenticated
    When I send a GET request to retrieve sale with ID 31
    Then the response status should be 200
    And the response should contain the sale record with ID 31
    And the sale record should contain the correct plant details

@api @TC95
  Scenario: Verify that the system handles a request for a non-existing sale record correctly
    Given the admin user is authenticated
    When I send a GET request to retrieve sale with ID 1000
    Then the response status should be 404
    And the response should contain an error message "Sale not found"

@TC96
  Scenario: Verify that the admin can delete a sale record
    Given the admin user is authenticated
    When I send a DELETE request for sale with ID 37
    Then the response status should be 204
    And the sale record with ID 5 should no longer exist in the system

@api @TC97
Scenario: Verify that the system returns an error when an admin attempts to delete a non-existing sale record
    Given the admin user is authenticated
    When I send a DELETE request for sale with ID 9999
    Then the response status should be 404

@TC98 @negative
  Scenario: Verify that the system returns an error when the sell plant API is called without a request body
    Given the admin user is authenticated
    When I send a POST request to sell a plant with an empty body
    Then the response status should be 400
    

    @TC99 @validation
  Scenario: Verify that the system returns an error when the plant is not provided
    Given the admin user is authenticated
    When I send a POST request to sell a plant with missing plant field and quantity 10
    Then the response status should be 400

@TC100 @validation
  Scenario: Verify that the system returns an error when the quantity is not provided
    Given the admin user is authenticated
    When I send a POST request to sell plant ID 3 without providing a quantity
    Then the response status should be 400

@TC101
Scenario: Verify that the system returns an error when quantity is less than 1
    Given the admin user is authenticated
    When I send a POST request to sell plant ID 7 with quantity 0
    Then the response status should be 400


@TC102 @positive
  Scenario: Validate that an admin can successfully sell a Mango tree
    Given the admin user is authenticated
    When I send a POST request to sell plant ID 1 with quantity 3
    Then the response status should be 201
    And the response should contain the sale details for plant "Rose"
    And the total price should be calculated correctly at 300

@TC103 @negative
  Scenario: Verify that the system prevents selling when the requested quantity is more than the available stock
    Given the admin user is authenticated
    When I send a POST request to sell plant ID 4 with quantity 1000
    Then the response status should be 400

@TC104 @negative
  Scenario: Verify that the system prevents selling when the plant ID provided is invalid
    Given the admin user is authenticated
    When I send a POST request to sell plant ID 1000 with quantity 6
    Then the response status should be 404

@TC105
Scenario: Verify that pagination works correctly for a non-admin user
    Given a non-admin user is authenticated
    When I request sales with page 0 and size 3
    Then the response status should be 200
    And the response should contain the correct paginated data

@api @TC106
Scenario: Verify that a non-admin user cannot perform a sell plant operation
    Given a non-admin user is authenticated
    When I send a POST request to sell plant ID 6 with quantity 1 as a non-admin
    Then the response status should be 403

@api @TC107
Scenario: Verify that a non-admin user cannot delete a sale record
    Given a non-admin user is authenticated
    When I send a DELETE request for sale ID 35 as a non-admin
    Then the response status should be 403

@api @TC108
Scenario: Verify that a non-admin user can retrieve all sales records
    Given a non-admin user is authenticated
    When I send a GET request to retrieve all sales as a non-admin
    Then the response status should be 200
    And the response should contain a list of sales records

@api @security @TC109
  Scenario: Verify that a non-admin user can retrieve a sale record by its ID
    Given a non-admin user is authenticated
    When I send a GET request for sale ID 31 as a non-admin
    Then the response status should be 200
    And the response should contain the sale record with ID 31

@api @TC110
  Scenario: Verify that a non-admin user receives an error for an invalid sale ID
    Given a non-admin user is authenticated
    When I send a GET request for sale ID 1000 as a non-admin
    Then the response status should be 404

@api @TC111
  Scenario: Verify that a non-admin user can retrieve sales records with sorting
    Given a non-admin user is authenticated
    When I request sales with page 0, size 5, and sort by "totalPrice"
    Then the response status should be 200
    And the response should be sorted by "totalPrice"