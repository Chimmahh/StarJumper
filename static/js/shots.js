
class StarShot extends Rectangle {
    constructor(x_pos, y_pos, width, height, color, shooter, life = 360) {
        super(x_pos, y_pos, width, height, color)
        this.ground_timer = 0
        this.life = life
        this.shooter = shooter
        this.speed = this.speed = color_data[color].shot_speed
    }
}

class RedShot extends StarShot {
    constructor(x_pos, y_pos, width, height, color, shooter) {
        super(x_pos, y_pos, width, height, color, shooter)
    }
    update() {
        if (this.target) {
            let shot_velocities = getShotVelocities(
                this.target.x_pos + this.target.width / 2, this.target.y_pos + this.target.height / 2,
                this.x_pos + this.width / 2, this.y_pos + this.height / 2, this.speed)
            this.vx = (this.vx * 39 + shot_velocities.vx) / 40
            this.vy = (this.vy * 39 + shot_velocities.vy) / 40
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
    }
}

class YellowShot extends StarShot {
    constructor(x_pos, y_pos, width, height, color, shooter, life=360, original=true) {
        super(x_pos, y_pos, width, height, color, shooter, life)
        this.bolt_pivot = {x:0, y:0, life:0}
        this.original = original
        this.split_cooldown = 40
        this.last_dir = Math.random() < 0.5 ? 1 : -1
    }
    update() {
        if (this.life % 15 === 14) {
            this.bolt_pivot = {x_pos: this.x_pos + this.width/2,
                               y_pos: this.y_pos + this.height/2, life: 15}
            let angle_in_rad = Math.atan2(this.vy, this.vx)
            let rand = random(0.25, 0.40) * this.last_dir
            this.vx = Math.cos(angle_in_rad + rand) * this.speed
            this.vy = Math.sin(angle_in_rad + rand) * this.speed
            this.last_dir *= -1
            if (this.original) {
                if (Math.random() < 0.3 && this.split_cooldown < 0) {
                    let shot = new YellowShot(
                        this.x_pos, this.y_pos, this.width, this.height, this.color, this.shooter,
                            Math.floor(this.life), false)
                    shot.speed = this.speed
                    shot.vx = Math.cos(angle_in_rad - rand) * this.speed
                    shot.vy = Math.sin(angle_in_rad - rand) * this.speed
                    shot.bolt_pivot = this.bolt_pivot
                    this.shooter.shots.push(shot)
                    this.split_cooldown = 35
                }
            }
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
        this.split_cooldown -= 1
    }
}

class BlueShot extends StarShot {
    constructor(x_pos, y_pos, width, height, color, shooter) {
        super(x_pos, y_pos, width, height, color, shooter)
        this.ct = 0
        this.ice_trail = []
    }
    update() {
        this.ct += 1
        if (this.ice_trail.length > 0) {
            for (let i = 0; i < this.ice_trail.length; i++) {
                this.ice_trail[i].life -= 1
                if (this.ice_trail[i].life === 0) {
                    this.ice_trail.splice(i, 1)
                } else if (this.ice_trail[i].life < 10) {
                    this.ice_trail[i].color = 'deepskyblue'
                } else if (this.ice_trail[i].life < 20) {
                    this.ice_trail[i].color = 'dodgerblue'
                } else {
                    this.ice_trail[i].color = 'blue'
                }
            }
        }
        if (this.ct % 5 === 0) {
            this.ice_trail.push(new Rectangle(this.x_pos, this.y_pos, this.width, this.height, this.color))
            this.ice_trail[this.ice_trail.length-1].life = 25
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
    }
}

function checkPurpleShot(shot, index, ground_y, portals, player, enemies) {
    ///// BOUNCE OFF BOUNDARIES /////
    if (shot.color === 'darkorchid') {
        if (shot.x_pos > this.width - this.star_size) {
            shot.vx *= -1
            shot.x_pos = this.width - this.star_size - shot.vx
        } else if (shot.x_pos < 0) {
            shot.vx *= -1
            shot.x_pos = shot.vx
        } else if (shot.y_pos < 0) {
            shot.vy *= -1
            shot.y_pos += shot.vy
        } else if (shot.y_pos + shot.height > ground_y) {
            shot.vy *= -1
            shot.y_pos = ground_y - shot.height + shot.vy
        }
        ///// COLLISION WITH PORTALS = CHANGE SHOT TYPE /////
        for (let j = 0; j < portals.length; j++) {
            if (portals[j].checkCollideRec(shot)) {
                let new_shot = new color_data[portals[j].color].shot(
                    shot.x_pos, shot.y_pos, shot.width, shot.height, portals[j].color, shot.shooter)
                let shot_vel = getShotVelocities(
                    shot.vx, shot.vy, 0, 0, color_data[portals[j].color].shot_speed)
                new_shot.vx = shot_vel.vx
                new_shot.vy = shot_vel.vy
                ///// SPECIAL CASES - RED & ORANGE /////
                if (this.portals[j].color === 'red') {
                    new_shot = addRedTarget(new_shot.x_pos, new_shot.y_pos, new_shot, player, enemies, true)
                } else if (portals[j].color === 'orange') {
                    this.addOrangeBuck(shot.shooter, new_shot)
                }
                shot.shooter.shots.push(new_shot)
                shot.shooter.shots.splice(index, 1)
                break
            }
        }
    } else if (shot.y_pos + this.star_size > this.height - this.ground_height) {
        shot.y_pos = this.height + this.star_size + this.ground_height
        shot.ground_timer = 30
    }
}

function addOrangeBuck(shot) {
    let angle_in_rad = Math.atan2(shot.vy, shot.vx)
    ///// 2 MINI-SHOT LOOP /////
    for (let i=0; i<2; i++) {
        ///// 1ST MINI-SHOT CLOCKWISE, 2ND COUNTER-CLOCKWISE /////
        let rand = (i === 0) ? random(0.1, 0.15) : random(-0.15, -0.1)
        let mini_v = {vx: Math.cos(angle_in_rad + rand),
                      vy: Math.sin(angle_in_rad + rand)}
        let mini_shot = new StarShot(shot.x_pos, shot.y_pos, shot.width, shot.height, 'orange', shot.shooter, 180)
        ///// WEAKER MINI-SHOTS THAN MAIN SHOT /////
        rand = random(2.5, 3)
        mini_shot.vx = mini_v.vx * rand
        mini_shot.vy = mini_v.vy * rand
        shot.shooter.shots.push(mini_shot)
    }
}

function addRedTarget(x_pos, y_pos, shot, player, enemies, portal=false) {
    if (enemies.length > 0) {
        if (shot.shooter === player) {
            shot.target = getClosestTarget(x_pos, y_pos, enemies)
        } else {
            shot.target = player
        }
    } else {
        ///// CHANGE TO REGULAR SHOT IF NO TARGETS /////
        let save_vx = shot.vx  // AT LEAST KEEP IT RED-FAST
        let save_vy = shot.vy  // AT LEAST KEEP IT RED-FAST
        if (!portal) {
            x_pos = shot.shooter.cx()
            y_pos = shot.shooter.cy()
        }
        shot = new StarShot(x_pos, y_pos, shot.width, shot.height, 'red', shot.shooter)
        shot.vx = save_vx
        shot.vy = save_vy
    }
    return shot
}

function checkExtraDraw(shot) {
    if (shot.bolt_pivot) {
        if (shot.bolt_pivot.life > 0) {
            this.world_ctx.lineWidth = 3
            this.world_ctx.beginPath()
            this.world_ctx.moveTo(shot.bolt_pivot.x_pos, shot.bolt_pivot.y_pos)
            this.world_ctx.lineTo(shot.cx(), shot.cy())
            let grd = this.world_ctx.createLinearGradient(
                shot.bolt_pivot.x_pos, shot.bolt_pivot.y_pos, shot.x_pos, shot.y_pos)
            grd.addColorStop("0", "rgba(0,0,0,0)")
            grd.addColorStop("1", shot.color)
            this.world_ctx.strokeStyle = grd
            this.world_ctx.stroke()
            shot.bolt_pivot.life -= 1
        }
    } else if (shot.ice_trail) {
        for (let j=0; j<shot.ice_trail.length; j++) {
            shot.ice_trail[j].draw(this.world_ctx)
        }
    }
}
