import smtplib
from myapp.utils.Async import make_async
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from myapp.config import Config

#====================== EMAIL ======================
CORPORATION_EMAIL =     Config.CORPORATION_EMAIL
CORPORATION_PASSWORD =  Config.CORPORATION_PASSWORD 
SMTP_SERVER =           "smtp.gmail.com"
PORT =                  587  
#===================================================

def send_email(recipient_email: str, subject: str, content: str) -> str:
    if not CORPORATION_EMAIL or not CORPORATION_PASSWORD:
        print(f"[Email Mock] To: {recipient_email} | Subject: {subject} | Content: {content}")
        return "mocked"

    msg = MIMEMultipart()
    msg["From"] = CORPORATION_EMAIL
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(content, "plain"))

    try:
        with smtplib.SMTP(SMTP_SERVER, PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(CORPORATION_EMAIL, CORPORATION_PASSWORD)
            server.sendmail(CORPORATION_EMAIL, recipient_email, msg.as_string())
            return "ok"
    except Exception as e:
        print(f"[Email Error]: {e}")
        return str(e)

@make_async
def auth_message(email: str, content: str) -> None:
    send_email(
        recipient_email=email,
        subject="AUTENTICAÇÃO - HACKATHON APP",
        content="Esse é seu link de autenticação: " + content
    )

@make_async
def welcome_message(email: str, content: str, url: str = None) -> None:
    body = f"Seja bem-vindo(a), {content}!"
    if url:
        body += f"\nVocê pode definir sua senha através do link: {url}"
    send_email(
        recipient_email=email,
        subject="BEM-VINDO - HACKATHON APP",
        content=body
    )
