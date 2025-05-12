const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Sample data
const WORDS = ['Giraffe', 'Elephant', 'Kangaroo', 'Penguin', 'Zebra'];
const QUESTIONS = [
  'When was your first kiss?',
  'When did you learn to ride a bike?',
  'When did you get your driver\'s license?'
];

let lobbies = {};

io.on('connection', (socket) => {
  let currentLobby = null;

  socket.on('createLobby', ({ lobbyName, playerName }) => {
    const lobbyCode = Math.random().toString(36).substr(2, 5).toUpperCase();
    lobbies[lobbyCode] = {
      host: socket.id,
      players: [{ id: socket.id, name: playerName, answers: [] }],
      game: null,
      settings: {},
      maxPlayers: 15,
      name: lobbyName,
      gameState: 'waiting',
      currentWord: '',
      imposterCount: 1,
      votes: {}
    };
    currentLobby = lobbyCode;
    socket.join(lobbyCode);
    socket.emit('lobbyJoined', { code: lobbyCode, isHost: true });
  });

  socket.on('joinLobby', ({ code, name }) => {
    const lobby = lobbies[code];
    if (!lobby) return socket.emit('error', 'Lobby not found');
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', 'Lobby full');
    
    lobby.players.push({ id: socket.id, name, answers: [] });
    currentLobby = code;
    socket.join(code);
    io.to(code).emit('lobbyUpdate', lobby);
  });

  socket.on('startGame', ({ gameType, settings }) => {
    const lobby = lobbies[currentLobby];
    if (!lobby || lobby.host !== socket.id) return;
    
    lobby.game = gameType;
    lobby.settings = settings;
    lobby.gameState = 'playing';
    lobby.votes = {};
    
    if (gameType === 'imposters') {
      lobby.currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      const imposters = [];
      while (imposters.length < settings.imposterCount) {
        const randomPlayer = lobby.players[Math.floor(Math.random() * lobby.players.length)];
        if (!imposters.includes(randomPlayer.id)) imposters.push(randomPlayer.id);
      }
      lobby.players.forEach(player => {
        const isImposter = imposters.includes(player.id);
        socket.to(player.id).emit('gameData', { 
          word: isImposter ? '??? (Imposter)' : lobby.currentWord,
          isImposter 
        });
      });
    } else if (gameType === 'guessing') {
      const imposterQuestions = [];
      while (imposterQuestions.length < settings.imposterCount) {
        const randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        if (!imposterQuestions.includes(randomQuestion)) imposterQuestions.push(randomQuestion);
      }
      lobby.players.forEach((player, index) => {
        const isImposter = index < settings.imposterCount;
        socket.to(player.id).emit('gameData', {
          question: isImposter ? imposterQuestions[index % imposterQuestions.length] : QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)],
          isImposter
        });
      });
    }
    
    io.to(currentLobby).emit('gameStarted', lobby);
  });

  socket.on('submitAnswer', (answer) => {
    const lobby = lobbies[currentLobby];
    const player = lobby.players.find(p => p.id === socket.id);
    if (player) player.answers.push(answer);
    io.to(currentLobby).emit('answerUpdate', lobby.players);
  });

  socket.on('submitVote', (votedId) => {
    const lobby = lobbies[currentLobby];
    lobby.votes[socket.id] = votedId;
    if (Object.keys(lobby.votes).length === lobby.players.length) {
      const voteCounts = {};
      Object.values(lobby.votes).forEach(id => voteCounts[id] = (voteCounts[id] || 0) + 1);
      const maxVotes = Math.max(...Object.values(voteCounts));
      const eliminated = Object.keys(voteCounts).find(id => voteCounts[id] === maxVotes);
      io.to(currentLobby).emit('voteResult', eliminated);
    }
  });

  socket.on('disconnect', () => {
    if (currentLobby && lobbies[currentLobby]) {
      lobbies[currentLobby].players = lobbies[currentLobby].players.filter(p => p.id !== socket.id);
      if (lobbies[currentLobby].players.length === 0) {
        delete lobbies[currentLobby];
      } else {
        io.to(currentLobby).emit('lobbyUpdate', lobbies[currentLobby]);
      }
    }
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));