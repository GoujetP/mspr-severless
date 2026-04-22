import { useState, FormEvent } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { apiService } from '../services/api';
import type { AuthUserResponse } from '../types';

export const AuthUser = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    code_2fa: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AuthUserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Réinitialiser les messages d'erreur lors de la saisie
    if (error) setError(null);
    if (response) setResponse(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setIsLoading(true);

    try {
      const result = await apiService.authUser(formData);
      setResponse(result);
      // Réinitialiser le formulaire en cas de succès
      if (result.status === 'success') {
        setFormData({ username: '', password: '', code_2fa: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Authentification"
        description="Connectez-vous avec votre nom d'utilisateur, votre mot de passe et votre code d'authentification à deux facteurs."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nom d'utilisateur"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Entrez votre nom d'utilisateur"
            required
            autoFocus
            autoComplete="username"
            aria-required="true"
          />

          <Input
            label="Mot de Passe"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Entrez votre mot de passe"
            required
            autoComplete="current-password"
            aria-required="true"
          />

          <Input
            label="Code d'Authentification (2FA)"
            type="text"
            name="code_2fa"
            value={formData.code_2fa}
            onChange={handleChange}
            placeholder="000000"
            helperText="Code à 6 chiffres généré par votre application d'authentification"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-required="true"
            aria-describedby="code-2fa-helper"
            aria-label="Code d'authentification à deux facteurs à 6 chiffres"
          />

          <Button type="submit" isLoading={isLoading} className="w-full md:w-auto">
            Se Connecter
          </Button>
        </form>

        {error && (
          <div className="mt-6">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {response && (
          <div className="mt-6">
            {response.status === 'success' ? (
              <Alert type="success">
                <div className="space-y-2">
                  <p className="font-semibold">{response.message}</p>
                  {response.token && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Token d'authentification :</p>
                      <code className="text-xs text-gray-800 break-all">{response.token}</code>
                    </div>
                  )}
                </div>
              </Alert>
            ) : (
              <Alert type="error">{response.error || response.message}</Alert>
            )}
          </div>
        )}
      </Card>

      <Card title="Processus d'authentification">
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Vérification du compte</h3>
            <p>
              Le système vérifie que votre compte existe et n'est pas expiré. 
              Les comptes expirent automatiquement après 6 mois d'inactivité.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Validation du mot de passe</h3>
            <p>
              Votre mot de passe est vérifié de manière sécurisée en utilisant le hachage bcrypt. 
              Le mot de passe en clair n'est jamais stocké.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Vérification du code 2FA</h3>
            <p>
              Le code à 6 chiffres de votre application d'authentification est validé en temps réel. 
              Chaque code n'est valable que pendant 30 secondes.
            </p>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note :</strong> Si votre compte a expiré, vous devrez refaire la procédure 
              d'enrôlement (génération de mot de passe et activation du 2FA).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

