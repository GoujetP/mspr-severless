# Développement des fonctions python 

## Pré-Requis 

- Docker Desktop ( Allumé )
- Faas-Cli :
    - Windows git bash / Mac / Linux = curl -sL https://cli.openfaas.com | sh 
    - Powershell = iwr -useb get.openfaas.com | iex

## Création du projet 

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
  gateway: http://91.99.16.71:31112 
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
curl --location 'http://91.99.16.71:31112/function/generate-password' \
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