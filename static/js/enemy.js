
class Eye {
    constructor(x_pos, y_pos, color) {
        this.x_pos = x_pos
        this.y_pos = y_pos
        this.o_color = color
        this.color = color
        this.life = 5
        this.hurt_count = 0
        this.blink_count = 0
        this.blink_dir = 0
        this.vx = 2.5
        this.vy = 1
        this.o_height = 30
        this.height = 30
        this.o_width = 60
        this.width = 60
        this.move_cooldown = 30
        this.shot_cooldown = 120
        this.shots = []
        this.stun_ct = 0
        this.throb = 0
    }
    cx() {
        return this.x_pos
    }
    cy() {
        return this.y_pos
    }
    update(ground, hurt_count, enemies) {
        if (this.x_pos + this.o_width/2 > ground.width * 0.9) {
            this.vx *= -1
            this.x_pos = Math.round(ground.width * 0.9 - this.o_width/2)
        } else if (this.x_pos - this.o_width/2 < ground.width * 0.1) {
            this.vx *= -1
            this.x_pos = Math.round(ground.width * 0.1 + this.o_width/2)
        } else if (this.y_pos + this.o_height/2 > ground.y_pos/2) {
            this.vy *= -1
            this.y_pos = Math.round(ground.y_pos/2 - this.o_height/2)
        } else if (this.y_pos - this.o_height/2 < 60) {
            this.vy *= -1
            this.y_pos = Math.round(60 + this.o_height/2)
        }
        if (hurt_count > 0) {
            if (this.vx < 0) {
                this.vx += 0.02
            } else {
                this.vx -= 0.02
            }
        } else if (Math.abs(this.vx) < 2.5) {
            if (this.vx < 0) {
                this.vx -= 0.02
            } else {
                this.vx += 0.02
            }
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
        if (this.blink_count >= 0) {
            return this.blink()
        } else {
            let rnd = Math.random()
            if (rnd < 0.02) {
                if (this.life === 0) {
                    this.blink_count = 60
                    this.blink_dir = 'height'
                } else if (enemies < 4 + level) {
                    this.blink_count = 60
                    this.blink_dir = 'width'
                } else if (rnd < 0.002) {
                    this.blink_count = 60
                    this.blink_dir = 'width'
                } else  {
                    this.blink_count = 60
                    this.blink_dir = 'height'
                }
            }
        }
    }
    blink() {
        if (this.blink_dir === 'width') {
            if (this.blink_count > 30) {
                this.width -= 1.9
            } else if (this.blink_count > 0) {
                this.width += 1.9
            } else {
                this.width = 60
            }
        } else {
            let squint = this.life / 6
            if (this.blink_count >= 30) {
                this.height -= squint * this.o_height/30
            } else if (this.blink_count > 0) {
                this.height += squint * this.o_height/30
            } else {
                this.height = 30 - (5 - this.life) * 3
            }
        }
        this.blink_count -= 1
        if (this.blink_count === 30) return true
    }
    draw(world_ctx, hurt_count) {
        if (this.life === 0) {
            this.throb += 1
            if (this.throb === 15) {
                this.throb === 0
            }
        }
        if (hurt_count < 0 || hurt_count % 3 < 2) {
            let eye_color
            if (level >= 8) {
                eye_color = 'deeppink'
            } else (
                eye_color = world.colors[level - 1]
            )

            let x = this.x_pos - (this.width - this.throb % 10) / 2.0
            let y = this.y_pos - (this.height - this.throb % 10) / 2.0
            let w = (this.width - this.throb % 10)
            let h = (this.height - this.throb % 10)
            let kappa = .5522848
            let ox = (w / 2) * kappa  // control point offset horizontal
            let oy = (h / 2) * kappa  // control point offset vertical
            let xe = x + w            // x-end
            let ye = y + h            // y-end
            let xm = this.x_pos       // x-middle
            let ym = this.y_pos       // y-middle

            world_ctx.beginPath()
            world_ctx.moveTo(x, ym)
            world_ctx.bezierCurveTo(x       , ym - oy , xm - ox , y       , xm , y )
            world_ctx.bezierCurveTo(xm + ox , y       , xe      , ym - oy , xe , ym)
            world_ctx.bezierCurveTo(xe      , ym + oy , xm + ox , ye      , xm , ye)
            world_ctx.bezierCurveTo(xm - ox , ye      , x       , ym + oy , x  , ym)
            world_ctx.strokeStyle = eye_color
            world_ctx.stroke()

            let rad = Math.min(this.width - this.throb % 10, this.height - this.throb % 10) / 2.1
            let grd = world_ctx.createRadialGradient(this.x_pos, this.y_pos, 0, this.x_pos, this.y_pos, rad)
            grd.addColorStop(0, 'black')
            grd.addColorStop(1, eye_color)
            world_ctx.beginPath()
            world_ctx.arc(this.x_pos, this.y_pos, rad, 0, 2 * Math.PI, false)
            world_ctx.stroke()
            world_ctx.fillStyle = grd
            world_ctx.fill()
        }
    }
}


class Enemy extends Rectangle {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color)
        this.target = target
        this.move_cooldown = 30
        this.shot_cooldown = 120
        this.shots = []
        this.last_teleport = {}
        this.stun_ct = 0
        this.freeze_ct = 0
        this.o_color = color
    }
    keepDistanceX(min_x, max_x) {
        let x_dist = Math.abs(this.cx() - this.target.cx())
        if (!(x_dist > min_x && x_dist < max_x)) {
            let dir_switch = x_dist > min_x ? 1 : -1                // INSIDE MIN_X, MOVE AWAY
            this.x_pos += this.vx * this.getDirX() * dir_switch
            return true
        }
    }
    proxyX() {
        return Math.abs(this.cx() - this.target.cx())
    }
    proxyY() {
        return Math.abs(this.cy() - this.target.cy())
    }
    getDirX() {
        return this.cx() - this.target.cx() < 0 ? 1 : -1
    }
}

class WhiteEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.fire_range_x = 600
        this.fire_range_y = 80
        this.vx = 1.5
        this.vy = 0.8
        this.y_segment = 0
        this.y_segment_dir = 1
        this.x_escape_dir = false
        this.x_escape_count = 0
        this.range_adj = Math.floor(Math.random() * 40) + level < 4 ? level * 20 : 100
    }
    update(ground) {
        if (this.move_cooldown < 0) {
            this.x_escape_count -= 1
            if (this.stun_ct < 0 && this.freeze_ct < 0) {
                if (this.x_escape_count > 0) {
                    this.x_pos += this.x_escape_dir
                    this.y_pos -= this.vy
                } else {
                    this.keepDistanceX(50 + this.range_adj, 100 + this.range_adj)
                    ///// ALIGN Y WITHIN 10 PX /////
                    let ey = this.cy()
                    let ty = this.target.cy()
                    if (this.y_segment > 0) {
                        this.y_segment -= 1
                        this.y_pos += this.vy * this.y_segment_dir
                    } else if (ey > ty + 10) {
                        this.y_pos -= this.vy
                    } else if (ey < ty - 10) {
                        this.y_pos += this.vy
                    } else {
                        this.y_segment = Math.floor(random(30, 50))
                        this.y_segment_dir = Math.random() < 0.5 ? 1 : -1
                    }
                    ///// Y BOUNCE /////
                    if (this.y_pos + this.height > ground.y_pos) {
                        this.y_segment_dir *= -1
                    }
                }
                ///// X BOUNCE /////
                if (this.x_pos > ground.width - this.width) {
                    this.x_pos = ground.width - this.width
                    this.x_escape_dir = -1
                    let segment_multi = this.y_pos > ground.y_pos/2 ? 2 : 1
                    this.x_escape_count = 60 * segment_multi
                    this.y_segment = 0
                } else if (this.x_pos < 0) {
                    this.x_pos = 0
                    this.x_escape_dir = 1
                    let segment_multi = this.y_pos > ground.y_pos/2 ? 2 : 1
                    this.x_escape_count = 60 * segment_multi
                    this.y_segment = 0
                }
            }
        }
    }
}

class RedEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.shot_cooldown = 999
        this.jump_range_x = 300
        this.vx = 0
        this.vy = 0
        this.vx_to_jump = 7
        this.accel_vx = 0.1
        this.jump_vy = -12
        this.on_ground = false
        this.charge_dir = 1
    }
    update(ground_y) {
        ///// SET CHARGE DIRECTION/////
        if (this.move_cooldown === 0) {
            this.charge_dir = this.getDirX()
        ///// CHARGE /////
        } else if (this.move_cooldown < 0 && this.on_ground && this.stun_ct < 0 && this.freeze_ct < 0) {
            this.x_pos += this.vx * this.charge_dir
            if (this.vx < this.vx_to_jump) this.vx += this.accel_vx
            if (this.vx >= this.vx_to_jump) {
                if (this.proxyX() < this.jump_range_x) {
                    this.vy = this.jump_vy
                    this.on_ground = false
                } else if (this.move_cooldown < -240) {
                    this.move_cooldown = 360
                }
            }
        ///// AIRBORN /////
        } else if (!this.on_ground) {
            this.y_pos += this.vy
            this.vy += 0.4
            this.vx *= 0.99
            this.x_pos += this.vx * this.charge_dir
            if (this.y_pos + this.vy + this.height > ground_y) {
                this.on_ground = true
                this.y_pos = ground_y - this.height
                this.vy = 0
                this.move_cooldown = 300
            }
        //// STUNNED OR FROZEN ////
        } else if (this.stun_ct > 0 || this.freeze_ct > 0) {
            this.vx *= 0.97
            this.x_pos += this.vx * this.charge_dir
        //// COME OUT OF STUNNED OR FROZEN ////
        } else if(this.stun_ct === 0 || this.freeze_ct === 0) {
            this.move_cooldown = 210
            this.shot_cooldown = Math.floor(random(120, 178))
            this.vx = 0
        ///// LANDED /////
        } else {
            if (this.move_cooldown > 210) {
                this.vx *= 0.97
                this.x_pos += this.vx * this.charge_dir
            } else if(this.move_cooldown === 210) {
                this.shot_cooldown = Math.floor(random(120, 178))
                this.vx = 0
            }
            if (this.shot_cooldown === -31 || this.shot_cooldown === -16 || this.shot_cooldown === -1) {
                return true
            }
        }
    }
}

class OrangeEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.vx = 1.5
        this.vy = 0.8
        this.move_ct = 20
        this.segments = 5
        this.direct_segment = 5
    }
    update() {
        this.move_ct -= 1
        if (this.move_cooldown < 0) {
            if (this.move_ct < 0 && this.stun_ct <= 0 && this.freeze_ct <= 0) {
                if (this.stun_ct === 0 || this.freeze_ct === 0) this.segments === 0
                ///// MOVE = 4-6 RANDOM LENGTHS BETWEEN 30-50 FRAMES /////
                this.move_ct = Math.floor(random(30, 50))
                this.segments -= 1
                if (this.segments === 0) {
                    this.segments = Math.floor(random(4, 7))  //  <-- SET 4-6 SEGMENTS INBETWEEN SHOTS
                    this.move_cooldown = 31
                    this.move_ct += 31
                    ///// CHEAT TOWARDS PLAYER FOR 1 OF THESE SEGMENTS TO ENSURE ENEMY STAYS CLOSE /////
                    this.direct_segment = Math.floor(Math.random() * this.segments) + 1
                    return true
                }
                ///// IF FAR AWAY OR ITS THE CHEATER SEGMENT (AND ENEMY ISN'T SUPER CLOSE) /////
                if (this.proxyX() > 500 || (this.segments === this.direct_segment && this.proxyX() > 150)) {
                    this.vx = Math.abs(this.vx) * this.getDirX()
                } else {
                    if (Math.random() < 0.5) this.vx *= -1
                }
                if (this.y_pos < 30) {
                    this.vy = Math.abs(this.vy)
                } else if (this.y_pos > 250) {
                    this.vy = -Math.abs(this.vy)
                } else {
                    if (Math.random() < 0.7) this.vy *= -1
                }
                this.x_pos += this.vx
                this.y_pos += this.vy
            } else if (this.stun_ct > 0 || this.freeze_ct > 0) {
                this.x_pos += this.vx / 3
                this.y_pos += this.vy / 3
            } else {
                this.x_pos += this.vx
                this.y_pos += this.vy
            }

        }
    }
}

class YellowEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.land_ct = 0
        this.accel_y = 0.3
    }
    update(ground_y) {
        this.land_ct -= 1
        if (this.stun_ct === 0 || this.freeze_ct === 0) {
            this.land_ct = 0
            if (this.y_pos + this.height < ground_y) {
                this.move_cooldown = 0
            } else {
                this.move_cooldown = 180
            }
        } else if (this.stun_ct < 0 && this.freeze_ct < 0) {
            if (this.move_cooldown < 0) {
                this.y_pos += this.move_cooldown / 30
                if ((this.y_pos < 100 && Math.random < 0.02) || this.y_pos < 20) {
                    this.vy = 0
                    this.land_ct = 50
                    this.move_cooldown = 360
                }
                return true
            } else {
                if (this.y_pos + this.height < ground_y) {
                    this.vy += this.accel_y + (50 - this.land_ct)
                    this.y_pos += this.vy
                } else if (this.land_ct > 0) {
                    this.y_pos = ground_y - this.height + 6
                } else {
                    this.y_pos = ground_y - this.height
                    return true
                }
            }
        }
    }
}

class GreenEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.on_ground = false
        this.vx = 0
        this.vy = 0
        this.accel_x = 0.06
        this.shot_cooldown = 9999
        this.shadows = []
    }
    update(ground_y, star_size) {
        let right_dir = this.getDirX()
        let proxy_x = this.proxyX()
        this.x_pos += this.vx
        this.jump_timer -= 1
        if (!this.on_ground) {
            this.y_pos += this.vy
            this.vy += 0.4
            if (this.y_pos + this.vy + this.height > ground_y) {
                this.on_ground = true
                this.y_pos = ground_y - this.height
                this.vy = 0
            } else if (this.jump_timer > 0 && this.stun_ct < 0 && this.freeze_ct < 0) {
                if (this.jump_timer % 5 === 0) {
                    let shadow = new Rectangle(this.x_pos, this.y_pos, this.width, this.height, 'lime')
                    shadow.life = 35
                    this.shadows.push(shadow)
                }
            }
        } else if (this.stun_ct < 0 && this.freeze_ct < 0) {
            if (proxy_x < 350) {
                if (Math.abs(this.vx) > 6 && proxy_x < 150) {               ///// JUMP
                    this.vx /= 1.8
                    this.vy = -8 - Math.abs(this.vx)
                    this.y_pos += this.vy
                    this.on_ground = false
                    this.jump_timer = 40
                } else if (Math.abs(this.vx) > 3) {                         ///// ACCELERATE INTO JUMP
                    this.vx += this.accel_x * right_dir * 2
                } else {                                                    ///// RETREAT
                    this.vx += -this.accel_x * right_dir * 2
                }
            } else {
                this.vx += this.accel_x * right_dir
                if (Math.abs(this.vx) < 0.07) {
                    this.shot_cooldown = Math.floor(random(35, 55))
                    this.vy = -random(12, 15)
                    this.y_pos += this.vy
                    this.on_ground = false
                } else {
                    this.shot_cooldown = 9999
                }
            }
        } else {
            this.vx *= .98
        }
        for (let i=0; i<this.shadows.length; i++) {
            if (this.shadows[i].width > star_size) this.shadows[i].width -= 0.5
            if (this.shadows[i].height > star_size) this.shadows[i].height -= 0.5
        }
        return true
    }
}

class BlueEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.vx = 1.5
        this.vy = -3.0    // GET TO TOP OF WORLD QUICKLY WHEN INSTANTIATED
        this.fire_range_x = 400
        this.runaway_cooldown = 0
        this.runaway_dir = 1
        this.range_adj = Math.floor(random(100, 200))
    }
    update(world_width) {
        this.runaway_cooldown -= 1
        if (this.move_cooldown < 0 && this.stun_ct < 0 && this.freeze_ct < 0) {
            if (this.y_pos < 30){
                this.vy = random(0.2, 0.3)
            } else if (this.y_pos > 70 && this.vy > 0) {
                this.vy = -random(0.4, 0.8)
            }
            if (this.runaway_cooldown > 0) {
                this.x_pos += this.vx * this.runaway_dir
            } else if (this.keepDistanceX(this.range_adj, 100 + this.range_adj)) {
                this.y_pos += this.vy
            } else {
                this.y_pos += this.vy * 2
            }
            if (this.x_pos > world_width - this.width) {
                this.x_pos = world_width - this.width
                this.runaway_cooldown = 180
                this.runaway_dir = -1
            } else if (this.x_pos < 0) {
                this.x_pos = 0
                this.runaway_cooldown = 180
                this.runaway_dir = 1
            }
        }
        
    }
    goodShot() {
        let theta = Math.atan2(this.target.cy()-this.cy(),this.target.cx()-this.cx()) > 0
        return theta > 0 && this.runaway_cooldown < -200 && this.proxyX() <= 300 + this.range_adj
    }
}

class PurpleEnemy extends Enemy {
    constructor(x_pos, y_pos, width, height, color, target) {
        super(x_pos, y_pos, width, height, color, target)
        this.vx = 1.8
        this.vy = 0
        this.accel_y = 0.2
        this.falling = true
        this.move_cooldown = 300
        this.o_width = width
        this.o_height = height
    }
    update(ground_y, portals) {
        if (this.stun_ct < 0 && this.freeze_ct < 0) {
            if (this.move_cooldown < 0) {
                this.height = this.o_height
                this.width = this.o_width
                let closest_3_portals = this.getClosest3Portals(ground_y, portals)
                let target_portal = closest_3_portals[Math.floor(Math.random() * 3)]
                let dx = target_portal.x_pos - this.target.cx()
                let dy = target_portal.y_pos - this.target.cy()
                let dist = Math.sqrt(dx ** 2 + dy ** 2)
                this.x_pos = target_portal.x_pos + dx / dist * (target_portal.rad + this.width + 20)
                this.y_pos = target_portal.y_pos + dy / dist * (target_portal.rad + this.height + 20)
                this.vy = -1
                this.falling = true
                return true
            } else if (this.y_pos < ground_y - this.height) {
                this.y_pos += this.vy
                this.vy += this.accel_y
                if (!this.falling) this.x_pos -= this.vx * this.getDirX()
            } else if (this.move_cooldown < 40) {
                this.x_pos -= this.vx * this.getDirX() + 0.3
                this.width -= 0.6
                this.height -= 0.4
                this.y_pos = ground_y - this.height
            } else {
                this.x_pos -= this.vx * this.getDirX()
                this.y_pos = ground_y - this.height - 0.01
                this.vy = -random(1.5, 2.5)
                this.falling = false
            }
        } else {
            this.x_pos -= this.vx * this.getDirX() * this.stun_ct / 180
            if (this.y_pos < ground_y - this.height) {
                this.y_pos += this.vy
                this.vy += this.accel_y
            } else {
                this.y_pos = ground_y - this.height
            }
        }
    }
    getClosest3Portals(ground_y, portals) {
        let distances = []
        for (let i=0; i<portals.length; i++) {
            if (portals[i].y_pos < ground_y - 50 && portals[i].y_pos > 50) {
                let dx = this.target.cx() - portals[i].x_pos
                let dy = this.target.cy() - portals[i].y_pos
                let dx_dy_sq = dx ** 2 + dy ** 2
                distances.push([portals[i], dx_dy_sq])
            }
        }
        distances.sort((a, b) => a[1] - b[1])
        return [distances[0][0], distances[1][0], distances[2][0]]
    }
}
