# StarJumper

## Overview

Star Jumper is a single & multi player game where jumpers compete
to become the ultimate Star, Jumping, guy... thus quenching the desire
to jump through the stars, in an ultimate fashion.  Game play will be
done entirely through canvas because its (a) more impressive and (b) more
fun.  I also want to dedicate a good amount of time to experimenting with 
SASS for CSS.


## User Experience (by page)

* Home - User login/register, brief Star Jumper backstore with some
cool pics and menus to other pages
* Play - Page where the magic will happen
    * probably have a modal to pause game and re-check rules/controls   
* Rules - page where players can go before starting game to get details
about controls, game elements, strategies, etc.
* User Page (if time)
* Leadboard/History (if time)
* Backstore (if time)


## Data Model

* User
    * name
    * password
    * email
* Game
    * game_datetime
    * game_mode
* Game_data
    * game(game_fk)
    * participant(user_fk)
    * score
    * fav_color


## Schedule

* Done
    * All 6 shooting powers down, both for jumper and for enemy
    * Shot contact on enemies
    * Sword contact on enemy/enemy shots
* Week 1
    * Build out Single Player Mode: stages, enemy AI
    * Enemy contact on Star Jumper (varies by enemy)
    * Finish a rough draft of sprites
        * One color scheme for Star Jumper before replicating
* Week 2
    * Fine tune Star Jumper sprite animations & replicate colors
    * Finish single slayer mode functionality
    * Start Multi-player mode
* Week 3
    * Implement sprite animations
    * Finish Multi-Player mode
    * Start Laying out other pages
* Week 4
    * Any last remaining game-play issues
    * Build out back-end
    * Pretty-up essential pages
    * Optional other pages (if time)
    * Present