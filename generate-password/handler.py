import sys
import json
import secrets
import string
import bcrypt
import psycopg2
import os
import qrcode
import base64
from io import BytesIO

# --- Fonctions Utilitaires ---

def get_db_connection():
    with open("/var/openfaas/secrets/db-credentials-password", "r") as f:
        password = f.read().strip()
    with open("/var/openfaas/secrets/db-credentials-username", "r") as f:
        user = f.read().strip()

    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        database="cofrap_db",
        user=user,
        password=password,
        port="5432"
    )
    return conn

def generate_complex_password(length=24):
    alphabet = string.ascii_letters + string.digits + string.punctuation
    while True:
        password = ''.join(secrets.choice(alphabet) for i in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and sum(c.isdigit() for c in password) >= 1
                and any(c in string.punctuation for c in password)):
            return password

# --- Main (Exécuté à chaque requête) ---

if __name__ == "__main__":
    try:
        # 1. Lecture de l'entrée (le JSON arrive via STDIN)
        input_str = sys.stdin.read()
        
        # Gestion du cas où l'entrée est vide
        if not input_str.strip():
            username = None
        else:
            req = json.loads(input_str)
            username = req.get("username")

        if not username:
            print(json.dumps({"error": "Username is required"}))
            sys.exit(0)

        # 2. Logique Métier
        clear_password = generate_complex_password(24)
        hashed_password = bcrypt.hashpw(clear_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        
        insert_query = """
        INSERT INTO users (username, password_hash, created_at, expired)
        VALUES (%s, %s, NOW(), FALSE)
        ON CONFLICT (username) 
        DO UPDATE SET password_hash = EXCLUDED.password_hash, created_at = NOW(), expired = FALSE;
        """
        cur.execute(insert_query, (username, hashed_password))
        conn.commit()
        cur.close()
        conn.close()

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(clear_password)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # 3. Réponse (On imprime juste le JSON sur STDOUT)
        response = {
            "message": "User created/updated successfully",
            "username": username,
            "qr_code_base64": img_str
        }
        print(json.dumps(response))

    except Exception as e:
        # En cas d'erreur, on l'affiche proprement
        print(json.dumps({"error": str(e)}))