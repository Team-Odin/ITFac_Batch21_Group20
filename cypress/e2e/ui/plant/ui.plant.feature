Feature: Plant Management Module
    As an admin and standard user
    I want to manage plants
    So that I can organize the inventory

    Background:
        Given The application is running

    @UI/TC133
    Scenario: Verify Search plants list by Plant Name as an admin
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        When I enter "Basil" in the search input field
        And Click the "Search" button
        Then The plant list should display only matching plants based on "Basil"

    @UI/TC134
    Scenario: Verify Search plants list by Plant Name with space as an Admin
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        When I enter "Basil " in the search input field with a trailing space
        And Click the "Search" button
        Then The plant list should display only matching plants based on "Basil"

    @UI/TC135
    Scenario: Verify "Low" Stock Badge Visibility by Admin
        Given I am logged in as "Admin"
        And I am on the "Plants" page
        When Click the "Add a Plant" button
        And I enter plant details with name "LowStockFlower" and price "50" stock "3"
        And Click the "Save" button
        Then The plant list is refreshed
        And The "Low" stock badge is displayed for "LowStockFlower"

    @UI/TC136
    Scenario: Verify Action Column Visibility on Admin
        Given I am logged in as "Admin"
        And I am on the "Plants" page
        Then The "Edit" icon is visible for "LowStockFlower"
        And The "Delete" icon is visible for "LowStockFlower"

    @UI/TC137
    Scenario: Verify Edit Plant Functionality
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        And A plant named "Banana" exists in the list
        When Click the "Edit" button on a plant row
        And Update the "Name" field to "Banana 2"
        And Click the "Save" button
        Then The system redirects to the Plant list
        And The plant table displays the name "Banana 2"

    @UI/TC138
    Scenario: Verify Edit Plant Functionality
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        And A plant named "LowStockFlower" exists in the list
        When Click the "Edit" button on the "LowStockFlower" row
        And Update the "Category" field to "Flowers"
        And Click the "Save" button
        Then The system redirects to the Plant list
        And The plant table displays the category "Flowers" for "LowStockFlower"

    @UI/TC138
    Scenario: Verify Delete Plant Functionality
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        And A plant named "Chrysanthemum" exists in the list
        When Click the "Delete" button on a "Chrysanthemum" row
        And Confirm the deletion on the popup
        Then The system redirects to the Plant list
        And The plant named "Chrysanthemum" should be removed from the list
    
    @UI/TC139
    Scenario: Verify Cancel Button Functionality in Plant Add Page
        Given I am logged in as "Admin"
        And I am on the "Add Plant" page
        When I enter plant details with name "CancelMe" and stock "10"
        And Click the "Cancel" button
        Then The system navigates back to the Plant list page "/ui/plants"