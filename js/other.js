
class Image {
    constructor(path, x, y) {
        this.element = document.createElement('img')
        this.element.src = path
        this.x = x
        this.y = y
    }
    draw(world_ctx) {
        world_ctx.drawImage(this.element, this.x, this.y)
    }
}

function random(lower, upper) {
    return lower + Math.random()*(upper-lower)
}

function getShotVelocities(x_destination, y_destination, x_origin, y_origin, speed) {
    let dx = x_destination - x_origin
    let dy = y_destination - y_origin
    let return_vx = speed * dx / (Math.abs(dx) + Math.abs(dy))
    let return_vy = speed * dy / (Math.abs(dx) + Math.abs(dy))
    return {vx: return_vx, vy: return_vy}
}

function getClosestTarget(x, y, enemies) {
    let closest_enemy
    let smallest_separation2 = 999999
    for (let i=0; i<enemies.length; i++) {
        if (!enemies[i].dead) {
            let change_in_x = x - enemies[i].x + enemies[i].width / 2
            let change_in_y = y - enemies[i].y + enemies[i].height / 2
            let separation2 = change_in_x * change_in_x + change_in_y * change_in_y
            if (separation2 < smallest_separation2) {
                smallest_separation2 = separation2
                closest_enemy = enemies[i]
            }
        }
    }
    return closest_enemy
}

class Rectangle {
    constructor(x, y, width, height, color) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.rgb = new RGBColor(color)
    }
    update() {
        this.x += this.vx
        this.y += this.vy
    }
    draw(ctx) {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x, this.y, this.width, this.height)
    }
    left() {
        return this.x
    }
    right() {
        return this.x + this.width
    }
    top() {
        return this.y
    }
    bottom() {
        return this.y + this.height
    }
    cx() {
        return this.x + this.width / 2
    }
    cy() {
        return this.y + this.height / 2
    }
    checkCollideRec(rec) {
        let dx = (this.x + this.width/2) - (rec.x + rec.width/2)
        let dy = (this.y + this.height/2) - (rec.y + rec.height/2)
        let x_width = (this.width + rec.width) / 2
        let x_height = (this.height + rec.height) / 2
        return Math.abs(dx) <= x_width && Math.abs(dy) <= x_height
    }
}

class StarShot extends Rectangle {
    constructor(x, y, width, height, color, shooter, life = 360) {
        super(x, y, width, height, color)
        this.ground_timer = 0
        this.life = life
        this.shooter = shooter
        this.speed = this.speed = color_data[color].shot_speed
    }
}

class RedShot extends StarShot {
    constructor(x, y, width, height, color, shooter) {
        super(x, y, width, height, color, shooter)
    }
    update() {
        if (this.target) {
            let shot_velocities = getShotVelocities(
                this.target.x + this.target.width / 2, this.target.y + this.target.height / 2,
                this.x + this.width / 2, this.y + this.height / 2, this.speed)
            this.vx = (this.vx * 39 + shot_velocities.vx) / 40
            this.vy = (this.vy * 39 + shot_velocities.vy) / 40
        }
        this.x += this.vx
        this.y += this.vy
    }
}

class YellowShot extends StarShot {
    constructor(x, y, width, height, color, shooter, life=360, original=true) {
        super(x, y, width, height, color, shooter, life)
        this.bolt_pivot = {x:0, y:0, life:0}
        this.original = original
        this.split_cooldown = 40
        this.last_dir = Math.random() < 0.5 ? 1 : -1
    }
    update() {
        if (this.life % 15 === 14) {
            this.bolt_pivot = {x: this.x + this.width/2,
                               y: this.y + this.height/2, life: 15}
            let angle_in_rad = Math.atan2(this.vy, this.vx)
            let rand = random(0.25, 0.40) * this.last_dir
            this.vx = Math.cos(angle_in_rad + rand) * this.speed
            this.vy = Math.sin(angle_in_rad + rand) * this.speed
            this.last_dir *= -1
            if (this.original) {
                if (Math.random() < 0.3 && this.split_cooldown < 0) {
                    let shot = new YellowShot(
                        this.x, this.y, this.width, this.height, this.color, this.shooter,
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
        this.x += this.vx
        this.y += this.vy
        this.split_cooldown -= 1
    }
}

class BlueShot extends StarShot {
    constructor(x, y, width, height, color, shooter) {
        super(x, y, width, height, color, shooter)
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
            this.ice_trail.push(new Rectangle(this.x, this.y, this.width, this.height, this.color))
            this.ice_trail[this.ice_trail.length-1].life = 25
        }
        this.x += this.vx
        this.y += this.vy
    }
}

class Portal {
    constructor(x, y, radius, color, vx=0, vy=0) {
        this.x = x
        this.y = y
        this.vx = vx
        this.vy = vy
        this.rad = radius
        this.color = color
        this.vib_count = 0
    }
    draw(world_ctx) {
        let grd = world_ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.rad);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(1, this.color);
        world_ctx.beginPath()
        world_ctx.arc(this.x, this.y, this.rad, 0, 2 * Math.PI, false)
        world_ctx.fillStyle = grd;
        world_ctx.fill();
    }
    update(rad_multi) {
        this.rad = 10 + rad_multi * 20
        this.x += this.vx
        this.y += this.vy
    }
    checkCollideRec(rec) {
        let dx = this.x - (rec.x + rec.width / 2)
        let dy = this.y - (rec.y + rec.height / 2)
        let x_width = (this.rad*2 + rec.width) / 2
        let x_height = (this.rad*2 + rec.height) / 2
        return Math.abs(dx) <= x_width && Math.abs(dy) <= x_height
    }
    checkCollideCir(cir) {
        let change_in_x = this.x - cir.x
        let change_in_y = this.y - cir.y
        let separation2 = change_in_x*change_in_x + change_in_y * change_in_y
        let combo_len = this.rad + cir.rad
        let combo_len2 = combo_len * combo_len
        if (separation2 <= combo_len2) {
            let separation = Math.sqrt(separation2)
            // YOUR BALLS ARE TOUCHING, SEPARATE THEM
            let diff = combo_len - separation
            let nudge = diff / 2
            let x_part_of_separation = (change_in_x / separation) ** 2
            let y_part_of_separation = (change_in_y / separation) ** 2
            let nudge_x = nudge * x_part_of_separation
            let nudge_y = nudge * y_part_of_separation
            // NUDGE YOUR BALLS BACK TO TOUCHING EDGES
            this.x -= nudge_x
            this.y -= nudge_y
            cir.x += nudge_x
            cir.y += nudge_y
            // CALCULATE NEW VELOCITIES
            let collision_angle = Math.atan2(cir.y - this.y, cir.x - this.x)
            let vel_vect_len_i = Math.sqrt(this.vx ** 2 + this.vy ** 2)
            let vel_vect_len_j = Math.sqrt(cir.vx ** 2 + cir.vy ** 2)
            if (vel_vect_len_i + vel_vect_len_j > 0) {
                let direction_i = Math.atan2(this.vy, this.vx)
                let direction_j = Math.atan2(cir.vy, cir.vx)
                let vx_new_plane_i = vel_vect_len_i * Math.cos(direction_i - collision_angle)
                let vy_new_plane_i = vel_vect_len_i * Math.sin(direction_i - collision_angle)
                let vx_new_plane_j = vel_vect_len_j * Math.cos(direction_j - collision_angle)
                let vy_new_plane_j = vel_vect_len_j * Math.sin(direction_j - collision_angle)
                let vx_final_i = ((this.rad - cir.rad) * vx_new_plane_i + (cir.rad + cir.rad) * vx_new_plane_j) / (this.rad + cir.rad)
                let vx_final_j = ((this.rad + this.rad) * vx_new_plane_i + (cir.rad - this.rad) * vx_new_plane_j) / (this.rad + cir.rad)
                let cosAngle = Math.cos(collision_angle)
                let sinAngle = Math.sin(collision_angle)
                this.vx = cosAngle * vx_final_i - sinAngle * vy_new_plane_i
                this.vy = sinAngle * vx_final_i + cosAngle * vy_new_plane_i
                cir.vx = cosAngle * vx_final_j - sinAngle * vy_new_plane_j
                cir.vy = sinAngle * vx_final_j + cosAngle * vy_new_plane_j
                // MOVE IN NEW DIRECTION ONE TICK
                this.x += this.vx
                this.y += this.vy
                cir.x += cir.vx
                cir.y += cir.vy
            }
            return true
        }
        return false
    }
    setLeft(x) {
        this.x = x + this.rad
    }
    setRight(x) {
        this.x = x - this.rad
    }
    setTop(y) {
        this.y = y + this.rad
    }
    setBottom(y) {
        this.y = y - this.rad
    }
}

class HealthStar extends Rectangle {
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color);
        this.setRandomVelocities()
        this.last_teleport = {}
    }
    setRandomVelocities() {
        let rand_vx = random(0.5, 1) * (Math.random < 0.5 ? -1 : 1)
        let rand_vy = random(0.5, 1) * (Math.random < 0.5 ? -1 : 1)
        this.vx = rand_vx
        this.vy = rand_vy
    }
}

// class Sound {
//     constructor(src) {
//         this.sound = document.createElement("audio");
//         this.sound.src = src;
//         this.sound.setAttribute("preload", "auto");
//         this.sound.setAttribute("controls", "none");
//         this.sound.style.display = "none";
//         document.body.appendChild(this.sound);
//     }
//     play() {
//         this.sound.play();
//     }
//     stop() {
//         this.sound.pause();
//     }
// }
