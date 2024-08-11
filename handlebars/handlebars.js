// app.js
async function fetchData() {
    const apiUrl = 'http://localhost:3000/matches';
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        displayData(data);
        console.log(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function displayData(data) {
    const source = document.getElementById('matches-template').innerHTML;
    const template = Handlebars.compile(source);
    const html = template({ matches: data });
    document.getElementById('matches-container').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});