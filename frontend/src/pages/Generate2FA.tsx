import { useState, FormEvent } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { QRCode } from '../components/QRCode';
import { Alert } from '../components/Alert';
import { apiService } from '../services/api';
import type { Generate2FAResponse } from '../types';

export const Generate2FA = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<Generate2FAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualKey, setShowManualKey] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setIsLoading(true);

    try {
      const result = await apiService.generate2FA({ username });
      setResponse(result);
      setUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Clé copiée dans le presse-papiers !');
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title="Activer l'Authentification à Deux Facteurs"
        description="Générez un code QR pour configurer l'authentification à deux facteurs avec Google Authenticator ou une application similaire."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Entrez le nom d'utilisateur"
            helperText="L'utilisateur doit avoir été créé avec la fonction de génération de mot de passe"
            required
            autoFocus
            aria-required="true"
          />

          <Button type="submit" isLoading={isLoading} className="w-full md:w-auto">
            Générer le Code 2FA
          </Button>
        </form>

        {error && (
          <div className="mt-6">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {response && (
          <div className="mt-6 space-y-4">
            <Alert type="success">{response.message}</Alert>
            <div className="pt-4 border-t border-gray-200">
              <QRCode
                data={response.qr_code_2fa_base64}
                alt="QR Code pour Google Authenticator"
                title="QR Code Google Authenticator"
              />
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Clé d'entrée manuelle
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {showManualKey ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                {showManualKey && (
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono">
                      {response.manual_entry_key}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(response.manual_entry_key)}
                      className="px-4 py-2"
                    >
                      Copier
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  Utilisez cette clé si vous ne pouvez pas scanner le QR code
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instructions :</strong> Scannez le QR code avec votre application d'authentification 
                  (Google Authenticator, Authy, Microsoft Authenticator, etc.). 
                  Vous devrez ensuite utiliser le code à 6 chiffres généré pour vous authentifier.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="À propos de l'authentification à deux facteurs">
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Sécurité renforcée</h3>
            <p>
              L'authentification à deux facteurs ajoute une couche supplémentaire de sécurité à votre compte. 
              Même si quelqu'un obtient votre mot de passe, il ne pourra pas accéder à votre compte sans le code 2FA.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Applications compatibles</h3>
            <p>
              Vous pouvez utiliser n'importe quelle application d'authentification compatible avec TOTP : 
              Google Authenticator, Authy, Microsoft Authenticator, 1Password, etc.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Codes temporaires</h3>
            <p>
              Les codes générés changent toutes les 30 secondes pour garantir une sécurité maximale. 
              Chaque code n'est valable qu'une seule fois.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

