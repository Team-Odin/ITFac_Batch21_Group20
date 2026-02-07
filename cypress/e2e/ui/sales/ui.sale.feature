@ui @sales
Feature: Sales page access control and sorting

@non-admin @tc80
  Scenario: Verify that a non-admin user sees a "No Sales Found" message when there are no sales records
    Given I am logged in as a non-admin user
    And there are no sales records in the system
    When I am on the Sales page
    Then a message "No sales found" should be displayed in the table

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
  Scenario: Show Delete action for admin user
    Given I am logged in as admin user
    And I am on the Sales page
    And there is at least one sale record in the system
    Then the Actions column should be displayed
    And the Delete action should be displayed

  @non-admin @tc78
  Scenario: Sort sales by plant name
    Given I am logged in as a non-admin user
    And I am on the Sales page
    And there are multiple sale records in the system
    When I click the "Plant" column header
    Then the sales list should be sorted by "Plant" in ascending order

  @non-admin @tc79
  Scenario: Sort sales by quantity
    Given I am logged in as a non-admin user
    And I am on the Sales page
    And there are multiple sale records in the system
    When I click the "Quantity" column header
    Then the sales list should be sorted by "Quantity" in ascending order

  @non-admin @tc81
  Scenario: Verify pagination functionality
    Given I am logged in as a non-admin user
    And I am on the Sales page
    And the system has more than 10 sale records
    When I click the "Next" pagination button
    Then page "2" should be displayed with new records

@admin @tc84
  Scenario: Verify navigation to the sell plant page
    Given I am logged in as admin user
    And I am on the Sales page
    When I click the Sell Plant button
    Then I should be navigated to the Sell Plant page

@admin @tc85
Scenario: Prevent sale when quantity exceeds available stock
  Given I am logged in as admin user
  And "Mango" has 15 units available in stock
  And I am on the "Sales" page
  When I click the Sell Plant button
  And I sell 20 units of "Mango"
  Then An error message should appear saying "Mango has only 15 items available in stock"

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
  Scenario: Verify that the sell operation works correctly for admin user
    Given I am logged in as admin user
    And "Rose" has 50 units available in stock
    And I am on the Sell Plant page
    When I select "Rose" from the plant dropdown
    And I enter a sell quantity of 5
    And I click the submit button
    Then I should be redirected to the Sales List page
    And the latest sale should show "Rose" with quantity 5 and correct "Total Price"


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