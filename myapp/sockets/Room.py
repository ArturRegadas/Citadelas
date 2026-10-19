from flask_socketio import emit, join_room, leave_room, rooms
from typing import Dict, Any
from myapp.setup.InitSocket import socket_io
from flask import request, session
from datetime import datetime

@socket_io.on("connect")
def handle_connect():
    user_id = session.get("user_id")
    username = session.get("username", "Anonymous")
    print(f"[WebSocket] Connected: sid={request.sid}, user={username} (id={user_id})", flush=True)
    emit("connected", {
        "status": "connected",
        "sid": request.sid,
        "username": username,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })

@socket_io.on("disconnect")
def handle_disconnect():
    username = session.get("username", "Anonymous")
    print(f"[WebSocket] Disconnected: sid={request.sid}, user={username}", flush=True)

@socket_io.on("join_room")
def handle_join(data: Dict[str, Any]) -> None:
    room_id = data.get("room_id")
    if not room_id:
        emit("error", {"message": "room_id is required"}, to=request.sid)
        return

    username = session.get("username", "Anonymous")
    join_room(room_id)
    print(f"[WebSocket] User '{username}' joined room '{room_id}'", flush=True)

    emit("room_joined", {
        "room_id": room_id,
        "username": username,
        "sid": request.sid,
        "timestamp": datetime.utcnow().isoformat()
    }, to=room_id)

@socket_io.on("leave_room")
def handle_leave(data: Dict[str, Any]) -> None:
    room_id = data.get("room_id")
    if not room_id:
        return

    username = session.get("username", "Anonymous")
    leave_room(room_id)
    print(f"[WebSocket] User '{username}' left room '{room_id}'", flush=True)

    emit("room_left", {
        "room_id": room_id,
        "username": username,
        "timestamp": datetime.utcnow().isoformat()
    }, to=room_id)

@socket_io.on("send_message")
def handle_send_message(data: Dict[str, Any]) -> None:
    room_id = data.get("room_id")
    message = data.get("message", "")
    username = session.get("username", "Anonymous")
    user_id = session.get("user_id")

    payload = {
        "user_id": user_id,
        "username": username,
        "message": message,
        "room_id": room_id,
        "timestamp": datetime.utcnow().isoformat()
    }

    if room_id:
        emit("new_message", payload, to=room_id)
    else:
        emit("new_message", payload, broadcast=True)

@socket_io.on("ping_server")
def handle_ping(data: Dict[str, Any]) -> None:
    emit("pong_server", {
        "message": "pong",
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }, to=request.sid)