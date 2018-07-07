
class StarJumper extends Rectangle {
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color);
        this.vy = 0
        this.vx = 0
        this.mx = color_data[color].mx
        this.star_count = 50
        this.star_cooldown = 0
        this.staa_ridin = false
        this.hurt_count = 0
        this.last_teleport = {}
        this.score = 0
        this.base_health = 100
        this.health = 100
        this.base_energy = 100
        this.energy = 100
        this.shots = []
        this.shot_trails = []
        this.sword_tip = {x:0, y:0}
        this.sword_trail = []
        this.flip_duration = 60
        this.flip_count = 0
        this.flip_rotation = ''
        this.flip_type = ''
        this.facing = 1 // right
    }
    draw(world_ctx, sword_ctx, ground_y) {
        let draw_me = true
        if (this.hurt_count > 60 && this.hurt_count % 3 != 0) {
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
                    cx: cx,               tx: this.sword_tip.x,
                    cy: cy + adj_cy,      ty: this.sword_tip.y,      life: 100
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
            // sword_ctx.fillStyle = this.color
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
                    sword_ctx.strokeStyle = this.color
                    let alpha = this.sword_trail[k][this.sword_trail[k].length-1].life / 180 + 0.2
                    sword_ctx.fillStyle = "rgba(" + this.rgb["r"] + "," + this.rgb["g"] + "," + this.rgb["b"] +
                        "," + alpha + ")"
                    sword_ctx.beginPath()
                    sword_ctx.moveTo(poly_path.tip[0].x, poly_path.tip[0].y)
                    for (let i = 1; i < poly_path.tip.length; i++) {
                        if (this.flip_type === 'down'
                            && poly_path.tip[i].y > ground_y - this.height
                            && i === poly_path.tip.length - 1) {
                            sword_ctx.lineTo(poly_path.tip[i].x, ground_y)
                            // console.log(world.sword_ctx_data)
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
        let dx = x_click - this.x + this.width / 2
        let dy = y_click - this.y
        if (dx > 0 && dy > 0 && this.energy >= 25) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'clockwise'
            this.flip_type = 'down'
            this.facing = 1 // right
            this.vy = -4-ground_boost
            this.energy -= 25
            return true
        } else if (dx > 0 & dy < 0 && this.energy >= 25) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'counter'
            this.flip_type = 'up'
            this.facing = 1 // right
            this.vy = -0.6
            this.energy -= 25
            return true
        } else if (dx < 0 & dy > 0 && this.energy >= 25) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'counter'
            this.flip_type = 'down'
            this.facing = -1 // left
            this.vy = -4-ground_boost
            this.energy -= 25
            return true
        } else if (this.energy >= 25) {
            this.flip_count = this.flip_duration
            this.flip_rotation = 'clockwise'
            this.flip_type = 'up'
            this.facing = -1 // left
            this.vy = -0.6
            this.energy -= 25
            return true
        }
    }
}
