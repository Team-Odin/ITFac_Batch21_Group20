@ui @category
Feature: Category Management Module
    As an admin or user
    I want to manage categories
    So that I can organize plants in the system

  @UI/TC01
  Scenario: UI/TC01 Verify Add Category button visibility
    Given I am logged in as Admin
    And I am on the "Categories" page
    Then I should see the "Add Category" button

  @UI/TC02
  Scenario: UI/TC02 Verify "Add Category" Page Navigation
    Given I am logged in as Admin
    And I am on the "Categories" page
    When Click the "Add A Category" button
    Then System redirect to "/ui/categories/add"

  @UI/TC03
  Scenario: UI/TC03 Verify Creating a Main Category
    Given I am logged in as Admin
    And I am on the "Add Category" page
    When Enter "Fruits" in "Category Name"
    And Leave "Parent Category" empty
    And Click "Save" button
    Then System redirects to the list "Fruits" appears in the category table
    And Show "Category created successfully" message

  @UI/TC04
  Scenario: UI/TC04 Verify Creating a Sub Category
    Given I am logged in as Admin
    And I am on the "Add Category" page
    And "Fruits" category exists
    When Enter "Apple" in "Category Name"
    And Select "Fruits" from "Parent Category"
    And Click "Save" button
    Then System redirects to the list "Apple" appears in the category table
    And "Apple" is saved and linked to "Fruits"

  @UI/TC05
  Scenario: UI/TC05 Verify Pagination Functionality
    Given I am logged in as Admin
    And I am on the "Categories" page
    And with more than "10" categories exists
    When Scroll bottom of the list
    And Click "Next" pagination
    Then The list refreshes to show the next set of category records

  @UI/TC06
  Scenario: UI/TC06 Verify Default Pagination State
    Given I am logged in as Admin
    And I am on the "Categories" page
    And with more than "20" categories exists
    When Observe the pagination controls at the bottom of the table
    And Check the "Previous" button status
    And Check which page number is highlighted
    Then "1" is highlighted
    And "Previous" button is disabled
    And "Next" button is enabled

  @UI/TC07
  Scenario: UI/TC07 Verify "Next" Button Navigation
    Given I am logged in as Admin
    And I am on the "Categories" page
    And with more than "10" categories exists
    When Click "Next" pagination
    Then The table refreshes with new data
    And The active page indicator changes to "2"
    And The "Previous" button becomes enabled

  @UI/TC08
  Scenario: UI/TC08 Verify "Previous" Button Navigation
    Given I am logged in as Admin
    And I am on the "Categories" page "2"
    When Click "Previous" pagination
    Then The table refreshes with original data
    And The active page indicator changes to "1"

  @UI/TC09
  Scenario: UI/TC09 Verify Row Count Per Page
    Given I am logged in as Admin
    And I am on the "Categories" page
    When Count the number of category rows displayed in the table on "1"
    Then The count matches the system default (e.g., exactly "10" rows)

  @UI/TC10
  Scenario: UI/TC10 Verify Last Page State
    Given I am logged in as Admin
    And I am on the last page of "Categories"
    When observe the "Next" button
    Then The "Next" button is disabled (greyed out) or hidden

  @UI/TC11
  Scenario: UI/TC11 Verify "Add Category" Button Hidden
    Given I am logged in as User
    And I am on the "Categories" page
    When Scan top action area of the page
    Then The "Add Category" button is NOT present

  @UI/TC12
  Scenario: UI/TC12 Verify Search by Name
    Given I am logged in as User
    And I am on the "Categories" page
    And "Fruits" category exists
    When Enter "Fruits" in search bar
    And Click "Search"
    Then List update display only the "Fruits" category

  @UI/TC13
  Scenario: UI/TC13 Verify Filter by Parent
    Given I am logged in as User
    And I am on the "Categories" page
    When Select a parent from the "Parent Category" filter dropdown
    And Click "Search" button
    Then List updates to show only children of the selected parent

  @UI/TC14
  Scenario: UI/TC14 Verify Edit Action Hidden for Non admin User
    Given I am logged in as User
    And I am on the "Categories" page
    When Inspect the "Actions" column of the category table
    Then Edit icon are either hidden or visually disabled

  @UI/TC15
  Scenario: UI/TC15 Verify Delete Action Hidden for Non admin User
    Given I am logged in as User
    And I am on the "Categories" page
    When Inspect the "Actions" column of the category table
    Then Delete icon are either hidden or visually disabled

  @UI/TC16
  Scenario: UI/TC16 Verify "Sorting by name" in Category page
    Given I am logged in as Admin
    And I am on the "Categories" page
    When Click on the "Name" column header to sort by name
    Then The categories should be sorted by name in ascending order
    When Click on the "Name" column header to sort by nameagain
    Then The categories should be sorted by name in descending order

  @UI/TC17
  Scenario: UI/TC17 Verify "Sorting by id" in Category page as User
    Given I am logged in as User
    And I am on the "Categories" page
    When Click on the "Id" column header to sort by id
    Then The categories should be sorted by id in ascending order
    When Click on the "Id" column header to sort by id again
    Then The categories should be sorted by id in descending order

  @UI/TC18
  Scenario: UI/TC18 Verify "Search by Name" functionality in Category page for an existing category
    Given I am logged in as Admin
    And I am on the "Categories" page
    And "Fruits" category exists
    When Enter "Fruits" in search bar
    And Click "Search" button
    Then List update display only the "Fruits" category

  @UI/TC19
  Scenario: UI/TC19 Verify "Search by Name" functionality in Category page with space in search field
    Given I am logged in as Admin
    And I am on the "Categories" page
    And "Fruits" category exists
    When Enter " Fruits" in search bar
    And Click "Search" button
    Then List update display only the "Fruits" category

  @UI/TC20
  Scenario: UI/TC20 Verify "Search by Name" functionality in Category page for an unregistered category
    Given I am logged in as Admin
    And I am on the "Categories" page
    And "Vegetables" category doesn't exists
    When Enter "Vegetables" in search bar
    And Click "Search" button
    Then List update display 'No category found' message

  @UI/TC21
  Scenario: UI/TC21 Verify "Search by Name" functionality in Category page for a special character input
    Given I am logged in as Admin
    And I am on the "Categories" page
    And "*&%" category doesn't exists
    When Enter "*&%" in search bar
    And Click "Search" button
    Then List update display 'No category found' message

  @UI/TC22
  Scenario: UI/TC22 Verify "Search by Name" within a specific "Parent Category"
    Given I am logged in as Admin
    And I am on the "Categories" page
    And A parent category "Fruits" with child "Apple" exists
    When Select "Fruits" from "Parent Category" filter dropdown
    And Enter "Apple" in search bar
    And Click "Search" button
    Then The table should display only the "Apple" category
    And The "Parent Category" column for "Apple" should show "Fruits"

  @UI/TC23
  Scenario: UI/TC23 Verify empty search returns all children of selected Parent Category
    Given I am logged in as Admin
    And I am on the "Categories" page
    And A parent category "Fruits" with child "Apple" exists
    When Select "Fruits" from "Parent Category" filter dropdown
    And Enter " " in search bar
    And Click "Search" button
    Then The table should display the "Apple" category
    And Every row shown should have "Fruits" as the Parent Category

  @UI/TC24
  Scenario: UI/TC24 Verify "Reset" button clears search and filters
    Given I am logged in as Admin
    And I am on the "Categories" page
    And A parent category "Fruits" with child "Apple" exists
    When Select "Fruits" from "Parent Category" filter dropdown
    And Enter "Apple" in search bar
    And Click "Search" button
    And Click the "Reset" button
    Then The "Parent Category" filter should be cleared
    And The "Search" bar should be empty
    And The table should show all categories

  @UI/TC25
  Scenario: UI/TC25 Verify "Edit" button is hidden for regular User
    Given I am logged in as User
    And I am on the "Categories" page
    Then The "Edit" button should not be visible for any category

  @UI/TC26
  Scenario: UI/TC26 Verify "Delete" button is hidden or disabled for regular User
    Given I am logged in as User
    And I am on the "Categories" page
    Then The "Delete" button should not be visible for any category

  @UI/TC27
  Scenario: UI/TC27 Verify "Edit" button is visible and functional for Admin User
    Given I am logged in as Admin
    And I am on the "Categories" page
    Then The "Edit" button should be visible for any category
    When I click the "Edit" button for the first category
    Then System should navigate to the category edit page

  @UI/TC28
  Scenario: UI/TC28 Verify "Delete" button is visible and functional for Admin User
    Given I am logged in as Admin
    And I am on the "Categories" page
    And At least one category exists
    Then The "Delete" button should be visible for any category
    When I click the "Delete" button for the first category
    Then The category should be removed from the table

  @UI/TC29
  Scenario: UI/TC29 Verify system behavior when creating a category with an empty name
    Given I am logged in as Admin
    And I am on the "add category" page
    When I leave the category name field empty
    And I click the "Save" button
    Then I should see a validation error message "Category name is required"
    And The system should not navigate away from the "add category" page

  @UI/TC30
  Scenario: UI/TC30 Verify successful creation of a new category
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "Vegetables" into the category name field
    And I click the "Save" button
    Then I should be redirected to the "Categories" page
    And I should see a success message "Category created successfully"
    And The new category "Vegetables" should appear in the table

  @UI/TC31
  Scenario: UI/TC31 Verify system behavior when creating a category name with 2 letters and a space
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "Ab " into the category name field
    And I click the "Save" button
    Then I should see a validation error message "Category name must be between 3 and 10 characters"
    And The system should not navigate away from the "add category" page

  @UI/TC32
  Scenario: UI/TC32 Verify system behavior when creating a category name with only 2 letters
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "Ab" into the category name field
    And I click the "Save" button
    Then I should see a validation error message "Category name must be between 3 and 10 characters"
    And The system should not navigate away from the "add category" page

  @UI/TC33
  Scenario: UI/TC33 Verify system behavior when creating a category with only special characters
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "*#/" into the category name field
    And I click the "Save" button
    Then I should see a validation error message "Category name must only contain letters and numbers"
    And The system should not navigate away from the "add category" page

  @UI/TC34
  Scenario: UI/TC34 Verify successful creation of a new category
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "Vegetables" into the category name field
    And I click the "Save" button
    Then I should be redirected to the "Categories" page
    And I should see a success message "Category created successfully"
    And The new category "Vegetables" should appear in the table

  @UI/TC35
  Scenario: UI/TC35 Verify system behavior when creating a duplicate sub-category
    Given I am logged in as Admin
    And A parent category "Plants" with child "Vegetables" exists
    And I am on the "add category" page
    When I enter "Vegetables" into the category name field
    And I select "Plants" from the parent category dropdown
    And I click the "Save" button
    Then I should be redirected to the "Categories" page
    And I should see a duplicate error message "Sub-category 'Vegetables' already exists under this parent"
    And The category "Vegetables" should only appear once in the table

  @UI/TC36
  Scenario: UI/TC36 Verify system behavior when creating a duplicate sub-category
    Given I am logged in as Admin
    And A parent category "Plants" with child "Vegetables" exists
    And I am on the "add category" page
    When I enter "Vegetables" into the category name field
    And I select "Plants" from the parent category dropdown
    And I click the "Save" button
    Then I should be redirected to the "Categories" page
    And I should see a duplicate error message "Sub-category 'Vegetables' already exists under this parent"
    And The category "Vegetables" should only appear once in the table

  @UI/TC37
  Scenario: UI/TC37 Verify system behavior when category name exceeds 10 characters
    Given I am logged in as Admin
    And I am on the "add category" page
    When I enter "VegetablesGroup" into the category name field
    And I click the "Save" button
    Then I should see a validation error message "Category name must be between 3 and 10 characters"
    And The system should not navigate away from the "add category" page

  @UI/TC38
  Scenario: UI/TC38 Verify "Cancel" button navigates back to Categories page
    Given I am logged in as Admin
    And I am on the "add category" page
    When I click the "Cancel" button
    Then I should be redirected to the "Categories" page
    And The system should not have created a new category

  @UI/TC39
  Scenario: UI/TC39 Verify Category sidebar item is highlighted when active
    Given I am logged in as Admin
    When I am on the "Categories" page
    Then The "Categories" sidebar item should have the "active" class

  @UI/TC40
  Scenario: UI/TC40 Cross-verify Main Category count between Dashboard and Pagination
    Given I am logged in as Admin
    And I note the total "Main" category count from the Dashboard
    When I navigate to the "Categories" page
    And I count all categories across all pagination pages
    Then The total count should match the Dashboard summary
