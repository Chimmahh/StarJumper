
class StarShot extends Rectangle {
    constructor(x_pos, y_pos, color, shooter, life=360) {
        super(x_pos, y_pos, 3, 3, color)
        this.ground_timer = 0
        this.life = life
        this.shooter = shooter
        this.speed = color_data[color].shot_speed
    }
}

class RedShot extends StarShot {
    constructor(x_pos, y_pos, color, shooter) {
        super(x_pos, y_pos, color, shooter)
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

class BlueShot extends StarShot {
    constructor(x_pos, y_pos, color, shooter) {
        super(x_pos, y_pos, color, shooter)
        this.ct = 0
        this.trail = []
    }
    update() {
        this.ct += 1
        if (this.trail.length > 0) {
            for (let i = 0; i < this.trail.length; i++) {
                this.trail[i].life -= 1
                if (this.trail[i].life === 0) {
                    this.trail.splice(i, 1)
                } else if (this.trail[i].life < 10) {
                    this.trail[i].color = 'deepskyblue'
                } else if (this.trail[i].life < 20) {
                    this.trail[i].color = 'dodgerblue'
                } else {
                    this.trail[i].color = 'blue'
                }
            }
        }
        if (this.ct % 5 === 0) {
            this.trail.push(new Rectangle(this.x_pos, this.y_pos, this.width, this.height, this.color))
            this.trail[this.trail.length-1].life = 25
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
    }
}

class YellowShot extends StarShot {
    constructor(x_pos, y_pos, color, shooter, life=240, bolts=false, interval_ct=0) {
        super(x_pos, y_pos, color, shooter, life)
        this.interval_ct = interval_ct
        this.split_ct = 0
        this.trail_ct = 0
        this.trail = []
        if (bolts) {
            this.bolts = bolts
        } else {
            this.bolts = {"intervals": [], "angles": [], "splits": []}
            let max_splits = 3
            let change_dir = Math.random() < 0.5 ? -1 : 1
            for (let i=220; i>0; i--) {
                if (Math.random() < 0.2) {
                    let rand = random(0.25, 0.40) * change_dir
                    this.bolts.intervals.push(i)
                    this.bolts.angles.push(rand)
                    if (this.bolts.splits.length < max_splits && Math.random() < 0.5) {
                        this.bolts.splits.push(i)
                    }
                    i -= 20
                    change_dir *= -1
                }
            }
        }
    }
    update() {
        if (this.bolts.intervals[this.interval_ct] === this.life) {
            let angle_in_rad = Math.atan2(this.vy, this.vx)
            let rand = this.bolts.angles[this.interval_ct]
            this.vx = Math.cos(angle_in_rad + rand) * this.speed
            this.vy = Math.sin(angle_in_rad + rand) * this.speed
            if (this.bolts.splits[this.split_ct] === this.life) {
                let shot = new YellowShot(
                    this.x_pos, this.y_pos, "yellow", this.shooter, this.life - 1, this.bolts, this.interval_ct+1)
                shot.speed = this.speed
                shot.vx = Math.cos(angle_in_rad - rand) * this.speed
                shot.vy = Math.sin(angle_in_rad - rand) * this.speed
                this.shooter.shots.push(shot)
                this.split_ct += 1
            }
            this.trail_ct = 0
            this.interval_ct += 1
        }
        this.x_pos += this.vx
        this.y_pos += this.vy
        if (this.trail_ct > -1) {
            this.trail_ct += 1
            if (this.trail_ct === 12) {
                this.trail = []
                this.trail_ct = -1
            } else if (this.trail_ct % 3 === 0) {
                this.trail.push(new Rectangle(this.x_pos, this.y_pos, this.width, this.height, "yellow"))
            }
        }
    }
}

function checkPurpleShot(shot, index, ground, portals, player, enemies) {
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
        } else if (shot.y_pos + shot.height > ground.y_pos) {
            shot.vy *= -1
            shot.y_pos = ground.y_pos - shot.height + shot.vy
        }
        ///// COLLISION WITH PORTALS = CHANGE SHOT TYPE /////
        for (let j = 0; j < portals.length; j++) {
            if (portals[j].checkCollideRec(shot)) {
                let new_shot = new color_data[portals[j].color].shot(
                    shot.x_pos, shot.y_pos, portals[j].color, shot.shooter)
                let shot_vel = getShotVelocities(
                    shot.vx, shot.vy, 0, 0, color_data[portals[j].color].shot_speed)
                new_shot.vx = shot_vel.vx
                new_shot.vy = shot_vel.vy
                ///// SPECIAL CASES - RED & ORANGE /////
                if (portals[j].color === 'red') {
                    new_shot = addRedTarget(new_shot.x_pos, new_shot.y_pos, new_shot, player, enemies, true)
                } else if (portals[j].color === 'orange') {
                    this.addOrangeBuck(new_shot)
                }
                shot.shooter.shots.push(new_shot)
                shot.shooter.shots.splice(index, 1)
                break
            }
        }
    } else if (shot.bottom() >= ground.y_pos) {
        shot.y_pos = ground.y_pos - shot.height
        shot.ground_timer = 14
    } else if (shot.x_pos < 0 || shot.x_pos > ground.width || shot.y_pos < 0) {
        return true
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
        let mini_shot = new StarShot(shot.x_pos, shot.y_pos, 'orange', shot.shooter, 180)
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
        shot = new StarShot(x_pos, y_pos, 'red', shot.shooter)
        shot.vx = save_vx
        shot.vy = save_vy
    }
    return shot
}

