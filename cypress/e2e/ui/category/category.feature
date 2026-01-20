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
