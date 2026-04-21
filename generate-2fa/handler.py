import sys
import json
import pyotp
import qrcode
import io
import base64
import os
import psycopg2
from cryptography.fernet import Fernet

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

if __name__ == "__main__":
    try:
        input_str = sys.stdin.read()
        if not input_str.strip():
            sys.exit(0)

        req = json.loads(input_str)
        username = req.get("username")

        if not username:
            print(json.dumps({"error": "Username manquant"}))
            sys.exit(0)

        # 1. Génération du secret TOTP
        totp_secret = pyotp.random_base32()

        # 2. Chiffrement AES avant stockage en BDD
        key = get_encryption_key()
        f_cipher = Fernet(key.encode())
        encrypted_secret = f_cipher.encrypt(totp_secret.encode()).decode()

        # 3. Update en BDD (colonne mfa)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET mfa = %s WHERE username = %s", (encrypted_secret, username))
        conn.commit()

        # 4. Génération du QR Code
        otp_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(name=username, issuer_name="COFRAP")
        img = qrcode.make(otp_uri)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        print(json.dumps({
            "status": "success",
            "username": username,
            "qr_code_2fa": qr_base64
        }))

        cur.close()
        conn.close()

    except Exception as e:
        print(json.dumps({"error": str(e)}))