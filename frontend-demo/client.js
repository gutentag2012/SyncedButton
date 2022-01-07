// noinspection JSCheckFunctionSignatures

import { io } from 'socket.io-client'

const socket = io('http://192.168.178.120:3000')

const loadingPage = document.getElementById('loading-page')
const joinRoomPage = document.getElementById('join-room-page')
const roomPage = document.getElementById('room-page')

const displayPage = page => {
    loadingPage.style.display = page === 'loading' ? 'block' : 'none'
    joinRoomPage.style.display = page === 'join' ? 'block' : 'none'
    roomPage.style.display = page === 'room' ? 'flex' : 'none'
}

socket.on('connect', () => displayPage('join'))

const inputRoomCode = document.getElementById('input-room')
const inputUserName = document.getElementById('input-username')
const formConnect = document.getElementById('form-connect')

const verifyRoom = room => !!room //room.length > 5
const verifyUsername = username => !!username //username.length > 8

let roomCode, username
const roomId = document.getElementById('room-id')
const namesContainer = document.getElementById('names-container')
const btnSend = document.getElementById('btn-send')
const styleLi = (e, winnerBorderWidth) => {
    const elements = document.getElementsByTagName('li')
    for (const element of elements) {
        const match = element.innerText === e
        if (!!winnerBorderWidth) {
            if (match) {
                element.style.outline = `${ winnerBorderWidth }px solid var(--accent)`
            }
            continue
        }
        if (!element.style.outline.includes('white')) {
            element.style.outline = 'None'
        }
        if (match) {
            element.style.outline = '1px solid white'
        }
    }
}

const isMobile = () => {
    return navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|webOS|Opera Mini|IEMobile/i)
}

function sendSignal() {
    socket.emit('click', roomCode)
    btnSend.disabled = true
    styleLi(username)
}

if (isMobile()) {
    btnSend.ontouchstart = sendSignal
} else {
    btnSend.onclick = sendSignal
}

formConnect.onsubmit = e => {
    e.preventDefault()
    roomCode = inputRoomCode.value
    username = inputUserName.value

    if (!verifyRoom(roomCode) || !verifyUsername(username)) {
        return
    }

    roomId.innerText = roomCode

    socket.emit('join-room', {
        username,
        roomCode,
    }, () => {
        btnSend.disabled = false
        displayPage('room')
    })
}

socket.on('player-update', players => {
    namesContainer.innerHTML = ''
    players.forEach(({username}) => {
        const li = document.createElement('li')
        li.innerText = username
        namesContainer.appendChild(li)
    })
})

socket.on('click', styleLi)
socket.on('close-round', ({winners, challengers}) => {
    console.log(winners, challengers)
    challengers.forEach(({username}) => {
        styleLi(username, 1)
    })
    winners.forEach(({username}) => {
        styleLi(username, 4)
    })
    btnSend.disabled = true
    setTimeout(() => btnSend.disabled = false, 2000)
})

socket.on('test', () => console.log('EEEE'))
