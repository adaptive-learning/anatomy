Feature: Smoke tests
    As a user of anatom.cz
    I should be able to practice my knowledge
    In order to learn what I need


    Scenario: Practice all 
        Given I go to "/practice/"
        Then I should see a question

    Scenario: Knowledge Overview 
        Given I go to "/overview/"
        Then I should see "Přehled znalostí"
        And I should see "14" tiles

