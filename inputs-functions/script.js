const toggler = document.querySelector('.toggle');
const cloner = document.querySelector('.clone');
const password = document.getElementById('inp1');
const confPassword = document.getElementById('inp2');
const inputs = document.querySelectorAll('.password');

toggler.addEventListener('change', () => {
    inputs.forEach(inp => {
        inp.type = toggler.checked ? 'text' : 'password';
    });
});

cloner.addEventListener('change', () => {
    if (cloner.checked) {
        inputs.forEach(inp => {
            inp.addEventListener('input', syncPasswords);
            confPassword.value = password.value 
        });
    } else {
        inputs.forEach(inp => {
            inp.removeEventListener('input', syncPasswords);
        });
    }
});

function syncPasswords(event) {
    password.value = confPassword.value = event.target.value;
}
