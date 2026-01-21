@ui @category
Feature: Category Management Module
    As an admin user
    I want to manage categories
    So that I can organize plants in the system

    Background:
        Given I am logged in as Admin
        And I am on the "Categories" page

    Scenario: UI/TC01 Verify Add Category button visibility
        Then I should see the "Add Category" button

    Scenario: UI/TC02 Verify "Add Category" Page Navigation
        When Click the "Add A Category" button
        Then System redirect to "/ui/categories/add"

    Scenario: UI/TC03 Verify Creating a Main Category
        Given I am on the "Add Category" page
        When Enter "Fruits" in "Category Name"
        And Leave "Parent Category" empty
        And Click "Save"
        Then  System redirects to the list "Fruits" appears in the category table
        And  Show "Category created successfully" message

    Scenario: UI/TC04 Verify Creating a Sub Category
        Given I am on the "Add Category" page
        Given "Fruits" category exists
        When Enter "Apple" in "Category Name"
        And Select "Fruits" from "Parent Category"
        And Click "Save"
        Then System redirects to the list "Apple" appears in the category table
        And "Apple" is saved and linked to "Fruits"
