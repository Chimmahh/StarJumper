
class StarJumper extends Rectangle {
    constructor(x, y, color, key_tracker) {
        super(x, y, 20, 40, color);
        this.host = false
        this.key_tracker = key_tracker
        this.vy = 0
        this.vx = 0
        this.mx = color_data[color].mx
        this.star_count = 50
        this.star_cooldown = 0
        this.on_platform = true
        this.staa_ridin = false
        this.hurt_count = 0
        this.last_teleport = {}
        this.display_shield_ct = 0
        this.score = 0
        this.base_health = 10
        this.health = 10
        this.shield = 2
        this.base_energy = 100
        this.energy = 100
        this.shots = []
        this.sword_tip = {x:0, y:0}
        this.sword_trail = []
        this.flip_duration = 60
        this.flip_count = 0
        this.flip_rotation = ''
        this.flip_type = ''
        this.facing = 1 // right
    }

    update(portals, platforms, world_width, world_height, cnv_width, trans_x, sword_ctx_data, health_star) {
        ///// SEE IF PORTAL HITS PLAYER, EXCEPT LAST PORTAL EXITED //////
        for (let i=0; i<portals.length; i++) {
            if (portals[i] !== this.last_teleport) {
                let hit_player = portals[i].checkCollideRec(this)
                if (hit_player) {
                    if (this.flip_count > 0) this.sword_trail.push([])
                    this.vy = 0
                    let new_color = portals[i].color
                    this.color = new_color
                    this.shield = color_data[new_color].shield
                    this.mx = color_data[new_color].mx
                    this.rgb = new RGBColor(new_color)
                    this.last_teleport = portals[i].portal_pair
                    this.display_shield_ct = 60
                    this.x = portals[i].portal_pair.x
                    this.y = portals[i].portal_pair.y
                }
            }
        }
        ///// JUMP IF ON PLATFORM ////////
        if (this.key_tracker.isKeyDown('ArrowUp') || this.key_tracker.isKeyDown('W')
            || this.key_tracker.isKeyDown('w') && this.on_platform) {
                this.vy = -7
                this.staa_ridin = false
        }
        ///// DEFAULT ASSUMPTIONS, RESET, INCREMENT, ETC //////
        this.on_platform = false
        this.star_cooldown -= 1
        this.display_shield_ct -= 1
        this.hurt_count -= 1
        let rubbing = false
        if (this.energy < this.base_energy) this.energy += 0.25
        ///// GO RIGHT OR LEFT /////
        if (!this.staa_ridin) {
            if (this.key_tracker.isKeyDown('ArrowLeft') || this.key_tracker.isKeyDown('a') || this.key_tracker.isKeyDown(('A'))) {
                if (this.flip_count <= 0) {
                    this.facing = -1 // left
                    ///// CHECK LEFT BUMP /////
                    for (let i = 0; i < platforms.length; i++) {
                        if (this.rubLeft(platforms[i])) {
                            rubbing = true
                            break
                        }
                    }
                }
                if (!rubbing) this.x -= this.mx
                if (this.x < 0) this.x = 0                                                      // TOO FAR LEFT
            } else if (this.key_tracker.isKeyDown('ArrowRight') || this.key_tracker.isKeyDown('d') || this.key_tracker.isKeyDown('D')) {
                    if (this.flip_count <= 0) {
                        this.facing = 1 // right
                        ///// CHECK RIGHT BUMP /////
                        for (let i = 0; i < platforms.length; i++) {
                            if (this.rubRight(platforms[i])) {
                                rubbing = true
                                break
                            }
                        }
                    }
                    if (!rubbing) this.x += this.mx
                    if (this.x + this.width > world_width) this.x = world_width - this.width        // TOO FAR RIGHT
            }
        }
        ///// CHECK IF NORMAL STARS ARE INSIDE SWORD TRAIL /////
        for (let i=1; i<platforms.length; i++) {
            if (platforms[i].x + trans_x < cnv_width && platforms[i].x + trans_x > 0) {
                let sword_hit = checkCTX(platforms[i], cnv_width, sword_ctx_data)
                if (sword_hit) {
                    platforms.splice(i, 1)
                    this.star_count += 1
                }
            }
        }
        ///// IF RIDING ON HEALTH STAR /////
        if (this.staa_ridin) {
            this.on_platform = true
            this.x = health_star.x - (this.width - health_star.width) / 2
            this.y = health_star.y - this.height
            ///// PICK UP HEALTH STAR  /////
            if (this.key_tracker.isKeyDown('ArrowDown') || this.key_tracker.isKeyDown('s') || this.key_tracker.isKeyDown(' ')) {
                this.staa_ridin = false
                this.on_platform = false
                this.star_cooldown = 10
                if (this.health < 10) this.health += 1
                health_star.x = random(0, this.width - this.star_size)
                health_star.y = random(0, this.height - this.star_size - this.ground_height)
                health_star.setRandomVelocities()
            }
        ///// IF YOU LAND ON THE HEALTH STAR /////
        } else if (this.landed(health_star) && !this.staa_ridin) {
            this.on_platform = true
            this.staa_ridin = true
            this.flip_count = 0
        ///// IF YOU ARE FLIPPING, UP OR DOWN /////
        } else if (this.flip_count > 0) {
            if (this.flip_type === 'up') {
                this.vy -= 0.06
            } else {
                this.vy += 0.5
            }
            this.y += this.vy
            if (this.y + this.height + platforms[0].height >= world_height) {
                this.y = world_height - this.height - platforms[0].height
                this.flip_count = 0
            } else {
                this.flip_count -= 1
            }
        ///// OTHERWISE CHECK NORMAL HITS /////
        } else {
            for (let i=0; i<platforms.length; i++) {
                ///// LANDED ON STAR OR GROUND /////
                if (this.landed(platforms[i])) {
                    this.y = platforms[i].top() - this.height
                    this.vy = 0
                    this.on_platform = true
                    ///// DOWN KEY = PICK UP STAR /////
                    if ((this.key_tracker.isKeyDown('ArrowDown') || this.key_tracker.isKeyDown('s'))
                        && i > 0 && this.star_cooldown < 0) {
                            this.star_cooldown = 10
                            this.grabStar()
                            platforms.splice(i, 1)
                    }
                    break
                ///// CHECK HEAD BUMP /////
                } else if (this.hitHead(platforms[i]) && this.vy < 0 && i > 0 && this.flip_count <= 0) {
                    this.y = platforms[i].bottom() + 0.001
                    this.vy = -0.015
                    break
                }
            }
        }
        ///// UPDATE STAR SHOTS /////
        for (let i=0; i<this.shots.length; i++) {
            ///// UPDATE & BOUNCE SHOTS IN PLAY /////
            if (this.shots[i].ground_timer === 0) {
                ///// REMOVE EXPIRED STAR SHOTS
                if (this.shots[i].life === 0) {
                    this.shots.splice(i, 1)
                } else {
                    this.shots[i].update()
                    if (this.shots[i].life < 30) {
                        this.shots[i].width += 4 / this.shots[i].life
                        this.shots[i].height += 4 / this.shots[i].life
                        this.shots[i].x -= 2 / this.shots[i].life
                        this.shots[i].y -= 2 / this.shots[i].life
                    }
                    ///// SLOW SHOTS IN PLAY /////
                    this.shots[i].life -= 1
                    this.shots[i].vx *= 0.994
                    this.shots[i].vy *= 0.994
                    this.shots[i].speed *= 0.994
                    if (this.shots[i]) this.checkPurpleShot(, this.player.shots[i], i)
                }
            ///// REMOVE INFLATED SHOTS THAT HAVE REACHED 1 /////
            } else if (this.player.shots[i].ground_timer === 1) {
                this.player.shots.splice(i, 1)
            ///// INFLATE STARS THAT HAVE HIT GROUND /////
            } else {
                this.player.shots[i].ground_timer -= 1
                this.player.shots[i].height += 0.6
                this.player.shots[i].width += 0.6
                this.player.shots[i].y = this.height - this.ground_height - this.player.shots[i].height
                this.player.shots[i].x -= 0.3
            }
        }
        ///// MID AIR SCENARIOS - NOT ON A PLATFORM OR HEALTH STAR, NOT FLIPPING /////
        if (!this.player.on_platform && !this.player.staa_ridin && this.player.flip_count <= 0) {
            this.player.vy += 0.25
            this.player.y += this.player.vy
            ///// CHECK GROUND BOUNCE /////
            if (this.player.y + this.player.height + this.ground.height >= this.height) {
                this.player.y = this.height - this.player.height - this.ground.height
            }
            ///// HIT DOWN KEY, S, OR SPACE TO ADD STAR UNDER STAR JUMPER /////
            if ((this.player.key_tracker.isKeyDown(' ') || this.player.key_tracker.isKeyDown('s'))
                && this.player.star_count > 0 && this.player.star_cooldown < 0) {
                    let new_star_x = this.player.x + (this.player.width - this.star_size) / 2
                    let new_star_y = this.player.y + this.player.height
                    let star = new Rectangle(new_star_x, new_star_y, this.star_size, this.star_size, 'white')
                    this.platforms.push(star)
                    this.player.vy = 0
                    this.player.star_cooldown = 10
                    this.player.star_count -= 1
            }
        }
    }

    draw(world_ctx, sword_ctx, ground_y) {
        let draw_me = true
        if (this.hurt_count > 60 && this.hurt_count % 3 !== 0) {
            draw_me = false
        } else if (this.hurt_count > 0 && this.hurt_count % 2 === 0) {
            draw_me = false
        }
        if (draw_me) {
            world_ctx.save();
            let grd = world_ctx.createLinearGradient(0, 0, this.width * this.facing, -this.height / 4)
            grd.addColorStop(0, this.color)
            grd.addColorStop(1, "white")
            world_ctx.fillStyle = grd
            world_ctx.translate(this.x + this.width / 2, this.y + this.height / 2)
            if (this.flip_count < 31) {
                if (this.flip_rotation === 'clockwise') {
                    world_ctx.rotate(-Math.PI * this.flip_count / 15)
                } else {
                    world_ctx.rotate(Math.PI * this.flip_count / 15)
                }
            }
            world_ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
            world_ctx.restore()
        }
        if (this.hurt_count > 0 || this.display_shield_ct > 0 || this.shield === 0) {
            world_ctx.font = 'bold 32px Arial'
            world_ctx.fillStyle = this.color
            world_ctx.fillText('🛡', this.x - 6, this.y - 7)
            world_ctx.font = 'bold 18px Arial'
            world_ctx.fillText(this.shield, this.x + 5.5, this.y - 10)
        }
        ///// FLIPPING === SWORD SEQUENCE /////
        if (this.flip_count > 0) {
            let cx = this.cx()
            let cy = this.cy()
            let adj_cy = 0
            ///// FLIP SEQUENCE IS 60 FRAMES, SWORD STARTS AFTER FRAME 10 /////
            if (this.flip_count < 50) {
                ///// UP SEQUENCE - GET SWORD TIPS/////
                if (this.flip_type === 'up') {
                    if (this.flip_count > 40) {
                        this.sword_tip.x = cx + (50 - this.flip_count) * 5 * this.facing // full length = 50
                        this.sword_tip.y = cy
                    } else if (this.flip_count > 10) {
                        let dx = Math.cos((41 - this.flip_count) / 40 * Math.PI) * 50
                        let dy = Math.sin((41 - this.flip_count) / 40 * Math.PI) * 50
                        this.sword_tip.x = cx + dx * this.facing
                        this.sword_tip.y = cy - dy
                    } else {
                        let dx = Math.cos((41 - this.flip_count) / 40 * Math.PI) * 5 * this.flip_count
                        let dy = Math.sin((41 - this.flip_count) / 40 * Math.PI) * 5 * this.flip_count
                        this.sword_tip.x = cx + dx * this.facing
                        this.sword_tip.y = cy - dy
                    }
                ///// DOWN SEQUENCE - GET SWORD TIPS /////
                } else {
                    this.sword_tip.x = cx
                    this.sword_tip.y = cy
                    if (this.flip_count > 40) {
                        let dx = Math.cos((this.flip_count - 40) * 0.075 * Math.PI) * 50
                        let dy = Math.sin((this.flip_count - 40) * 0.075 * Math.PI) * 50
                        this.sword_tip.x = cx + dx * this.facing
                        this.sword_tip.y = cy - dy
                    } else {
                        adj_cy = (40 - this.flip_count) / 2
                        this.sword_tip.x = cx + 50 * this.facing
                        this.sword_tip.y = cy + adj_cy
                    }
                }
                this.sword_trail[this.sword_trail.length - 1].push({
                    cx: cx,            tx: this.sword_tip.x,   rgb: new RGBColor(this.color),
                    cy: cy + adj_cy,   ty: this.sword_tip.y,   color: this.color,    life: 100
                })
                world_ctx.strokeStyle = this.color
                world_ctx.beginPath()
                world_ctx.moveTo(cx, cy)
                world_ctx.lineTo(this.sword_tip.x, this.sword_tip.y)
                world_ctx.stroke()
            }
        }
        if (this.sword_trail.length > 0) {
            if (this.sword_trail[0].length === 0 && this.sword_trail.length>1) {
                this.sword_trail.splice(0, 1)
            }
            for (let k=0; k<this.sword_trail.length; k++) {
                let poly_path = {tip: [], cen: []}
                for (let i = 0; i < this.sword_trail[k].length; i++) {
                    this.sword_trail[k][i].life -= 1
                    if (this.sword_trail[k][i].life === 0) {
                        this.sword_trail[k].splice(i, 1)
                        continue
                    }
                    poly_path.tip.push({x: this.sword_trail[k][i].tx, y: this.sword_trail[k][i].ty})
                    poly_path.cen.push({x: this.sword_trail[k][i].cx, y: this.sword_trail[k][i].cy})
                }
                if (poly_path.tip.length > 0) {
                    sword_ctx.strokeStyle = this.sword_trail[k][0].color
                    let alpha = this.sword_trail[k][this.sword_trail[k].length-1].life / 180 + 0.2
                    sword_ctx.fillStyle = "rgba(" + this.sword_trail[k][0].rgb["r"] + ","
                                                  + this.sword_trail[k][0].rgb["g"] + ","
                                                  + this.sword_trail[k][0].rgb["b"] + "," + alpha + ")"
                    sword_ctx.beginPath()
                    sword_ctx.moveTo(poly_path.tip[0].x, poly_path.tip[0].y)
                    for (let i = 1; i < poly_path.tip.length; i++) {
                        if (this.flip_type === 'down'
                            && poly_path.tip[i].y > ground_y - this.height
                            && i === poly_path.tip.length - 1) {
                            sword_ctx.lineTo(poly_path.tip[i].x, ground_y)
                        } else {
                            sword_ctx.lineTo(poly_path.tip[i].x, poly_path.tip[i].y)
                        }
                    }
                    for (let i = poly_path.cen.length - 1; i > 0; i--) {
                        sword_ctx.lineTo(poly_path.cen[i].x, poly_path.cen[i].y)
                    }
                    sword_ctx.closePath()
                    sword_ctx.stroke()
                    sword_ctx.fill()
                }
            }
        }
    }
    withinVert(r) {
        return this.top() < r.bottom()
            && this.bottom() > r.top()
    }
    rubRight(r) {
        return this.right() < r.left()
            && this.right() + this.mx >= r.left()
            && this.withinVert(r)
    }
    rubLeft(r) {
        return this.left() > r.right()
            && this.left() - this.mx <= r.right()
            && this.withinVert(r)
    }
    landed(r) {
        return this.left() <= r.right()
            && this.right() >= r.left()
            && this.bottom() - this.vy <= r.top()
            && this.bottom() + this.vy >= r.top()
    }
    hitHead(r) {
        return this.left() < r.right()
            && this.right() > r.left()
            && this.top() - this.vy >= r.bottom()
            && this.top() + this.vy <= r.bottom()
    }
    grabStar() {
        this.star_count += 1
        this.energy += 20
        if (this.energy > 100) this.energy = 100
    }
    getFlipAttack(x_click, y_click, ground_boost) {
        let dx = x_click - this.cx()
        let dy = y_click - this.cy()
        if (dx > 0 && dy > 0 && this.energy >= 35) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'clockwise'
            this.flip_type = 'down'
            this.facing = 1 // right
            this.vy = -4-ground_boost
            this.energy -= 35
            return true
        } else if (dx > 0 & dy < 0 && this.energy >= 35) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'counter'
            this.flip_type = 'up'
            this.facing = 1 // right
            this.vy = -0.6
            this.energy -= 35
            return true
        } else if (dx < 0 & dy > 0 && this.energy >= 35) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'counter'
            this.flip_type = 'down'
            this.facing = -1 // left
            this.vy = -4-ground_boost
            this.energy -= 35
            return true
        } else if (this.energy >= 35) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'clockwise'
            this.flip_type = 'up'
            this.facing = -1 // left
            this.vy = -0.6
            this.energy -= 35
            return true
        }
    }
}
