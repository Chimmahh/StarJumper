
class StarJumper extends Rectangle {
    constructor(x_pos, y_pos, color) {
        super(x_pos, y_pos, 20, 40, color);
        this.host = false
        this.key_tracker = new KeyTracker
        this.vy = 0
        this.vx = 0
        this.mx = color_data[color].mx
        this.star_count = 50
        this.star_cooldown = 0
        this.on_platform = true
        this.staa_ridin = false
        this.hurt_count = 0
        this.last_teleport = {}
        this.freeze_ct = 0
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

    update(portals, platforms, enemies, world_width, world_height, health_star) {
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
                    this.x_pos = portals[i].portal_pair.x_pos
                    this.y_pos = portals[i].portal_pair.y_pos
                }
            }
        }
        ///// JUMP IF ON PLATFORM ////////
        if ((this.key_tracker.isKeyDown('ArrowUp') || this.key_tracker.isKeyDown('W')
            || this.key_tracker.isKeyDown('w')) && this.on_platform) {
                this.vy = -7
                this.staa_ridin = false
        }
        ///// DEFAULT ASSUMPTIONS, RESET, INCREMENT, ETC //////
        this.on_platform = false
        this.star_cooldown -= 1
        this.display_shield_ct -= 1
        this.freeze_ct -= 1
        if (this.freeze_ct < 0) this.hurt_count -= 1
        if (this.energy < this.base_energy) this.energy += 0.25
        let rubbing = false
        ///// GO RIGHT OR LEFT /////
        if (!this.staa_ridin) {
            if (this.key_tracker.isKeyDown('ArrowLeft') || this.key_tracker.isKeyDown('a') || this.key_tracker.isKeyDown('A')) {
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
                if (!rubbing) {
                    if (this.freeze_ct < 0) {
                        this.x_pos -= this.mx
                    } else {
                        this.x_pos -= this.mx / 2
                    }
                    if (this.x_pos < 0) this.x_pos = 0
                }
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
                if (!rubbing) {
                    if (this.freeze_ct < 0) {
                        this.x_pos += this.mx
                    } else {
                        this.x_pos += this.mx / 2
                    }
                    if (this.x_pos + this.width > world_width) this.x_pos = world_width - this.width
                }
            }
        }
        ///// IF RIDING ON HEALTH STAR /////
        if (this.staa_ridin) {
            this.on_platform = true
            this.x_pos = health_star.x_pos - (this.width - health_star.width) / 2
            this.y_pos = health_star.y_pos - this.height
            ///// PICK UP HEALTH STAR  /////
            if (this.key_tracker.isKeyDown('ArrowDown') || this.key_tracker.isKeyDown('s')
                || this.key_tracker.isKeyDown('S') || this.key_tracker.isKeyDown(' ')) {
                    this.staa_ridin = false
                    this.on_platform = false
                    this.star_cooldown = 10
                    if (this.health < 10) this.health += 1
                    health_star.x_pos = random(100, world_width - 100)
                    health_star.y_pos = random(100, world_height - 100)
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
            this.y_pos += this.vy
            if (this.y_pos + this.height >= platforms[0].y_pos) {
                this.y_pos = platforms[0].y_pos - this.height
                this.flip_count = 0
            } else {
                this.flip_count -= 1
            }
        ///// OTHERWISE CHECK NORMAL HITS /////
        } else {
            for (let i=0; i<platforms.length; i++) {
                ///// LANDED ON STAR OR GROUND /////
                if (this.landed(platforms[i])) {
                    this.y_pos = platforms[i].top() - this.height
                    this.vy = 0
                    this.on_platform = true
                    ///// DOWN KEY = PICK UP STAR /////
                    if ((this.key_tracker.isKeyDown('ArrowDown') || this.key_tracker.isKeyDown('s')
                        || this.key_tracker.isKeyDown('S')) && i > 0 && this.star_cooldown < 0) {
                            this.star_cooldown = 10
                            this.grabStar()
                            platforms.splice(i, 1)
                    }
                    break
                ///// CHECK HEAD BUMP /////
                } else if (this.hitHead(platforms[i]) && this.vy < 0 && i > 0 && this.flip_count <= 0) {
                    this.y_pos = platforms[i].bottom() + 0.001
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
                        this.shots[i].x_pos -= 2 / this.shots[i].life
                        this.shots[i].y_pos -= 2 / this.shots[i].life
                        if (this.shots[i].bottom() >= platforms[0].y_pos) {
                            this.shots.splice(i, 1)
                            continue
                        }
                    }
                    ///// SLOW SHOTS IN PLAY /////
                    this.shots[i].life -= 1
                    this.shots[i].vx *= 0.994
                    this.shots[i].vy *= 0.994
                    this.shots[i].speed *= 0.994
                    let result = checkPurpleShot(this.shots[i], i, platforms[0], portals, this, enemies)
                    if (result) this.shots.splice(i, 1)
                }
            ///// REMOVE INFLATED SHOTS THAT HAVE REACHED 1 /////
            } else if (this.shots[i].ground_timer === 1) {
                this.shots.splice(i, 1)
            ///// INFLATE STARS THAT HAVE HIT GROUND /////
            } else {
                this.shots[i].ground_timer -= 1
                this.shots[i].height += 0.6
                this.shots[i].width += 0.6
                this.shots[i].y_pos = platforms[0].y_pos - this.shots[i].height
                this.shots[i].x_pos -= 0.3
            }
        }
        ///// MID AIR SCENARIOS - NOT ON A PLATFORM OR HEALTH STAR, NOT FLIPPING /////
        if (!this.on_platform && !this.staa_ridin && this.flip_count <= 0) {
            this.vy += 0.25
            this.y_pos += this.vy
            ///// CHECK GROUND BOUNCE /////
            if (this.y_pos + this.height >= platforms[0].y_pos) {
                this.y_pos = platforms[0].y_pos - this.height
            }
            ///// HIT DOWN KEY, S, OR SPACE TO ADD STAR UNDER STAR JUMPER /////
            if ((this.key_tracker.isKeyDown(' ') || this.key_tracker.isKeyDown('s') || this.key_tracker.isKeyDown('S')
                || this.key_tracker.isKeyDown('ArrowDown')) && this.star_count > 0 && this.star_cooldown < 0) {
                    let new_star_x = this.x_pos + (this.width - health_star.width) / 2
                    let new_star_y = this.y_pos + this.height
                    let star = new Rectangle(new_star_x, new_star_y, health_star.width, health_star.height, 'white')
                    platforms.push(star)
                    this.vy = 0
                    this.star_cooldown = 10
                    this.star_count -= 1
            }
        }
    }

    draw(world_ctx, sword_ctx, ground_y) {
        let draw_me = true
        if (this.freeze_ct < 0) {
            if (this.hurt_count > 60 && this.hurt_count % 3 !== 0) {
                draw_me = false
            } else if (this.hurt_count > 0 && this.hurt_count % 2 === 0) {
                draw_me = false
            }
        }
        if (draw_me) {
            world_ctx.save();
            let grd = world_ctx.createLinearGradient(0, 0, this.width * this.facing, -this.height / 4)
            if (this.freeze_ct < 0) {
                grd.addColorStop(0, this.color)
            } else {
                grd.addColorStop(0, "lightblue")
            }
            grd.addColorStop(1, "white")
            world_ctx.fillStyle = grd
            world_ctx.translate(this.x_pos + this.width / 2, this.y_pos + this.height / 2)
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
            world_ctx.fillText('🛡', this.x_pos - 6, this.y_pos - 7)
            world_ctx.font = 'bold 18px Arial'
            world_ctx.fillText(this.shield, this.x_pos + 5.5, this.y_pos - 10)
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
                        this.sword_tip.x_pos = cx + (50 - this.flip_count) * 5 * this.facing // full length = 50
                        this.sword_tip.y_pos = cy
                    } else if (this.flip_count > 10) {
                        let dx = Math.cos((41 - this.flip_count) / 40 * Math.PI) * 50
                        let dy = Math.sin((41 - this.flip_count) / 40 * Math.PI) * 50
                        this.sword_tip.x_pos = cx + dx * this.facing
                        this.sword_tip.y_pos = cy - dy
                    } else {
                        let dx = Math.cos((41 - this.flip_count) / 40 * Math.PI) * 5 * this.flip_count
                        let dy = Math.sin((41 - this.flip_count) / 40 * Math.PI) * 5 * this.flip_count
                        this.sword_tip.x_pos = cx + dx * this.facing
                        this.sword_tip.y_pos = cy - dy
                    }
                ///// DOWN SEQUENCE - GET SWORD TIPS /////
                } else {
                    this.sword_tip.x_pos = cx
                    this.sword_tip.y_pos = cy
                    if (this.flip_count > 40) {
                        let dx = Math.cos((this.flip_count - 40) * 0.075 * Math.PI) * 50
                        let dy = Math.sin((this.flip_count - 40) * 0.075 * Math.PI) * 50
                        this.sword_tip.x_pos = cx + dx * this.facing
                        this.sword_tip.y_pos = cy - dy
                    } else {
                        adj_cy = (40 - this.flip_count) / 2
                        this.sword_tip.x_pos = cx + 50 * this.facing
                        this.sword_tip.y_pos = cy + adj_cy
                    }
                }
                this.sword_trail[this.sword_trail.length - 1].push({
                    cx: cx,            tx: this.sword_tip.x_pos,   rgb: new RGBColor(this.color),
                    cy: cy + adj_cy,   ty: this.sword_tip.y_pos,   color: this.color,    life: 100
                })
                world_ctx.strokeStyle = this.color
                world_ctx.beginPath()
                world_ctx.moveTo(cx, cy)
                world_ctx.lineTo(this.sword_tip.x_pos, this.sword_tip.y_pos)
                world_ctx.stroke()
            }
        }
        ///// DRAW SWORD /////
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
                    poly_path.tip.push({x_pos: this.sword_trail[k][i].tx, y_pos: this.sword_trail[k][i].ty})
                    poly_path.cen.push({x_pos: this.sword_trail[k][i].cx, y_pos: this.sword_trail[k][i].cy})
                }
                if (poly_path.tip.length > 0) {
                    sword_ctx.strokeStyle = this.sword_trail[k][0].color
                    let alpha = this.sword_trail[k][this.sword_trail[k].length-1].life / 180 + 0.2
                    sword_ctx.fillStyle = "rgba(" + this.sword_trail[k][0].rgb["r"] + ","
                                                  + this.sword_trail[k][0].rgb["g"] + ","
                                                  + this.sword_trail[k][0].rgb["b"] + "," + alpha + ")"
                    sword_ctx.beginPath()
                    sword_ctx.moveTo(poly_path.tip[0].x_pos, poly_path.tip[0].y_pos)
                    for (let i = 1; i < poly_path.tip.length; i++) {
                        if (this.flip_type === 'down'
                            && poly_path.tip[i].y_pos > ground_y - this.height
                            && i === poly_path.tip.length - 1) {
                            sword_ctx.lineTo(poly_path.tip[i].x_pos, ground_y)
                        } else {
                            sword_ctx.lineTo(poly_path.tip[i].x_pos, poly_path.tip[i].y_pos)
                        }
                    }
                    for (let i = poly_path.cen.length - 1; i > 0; i--) {
                        sword_ctx.lineTo(poly_path.cen[i].x_pos, poly_path.cen[i].y_pos)
                    }
                    sword_ctx.closePath()
                    sword_ctx.stroke()
                    sword_ctx.fill()
                }
            }
        }
        ///// SHOTS /////
        for (let i=0; i<this.shots.length; i++) {
            this.shots[i].draw(world_ctx)
            if (this.shots[i].trail) {
                for (let j=0; j<this.shots[i].trail.length; j++) {
                    this.shots[i].trail[j].draw(world_ctx)
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
        this.on_platform = false
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
