@ui @plant
Feature: plant Management Module
    As an admin or user
    I want to manage plants
    So that I can organize plants in the system

    @UI/TC112
    Scenario: UI/TC112 Verify Plant List page visibility
        Given I am logged in as Admin
        And I am on the Dashboard page
        When I click the "Plants" menu
        Then I should be redirected to the "Plants" page
        And I should see the plant list table

    
    @UI/TC113
    Scenario: UI/TC113 Verify Add Plant button visibility
        Given I am logged in as Admin
        And I am on the "Plants" page
        Then I should see the "Add Plant" button

    @UI/TC114
    Scenario: UI/TC114 Verify "Add Plant" Page Navigation
        Given I am logged in as Admin
        And I am on the "Plants" page
        When Click the "Add a Plant" button
        Then System redirect to "/ui/plants/add"

    @UI/TC115
    Scenario: UI/TC115 Verify Creating a New Plant
        Given I am logged in as Admin
        And I am on the "Add Plant" page
        When Enter "Chrysanthemum" in "Plant Name"
        And Select "Indoor" from "Category"
        And Enter "500" in "Price"
        And Enter "10" in "Quantity"
        And Click "Save" button
        Then System redirects to the plant list
        And "Chrysanthemum" appears in the plant table
        And Show "Plant created successfully" message


    @UI/TC116
    Scenario: UI/TC116 Verify Plant List Pagination
        Given I am logged in as Admin
        And I am on the "Plants" page
        And More than 10 plants exist
        When Click the "Next" pagination button
        Then The next set of plants should be displayed

    @UI/TC117
    Scenario: UI/TC117 Verify Filter Plant by Category
        Given I am logged in as Admin
        And I am on the "Plants" page
        When Select "Trees" from category filter
        And Click "Search" button
        Then Only plants under "Trees" category should be displayed
    
    @UI/TC118
    Scenario: UI/TC118 Verify Plant Search by Name
        Given I am logged in as Non-Admin
        And I am on the "Plants" page
        When Enter "Rose" in search field
        And Click "Search" button
        Then Matching plants should be displayed in the table
    
    @UI/TC119
    Scenario: UI/TC119 Verify Action Buttons are Hidden for Non-Admin
        Given I am logged in as Non-Admin
        And I am on the "Plants" page
        Then I should not see "Edit" and "Delete" buttons

    @UI/TC120
    Scenario: UI/TC120 Verify No Plants Found Message
        Given I am logged in as Admin
        And I am on the "Plants" page
        When Enter "InvalidPlant" in search field
        And Click "Search" button
        Then Show "No plants found" message

    @UI/TC121
    Scenario: UI/TC121 Verify Low Stock Badge Visibility
        Given I am logged in as Non-Admin
        And I am on the "Plants" page
        When Plant quantity is less than 5
        Then I should see the "Low Stock" badge
