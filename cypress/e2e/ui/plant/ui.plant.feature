@ui @plant
Feature: Plant Management Module
    As an admin or user
    I want to manage plants
    So that I can organize the inventory

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

    @UI/TC122
    Scenario: UI/TC122 Verify Navigation Menu Highlights Active Page
        Given I am logged in as an Admin or Non-Admin user
        And I am on the Dashboard page
        When I click the "Plants" menu
        Then the "Plants" navigation menu item should be highlighted
        And I should be on the "Plants" page

    @UI/TC133
    Scenario: UI/TC133 Verify Search plants list by Plant Name as an admin
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        When I enter "Basil" in the search input field
        And Click the "Search" button
        Then The plant list should display only matching plants based on "Basil"

    @UI/TC134
    Scenario: UI/TC134 Verify Search plants list by Plant Name with space as an Admin
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        When I enter "Basil " in the search input field with a trailing space
        And Click the "Search" button
        Then The plant list should display only matching plants based on "Basil"

    @UI/TC135
    Scenario: UI/TC135 Verify "Low" Stock Badge Visibility by Admin
        Given I am logged in as "Admin"
        And I am on the "Plants" page
        When Click the "Add a Plant" button
        And I enter plant details with name "LowStockPlant" and price "50" stock "3"
        And Click the "Save" button
        Then The plant list is refreshed
        And The "Low" stock badge is displayed for "LowStockPlant"

    @UI/TC136
    Scenario: UI/TC136 Verify Action Column Visibility on Admin
        Given I am logged in as "Admin"
        And I am on the "Plants" page
        Then The "Edit" icon is visible for "LowStockFlower"
        And The "Delete" icon is visible for "LowStockFlower"

    @UI/TC137
        Scenario: UI/TC137 Verify Edit Plant Functionality
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
    Scenario: UI/TC138 Verify Edit Plant category Functionality
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        And A plant named "LowStockFlower" exists in the list
        When Click the "Edit" button on the "LowStockFlower" row
        And Update the "Category" field to "Flowers"
        And Click the "Save" button
        Then The system redirects to the Plant list
        And The plant table displays the category "Flowers" for "LowStockFlower"

    @UI/TC139
    Scenario: UI/TC139 Verify Delete Plant Functionality
        Given I am logged in as "Admin"
        And Plants exist in the Plant list
        And I am on the "Plants" page
        And A plant named "LowStockPlant" exists in the list
        When Click the "Delete" button on a "LowStockPlant" row
        And Confirm the deletion on the popup
        Then The system redirects to the Plant list
        And The plant named "LowStockPlant" should be removed from the list
    
    @UI/TC140
    Scenario: UI/TC140 Verify Cancel Button Functionality in Plant Add Page
        Given I am logged in as "Admin"
        And I am on the "Add Plant" page
        When I enter plant details with name "CancelMe" and stock "10"
        And Click the "Cancel" button
        Then The system navigates back to the Plant list page "/ui/plants"

    @UI/TC141
    Scenario: UI/TC141 Verify the Category List Displays Only Sub-Categories
        Given I am logged in as "Admin"
        And I am on the "Add Plant" page
        When Click the "Category" dropdown
        Then Only sub-categories are listed in the dropdown

    @UI/TC142
    Scenario: UI/TC142 Verify Plant List Visibility as Non-Admin User
        Given I am logged in as "Standard User"
        And I am on the "Dashboard" page
        When Click on the "Plants" link in the navigation menu
        Then The system redirects to the Plant list page
        And The plant list table is displayed

    @UI/TC143
    Scenario: UI/TC143 Verify Add Plant Button Visibility as Non-Admin
        Given I am logged in as "Standard User"
        And I am on the "Plants" page
        Then The "Add a Plant" button is NOT visible
        
    @UI/TC144
    Scenario: UI/TC144 Verify Plant List Pagination as Non-Admin
        Given I am logged in as "Standard User"
        And I am on the "Plants" page
        When Scroll to the bottom of the plant list table
        And Click on the "Next" page button
        Then The active page indicator highlights "2"

    @UI/TC145
    Scenario: UI/TC145 Verify Sorting by Name
        Given I am logged in as "Standard User"
        And I am on the "Plants" page
        When I click the "Name" column header once
        Then The column is sorted "descending"
        When I click the "Name" column header once
        Then The column is sorted "ascending"

    @UI/TC146
    Scenario: UI/TC146 Verify Filter by Plant Category as a Non-Admin User
        Given I am logged in as "Standard User"
        And I am on the "Plants" page
        When Select "Cactus" from the Category dropdown
        And Click the "Search" button
        Then The plant list should display only plants with category "Cactus"