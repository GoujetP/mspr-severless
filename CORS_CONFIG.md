# Configuration CORS

## Solution 1 : Proxy Vite (Développement)

Le proxy Vite est déjà configuré dans `frontend/vite.config.ts`. Il permet de contourner les problèmes CORS en développement en redirigeant les requêtes via le serveur de développement.

**Utilisation :**
- En développement (`npm run dev`), les requêtes vers `/api/*` sont automatiquement proxyfiées vers `http://91.99.16.71:31112`
- Les en-têtes CORS sont ajoutés automatiquement avec wildcard (`*`)

## Solution 2 : Configuration CORS côté OpenFaaS (Production)

Pour la production, vous pouvez configurer CORS directement dans OpenFaaS de plusieurs façons :

### Option A : Via les annotations de fonction

Ajoutez ces annotations dans votre `stack.yaml` :

```yaml
functions:
  generate-password:
    annotations:
      cors: "true"
      cors-allow-origin: "*"
      cors-allow-methods: "GET, POST, OPTIONS"
      cors-allow-headers: "Content-Type, Authorization"
```

### Option B : Via la Gateway OpenFaaS

Configurez CORS au niveau de la gateway OpenFaaS en modifiant les valeurs Helm :

```bash
helm upgrade openfaas openfaas/openfaas \
  --namespace openfaas \
  --set gateway.cors.enabled=true \
  --set gateway.cors.allowOrigin="*" \
  --set gateway.cors.allowMethods="GET,POST,PUT,DELETE,OPTIONS" \
  --set gateway.cors.allowHeaders="Content-Type,Authorization"
```

### Option C : Via un Ingress Controller (Traefik/Nginx)

Si vous utilisez un Ingress Controller, configurez les annotations CORS :

**Traefik :**
```yaml
annotations:
  traefik.ingress.kubernetes.io/cors-allow-origin: "*"
  traefik.ingress.kubernetes.io/cors-allow-methods: "GET,POST,OPTIONS"
  traefik.ingress.kubernetes.io/cors-allow-headers: "Content-Type,Authorization"
```

**Nginx :**
```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "*"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET,POST,OPTIONS"
  nginx.ingress.kubernetes.io/cors-allow-headers: "Content-Type,Authorization"
```

## Solution 3 : Middleware CORS dans les handlers Python

Si vous voulez gérer CORS directement dans les handlers Python, vous pouvez utiliser un middleware HTTP. Cependant, avec le watchdog classique d'OpenFaaS, cela nécessite de modifier l'architecture.

Pour l'instant, le proxy Vite est la solution la plus simple pour le développement.

## Test

Pour tester que CORS fonctionne :

```bash
# Depuis le navigateur (console)
fetch('https://openfaas.91.99.16.71.nip.io/function/generate-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test' })
})
```

Si vous voyez les en-têtes `Access-Control-Allow-Origin: *` dans la réponse, CORS est correctement configuré.

