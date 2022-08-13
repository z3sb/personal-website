window.addEventListener('load', () => {
  document.body.classList.add(localStorage.getItem('color'));
  document.body.classList.add(localStorage.getItem('theme'));
});
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
const body = document.body;
const spans = document.querySelectorAll('.style-switcher .colors span');
for(let i = 1 ;  i <= spans.length ; i++){
  spans[i - 1].addEventListener('click', () => {
    let classes = body.className.split(' ');
    classes.forEach(e => {
      if (e[0] == `c`){
        body.classList.remove(e);
      }
      localStorage.setItem('color', spans[i - 1].className);
      body.classList.add(localStorage.getItem('color'));
    })
  })
}
// Them Dark and Light Mode
let dayNight = document.querySelector('.day-night');
dayNight.addEventListener('click', () => {
  dayNight.querySelector('i').classList.toggle('fa-sun');
  dayNight.querySelector('i').classList.toggle('fa-moon');
  document.body.classList.toggle('dark');
  if(localStorage.getItem('theme') === 'light'){
    localStorage.setItem('theme', 'dark')
  } else{
    localStorage.setItem('theme', 'light')
  }
})
window.addEventListener('load', () => {
  if (document.body.classList.contains('dark')){
    dayNight.querySelector('i').classList.add('fa-sun')
  } else{
    dayNight.querySelector('i').classList.add('fa-moon')
  }
})