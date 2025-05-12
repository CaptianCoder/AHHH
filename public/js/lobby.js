const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const lobbyCode = urlParams.get('code');
const isHost = urlParams.get('host') === 'true';

let currentGame = null;

socket.emit('joinLobby', { code: lobbyCode });

socket.on('lobbyUpdate', (lobby) => {
    document.getElementById('lobbyName').textContent = lobby.name;
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = lobby.players.map(p => `
        <div class="player-card">
            ${p.name} ${p.id === socket.id ? '(You)' : ''}
            ${lobby.gameState === 'playing' && p.answers.length > 0 ? '✅' : ''}
        </div>
    `).join('');
    
    document.getElementById('gameControls').classList.remove('hidden');
    if (isHost) document.getElementById('gameSelection').classList.remove('hidden');
});

socket.on('gameStarted', (lobby) => {
    currentGame = lobby.game;
    const settingsDiv = document.getElementById('gameSettings');
    settingsDiv.innerHTML = '';
    
    if (lobby.game === 'imposters') {
        document.getElementById('gameInterface').innerHTML = `
            <h3>Word: ${lobby.currentWord}</h3>
            <div id="answers"></div>
            ${!isHost ? '<button onclick="showVoteUI()">Vote</button>' : ''}
        `;
    } else if (lobby.game === 'guessing') {
        document.getElementById('gameInterface').innerHTML = `
            <input type="text" id="answerInput" placeholder="Your answer">
            <button onclick="submitAnswer()">Submit</button>
            <div id="answers"></div>
        `;
    }
});

socket.on('gameData', (data) => {
    if (currentGame === 'imposters') {
        alert(`Your word: ${data.word}\nYou are ${data.isImposter ? 'the IMPOSTER!' : 'a regular player'}`);
    } else {
        alert(`Your question: ${data.question}\nYou are ${data.isImposter ? 'an IMPOSTER!' : 'a regular player'}`);
    }
});

socket.on('answerUpdate', (players) => {
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = players.map(p => `
        <div>${p.name}: ${p.answers[p.answers.length - 1] || 'No answer'}</div>
    `).join('');
});

socket.on('voteResult', (eliminatedId) => {
    const eliminatedPlayer = lobby.players.find(p => p.id === eliminatedId);
    alert(`Voting result: ${eliminatedPlayer?.name} was eliminated!`);
});

function selectGame(gameType) {
    const settingsDiv = document.getElementById('gameSettings');
    let html = `<h3>${gameType === 'imposters' ? 'Imposters' : 'Guessing'} Settings</h3>`;
    
    if (gameType === 'imposters') {
        html += `
            <label>Imposter Count:</label>
            <select id="imposterCount">
                <option>1</option>
                <option>2</option>
                <option>3</option>
            </select>
        `;
    } else {
        html += `
            <label>Imposter Questions:</label>
            <input type="number" id="imposterQuestions" min="1" value="1">
        `;
    }
    
    html += `<button onclick="startGame('${gameType}')">Start Game</button>`;
    settingsDiv.innerHTML = html;
}

function startGame(gameType) {
    const settings = {
        imposterCount: parseInt(document.getElementById('imposterCount')?.value || 1),
        imposterQuestions: parseInt(document.getElementById('imposterQuestions')?.value || 1)
    };
    socket.emit('startGame', { gameType, settings });
}

function submitAnswer() {
    const answer = document.getElementById('answerInput').value;
    socket.emit('submitAnswer', answer);
}

function showVoteUI() {
    const voteUI = lobby.players.map(p => `
        <button onclick="socket.emit('submitVote', '${p.id}')">Vote ${p.name}</button>
    `).join('');
    document.getElementById('gameInterface').innerHTML = voteUI;
}