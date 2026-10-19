from flask import render_template, Blueprint, Response

home = Blueprint("homePage", __name__)

@home.route("/")
def HomePage() -> Response:
    return render_template("Index.html")
