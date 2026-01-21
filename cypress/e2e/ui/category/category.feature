@ui @category
Feature: Category Management Module
    As an admin user
    I want to manage categories
    So that I can organize plants in the system

    Background:
        Given I am logged in as Admin
        And I am on the "Categories" page

    @UI/TC01
    Scenario: UI/TC01 Verify Add Category button visibility
        Then I should see the "Add Category" button

    @UI/TC02
    Scenario: UI/TC02 Verify "Add Category" Page Navigation
        When Click the "Add A Category" button
        Then System redirect to "/ui/categories/add"

    @UI/TC03
    Scenario: UI/TC03 Verify Creating a Main Category
        Given I am on the "Add Category" page
        When Enter "Fruits" in "Category Name"
        And Leave "Parent Category" empty
        And Click "Save" button
        Then  System redirects to the list "Fruits" appears in the category table
        And  Show "Category created successfully" message

    @UI/TC04
    Scenario: UI/TC04 Verify Creating a Sub Category
        Given I am on the "Add Category" page
        Given "Fruits" category exists
        When Enter "Apple" in "Category Name"
        And Select "Fruits" from "Parent Category"
        And Click "Save" button
        Then System redirects to the list "Apple" appears in the category table
        And "Apple" is saved and linked to "Fruits"

    @UI/TC05
    Scenario: UI/TC05 Verify Pagination Functionality
        Given I am on the "Categories" page
        And with more than "10" categories exists
        When Scroll bottom of the list
        And Click "Next" pagination
        Then The list refreshes to show the next set of category records

    @UI/TC06
    Scenario: UI/TC06 Verify Default Pagination State
        Given I am on the "Categories" page
        And with more than "20" categories exists
        When Observe the pagination controls at the bottom of the table
        And Check the "Previous" button status
        And Check which page number is highlighted
        Then "1" is highlighted
        And "Previous" button is disabled
        And "Next" button is enabled

