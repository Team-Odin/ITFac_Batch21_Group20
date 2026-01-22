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
        Then  System redirects to the list "Fruits" appears in the category table
        And  Show "Category created successfully" message

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
        When  Count the number of category rows displayed in the table on "1"
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
        When  Inspect the "Actions" column of the category table
        Then  Delete icon are either hidden or visually disabled