const styleSwitcherToggler = document.querySelector('.style-switcher-toggler');
const switcher = document.querySelector('.style-switcher');
// Open And Close Style Switcher
styleSwitcherToggler.addEventListener('click', () => switcher.classList.toggle('open'))

// Hid Style Switcher on Scroll
window.addEventListener('scroll', () => {
  if(switcher.classList.contains('open')){
    switcher.classList.remove('open')
  }
})
// Change Color
const colorSwitcher = document.getElementById('color-switcher');
const spans = document.querySelectorAll('.style-switcher .colors span');
spans.forEach((e) => {
  e.addEventListener('click', () => {
    colorSwitcher.href = `css/skins/${e.className}.css`;
  })
});

// Them Dark and Light Mode
let dayNight = document.querySelector('.day-night');
dayNight.addEventListener('click', () => {
  dayNight.querySelector('i').classList.toggle('fa-sun');
  dayNight.querySelector('i').classList.toggle('fa-moon');
  document.body.classList.toggle('dark')
})
window.addEventListener('load', () => {
  if (document.body.classList.contains('dark')){
    dayNight.querySelector('i').classList.add('fa-sun')
  } else{
    dayNight.querySelector('i').classList.add('fa-moon')
  }
})