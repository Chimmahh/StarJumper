
class World {
    constructor(world_cnv, sword_cnv) {
        this.play = true
        this.play_mode = 'multi'
        this.difficulty = 5
        this.world_cnv = world_cnv
        this.sword_cnv = sword_cnv
        this.world_ctx = world_cnv.getContext('2d')
        this.sword_ctx = sword_cnv.getContext('2d')
        this.sword_ctx_data = []
        this.cnv_rect = sword_cnv.getBoundingClientRect()
        this.width = sword_cnv.width * 2
        this.height = sword_cnv.height
        this.star_size = 3
        this.ground_height = 20
        this.dv = 0.03
        this.total_velocity = 0
        this.max_velocity = 40
        this.colors = ['red', 'orange', 'yellow', 'limegreen', 'mediumblue', 'darkorchid', 'white']
        this.portals = []
        this.platforms = []
        this.enemies = []
        this.pvp_data = {}
        this.host_update = false
        this.trans_x = 0
        this.ground = new Rectangle(0, this.height - this.ground_height, this.width, this.ground_height, 'green')
        this.platforms.push(this.ground)
        this.player = new StarJumper(sword_cnv.width/2 - 20, sword_cnv.height-this.ground_height - 40, 'red')

        ///// LEFT CLICK - SHOOT STAR ///////
        document.body.onclick = (e) => {
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
                if (this.play_mode === 'multi') SendShot(shot)
                this.player.shots.push(shot)
            }
        }
        ///// RIGHT CLICK - SWORD SWIPE ///////
        document.body.oncontextmenu = (e) => {
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

    host_contructor(portals=false, stars=false, health=false) {
        ///// STARS /////
        if (stars) {
            for (let i=0; i<stars.length; i++) {
                let star = new Rectangle(stars[i].x_pos, stars[i].y_pos, this.star_size, this.star_size, 'white')
                this.platforms.push(star)
            }
            ////// PORTALS ///////
            for (let i=0; i<this.colors.length; i++) {
                let p1 = new Portal(portals[i].x_pos, portals[i].y_pos, 5, this.colors[i],
                    portals[i].vx, portals[i].vy)
                let p2 = new Portal(portals[i+1].x_pos, portals[i+1].y_pos, 5, this.colors[i],
                    portals[i+1].vx, portals[i+1].vy)
                p1.portal_pair = p2
                p2.portal_pair = p1
                this.portals.push(p1)
                this.portals.push(p2)
            }
            ////// HEALTH STAR ///////
            this.health_star = new HealthStar(health.x_pos, health.y_pos, this.star_size, this.star_size, 'deeppink')
            this.health_star.vx = health.vx
            this.health_star.vy = health.vy
        } else {
            let x, y
            for (let i=0; i<50; i++) {
                x = random(10, this.width-10)
                y = random(10, this.height-this.ground_height-100)
                let star = new Rectangle(x, y, this.star_size, this.star_size, 'white')
                this.platforms.push(star)
            }
            ////// PORTALS ///////
            for (let i=0; i<this.colors.length; i++) {
                let radius = 10 + Math.random() * 10;           // PORTALS
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
            this.health_star = new HealthStar(x, y, this.star_size, this.star_size, 'deeppink')
            this.health_star.vx = 1
            this.health_star.vy = 1
        }
    }

    update() {
        if (this.player.health === 0) this.play = false
        if (this.player.host) {
            if (this.portals.length === 0) this.host_contructor()
        } else if (this.host_update) {
            if (this.portals.length === 0) {
                this.host_contructor(this.host_update.portals, this.host_update.stars, this.host_update.health)
            } else {
                for (let i=0; i<this.host_update.portals.length; i++) {
                    this.portals[i].x_pos = this.host_update.portals[i].x_pos
                    this.portals[i].y_pos = this.host_update.portals[i].y_pos
                    this.portals[i].vx = this.host_update.portals[i].vx
                    this.portals[i].vy = this.host_update.portals[i].vy
                }
                this.health_star.x_pos = this.host_update.health.x_pos
                this.health_star.y_pos = this.host_update.health.y_pos
                this.health_star.vx = this.host_update.health.vx
                this.health_star.vy = this.host_update.health.vy
            }
            this.host_update = false
        }
        if (this.portals.length > 0) {
            restart += 1
            this.trans_x = this.getTransX()
            let pix_data = this.sword_ctx.getImageData(0, 0, this.sword_cnv.width, this.height)
            this.sword_ctx_data = pix_data.data
            let total_velocity = 0
            for (let i=0; i<this.portals.length; i++) {
                total_velocity += Math.abs(this.portals[i].vx) + Math.abs(this.portals[i].vy)
                ///// MOVE PORTAL, SIZE ACCORDING TO PORTAL PAIR /////
                let portal_pair_position = Math.abs(this.portals[i].portal_pair.x_pos - this.health_star.x_pos) / this.width
                if (portal_pair_position > 0) this.portals[i].update(portal_pair_position)
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
            ///// BOUNCE HEALTH STAR //////
            this.health_star.x_pos += this.health_star.vx
            this.health_star.y_pos += this.health_star.vy
            let is_ob_right = this.health_star.x_pos + this.health_star.width > this.width
            let is_ob_left = this.health_star.x_pos < 0
            // if (is_ob_left) this.health_star.x_pos = this.width - this.health_star.width
            // if (is_ob_right) this.health_star.x_pos = 0
            if (is_ob_right || is_ob_left) this.health_star.vx *= -1
            let is_ob_top = this.health_star.y_pos > this.height - this.ground.height - this.star_size
            let is_ob_bottom = this.health_star.y_pos < 0
            if (is_ob_top || is_ob_bottom) this.health_star.vy *= -1
            //// UPDATE OTHER PLAYERS /////
            for (let enemy in this.pvp_data) {
                this.pvp_data[enemy].update(this.portals, this.platforms, this.enemies, this.width, this.height, this.health_star)
            }
            //// UPDATE STAR JUMPER /////
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

    starXYs() {
        let stars = []
        for (let i=1; i<this.platforms.length; i++) {
            stars.push(this.platforms[i].dictXY())
        }
        return stars
    }

    portalXYVs() {
        let portals = []
        for (let i=0; i<this.portals.length; i++) {
            portals.push(this.portals[i].dictXYV())
        }
        return portals
    }

    addEnemy(color) {
        let y = random(50, this.height - this.ground_height - 50)
        let x = random(300, this.width - 300)
        while (Math.abs(this.player.cx() - x) < 200) {
            x = random(300, this.width - 300)
        }
        let enemy = new color_data[color].enemy(
            x, y, color_data[color].width, color_data[color].height, color, this.player)
        this.enemies.push(enemy)
    }

    draw() {
        if (this.portals.length) {
            this.world_ctx.clearRect(0, 0, this.world_cnv.width, this.world_cnv.height)
            this.sword_ctx.clearRect(0, 0, this.sword_cnv.width, this.sword_cnv.height)

            this.world_ctx.fillStyle = "white"
            this.world_ctx.font = "bolder 24px Arial"
            let display_enemies = this.enemies.length < 10 ? "0" + this.enemies.length : this.enemies.length
            this.world_ctx.fillText('Enemies: ', this.world_cnv.width - 143, 24)
            this.world_ctx.fillText(display_enemies, this.world_cnv.width - 32, 24)
            let display_stars = this.player.star_count < 10 ? "0" + this.player.star_count : this.player.star_count
            this.world_ctx.fillText('Stars: ', this.world_cnv.width - 104, 48)
            this.world_ctx.fillText(display_stars, this.world_cnv.width - 32, 48)
            let display_score = this.player.score < 10 ? "0" + this.player.score : this.player.score
            let add_left = this.player.score > 99 ? -14 : 0
            this.world_ctx.fillText('Score: ', this.world_cnv.width - 111 + add_left, 72)
            this.world_ctx.fillText(display_score, this.world_cnv.width - 32 + add_left, 72)

            let status_bar_left = this.world_cnv.width * 0.25
            let status_bar_width = this.world_cnv.width * 0.5
            let player_position_in_world = this.player.cx() / this.width
            let pp = status_bar_width * player_position_in_world + status_bar_left
            let health_star_position_in_world = (this.health_star.x_pos - 35) / this.width
            let hp = status_bar_width * health_star_position_in_world + status_bar_left

            ///// HEALTH /////
            this.world_ctx.lineWidth = 2
            this.world_ctx.font = "bold 14px Arial"
            let display_health = Math.min(this.player.health, 10) * 9.8
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

            ///// MINI-MAP ////
            this.world_ctx.lineWidth = 2
            this.world_ctx.beginPath()
            this.world_ctx.moveTo(status_bar_left, 15)
            this.world_ctx.lineTo(status_bar_left + status_bar_width, 15)
            this.world_ctx.strokeStyle = 'white'
            this.world_ctx.stroke()

            ///// MINI-MAP HEALTH STAR HEART ///// -- ADAPTED FROM: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes
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

            ///// MAP SHIFT, DRAW PART OF ON CANVAS /////
            this.world_cnv.style.backgroundPositionX = this.trans_x + 'px'
            this.sword_cnv.style.backgroundPositionX = this.trans_x + 'px'
            this.world_ctx.translate(this.trans_x, 0)
            this.sword_ctx.translate(this.trans_x, 0)

            let grd = this.world_ctx.createLinearGradient(0, 0, this.ground.width, this.ground.height)
            grd.addColorStop("0", "#331900")
            grd.addColorStop(".1", "darkgreen")
            grd.addColorStop(".3", this.ground.color)
            grd.addColorStop(".5", "limegreen")
            grd.addColorStop(".7", this.ground.color)
            grd.addColorStop(".9", "darkgreen")
            grd.addColorStop("1", "#331900")
            this.world_ctx.fillStyle = grd
            this.world_ctx.fillRect(0, this.ground.y_pos, this.width, this.height)

            for (let i = 1; i < this.platforms.length; i++) {
                this.platforms[i].draw(this.world_ctx)
            }

            for (let enemy in this.pvp_data) {
                this.pvp_data[enemy].draw(this.world_ctx, this.sword_ctx, this.ground.y_pos)
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
            this.player.draw(this.world_ctx, this.sword_ctx, this.ground.y_pos)
            this.health_star.draw(this.world_ctx)

            this.world_ctx.resetTransform()
            this.sword_ctx.resetTransform()
        }
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
