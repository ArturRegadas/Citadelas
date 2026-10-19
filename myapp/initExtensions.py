from myapp.extensions import *
from flask import Flask
from flask_socketio import SocketIO

def init_extensions(app: Flask) -> SocketIO:

    db = init_db(app)

    create_tables(app, db)

    init_cache(app)

    socket_io = init_socket(app)
    create_SocketEvents()

    init_authDecorator(app)

    register_routes(app)
    register_handlers(app)

    return socket_io
