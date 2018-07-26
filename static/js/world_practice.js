
class World {
    constructor(world_cnv, sword_cnv) {
        this.play = true
        this.play_mode = 'practice'
        this.difficulty = 5
        this.world_cnv = world_cnv
        this.sword_cnv = sword_cnv
        this.world_ctx = world_cnv.getContext('2d')
        this.world_ctx.imageSmoothingEnabled = false
        this.sword_ctx = sword_cnv.getContext('2d')
        this.sword_ctx_data = []
        this.cnv_rect = sword_cnv.getBoundingClientRect()
        this.width = sword_cnv.width
        this.height = sword_cnv.height
        this.star_size = 4
        this.ground_height = 20
        this.dv = 0.03
        this.total_velocity = 0
        this.max_velocity = 40
        this.colors = ['white', 'mediumblue', 'red', 'yellow', 'limegreen', 'orange', 'darkorchid']
        this.portals = []
        this.platforms = []
        this.enemies = []
        this.eyes = []
        this.eye_hurt_count = 0
        this.ground = new Rectangle(0, this.height - this.ground_height, this.width, this.ground_height, 'green')
        this.platforms.push(this.ground)
        this.player = new StarJumper(sword_cnv.width/2 - 20, sword_cnv.height-this.ground_height - 40, 'white')
        ///// STARS /////
        let x, y
        for (let i=0; i<10; i++) {
            if (i === 0) {
                x = 150
                y = 450
            } else if (i === 1) {
                x = 650
                y = 450
            } else {
                x = random(10, this.width-10)
                y = random(10, this.height-this.ground_height-100)
            }
            let star = new Rectangle(x, y, this.star_size, this.star_size, 'white')
            this.platforms.push(star)
        }
        ////// PORTALS ///////
        for (let i=0; i<1; i++) {
            let radius = 20;
            x = random(radius, this.width - radius)
            y = random(radius, this.height * 0.8)
            let p1 = new Portal(x, y, radius, this.colors[i], Math.random() - 0.5, Math.random() - 0.5)
            x = random(radius, this.width - radius)
            y = random(radius, this.height * 0.8)
            let p2 = new Portal(x, y, radius, this.colors[i], Math.random() - 0.5, Math.random() - 0.5)
            p1.portal_pair = p2
            p2.portal_pair = p1
            this.portals.push(p1)
            this.portals.push(p2)
        }
        ////// HEALTH STAR ///////
        y = random(0, this.height * 0.8)
        x = random(100, this.width - 100)
        this.health_star = new HealthStar(x, y, this.star_size, this.star_size, 'deeppink');
        ///// EYES /////
        this.eyes.push(new Eye(this.width / 2 - 40, 100, 'mediumblue'))
        this.eyes.push(new Eye(this.width / 2 + 40, 100, 'mediumblue'))
        ///// LEFT CLICK - SHOOT STAR ///////
        document.onclick = (e) => {
            let got_energy = this.player.energy >= color_data[this.player.color].shot_cost
            if (this.player.flip_count <= 0 && got_energy && restart > 10) {
                this.player.energy -= color_data[this.player.color].shot_cost
                ///// WHERE'D PLAYER CLICK /////
                let clicked_x = e.clientX - this.cnv_rect.left
                let clicked_y = e.clientY - this.cnv_rect.top
                ///// CREATE SHOT BASE /////
                let shot = new color_data[this.player.color].shot(this.player.cx(), this.player.cy(), this.player.color, this.player)
                ///// SHOT SPEEDS DETERMINED IN CONSTRUCTOR, USE NOW TO GET VX & VY /////
                let shot_vel = getShotVelocities(clicked_x, clicked_y, this.player.cx(), this.player.cy(), shot.speed)
                shot.vx = shot_vel.vx
                shot.vy = shot_vel.vy
                this.player.shots.push(shot)
                if (step_name === 'Shoot') iterateStep()
            }
        }
        ///// RIGHT CLICK - SWORD SWIPE ///////
        document.oncontextmenu = (e) => {
            if (this.player.flip_count <= 0 && !this.player.staa_ridin) {
                let ground_boost = Math.max(6 - (this.ground.y_pos - this.player.y_pos) / this.player.height * 2, 0)
                let result = this.player.getFlipAttack(
                    e.clientX - this.cnv_rect.left, e.clientY - this.cnv_rect.top, ground_boost)
                if (result) {
                    this.player.sword_trail.push([])
                    this.player.sword_tip.x_pos = this.player.cx()
                    this.player.sword_tip.y_pos = this.player.cy()
                    if (result === 'up' && step_name === 'Sword Up') {
                        iterateStep()
                    } else if (result === 'down' && step_name === 'Sword Down') {
                        iterateStep()
                    }
                }
            }
            return false
        }
    }
    update() {
        if (this.player.health <10 && this.player.hurt_count === 0) {
            this.player.health += 1
        }
        if (this.player.victory) {
            this.player.victory = false
            this.play = false
            finishPractice()
        } else {
            restart += 1
            let pix_data = this.sword_ctx.getImageData(0, 0, this.sword_cnv.width, this.height)
            this.sword_ctx_data = pix_data.data
            let total_velocity = 0

            /////HEALTH STAR //////
            this.health_star.x_pos += this.health_star.vx
            this.health_star.y_pos += this.health_star.vy
            let is_ob_right = this.health_star.x_pos + this.health_star.width > this.width
            let is_ob_left = this.health_star.x_pos < 0
            if (is_ob_right || is_ob_left) this.health_star.vx *= -1
            let is_ob_top = this.health_star.y_pos > this.height - this.ground.height - this.star_size
            let is_ob_bottom = this.health_star.y_pos < 0
            if (is_ob_top || is_ob_bottom) this.health_star.vy *= -1
            ///// PORTAL UPDATE /////
            for (let i=0; i<this.portals.length; i++) {
                total_velocity += Math.abs(this.portals[i].vx) + Math.abs(this.portals[i].vy)
                this.portals[i].update(.5)
                ///// BOUNCE PORTALS OFF SIDES & GROUND //////
                if (this.portals[i].x_pos + this.portals[i].rad > this.width) {
                    this.portals[i].setRight(this.width)
                    this.portals[i].vx *= -1
                    this.portals[i].x_pos += this.portals[i].vx
                } else if (this.portals[i].x_pos - this.portals[i].rad < 0) {
                    this.portals[i].setLeft(0)
                    this.portals[i].vx *= -1
                    this.portals[i].x_pos += this.portals[i].vx
                } else if (this.portals[i].y_pos + this.portals[i].rad > this.height - this.ground_height) {
                    this.portals[i].setBottom(this.height - this.ground_height)
                    this.portals[i].vy *= -1
                    this.portals[i].y_pos += this.portals[i].vy
                } else if (this.portals[i].y_pos - this.portals[i].rad < 0) {
                    this.portals[i].setTop(0)
                    this.portals[i].vy *= -1
                    this.portals[i].y_pos += this.portals[i].vy
                }
                ///// CHECK TO SEE IF PORTAL HIT ANOTHER PORTAL //////
                for (let j=i+1; j<this.portals.length; j++) {
                    let result = this.portals[i].checkCollideCir(this.portals[j])
                    let dv = this.total_velocity < this.max_velocity ? this.dv : -this.dv*4
                    if (result && this.portals[i].vib_count <= 0) {
                        this.portals[i].vib_count = 60
                        this.portals[i].vy > 0 ? this.portals[i].vy += dv: this.portals[i].vy -= dv
                        this.portals[i].vx > 0 ? this.portals[i].vx += dv: this.portals[i].vx -= dv
                        this.portals[j].vib_count = 60
                        this.portals[j].vy > 0 ? this.portals[j].vy += dv: this.portals[j].vy -= dv
                        this.portals[j].vx > 0 ? this.portals[j].vx += dv: this.portals[j].vx -= dv
                    }
                }
                ///// SEE IF PORTAL HITS HEALTH STAR, EXCEPT LAST PORTAL EXITED //////
                if (this.portals[i] !== this.health_star.last_teleport) {
                    let hit_health_star = this.portals[i].checkCollideRec(this.health_star)
                    if (hit_health_star) {
                        this.health_star.last_teleport = this.portals[i].portal_pair
                        this.health_star.x_pos = this.portals[i].portal_pair.x_pos
                        this.health_star.y_pos = this.portals[i].portal_pair.y_pos
                        if (this.portals[i].portal_pair.vx > 0) {
                            this.health_star.vx = -Math.abs(this.health_star.vx)
                        } else {
                            this.health_star.vx = Math.abs(this.health_star.vx)
                        }
                        if (this.portals[i].portal_pair.vy > 0) {
                            this.health_star.vy = -Math.abs(this.health_star.vy)
                        } else {
                            this.health_star.vy = Math.abs(this.health_star.vy)
                        }
                    }
                }
                ///// REDUCE VIBRATION COUNT //////
                this.portals[i].vib_count -= 1
            }
            this.total_velocity = total_velocity
            this.updateEnemies()
            this.player.update(this.portals, this.platforms, this.enemies, this.width, this.height, this.health_star, true)
            ///// CHECK IF NORMAL STARS ARE INSIDE SWORD TRAIL /////
            for (let i=1; i<this.platforms.length; i++) {
                if (this.platforms[i].x_pos < this.world_cnv.width && this.platforms[i].x_pos > 0) {
                    let sword_hit = checkCTX(this.platforms[i], this.sword_cnv.width, this.sword_ctx_data, 0)
                    if (sword_hit) {
                        this.platforms.splice(i, 1)
                        this.player.star_count += 1
                    }
                }
            }
        }
    }

    updateEnemies() {
        ///// EYE /////
        this.eye_hurt_count -= 1
        for (let i=0; i<this.eyes.length; i++) {
            let attack = this.eyes[i].update(this.ground, this.eye_hurt_count, this.enemies.length, true)
            if (attack) {
                let eye_color = this.eyes[0].color
                if (this.eyes[i].blink_dir === 'width') {
                    let new_x = this.eyes[i].x_pos - color_data[eye_color].width / 2
                    let new_y = this.eyes[i].y_pos - color_data[eye_color].height / 2
                    this.addEnemy(new_x, new_y, eye_color)
                } else {
                    let shot = new color_data[eye_color].shot(
                        this.eyes[i].x_pos, this.eyes[i].y_pos, eye_color, this.eyes[i])
                    let shot_vel = getShotVelocities(this.player.cx(), this.player.cy(),
                        this.eyes[i].x_pos, this.eyes[i].y_pos, shot.speed)
                    shot.vx = shot_vel.vx
                    shot.vy = shot_vel.vy
                    shot.life = 240
                    this.eyes[i].shots.push(shot)
                }
            }
            ///// DID EYE HIT SWORD /////
            if (this.eyes[i].life > 0 && this.eye_hurt_count < 0) {
                let sword_hit = checkCTX(this.eyes[i], this.sword_cnv.width, this.sword_ctx_data, 0, true)
                if (sword_hit) {
                    if (step_name == 'Hurt Eye') {
                        iterateStep()
                    } else if (step_name == 'Kill Eye' || this.eyes[0].life + this.eyes[1].life > 2) {
                        this.eyes[i].hurt()
                        this.eye_hurt_count = 90
                        if (this.eyes[0].life + this.eyes[1].life === 0) this.player.victory = true
                    }
                }
            }
        }
        ///// KEEP EYE SPACING /////
        this.eyes[0].y_pos = this.eyes[1].y_pos
        if(this.eyes[0].vx * this.eyes[1].vx > 0) {
            let x_diff = 80 - Math.abs(this.eyes[0].x_pos - this.eyes[1].x_pos)
            if (Math.abs(x_diff) > 0) {
                if (this.eyes[0].x_pos > this.eyes[1].x_pos) {
                    this.eyes[0].x_pos += x_diff/2
                    this.eyes[1].x_pos -= x_diff/2
                } else {
                    this.eyes[0].x_pos -= x_diff/2
                    this.eyes[1].x_pos += x_diff/2
                }
            }
        }
        for (let i=0; i<this.eyes.length; i++) {
            for (let j=0; j<this.eyes[i].shots.length; j++) {
                this.eyes[i].shots[j].update()
                this.checkEnemyShot(this.eyes[i].shots[j], this.eyes[i], j)
            }
        }
        ///// ENEMIES /////
        for (let i=0; i<this.enemies.length; i++) {
            let update_result = false
            if (!this.enemies[i].dead) {
                ///// UPDATE BY ENEMY COLOR /////
                if (this.enemies[i].o_color === 'red') {
                    update_result = this.enemies[i].update(this.ground.y_pos)
                    if (this.enemies[i].x_pos > this.width - this.enemies[i].width) {
                        this.enemies[i].x_pos = this.width - this.enemies[i].width
                        this.enemies[i].vx = 0
                        this.enemies[i].move_cooldown = 240
                    } else if (this.enemies[i].x_pos < 0) {
                        this.enemies[i].x_pos = 0
                        this.enemies[i].vx = 0
                        this.enemies[i].move_cooldown = 240
                    }
                } else if (this.enemies[i].o_color === 'yellow') {
                    update_result = this.enemies[i].update(this.ground.y_pos)
                    if (this.enemies[i].proxyX() < 100) {
                        this.enemies[i].shot_cooldown -= 2
                    } else if (this.enemies[i].proxyX() < 200) {
                        this.enemies[i].shot_cooldown -= 1
                    }
                } else if (this.enemies[i].o_color === 'limegreen') {
                    update_result = this.enemies[i].update(this.ground.y_pos, this.star_size)
                    if (this.enemies[i].x_pos > this.width - this.enemies[i].width) {
                        this.enemies[i].x_pos = this.width - this.enemies[i].width
                        if (this.enemies[i].stun_ct < 0) this.enemies[i].vx = -8
                    } else if (this.enemies[i].x_pos < 0) {
                        this.enemies[i].x_pos = 0
                        if (this.enemies[i].stun_ct < 0) this.enemies[i].vx = 8
                    }
                    ///// CHECK COLLISION WITH GREEN SHADOW /////
                    if (this.player.hurt_count < 0 && this.player.health > 0) {
                        for (let j=0; j<this.enemies[i].shadows.length; j++) {
                            let sword_hit = checkCTX(this.enemies[i].shadows[j], this.sword_cnv.width, this.sword_ctx_data, 0)
                            if (sword_hit) {
                                this.enemies[i].shadows.splice(j, 1)
                            } else if (this.enemies[i].shadows[j].checkCollideRec(this.player)) {
                                if (this.player.shield > 0) {
                                    if (this.player.color === 'yellow') {           // GREEN NEMESIS
                                        this.player.shield = 0
                                    } else {
                                        this.player.shield -= 1
                                        this.player.display_shield_ct = 40
                                    }
                                } else {
                                    this.player.health -= 1
                                    this.player.hurt_count = 120
                                }
                                this.enemies[i].shadows.splice(j, 1)
                            }
                        }
                    }
                } else if (this.enemies[i].o_color === 'mediumblue') {
                    this.enemies[i].update(this.width)
                } else if (this.enemies[i].o_color === 'darkorchid') {
                    update_result = this.enemies[i].update(this.ground.y_pos, this.portals)
                } else if (this.enemies[i].o_color === 'white') {
                    update_result = this.enemies[i].update(this.ground)
                } else {
                    update_result = this.enemies[i].update()
                }
                ///// CHECK IF PLAYER KILLED ENEMY ON SWORD /////
                let sword_hit = checkCTX(this.enemies[i], this.sword_cnv.width, this.sword_ctx_data, 0)
                if (sword_hit) {
                    if (step_name == 'Kill Enemy') {
                        iterateStep()
                    }
                    this.enemies[i].dead = true
                    score += 1
                    if (this.enemies[i].y_pos + this.enemies[i].height < this.ground.y_pos) {
                        let rad = Math.PI * Math.random() * 2
                        for (let j = 0; j < 3; j++) {
                            let vel_vect = {
                                vx: Math.cos(rad + j * Math.PI * 2 / 3),
                                vy: Math.sin(rad + j * Math.PI * 2 / 3)
                            }
                            let burst = new StarShot(this.enemies[i].cx(), this.enemies[i].cy(), sword_hit, this.player, 90)
                            let rand = random(.5, .8)
                            burst.vx = vel_vect.vx * rand
                            burst.vy = vel_vect.vy * rand
                            this.player.shots.push(burst)
                        }
                    }
                } else {
                    ///// CHECK IF PLAYER SHOTS HIT ENEMY /////
                    for (let j = 0; j < this.player.shots.length; j++) {
                        if (this.player.shots[j].checkCollideRec(this.enemies[i])) {
                            if (step_name == 'Stun Enemy') {
                                iterateStep()
                            }
                            if (this.player.shots[j].color === color_data[this.enemies[i].o_color].nemesis) {
                                this.enemies[i].dead = true
                                score += 1
                            } else {
                                if (this.player.shots[j].color === 'mediumblue' && this.enemies[i].color !== 'mediumblue') {
                                    this.enemies[i].color = 'lightblue'
                                    this.enemies[i].freeze_ct = 120
                                    this.enemies[i].stun_ct = 240
                                } else {
                                    this.enemies[i].stun_ct = 120
                                }
                            }
                            this.player.shots.splice(j, 1)
                            break
                        ///// CHECK BLUE SHOT TRAILS /////
                        } else if (this.player.shots[j].trail) {
                            for (let k = 0; k < this.player.shots[j].trail.length; k++) {
                                if (this.player.shots[j].trail[k].checkCollideRec(this.enemies[i])) {
                                    if (this.enemies[i].color === 'red') {
                                        this.enemies[i].dead = true
                                        score += 1
                                    } else if (!this.player.shots[j].trail[k].color === 'yellow') {
                                        this.enemies[i].color = 'lightblue'
                                        this.enemies[i].freeze_ct = 60
                                        this.enemies[i].stun_ct = 180
                                    }
                                    this.player.shots.splice(j, 1)
                                    break
                                }
                            }
                        }
                        ///// CHECK IF SHOT HITS EYE /////
                        if (this.eye_hurt_count < 0) {
                            for (let k=0; k<this.eyes.length; k++) {
                                if (this.eyes[k].life > 0) {
                                    if (this.eyes[k].checkShotInEllipse(this.player.shots[j])) {
                                        if (step_name == 'Hurt Eye') {
                                            iterateStep()
                                        } else if (step_name == 'Kill Eye' || this.eyes[0].life + this.eyes[1].life > 2) {
                                            this.eyes[k].hurt()
                                            this.eye_hurt_count = 90
                                            if (this.eyes[0].life + this.eyes[1].life === 0) this.player.victory = true
                                        }
                                    } else if (this.player.shots[j].trail) {
                                        for (let m = 0; m < this.player.shots[j].trail.length; m++) {
                                            if (this.eyes[k].checkShotInEllipse(this.player.shots[j].trail[m])) {
                                                if (step_name == 'Hurt Eye') {
                                                    iterateStep()
                                                } else if (step_name == 'Kill Eye' || this.eyes[0].life + this.eyes[1].life > 2) {
                                                    this.eyes[k].hurt()
                                                    this.eye_hurt_count = 90
                                                    if (this.eyes[0].life + this.eyes[1].life === 0) this.player.victory = true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    ///// IF ENEMY AND PLAYER COLLIDE /////
                    if (this.player.hurt_count < 0 && this.player.health > 0 && this.enemies[i].stun_ct < 0) {
                        if (this.enemies[i].checkCollideRec(this.player)) {
                            this.enemies[i].dead = true
                            if (this.player.shield > 0) {
                                if (color_data[this.player.color].nemesis === this.enemies[i].color) {
                                    this.player.shield = 0
                                } else {
                                    this.player.shield -= 1
                                    this.player.display_shield_ct = 40
                                }
                            } else {
                                this.player.health -= 1
                                this.player.hurt_count = 120
                            }
                        }
                    }
                }
            }
            ///// ENEMY STILL ALIVE, SEE IF ENEMY SHOULD TAKE A SHOT /////
            if (!this.enemies[i].dead) {
                this.enemies[i].shot_cooldown -= 1
                this.enemies[i].move_cooldown -= 1
                this.enemies[i].stun_ct -= 1
                this.enemies[i].freeze_ct -= 1
                if (update_result || Math.random() < 0.02) {
                    if (this.enemies[i].stun_ct < 0) {
                        let take_shot = true
                        if (this.enemies[i].color === 'white') {
                            take_shot = this.enemies[i].proxyX() < this.enemies[i].fire_range_x
                            take_shot = this.enemies[i].proxyY() < this.enemies[i].fire_range_y
                        } else if (this.enemies[i].color === 'red'
                            || this.enemies[i].color === 'orange'
                            || this.enemies[i].color === 'yellow'
                            || this.enemies[i].color === 'darkorchid') {
                            take_shot = update_result
                        } else if (this.enemies[i].color === 'mediumblue') {
                            take_shot = this.enemies[i].goodShot()
                            if (take_shot) {
                                this.enemies[i].runaway_cooldown = 180
                                this.enemies[i].move_cooldown = 30
                                if (this.enemies[i].cx() < this.player.cx()) {
                                    this.enemies[i].runaway_dir = -1
                                } else {
                                    this.enemies[i].runaway_dir = 1
                                }
                            }
                        }
                        if (take_shot && this.enemies[i].shot_cooldown < 0) {
                            let shot = new color_data[this.enemies[i].color].shot(
                                this.enemies[i].cx(), this.enemies[i].cy(), this.enemies[i].color, this.enemies[i])
                            let shot_vel = getShotVelocities(this.player.cx(), this.player.cy(),
                                this.enemies[i].cx(), this.enemies[i].cy(), shot.speed)
                            shot.vx = shot_vel.vx
                            shot.vy = shot_vel.vy
                            ///// ENEMY DID TAKE A SHOT, RESET COOLDOWN, MOVEMENTS, ETC.. /////
                            if (this.enemies[i].color === 'red') {
                                if (this.enemies[i].proxyX() < 200) {
                                    shot.vx = 0
                                    shot.vy = -7
                                } else if (this.enemies[i].cx() < this.player.cx()) {
                                    shot.vx = 3.3
                                    shot.vy = -6
                                } else {
                                    shot.vx = -3.3
                                    shot.vy = -6
                                }
                                shot = addRedTarget(this.enemies[i].cx(), this.enemies[i].cy(),
                                    shot, this.player, this.enemies)
                            } else if (this.enemies[i].color === 'orange') {
                                addOrangeBuck(shot)
                                this.enemies[i].move_cooldown = 30
                            } else if (this.enemies[i].color === 'yellow') {
                                this.enemies[i].shot_cooldown = Math.floor(random(45, 75))
                                shot.vy = 0
                                if (Math.random() < 0.5) {
                                    shot.last_dir = -1
                                    shot.vx = 4
                                } else {
                                    shot.last_dir = 1
                                    shot.vx = -4
                                }
                            } else if (this.enemies[i].color === 'darkorchid') {
                                this.enemies[i].move_cooldown = Math.floor(random(200, 320))
                            } else if (this.enemies[i].color === 'white') {
                                this.enemies[i].segment = 0
                                this.enemies[i].move_cooldown = 60
                                this.enemies[i].shot_cooldown = 120
                            } else {
                                this.enemies[i].move_cooldown = 60
                                this.enemies[i].shot_cooldown = 120
                            }
                            shot.life = 240
                            this.enemies[i].shots.push(shot)
                        }
                    }
                }
                ///// DID ENEMY HIT PORTAL /////
                for (let j=0; j<this.portals.length; j++) {
                    if (this.portals[j] !== this.enemies[i].last_teleport) {
                        if (this.portals[j].checkCollideRec(this.enemies[i])) {
                            let new_color = this.portals[j].color
                            let new_enemy = new color_data[new_color].enemy(
                                this.portals[j].portal_pair.x_pos,
                                this.portals[j].portal_pair.y_pos,
                                color_data[new_color].width, color_data[new_color].height, new_color, this.player)
                            let shots = this.enemies[i].shots
                            new_enemy.shots = shots
                            new_enemy.last_teleport = this.portals[j].portal_pair
                            this.enemies.splice(i, 1)
                            this.enemies.push(new_enemy)
                        }
                    }
                }
            }
            ///// UPDATE ENEMY'S SHOTS /////
            for (let j=0; j<this.enemies[i].shots.length; j++) {
                this.enemies[i].shots[j].update()
                this.checkEnemyShot(this.enemies[i].shots[j], this.enemies[i], j)
            }
            if (this.enemies[i].dead && this.enemies[i].shots.length === 0) this.enemies.splice(i, 1)
        }
    }
    checkEnemyShot(shot, shooter, index) {
        ///// OFF WORLD /////
        if (shot.x_pos < 0 || shot.right() > this.width ||
            shot.y_pos < 0 || shot.bottom() >= this.platforms[0].y_pos) {
                shooter.shots.splice(index, 1)
        }
        ///// CHECK ON SWORD /////
        let sword_hit = checkCTX(shot, this.sword_cnv.width, this.sword_ctx_data, 0)
        if (sword_hit) {
            if (step_name == 'Bounce') {
                iterateStep()
            }
            let new_shot = new StarShot(
                shot.x_pos, shot.y_pos, sword_hit, this.player, 180)
            new_shot.vx = -shot.vx * 1
            new_shot.vy = -shot.vy * 1
            this.player.shots.push(new_shot)
            shooter.shots.splice(index, 1)
        } else {
            ///// SLOW SHOTS /////
            shot.vx *= 0.994
            shot.vy *= 0.994
            shot.speed *= 0.994
            shot.life -= 1
            ///// REMOVE EXPIRED OR INFLATE IF NEAR DEATH /////
            if (shot.life === 0) {
                shooter.shots.splice(index, 1)
            } else if (shot.life < 30) {
                shot.width += 4 / shot.life
                shot.height += 4 / shot.life
                shot.x_pos -= 2 / shot.life
                shot.y_pos -= 2 / shot.life
            }
            ///// CHECK HIT ON PURPLE PORTAL & ON STAR JUMPER /////
            if (shot) {
                checkPurpleShot(shot, index, this.platforms[0], this.portals, this.player, this.enemies)
                ///// IF YOU'RE NOT HURT /////
                if (this.player.hurt_count < 0 && this.player.health > 0) {
                    if (shot.checkCollideRec(this.player)) {
                        if (this.player.shield > 0) {
                            if (color_data[this.player.color].nemesis === shot.color) {
                                this.player.shield = 0
                            } else {
                                this.player.shield -= 1
                                this.player.display_shield_ct = 40
                            }
                        } else {
                            this.player.health -= 1
                            this.player.hurt_count = 120
                        }
                        if (shot.shooter.color === 'mediumblue') {
                            this.player.freeze_ct = 60
                        }
                        shooter.shots.splice(index, 1)
                    ///// CHECK BLUE TRAILS /////
                    } else if (shot.trail) {
                        for (let k = 0; k < shot.trail.length; k++) {
                            if (shot.trail[k].checkCollideRec(this.player)) {
                                this.player.freeze_ct = 60
                                if (this.player.shield > 0) {
                                    if (color_data[this.player.color].nemesis === shooter.o_color) {
                                        this.player.shield = 0
                                    } else {
                                        this.player.shield -= 1
                                        this.player.display_shield_ct = 40
                                    }
                                } else {
                                    this.player.health -= 1
                                    this.player.hurt_count = 120
                                }
                                shooter.shots.splice(index, 1)
                                break
                            }
                        }
                    }
                }
            }
        }
    }
    addEnemy(x_pos, y_pos, color) {
        let enemy = new color_data[color].enemy(
            x_pos, y_pos, color_data[color].width, color_data[color].height, color, this.player)
        this.enemies.push(enemy)
    }
    draw() {
        this.sword_ctx.clearRect(0, 0, this.sword_cnv.width, this.sword_cnv.height)
        this.world_ctx.clearRect(0, 0, this.world_cnv.width, this.world_cnv.height)

        this.world_ctx.fillStyle = "lightgrey"
        this.world_ctx.font = "bolder 18px Arial"
        this.world_ctx.fillText('Step: ', this.world_cnv.width - 70, 18)
        this.world_ctx.fillText(step_index + 1, this.world_cnv.width - 15, 18)

        ///// HEALTH /////
        this.world_ctx.lineWidth = 2
        this.world_ctx.font = "bold 14px Arial"
        let display_health = Math.min(this.player.health, this.player.base_health) * 9.8
        let display_base_health = this.player.base_health * 9.8
        ///// DRAW BARS AND BORDER /////
        this.world_ctx.fillStyle = 'rgba(255, 20, 147, 0.8)'
        this.world_ctx.fillRect(7, 7, display_health, 18)
        this.world_ctx.fillStyle = 'rgba(150, 150, 150, 0.8)'
        this.world_ctx.fillRect(7 + display_health, 7, display_base_health - display_health, 18)
        this.world_ctx.strokeStyle = 'rgba(150, 150, 150, 1)'
        this.world_ctx.rect(7, 7, display_base_health, 18)  //WHOLE RECT
        this.world_ctx.stroke()
        ///// HEALTH TEXT /////
        this.world_ctx.fillStyle = "black"
        this.world_ctx.fillText('Health', 12, 21)
        this.world_ctx.fillText(Math.round(this.player.health), 82, 21)

        ///// SHIELD /////
        let base_shield = color_data[this.player.color].shield
        for (let i = 0; i < base_shield; i++) {
            this.world_ctx.rect(7 + i * 98 / base_shield, 31, 98 / base_shield, 18)
            if (i >= this.player.shield) {
                this.world_ctx.fillStyle = 'rgba(150, 150, 150, 0.8)'
            } else {
                let rgb = this.player.rgb
                if (rgb.r < 20) {
                    rgb.r = 20
                } else if (rgb.r > 200) {
                    rgb.r = 255
                }
                if (rgb.g < 20) {
                    rgb.g = 20
                } else if (rgb.g > 200) {
                    rgb.g = 255
                }
                if (rgb.b < 20) {
                    rgb.b = 20
                } else if (rgb.b > 200) {
                    rgb.b = 255
                }
                this.world_ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
            }
            this.world_ctx.fillRect(7 + i * 98 / base_shield, 31, 98 / base_shield, 18)
        }

        ///// ENERGY /////
        let display_energy = this.player.energy * .98
        let display_base_energy = this.player.base_energy * .98
        ///// DRAW BARS AND BORDER /////
        this.world_ctx.fillStyle = 'rgba(20, 20, 255, 0.8)'
        this.world_ctx.fillRect(7, 55, display_energy, 18)
        this.world_ctx.fillStyle = 'rgba(150, 150, 150, 0.8)'
        this.world_ctx.fillRect(7 + display_energy, 55, display_base_energy - display_energy, 18)
        this.world_ctx.strokeStyle = 'rgba(150, 150, 150, 1)'
        this.world_ctx.rect(7, 55, display_base_energy, 18)  //WHOLE RECT
        this.world_ctx.stroke()
        ///// ENERGY TEXT /////
        let add_left = this.player.energy < 100 ? 8 : 0
        add_left += this.player.energy < 10 ? 8 : 0
        this.world_ctx.fillStyle = "black"
        this.world_ctx.fillText('Energy', 12, 69)
        this.world_ctx.fillText(Math.round(this.player.energy), 74 + add_left, 69)

        ///// FOR SOME REASON, PASTING THE SHIELD TEXT AFTER ENERGY WORKS TO GET TEXT ON TOP, NOT SURE WHY /////
        this.world_ctx.rect(7, 31, 98 / base_shield, 18)
        this.world_ctx.stroke()
        this.world_ctx.fillStyle = "black"
        this.world_ctx.fillText('Shield', 12, 45)
        this.world_ctx.fillText(Math.round(this.player.shield), 90, 45)

        ///// THE REST /////
        let grd = this.world_ctx.createLinearGradient(0, 0, this.ground.width, 0)
        grd.addColorStop("0", "#331900")
        grd.addColorStop(".1", "darkgreen")
        grd.addColorStop(".3", "green")
        grd.addColorStop(".5", "limegreen")
        grd.addColorStop(".7", "green")
        grd.addColorStop(".9", "darkgreen")
        grd.addColorStop("1", "#331900")
        this.world_ctx.fillStyle = grd
        this.world_ctx.fillRect(0, this.ground.y_pos, this.ground.width, this.ground.height)

        for (let i = 1; i < this.platforms.length; i++) {
            this.platforms[i].draw(this.world_ctx)
        }

        for (let i = 0; i < this.enemies.length; i++) {
            if (!this.enemies[i].dead) {
                if (this.enemies[i].freeze_ct > 0) {
                    this.enemies[i].draw(this.world_ctx)
                } else if (this.enemies[i].stun_ct > 0) {
                    this.enemies[i].color = this.enemies[i].o_color
                    if (this.enemies[i].stun_ct % 2 === 0) this.enemies[i].draw(this.world_ctx)
                } else {
                    this.enemies[i].draw(this.world_ctx)
                }
            }
            for (let j = 0; j < this.enemies[i].shots.length; j++) {
                this.enemies[i].shots[j].draw(this.world_ctx)
                if (this.enemies[i].shots[j].trail) {
                    for (let k = 0; k < this.enemies[i].shots[j].trail.length; k++) {
                        this.enemies[i].shots[j].trail[k].draw(this.world_ctx)
                    }
                }
            }
        }

        for (let i = 0; i < this.portals.length; i++) {
            if (this.portals[i].vib_count > 0) {
                if (this.portals[i].vib_count % 4 < 2) {
                    this.portals[i].rad += 2
                    this.portals[i].draw(this.world_ctx)
                    this.portals[i].rad -= 2
                } else {
                    this.portals[i].draw(this.world_ctx)
                }
            } else {
                this.portals[i].draw(this.world_ctx)
            }
        }

        for (let i=0; i<this.eyes.length; i++) {
            this.eyes[i].draw(this.world_ctx, this.eye_hurt_count)
            for (let j=0; j<this.eyes[i].shots.length; j++) {
                this.eyes[i].shots[j].draw(this.world_ctx)
                if (this.eyes[i].shots[j].trail) {
                    for (let k = 0; k < this.eyes[i].shots[j].trail.length; k++) {
                        this.eyes[i].shots[j].trail[k].draw(this.world_ctx)
                    }
                }
            }
        }

        this.player.draw(this.world_ctx, this.sword_ctx, this.ground.y_pos)
        this.health_star.draw(this.world_ctx)
    }
}
