/* Typing Animation Start */
var typed = new Typed('.typing', {
  strings:['', 'Programmer', 'Web Developer', 'Web Designer'],
  typeSpeed:100,
  BackSpeed:60,
  loop:true
});
/* Typing Animation End */
/* Aside Start */
const nav = document.querySelector('.nav'),
      navList = document.querySelectorAll('li'),
      totalNavList = navList.length;

for (let i = 0 ; i < totalNavList; i++){
  const a = navList[i];
  a.addEventListener('click', () => {
    this.classList.add('active')
  })
}

/* Aside End */