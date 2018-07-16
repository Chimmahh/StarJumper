
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
            let change_in_x = x - enemies[i].x_pos + enemies[i].width / 2
            let change_in_y = y - enemies[i].y_pos + enemies[i].height / 2
            let separation2 = change_in_x * change_in_x + change_in_y * change_in_y
            if (separation2 < smallest_separation2) {
                smallest_separation2 = separation2
                closest_enemy = enemies[i]
            }
        }
    }
    return closest_enemy
}

class KeyTracker {
    constructor() {
        this.keys = []
    }
    keyDown(key) {
        this.keys.push(key)
    }
    keyUp(key) {
        this.keys = this.keys.filter(function(e) {
            return e !== key;
        })
    }
    isKeyDown(key) {
        return this.keys.indexOf(key) > -1
    }
}

class Rectangle {
    constructor(x, y, width, height, color) {
        this.x_pos = x
        this.y_pos = y
        this.width = width
        this.height = height
        this.color = color
        this.rgb = new RGBColor(color)
    }
    update() {
        this.x_pos += this.vx
        this.y_pos += this.vy
    }
    draw(ctx) {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x_pos, this.y_pos, this.width, this.height)
    }
    left() {
        return this.x_pos
    }
    right() {
        return this.x_pos + this.width
    }
    top() {
        return this.y_pos
    }
    bottom() {
        return this.y_pos + this.height
    }
    cx() {
        return this.x_pos + this.width / 2
    }
    cy() {
        return this.y_pos + this.height / 2
    }
    dictXY() {
        return {"x_pos": this.x_pos, "y_pos": this.y_pos}
    }
    dictXYV() {
        return {"x_pos": this.x_pos, "y_pos": this.y_pos, "vx": this.vx, "vy": this.vy}
    }
    checkCollideRec(rec) {
        let dx = (this.x_pos + this.width/2) - (rec.x_pos + rec.width/2)
        let dy = (this.y_pos + this.height/2) - (rec.y_pos + rec.height/2)
        let x_width = (this.width + rec.width) / 2
        let x_height = (this.height + rec.height) / 2
        return Math.abs(dx) <= x_width && Math.abs(dy) <= x_height
    }
}

class Portal {
    constructor(x_pos, y_pos, radius, color, vx=0, vy=0) {
        this.x_pos = x_pos
        this.y_pos = y_pos
        this.vx = vx
        this.vy = vy
        this.rad = radius
        this.color = color
        this.vib_count = 0
    }
    draw(world_ctx) {
        let grd = world_ctx.createRadialGradient(this.x_pos, this.y_pos, 0, this.x_pos, this.y_pos, this.rad)
        grd.addColorStop(0, 'transparent')
        grd.addColorStop(1, this.color)
        world_ctx.beginPath()
        world_ctx.arc(this.x_pos, this.y_pos, this.rad, 0, 2 * Math.PI, false)
        world_ctx.fillStyle = grd
        world_ctx.fill()
    }
    update(rad_multi) {
        this.rad = 10 + rad_multi * 20
        this.x_pos += this.vx
        this.y_pos += this.vy
    }
    checkCollideRec(rec) {
        let dx = this.x_pos - (rec.x_pos + rec.width / 2)
        let dy = this.y_pos - (rec.y_pos + rec.height / 2)
        let x_width = (this.rad*2 + rec.width) / 2
        let x_height = (this.rad*2 + rec.height) / 2
        return Math.abs(dx) <= x_width && Math.abs(dy) <= x_height
    }
    checkCollideCir(cir) {
        let change_in_x = this.x_pos - cir.x_pos
        let change_in_y = this.y_pos - cir.y_pos
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
            this.x_pos -= nudge_x
            this.y_pos -= nudge_y
            cir.x_pos += nudge_x
            cir.y_pos += nudge_y
            // CALCULATE NEW VELOCITIES
            let collision_angle = Math.atan2(cir.y_pos - this.y_pos, cir.x_pos - this.x_pos)
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
                this.x_pos += this.vx
                this.y_pos += this.vy
                cir.x_pos += cir.vx
                cir.y_pos += cir.vy
            }
            return true
        }
        return false
    }
    setLeft(x_pos) {
        this.x_pos = x_pos + this.rad
    }
    setRight(x_pos) {
        this.x_pos = x_pos - this.rad
    }
    setTop(y_pos) {
        this.y_pos = y_pos + this.rad
    }
    setBottom(y_pos) {
        this.y_pos = y_pos - this.rad
    }
    dictXYV() {
        return {"x_pos": this.x_pos, "y_pos": this.y_pos, "vx": this.vx, "vy": this.vy}
    }
}

class HealthStar extends Rectangle {
    constructor(x_pos, y_pos, width, height, color) {
        super(x_pos, y_pos, width, height, color);
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

function checkCTX(rec, cnv_width, ctx_data, trans_x) {
    if (rec.width + rec.height < 20) {
        ///// CHECK CENTER OF SMALL RECTANGLES /////
        let x = Math.round(rec.cx() + trans_x)
        let y = Math.round(rec.cy())
        let pix = (4 * cnv_width * (y - 1)) + (4 * x) - 1
        if (ctx_data[pix] > 0) {
            let r = ctx_data[pix - 3]
            let g = ctx_data[pix - 2]
            let b = ctx_data[pix - 1]
            return this.getCTXColor(r, g, b)
        }
    } else {
        ///// CHECK EACH CORNER OF LARGER RECTANGLES /////
        let x = Math.round(rec.x_pos + trans_x)
        let y = Math.round(rec.y_pos)
        let top_left =      (4 * cnv_width * (y - 1))              + (4 * x) - 1
        let top_right =     (4 * cnv_width * (y - 1))              + (4 * (x + rec.width)) - 1
        let bottom_left =   (4 * cnv_width * (y + rec.height - 1)) + (4 * x) - 1
        let bottom_right =  (4 * cnv_width * (y + rec.height - 1)) + (4 * (x + rec.width)) - 1
        if (ctx_data[top_left] > 0) {
            let r = ctx_data[top_left - 3]
            let g = ctx_data[top_left - 2]
            let b = ctx_data[top_left - 1]
            return this.getCTXColor(r, g, b)
        } else if (ctx_data[top_right] > 0) {
            let r = ctx_data[top_right - 3]
            let g = ctx_data[top_right - 2]
            let b = ctx_data[top_right - 1]
            return this.getCTXColor(r, g, b)
        } else if (ctx_data[bottom_left] > 0) {
            let r = ctx_data[bottom_left - 3]
            let g = ctx_data[bottom_left - 2]
            let b = ctx_data[bottom_left - 1]
            return this.getCTXColor(r, g, b)
        } else if (ctx_data[bottom_right] > 0) {
            let r = ctx_data[bottom_right - 3]
            let g = ctx_data[bottom_right - 2]
            let b = ctx_data[bottom_right - 1]
            return this.getCTXColor(r, g, b)
        }
        return false
    }
    return false
}
function getCTXColor(r, g, b) {                 // IF THE SWORD HITS A PLAYER OR A BULLET getCTXColor
    if (r + g + b > 700) {                      // DETERMINES THE COLOR OF THE SWORD TRAIL BASE ON
        return 'white'                          // R, G, B RELATIONSHIPS. COLOR IS RETURNED FOR BULLET
    } else if (r > 0 && g + b === 0) {          // REBOUND AND ENEMY DEATH BURST.......................
        return 'red'                            // THIS APPROACH WAS NECESSARY BECAUSE THE GRADIENT OF
    } else if (b > 0 && r + g === 0) {          // THE SWORD TRAIL RESULTS IN A RANGE OF R/G/B COMBOS.
        return 'mediumblue'
    } else if (r == g) {
        return 'yellow'
    } else if (r == b) {
        return 'limegreen'
    } else if (b === 0) {
        return 'orange'
    } else {
        return 'darkorchid'
    }
}

class Image {
    constructor(path, x, y) {
        this.element = document.createElement('img')
        this.element.src = path
        this.x_pos = x
        this.y_pos = y
    }
    draw(world_ctx) {
        world_ctx.drawImage(this.element, this.x_pos, this.y)
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
