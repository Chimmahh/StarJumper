
class World {
    constructor(world_cnv, sword_cnv) {
        this.play = true
        this.play_mode = 'single'
        this.difficulty = 5
        this.world_cnv = world_cnv
        this.sword_cnv = sword_cnv
        this.world_ctx = world_cnv.getContext('2d')
        this.world_ctx.imageSmoothingEnabled = false
        this.sword_ctx = sword_cnv.getContext('2d')
        this.sword_ctx_data = []
        this.cnv_rect = sword_cnv.getBoundingClientRect()
        let width_multi = level > 4 ? level/4 : 1
        this.width = sword_cnv.width * width_multi
        this.height = sword_cnv.height
        this.star_size = 3
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
        this.trans_x = 0

        this.ground = new Rectangle(0, this.height - this.ground_height, this.width, this.ground_height, 'green')
        this.platforms.push(this.ground)
        this.player = new StarJumper(sword_cnv.width/2 - 20, sword_cnv.height-this.ground_height - 40, 'white')

        ///// STARS /////
        let x, y
        for (let i=0; i<level*8; i++) {
            x = random(10, this.width-10)
            y = random(10, this.height-this.ground_height-100)
            let star = new Rectangle(x, y, this.star_size, this.star_size, 'white')
            this.platforms.push(star)
        }
        ////// PORTALS ///////
        for (let i=0; i<Math.min(level-1, 7); i++) {
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
        if (level >= 8) {
            y = random(0, this.height * 0.8)
            x = random(100, this.width - 100)
            this.health_star = new HealthStar(x, y, this.star_size, this.star_size, 'deeppink')
            this.eyes.push(new Eye(this.width / 2 - 40, 100, 'deeppink'))
            this.eyes.push(new Eye(this.width / 2 + 40, 100, 'deeppink'))
        } else {
            this.eyes.push(new Eye(this.width / 2 - 40, 100, this.colors[level-1]))
            this.eyes.push(new Eye(this.width / 2 + 40, 100, this.colors[level-1]))
        }
        ///// LEFT CLICK - SHOOT STAR ///////
        document.onclick = (e) => {
            let got_energy = this.player.energy >= color_data[this.player.color].shot_cost
            if (this.player.flip_count <= 0 && got_energy && restart > 10) {
                this.player.energy -= color_data[this.player.color].shot_cost
                ///// WHERE'D PLAYER CLICK /////
                let clicked_x = e.clientX - this.trans_x - this.cnv_rect.left
                let clicked_y = e.clientY - this.cnv_rect.top
                ///// CREATE SHOT BASE /////
                let shot = new color_data[this.player.color].shot(this.player.cx(), this.player.cy(), this.player.color, this.player)
                ///// SHOT SPEEDS DETERMINED IN CONSTRUCTOR, USE NOW TO GET VX & VY /////
                let shot_vel = getShotVelocities(clicked_x, clicked_y, this.player.cx(), this.player.cy(), shot.speed)
                shot.vx = shot_vel.vx
                shot.vy = shot_vel.vy
                ///// SPECIAL CASE - RED & ORANGE /////
                if (this.player.color === 'red') {
                    shot = addRedTarget(clicked_x, clicked_y, shot, this.player, this.enemies)
                    if (this.enemies.length === 0) {
                        let add_back_cost = color_data['red'].shot_cost - color_data['white'].shot_cost
                        this.player.energy += add_back_cost
                    }
                } else if (this.player.color === 'orange') {
                    addOrangeBuck(shot)
                }
                this.player.shots.push(shot)
            }
        }
        ///// RIGHT CLICK - SWORD SWIPE ///////
        document.oncontextmenu = (e) => {
            if (this.player.flip_count <= 0 && !this.player.staa_ridin) {
                let ground_boost = Math.max(6 - (this.ground.y_pos - this.player.y_pos) / this.player.height * 2, 0)
                let result = this.player.getFlipAttack(
                    e.clientX - this.cnv_rect.left - this.trans_x, e.clientY - this.cnv_rect.top, ground_boost)
                if (result) {
                    this.player.sword_trail.push([])
                    this.player.sword_tip.x_pos = this.player.cx()
                    this.player.sword_tip.y_pos = this.player.cy()
                }
            }
            return false
        }
    }
    update() {
        if (this.player.health === 0) this.play = false
        if (this.player.victory) {
            level += 1
            this.player.victory = false
            this.play = false
            widenWorld()
        } else {
            restart += 1
            this.trans_x = this.getTransX()
            let pix_data = this.sword_ctx.getImageData(0, 0, this.sword_cnv.width, this.height)
            this.sword_ctx_data = pix_data.data
            let total_velocity = 0
            if (level >= 8) {
                ///// BOUNCE HEALTH STAR //////
                this.health_star.x_pos += this.health_star.vx
                this.health_star.y_pos += this.health_star.vy
                let is_ob_right = this.health_star.x_pos + this.health_star.width > this.width
                let is_ob_left = this.health_star.x_pos < 0
                if (is_ob_right || is_ob_left) this.health_star.vx *= -1
                let is_ob_top = this.health_star.y_pos > this.height - this.ground.height - this.star_size
                let is_ob_bottom = this.health_star.y_pos < 0
                if (is_ob_top || is_ob_bottom) this.health_star.vy *= -1
            }
            for (let i=0; i<this.portals.length; i++) {
                total_velocity += Math.abs(this.portals[i].vx) + Math.abs(this.portals[i].vy)
                ///// MOVE PORTAL, SIZE ACCORDING TO PORTAL PAIR /////
                if (level >= 8) {
                    let portal_pair_position = Math.abs(this.portals[i].portal_pair.x_pos - this.health_star.x_pos) / this.width
                    if (portal_pair_position > 0) this.portals[i].update(portal_pair_position)
                } else {
                    this.portals[i].update(.5)
                }
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
                if (level >= 8) {
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
                }
                ///// REDUCE VIBRATION COUNT //////
                this.portals[i].vib_count -= 1
            }
            this.total_velocity = total_velocity
            this.updateEnemies()
            this.player.update(this.portals, this.platforms, this.enemies, this.width, this.height, this.health_star, true)
            ///// CHECK IF NORMAL STARS ARE INSIDE SWORD TRAIL /////
            for (let i=1; i<this.platforms.length; i++) {
                if (this.platforms[i].x_pos + this.trans_x < this.world_cnv.width && this.platforms[i].x_pos + this.trans_x > 0) {
                    let sword_hit = checkCTX(this.platforms[i], this.sword_cnv.width, this.sword_ctx_data, this.trans_x)
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
            let attack = this.eyes[i].update(this.ground, this.eye_hurt_count, this.enemies.length)
            if (attack) {
                let eye_color
                if (level >= 8) {
                    eye_color = world.colors[Math.floor(Math.random()*7)]
                } else (
                    eye_color = world.colors[level - 1]
                )
                if (this.eyes[i].blink_dir === 'width') {
                    this.addEnemy(this.eyes[i].x_pos, this.eyes[i].y_pos, eye_color)
                } else {
                    let shot = new color_data[eye_color].shot(
                        this.eyes[i].x_pos, this.eyes[i].y_pos, eye_color, this.eyes[i])
                    let shot_vel = getShotVelocities(this.player.cx(), this.player.cy(),
                        this.eyes[i].x_pos, this.eyes[i].y_pos, shot.speed)
                    shot.vx = shot_vel.vx
                    shot.vy = shot_vel.vy
                    if (eye_color === 'red') {
                        shot = addRedTarget(this.eyes[i].x_pos, this.eyes[i].y_pos, shot, this.player, this.enemies)
                    } else if (eye_color === 'orange') {
                        addOrangeBuck(shot)
                    }
                    shot.life = 240
                    this.eyes[i].shots.push(shot)
                }
            }
            ///// DID EYE HIT SWORD /////
            if (this.eyes[i].life > 0 && this.eye_hurt_count < 0) {
                let sword_hit = checkCTX(this.eyes[i], this.sword_cnv.width, this.sword_ctx_data, this.trans_x, true)
                if (sword_hit) {
                    this.eyes[i].life -= 1
                    if (this.eyes[0].life + this.eyes[1].life === 0) this.player.victory = true
                    this.eyes[i].height -= 3
                    this.eyes[i].o_height -= 3
                    this.eye_hurt_count = 90
                    this.eyes[i].o_height
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
                            let sword_hit = checkCTX(this.enemies[i].shadows[j], this.sword_cnv.width, this.sword_ctx_data, this.trans_x)
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
                let sword_hit = checkCTX(this.enemies[i], this.sword_cnv.width, this.sword_ctx_data, this.trans_x)
                if (sword_hit) {
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
        let sword_hit = checkCTX(shot, this.sword_cnv.width, this.sword_ctx_data, this.trans_x)
        if (sword_hit) {
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
        let add_left = score > 99 ? -20 : score > 9 ? -10 : 0;

        this.world_ctx.fillText('Level: ', this.world_cnv.width - 70 + add_left, 18)
        this.world_ctx.fillText(level, this.world_cnv.width - 15 + add_left, 18)

        this.world_ctx.fillText('Score: ', this.world_cnv.width - 74 + add_left, 36)
        this.world_ctx.fillText(score, this.world_cnv.width - 15 + add_left, 36)

        // let display_stars = this.player.star_count < 10 ? "0" + this.player.star_count : this.player.star_count
        // this.world_ctx.fillText('Stars: ', this.world_cnv.width - 79, 54)
        // this.world_ctx.fillText(display_stars, this.world_cnv.width - 24, 54)

        let status_bar_left = this.world_cnv.width * 0.25
        let status_bar_width = this.world_cnv.width * 0.5
        let player_position_in_world = this.player.cx() / this.width
        let pp = status_bar_width * player_position_in_world + status_bar_left
        let health_star_position_in_world, hp
        if (level >= 8 ) {
            health_star_position_in_world = (this.health_star.x_pos - 35) / this.width
            hp = status_bar_width * health_star_position_in_world + status_bar_left
        }
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
        add_left = this.player.health < 8 ? 8 : 0
        this.world_ctx.fillStyle = "black"
        this.world_ctx.fillText('Health', 12, 21)
        this.world_ctx.fillText(Math.round(this.player.health), 82 + add_left, 21)

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
        add_left = this.player.energy < 100 ? 8 : 0
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

        if (level > 4) {
            ///// MINI-MAP ////
            this.world_ctx.lineWidth = 2
            this.world_ctx.beginPath()
            this.world_ctx.moveTo(status_bar_left, 15)
            this.world_ctx.lineTo(status_bar_left + status_bar_width, 15)
            this.world_ctx.strokeStyle = 'white'
            this.world_ctx.stroke()

            ///// MINI-MAP HEALTH STAR HEART ///// -- ADAPTED FROM: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes
            if (level >= 8) {
                let dy = 8
                this.world_ctx.beginPath()
                this.world_ctx.moveTo(9.2 + hp, 2.5 + dy)
                this.world_ctx.bezierCurveTo(9.2 + hp, 2 + dy, 8.3 + hp, 0 + dy, 5 + hp, 0 + dy)
                this.world_ctx.bezierCurveTo(0 + hp, 0 + dy, 0 + hp, 6.3 + dy, 0 + hp, 6.3 + dy)
                this.world_ctx.bezierCurveTo(0 + hp, 9.2 + dy, 3.3 + hp, 12.8 + dy, 9.2 + hp, 15.8 + dy)
                this.world_ctx.bezierCurveTo(15 + hp, 12.8 + dy, 18.3 + hp, 9.2 + dy, 18.3 + hp, 6.3 + dy)
                this.world_ctx.bezierCurveTo(18.3 + hp, 6.3 + dy, 18.3 + hp, 0 + dy, 13.3 + hp, 0 + dy)
                this.world_ctx.bezierCurveTo(10.8 + hp, 0 + dy, 9.2 + hp, 2 + dy, 9.2 + hp, 2.5 + dy)
                this.world_ctx.fillStyle = this.health_star.color
                this.world_ctx.fill()
            }

            ///// MINI-MAP PLAYER ///// -- ADAPTED FROM: http://jsfiddle.net/m1erickson/8j6kdf4o/
            let rot = Math.PI / 2 * 3
            let outer_rad = 12
            let inner_rad = 6
            let step = Math.PI / 5
            let x, y
            this.world_ctx.beginPath()
            this.world_ctx.moveTo(pp, 15 - outer_rad)
            for (let i = 0; i < 5; i++) {
                x = pp + Math.cos(rot) * outer_rad
                y = 15 + Math.sin(rot) * outer_rad
                this.world_ctx.lineTo(x, y)
                rot += step
                x = pp + Math.cos(rot) * inner_rad
                y = 15 + Math.sin(rot) * inner_rad
                this.world_ctx.lineTo(x, y)
                rot += step
            }
            this.world_ctx.lineTo(pp, 15 - outer_rad)
            this.world_ctx.fillStyle = this.player.color
            this.world_ctx.fill()

            ///// MINI-MAP ENEMIES /////
            let enemy_position_in_world, ep
            for (let i = 0; i < this.enemies.length; i++) {
                if (!this.enemies[i].dead) {
                    enemy_position_in_world = this.enemies[i].cx() / this.width
                    ep = status_bar_width * enemy_position_in_world + status_bar_left
                    this.world_ctx.beginPath()
                    this.world_ctx.moveTo(ep - 5, 20)
                    this.world_ctx.lineTo(ep + 5, 20)
                    this.world_ctx.lineTo(ep, 10)
                    this.world_ctx.fillStyle = this.enemies[i].o_color
                    this.world_ctx.fill()
                }
            }
        }

        ///// MAP SHIFT, DRAW PART OF ON CANVAS /////
        this.world_cnv.style.backgroundPositionX = this.trans_x + 'px'
        this.sword_cnv.style.backgroundPositionX = this.trans_x + 'px'
        this.world_ctx.translate(this.trans_x, 0)
        this.sword_ctx.translate(this.trans_x, 0)

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
            if (this.enemies[i].shadows) {
                for (let j = 0; j < this.enemies[i].shadows.length; j++) {
                    this.enemies[i].shadows[j].draw(this.world_ctx)
                    this.enemies[i].shadows[j].life -= 1
                    if (this.enemies[i].shadows[j].life === 0) this.enemies[i].shadows.splice(j, 1)
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
        if (level >= 8) this.health_star.draw(this.world_ctx)

        this.world_ctx.resetTransform()
        this.sword_ctx.resetTransform()
    }

    getTransX() {
        // trans_x is how far left to shift to get the right part of the world into view
        let trans_x = -this.player.x_pos + this.world_cnv.width/2
        // if the adjustment would go past the end of the world...
        if (trans_x > 0) {
            return  0
        } else if (trans_x < -this.width + this.world_cnv.width) {
            return -this.width + this.world_cnv.width
        }
        return Math.round(trans_x)
    }
}
