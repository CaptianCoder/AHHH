const socket = io();

function showForm(type) {
    document.getElementById('createForm').classList.toggle('hidden', type !== 'create');
    document.getElementById('joinForm').classList.toggle('hidden', type !== 'join');
}

function createLobby() {
    const lobbyName = document.getElementById('lobbyName').value;
    const playerName = document.getElementById('hostName').value;
    if (!lobbyName || !playerName) return alert('Please fill all fields');
    socket.emit('createLobby', { lobbyName, playerName });
}

function joinLobby() {
    const code = document.getElementById('lobbyCode').value.toUpperCase();
    const name = document.getElementById('playerName').value;
    if (!code || !name) return alert('Please fill all fields');
    socket.emit('joinLobby', { code, name });
}

socket.on('lobbyJoined', ({ code, isHost }) => {
    window.location.href = `/lobby.html?code=${code}&host=${isHost}`;
});

socket.on('error', (message) => {
    alert(message);
});