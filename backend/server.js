// noinspection JSValidateTypes,JSCheckFunctionSignatures

const timeTillDraw = 300
const timeTillChallenge = 5000
const rooms = {}

const io = require('socket.io')(3000, {
    cors: {
        origin: '*',
    },
})

const onDisconnect = socket => () => {
    Object.entries(rooms)
        .filter(([, {players: users}]) => users.some(({id}) => id === socket.id))
        .forEach(([room, {players: users}]) => {
            const index = users.map((e, i) => [e, i])
                .filter(([{id}]) => id === socket.id)
                .map(([, index]) => index)[0]

            console.log(`[${new Date().toLocaleString()}] [Room ${ room }] Player "${ rooms[room].players[index].username }" left`)

            rooms[room].players.splice(index, 1)
            socket.to(room)
                .emit('player-update', rooms[room].players)

            if(rooms[room].players.length > 0)
                return
            delete rooms[room]

            console.log(`[${new Date().toLocaleString()}] [Room ${ room }] Removed room`)
        })
}

const joinRoom = socket => ({roomCode, username}, callback) => {
    let user = {id: socket.id, username}

    socket.join(roomCode)
    if (!(roomCode in rooms)) {
        console.log(`[${new Date().toLocaleString()}] [Room ${ roomCode }] Created room`)
        rooms[roomCode] = {
            players: [],
            times: [],
            timeout: undefined,
        }
    }

    console.log(`[${new Date().toLocaleString()}] [Room ${ roomCode }] Player "${ user.username }" joined`)
    rooms[roomCode].players.push(user)

    socket.to(roomCode)
        .emit('player-update', rooms[roomCode].players)
    socket.emit('player-update', rooms[roomCode].players)

    callback()
}

const getPlayerByIdInRoom = (room, id) => room.players.find(({id: player_id}) => player_id === id)

const checkWinners = (room, socket, roomCode) => () => {
    const endTime = new Date().getTime()
    const clickedPlayers = room.times.map(({id, time}) => ({
        ...getPlayerByIdInRoom(room, id),
        time: endTime - time,
    }))

    const winners = clickedPlayers.filter(({time}) => time > (timeTillChallenge - timeTillDraw))
    const challengers = clickedPlayers.filter(e => !winners.includes(e))
    const result = {challengers, winners}

    console.log(`[${new Date().toLocaleString()}] [Room ${ roomCode }] Round ended with winners: [${ winners.map(({username}) => username) }] and challengers: [${ challengers.map(({username}) => username) }]`)

    socket.emit('close-round', result)
    socket.to(roomCode)
        .emit('close-round', result)

    room.times = []
    clearTimeout(room.timeout)
    room.timeout = undefined
}

const onClick = socket => roomCode => {
    const room = rooms[roomCode]
    if (!room) {
        return
    }
    const time = new Date().getTime()
    const currentPlayer = getPlayerByIdInRoom(room, socket.id)

    console.log(`[${new Date().toLocaleString()}] [Room ${ roomCode }] Player "${ currentPlayer.username }" clicked`)

    room.times.push({
        id: socket.id,
        time,
    })

    socket.to(roomCode)
        .emit('click', currentPlayer.username)

    // Set the timeout only once after the first click
    if (!!room.timeout) {
        return
    }

    room.timeout = setTimeout(checkWinners(room, socket, roomCode), timeTillChallenge)
}

io.on('connection', socket => {
    socket.on('disconnect', onDisconnect(socket))
    socket.on('join-room', joinRoom(socket))
    socket.on('click', onClick(socket))
})