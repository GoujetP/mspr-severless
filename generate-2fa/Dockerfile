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