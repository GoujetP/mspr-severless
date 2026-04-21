Voici une documentation complète, structurée par missions, reprenant l'intégralité de ton projet **MSPR2**. Elle est optimisée pour être lisible, professionnelle et directement prête à être intégrée dans ton dépôt Git.

***

# 🔐 MSPR2 : Système d'Authentification Forte Serverless
**Architecture Kubernetes | OpenFaaS | PostgreSQL**

Cette documentation retrace les étapes de mise en œuvre de l'infrastructure sécurisée de la COFRAP, de l'installation du cluster à la livraison des micro-services serverless.

---

## 🏗️ Mission 1 à 3 : Infrastructure & Cluster Kubernetes

### 1.1 Installation du Cluster K3s
Sur le VPS distant, nous installons une version légère de Kubernetes :
```bash
curl -sfL https://get.k3s.io | sh -
```

### 1.2 Configuration du Poste Client (Hôte)
Récupération de la configuration pour piloter le cluster à distance :
1. Copier `/etc/rancher/k3s/k3s.yaml` du VPS vers le PC local.
2. Configurer l'accès :
```bash
export KUBECONFIG=$(pwd)/k3s-config.yaml
kubectl config view
# Vérification de la connexion
kubectl get nodes
```

---

## 🗄️ Mission 4 : Persistance des Données (PostgreSQL)

### 4.1 Déploiement de la base de données
Nous utilisons un namespace dédié `cofrap` pour isoler les données :
```bash
kubectl apply -f postgres.yaml
kubectl get pods -n cofrap
```

### 4.2 Initialisation du Schéma
Création de la table `users` pour stocker les identifiants, les hashs de mots de passe et les secrets MFA :
```bash
kubectl exec -it -n cofrap $(kubectl get pod -n cofrap -l app=postgres -o name) -- \
  psql -U cofrap -d cofrap -c "
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password TEXT,
    mfa TEXT,
    gendate BIGINT,
    expired INT DEFAULT 0
  );"
```

---

## ⚡ Mission 5 : Déploiement d'OpenFaaS

### 5.1 Installation via Helm
```bash
# Ajout du repo et namespaces
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Installation d'OpenFaaS
helm install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=true \
  --set ingress.enabled=false
```

### 5.2 Authentification au CLI
Récupération du mot de passe admin et connexion :
```bash
# Récupération du MDP
kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode

# Connexion (via Port-Forward sur le port 8081)
kubectl port-forward svc/gateway -n openfaas 8081:8080 --address 127.0.0.1
export OPENFAAS_URL=http://127.0.0.1:8081
faas-cli login --username admin --password [VOTRE_MDP]
```

---

## 🚀 Mission 6 : Fonctions Serverless (Micro-services)

Afin d'éviter les conflits de chemins sur Windows, nous utilisons une approche **Custom Dockerfile** pour toutes nos fonctions.

### 6.1 Configuration Commune (`stack.yaml`)
Fichier de configuration global à la racine du projet :
```yaml
version: 1.0
provider:
  name: openfaas
  gateway: http://127.0.0.1:8081
functions:
  generate-password:
    lang: dockerfile
    handler: ./generate-password
    image: goujetp/generate-password:latest
    secrets: [db-password, db-username]
    environment:
      POSTGRES_HOST: postgres.cofrap.svc.cluster.local

  generate-2fa:
    lang: dockerfile
    handler: ./generate-2fa
    image: goujetp/generate-2fa:latest
    secrets: [db-password, db-username, encryption-key]
    environment:
      POSTGRES_HOST: postgres.cofrap.svc.cluster.local

  auth-user:
    lang: dockerfile
    handler: ./auth-user
    image: goujetp/auth-user:latest
    secrets: [db-password, db-username, encryption-key]
    environment:
      POSTGRES_HOST: postgres.cofrap.svc.cluster.local
```

### 6.2 Sécurisation (Secrets)
Création d'une clé AES pour chiffrer les secrets MFA en base de données :
```bash
faas-cli secret create encryption-key --from-literal="$(openssl rand -base64 32)"
```

### 6.3 Workflow de Déploiement
Pour chaque dossier de fonction (`generate-password`, `generate-2fa`, `auth-user`), nous appliquons le cycle suivant :
```bash
# 1. Build de l'image
docker build -t goujetp/[nom-fonction]:latest ./[nom-fonction]

# 2. Push sur Docker Hub
docker push goujetp/[nom-fonction]:latest

# 3. Déploiement sur le cluster
faas-cli deploy -f stack.yaml
```

---

## 🧪 Test du Workflow Complet

L'interface de gestion est accessible sur : `http://91.99.16.71:31112`

### 1️⃣ Étape 1 : Génération de l'utilisateur
**Appel :** `generate-password`
```json
{ "username": "pierre.goujet" }
```
**Résultat :** Le mot de passe est haché en BDD et renvoyé en clair à l'utilisateur avec un QR Code.

### 2️⃣ Étape 2 : Enrôlement 2FA
**Appel :** `generate-2fa`
```json
{ "username": "pierre.goujet" }
```
**Résultat :** Génère un secret TOTP, le chiffre avec l' `encryption-key` en BDD et renvoie le QR Code pour Google Authenticator.

### 3️⃣ Étape 3 : Authentification Forte
**Appel :** `auth-user`
```json
{
  "username": "pierre.goujet",
  "password": "MOT_DE_PASSE_CLAIR",
  "code_2fa": "123456"
}
```
**Résultat :** Si valide, renvoie un **Token JWT** signé permettant l'accès aux ressources sécurisées de la COFRAP.

---
*Documentation générée pour le projet MSPR2 - 2026*