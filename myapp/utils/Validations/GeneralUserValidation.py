from datetime import datetime
from myapp.utils.Unmask import unmask
from myapp.utils.Validations.validations import *
from flask import Request
from myapp.utils.GetMissingInfo import get_missing_info
from typing import Dict, Any, Tuple

datakey = [
    "username",
    "password",
    "email",
    "cpf",
    "name",
    "userType",
    "cellphone1",
    "cellphone2",
    "landline",
    "photo", 
]

nullAbleValues = [
    "cellphone1",
    "cellphone2",
    "cnpj",
    "cpf", 
    "rg", 
    "photo",
    "landline",
    "birth_date",
    "gender",
    "state_tax_registration"
]

def set_type(user_type: str) -> list:
    base_keys = list(datakey)

    if user_type == "physical_person":
        base_keys += ["rg", "birth_date", "gender"]
    else:
        base_keys += [
            "cnpj",
            "state_tax_registration",
            "legal_business_name",
            "trade_name"
        ]
    return base_keys

def general_validation(request: Request) -> Tuple[Dict[str, Any], int]:
    user_type = request.form.get("userType", "physical_person")
    keys_to_check = set_type(user_type)
    
    data, code = get_missing_info(
        request,
        keys_to_check,
        nullAbleValues
    )
    if code != 200:
        return data, code

    if data.get("birth_date"):
        try:
            data["birth_date"] = datetime.strptime(data["birth_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    if not is_email(data.get("email", "")):
        return {
            "Type": "InputError",
            "content": "Invalid email"
        }, 400
    
    for phone in ["cellphone1", "cellphone2", "landline"]:
        val = data.get(phone)
        if val:
            data[phone] = unmask(val)
            if not is_phone_number(data[phone]):
                return {
                    "Type": "InputError",
                    "content": f"Invalid phone: {phone}"
                }, 400
        
    cpf = data.get("cpf", None)
    if cpf:
        cpf = unmask(cpf)
        data["cpf"] = cpf
        if not is_cpf(data["cpf"]):
            return {
                "Type": "InputError",
                "content": "Invalid CPF"
            }, 400
    
    if user_type == "physical_person":
        rg = data.get("rg", None)
        if rg:
            rg = unmask(rg)
            data["rg"] = rg
            if not is_rg(data["rg"]):
                return {
                    "Type": "InputError",
                    "content": "Invalid RG"
                }, 400
        
        if not User_validation(data["username"], data["email"], cpf=cpf, rg=rg):
            return {
                "Type": "InputError",
                "content": "There is already a user with that username, email, CPF or RG"
            }, 400

    elif user_type == "legal_person":
        cnpj = unmask(data.get("cnpj", ""))
        data["cnpj"] = cnpj
        if not is_cnpj(cnpj):
            return {
                "Type": "InputError",
                "content": "Invalid CNPJ"
            }, 400

        state_tax_registration = unmask(data.get("state_tax_registration", ""))
        data["state_tax_registration"] = state_tax_registration

        if not User_validation(
            data["username"],
            data["email"],
            cpf=cpf,
            cnpj=cnpj,
            state_tax_registration=state_tax_registration,
            trade_name=data.get("trade_name"),
            legal_business_name=data.get("legal_business_name")
        ):
            return {
                "Type": "InputError",
                "content": "There is already a user with that trade_name, legal business name, state tax registration, email or cnpj"
            }, 400

    return {
        "Type": "Valid",
        "content": "All information is valid",
        "data": data
    }, 200