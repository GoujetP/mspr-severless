# MSPR - Install 
## Install OpenFaaS

### La base

```
apt update && apt upgrade -y
```

```
# 1. Autoriser SSH (Port 22)
ufw allow 22/tcp

# 2. Autoriser le trafic Web (Traefik Ingress)
ufw allow 80/tcp
ufw allow 443/tcp

# 3. Autoriser l'API Kubernetes (pour piloter depuis ton PC)
ufw allow 6443/tcp

# 4. Autoriser la Gateway OpenFaaS (Port direct pour le test)
ufw allow 31112/tcp

# 5. Activer le pare-feu
ufw enable
```

### Installation du cluster K3S

```
# Install K3S et chmod 644
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

# Vérifier que ça tourne
k3s kubectl get nodes
```

Le fichier de config se trouve sur /etc/rancher/k3s/k3s.yaml, on peut le copier sur notre PC pour que soit plus simple après il faut juste changer la ligne  
server par https://91.99.16.71:6443  obligatoirement https sinon bad request car Kubernetes accepte que le https 

Maintenant on peut piloter le cluster en local avec cette commande : 

```
kubectl --kubeconfig config-k3s.yaml get nodes
```

### Installation de Helm 

Gestionnaire de paquet pour K8s
```
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Ajout du depot d'OpenFaas 
```
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update
```

Création des workspaces : 

- Un pour le système OpenFaas
- Un deuxième pour les fonctions serverless

```
k3s kubectl create namespace openfaas
k3s kubectl create namespace openfaas-fn
```

Indiquer la config de K3s dans les varaibles d'envrionnement

```
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

Déploiement d'OpenFaas : 

```
helm upgrade openfaas --install openfaas/openfaas --namespace openfaas --set functionNamespace=openfaas-fn --set generateBasicAuth=true --set serviceType=NodePort --set gateway.nodePort=31112
```

Récupérer le MPD de base d'admin sur OpenFaas : 

```
k3s kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode; echo
```

Vérifier si les pods tournent : 
```
k3s kubectl -n openfaas get pods
```

## Accès 

- OpenFaas : https://openfaas.91.99.16.71.nip.io/ui/
- Api Kube : http://91.99.16.71:6443/api

## PostgreSQL 

On crée le secret :

```
kubectl create secret generic db-credentials --from-literal=password='CofrapSecure2025!' --from-literal=username=postgres
```

Il faut avoir le fichier postgres.yaml : 

```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: cofrap_db
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: postgres-storage
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
  clusterIP: None
```

Sur notre pc en local : 
```
kubectl --kubeconfig config-k3s.yaml apply -f postgres.yaml
```

Attention bien vérifier les chemins selon l'endroit où l'on execute la commande
NB : Toutes les commandes fait de son PC en local si on utilise : 

```
kubectl --kubeconfig config-k3s.yaml
```

### Se connecter à la base données 

```
kubectl --kubeconfig config-k3s.yaml exec -it deploy/postgres -- psql -U postgres -d cofrap_db
```
ou
```
kubectl exec -it deploy/postgres -- psql -U postgres -d cofrap_db
```

## Informations importantes pour les fonctions python

Host : postgres.default.svc.cluster.local  
Port : 5432  
Database : cofrap_db  
User : postgres  
Password : CofrapSecure2025!  
