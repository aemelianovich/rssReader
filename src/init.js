import 'bootstrap/dist/css/bootstrap.min.css';

export default () => {
  const bodyEl = document.querySelector('body');
  const divEl = document.createElement('div');
  divEl.textContent = 'Hello World!';

  bodyEl.append(divEl);
}