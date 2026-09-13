
// ========================================
// VOID SIGNALING + WEBRTC CLIENT
// ========================================


// ========================================
// CONFIGURATION
// ========================================

const SIGNALING_SERVER =
    "wss://approach-power-expensive-comprehensive.trycloudflare.com";


// ========================================
// USER UID
// ========================================

let myUID =
    localStorage.getItem("void_uid");

if (!myUID) {

    myUID =
        "VOID-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    localStorage.setItem(
        "void_uid",
        myUID
    );
}


// ========================================
// WEBSOCKET
// ========================================

let socket = null;


// ========================================
// WEBRTC
// ========================================

let peerConnection = null;

let dataChannel = null;

let connectedUID = null;

let isCaller = false;


// ========================================
// ICE QUEUE
// ========================================

let pendingIceCandidates = [];


// ========================================
// WEBRTC CONFIG
// ========================================

const rtcConfig = {

    iceServers: [

        {
            urls: "stun:stun.l.google.com:19302"
        }

    ]

};


// ========================================
// RECENTS
// ========================================

const RECENTS_KEY =
    "void_recent_users";

let recentUsers = [];

try {

    const saved =
        localStorage.getItem(
            RECENTS_KEY
        );

    if (saved) {

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {

            recentUsers =
                parsed
                    .filter(
                        uid =>
                            typeof uid === "string" &&
                            uid &&
                            uid !== myUID
                    )
                    .slice(0, 20);

        }

    }

}
catch (error) {

    recentUsers = [];

}


// ========================================
// PRESENCE
// ========================================

const presenceStatus =
    new Map();


// ========================================
// DOM ELEMENTS
// ========================================

const myUidElement =
    document.getElementById("myUID");

const targetUidInput =
    document.getElementById("targetUID");

const connectButton =
    document.getElementById("connectBtn");

const connectionStatus =
    document.getElementById("connectionStatus");

const chatBox =
    document.getElementById("chatBox");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendBtn");

const pendingCount =
    document.getElementById("pendingCount");

const pendingList =
    document.getElementById("pendingList");

const recentUsersElement =
    document.getElementById("recentUsers");

const recentCount =
    document.getElementById("recentCount");


// ========================================
// DISPLAY MY UID
// ========================================

if (myUidElement) {

    myUidElement.textContent =
        myUID;

}


// ========================================
// PENDING REQUESTS
// ========================================

let pendingRequests = [];


// ========================================
// SAVE RECENTS
// ========================================

function saveRecentUsers() {

    localStorage.setItem(
        RECENTS_KEY,
        JSON.stringify(recentUsers)
    );

}


// ========================================
// ADD USER TO RECENTS
// ========================================

function addRecentUser(uid) {

    if (!uid) {
        return;
    }

    if (uid === myUID) {
        return;
    }

    recentUsers =
        recentUsers.filter(
            user => user !== uid
        );

    recentUsers.unshift(uid);

    recentUsers =
        recentUsers.slice(0, 20);

    saveRecentUsers();

    renderRecents();

    watchRecentPresence();

}


// ========================================
// GET PRESENCE LABEL
// ========================================

function getPresenceLabel(uid) {

    if (
        presenceStatus.has(uid) &&
        presenceStatus.get(uid) === true
    ) {

        return "ONLINE";

    }

    return "OFFLINE";

}


// ========================================
// RENDER RECENTS
// ========================================

function renderRecents() {

    if (!recentUsersElement) {
        return;
    }

    if (recentCount) {

        recentCount.textContent =
            recentUsers.length;

    }

    recentUsersElement.innerHTML = "";

    if (recentUsers.length === 0) {

        recentUsersElement.innerHTML =
            `<div class="recent-empty">
                NO RECENT CHATS
            </div>`;

        return;

    }

    recentUsers.forEach(uid => {

        const item =
            document.createElement("button");

        item.type = "button";

        item.className =
            "recent-item";

        const online =
            presenceStatus.get(uid) === true;

        item.innerHTML = `

            <span class="recent-user">

                <span class="recent-dot ${
                    online ? "online" : ""
                }"></span>

                <span class="recent-uid">
                    ${uid}
                </span>

            </span>

            <span class="recent-presence">
                ${online ? "ONLINE" : "OFFLINE"}
            </span>

        `;

        item.addEventListener(
            "click",
            () => {

                connectToRecentUser(uid);

            }
        );

        recentUsersElement.appendChild(
            item
        );

    });

}


// ========================================
// WATCH RECENT USER PRESENCE
// ========================================

function watchRecentPresence() {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        return;

    }

    const uids =
        recentUsers.filter(
            uid => uid !== myUID
        );

    socket.send(
        JSON.stringify({

            type:
                "watch-presence",

            uids:
                uids

        })
    );

}


// ========================================
// UPDATE PRESENCE
// ========================================

function updatePresence(
    uid,
    online
) {

    if (!uid) {
        return;
    }

    presenceStatus.set(
        uid,
        online
    );

    renderRecents();

}


// ========================================
// PENDING COUNT
// ========================================

function updatePendingCount() {

    if (!pendingCount) {
        return;
    }

    pendingCount.textContent =
        pendingRequests.length;

}


// ========================================
// RENDER PENDING REQUESTS
// ========================================

function renderPendingRequests() {

    if (!pendingList) {
        return;
    }

    pendingList.innerHTML = "";

    if (
        pendingRequests.length === 0
    ) {

        pendingList.innerHTML =
            `<div class="panel-empty">
                NO PENDING REQUESTS
            </div>`;

        updatePendingCount();

        return;

    }

    pendingRequests.forEach(request => {

        const card =
            document.createElement("div");

        card.className =
            "pending-request-card";

        const user =
            document.createElement("div");

        user.className =
            "pending-request-user";

        user.textContent =
            request.from;

        const buttons =
            document.createElement("div");

        buttons.className =
            "pending-request-buttons";

        const acceptButton =
            document.createElement("button");

        acceptButton.type =
            "button";

        acceptButton.textContent =
            "ACCEPT";

        acceptButton.className =
            "pending-accept";

        const rejectButton =
            document.createElement("button");

        rejectButton.type =
            "button";

        rejectButton.textContent =
            "REJECT";

        rejectButton.className =
            "pending-reject";

        acceptButton.addEventListener(
            "click",
            () => {

                acceptRequest(
                    request.from
                );

            }
        );

        rejectButton.addEventListener(
            "click",
            () => {

                rejectRequest(
                    request.from
                );

            }
        );

        buttons.appendChild(
            acceptButton
        );

        buttons.appendChild(
            rejectButton
        );

        card.appendChild(
            user
        );

        card.appendChild(
            buttons
        );

        pendingList.appendChild(
            card
        );

    });

    updatePendingCount();

}


// ========================================
// ADD PENDING REQUEST
// ========================================

function addPendingRequest(
    uid,
    timestamp
) {

    if (!uid) {
        return;
    }

    const exists =
        pendingRequests.some(
            request =>
                request.from === uid
        );

    if (exists) {
        return;
    }

    pendingRequests.push({

        from:
            uid,

        timestamp:
            timestamp ||
            Date.now()

    });

    renderPendingRequests();

}


// ========================================
// REMOVE PENDING REQUEST
// ========================================

function removePendingRequest(uid) {

    pendingRequests =
        pendingRequests.filter(
            request =>
                request.from !== uid
        );

    renderPendingRequests();

}


// ========================================
// CONNECT TO RECENT USER
// ========================================

function connectToRecentUser(uid) {

    if (!uid) {
        return;
    }

    if (targetUidInput) {

        targetUidInput.value =
            uid;

    }

    sendConnectionRequestTo(uid);

}


// ========================================
// SET CONNECTION STATUS
// ========================================

function setStatus(
    text,
    type = ""
) {

    if (!connectionStatus) {
        return;
    }

    connectionStatus.textContent =
        text;

    connectionStatus.className =
        "connection-status " +
        type;

}


// ========================================
// ADD MESSAGE TO CHAT
// ========================================

function addMessage(
    message,
    type = "system"
) {

    if (!chatBox) {
        return;
    }

    const messageElement =
        document.createElement("div");

    messageElement.className =
        "message " +
        type;

    messageElement.textContent =
        message;

    chatBox.appendChild(
        messageElement
    );

    chatBox.scrollTop =
        chatBox.scrollHeight;

}


// ========================================
// CONNECT WEBSOCKET
// ========================================

function connectSignalingServer() {

    if (
        socket &&
        (
            socket.readyState ===
                WebSocket.OPEN
            ||
            socket.readyState ===
                WebSocket.CONNECTING
        )
    ) {

        return;

    }

    setStatus(
        "CONNECTING TO VOID...",
        "connecting"
    );

    console.log(
        "Connecting to:",
        SIGNALING_SERVER
    );

    socket =
        new WebSocket(
            SIGNALING_SERVER
        );


    // ====================================
    // OPEN
    // ====================================

    socket.onopen = () => {

        console.log(
            "Connected to signaling server"
        );

        setStatus(
            "SIGNALING ONLINE",
            "online"
        );

        socket.send(
            JSON.stringify({

                type:
                    "register",

                uid:
                    myUID

            })
        );

        setTimeout(
            () => {

                watchRecentPresence();

            },
            100
        );

    };


    // ====================================
    // MESSAGE
    // ====================================

    socket.onmessage = (
        event
    ) => {

        try {

            const message =
                JSON.parse(
                    event.data
                );

            handleServerMessage(
                message
            );

        }
        catch (error) {

            console.error(
                "Invalid server message",
                error
            );

        }

    };


    // ====================================
    // CLOSE
    // ====================================

    socket.onclose = (
        event
    ) => {

        console.log(
            "Disconnected from signaling server",
            event.code,
            event.reason
        );

        setStatus(
            "SIGNALING OFFLINE",
            "offline"
        );

    };


    // ====================================
    // ERROR
    // ====================================

    socket.onerror = (
        error
    ) => {

        console.error(
            "WebSocket error:",
            error
        );

        setStatus(
            "SIGNALING ERROR",
            "error"
        );

    };

}


// ========================================
// HANDLE SERVER MESSAGE
// ========================================

function handleServerMessage(
    message
) {

    console.log(
        "SERVER:",
        message
    );


    // ====================================
    // REGISTERED
    // ====================================

    if (
        message.type ===
        "registered"
    ) {

        console.log(
            "Registered as:",
            message.uid
        );

        setStatus(
            "READY",
            "online"
        );

        watchRecentPresence();

        return;

    }


    // ====================================
    // ERROR
    // ====================================

    if (
        message.type ===
        "error"
    ) {

        console.log(
            "Server error:",
            message.message
        );

        if (
            message.message ===
            "USER_NOT_ONLINE"
        ) {

            setStatus(
                "USER OFFLINE",
                "offline"
            );

            addMessage(
                "That user is currently offline.",
                "system"
            );

        }
        else {

            setStatus(
                message.message,
                "error"
            );

        }

        return;

    }


    // ====================================
    // PRESENCE
    // ====================================

    if (
        message.type ===
        "presence"
    ) {

        updatePresence(
            message.uid,
            message.online
        );

        return;

    }


    // ====================================
    // PRESENCE STATUS
    // ====================================

    if (
        message.type ===
        "presence-status"
    ) {

        updatePresence(
            message.uid,
            message.online
        );

        return;

    }


    // ====================================
    // PENDING REQUEST
    // ====================================

    if (
        message.type ===
        "pending-request"
    ) {

        addPendingRequest(
            message.from,
            message.timestamp
        );

        addMessage(
            `Connection request from ${message.from}`,
            "system"
        );

        return;

    }


    // ====================================
    // REQUEST STATUS
    // ====================================

    if (
        message.type ===
        "request-status"
    ) {

        if (
            message.status ===
            "pending"
        ) {

            if (
                message.online === false
            ) {

                setStatus(
                    "REQUEST SAVED — USER OFFLINE",
                    "offline"
                );

            }
            else {

                setStatus(
                    "REQUEST SENT",
                    "connecting"
                );

            }

        }

        return;

    }


    // ====================================
    // SIGNAL
    // ====================================

    if (
        message.type ===
        "signal"
    ) {

        handleSignal(
            message
        );

    }

}


// ========================================
// HANDLE SIGNAL
// ========================================

function handleSignal(
    message
) {

    const from =
        message.from;

    const data =
        message.data;

    if (!from || !data) {
        return;
    }


    // ====================================
    // CONNECTION REQUEST
    // ====================================

    if (
        data.action ===
        "connection-request"
    ) {

        addPendingRequest(
            from,
            Date.now()
        );

        return;

    }


    // ====================================
    // CONNECTION ACCEPTED
    // ====================================

    if (
        data.action ===
        "connection-accepted"
    ) {

        removePendingRequest(
            from
        );

        connectedUID =
            from;

        isCaller =
            true;

        createOffer(
            from
        );

        return;

    }


    // ====================================
    // CONNECTION REJECTED
    // ====================================

    if (
        data.action ===
        "connection-rejected"
    ) {

        removePendingRequest(
            from
        );

        setStatus(
            "REQUEST REJECTED",
            "error"
        );

        addMessage(
            `${from} rejected the connection request.`,
            "system"
        );

        return;

    }


    // ====================================
    // WEBRTC OFFER
    // ====================================

    if (
        data.type ===
        "offer"
    ) {

        receiveOffer(
            from,
            data.offer
        );

        return;

    }


    // ====================================
    // WEBRTC ANSWER
    // ====================================

    if (
        data.type ===
        "answer"
    ) {

        receiveAnswer(
            data.answer
        );

        return;

    }


    // ====================================
    // ICE CANDIDATE
    // ====================================

    if (
        data.type ===
        "ice-candidate"
    ) {

        receiveIceCandidate(
            data.candidate
        );

        return;

    }

}


// ========================================
// SEND CONNECTION REQUEST
// ========================================

function sendConnectionRequest() {

    if (!targetUidInput) {
        return;
    }

    const uid =
        targetUidInput.value
            .trim()
            .toUpperCase();

    sendConnectionRequestTo(
        uid
    );

}


// ========================================
// SEND REQUEST TO UID
// ========================================

function sendConnectionRequestTo(
    uid
) {

    if (!uid) {

        setStatus(
            "ENTER A UID",
            "error"
        );

        return;

    }

    if (uid === myUID) {

        setStatus(
            "YOU CANNOT CONNECT TO YOURSELF",
            "error"
        );

        return;

    }

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        setStatus(
            "SIGNALING SERVER OFFLINE",
            "error"
        );

        return;

    }

    socket.send(
        JSON.stringify({

            type:
                "signal",

            to:
                uid,

            data: {

                action:
                    "connection-request"

            }

        })
    );

    setStatus(
        "SENDING REQUEST...",
        "connecting"
    );

    console.log(
        `Connection request sent to ${uid}`
    );

}


// ========================================
// ACCEPT REQUEST
// ========================================

function acceptRequest(
    uid
) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        setStatus(
            "SIGNALING SERVER OFFLINE",
            "error"
        );

        return;

    }

    removePendingRequest(
        uid
    );

    connectedUID =
        uid;

    isCaller =
        false;

    socket.send(
        JSON.stringify({

            type:
                "signal",

            to:
                uid,

            data: {

                action:
                    "connection-accepted"

            }

        })
    );

    setStatus(
        "REQUEST ACCEPTED",
        "connecting"
    );

    addMessage(
        `Accepted connection from ${uid}.`,
        "system"
    );

}


// ========================================
// REJECT REQUEST
// ========================================

function rejectRequest(
    uid
) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        return;

    }

    removePendingRequest(
        uid
    );

    socket.send(
        JSON.stringify({

            type:
                "signal",

            to:
                uid,

            data: {

                action:
                    "connection-rejected"

            }

        })
    );

    setStatus(
        "REQUEST REJECTED",
        "error"
    );

    addMessage(
        `Rejected request from ${uid}.`,
        "system"
    );

}


// ========================================
// CREATE PEER CONNECTION
// ========================================

function createPeerConnection(
    remoteUID
) {

    connectedUID =
        remoteUID;

    pendingIceCandidates = [];

    peerConnection =
        new RTCPeerConnection(
            rtcConfig
        );


    // ====================================
    // ICE
    // ====================================

    peerConnection.onicecandidate =
        (event) => {

            if (
                event.candidate &&
                connectedUID
            ) {

                sendSignal(
                    connectedUID,
                    {

                        type:
                            "ice-candidate",

                        candidate:
                            event.candidate

                    }
                );

            }

        };


    // ====================================
    // CONNECTION STATE
    // ====================================

    peerConnection.onconnectionstatechange =
        () => {

            console.log(
                "WebRTC state:",
                peerConnection.connectionState
            );

            if (
                peerConnection.connectionState ===
                "connected"
            ) {

                setStatus(
                    "P2P CONNECTED",
                    "online"
                );

                addMessage(
                    `Secure P2P connection established with ${connectedUID}.`,
                    "system"
                );

                addRecentUser(
                    connectedUID
                );

            }

            if (
                peerConnection.connectionState ===
                    "disconnected"
                ||
                peerConnection.connectionState ===
                    "failed"
                ||
                peerConnection.connectionState ===
                    "closed"
            ) {

                setStatus(
                    "P2P DISCONNECTED",
                    "offline"
                );

            }

        };


    // ====================================
    // DATA CHANNEL
    // ====================================

    peerConnection.ondatachannel =
        (event) => {

            dataChannel =
                event.channel;

            setupDataChannel();

        };


    return peerConnection;

}


// ========================================
// CREATE DATA CHANNEL
// ========================================

function createDataChannel() {

    if (!peerConnection) {
        return;
    }

    dataChannel =
        peerConnection.createDataChannel(
            "void-chat"
        );

    setupDataChannel();

}


// ========================================
// SETUP DATA CHANNEL
// ========================================

function setupDataChannel() {

    if (!dataChannel) {
        return;
    }

    dataChannel.onopen =
        () => {

            console.log(
                "DataChannel OPEN"
            );

            setStatus(
                "P2P CONNECTED",
                "online"
            );

            if (connectedUID) {

                addRecentUser(
                    connectedUID
                );

            }

        };


    dataChannel.onmessage =
        (event) => {

            console.log(
                "MESSAGE RECEIVED:",
                event.data
            );

            addMessage(
                event.data,
                "received"
            );

        };


    dataChannel.onclose =
        () => {

            console.log(
                "DataChannel closed"
            );

            setStatus(
                "CHAT DISCONNECTED",
                "offline"
            );

        };


    dataChannel.onerror =
        (error) => {

            console.error(
                "DataChannel error:",
                error
            );

        };

}


// ========================================
// SEND SIGNAL
// ========================================

function sendSignal(
    to,
    data
) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        console.error(
            "Cannot send signal: WebSocket offline"
        );

        return;

    }

    socket.send(
        JSON.stringify({

            type:
                "signal",

            to:
                to,

            data:
                data

        })
    );

}


// ========================================
// CREATE OFFER
// ========================================

async function createOffer(
    remoteUID
) {

    try {

        if (!peerConnection) {

            createPeerConnection(
                remoteUID
            );

        }

        createDataChannel();

        const offer =
            await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
            offer
        );

        sendSignal(
            remoteUID,
            {

                type:
                    "offer",

                offer:
                    offer

            }
        );

        setStatus(
            "CONNECTING P2P...",
            "connecting"
        );

    }
    catch (error) {

        console.error(
            "Offer error:",
            error
        );

        setStatus(
            "OFFER FAILED",
            "error"
        );

    }

}


// ========================================
// RECEIVE OFFER
// ========================================

async function receiveOffer(
    remoteUID,
    offer
) {

    try {

        if (!peerConnection) {

            createPeerConnection(
                remoteUID
            );

        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                offer
            )
        );


        // Add ICE candidates that
        // arrived before the offer.
        for (
            const candidate of
            pendingIceCandidates
        ) {

            try {

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );

            }
            catch (error) {

                console.error(
                    "Queued ICE error:",
                    error
                );

            }

        }

        pendingIceCandidates = [];


        const answer =
            await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
            answer
        );

        sendSignal(
            remoteUID,
            {

                type:
                    "answer",

                answer:
                    answer

            }
        );

        setStatus(
            "CONNECTING P2P...",
            "connecting"
        );

    }
    catch (error) {

        console.error(
            "Receive offer error:",
            error
        );

        setStatus(
            "OFFER ERROR",
            "error"
        );

    }

}


// ========================================
// RECEIVE ANSWER
// ========================================

async function receiveAnswer(
    answer
) {

    try {

        if (!peerConnection) {
            return;
        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                answer
            )
        );


        // Add ICE candidates that
        // arrived before the answer.
        for (
            const candidate of
            pendingIceCandidates
        ) {

            try {

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        candidate
                    )
                );

            }
            catch (error) {

                console.error(
                    "Queued ICE error:",
                    error
                );

            }

        }

        pendingIceCandidates = [];


        console.log(
            "Remote answer received"
        );

    }
    catch (error) {

        console.error(
            "Answer error:",
            error
        );

    }

}


// ========================================
// RECEIVE ICE
// ========================================

async function receiveIceCandidate(
    candidate
) {

    try {

        if (!candidate) {
            return;
        }

        if (
            !peerConnection ||
            !peerConnection.remoteDescription
        ) {

            pendingIceCandidates.push(
                candidate
            );

            return;

        }

        await peerConnection.addIceCandidate(
            new RTCIceCandidate(
                candidate
            )
        );

    }
    catch (error) {

        console.error(
            "ICE candidate error:",
            error
        );

    }

}


// ========================================
// SEND CHAT MESSAGE
// ========================================

function sendMessage() {

    console.log("=================================");
    console.log("SEND BUTTON CLICKED");

    // Check input
    if (!messageInput) {

        console.error(
            "ERROR: messageInput not found!"
        );

        return;

    }

    // Get message
    const message =
        messageInput.value.trim();

    console.log(
        "MESSAGE:",
        message
    );

    // Check data channel
    console.log(
        "DATA CHANNEL:",
        dataChannel
    );

    if (!dataChannel) {

        console.error(
            "ERROR: DataChannel does not exist!"
        );

        setStatus(
            "NO P2P CONNECTION",
            "error"
        );

        return;

    }

    console.log(
        "DATA CHANNEL STATE:",
        dataChannel.readyState
    );

    // Empty message
    if (!message) {

        console.log(
            "Message is empty."
        );

        return;

    }

    // DataChannel must be open
    if (
        dataChannel.readyState !==
        "open"
    ) {

        console.error(
            "Cannot send message. DataChannel state:",
            dataChannel.readyState
        );

        setStatus(
            "NO P2P CONNECTION",
            "error"
        );

        return;

    }

    // Try to send
    try {

        dataChannel.send(
            message
        );

        console.log(
            "MESSAGE SENT SUCCESSFULLY:",
            message
        );

        // Show message on sender
        addMessage(
            message,
            "sent"
        );

        // Clear input
        messageInput.value = "";

        console.log(
            "Sender message displayed."
        );

    }
    catch (error) {

        console.error(
            "MESSAGE SEND ERROR:",
            error
        );

        setStatus(
            "MESSAGE FAILED",
            "error"
        );

    }

    console.log(
        "================================="
    );

}


// ========================================
// SEND BUTTON
// ========================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

}


// ========================================
// ENTER KEY
// ========================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


// ========================================
// CONNECT BUTTON
// ========================================

if (connectButton) {

    connectButton.addEventListener(
        "click",
        sendConnectionRequest
    );

}


// ========================================
// INITIALIZE
// ========================================

renderRecents();

renderPendingRequests();

connectSignalingServer();

