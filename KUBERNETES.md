# MSPR Severless

## Installation

### Base

Sur le VPS, installer Kubernetes
```
curl -sfL https://get.k3s.io | sh -
```

Sur le PC Hôte avec la config du VPS /etc/rancher/k3s/k3s.yaml dans k3s-config.yaml
```
export KUBECONFIG=$(pwd)/k3s-config.yaml
kubectl config view
```

### PostgreSQL

```
kubectl apply -f postgres.yaml
kubectl get pods -n cofrap
```

Créer la talbe users : 

```
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

### OpenFaaS

Installation de Helm sur le pc hôte ( Si windows avoir activer sudo )
```
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```
Ajouter le repo OpenFaaS
```
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update
```

Création des namespaces
```
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml
```

Déployer OpenFaaS
```
helm install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=true \
  --set ingress.enabled=false
```

Récupérer le MDP admin : WwHdv2m9BiYEkdpbyt2XwHSiIOAidTmJ
```
kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode
```

Installer le cli en local sur le PC hôte : 

```
curl -sLS https://cli.openfaas.com | sh
```

Faire le pont entre le VPS et OpenFaaS en local ( Ne pas ferme le terminal )
```
kubectl port-forward svc/gateway -n openfaas 8081:8080 --address 127.0.0.1
export OPENFAAS_URL=http://127.0.0.1:8081
PASSWORD=$(kubectl -n openfaas get secret basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
echo -n $PASSWORD | faas-cli login --username admin --password-stdin
```
Voir tous les pods 
```
$ kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS        AGE
cofrap        postgres-0                                1/1     Running     0               14m
kube-system   coredns-76c974cb66-lz49k                  1/1     Running     0               18m
kube-system   helm-install-traefik-crd-dfz4t            0/1     Completed   0               18m
kube-system   helm-install-traefik-shkws                0/1     Completed   2               18m
kube-system   local-path-provisioner-8686667995-tv4vd   1/1     Running     0               18m
kube-system   metrics-server-c8774f4f4-jtg4b            1/1     Running     0               18m
kube-system   svclb-traefik-4a49f8c2-5sgpr              2/2     Running     0               18m
kube-system   traefik-c5c8bf4ff-tsz8h                   1/1     Running     0               18m
openfaas      alertmanager-fb97cfc46-f6pv6              1/1     Running     0               8m15s
openfaas      gateway-5f8bf55dfb-xrsgv                  2/2     Running     1 (8m12s ago)   8m15s
openfaas      nats-5bf8cfb54-wdlht                      1/1     Running     0               8m15s
openfaas      prometheus-85cb68fd7b-tfx5n               1/1     Running     0               8m15s
openfaas      queue-worker-65bc696bcf-dljxj             1/1     Running     2 (8m10s ago)   8m15s
```  

## Création de fonction

Importer les templates d'OPenFaaS qui encapsule le code

```
faas-cli template store pull python3-flask
```

### Generate password 

```
faas-cli new generate-password --lang python3-flask
```

Mettre le code dans handler.py 

Créer le Dockerfile

et dans stack.yaml

```

```

Build l'image et la push et deployer la fonction

```
docker build -t goujetp/generate-password:latest ./generate-password
docker push goujetp/generate-password:latest
faas-cli deploy -f stack.yaml
```
Interface OpenFaas dispo sur http://91.99.16.71:31112

exemple de body et de réponse 

```
{ 
"username": "pierre"
}
{
  "status": "success",
  "message": "Utilisateur traité avec succès",
  "username": "pierre",
  "password": "7BFh0^k0DbpdHUBQ0LgPE^gS",
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAV4AAAFeAQAAAADlUEq3AAAB+0lEQVR4nO3bQW7rIBAG4H8eSFniG/Qo5AY9Us/0bmCO0gM8CS8rYf1dAI7rl0XaKi2RflaO8y1GGjEwkBhx81j/3G4BYWFhYWFhYeF7Y5AkOW8f25MjEEp/G0iSZZCYha/hliO0vIUCMh/zO1jMwh/wamYTgJgB8tUDaQKQzOwnwxD+Nk7mAWA1O/9mGMJfxjE7mj2VOht/LQzhW4fvD44AVgDhzZiegXpYE/dnNoPELHwNL2Zm1lc/APXJzOxSTweLWRhA321exnzlXRvqJkbEvV8IfeGLJPsXBWR2VD/4ONgRyXxNntnkaOdQoH5wZLyvmDNQ+3jEPv04hwJV0ZHxVkVJxJpGR8TcTtXqwcysKjou9vsPywQAqwHhzRD/+gMeJGbhD6NVyL5hQWRpVXTuJ6R1cmoOjom3DAL9UHvfUvSEKoOj4/REIr6eiFZFC8ym1TgvJx7x/cIQ/jze7UXbfMtu29MciObgiPjKmUzrIVo93Z6UwaFxsjZqAT0v7YoJWE664X0I3GYZgMX3bWi9rwDsJf9UGMKfxvtz0a2Fb93ERtTRD4yPTTvS2RWkKdNingCEf94Q7h2G8Jfxfxmsqx98YZoApmcAcb53GMLfx6619bWbyKuhroOL193E0Pjq70Xb1eBlMdQ6OC42/XdJWFhYWFhY+GHxO59UqO5MlYOOAAAAAElFTkSuQmCC"
}
```

### Generate 2FA 

Créer une clé de chiffrement ( à faire sur le PC hôte ) 

```
faas-cli secret create encryption-key --from-literal="$(openssl rand -base64 32)"
faas-cli secret list
```

Créer le fichier handler.py, requirements.txt et le Dockerfile puis build, push et déployer en oubliant pas dans stack.yaml

```
generate-2fa:
    lang: dockerfile
    handler: ./generate-2fa
    image: goujetp/generate-2fa:latest
    secrets:
      - db-password
      - db-username
      - encryption-key
    environment:
      POSTGRES_HOST: postgres.cofrap.svc.cluster.local
```

body et réponse 

```
{
  "status": "success",
  "username": "pierre",
  "qr_code_2fa": "iVBORw0KGgoAAAANSUhEUgAAAcIAAAHCAQAAAABUY/ToAAADbElEQVR4nO2cTW6kMBCFX42RsgSpD9BHgZuN5khzAzhKbgDLlozeLOwyhk42SUfpMK8WLf4+mZZK9Y+N+JhMvz4IAiJFihQpUqRIkc9HWpYGNixmmDoAk5mZdfkusPhTwze/rcjnIkGSRE+SnEOJsAPRMwL9jPRDzoHVw+PP+p8iv55cin1pIzj6bf65RmDqABsAmFnzuDVFnpPkWEzQ1AXakE55XwJ4hrcV+Qxkczi3fl4b9GP+IZYmcrKHrinyXKTrUEsAC0AAIJYOBAIBrEa0c3X302uKPCW55WDD8pI8mA1Lg3T0+7WBDVgtZ2jf/bYin4pMdmizL5yuN+PUwTh1oVxeLZuqR6wp8lxkye1jPu8ZQc4AyZyhpUfQkjnVV24vspZU8+EcyLGNAEoi1s+hUq6DSkmHRBbZdGhXTwSy4UkmKCLrlWqMIu8k+7Jkh8ikPrkgFIpyBdcc1ybpkMgilS8r+pLq1H1pbqCN1cPSIZF7ydFNG4s25dgnqwpQoiC/pnhI5E7cl8GzsRlITbPNq23dVwDyZSIP4nao/HgUlAxPStPmkHJ776ZJh0RW4r4pVu3WZJH2p3WcLR0SWUsdUyeX5YE1k/qUchEjkjGSDoncyebL8oXWa9K5ML2fPGuVl4k8iitIRE7OyjBj74lYei6HTFF1apEHKck6t8wrtz6w63Ck8GhWr0Pkm6QNWA3TNcLriauPeCwNPBTKaZoND1lT5FnIfb8s5Mxr3ELnNquPR9fyZSKPclcfakt73qtCWzcNyu1F3kuVl/VzDp39KKf61cRH1QT5Wf9T5NeRVRvVPwsKVbF6qwqpPiTyPUk6lI58EM19GZBDIdJ7+bJDIu9kqw/VVcSqOr11ZPWdq8i3pPq+jJOFCGBtOF1vhvJVGYHYGABDPz5gTZHnIqsa486r5amhevZjuys7JLKSZIfc4oQItHM6NQAgsDbAcqFhuUT0f7vPrynyXOTdvh+lyepmKdQz+eVIdkjkkaz2/bgZsOSdiKrZxsnMvJT9mDVFnoOsZmHrccXW64kA8neL9YCj7JDI90mOi39RP3VeaMTyQhvam5ldb9oHTeRejvt+oJ8v0fpXA7EYiPZm9C0/mNr43/e2Ip+RrOrUKDvo1aPUZTit9FwVU4vciWmPc5EiRYoUKVLkf07+AyChx2bpMkmFAAAAAElFTkSuQmCC"
}
```
## Test le workflow complet

- Generate password
{ 
"username": "login"
}
Response MDP exemple : DB+G4MY=uQzXro_Dy@rAyo7I

- generate-2fa 
{ 
"username": "login"
}

reponse QR CODE BASE 64 pour authenticator

- auth user
{
  "username": "pierre.goujet",
  "password": "DB+G4MY=uQzXro_Dy@rAyo7I",
  "code_2fa": "894816"
}

reponse : 

{
  "status": "success",
  "message": "Authentification réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InBpZXJyZS5nb3VqZXQiLCJleHAiOjE3NzY3OTMwOTYsImlhdCI6MTc3Njc4NTg5Nn0.VG7wK33Ihjkitcajsdsg5lYNxpdKzDoznY3nX9v7bZ8"
}