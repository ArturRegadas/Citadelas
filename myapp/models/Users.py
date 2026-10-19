from myapp.setup.InitSqlAlchemy import db
from flask_login import UserMixin

class users(db.Model, UserMixin):
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(400), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    cpf = db.Column(db.CHAR(11), nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    cellphone1 = db.Column(db.CHAR(14), nullable=True)
    cellphone2 = db.Column(db.CHAR(14), nullable=True)
    landline = db.Column(db.CHAR(13), nullable=True)
    wallet = db.Column(db.DECIMAL(precision=10, scale=2), nullable=False, default=0.0)
    admin_user = db.Column(db.Boolean, nullable=False, default=False)
    password_token_expiration_datetime = db.Column(db.DateTime, nullable=True)
    api_token = db.Column(db.String(255), nullable=True)
    password_token = db.Column(db.String(255), nullable=True)
    force_logout = db.Column(db.Boolean, default=False, nullable=False)

    authenticated = True
    active = True
    anonymous = False