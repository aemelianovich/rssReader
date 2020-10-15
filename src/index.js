/*eslint-env es6*/
const init = () => {
    const bodyEl = document.querySelector('body');
    const divEl = document.createElement('div');
    divEl.textContent = 'Hello World!';

    bodyEl.append(divEl);
    
};

init();