# Développement des fonctions python 

## Pré-Requis 

- Docker Desktop ( Allumé )
- Faas-Cli :
    - Windows git bash / Mac / Linux = curl -sL https://cli.openfaas.com | sh 
    - Powershell = iwr -useb get.openfaas.com | iex

## Création du projet generate-password

On génère un projet :
```
faas-cli new --lang python3-http generate-password
```

Cela génère un dossier generate-password avec :
- handler.py
- handler_test.py
- requirements.txt
- tox.ini

Et à la racine : 
- stack.yaml

Ensuite dans handler.py : 

```python
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
```

Dans requirements.txt pour les dépendances : 

```
psycopg2-binary
bcrypt
qrcode
pillow
```

Configuration stack.yaml : 

```
version: 1.0
provider:
  name: openfaas
  gateway: https://openfaas.91.99.16.71.nip.io 
functions:
  generate-password:
    lang: dockerfile
    handler: ./generate-password
    image: goujetp/generate-password:latest # <--- Mets ton pseudo Docker Hub ici !
    secrets:
      - db-credentials-password
      - db-credentials-username
    environment:
      POSTGRES_HOST: postgres.default.svc.cluster.local
```

Ensuite il faut créer les credentials pour le workspace openfaas-fn 
```
kubectl create secret generic db-credentials-username --from-literal=db-credentials-username='postgres' --namespace openfaas-fn

kubectl create secret generic db-credentials-password --from-literal=db-credentials-password='CofrapSecure2025!' --namespace openfaas-fn
```

Ensuite il faut créer le docker nous même car Windows faas-cli ne communique pas bien ensemble avec les chemins : 

### Création Dockerfile generate-password 

```
FROM ghcr.io/openfaas/classic-watchdog:0.2.1 AS watchdog
FROM python:3.10-slim

# 1. Récupération du watchdog
COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# 2. Installation des dépendances système
# On passe en root explicitement pour éviter les soucis de droits
USER root
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

# 3. Installation des librairies Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copie du code
COPY handler.py .

# 5. Configuration OpenFaaS
ENV fprocess="python3 handler.py"
EXPOSE 8080

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]
```

Ensuite il faut build et push notre image : 
```
docker build -t goujetp/generate-password:latest ./generate-password
docker push goujetp/generate-password:latest
```

Ensuite on peut déployer notre fonction : 

```
faas-cli deploy -f stack.yaml
```

## Utilisation de la fonction generate-password 

```curl
curl --location 'https://openfaas.91.99.16.71.nip.io/function/generate-password' \
--header 'Content-Type: application/json' \
--data '{
    "username": "Pierre Goujet"
}'
```

Résultat : 

```
{
    "message": "User created/updated successfully",
    "username": "Pierre Goujet",
    "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAV4AAAFeAQAAAADlUEq3AAAB60lEQVR4nO3bTY7jIBAF4FeDpSzxDXIUcrW5mTlK3wAvWwK9WYA9djqLjltxE+mxsPzzLUqyoKpwYsS3R/nzfQsICwsLCwsLC5+Eo7WBOBYDZjO7oSx3x5PCED6OPUkyA5gHII4AJwAkSU6nhSF8HJdlqnkSITnWy2hmZ4Yh/GMcPszsBgAh/WIYwodxvGbw7/XTEMdfDEP4aexIJgAhOQLzpWW/QPIrfl0YwkfxbGZmA1ot6j9r9qul6O20MISfxq3a3Izk2FKgv3uSO4lZeDdav+C52+L27V1y8hlrr9FJzMIPcEjFSJI18YWPTQ+BmiDPCEP4ebzr2X2uPUR7ZT5vZqjmYO/YkdN8aUtpvLZ3qY6+e7xWMnm58TAFag52i9dV1NUUyAlu0wq2S62i/eJNHqwTMaSlt4fPUC36NthnmNmFtZlf86DdgP87pJ3FLAwAw+Y8TMUYx0SDd0S0e9xJzMK7cb8lMy1fl+raOQEtI2oV7RPffcNt33XrwWeokukeL6uoTwBQ6qWFNAKA4/Lg1WEIH8brrkvGrvjct4daRd8JzwNa9kvtoF869Yy/zMH161Lt8utQHuwXr92EI4BSzxmveUBgMa658bVhCB/GD2pRt26Tuk2HoTnYKTb9d0lYWFhYWFj4bfE/G+memk/og/EAAAAASUVORK5CYII="
}
```

NB : Le QR code est en base 64 il suffira d'une lib pour le transformer en image 

## generate-2fa

C'est la même chose que pour generate-password sauf qu'on ne passe pas par faas-cli

```
mkdir generate-2fa
touch Dockerfile
touch handler.py
touch requirements.txt
```

le Dockerfile : 

```dockerfile
FROM ghcr.io/openfaas/classic-watchdog:0.2.1 AS watchdog
FROM python:3.10-slim

# 1. Récupération du watchdog
COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# 2. Installation des dépendances système
# On passe en root explicitement pour éviter les soucis de droits
USER root
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

# 3. Installation des librairies Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copie du code
COPY handler.py .

# 5. Configuration OpenFaaS
ENV fprocess="python3 handler.py"
EXPOSE 8080

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]
```

handler.py : 
```python
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
```

et requirements.txt :

```
psycopg2-binary
qrcode
pillow
pyotp
cryptography
```

Ensuite on build l'image docker et on l'a publie :
```
docker build -t goujetp/generate-2fa:latest ./generate-2fa
docker push goujetp/generate-2fa:latest
```

Il faut créer le secret pour la clé d'encryption dynamique ( SUr le VPS ou en local dans tous les cas la clé va dans Kubernetes ) :

```
KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
kubectl create secret generic encryption-key --from-literal=encryption-key=$KEY --namespace openfaas-fn
```

et enfin il faut déployer : 

```
faas-cli deploy -f stack.yaml
```

### Utilisation 

La requête POST :
```
curl --location 'https://openfaas.91.99.16.71.nip.io/function/generate-2fa' \
--header 'Content-Type: application/json' \
--data '{
    "username": "Pierre Goujet"
}'
```

Résultat : 

```
{
    "message": "2FA generated successfully",
    "username": "Pierre Goujet",
    "qr_code_2fa_base64": "iVBORw0KGgoAAAANSUhEUgAAAf4AAAH+AQAAAABVFFGIAAAEIUlEQVR4nO2dS4rbQBCG/4oEs5RgDjBHkW8WfDPpKD5AoLU0SPxZVFe3ZAeySE9e/rUQes1HG4p6V48Rv3TsX37t7wEBBBBAAAEEEEAAAQQQQICfABbLBwDAzHrYBYBd1t5PWPztHl+ObVcgwIsDQJLkPJAkN3AeNgDoiCl1/rLeYuL28Bd//icI8H8B9qrmQPJuWMbdT2QCOAPgdUTRjq1XIIAAp2N9o5vjiaR9vfWwy5AF076m37ACAV4R0D8+mNI7CBAG7D2WMT93LbiM31qvQAABADz7iXR3kOQ8bOCM7CyS7jbKTxTgUwGrmZn1wPJxN17HPTzBoXiMH3fDMgIeOl9ar0CA1waAD8eMHJ1g4ubOYj0ebqUTBWgGeM7i+LMN/sxvU8f8ccqnkElJogBtAEUSi/5LOKhDYNhcMP0Z0JEzOkoSBWgLOFnnhCyOc32birFOWTv6d1DEIkBLQOjEUkXJSpA8KMapFF+mCK/lJwrQFhA6seo6ICzxkK1ziGOW2OxASicK0BJQdCJQ/T+3xHNxEcMSu4kGijhKEgVoBSh+4ha3CcUnzG+ROyCALJNJEYsArQFPsfM8MI+2uHeI8B3dMCOEVRGLAJ8CWN8IYLfa/OB9Nx7A3Hp4tQUDaRdEPN1yBQK8NqB0QOxGrO8sjQ591oyrgQBgGDradDNg+SAMQ6MVCCDAEeBx8t38NKUut4Zh2GAX/2a3iGzyVdMVCPDagEPEUst79YU3bs8PqRwXW/mJArQHLGNHYDX3BLNOxG6eTwQ68mpmvI6At8vmfM7f8xME+LcB4Se6O9htmG79Bgx3I9C522jTrd/yVYK7jWXriD//EwT4LwDPdefU8ZCxKVdhp0tBRvlEAVoCDvnEo584RGXFR/1qthGnnjFJogCtAMcayxT1vJDOErHUMmBRhpJEAT4DsNgbI73dee4awO6j9h6d+GzVaoYl5vJbrkCAFweUXpxoeajNX3NY52N5L65UdxagLeCUT/QaMw9NijmpWFOJqFMukkQBGgJOHRAJ0QvrUteFA5lqk0505UgSBWgKOPUnDrkDLGxySCKqnEYqRzUWAdoCTtMD3A79ibUrLIZZQkSLFZckCtAMcMrYkKV00h36Yx+6EgEosy1Aa8Bx3nkGEFnsrUwP1MbZIqeHeEaSKEAbwPMeEEPZHCdFoQ+l5FfqLpJEAdoCDhFLvQ39VydPY+i0zhFIEgX4FECOPwCsvZ/ItOfGWQDgdYy6n08ZtF6BAK8NOOYTUeopnsouTbJ1S5J8aMpUgN8EWHvw+nHPqi83zqIY5rt0ogCNAc86MZKKhywii7OYD807C9Aa8OM9Zf3FaZscPmwnK+ssQFPAU+ycJazW80JjTnXbY0BZHAEaA0z/y1QAAQQQQAABBBBAAAEE+GsB3wGMUAUQY+lvmQAAAABJRU5ErkJggg==",
    "manual_entry_key": "AVAFY5P2LTACI67JFFKBQMFMTYG5CFK6"
}
```