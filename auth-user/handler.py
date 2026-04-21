import sys
import json
import pyotp
import bcrypt
import psycopg2
import os
import jwt
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

# --- Utilitaires ---

def get_db_connection():
    with open("/var/openfaas/secrets/db-password", "r") as f:
        password = f.read().strip()
    with open("/var/openfaas/secrets/db-username", "r") as f:
        user = f.read().strip()
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        database="cofrap",
        user=user,
        password=password,
        port="5432"
    )

def get_encryption_key():
    with open("/var/openfaas/secrets/encryption-key", "r") as f:
        return f.read().strip()

def decrypt_mfa_secret(encrypted_secret):
    key = get_encryption_key()
    f_cipher = Fernet(key.encode())
    return f_cipher.decrypt(encrypted_secret.encode()).decode()

# --- Main ---

if __name__ == "__main__":
    try:
        input_str = sys.stdin.read()
        if not input_str.strip():
            sys.exit(0)

        req = json.loads(input_str)
        username = req.get("username")
        password_input = req.get("password")
        code_2fa_input = req.get("code_2fa")

        if not all([username, password_input, code_2fa_input]):
            print(json.dumps({"error": "Champs manquants (username, password, code_2fa)"}))
            sys.exit(0)

        # 1. Récupération des infos en BDD
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT password, mfa FROM users WHERE username = %s", (username,))
        user_data = cur.fetchone()

        if not user_data:
            print(json.dumps({"error": "Utilisateur inconnu"}))
            sys.exit(0)

        stored_password_hash, stored_encrypted_mfa = user_data

        # 2. Vérification du mot de passe (bcrypt)
        if not bcrypt.checkpw(password_input.encode('utf-8'), stored_password_hash.encode('utf-8')):
            print(json.dumps({"error": "Mot de passe incorrect"}))
            sys.exit(0)

        # 3. Vérification du 2FA
        if not stored_encrypted_mfa:
            print(json.dumps({"error": "MFA non configuré pour cet utilisateur"}))
            sys.exit(0)

        # On déchiffre le secret TOTP pour pouvoir vérifier le code
        totp_secret = decrypt_mfa_secret(stored_encrypted_mfa)
        totp = pyotp.TOTP(totp_secret)
        
        if not totp.verify(code_2fa_input):
            print(json.dumps({"error": "Code 2FA invalide"}))
            sys.exit(0)

        # 4. Si tout est OK : Génération du Token JWT
        # On utilise l'encryption-key comme clé de signature pour le JWT
        token_payload = {
            "username": username,
            "exp": datetime.utcnow() + timedelta(hours=2),
            "iat": datetime.utcnow()
        }
        token = jwt.encode(token_payload, get_encryption_key(), algorithm="HS256")

        print(json.dumps({
            "status": "success",
            "message": "Authentification réussie",
            "token": token
        }))

        cur.close()
        conn.close()

    except Exception as e:
        print(json.dumps({"error": str(e)}))