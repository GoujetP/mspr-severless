import sys
import json
import string
import secrets
import qrcode
import io
import base64
import os
import psycopg2
from bcrypt import hashpw, gensalt

# --- Fonctions Utilitaires ---

def get_db_connection():
    with open("/var/openfaas/secrets/db-password", "r") as f:
        password = f.read().strip()
    with open("/var/openfaas/secrets/db-username", "r") as f:
        user = f.read().strip()

    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        database="cofrap",
        user=user,
        password=password,
        port="5432"
    )
    return conn

def generate_complex_password(length=24):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        pwd = ''.join(secrets.choice(alphabet) for i in range(length))
        if (any(c.islower() for c in pwd) and any(c.isupper() for c in pwd)
                and sum(c.isdigit() for c in pwd) >= 1
                and any(c in "!@#$%^&*()-_=+" for c in pwd)):
            break
    return pwd

# --- Main ---

if __name__ == "__main__":
    try:
        # 1. Lecture entrée standard (Classic Watchdog)
        input_str = sys.stdin.read()
        
        if not input_str.strip():
            print(json.dumps({"error": "Waiting for JSON input"}))
            sys.exit(0)

        # 2. Parsing sécurisé
        try:
            req = json.loads(input_str)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON format"}))
            sys.exit(0)

        username = req.get("username")
        if not username:
            print(json.dumps({"error": "Le paramètre 'username' est obligatoire."}))
            sys.exit(0)

        # 3. Génération mot de passe clair & QR Code
        clear_password = generate_complex_password(24)

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(clear_password)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # 4. Hachage bcrypt pour la BDD
        hashed_password = hashpw(clear_password.encode('utf-8'), gensalt()).decode('utf-8')

        # 5. Insertion en BDD (Upsert)
        conn = get_db_connection()
        cur = conn.cursor()
        
        insert_query = """
            INSERT INTO users (username, password, gendate, expired)
            VALUES (%s, %s, extract(epoch from now()), 0)
            ON CONFLICT (username)
            DO UPDATE SET password = EXCLUDED.password, gendate = EXCLUDED.gendate, expired = 0;
        """
        cur.execute(insert_query, (username, hashed_password))
        
        conn.commit()
        cur.close()
        conn.close()

        # 6. Sortie JSON (Lue par le watchdog et renvoyée au client)
        print(json.dumps({
            "status": "success",
            "message": "Utilisateur traité avec succès",
            "username": username,
            "password": clear_password,
            "qr_code_base64": qr_base64
        }))

    except Exception as e:
        print(json.dumps({"error": f"Erreur interne: {str(e)}"}))