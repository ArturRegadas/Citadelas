from flask import Blueprint, request, Response, redirect, session, url_for
from typing import Tuple
from myapp.utils.LinksUrl import CONFIG_PAGE
from myapp.utils.Unmask import unmask
from myapp.utils.Validations.validations import is_cpf, User_validation
from myapp.setup.InitSqlAlchemy import db
import myapp.repositories.UserRepository as user_repository
import myapp.repositories.PhysicalPersonRepository as physical_person_repository



def general_change_config(name, username, request):
    current_user = user_repository.get_by_id(session.get("user_id"))

            

    cpf = request.form.get("cpf", None)
    if cpf:
        cpf = unmask(cpf)
        if is_cpf(cpf):
            if not User_validation(cpf=cpf):
                return redirect(url_for(CONFIG_PAGE, msg="There are an user with this CPF")), 400
            current_user.cpf = cpf
            session["cpf"] = cpf
        else:
            return redirect(url_for(CONFIG_PAGE, msg="Invalid CPF")), 400
            
    current_user.username = username
    current_user.name = name
    
    db.session.commit()

    session["name"] = name
    session["username"] = username