from myapp import create_app
import os

app, socketIo = create_app()

if __name__ == "__main__":
    socketIo.run(
    app,
    host="0.0.0.0",
    port=int(os.environ.get("PORT", 5000)),
    debug=False,
    allow_unsafe_werkzeug=True
)

