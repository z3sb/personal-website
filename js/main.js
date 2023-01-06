/* Typing Animation Start */
var typed = new Typed('.typing', {
  strings:['', 'Full Stack Web Developer', 'Web Designer', 'Programmer'],
  typeSpeed:100,
  BackSpeed:60,
  loop:true
});
/* Typing Animation End */
/* Aside Start */
const nav = document.querySelector('.nav'),
      navList = document.querySelectorAll('li'),
      totalNavList = navList.length,
      allSection = document.querySelectorAll('.section');

for (let i = 0 ; i < totalNavList; i++){
  const a = navList[i].querySelector('a');
  a.addEventListener('click', function() {
    removeBackSection();
    for(let j = 0 ; j < navList.length; j++) {

      if(navList[j].querySelector('a').classList.contains('active')){
        addBackSection(j)
        // allSection[j].classList.add('back-section');
      }
      navList[j].querySelector('a').classList.remove('active');
    }
    this.classList.add('active');
    showSection(this)
    if(window.innerWidth < 1200){
      asideSectionTogglerButton();
    }
  })
}

function removeBackSection(){
  allSection.forEach(e => e.classList.remove('back-section'))
}

function addBackSection(num){
  allSection[num].classList.add('back-section');
}

function showSection(element){
  const target = element.getAttribute('href');
  allSection.forEach(e => e.classList.remove('active'))
  document.querySelector(target).classList.add('active');
}
function updateNav(element){
  navList.forEach((e) => {
    e.querySelector('a').classList.remove('active');
    let target = element.getAttribute('href');
    if(target === e.querySelector('a').getAttribute('href')){
      e.querySelector('a').classList.add('active')
    }
  })
}
document.querySelector('.hire-me').addEventListener('click', function(){
  const sectionIndex = this.getAttribute('data-section-index');
  showSection(this);
  updateNav(this);
  removeBackSection();
  addBackSection(sectionIndex);
})
const navTogglerButton = document.querySelector('.nav-toggler'),
      aside = document.querySelector('.aside');

navTogglerButton.addEventListener('click', () => {
  asideSectionTogglerButton();
})
function asideSectionTogglerButton(){
  aside.classList.toggle('open');
  navTogglerButton.classList.toggle('open');
  allSection.forEach(e => e.classList.toggle('open'))
}
/* Aside End */