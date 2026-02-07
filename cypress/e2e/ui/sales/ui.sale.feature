@ui @sales
Feature: Sales page access control and sorting

 @non-admin @tc81
  Scenario: Verify pagination functionality
    Given I am logged in as a non-admin user
    And I am on the Sales page
    Then if there are more than 10 records, the pagination should be visible
 

@non-admin @tc92
Scenario: Verify dynamic Sales summary information on Dashboard
  Given I am logged in as a non-admin user
  When I am on the Dashboard page
  Then the Sales summary card should display a valid numerical Revenue
  And the Sales summary card should display a valid total sales count
  And the "View Sales" button should link to the Sales page

@non-admin @tc80
Scenario: Verify table state based on sales record availability
  Given I am logged in as a non-admin user
  When I am on the Sales page
  Then if there are no sales records, a message "No sales found" should be displayed
  And if there are sales records, the "No sales found" message should not be visible

  @non-admin
  Scenario: Hide Sell Plant button for non-admin user
    Given I am logged in as a non-admin user
    And I am on the Sales page
    Then the "Sell Plant" button should not be visible

  @admin
  Scenario: Show Sell Plant button for admin user
    Given I am logged in as admin user
    And I am on the Sales page
    Then the "Sell Plant" button should be visible

  @non-admin @tc77
  Scenario: Hide Delete action for non-admin user
    Given I am logged in as a non-admin user
    And I am on the Sales page
    And there is at least one sale record in the system
    Then the Actions column should not be displayed
    And the Delete action should not be displayed

@admin @tc83
  Scenario: Show Delete action for admin user only when records exist
    Given I am logged in as admin user
    And I am on the Sales page
    Then if there are sale records, the Delete action should be displayed
    But if there are no sale records, the Delete action should not be visible

  @non-admin @tc78
  Scenario: Sort sales by plant name
    Given I am logged in as a non-admin user
    And I am on the Sales page
    When I click the "Plant" column header
    Then the sales list should be sorted by "Plant" in ascending order if records exist

  @non-admin @tc79
  Scenario: Sort sales by quantity
    Given I am logged in as a non-admin user
    And I am on the Sales page
    When I click the "Quantity" column header
    Then the sales list should be sorted by "Quantity" in ascending order if records exist


@admin @tc84
  Scenario: Verify navigation to the sell plant page
    Given I am logged in as admin user
    And I am on the Sales page
    When I click the Sell Plant button
    Then I should be navigated to the Sell Plant page

@admin @tc85
Scenario: Prevent sale when quantity exceeds available stock
  Given I am logged in as admin user
  And I am on the Sell Plant page
  When I select a plant and identify its available stock
  And I attempt to sell more than the available stock
  And I click the submit button
  Then an error message should appear indicating insufficient stock

@admin @tc86
Scenario: Verify error message for sell quantity less than 1
  Given I am logged in as admin user
  And I am on the Sell Plant page
  When I select a plant from the dropdown
  And I enter a sell quantity of 0
  And I click the submit button
  Then an error message "Quantity must be greater than 0" should be displayed

@admin @tc87
Scenario: Verify plant selection is mandatory
  Given I am logged in as admin user
  And I am on the Sell Plant page
  When I do not select any plant
  And I enter a sell quantity of 5
  And I click the submit button
  Then an error message "Plant is required" should be displayed for plant

@admin @tc88
  Scenario: Verify that the sell operation works correctly with dynamic data
    Given I am logged in as admin user
    And I am on the Sell Plant page
    When I select the first available plant from the dropdown
    And I enter a valid sell quantity based on available stock
    And I click the submit button
    Then I should be redirected to the Sales List page
    And the latest sale should show the correct plant and quantity


  @admin @tc89
Scenario: Verify plant dropdown displays names and stock levels
  Given I am logged in as admin user
  And I am on the Sell Plant page
  When I click on the Plant selection dropdown
  Then the Plant dropdown should list all available plants
  And each plant entry should display the current stock quantity

  @admin @tc90
Scenario: Verify Cancel button redirects to Sales List
  Given I am logged in as admin user
  And I am on the Sell Plant page
  When I click on the Cancel button
  Then I should be redirected to the Sales List page
  And no new sale record should be created

  @non-admin @tc91
Scenario: Verify Sales menu highlighting
  Given I am logged in as a non-admin user
  When I click on "sales" in navigation bar
  Then the Sales menu item should be highlighted as the active page