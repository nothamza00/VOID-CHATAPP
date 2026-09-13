// ==========================================
// VOID CHAT - APP.JS
// ==========================================

// ==========================================
// CONFIGURATION
// ==========================================

const SIGNALING_SERVER =
    "wss://approach-power-expensive-comprehensive.trycloudflare.com";


// ==========================================
// UID
// ==========================================

let myUID = localStorage.getItem("void_uid");

if (!myUID) {
    myUID =
        "VOID-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    localStorage.setItem("void_uid", myUID);
}


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let socket = null;

let peerConnection = null;
let dataChannel = null;

let connectedUID = null;
let isCaller = false;

let pendingIceCandidates = [];

let recentUsers =
    JSON.parse(localStorage.getItem("void_recent_users")) || [];

let pendingRequests = [];


// ==========================================
// DOM ELEMENTS
// ==========================================

const myUIDElement =
    document.getElementById("myUID");

const statusElement =
    document.getElementById("status");

const statusDot =
    document.getElementById("statusDot");

const connectButton =
    document.getElementById("connectBtn");

const connectUIDInput =
    document.getElementById("connectUID");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendBtn");

const chatBox =
    document.getElementById("messages");

const recentList =
    document.getElementById("recentList");

const pendingList =
    document.getElementById("pendingList");

const pendingCount =
    document.getElementById("pendingCount");


// ==========================================
// SHOW MY UID
// ==========================================

if (myUIDElement) {
    myUIDElement.textContent = myUID;
}


// ==========================================
// STATUS
// ==========================================

function setStatus(text, type = "normal") {

    if (statusElement) {
        statusElement.textContent = text;
    }

    if (statusDot) {
        statusDot.className = "status-dot";

        if (type === "online") {
            statusDot.classList.add("online");
        }

        if (type === "error") {
            statusDot.classList.add("error");
        }
    }

    console.log("STATUS:", text);
}


// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(message, type = "system") {

    console.log(
        "ADDING MESSAGE TO SCREEN:",
        message,
        type
    );

    if (!chatBox) {
        console.error("CHAT BOX NOT FOUND!");

        // Extra debugging
        console.log(
            "Available message elements:",
            document.querySelectorAll(".messages")
        );

        return;
    }

    // Remove empty message
    const emptyMessage =
        chatBox.querySelector(".empty");

    if (emptyMessage) {
        emptyMessage.remove();
    }


    // Create main message container
    const messageElement =
        document.createElement("div");


    // Sent message
    if (type === "sent") {

        messageElement.className =
            "message mine";

    }

    // Received message
    else if (type === "received") {

        messageElement.className =
            "message received";

    }

    // System message
    else {

        messageElement.className =
            "message";
    }


    // Create message text
    const textElement =
        document.createElement("span");

    textElement.className =
        "message-text";

    textElement.textContent =
        message;


    // Add text inside message
    messageElement.appendChild(
        textElement
    );


    // Add message to chat
    chatBox.appendChild(
        messageElement
    );


    // Scroll to newest message
    chatBox.scrollTop =
        chatBox.scrollHeight;


    console.log(
        "MESSAGE SUCCESSFULLY ADDED TO SCREEN!"
    );
}


// ==========================================
// RECENT USERS
// ==========================================

function addRecentUser(uid) {

    if (!uid) {
        return;
    }

    recentUsers =
        recentUsers.filter(
            user => user !== uid
        );

    recentUsers.unshift(uid);

    recentUsers =
        recentUsers.slice(0, 20);

    localStorage.setItem(
        "void_recent_users",
        JSON.stringify(recentUsers)
    );

    renderRecents();
}


function renderRecents() {

    if (!recentList) {
        return;
    }

    recentList.innerHTML = "";

    if (recentUsers.length === 0) {

        recentList.innerHTML =
            `<div class="empty">NO RECENT USERS</div>`;

        return;
    }


    recentUsers.forEach(uid => {

        const item =
            document.createElement("div");

        item.className =
            "recent-user";

        item.textContent =
            uid;

        item.onclick = () => {

            if (connectUIDInput) {
                connectUIDInput.value =
                    uid;
            }
        };

        recentList.appendChild(item);
    });
}


// ==========================================
// PENDING REQUESTS
// ==========================================

function addPendingRequest(uid) {

    if (!uid) {
        return;
    }

    if (
        !pendingRequests.includes(uid)
    ) {
        pendingRequests.push(uid);
    }

    renderPendingRequests();
}


function removePendingRequest(uid) {

    pendingRequests =
        pendingRequests.filter(
            user => user !== uid
        );

    renderPendingRequests();
}


function renderPendingRequests() {

    if (pendingCount) {

        pendingCount.textContent =
            pendingRequests.length;
    }


    if (!pendingList) {
        return;
    }

    pendingList.innerHTML = "";


    if (pendingRequests.length === 0) {

        pendingList.innerHTML =
            `<div class="empty">NO REQUESTS</div>`;

        return;
    }


    pendingRequests.forEach(uid => {

        const item =
            document.createElement("div");

        item.className =
            "pending-user";


        const name =
            document.createElement("span");

        name.textContent =
            uid;


        const acceptButton =
            document.createElement("button");

        acceptButton.textContent =
            "ACCEPT";

        acceptButton.onclick = () => {

            acceptRequest(uid);
        };


        const rejectButton =
            document.createElement("button");

        rejectButton.textContent =
            "REJECT";

        rejectButton.onclick = () => {

            rejectRequest(uid);
        };


        item.appendChild(name);

        item.appendChild(
            acceptButton
        );

        item.appendChild(
            rejectButton
        );


        pendingList.appendChild(item);
    });
}


// ==========================================
// CONNECT SIGNALING SERVER
// ==========================================

function connectSignalingServer() {

    console.log(
        "Connecting to signaling server..."
    );

    setStatus(
        "SIGNALING CONNECTING...",
        "normal"
    );


    try {

        socket =
            new WebSocket(
                SIGNALING_SERVER
            );

    } catch (error) {

        console.error(
            "WEBSOCKET ERROR:",
            error
        );

        setStatus(
            "SIGNALING ERROR",
            "error"
        );

        return;
    }


    // ======================================
    // SOCKET OPEN
    // ======================================

    socket.onopen = () => {

        console.log(
            "SIGNALING SERVER CONNECTED"
        );

        setStatus(
            "SIGNALING ONLINE",
            "online"
        );


        // Register this user
        socket.send(
            JSON.stringify({
                type: "register",
                uid: myUID
            })
        );
    };


    // ======================================
    // SOCKET MESSAGE
    // ======================================

    socket.onmessage = async event => {

        try {

            const data =
                JSON.parse(event.data);

            console.log(
                "SIGNAL RECEIVED:",
                data
            );


            // ==============================
            // REGISTERED
            // ==============================

            if (data.type === "registered") {

                console.log(
                    "REGISTERED AS:",
                    myUID
                );

                return;
            }


            // ==============================
            // PRESENCE
            // ==============================

            if (
                data.type ===
                "presence"
            ) {

                console.log(
                    "PRESENCE:",
                    data
                );

                return;
            }


            // ==============================
            // REQUEST RECEIVED
            // ==============================

            if (
                data.type ===
                "connection-request"
            ) {

                console.log(
                    "CONNECTION REQUEST FROM:",
                    data.from
                );

                addPendingRequest(
                    data.from
                );

                addMessage(
                    "Connection request from " +
                    data.from,
                    "system"
                );

                return;
            }


            // ==============================
            // REQUEST ACCEPTED
            // ==============================

            if (
                data.type ===
                "request-accepted"
            ) {

                console.log(
                    "REQUEST ACCEPTED BY:",
                    data.from
                );

                connectedUID =
                    data.from;

                isCaller = true;

                addRecentUser(
                    connectedUID
                );

                createPeerConnection();

                createDataChannel();

                createOffer();

                return;
            }


            // ==============================
            // REQUEST REJECTED
            // ==============================

            if (
                data.type ===
                "request-rejected"
            ) {

                console.log(
                    "REQUEST REJECTED BY:",
                    data.from
                );

                setStatus(
                    "REQUEST REJECTED",
                    "error"
                );

                return;
            }


            // ==============================
            // OFFER
            // ==============================

            if (
                data.type ===
                "offer"
            ) {

                console.log(
                    "OFFER RECEIVED FROM:",
                    data.from
                );

                connectedUID =
                    data.from;

                isCaller = false;

                createPeerConnection();

                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        data.offer
                    )
                );


                // Add queued ICE candidates
                await addPendingIceCandidates();


                const answer =
                    await peerConnection.createAnswer();


                await peerConnection.setLocalDescription(
                    answer
                );


                socket.send(
                    JSON.stringify({
                        type: "answer",
                        to: connectedUID,
                        from: myUID,
                        answer: peerConnection.localDescription
                    })
                );

                return;
            }


            // ==============================
            // ANSWER
            // ==============================

            if (
                data.type ===
                "answer"
            ) {

                console.log(
                    "ANSWER RECEIVED FROM:",
                    data.from
                );

                if (!peerConnection) {
                    return;
                }


                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(
                        data.answer
                    )
                );


                await addPendingIceCandidates();

                return;
            }


            // ==============================
            // ICE CANDIDATE
            // ==============================

            if (
                data.type ===
                "ice-candidate"
            ) {

                console.log(
                    "ICE CANDIDATE RECEIVED"
                );


                if (
                    peerConnection &&
                    peerConnection.remoteDescription
                ) {

                    try {

                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(
                                data.candidate
                            )
                        );

                    } catch (error) {

                        console.error(
                            "ICE ERROR:",
                            error
                        );
                    }

                } else {

                    pendingIceCandidates.push(
                        data.candidate
                    );

                }

                return;
            }
        }

        catch (error) {

            console.error(
                "SIGNAL MESSAGE ERROR:",
                error
            );
        }
    };


    // ======================================
    // SOCKET CLOSE
    // ======================================

    socket.onclose = () => {

        console.log(
            "SIGNALING SERVER DISCONNECTED"
        );

        setStatus(
            "SIGNALING OFFLINE",
            "error"
        );
    };


    // ======================================
    // SOCKET ERROR
    // ======================================

    socket.onerror = error => {

        console.error(
            "WEBSOCKET ERROR:",
            error
        );

        setStatus(
            "SIGNALING ERROR",
            "error"
        );
    };
}


// ==========================================
// SEND CONNECTION REQUEST
// ==========================================

function sendConnectionRequest() {

    if (!socket) {

        setStatus(
            "SIGNALING NOT CONNECTED",
            "error"
        );

        return;
    }


    if (
        socket.readyState !==
        WebSocket.OPEN
    ) {

        setStatus(
            "SIGNALING NOT CONNECTED",
            "error"
        );

        return;
    }


    if (!connectUIDInput) {
        return;
    }


    const targetUID =
        connectUIDInput.value
            .trim()
            .toUpperCase();


    if (!targetUID) {

        setStatus(
            "ENTER USER UID",
            "error"
        );

        return;
    }


    if (targetUID === myUID) {

        setStatus(
            "CANNOT CONNECT TO YOURSELF",
            "error"
        );

        return;
    }


    console.log(
        "SENDING REQUEST TO:",
        targetUID
    );


    socket.send(
        JSON.stringify({
            type: "connection-request",
            to: targetUID,
            from: myUID
        })
    );


    setStatus(
        "REQUEST SENT",
        "online"
    );
}


// ==========================================
// ACCEPT REQUEST
// ==========================================

function acceptRequest(uid) {

    console.log(
        "ACCEPTING REQUEST:",
        uid
    );


    removePendingRequest(uid);

    connectedUID =
        uid;

    isCaller = false;


    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({
                type: "request-accepted",
                to: uid,
                from: myUID
            })
        );
    }


    addRecentUser(uid);

    createPeerConnection();

    setStatus(
        "WAITING FOR P2P...",
        "normal"
    );
}


// ==========================================
// REJECT REQUEST
// ==========================================

function rejectRequest(uid) {

    console.log(
        "REJECTING REQUEST:",
        uid
    );


    removePendingRequest(uid);


    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({
                type: "request-rejected",
                to: uid,
                from: myUID
            })
        );
    }
}


// ==========================================
// CREATE PEER CONNECTION
// ==========================================

function createPeerConnection() {

    console.log(
        "CREATING PEER CONNECTION"
    );


    // Close old connection
    if (peerConnection) {

        try {
            peerConnection.close();
        } catch (error) {
            console.log(error);
        }
    }


    const rtcConfig = {

        iceServers: [

            {
                urls:
                    "stun:stun.l.google.com:19302"
            }

        ]
    };


    peerConnection =
        new RTCPeerConnection(
            rtcConfig
        );


    // ======================================
    // ICE
    // ======================================

    peerConnection.onicecandidate =
        event => {

            if (
                event.candidate &&
                socket &&
                socket.readyState ===
                WebSocket.OPEN &&
                connectedUID
            ) {

                socket.send(
                    JSON.stringify({
                        type: "ice-candidate",
                        to: connectedUID,
                        from: myUID,
                        candidate: event.candidate
                    })
                );
            }
        };


    // ======================================
    // ICE STATE
    // ======================================

    peerConnection.oniceconnectionstatechange =
        () => {

            console.log(
                "ICE STATE:",
                peerConnection.iceConnectionState
            );
        };


    // ======================================
    // CONNECTION STATE
    // ======================================

    peerConnection.onconnectionstatechange =
        () => {

            console.log(
                "PEER CONNECTION STATE:",
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
            }


            if (
                peerConnection.connectionState ===
                "disconnected"
            ) {

                setStatus(
                    "P2P DISCONNECTED",
                    "error"
                );
            }


            if (
                peerConnection.connectionState ===
                "failed"
            ) {

                setStatus(
                    "P2P CONNECTION FAILED",
                    "error"
                );
            }
        };


    // ======================================
    // REMOTE DATA CHANNEL
    // ======================================

    peerConnection.ondatachannel =
        event => {

            console.log(
                "REMOTE DATA CHANNEL RECEIVED"
            );

            dataChannel =
                event.channel;

            setupDataChannel();
        };
}


// ==========================================
// CREATE DATA CHANNEL
// ==========================================

function createDataChannel() {

    if (!peerConnection) {

        console.error(
            "NO PEER CONNECTION"
        );

        return;
    }


    if (
        dataChannel &&
        dataChannel.readyState !==
        "closed"
    ) {

        console.log(
            "DATA CHANNEL ALREADY EXISTS"
        );

        return;
    }


    console.log(
        "CREATING DATA CHANNEL"
    );


    dataChannel =
        peerConnection.createDataChannel(
            "void-chat"
        );


    setupDataChannel();
}


// ==========================================
// SETUP DATA CHANNEL
// ==========================================

function setupDataChannel() {

    if (!dataChannel) {

        console.error(
            "NO DATA CHANNEL"
        );

        return;
    }


    console.log(
        "SETTING UP DATA CHANNEL"
    );


    dataChannel.onopen = () => {

        console.log(
            "================================="
        );

        console.log(
            "DATA CHANNEL OPEN"
        );

        console.log(
            "CONNECTED TO:",
            connectedUID
        );

        console.log(
            "================================="
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


    // ======================================
    // MESSAGE RECEIVED
    // ======================================

    dataChannel.onmessage =
        event => {

            console.log(
                "MESSAGE RECEIVED:",
                event.data
            );


            addMessage(
                event.data,
                "received"
            );
        };


    // ======================================
    // CLOSE
    // ======================================

    dataChannel.onclose = () => {

        console.log(
            "DATA CHANNEL CLOSED"
        );

        setStatus(
            "P2P DISCONNECTED",
            "error"
        );
    };


    // ======================================
    // ERROR
    // ======================================

    dataChannel.onerror =
        error => {

            console.error(
                "DATA CHANNEL ERROR:",
                error
            );
        };
}


// ==========================================
// CREATE OFFER
// ==========================================

async function createOffer() {

    if (!peerConnection) {

        console.error(
            "NO PEER CONNECTION FOR OFFER"
        );

        return;
    }


    try {

        console.log(
            "CREATING OFFER..."
        );


        const offer =
            await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );


        socket.send(
            JSON.stringify({
                type: "offer",
                to: connectedUID,
                from: myUID,
                offer: peerConnection.localDescription
            })
        );


        console.log(
            "OFFER SENT"
        );

    }

    catch (error) {

        console.error(
            "OFFER ERROR:",
            error
        );
    }
}


// ==========================================
// ADD PENDING ICE
// ==========================================

async function addPendingIceCandidates() {

    if (!peerConnection) {
        return;
    }


    if (
        !peerConnection.remoteDescription
    ) {
        return;
    }


    while (
        pendingIceCandidates.length > 0
    ) {

        const candidate =
            pendingIceCandidates.shift();


        try {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    candidate
                )
            );

        }

        catch (error) {

            console.error(
                "PENDING ICE ERROR:",
                error
            );
        }
    }
}


// ==========================================
// SEND MESSAGE
// ==========================================

function sendMessage() {

    console.log(
        "================================="
    );

    console.log(
        "SEND BUTTON CLICKED"
    );


    if (!messageInput) {

        console.error(
            "MESSAGE INPUT NOT FOUND!"
        );

        return;
    }


    const message =
        messageInput.value.trim();


    console.log(
        "MESSAGE:",
        message
    );


    console.log(
        "DATA CHANNEL:",
        dataChannel
    );


    if (!message) {

        console.log(
            "MESSAGE EMPTY"
        );

        return;
    }


    if (!dataChannel) {

        console.error(
            "DATA CHANNEL DOES NOT EXIST!"
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


    if (
        dataChannel.readyState !==
        "open"
    ) {

        console.error(
            "DATA CHANNEL IS NOT OPEN"
        );

        setStatus(
            "NO P2P CONNECTION",
            "error"
        );

        return;
    }


    try {

        // Send through WebRTC
        dataChannel.send(
            message
        );


        console.log(
            "MESSAGE SENT SUCCESSFULLY:",
            message
        );


        // Show on sender screen
        addMessage(
            message,
            "sent"
        );


        // Clear input
        messageInput.value = "";


        console.log(
            "SENDER MESSAGE DISPLAYED"
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


// ==========================================
// ENTER TO SEND
// ==========================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        event => {

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


// ==========================================
// SEND BUTTON
// ==========================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            sendMessage();
        }
    );


    // Mobile touch support
    sendButton.addEventListener(
        "touchend",
        event => {

            event.preventDefault();

            sendMessage();
        },
        {
            passive: false
        }
    );
}


// ==========================================
// CONNECT BUTTON
// ==========================================

if (connectButton) {

    connectButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            sendConnectionRequest();
        }
    );


    connectButton.addEventListener(
        "touchend",
        event => {

            event.preventDefault();

            sendConnectionRequest();
        },
        {
            passive: false
        }
    );
}


// ==========================================
// INITIALIZE
// ==========================================

console.log(
    "================================="
);

console.log(
    "VOID CHAT INITIALIZING"
);

console.log(
    "MY UID:",
    myUID
);

console.log(
    "SIGNALING SERVER:",
    SIGNALING_SERVER
);

console.log(
    "================================="
);


renderRecents();

renderPendingRequests();

connectSignalingServer();

