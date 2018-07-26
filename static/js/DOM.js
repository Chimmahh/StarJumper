
let world_cnv = document.querySelector('#world_cnv')
let sword_cnv = document.querySelector('#sword_cnv')
let show_modal_bt = document.querySelector('#show_modal_bt')
let leave_bt = document.querySelector('#leave_bt')
let modal_background = document.querySelector('#modal_background')
let instruction_modal_div = document.querySelector('#instruction_modal_div')
let hide_modal_bt = document.querySelector('#hide_modal_bt')
let rules_option = document.querySelector('#rules_option')
let controls_option = document.querySelector('#controls_option')
let other_option = document.querySelector('#other_option')
let rules_border = document.querySelector('#rules_border')
let controls_border = document.querySelector('#controls_border')
let other_border = document.querySelector('#other_border')

show_modal_bt.onclick = () => {
    modal_background.style.display = 'block'
    instruction_modal_div.style.transition = 'margin-left 1s'
    instruction_modal_div.style.marginLeft = '50%'
    world.play = false
    restart = 0
}
hide_modal_bt.onclick = () => {
    rules_border.style.marginLeft = '0%'
    controls_border.style.marginLeft = '100%'
    other_border.style.marginLeft = '200%'
    instruction_modal_div.style.transition = 'none'
    instruction_modal_div.style.marginLeft = '-50%'
    modal_background.style.display = 'none'
    world.play = true
    window.requestAnimationFrame(animate)
}
rules_option.onclick = () => {
    rules_option.style.backgroundColor = 'darkorchid'
    rules_border.style.marginLeft = '0%'
    controls_option.style.backgroundColor = 'deepskyblue'
    controls_border.style.marginLeft = '100%'
    other_option.style.backgroundColor = 'deepskyblue'
    other_border.style.marginLeft = '200%'
}
controls_option.onclick = () => {
    rules_option.style.backgroundColor = 'deepskyblue'
    rules_border.style.marginLeft = '-100%'
    controls_option.style.backgroundColor = 'darkorchid'
    controls_border.style.marginLeft = '0%'
    other_option.style.backgroundColor = 'deepskyblue'
    other_border.style.marginLeft = '100%'
}
other_option.onclick = () => {
    rules_option.style.backgroundColor = 'deepskyblue'
    rules_border.style.marginLeft = '-200%'
    controls_option.style.backgroundColor = 'deepskyblue'
    controls_border.style.marginLeft = '-100%'
    other_option.style.backgroundColor = 'darkorchid'
    other_border.style.marginLeft = '0%'
}