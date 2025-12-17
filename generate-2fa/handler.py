import sys
import json
import pyotp
import qrcode
import base64
import psycopg2
import os
from io import BytesIO
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

def encrypt_secret(secret_2fa):
    # On récupère la clé de chiffrement depuis les secrets Kubernetes
    with open("/var/openfaas/secrets/encryption-key", "r") as f:
        key = f.read().strip()
    f = Fernet(key.encode())
    # On chiffre le secret
    return f.encrypt(secret_2fa.encode()).decode()

# --- Main ---

if __name__ == "__main__":
    try:
        input_str = sys.stdin.read()
        
        if not input_str.strip():
            print(json.dumps({"error": "Empty body"}))
            sys.exit(0)

        req = json.loads(input_str)
        username = req.get("username")

        if not username:
            print(json.dumps({"error": "Username is required"}))
            sys.exit(0)

        # 1. Génération du Secret TOTP (Le "code" secret partagé)
        totp_secret = pyotp.random_base32()

        # 2. Chiffrement du secret avant stockage
        encrypted_secret = encrypt_secret(totp_secret)

        # 3. Mise à jour de l'utilisateur en BDD
        conn = get_db_connection()
        cur = conn.cursor()
        
        # On suppose que l'utilisateur a déjà été créé par la fonction generate-password
        update_query = "UPDATE users SET mfa_secret = %s WHERE username = %s"
        cur.execute(update_query, (encrypted_secret, username))
        
        # On vérifie si l'utilisateur existait bien
        if cur.rowcount == 0:
            conn.rollback()
            print(json.dumps({"error": "User not found. Please create password first."}))
            sys.exit(0)
            
        conn.commit()
        cur.close()
        conn.close()

        # 4. Génération du QR Code Google Authenticator
        # Cela crée l'URL spéciale "otpauth://"
        uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(name=username, issuer_name="COFRAP Secure")
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        response = {
            "message": "2FA generated successfully",
            "username": username,
            "qr_code_2fa_base64": img_str,
            "manual_entry_key": totp_secret # Optionnel: pour entrer le code à la main si le QR passe pas
        }
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}))