@ui @plant
Feature: plant Management Module
    As an admin or user
    I want to manage plants
    So that I can organize plants in the system

    @UI/TC112
Scenario: UI/TC01 Verify Plant List page visibility
    Given I am logged in as Admin
    And I am on the Dashboard page
    When I click the "Plants" menu
    Then I should be redirected to the "Plants" page
    And I should see the plant list table

