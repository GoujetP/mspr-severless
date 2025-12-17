import sys
import json
import pyotp
import bcrypt
import psycopg2
import os
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

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

def decrypt_secret(encrypted_secret):
    with open("/var/openfaas/secrets/encryption-key", "r") as f:
        key = f.read().strip()
    f = Fernet(key.encode())
    return f.decrypt(encrypted_secret.encode()).decode()

# --- Main ---

if __name__ == "__main__":
    try:
        # 1. Parsing de l'entrée
        input_str = sys.stdin.read()
        if not input_str.strip():
            print(json.dumps({"error": "Empty body"}))
            sys.exit(0)

        req = json.loads(input_str)
        username = req.get("username")
        password_input = req.get("password")
        code_2fa_input = req.get("code_2fa") # Le code à 6 chiffres

        if not all([username, password_input, code_2fa_input]):
            print(json.dumps({"error": "Missing fields (username, password, code_2fa)"}))
            sys.exit(0)

        conn = get_db_connection()
        cur = conn.cursor()

        # 2. Récupération des infos utilisateur
        query = "SELECT password_hash, mfa_secret, created_at, expired FROM users WHERE username = %s"
        cur.execute(query, (username,))
        user_data = cur.fetchone()

        if not user_data:
            print(json.dumps({"error": "Utilisateur inconnu"}))
            sys.exit(0)

        stored_hash, stored_encrypted_secret, created_at, is_expired = user_data

        # 3. Vérification : Le compte est-il déjà expiré ?
        if is_expired:
            print(json.dumps({"error": "Compte expiré. Veuillez refaire la procédure d'enrôlement."}))
            sys.exit(0)

        # 4. Vérification : Ancienneté > 6 mois (180 jours)
        # created_at est un objet datetime renvoyé par Postgres
        account_age = datetime.now() - created_at
        if account_age > timedelta(days=180):
            # C'est trop vieux ! On marque le compte comme expiré
            update_query = "UPDATE users SET expired = TRUE WHERE username = %s"
            cur.execute(update_query, (username,))
            conn.commit()
            print(json.dumps({"error": "Mot de passe expiré (> 6 mois). Compte désactivé."}))
            sys.exit(0)

        # 5. Vérification : Mot de passe (Bcrypt)
        # Note: bcrypt a besoin de bytes, donc on encode
        if not bcrypt.checkpw(password_input.encode('utf-8'), stored_hash.encode('utf-8')):
            print(json.dumps({"error": "Mauvais mot de passe"}))
            sys.exit(0)

        # 6. Vérification : Code 2FA (TOTP)
        # On déchiffre le secret stocké pour vérifier le code
        decrypted_secret = decrypt_secret(stored_encrypted_secret)
        totp = pyotp.TOTP(decrypted_secret)
        
        # Le verify renvoie True ou False
        if not totp.verify(code_2fa_input):
            print(json.dumps({"error": "Code 2FA invalide"}))
            sys.exit(0)

        # Si on arrive ici, tout est bon !
        print(json.dumps({
            "status": "success",
            "message": "Authentification réussie",
            "username": username,
            "token": "Ceci_serait_un_vrai_JWT_en_prod" 
        }))

        cur.close()
        conn.close()

    except Exception as e:
        print(json.dumps({"error": str(e)}))